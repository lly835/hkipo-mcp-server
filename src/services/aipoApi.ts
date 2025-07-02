import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { mcpConfig, API_ENDPOINTS } from '../config/index.js';
import { NetworkLogger } from '../utils/logger.js';
import { 
  IPOInfo, 
  IPODetail, 
  ApiResponse, 
  PaginationParams, 
  PaginatedResponse,
  GreyMarketData,
  AllocationInfo,
  FirstDayPerformance 
} from '../types/index.js';

export class AipoApiClient {
  private httpClient: AxiosInstance;

  constructor() {
    this.httpClient = axios.create({
      baseURL: mcpConfig.aipoBaseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': mcpConfig.userAgent,
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // 请求拦截器
    this.httpClient.interceptors.request.use(
      (config) => {
        // 添加随机参数防止缓存
        if (config.url && !config.url.includes('?v=')) {
          const separator = config.url.includes('?') ? '&' : '?';
          config.url += `${separator}v=${Math.random()}`;
        }

        // 记录请求开始
        const requestId = NetworkLogger.logRequestStart(
          config.method?.toUpperCase() || 'GET',
          config.url || ''
        );
        
        // 将requestId和开始时间存储在config中
        (config as any).metadata = {
          requestId,
          startTime: Date.now()
        };

        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.httpClient.interceptors.response.use(
      (response) => {
        // 记录成功响应
        const config = response.config as any;
        if (config.metadata) {
          const duration = Date.now() - config.metadata.startTime;
          NetworkLogger.logRequestSuccess(
            config.metadata.requestId,
            config.method?.toUpperCase() || 'GET',
            config.url || '',
            response.status,
            duration
          );
        }
        return response;
      },
      (error) => {
        // 记录失败响应
        const config = error.config as any;
        if (config?.metadata) {
          const duration = Date.now() - config.metadata.startTime;
          NetworkLogger.logRequestError(
            config.metadata.requestId,
            config.method?.toUpperCase() || 'GET',
            config.url || '',
            error.message,
            error.response?.status,
            duration
          );
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 获取新股列表
   */
  async getIPOList(params: PaginationParams): Promise<PaginatedResponse<IPOInfo>> {
    try {
      const response = await this.httpClient.get(API_ENDPOINTS.GET_IPO_LIST, {
        params: {
          sector: params.sector || '',
          pageIndex: params.pageIndex,
          pageSize: params.pageSize,
        },
      });

      const data = this.parseIPOListResponse(response.data);
      return data;
    } catch (error) {
      throw new Error(`获取新股列表失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取新股详情
   */
  async getIPODetail(stockCode: string): Promise<IPODetail> {
    try {
      // 新接口使用code参数，格式为E+股票代码（如E01304）
      const codeParam = `E${stockCode.padStart(5, '0')}`;
      
      const response = await this.httpClient.get(API_ENDPOINTS.GET_IPO_DETAIL, {
        params: { 
          code: codeParam,
          v: Math.random() // 防缓存参数
        },
        headers: {
          'RequestVerificationToken': mcpConfig.requestVerificationToken
        }
      });

      const data = this.parseIPODetailResponse(response.data, stockCode);
      return data;
    } catch (error) {
      throw new Error(`获取股票${stockCode}详情失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取暗盘数据（从股票详情页面解析）
   */
  async getGreyMarketData(stockCode: string): Promise<GreyMarketData | null> {
    try {
      // 从股票详情页面解析暗盘数据
      const detail = await this.getIPODetail(stockCode);
      const greyMarketData = detail.greyMarket;
      
      return greyMarketData || null;
    } catch (error) {
      console.error(`获取${stockCode}暗盘数据失败:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * 获取配售信息
   */
  async getAllocationInfo(stockCode: string): Promise<AllocationInfo | null> {
    try {
      const detail = await this.getIPODetail(stockCode);
      const allocationInfo = detail.allocation;
      
      return allocationInfo || null;
    } catch (error) {
      console.error(`获取${stockCode}配售信息失败:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * 获取首日表现
   */
  async getFirstDayPerformance(stockCode: string): Promise<FirstDayPerformance | null> {
    try {
      const detail = await this.getIPODetail(stockCode);
      const performance = detail.firstDayPerformance;
      
      return performance || null;
    } catch (error) {
      console.error(`获取${stockCode}首日表现失败:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * 解析新股列表响应
   */
  private parseIPOListResponse(data: any): PaginatedResponse<IPOInfo> {
    try {
      // 如果返回的是JSON格式
      if (data && data.result === 1 && data.data) {
        
        return {
          items: this.parseDataListToIPOItems(data.data.dataList || []),
          totalCount: data.data.totalRows || 0,
          pageIndex: 1,
          pageSize: data.data.dataList?.length || 20,
          totalPages: Math.ceil((data.data.totalRows || 0) / (data.data.dataList?.length || 20)),
        };
      }
      return {
        items: [],
        totalCount: 0,
        pageIndex: 1,
        pageSize: 20,
        totalPages: 0,
      };
    } catch (error) {
      console.error('解析新股列表响应失败:', error);
      return {
        items: [],
        totalCount: 0,
        pageIndex: 1,
        pageSize: 20,
        totalPages: 0,
      };
    }
  }

  /**
   * 从HTML解析新股列表
   */
  private parseIPOListFromHTML(html: string): PaginatedResponse<IPOInfo> {
    const $ = cheerio.load(html);
    const items: IPOInfo[] = [];

    // 解析表格数据（需要根据实际HTML结构调整）
    $('table tbody tr').each((index, element) => {
      try {
        const cells = $(element).find('td');
        if (cells.length >= 10) {
          const item: IPOInfo = {
            stockCode: $(cells[0]).text().trim(),
            stockName: $(cells[1]).text().trim(),
            listingDate: $(cells[2]).text().trim(),
            sponsor: $(cells[3]).text().trim(),
            priceRange: $(cells[4]).text().trim(),
            lotSize: parseInt($(cells[5]).text().trim()) || 0,
            subscriptionPeriod: $(cells[6]).text().trim(),
            marketCap: parseFloat($(cells[7]).text().trim()) || 0,
            peRatio: parseFloat($(cells[8]).text().trim()) || 0,
            resultDate: $(cells[9]).text().trim(),
            industry: $(cells[10])?.text().trim() || '',
            status: 'active',
          };
          items.push(item);
        }
      } catch (error) {
        console.error('解析单行数据失败:', error);
      }
    });

    return {
      items,
      totalCount: items.length,
      pageIndex: 1,
      pageSize: items.length,
      totalPages: 1,
    };
  }

  /**
   * 解析新股详情响应
   */
  private parseIPODetailResponse(data: any, stockCode: string): IPODetail {
    try {
      // 新的/Home/NewStockBrief接口返回JSON格式
      if (data && typeof data === 'string') {
        // 尝试解析JSON响应
        try {
          const jsonData = JSON.parse(data);
          if (jsonData && jsonData.msg) {
            const parsedMsg = JSON.parse(jsonData.msg);
            return this.parseNewStockBriefData(parsedMsg, stockCode);
          }
        } catch (jsonError) {
          console.error('JSON解析失败，尝试HTML解析:', jsonError);
          return this.parseIPODetailFromHTML(data, stockCode);
        }
      } else if (data && typeof data === 'object') {
        // 直接是JSON对象
        if (data.msg) {
          const parsedMsg = typeof data.msg === 'string' ? JSON.parse(data.msg) : data.msg;
          return this.parseNewStockBriefData(parsedMsg, stockCode);
        }
        return this.parseNewStockBriefData(data, stockCode);
      }
      
      // 默认返回基础结构
      return {
        stockCode,
        stockName: '',
        listingDate: '',
        sponsor: '',
        priceRange: '',
        lotSize: 0,
        subscriptionPeriod: '',
        marketCap: 0,
        peRatio: 0,
        resultDate: '',
        industry: '',
        status: 'unknown',
        companyInfo: {
          business: '',
          totalShares: 0,
          publicOffering: 0,
          internationalOffering: 0,
        },
      };
    } catch (error) {
      console.error('解析新股详情响应失败:', error);
      throw error;
    }
  }

  /**
   * 从HTML解析新股详情
   */
  private parseIPODetailFromHTML(html: string, stockCode: string): IPODetail {
    const $ = cheerio.load(html);

    // 首先检查页面中的JavaScript变量，很多数据可能存储在那里
    const scriptContent = $('script').text();
    
    // 提取股票名称 - 从多个可能的位置尝试
    let stockName = '';
    
    // 尝试从script中提取stockCode变量周围的信息
    const stockCodeMatch = scriptContent.match(/stockCode\s*=\s*['"](.*?)['"];?/);
    if (stockCodeMatch) {
      // 在HTML中查找对应的股票名称
      stockName = $('.stock_name, .company-name, h1, h2').first().text().trim();
    }
    
    // 如果还没找到，尝试从页面标题或其他位置提取
    if (!stockName) {
      stockName = $('title').text().split('-')[0]?.trim() || '';
    }
    
    // 基础信息先使用默认值，后续可以从JavaScript或其他元素中提取
    const detail: IPODetail = {
      stockCode,
      stockName: stockName || `股票${stockCode}`,
      listingDate: this.extractDateFromScript(scriptContent, 'listedDate') || '',
      sponsor: this.extractFromHTML($, '保荐人') || '',
      priceRange: this.extractPriceRange($, scriptContent) || '',
      lotSize: this.extractFromScript(scriptContent, 'shares') || 100,
      subscriptionPeriod: this.extractSubscriptionPeriod($, scriptContent) || '',
      marketCap: this.extractFromScript(scriptContent, 'marketcap') || 0,
      peRatio: this.extractFromScript(scriptContent, 'pe') || 0,
      resultDate: this.extractDateFromScript(scriptContent, 'resultDate') || '',
      industry: this.extractFromScript(scriptContent, 'industry') || '',
      status: 'active',
      companyInfo: {
        business: this.extractFromHTML($, '主营业务') || '',
        totalShares: 0,
        publicOffering: 0,
        internationalOffering: 0,
      },
    };

    // 尝试提取暗盘数据
    detail.greyMarket = this.extractGreyMarketFromHTML($) || undefined;
    
    // 尝试提取配售信息
    detail.allocation = this.extractAllocationFromHTML($) || undefined;
    
    // 尝试提取首日表现
    detail.firstDayPerformance = this.extractFirstDayPerformanceFromHTML($) || undefined;

    return detail;
  }

  /**
   * 根据标签提取文本内容
   */
  private extractTextByLabel($: cheerio.CheerioAPI, label: string): string {
    // 尝试多种选择器模式
    const selectors = [
      `td:contains("${label}") + td`,
      `.label:contains("${label}") + .value`,
      `span:contains("${label}") + span`,
      `div:contains("${label}") .value`,
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }

    return '';
  }

  /**
   * 解析dataList数组为IPOInfo数组
   */
  private parseDataListToIPOItems(dataList: any[]): IPOInfo[] {
    return dataList.map((item, index) => {
      
      // 根据实际API返回的数据结构解析
      const priceRange = item.price_Floor === item.price_Ceiling 
        ? `${item.price_Ceiling}港元` 
        : `${item.price_Floor}-${item.price_Ceiling}港元`;
      
      // 格式化日期
      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toISOString().split('T')[0];
      };
      
      return {
        stockCode: item.symbol,
        stockName: item.shortName,
        listingDate: formatDate(item.listedDate),
        sponsor: item.sponsors || '',
        priceRange: priceRange,
        lotSize: item.shares || 0,
        subscriptionPeriod: `${formatDate(item.startdate)} - ${formatDate(item.enddate)}`,
        marketCap: item.marketcap || 0,
        peRatio: item.pe || 0,
        resultDate: formatDate(item.resultDate),
        industry: item.industry || '',
        status: 'active',
      };
    });
  }

  /**
   * 从脚本内容中提取数值
   */
  private extractFromScript(scriptContent: string, fieldName: string): any {
    const patterns = [
      new RegExp(`${fieldName}\\s*[:=]\\s*([\\d.]+)`, 'i'),
      new RegExp(`"${fieldName}"\\s*:\\s*([\\d.]+)`, 'i'),
      new RegExp(`'${fieldName}'\\s*:\\s*([\\d.]+)`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = scriptContent.match(pattern);
      if (match) {
        return parseFloat(match[1]) || 0;
      }
    }
    return 0;
  }

  /**
   * 从脚本内容中提取日期
   */
  private extractDateFromScript(scriptContent: string, fieldName: string): string {
    const patterns = [
      new RegExp(`${fieldName}\\s*[:=]\\s*['"]([^'"]+)['"]`, 'i'),
      new RegExp(`"${fieldName}"\\s*:\\s*"([^"]+)"`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = scriptContent.match(pattern);
      if (match) {
        const dateStr = match[1];
        if (dateStr.includes('T')) {
          return new Date(dateStr).toISOString().split('T')[0];
        }
        return dateStr;
      }
    }
    return '';
  }

  /**
   * 从HTML中提取文本信息
   */
  private extractFromHTML($: cheerio.CheerioAPI, label: string): string {
    // 尝试多种选择器模式
    const selectors = [
      `td:contains("${label}") + td`,
      `.label:contains("${label}") + .value`,
      `span:contains("${label}") + span`,
      `div:contains("${label}") .value`,
      `th:contains("${label}") + td`,
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }
    return '';
  }

  /**
   * 提取价格范围
   */
  private extractPriceRange($: cheerio.CheerioAPI, scriptContent: string): string {
    // 尝试从脚本中提取价格信息
    const ceilingMatch = scriptContent.match(/price_Ceiling\s*[:=]\s*([\d.]+)/i);
    const floorMatch = scriptContent.match(/price_Floor\s*[:=]\s*([\d.]+)/i);
    
    if (ceilingMatch && floorMatch) {
      const ceiling = parseFloat(ceilingMatch[1]);
      const floor = parseFloat(floorMatch[1]);
      if (ceiling === floor) {
        return `${ceiling}港元`;
      } else {
        return `${floor}-${ceiling}港元`;
      }
    }
    
    // 回退到HTML提取
    return this.extractFromHTML($, '招股价') || this.extractFromHTML($, '价格');
  }

  /**
   * 提取招股期间
   */
  private extractSubscriptionPeriod($: cheerio.CheerioAPI, scriptContent: string): string {
    const startMatch = scriptContent.match(/startdate\s*[:=]\s*['"]([^'"]+)['"]|startDate\s*[:=]\s*['"]([^'"]+)['"]/i);
    const endMatch = scriptContent.match(/enddate\s*[:=]\s*['"]([^'"]+)['"]|endDate\s*[:=]\s*['"]([^'"]+)['"]/i);
    
    if (startMatch && endMatch) {
      const startDate = new Date(startMatch[1] || startMatch[2]).toISOString().split('T')[0];
      const endDate = new Date(endMatch[1] || endMatch[2]).toISOString().split('T')[0];
      return `${startDate} - ${endDate}`;
    }
    
    return this.extractFromHTML($, '招股日期') || this.extractFromHTML($, '申购期间');
  }

  /**
   * 从HTML中提取暗盘数据
   */
  private extractGreyMarketFromHTML($: cheerio.CheerioAPI): GreyMarketData | null {
    // 查找暗盘相关的表格和数据
    const greyTables = $('#tbInnerDisk, #tbOutDisk, .dark_');
    
    if (greyTables.length === 0) {
      return null;
    }

    // 尝试提取基本的暗盘信息
    return {
      stockCode: '',
      currentPrice: 0,
      changePercent: 0,
      volume: 0,
      brokerQuotes: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * 从HTML中提取配售信息
   */
  private extractAllocationFromHTML($: cheerio.CheerioAPI): AllocationInfo | null {
    // 查找配售相关的表格
    const allocationTables = $('#tbPlacingResultDetail, .placing_result');
    
    if (allocationTables.length === 0) {
      return null;
    }

    return {
      publicOfferingRatio: 0,
      internationalOfferingRatio: 0,
      allocationRate: 0,
      subscriptionMultiple: 0,
      retailInvestors: 0,
      institutionalInvestors: 0,
    };
  }

  /**
   * 从HTML中提取首日表现
   */
  private extractFirstDayPerformanceFromHTML($: cheerio.CheerioAPI): FirstDayPerformance | null {
    // 查找首日表现相关的表格
    const performanceTables = $('#tbGreyFirstData, .first_day_performance');
    
    if (performanceTables.length === 0) {
      return null;
    }

    return {
      stockCode: '',
      openPrice: 0,
      highPrice: 0,
      lowPrice: 0,
      closePrice: 0,
      changePercent: 0,
      volume: 0,
      turnoverRate: 0,
      marketCap: 0,
      listingDate: '',
    };
  }

    /**
   * 解析新的/Home/NewStockBrief接口返回的JSON数据
   */
  private parseNewStockBriefData(data: any, stockCode: string): IPODetail {
    try {
      const issuanceInfo = data?.data?.issuanceinfo;
      const institutionInfo = data?.data?.institutioninfo;
      const managerInfo = data?.data?.managerinfo || [];
      const investorInfo = data?.data?.investorinfo || [];
      
      if (!issuanceInfo) {
        throw new Error('API返回数据结构不完整');
      }

      // 格式化价格信息
      let priceRange = '';
      if (issuanceInfo.ipopricing && issuanceInfo.ipopricing !== '' && issuanceInfo.ipopricing !== '--') {
        priceRange = `${issuanceInfo.ipopricing}港元`;
      } else if (issuanceInfo.ipoprice) {
        if (issuanceInfo.ipoprice.floor && issuanceInfo.ipoprice.ceiling) {
          if (issuanceInfo.ipoprice.floor === issuanceInfo.ipoprice.ceiling) {
            priceRange = `${issuanceInfo.ipoprice.ceiling}港元`;
          } else {
            priceRange = `${issuanceInfo.ipoprice.floor}-${issuanceInfo.ipoprice.ceiling}港元`;
          }
        }
      }

      // 格式化日期
      const formatDate = (dateObj: any) => {
        if (!dateObj) return '';
        if (typeof dateObj === 'string') {
          return new Date(dateObj).toISOString().split('T')[0];
        }
        if (dateObj.start && dateObj.end) {
          const start = new Date(dateObj.start).toISOString().split('T')[0];
          const end = new Date(dateObj.end).toISOString().split('T')[0];
          return `${start} - ${end}`;
        }
        return '';
      };

      // 格式化募资金额
      const formatAmount = (amount: string | number) => {
        if (!amount || amount === '--') return 0;
        if (typeof amount === 'number') return amount;
        // 移除单位和格式化
        const cleanAmount = amount.toString().replace(/[万亿,-]/g, '');
        return parseFloat(cleanAmount) || 0;
      };

      // 提取承销商信息
      const getAllUnderwriters = () => {
        const allUnderwriters = new Set();
        if (issuanceInfo.sponsors) allUnderwriters.add(issuanceInfo.sponsors);
        if (issuanceInfo.leadagent) {
          issuanceInfo.leadagent.split(',').forEach((agent: string) => allUnderwriters.add(agent.trim()));
        }
        if (issuanceInfo.bookrunners) {
          issuanceInfo.bookrunners.split(',').forEach((runner: string) => allUnderwriters.add(runner.trim()));
        }
        return Array.from(allUnderwriters).join(', ');
      };

      return {
        stockCode: stockCode,
        stockName: issuanceInfo.name || issuanceInfo.fullname || '',
        listingDate: formatDate(issuanceInfo.listeddate),
        sponsor: issuanceInfo.sponsors || '',
        priceRange: priceRange,
        lotSize: issuanceInfo.shares || 0,
        subscriptionPeriod: formatDate(issuanceInfo.ipodate),
        marketCap: formatAmount(issuanceInfo.H_marketcap_units || issuanceInfo.H_marketcap),
        peRatio: parseFloat(issuanceInfo.pe) || 0,
        resultDate: formatDate(issuanceInfo.resultdate),
        industry: issuanceInfo.industry || '',
        status: 'active',
        
        // 扩展公司信息
        companyInfo: {
          business: institutionInfo?.principalactivities || '',
          totalShares: issuanceInfo.IssuedCapital || 0,
          publicOffering: issuanceInfo.issuenumberhk_units || formatAmount(issuanceInfo.issuenumberhK),
          internationalOffering: issuanceInfo.issuenumberother_units || formatAmount(issuanceInfo.issuenumberother),
          
          // 新增的详细信息
          fullName: issuanceInfo.fullname || '',
          website: institutionInfo?.website || '',
          principalOffice: institutionInfo?.principaloffice || '',
          registrars: institutionInfo?.registrars || '',
          registrarsTel: institutionInfo?.registrarstel || '',
          chairman: institutionInfo?.chairman || '',
          secretary: institutionInfo?.secretary || '',
          telephone: institutionInfo?.telephone || '',
          substantialShareholders: institutionInfo?.substantialshareholders || '',
          
          // 发行信息
          minimumCapital: formatAmount(issuanceInfo.minimumcapital),
          raiseMoney: formatAmount(issuanceInfo.raisemoney_units || issuanceInfo.raisemoney),
          totalMarketCap: formatAmount(issuanceInfo.marketcap_units || issuanceInfo.marketcap),
          hkMarketCap: formatAmount(issuanceInfo.H_marketcap_units || issuanceInfo.H_marketcap),
          issueRatio: parseFloat(issuanceInfo.IssueRatio) || 0,
          overAllotment: issuanceInfo.OverAllotment || '',
          stabilizingManager: issuanceInfo.StabilizingManager || '',
          underwritingFee: parseFloat(issuanceInfo.underwritingFee) || 0,
          listingExpenses: parseFloat(issuanceInfo.listingexpenses) || 0,
          currency: issuanceInfo.Currency || '',
          
          // 用途说明
          useOfProceeds: issuanceInfo.use || '',
          
          // 承销团信息
          allUnderwriters: getAllUnderwriters(),
          leadAgent: issuanceInfo.leadagent || '',
          bookRunners: issuanceInfo.bookrunners || '',
          coordinator: issuanceInfo.coordinator || '',
          
          // 招股书链接
          prospectusLink: issuanceInfo.link || '',
          
          // A股信息（如果是A+H股）
          isAHStock: issuanceInfo.isAHStock === 1,
          aSymbol: issuanceInfo.aSymbol || '',
          
          // 管理层信息
          management: managerInfo.map((manager: any) => ({
            name: manager.managername || '',
            position: manager.post || '',
            rank: manager.rankno || 0
          })),
          
          // 基石投资者信息
          cornerStoneInvestors: investorInfo.map((investor: any) => ({
            name: investor.institutionname || '',
            shareholding: parseFloat(investor.shareholding) || 0,
            percentage: investor.percentage || 0,
            releaseDate: formatDate(investor.ReleaseDate),
            relatedParty: investor.relatedparty || '',
            investorType: investor.InverstorType || '',
            investmentAmount: parseFloat(investor.investmentAmount) || 0
          })),
          
          totalCornerStonePercentage: data?.data?.TotalShareholdingPercentage || 0,
        },
        
        // 从新接口暂时无法获取的数据，设置为undefined
        greyMarket: undefined,
        allocation: undefined,
        firstDayPerformance: undefined,
      };
    } catch (error) {
      console.error('解析NewStockBrief数据失败:', error);
      // 返回基础结构
      return {
        stockCode,
        stockName: '',
        listingDate: '',
        sponsor: '',
        priceRange: '',
        lotSize: 0,
        subscriptionPeriod: '',
        marketCap: 0,
        peRatio: 0,
        resultDate: '',
        industry: '',
        status: 'unknown',
        companyInfo: {
          business: '',
          totalShares: 0,
          publicOffering: 0,
          internationalOffering: 0,
        },
      };
    }
  }
} 
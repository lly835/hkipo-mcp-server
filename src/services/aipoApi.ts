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
  FirstDayPerformance,
  PlacingResult,
  AllocationLevel
} from '../types/index.js';

export class AipoApiClient {
  private httpClient: AxiosInstance;
  private jybHttpClient: AxiosInstance;

  constructor() {
    // 创建主HTTP客户端实例（用于aipo.myiqdii.com域名）
    this.httpClient = axios.create({
      baseURL: mcpConfig.aipoBaseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': mcpConfig.userAgent,
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      },
    });
    
    // 创建第二个HTTP客户端实例（用于jybdata.iqdii.com域名）
    this.jybHttpClient = axios.create({
      baseURL: mcpConfig.jybBaseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': mcpConfig.userAgent,
        'Accept': 'application/json, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // 为主HTTP客户端设置拦截器
    this.setupClientInterceptors(this.httpClient, 'AIPO');
    
    // 为JYB HTTP客户端设置拦截器
    this.setupClientInterceptors(this.jybHttpClient, 'JYB');
  }
  
  private setupClientInterceptors(client: AxiosInstance, clientName: string): void {
    // 请求拦截器
    client.interceptors.request.use(
      (config) => {
        // 添加随机参数防止缓存
        if (config.url && !config.url.includes('?v=')) {
          const separator = config.url.includes('?') ? '&' : '?';
          config.url += `${separator}v=${Math.random()}`;
        }

        // 为所有请求添加RequestVerificationToken头部
        if (mcpConfig.requestVerificationToken) {
          config.headers['requestverificationtoken'] = mcpConfig.requestVerificationToken;
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
    client.interceptors.response.use(
      (response) => {
        // 记录成功响应 - 简化处理
        return response;
      },
      (error) => {
        // 记录失败响应
        const config = error.config as any;
        if (config?.metadata) {
          NetworkLogger.logRequestError(
            config.metadata.requestId,
            config.method?.toUpperCase() || 'GET',
            config.url || '',
            error.message
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
        }
      });

      // 解析响应数据
      let result: IPODetail = {
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
        }
      };
      
      // 尝试从响应中提取数据
      try {
        if (response.data && typeof response.data === 'object') {
          const data = response.data;
          if (data.result === 1 && data.data) {
            const ipoData = data.data;
            result.stockName = ipoData.name || ipoData.shortName || '';
            result.lotSize = ipoData.lot || 0;
            result.priceRange = ipoData.price ? `${ipoData.price}港元` : '';
            // 可以根据实际返回数据结构添加更多字段
          }
        }
      } catch (parseError) {
        console.error('解析新股详情数据失败:', parseError);
      }

      return result;
    } catch (error) {
      console.error(`获取股票${stockCode}详情失败:`, error instanceof Error ? error.message : String(error));
      // 出错时返回基本结构
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
        }
      };
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
   * 获取暗盘列表数据（新接口）
   * @param stockCode 股票代码
   * @param pageIndex 页码
   * @param pageSize 每页数量
   * @returns 暗盘数据列表
   */
  async getGreyList(stockCode: string, pageIndex: number = 1, pageSize: number = 10): Promise<GreyMarketData | null> {
    try {
      const response = await this.httpClient.get(API_ENDPOINTS.GET_GREY_LIST, {
        params: {
          symbol: stockCode.padStart(5, '0'),
          sector: '',
          pageIndex,
          pageSize,
          orderField: 'ResultDate',
          orderBy: 'DESC',
          v: Math.random() // 防缓存参数
        }
      });

      if (response.data && response.data.result === 1 && response.data.data) {
        const greyData = this.parseGreyListData(response.data.data, stockCode);
        return greyData;
      }
      
      return null;
    } catch (error) {
      console.error(`获取${stockCode}暗盘列表数据失败:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * 解析暗盘列表数据
   * @param data API返回的数据
   * @param stockCode 股票代码
   * @returns 格式化后的暗盘数据
   */
  private parseGreyListData(data: any, stockCode: string): GreyMarketData | null {
    try {
      if (!data.dataList || data.dataList.length === 0) {
        return null;
      }

      const item = data.dataList[0];
      
      // 构建暗盘数据
      const greyMarketData: GreyMarketData = {
        stockCode: item.symbol || stockCode,
        currentPrice: item.grayPrice || item.price || 0,
        changePercent: item.grayPriceChg || 0,
        volume: item.grayZl || 0,
        brokerQuotes: [],
        lastUpdated: new Date().toISOString(),
        // 添加额外信息
        ipoPricing: item.ipoPricing || 0,
        turnover: item.grayZe || 0, // 成交额
        shortName: item.shortName || '',
        listingDate: item.listedDate ? new Date(item.listedDate).toISOString().split('T')[0] : '',
        resultDate: item.resultDate ? new Date(item.resultDate).toISOString().split('T')[0] : '',
      };

      return greyMarketData;
    } catch (error) {
      console.error('解析暗盘列表数据失败:', error);
      return null;
    }
  }

  /**
   * 获取首日表现
   */
  async getFirstDayPerformance(stockCode: string): Promise<FirstDayPerformance | null> {
    try {
      // 由于NewStockBrief接口已移除，首日表现数据暂时无法获取
      console.log(`首日表现数据暂时无法获取，NewStockBrief接口已移除`);
      return null;
    } catch (error) {
      console.error(`获取${stockCode}首日表现失败:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * 获取新股配售结果
   * @param stockCode 股票代码
   * @returns 配售结果数据
   */
  async getPlacingResult(stockCode: string): Promise<PlacingResult | null> {
    try {
      // 格式化股票代码（添加E前缀）
      const codeParam = `E${stockCode.padStart(5, '0')}`;
      
      // 发送请求获取配售结果
      const response = await this.jybHttpClient.post(API_ENDPOINTS.GET_PLACING_RESULT, {
        code: codeParam,
        count: "-1"  // 获取所有层级的配售结果
      }, {
        params: {
          lang: 'chs'  // 使用简体中文
        }
      });

      // 解析配售结果
      if (response.data && response.data.result === 1 && response.data.data) {
        return this.parsePlacingResultData(response.data.data, stockCode);
      }
      
      return null;
    } catch (error) {
      console.error(`获取股票${stockCode}配售结果失败:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * 解析配售结果数据
   * @param data API返回的数据
   * @param stockCode 股票代码
   * @returns 格式化后的配售结果数据
   */
  private parsePlacingResultData(data: any, stockCode: string): PlacingResult | null {
    try {
      if (!data) {
        return null;
      }

      // 解析配售层级列表
      const allocationList: AllocationLevel[] = (data.list || []).map((item: any) => {
        return {
          shares: parseInt(item[0]) || 0,
          applicants: parseInt(item[1]) || 0,
          successfulApplicants: item[2] ? parseInt(item[2]) : null,
          winningRate: parseFloat(item[3]) || 0,
          allocationDetails: item[4] || '',
          isPlacee: parseInt(item[5]) || 0,
          amount: parseFloat(item[6]) || 0
        };
      });
      
      // 构建配售结果数据
      const placingResult: PlacingResult = {
        stockCode: stockCode,
        stockName: data.name || '',
        lotSize: parseInt(data.lot) || 0,
        totalShares: parseFloat(data.sz) || 0,
        allocationRate: data.rate || '',
        clawBack: parseFloat(data.claw_back) || 0,
        subscribed: parseFloat(data.subscribed) || 0,
        placementTimes: parseFloat(data.placement_times) || 0,
        codesRate: parseFloat(data.codes_rate) || 0,
        headHammer: parseInt(data.head_hammer) || 0,
        priceCeiling: parseFloat(data.price_ceiling) || 0,
        priceFloor: parseFloat(data.price_floor) || 0,
        ipoPricing: parseFloat(data.ipo_pricing) || 0,
        raiseMoney: parseFloat(data.raiseMoney) || 0,
        invalidApplication: parseInt(data.invalidApplication) || 0,
        allocationResultUrl: data.rlink || undefined,
        allocationList
      };
      
      return placingResult;
    } catch (error) {
      console.error('解析配售结果数据失败:', error);
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

  // parseIPODetailResponse 方法已移除

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
    
    // 首日表现功能已移除
    detail.firstDayPerformance = undefined;

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
    // 查找暗盘相关的表格
    const greyMarketTables = $('#tbGreyMarketData, .grey_market');
    
    if (greyMarketTables.length === 0) {
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

  // extractFirstDayPerformanceFromHTML 方法已移除

    // parseNewStockBriefData 方法已移除
} 
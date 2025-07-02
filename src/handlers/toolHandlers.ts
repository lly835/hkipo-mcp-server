import { AipoApiClient } from '../services/aipoApi.js';
import { NetworkLogger } from '../utils/logger.js';
import { 
  IPOInfo, 
  IPODetail, 
  GreyMarketData, 
  AllocationInfo, 
  FirstDayPerformance,
  PaginationParams 
} from '../types/index.js';

export class ToolHandlers {
  private apiClient: AipoApiClient;

  constructor() {
    this.apiClient = new AipoApiClient();
  }

  /**
   * 获取当前正在招股的新股列表
   */
  async listActiveIPOs(args: any): Promise<any> {
    try {
      const params: PaginationParams = {
        pageIndex: args.pageIndex || 1,
        pageSize: args.pageSize || 20,
        sector: args.industry || '',
      };

      const result = await this.apiClient.getIPOList(params);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result,
            message: `成功获取到 ${result.items.length} 只正在招股的新股`,
          }, null, 2)
        }]
      };
    } catch (error: any) {
      NetworkLogger.logToolError('list_active_ipos', error.message);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            message: '获取新股列表失败'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * 获取特定新股的详细信息
   */
  async getIPODetails(args: any): Promise<any> {
    try {
      if (!args.stock_code) {
        throw new Error('股票代码不能为空');
      }

      const stockCode = String(args.stock_code).padStart(5, '0');
      const result = await this.apiClient.getIPODetail(stockCode);
      
      // 构建详细的格式化信息
      const company = result.companyInfo;
      
      // 安全处理文本，避免JSON解析错误
      const safeText = (text: string | undefined | null): string => {
        if (!text) return '未提供';
        return text
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
      };
      let detailedInfo = `\n📊 ${result.stockName} (${result.stockCode}) 详细信息\n`;
      detailedInfo += `═══════════════════════════════════════\n\n`;
      
      detailedInfo += `🏢 基本信息:\n`;
      detailedInfo += `• 公司全称: ${safeText(company.fullName)}\n`;
      detailedInfo += `• 行业: ${safeText(result.industry)}\n`;
      detailedInfo += `• 网站: ${safeText(company.website)}\n`;
      detailedInfo += `• 主要办事处: ${safeText(company.principalOffice)}\n`;
      detailedInfo += `• 董事长: ${safeText(company.chairman)}\n`;
      detailedInfo += `• 公司秘书: ${safeText(company.secretary)}\n`;
      detailedInfo += `• 电话: ${safeText(company.telephone)}\n`;
      detailedInfo += `• 主要业务: ${safeText(company.business)}\n\n`;
      
      detailedInfo += `💰 发行信息:\n`;
      detailedInfo += `• 招股价: ${result.priceRange}\n`;
      detailedInfo += `• 一手股数: ${result.lotSize} 股\n`;
      detailedInfo += `• 招股期间: ${result.subscriptionPeriod}\n`;
      detailedInfo += `• 上市日期: ${result.listingDate}\n`;
      detailedInfo += `• 公布结果: ${result.resultDate}\n`;
      detailedInfo += `• 市盈率: ${result.peRatio}倍\n`;
      detailedInfo += `• 市值: ${result.marketCap.toLocaleString()} 港元\n`;
      detailedInfo += `• 发行股数 (公开): ${company.publicOffering?.toLocaleString() || 0} 股\n`;
      detailedInfo += `• 发行股数 (国际): ${company.internationalOffering?.toLocaleString() || 0} 股\n`;
      detailedInfo += `• 总发行股数: ${company.totalShares?.toLocaleString() || 0} 股\n`;
      detailedInfo += `• 募资金额: ${company.raiseMoney?.toLocaleString() || 0} 万港元\n`;
      detailedInfo += `• H股发行比例: ${company.issueRatio || 0}%\n`;
      detailedInfo += `• 超额配股权: ${company.overAllotment || '未知'}\n`;
      detailedInfo += `• 承销费率: ${company.underwritingFee || 0}%\n`;
      detailedInfo += `• 货币: ${company.currency || '港元'}\n\n`;
      
      if (company.isAHStock) {
        detailedInfo += `🔄 A+H股信息:\n`;
        detailedInfo += `• A股代码: ${company.aSymbol}\n\n`;
      }
      
      detailedInfo += `🏦 承销团信息:\n`;
      detailedInfo += `• 保荐人: ${result.sponsor}\n`;
      detailedInfo += `• 牵头经办人: ${company.leadAgent || '未提供'}\n`;
      detailedInfo += `• 账簿管理人: ${company.bookRunners || '未提供'}\n`;
      detailedInfo += `• 全球协调人: ${company.coordinator || '未提供'}\n`;
      detailedInfo += `• 稳定价格经办人: ${company.stabilizingManager || '未提供'}\n\n`;
      
      if (company.useOfProceeds) {
        detailedInfo += `🎯 募资用途:\n`;
        // 安全处理特殊字符
        const safeUseOfProceeds = company.useOfProceeds
          .replace(/\\n/g, '\n')
          .replace(/"/g, '"')
          .replace(/'/g, "'");
        detailedInfo += safeUseOfProceeds + '\n\n';
      }
      
      if (company.management && company.management.length > 0) {
        detailedInfo += `👥 管理层信息:\n`;
        company.management.forEach((manager, index) => {
          detailedInfo += `${index + 1}. ${manager.name} - ${manager.position}\n`;
        });
        detailedInfo += '\n';
      }
      
      if (company.cornerStoneInvestors && company.cornerStoneInvestors.length > 0) {
        detailedInfo += `💎 基石投资者 (总占比: ${company.totalCornerStonePercentage}%):\n`;
        company.cornerStoneInvestors.forEach((investor, index) => {
          detailedInfo += `${index + 1}. ${investor.name}\n`;
          detailedInfo += `   • 持股: ${investor.shareholding.toLocaleString()} 股 (${investor.percentage}%)\n`;
          detailedInfo += `   • 投资金额: ${investor.investmentAmount.toLocaleString()} 港元\n`;
          detailedInfo += `   • 类型: ${investor.investorType} | 解禁: ${investor.releaseDate}\n`;
        });
        detailedInfo += '\n';
      }
      
      if (company.prospectusLink) {
        detailedInfo += `📑 招股书链接:\n${company.prospectusLink}\n\n`;
      }
      
      if (company.substantialShareholders) {
        detailedInfo += `🏢 主要股东:\n${company.substantialShareholders}\n`;
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result,
            formatted_info: detailedInfo,
            message: `成功获取股票 ${stockCode} 的详细信息`,
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            message: `获取股票 ${args.stock_code} 详情失败`
          }, null, 2)
        }]
      };
    }
  }

  /**
   * 获取新股配售信息
   */
  async getAllocationInfo(args: any): Promise<any> {
    try {
      if (!args.stock_code) {
        throw new Error('股票代码不能为空');
      }

      const stockCode = String(args.stock_code).padStart(5, '0');
      const result = await this.apiClient.getAllocationInfo(stockCode);
      
      if (!result) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: null,
              message: `股票 ${stockCode} 暂无配售信息`
            }, null, 2)
          }]
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result,
            message: `成功获取股票 ${stockCode} 的配售信息`,
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            message: `获取股票 ${args.stock_code} 配售信息失败`
          }, null, 2)
        }]
      };
    }
  }

  /**
   * 获取新股暗盘交易数据
   */
  async getGreyMarketData(args: any): Promise<any> {
    try {
      if (!args.stock_code) {
        throw new Error('股票代码不能为空');
      }

      const stockCode = String(args.stock_code).padStart(5, '0');
      const result = await this.apiClient.getGreyMarketData(stockCode);
      
      if (!result) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: null,
              message: `股票 ${stockCode} 暂无暗盘交易数据`
            }, null, 2)
          }]
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result,
            message: `成功获取股票 ${stockCode} 的暗盘交易数据`,
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            message: `获取股票 ${args.stock_code} 暗盘数据失败`
          }, null, 2)
        }]
      };
    }
  }

  /**
   * 获取新股首日上市表现
   */
  async getFirstDayPerformance(args: any): Promise<any> {
    try {
      if (!args.stock_code) {
        throw new Error('股票代码不能为空');
      }

      const stockCode = String(args.stock_code).padStart(5, '0');
      const result = await this.apiClient.getFirstDayPerformance(stockCode);
      
      if (!result) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: null,
              message: `股票 ${stockCode} 暂无首日表现数据`
            }, null, 2)
          }]
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result,
            message: `成功获取股票 ${stockCode} 的首日表现数据`,
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            message: `获取股票 ${args.stock_code} 首日表现失败`
          }, null, 2)
        }]
      };
    }
  }

  /**
   * 根据公司名称搜索新股信息
   */
  async searchIPOByName(args: any): Promise<any> {
    try {
      if (!args.company_name) {
        throw new Error('公司名称不能为空');
      }

      // 获取所有新股列表并进行搜索
      const result = await this.apiClient.getIPOList({ pageIndex: 1, pageSize: 100 });
      const keyword = args.company_name.toLowerCase();
      const exactMatch = args.exact_match || false;
      
      const matchedItems = result.items.filter((item: IPOInfo) => {
        const stockName = item.stockName.toLowerCase();
        return exactMatch ? 
          stockName === keyword : 
          stockName.includes(keyword);
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              keyword: args.company_name,
              exactMatch,
              matchedCount: matchedItems.length,
              items: matchedItems,
            },
            message: `找到 ${matchedItems.length} 只匹配的新股`,
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            message: `搜索公司 "${args.company_name}" 失败`
          }, null, 2)
        }]
      };
    }
  }

  /**
   * 获取新股市场概览
   */
  async getMarketOverview(args: any): Promise<any> {
    try {
      const days = args.days || 30;
      
      // 获取新股列表进行统计分析
      const result = await this.apiClient.getIPOList({ pageIndex: 1, pageSize: 100 });
      
      // 这里可以增加更多的统计逻辑
      const overview = {
        totalIPOs: result.items.length,
        period: `近${days}天`,
        statistics: {
          activeIPOs: result.items.filter(item => item.status === 'active').length,
          avgMarketCap: this.calculateAverage(result.items.map(item => item.marketCap)),
          avgPERatio: this.calculateAverage(result.items.map(item => item.peRatio)),
          industries: this.getIndustryDistribution(result.items),
        },
        lastUpdated: new Date().toISOString(),
      };
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: overview,
            message: `成功获取新股市场概览（${days}天）`,
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            message: '获取市场概览失败'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * 计算平均值
   */
  private calculateAverage(numbers: number[]): number {
    const validNumbers = numbers.filter(n => !isNaN(n) && n > 0);
    if (validNumbers.length === 0) return 0;
    return validNumbers.reduce((sum, n) => sum + n, 0) / validNumbers.length;
  }

  /**
   * 获取行业分布
   */
  private getIndustryDistribution(items: IPOInfo[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    items.forEach(item => {
      if (item.industry) {
        distribution[item.industry] = (distribution[item.industry] || 0) + 1;
      }
    });
    return distribution;
  }


} 
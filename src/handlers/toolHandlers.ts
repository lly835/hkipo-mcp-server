import { AipoApiClient } from '../services/aipoApi.js';
import { NetworkLogger } from '../utils/logger.js';
import { 
  IPOInfo, 
  IPODetail, 
  GreyMarketData, 
  AllocationInfo, 
  FirstDayPerformance,
  PaginationParams,
  PlacingResult
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
   * 获取新股详情
   */
  async getIPODetails(args: any): Promise<any> {
    try {
      if (!args.stock_code) {
        throw new Error('股票代码不能为空');
      }

      const stockCode = String(args.stock_code).padStart(5, '0');
      const result = await this.apiClient.getIPODetail(stockCode);
      
      // 构建简化的格式化信息
      let formattedInfo = `\n📊 ${result.stockName || stockCode} 详细信息\n`;
      formattedInfo += `═══════════════════════════════════════\n\n`;
      
      formattedInfo += `• 股票代码: ${result.stockCode}\n`;
      formattedInfo += `• 股票名称: ${result.stockName || '未知'}\n`;
      formattedInfo += `• 招股价: ${result.priceRange || '未知'}\n`;
      formattedInfo += `• 一手股数: ${result.lotSize || '未知'} 股\n`;
      formattedInfo += `• 上市日期: ${result.listingDate || '未知'}\n`;
      formattedInfo += `• 行业: ${result.industry || '未知'}\n`;
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result,
            formatted_info: formattedInfo,
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
   * 获取新股暗盘交易数据
   */
  async getGreyMarketData(args: any): Promise<any> {
    try {
      if (!args.stock_code) {
        throw new Error('股票代码不能为空');
      }

      const stockCode = String(args.stock_code).padStart(5, '0');
      
      // 优先使用新的暗盘列表接口
      let result = await this.apiClient.getGreyList(stockCode);
      
      // 如果新接口没有数据，则尝试使用旧接口
      if (!result) {
        result = await this.apiClient.getGreyMarketData(stockCode);
      }
      
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
      
      // 格式化暗盘数据，提供更友好的展示
      let formattedInfo = '';
      if (result) {
        formattedInfo = `\n📊 ${result.shortName || stockCode} 暗盘交易数据\n`;
        formattedInfo += `═══════════════════════════════════════\n\n`;
        formattedInfo += `• 招股价: ${result.ipoPricing || '未知'} 港元\n`;
        formattedInfo += `• 暗盘价: ${result.currentPrice || '未知'} 港元\n`;
        formattedInfo += `• 涨跌幅: ${result.changePercent?.toFixed(2) || '未知'}%\n`;
        formattedInfo += `• 成交量: ${result.volume?.toLocaleString() || '未知'} 股\n`;
        formattedInfo += `• 成交额: ${result.turnover?.toLocaleString() || '未知'} 港元\n`;
        formattedInfo += `• 上市日期: ${result.listingDate || '未知'}\n`;
        formattedInfo += `• 更新时间: ${new Date(result.lastUpdated).toLocaleString()}\n`;
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result,
            formatted_info: formattedInfo,
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
            message: `获取股票 ${args.stock_code} 暗盘交易数据失败`
          }, null, 2)
        }]
      };
    }
  }

  /**
   * 获取新股配售结果
   */
  async getPlacingResult(args: any): Promise<any> {
    try {
      if (!args.stock_code) {
        throw new Error('股票代码不能为空');
      }

      const stockCode = String(args.stock_code).padStart(5, '0');
      const result = await this.apiClient.getPlacingResult(stockCode);
      
      if (!result) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: null,
              message: `股票 ${stockCode} 暂无配售结果数据`
            }, null, 2)
          }]
        };
      }
      
      // 构建格式化的配售结果信息
      let formattedInfo = `\n📊 ${result.stockName} (${result.stockCode}) 配售结果\n`;
      formattedInfo += `═══════════════════════════════════════\n\n`;
      formattedInfo += `• 招股价: ${result.ipoPricing} 港元\n`;
      formattedInfo += `• 一手股数: ${result.lotSize} 股\n`;
      formattedInfo += `• 总发行股数: ${result.totalShares.toLocaleString()} 股\n`;
      formattedInfo += `• 认购倍数: ${result.subscribed.toFixed(2)}倍\n`;
      formattedInfo += `• 回拨比例: ${result.clawBack}%\n`;
      formattedInfo += `• 中签率: ${result.allocationRate}\n`;
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result,
            formatted_info: formattedInfo,
            message: `成功获取股票 ${stockCode} 的配售结果`,
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
            message: `获取股票 ${args.stock_code} 配售结果失败`
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
      
      // 首日表现数据暂时无法获取
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: null,
            message: `首日表现数据暂时无法获取，请使用其他接口查询股票 ${stockCode} 的信息`
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
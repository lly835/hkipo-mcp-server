#!/usr/bin/env node

// 使用ES模块语法导入
import { AipoApiClient } from './dist/services/aipoApi.js';
import { mcpConfig } from './dist/config/index.js';

// 显示当前配置的Token
console.log(`当前使用的Token: ${mcpConfig.requestVerificationToken ? mcpConfig.requestVerificationToken.substring(0, 10) + '...' : '未设置'}`);

// 创建API客户端实例
const apiClient = new AipoApiClient();

// 检查是否有命令行参数
const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
const showDetailedLevels = process.argv.includes('--detailed');

// 显示帮助信息
if (showHelp) {
  console.log('\n使用说明:');
  console.log('  node test-api.js              - 运行基本测试，显示主要配售指标');
  console.log('  node test-api.js --detailed   - 显示详细的申购层级信息');
  console.log('  node test-api.js --help       - 显示此帮助信息\n');
  process.exit(0);
}

// 测试股票代码（可以根据实际情况修改）
const testStockCode = '06603'; // IFBH

// 测试所有API接口
async function testAllApis() {
  console.log('开始测试所有API接口...\n');
  
  try {
    // 测试获取新股列表
    console.log('1. 测试获取新股列表...');
    const ipoList = await apiClient.getIPOList({ pageIndex: 1, pageSize: 10 });
    console.log(`✅ 成功获取新股列表，共 ${ipoList.items.length} 条记录`);
    console.log(`   第一条记录: ${ipoList.items[0]?.stockName} (${ipoList.items[0]?.stockCode})`);
    console.log('');
    
    // 获取一个有效的股票代码用于后续测试
    // const validStockCode = ipoList.items[0]?.stockCode || testStockCode;
    const validStockCode = testStockCode; // 强制使用06603
    
    // 测试获取新股详情
    console.log(`2. 测试获取新股详情 (股票代码: ${validStockCode})...`);
    const ipoDetail = await apiClient.getIPODetail(validStockCode);
    console.log(`✅ 成功获取新股详情: ${ipoDetail.stockName || validStockCode}`);
    console.log(`   招股价: ${ipoDetail.priceRange || '未知'}`);
    console.log(`   一手股数: ${ipoDetail.lotSize || '未知'}`);
    console.log('');
    
    // 测试获取配售信息
    console.log(`3. 测试获取配售信息 (股票代码: ${validStockCode})...`);
    const placingResult = await apiClient.getPlacingResult(validStockCode);
    if (placingResult) {
      console.log(`✅ 成功获取配售信息`);
      // 只打印核心信息，不包括完整的allocationList
      const { allocationList, ...coreInfo } = placingResult;
      console.log({
        ...coreInfo,
        // 只显示allocationList长度
        allocationListLength: allocationList?.length || 0,
        // 只显示第一个配售层级的信息作为示例
        firstAllocationLevel: allocationList?.[0] || null
      });
    } else {
      console.log(`ℹ️ 股票 ${validStockCode} 暂无配售信息`);
    }
    console.log('');
    
    // 测试获取暗盘数据
    console.log(`4. 测试获取暗盘数据 (股票代码: ${validStockCode})...`);
    // 优先使用新的暗盘列表接口
    const greyMarketData = await apiClient.getGreyList(validStockCode);
    
    if (greyMarketData) {
      console.log(`✅ 成功获取暗盘数据`);
      console.log(`   股票: ${greyMarketData.shortName} (${greyMarketData.stockCode})`);
      console.log(`   招股价: ${greyMarketData.ipoPricing} 港元`);
      console.log(`   暗盘价: ${greyMarketData.currentPrice} 港元`);
      console.log(`   涨跌幅: ${greyMarketData.changePercent}%`);
      console.log(`   成交量: ${greyMarketData.volume?.toLocaleString()} 股`);
      console.log(`   成交额: ${greyMarketData.turnover?.toLocaleString()} 港元`);
    } else {
      console.log(`ℹ️ 股票 ${validStockCode} 暂无暗盘数据`);
    }
    
    console.log('✅ 所有API接口测试完成！');
    
  } catch (error) {
    console.error(`❌ 测试失败: ${error.message}`);
    console.error(error);
  }
}

// 执行测试
testAllApis(); 
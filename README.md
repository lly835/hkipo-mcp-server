# hkipo-mcp-server

## 项目概述
这是一个港股新股信息的MCP（Model Context Protocol）服务，为AI助手提供实时的香港新股信息查询能力。

## 核心功能

### 1. 新股招股信息查询
- **查询正在招股的股票**
  - 获取当前正在进行IPO的股票列表
  - 包含股票代码、公司名称、招股时间段
  - 支持按行业、市值等筛选条件

### 2. 新股详情查询
- **查询招股前股票详情**
  - 一手股数（每手股票数量）
  - 招股价格区间
  - 招股金额（募资总额）
  - 公司基本信息（行业、主营业务等）
  - 招股书PDF链接及下载
  - 保荐人信息
  - 上市时间表

### 3. 配售与抽签信息
- **查询配售信息**
  - 公开发售与国际配售比例
  - 中签率统计（历史数据）
  - 认购倍数
  - 配售结果公告PDF链接
  - 分配详情（散户/机构）

### 4. 二级市场表现
- **查询暗盘交易数据**
  - 暗盘价格及涨跌幅
  - 暗盘成交量
  - 多个券商暗盘报价对比
- **首日上市表现**
  - 开盘价、最高价、最低价、收盘价
  - 首日涨跌幅
  - 成交量及换手率
  - 市值表现

## 技术架构

### MCP工具定义
```typescript
interface HKIPOTools {
  // 获取正在招股的新股列表
  list_active_ipos: {
    parameters: {
      industry?: string;
      min_market_cap?: number;
      max_market_cap?: number;
    }
  };
  
  // 获取特定新股详细信息
  get_ipo_details: {
    parameters: {
      stock_code: string;
    }
  };
  
  // 获取配售信息
  get_allocation_info: {
    parameters: {
      stock_code: string;
    }
  };
  
  // 获取暗盘交易数据
  get_grey_market_data: {
    parameters: {
      stock_code: string;
      broker?: string;
    }
  };
  
  // 获取首日表现
  get_first_day_performance: {
    parameters: {
      stock_code: string;
    }
  };
}
```

### 数据源
- **主要数据源**：[AiPO数据网](https://aipo.myiqdii.com/aipo/index)
  - 新股发行概况和详情
  - 暗盘交易数据
  - 配售结果和认购信息
  - 孖展数据和排行
- **辅助数据源**：
  - 香港交易所官方数据（验证用）
  - 招股书PDF链接
  - 公司公告

### 响应格式
所有API返回统一的JSON格式：
```json
{
  "success": boolean,
  "data": object,
  "message": string,
  "timestamp": string
}
```

## 快速开始 - 在ChatWise中使用

### 第1步：获取Token
在Chrome中访问 https://aipo.myiqdii.com，按F12打开开发者工具，在Console中输入：
```javascript
localStorage.getItem("token")
```
复制返回的token值。

### 第2步：在ChatWise中配置
```json
{
  "mcpServers": {
    "hkipo-mcp": {
      "command": "npx",
      "args": ["hkipo-mcp"],
      "env": {
        "TOKEN": "这里粘贴步骤1获取的token"
      }
    }
  }
}
```

**就这么简单！** 详细说明请参考：[Token配置指南](./CHATWISE_TOKEN_SETUP.md)

### 方法二：本地项目配置（推荐）
1. 下载本项目到本地
2. 运行安装和编译：
   ```bash
   npm install && npm run build
   npm install -g .
   ```
3. 在ChatWise中导入配置文件 `chatwise-config.json`（简化版）或 `mcp-server.json`（完整版）

### 方法三：手动添加MCP服务
在ChatWise的设置中添加新的MCP服务器：
- **服务器名称**: `hkipo`  
- **命令**: `npx`
- **参数**: `["hkipo-mcp"]`
- **工作目录**: （任意目录或留空）
- **描述**: `港股新股信息MCP服务`

### 方法四：使用启动脚本
```bash
# 给脚本添加执行权限  
chmod +x start-mcp.sh

# 在ChatWise中指定脚本路径
./start-mcp.sh
```

## 详细安装说明

### 环境要求
- Node.js 18+
- TypeScript 4.8+

### 安装依赖
```bash
npm install
```

### 配置
创建 `.env` 文件：
```env
# AiPO数据网配置
AIPO_BASE_URL=https://aipo.myiqdii.com
AIPO_USER_AGENT=Mozilla/5.0 (compatible; HKIPO-MCP-Server)

# 缓存配置
CACHE_TTL=300
REDIS_URL=redis://localhost:6379

# 请求限制配置
RATE_LIMIT=100
RATE_LIMIT_WINDOW=3600
```

### 启动服务
```bash
npm run start
```

### MCP客户端配置
```json
{
  "mcpServers": {
    "hkipo": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "HKE_API_KEY": "your_api_key"
      }
    }
  }
}
```

## 使用示例

### 查询正在招股的新股
```
请帮我查询当前正在招股的科技类新股
```

### 查询特定新股详情
```
请提供股票代码9999的详细招股信息，包括招股书链接
```

### 查询配售结果
```
查询9999号股票的中签率和配售详情
```

### 查询暗盘表现
```
9999号股票现在的暗盘价格是多少？各家券商报价如何？
```

## 更新计划

### V1.0 - 基础功能
- [ ] 新股列表查询
- [ ] 基本详情查询
- [ ] 招股书PDF链接

### V1.1 - 增强功能
- [ ] 配售信息查询
- [ ] 中签率统计
- [ ] 历史数据支持

### V1.2 - 市场数据
- [ ] 暗盘价格监控
- [ ] 首日表现追踪
- [ ] 多券商数据整合

### V2.0 - 智能分析
- [ ] 新股表现预测
- [ ] 行业对比分析
- [ ] 投资建议生成

## 贡献指南
1. Fork本项目
2. 创建功能分支
3. 提交代码更改
4. 创建Pull Request

## 许可证
MIT License

## 联系方式
- 项目维护者：[您的联系方式]
- 问题反馈：[GitHub Issues链接]
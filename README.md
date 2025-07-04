# 港股打新信息MCP服务

为AI助手提供实时香港新股信息查询的MCP服务。

## 快速使用

### 1. 获取Token
在Chrome中访问 https://aipo.myiqdii.com 并登录，按F12打开控制台：
```javascript
localStorage.getItem("token")
```
复制返回的token值（不包括引号）。

### 2. 配置ChatWise
```json
{
  "mcpServers": {
    "hkipo-mcp": {
      "command": "npx",
      "args": ["hkipo-mcp"],
      "env": {
        "TOKEN": "你的token"
      }
    }
  }
}
```

## 功能特性

- **新股列表查询** - 获取正在招股的新股
- **详细信息查询** - 招股价格、募资金额、上市时间等
- **暗盘数据** - 暗盘价格、成交量
- **首日表现** - 开盘价、涨跌幅
- **配售结果** - 各认购手数的中签比例、申请人数、需缴款金额等详细数据

## 使用示例

```
查询当前正在招股的新股
获取01304的详细招股信息
06603暗盘情况
查看06603的配售结果
```

## 技术信息

- **数据源**: 
  - [AiPO数据网](https://aipo.myiqdii.com) - 新股基本信息、暗盘数据
  - [交易宝数据](https://jybdata.iqdii.com) - 配售结果数据
- **支持平台**: ChatWise等MCP兼容AI助手
- **环境要求**: Node.js 18+

## 许可证

MIT License
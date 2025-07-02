# 港股打新信息MCP服务

为AI助手提供实时香港新股信息查询的MCP服务。

## 快速使用

### 1. 获取Token
在Chrome中访问 https://aipo.myiqdii.com 并登录，按F12打开控制台：
```javascript
localStorage.getItem("token")
```

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
- **配售信息** - 中签率、认购倍数
- **暗盘数据** - 暗盘价格、成交量
- **首日表现** - 开盘价、涨跌幅

## 使用示例

```
查询当前正在招股的新股
获取01304的详细信息
01304的暗盘价格是多少？
```

## 技术信息

- **数据源**: [AiPO数据网](https://aipo.myiqdii.com)
- **支持平台**: ChatWise等MCP兼容AI助手
- **环境要求**: Node.js 18+

## 许可证

MIT License
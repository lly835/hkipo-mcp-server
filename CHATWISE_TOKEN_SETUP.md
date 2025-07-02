# ChatWise中配置Token

## 概述
港股新股信息MCP服务需要从AiPO数据网的localStorage中获取`token`来访问API。

## 🚀 快速获取Token

### 第1步：打开AiPO数据网
在Chrome浏览器中访问：https://aipo.myiqdii.com

### 第2步：打开开发者工具
按 `F12` 或右键选择"检查"

### 第3步：获取Token
在Console（控制台）面板中，输入以下命令：
```javascript
localStorage.getItem("token")
```

复制返回的token值（一串长字符串）。

## 📋 在ChatWise中配置

### 方法1：环境变量配置
```json
{
  "mcpServers": {
    "hkipo-mcp": {
      "command": "npx",
      "args": ["hkipo-mcp"],
      "env": {
        "TOKEN": "这里粘贴从localStorage获取的token值"
      }
    }
  }
}
```

### 方法2：创建.env文件
在项目根目录创建`.env`文件：
```env
TOKEN=这里粘贴从localStorage获取的token值
```

## 💡 完整配置示例

```json
{
  "mcpServers": {
    "hkipo-mcp": {
      "command": "npx",
      "args": ["hkipo-mcp"],
      "env": {
        "TOKEN": "xxxxxxxx"
      }
    }
  }
}
```

## ⚠️ 注意事项

1. **Token有效期**: Token可能会过期，如果API返回401错误，请重新获取
2. **浏览器要求**: 需要先在Chrome中访问过AiPO网站
3. **安全性**: 不要在公开代码中暴露真实的token

## 🔧 故障排除

### 401错误
- Token可能已过期，重新访问网站并获取新token
- 检查token是否完整复制

### 配置不生效
- 确保ChatWise重启后生效
- 检查JSON格式是否正确
- 确保没有多余的引号或空格

## 📱 测试配置

配置完成后，可以测试MCP服务：
```bash
# 测试服务启动
npx hkipo-mcp

# 如果本地开发，可以运行：
npm test
```

---

✅ 配置完成后，您就可以在ChatWise中查询港股新股信息了！ 
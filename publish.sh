#!/bin/bash

echo "🚀 开始发布 hkipo-mcp 到 NPM..."

# 检查是否登录npm
echo "📋 检查NPM登录状态..."
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ 您还未登录NPM，请先运行: npm login"
    exit 1
fi

echo "✅ NPM登录状态正常: $(npm whoami)"

# 清理并编译
echo "🔧 清理并编译项目..."
npm run clean
npm run build

# 检查包内容
echo "📦 检查包内容..."
npm pack --dry-run

# 确认发布
echo ""
echo "📋 准备发布的包信息:"
echo "- 包名: hkipo-mcp"
echo "- 版本: $(node -p "require('./package.json').version")"
echo "- 大小: ~28.6 kB"
echo ""

read -p "🤔 确认发布到NPM? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 发布已取消"
    exit 1
fi

# 发布
echo "📤 正在发布到NPM..."
if npm publish; then
    echo ""
    echo "🎉 发布成功！"
    echo ""
    echo "📋 用户现在可以使用:"
    echo "   npx hkipo-mcp"
    echo ""
    echo "📋 在ChatWise中配置:"
    echo '   {"mcpServers": {"hkipo-mcp": {"command": "npx", "args": ["hkipo-mcp"], "env": {"TOKEN": "用户的token"}}}}'
    echo ""
    echo "🔗 包页面: https://www.npmjs.com/package/hkipo-mcp"
    
    # 清理临时文件
    rm -f hkipo-mcp-*.tgz
    
else
    echo "❌ 发布失败"
    exit 1
fi 
#!/bin/bash

echo "🚀 发布 hkipo-mcp 到 NPM..."

# 检查npm登录状态
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ 请先登录NPM: npm login"
    exit 1
fi

echo "✅ NPM登录: $(npm whoami)"

# 清理并编译
npm run clean && npm run build

# 确认发布
echo "📋 包信息: hkipo-mcp v$(node -p "require('./package.json').version")"
read -p "确认发布? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

# 发布
if npm publish; then
    echo "🎉 发布成功！用户可以使用: npx hkipo-mcp"
    rm -f hkipo-mcp-*.tgz
else
    echo "❌ 发布失败"
    exit 1
fi 
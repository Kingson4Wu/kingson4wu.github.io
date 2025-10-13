#!/bin/bash
set -e

echo "🛠️ Setting up Hexo environment..."

# 安装项目依赖（如果有 package.json）
if [ -f "package.json" ]; then
  npm install
fi

# 初始化 Hexo（如果还没初始化）
if [ ! -d "source" ]; then
  echo "⚙️ Initializing Hexo blog..."
  hexo init .
  npm install
fi

echo "✅ Hexo environment ready!"
echo "👉 You can now run:  npx hexo s"

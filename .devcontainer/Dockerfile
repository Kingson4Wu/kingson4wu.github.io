FROM mcr.microsoft.com/devcontainers/javascript-node:20

# 安装常用工具
RUN apt-get update && apt-get install -y zsh git curl && rm -rf /var/lib/apt/lists/*

# 安装 Hexo CLI 全局命令
RUN npm install -g hexo-cli

# 设置默认工作目录
WORKDIR /workspaces

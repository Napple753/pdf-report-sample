# Node.js LTS をベースイメージに使用
FROM node:22-bookworm

# システムパッケージの更新と開発ツールのインストール
RUN apt-get update && apt-get install -y \
    git \
    curl \
    sudo \
    zsh \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# node ユーザーに sudo 権限を付与（パスワードなし）
RUN echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Claude Code をグローバルインストール
RUN npm install -g @anthropic-ai/claude-code

# Vite をグローバルインストール（npm create vite なしでも使えるように）
RUN npm install -g vite

# node ユーザーで作業（root 以外で実行することが Claude Code の要件）
USER node

# デフォルトシェルを zsh に設定
SHELL ["/bin/zsh", "-c"]

WORKDIR /workspace

ENV HOST=0.0.0.0

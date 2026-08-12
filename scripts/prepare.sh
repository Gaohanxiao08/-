#!/usr/bin/env bash
# 预处理脚本：安装依赖（仅在未安装时执行）
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -d node_modules ]; then
  pnpm install
fi

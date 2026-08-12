#!/usr/bin/env bash
# 生产构建脚本
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export COZE_PROJECT_ENV="${COZE_PROJECT_ENV:-PROD}"
pnpm exec next build

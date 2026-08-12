#!/usr/bin/env bash
# 生产环境启动脚本
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export HOSTNAME="${HOSTNAME:-localhost}"
export PORT="${PORT:-3000}"
export COZE_PROJECT_ENV="${COZE_PROJECT_ENV:-PROD}"

pnpm exec next start --hostname "$HOSTNAME" --port "$PORT"

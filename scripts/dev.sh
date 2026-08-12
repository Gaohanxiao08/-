#!/usr/bin/env bash
# 开发环境启动脚本
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export HOSTNAME="${HOSTNAME:-localhost}"
export PORT="${PORT:-3000}"
export COZE_PROJECT_ENV="${COZE_PROJECT_ENV:-DEV}"

pnpm exec next dev --hostname "$HOSTNAME" --port "$PORT"

#!/usr/bin/env bash
# 重启指定 pm2 进程；web 目标只 reload nginx。
set -euo pipefail

TARGET="${1:-all}"
ROOT="${XTOOL_REMOTE_ROOT:-/root/.nvm/xTool}"
PM2_CONFIG="${XTOOL_REMOTE_PM2_CONFIG:-ecosystem.config.cjs}"
HEALTH_URL="${XTOOL_REMOTE_HEALTH_URL:-http://127.0.0.1:5198/health}"
CHAT_HEALTH_URL="${XTOOL_REMOTE_CHAT_HEALTH_URL:-http://127.0.0.1:5298/health}"
MCP_HEALTH_URL="${XTOOL_REMOTE_MCP_HEALTH_URL:-http://127.0.0.1:5197/health}"

cd "$ROOT"

restart_one() {
  local name="$1"
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "pm2 未安装" >&2
    exit 1
  fi
  if pm2 describe "$name" >/dev/null 2>&1; then
    pm2 restart "$name" --update-env
  else
    pm2 start "$PM2_CONFIG" --only "$name" --update-env
  fi
}

case "$TARGET" in
  all)
    restart_one xTool-server
    restart_one xTool-mcp
    restart_one xTool-chat-server
    ;;
  server) restart_one xTool-server ;;
  mcp) restart_one xTool-mcp ;;
  chat) restart_one xTool-chat-server ;;
  web)
    nginx -t
    nginx -s reload
    ;;
  *)
    echo "未知目标: $TARGET（可选 all/server/mcp/chat/web）" >&2
    exit 1
    ;;
esac

if command -v pm2 >/dev/null 2>&1 && [ "$TARGET" != "web" ]; then
  pm2 save >/dev/null 2>&1 || true
fi

sleep 2
fail=0
check() {
  local name="$1"
  local url="$2"
  if curl -fsS --max-time 8 "$url" >/dev/null 2>&1; then
    printf 'OK   %s\n' "$name"
  else
    printf 'FAIL %s %s\n' "$name" "$url"
    fail=1
  fi
}
case "$TARGET" in
  server) check server "$HEALTH_URL" ;;
  chat) check chat "$CHAT_HEALTH_URL" ;;
  mcp) check mcp "$MCP_HEALTH_URL" ;;
  web) check web "${XTOOL_REMOTE_WEB_URL:-http://127.0.0.1/}" ;;
  all)
    check server "$HEALTH_URL"
    check chat "$CHAT_HEALTH_URL"
    check mcp "$MCP_HEALTH_URL"
    ;;
esac

exit "$fail"

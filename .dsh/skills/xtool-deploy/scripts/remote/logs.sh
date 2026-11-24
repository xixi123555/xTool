#!/usr/bin/env bash
# 查看 pm2 / nginx 日志。
set -euo pipefail

TARGET="${1:-server}"
LINES="${2:-100}"

case "$TARGET" in
  server) pm2 logs xTool-server --lines "$LINES" --nostream ;;
  mcp) pm2 logs xTool-mcp --lines "$LINES" --nostream ;;
  chat) pm2 logs xTool-chat-server --lines "$LINES" --nostream ;;
  all) pm2 logs --lines "$LINES" --nostream ;;
  web)
    echo "==> nginx error.log"
    tail -n "$LINES" /var/log/nginx/error.log 2>/dev/null || true
    echo "==> nginx access.log"
    tail -n "$LINES" /var/log/nginx/access.log 2>/dev/null || true
    ;;
  *)
    echo "未知目标: $TARGET（可选 server/mcp/chat/all/web）" >&2
    exit 1
    ;;
esac

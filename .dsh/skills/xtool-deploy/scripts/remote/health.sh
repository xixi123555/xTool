#!/usr/bin/env bash
# 生产健康检查；任一检查失败返回非 0。
set +e

HEALTH_URL="${XTOOL_REMOTE_HEALTH_URL:-http://127.0.0.1:5198/health}"
CHAT_HEALTH_URL="${XTOOL_REMOTE_CHAT_HEALTH_URL:-http://127.0.0.1:5298/health}"
MCP_HEALTH_URL="${XTOOL_REMOTE_MCP_HEALTH_URL:-http://127.0.0.1:5197/health}"
WEB_URL="${XTOOL_REMOTE_WEB_URL:-http://127.0.0.1/}"

fail=0

check_json() {
  local name="$1"
  local url="$2"
  local body
  if body="$(curl -fsS --max-time 8 "$url" 2>/dev/null)"; then
    printf 'OK   %-6s %s %s\n' "$name" "$url" "$body"
  else
    printf 'FAIL %-6s %s\n' "$name" "$url"
    fail=1
  fi
}

check_web() {
  local code
  code="$(curl -sS --max-time 8 -o /dev/null -w '%{http_code}' "$WEB_URL" 2>/dev/null)"
  if [ "$code" = "200" ]; then
    printf 'OK   web    %s %s\n' "$WEB_URL" "$code"
  else
    printf 'FAIL web    %s %s\n' "$WEB_URL" "${code:-no-response}"
    fail=1
  fi
}

check_json "server" "$HEALTH_URL"
check_json "chat" "$CHAT_HEALTH_URL"
check_json "mcp" "$MCP_HEALTH_URL"
check_web

exit "$fail"

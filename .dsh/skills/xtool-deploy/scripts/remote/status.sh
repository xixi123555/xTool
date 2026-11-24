#!/usr/bin/env bash
# 只读巡检：主机、代码、运行时、进程、端口、健康检查。
set +e

ROOT="${XTOOL_REMOTE_ROOT:-/root/.nvm/xTool}"
WEB_ROOT="${XTOOL_REMOTE_WEB_ROOT:-/var/www/html/xTool}"
HEALTH_URL="${XTOOL_REMOTE_HEALTH_URL:-http://127.0.0.1:5198/health}"
CHAT_HEALTH_URL="${XTOOL_REMOTE_CHAT_HEALTH_URL:-http://127.0.0.1:5298/health}"
MCP_HEALTH_URL="${XTOOL_REMOTE_MCP_HEALTH_URL:-http://127.0.0.1:5197/health}"
WEB_URL="${XTOOL_REMOTE_WEB_URL:-http://127.0.0.1/}"

section() {
  printf '\n\033[1;36m==> %s\033[0m\n' "$*"
}

section "主机"
hostname
date '+%Y-%m-%d %H:%M:%S %z'
uptime
printf 'kernel: %s\n' "$(uname -r)"

section "运行时"
if command -v node >/dev/null 2>&1; then
  printf 'node: %s\n' "$(node -v)"
else
  echo "node: 未安装"
fi
if command -v pnpm >/dev/null 2>&1; then
  printf 'pnpm: %s\n' "$(pnpm -v)"
elif command -v corepack >/dev/null 2>&1; then
  printf 'pnpm: 未安装，corepack %s 可用\n' "$(corepack -v 2>/dev/null)"
else
  echo "pnpm: 未安装"
fi
if command -v pm2 >/dev/null 2>&1; then
  printf 'pm2: %s\n' "$(pm2 -v 2>/dev/null | tail -1)"
else
  echo "pm2: 未安装"
fi
if command -v python3 >/dev/null 2>&1; then
  printf 'python3: %s\n' "$(python3 -V 2>&1)"
fi

section "代码"
if [ -d "$ROOT/.git" ]; then
  git -C "$ROOT" status --short --branch
  git -C "$ROOT" log -3 --oneline
else
  echo "未找到 git 仓库: $ROOT"
fi

section "环境文件"
for file in "$ROOT/apps/server/.env" "$ROOT/apps/mcp/.env" "$ROOT/chat-server/.env"; do
  if [ -f "$file" ]; then
    ls -l "$file"
  else
    echo "缺失: $file"
  fi
done

section "PM2"
if command -v pm2 >/dev/null 2>&1; then
  pm2 list
else
  echo "pm2 未安装"
fi

section "监听端口"
if command -v ss >/dev/null 2>&1; then
  ss -lntp 2>/dev/null | grep -E ':(80|443|5197|5198|5199|5298)\b' || true
elif command -v netstat >/dev/null 2>&1; then
  netstat -lntp 2>/dev/null | grep -E ':(80|443|5197|5198|5199|5298)\b' || true
else
  echo "ss/netstat 均不可用"
fi

section "健康检查"
check_json() {
  local name="$1"
  local url="$2"
  local body
  if body="$(curl -fsS --max-time 6 "$url" 2>/dev/null)"; then
    printf 'OK   %-6s %s %s\n' "$name" "$url" "$body"
  else
    printf 'FAIL %-6s %s\n' "$name" "$url"
  fi
}
check_json "server" "$HEALTH_URL"
check_json "chat" "$CHAT_HEALTH_URL"
check_json "mcp" "$MCP_HEALTH_URL"

web_code="$(curl -sS --max-time 8 -o /dev/null -w '%{http_code}' "$WEB_URL" 2>/dev/null)"
if [ "$web_code" = "200" ]; then
  printf 'OK   web    %s %s\n' "$WEB_URL" "$web_code"
else
  printf 'FAIL web    %s %s\n' "$WEB_URL" "${web_code:-no-response}"
fi

section "Nginx"
if command -v nginx >/dev/null 2>&1; then
  nginx -t 2>&1
else
  echo "nginx 未安装"
fi
if [ -d "$WEB_ROOT" ]; then
  printf 'web root: %s\n' "$WEB_ROOT"
  du -sh "$WEB_ROOT" 2>/dev/null
  ls -lt "$WEB_ROOT" 2>/dev/null | head -5
else
  echo "web root 不存在: $WEB_ROOT"
fi

section "资源"
df -h / 2>/dev/null
free -h 2>/dev/null

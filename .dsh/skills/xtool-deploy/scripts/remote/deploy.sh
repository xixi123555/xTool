#!/usr/bin/env bash
# 生产发布：拉取代码 → 安装依赖 → 构建 → 同步静态站 → reload pm2 → 健康检查。
set -euo pipefail

ROOT="${XTOOL_REMOTE_ROOT:?}"
WEB_ROOT="${XTOOL_REMOTE_WEB_ROOT:?}"
BRANCH="${XTOOL_REMOTE_BRANCH:-main}"
REMOTE="${XTOOL_REMOTE_NAME:-origin}"
PM2_CONFIG="${XTOOL_REMOTE_PM2_CONFIG:-ecosystem.config.cjs}"
PULL="${XTOOL_REMOTE_PULL:-1}"
CHAT_DEPS="${XTOOL_REMOTE_CHAT_DEPS:-0}"
NGINX_RELOAD="${XTOOL_REMOTE_NGINX_RELOAD:-0}"
ROLLBACK_COMMIT="${XTOOL_REMOTE_ROLLBACK_COMMIT:-}"
HEALTH_URL="${XTOOL_REMOTE_HEALTH_URL:-http://127.0.0.1:5198/health}"
CHAT_HEALTH_URL="${XTOOL_REMOTE_CHAT_HEALTH_URL:-http://127.0.0.1:5298/health}"
MCP_HEALTH_URL="${XTOOL_REMOTE_MCP_HEALTH_URL:-http://127.0.0.1:5197/health}"
WEB_URL="${XTOOL_REMOTE_WEB_URL:-http://127.0.0.1/}"

step() {
  printf '\n\033[1;36m==> %s\033[0m\n' "$*"
}
warn() {
  printf '\033[1;33mWARN\033[0m %s\n' "$*" >&2
}
die() {
  printf '\033[1;31mERROR\033[0m %s\n' "$*" >&2
  exit 1
}

[ -d "$ROOT/.git" ] || die "服务器仓库不存在: $ROOT"
cd "$ROOT"

# 兼容第一次从旧目录结构升级：先把运行时文件复制到新路径，
# 再让 git pull 删除仓库里已移除的旧 .env。
step "兼容旧目录的运行时文件"
mkdir -p apps/server apps/mcp
if [ -f server/.env ] && [ ! -f apps/server/.env ]; then
  cp -p server/.env apps/server/.env
  echo "migrated server/.env -> apps/server/.env"
fi
if [ -f xtool-mcp/.env ] && [ ! -f apps/mcp/.env ]; then
  cp -p xtool-mcp/.env apps/mcp/.env
  echo "migrated xtool-mcp/.env -> apps/mcp/.env"
fi
if [ -d server/uploads ] && [ ! -d apps/server/uploads ]; then
  mkdir -p apps/server/uploads
  cp -a server/uploads/. apps/server/uploads/ 2>/dev/null || true
  echo "migrated server/uploads -> apps/server/uploads"
fi
# 旧路径的 .env 在历史上是 tracked；先还原再 pull，避免本地修改阻塞 fast-forward
git checkout -- server/.env 2>/dev/null || true
git checkout -- xtool-mcp/.env 2>/dev/null || true

if [ -n "$ROLLBACK_COMMIT" ]; then
  step "回滚到 $ROLLBACK_COMMIT"
  git fetch "$REMOTE" --tags >/dev/null 2>&1 || true
  git checkout --detach "$ROLLBACK_COMMIT"
  PULL=0
fi

if [ "$PULL" = "1" ]; then
  step "检查服务器工作区"
  if ! git diff --quiet || ! git diff --cached --quiet; then
    git status --short
    die "服务器有已跟踪文件改动，请先处理后再发布"
  fi

  step "拉取 $REMOTE/$BRANCH"
  git fetch "$REMOTE" "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only "$REMOTE" "$BRANCH"
else
  step "跳过 git 拉取，使用服务器当前 checkout"
fi

HEAD_SHA="$(git rev-parse --short HEAD)"
step "当前提交 $HEAD_SHA"
git log -1 --oneline

step "检查运行时"
command -v node >/dev/null 2>&1 || die "node 未安装"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || die "Node 版本过低（当前 $(node -v)），需要 >= 20.19"
printf 'node %s\n' "$(node -v)"

PNPM_KIND=""
if command -v pnpm >/dev/null 2>&1; then
  PNPM_KIND="pnpm"
else
  command -v corepack >/dev/null 2>&1 || die "pnpm 与 corepack 均不可用"
  corepack enable >/dev/null 2>&1 || die "corepack enable 失败"
  PNPM_KIND="corepack"
fi
run_pnpm() {
  if [ "$PNPM_KIND" = "pnpm" ]; then
    pnpm "$@"
  else
    corepack pnpm "$@"
  fi
}
step "pnpm 版本"
run_pnpm -v

step "检查环境文件"
[ -f apps/server/.env ] || die "缺少 apps/server/.env，请先在服务器配置"
[ -f apps/mcp/.env ] || die "缺少 apps/mcp/.env，请先在服务器配置"
[ -f chat-server/.env ] || warn "缺少 chat-server/.env；聊天服务可能使用默认配置"
ls -l apps/server/.env apps/mcp/.env

step "安装依赖"
run_pnpm install --frozen-lockfile

step "构建"
run_pnpm build

[ -d apps/web/dist ] || die "构建产物不存在: apps/web/dist"

step "同步静态站到 $WEB_ROOT"
mkdir -p "$WEB_ROOT"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete apps/web/dist/ "$WEB_ROOT/"
else
  find "$WEB_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -a apps/web/dist/. "$WEB_ROOT/"
fi
printf 'web files: %s\n' "$(find "$WEB_ROOT" -type f | wc -l)"

if [ "$CHAT_DEPS" = "1" ]; then
  step "更新 chat-server Python 依赖"
  [ -x chat-server/.venv/bin/pip ] || die "chat-server/.venv 不存在，请先创建 Python 环境"
  chat-server/.venv/bin/pip install -r chat-server/requirements.txt
fi

step "reload pm2"
command -v pm2 >/dev/null 2>&1 || die "pm2 未安装"
pm2 startOrReload "$PM2_CONFIG" --update-env
pm2 save

if [ "$NGINX_RELOAD" = "1" ]; then
  step "reload nginx"
  nginx -t
  nginx -s reload
fi

step "健康检查"
sleep 2
health_fail=0
check_json() {
  local name="$1"
  local url="$2"
  local body
  if body="$(curl -fsS --max-time 8 "$url" 2>/dev/null)"; then
    printf 'OK   %-6s %s %s\n' "$name" "$url" "$body"
  else
    printf 'FAIL %-6s %s\n' "$name" "$url"
    health_fail=1
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
  health_fail=1
fi

if [ "$health_fail" -ne 0 ]; then
  warn "健康检查失败，输出最近日志："
  pm2 logs xTool-server --lines 50 --nostream 2>/dev/null || true
  pm2 logs xTool-chat-server --lines 50 --nostream 2>/dev/null || true
  exit 1
fi

step "发布完成：$HEAD_SHA"
pm2 list
if [ -n "$ROLLBACK_COMMIT" ]; then
  warn "当前为 detached HEAD；下一次 deploy 会切回 $BRANCH"
fi

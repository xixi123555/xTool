#!/usr/bin/env bash
# 读取本机部署凭据与默认发布参数。凭据文件不会进入仓库。

XT_SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
XT_PROJECT_ROOT="$(cd "$XT_SKILL_DIR/../../.." && pwd)"

# 兼容从 zsh 登录环境或任意非交互 shell 调用
XT_ENV_FILE="${XTOOL_DEPLOY_ENV_FILE:-$HOME/.config/xtool/deploy.env}"
if [ -f "$XT_ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$XT_ENV_FILE"
fi

XTOOL_DEPLOY_HOST="${XTOOL_DEPLOY_HOST:-}"
XTOOL_DEPLOY_USER="${XTOOL_DEPLOY_USER:-root}"
XTOOL_DEPLOY_PASSWORD="${XTOOL_DEPLOY_PASSWORD:-}"
XTOOL_DEPLOY_PORT="${XTOOL_DEPLOY_PORT:-22}"
XTOOL_DEPLOY_IDENTITY_FILE="${XTOOL_DEPLOY_IDENTITY_FILE:-}"

XTOOL_DEPLOY_ROOT="${XTOOL_DEPLOY_ROOT:-/root/.nvm/xTool}"
XTOOL_DEPLOY_WEB_ROOT="${XTOOL_DEPLOY_WEB_ROOT:-/var/www/html/xTool}"
XTOOL_DEPLOY_BRANCH="${XTOOL_DEPLOY_BRANCH:-main}"
XTOOL_DEPLOY_REMOTE="${XTOOL_DEPLOY_REMOTE:-origin}"
XTOOL_DEPLOY_PM2_CONFIG="${XTOOL_DEPLOY_PM2_CONFIG:-ecosystem.config.cjs}"
XTOOL_DEPLOY_HEALTH_URL="${XTOOL_DEPLOY_HEALTH_URL:-http://127.0.0.1:5198/health}"
XTOOL_DEPLOY_CHAT_HEALTH_URL="${XTOOL_DEPLOY_CHAT_HEALTH_URL:-http://127.0.0.1:5298/health}"
XTOOL_DEPLOY_MCP_HEALTH_URL="${XTOOL_DEPLOY_MCP_HEALTH_URL:-http://127.0.0.1:5197/health}"
XTOOL_DEPLOY_WEB_URL="${XTOOL_DEPLOY_WEB_URL:-http://127.0.0.1/}"
XTOOL_DEPLOY_PUBLIC_URL="${XTOOL_DEPLOY_PUBLIC_URL:-http://39.105.137.213/}"

xt_require_config() {
  if [ -z "$XTOOL_DEPLOY_HOST" ]; then
    xt_die "缺少 XTOOL_DEPLOY_HOST；请检查 $XT_ENV_FILE 或 shell 环境变量。"
  fi
  if [ -z "$XTOOL_DEPLOY_USER" ]; then
    xt_die "缺少 XTOOL_DEPLOY_USER；请检查 $XT_ENV_FILE。"
  fi
}

xt_config_summary() {
  cat <<EOF
host      : $XTOOL_DEPLOY_HOST:$XTOOL_DEPLOY_PORT
user      : $XTOOL_DEPLOY_USER
auth      : $([ -n "$XTOOL_DEPLOY_PASSWORD" ] && echo password || echo ssh-key)
repo root : $XTOOL_DEPLOY_ROOT
web root  : $XTOOL_DEPLOY_WEB_ROOT
branch    : $XTOOL_DEPLOY_BRANCH ($XTOOL_DEPLOY_REMOTE)
pm2 config: $XTOOL_DEPLOY_PM2_CONFIG
public web: $XTOOL_DEPLOY_PUBLIC_URL
EOF
}

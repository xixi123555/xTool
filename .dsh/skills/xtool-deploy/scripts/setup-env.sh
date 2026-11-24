#!/usr/bin/env bash
# 交互式写入本机部署凭据，并让新 shell 自动加载。
# 凭据文件权限固定为 600，不会进入 git 仓库。
set -euo pipefail

ENV_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/xtool"
ENV_FILE="${XTOOL_DEPLOY_ENV_FILE:-$ENV_DIR/deploy.env}"

printf '配置文件: %s\n' "$ENV_FILE"
if [ -f "$ENV_FILE" ]; then
  printf '已存在，继续将覆盖。回车继续，Ctrl-C 取消。'
  read -r _
fi

printf '服务器 IP: '
read -r host
printf 'SSH 用户 [root]: '
read -r user
user="${user:-root}"
printf 'SSH 端口 [22]: '
read -r port
port="${port:-22}"
printf 'SSH 密码（输入不回显）: '
read -r -s password
printf '\n'

[ -n "$host" ] || {
  echo "IP 不能为空" >&2
  exit 1
}
[ -n "$password" ] || {
  echo "密码不能为空" >&2
  exit 1
}

password_escaped=$(printf '%s' "$password" | sed "s/'/'\\\\''/g")

umask 077
mkdir -p "$ENV_DIR"
cat >"$ENV_FILE" <<EOF
# xTool 生产服务器连接信息（仅本机，权限 600）
export XTOOL_DEPLOY_HOST='$host'
export XTOOL_DEPLOY_USER='$user'
export XTOOL_DEPLOY_PASSWORD='$password_escaped'
export XTOOL_DEPLOY_PORT='$port'
EOF
chmod 600 "$ENV_FILE"

# 让交互式 zsh 新会话自动加载；文件不存在则创建
ZSHRC="$HOME/.zshrc"
touch "$ZSHRC"
if ! grep -q 'config/xtool/deploy.env' "$ZSHRC" 2>/dev/null; then
  {
    printf '\n# xTool 发布环境变量\n'
    printf '[ -f "$HOME/.config/xtool/deploy.env" ] && . "$HOME/.config/xtool/deploy.env"\n'
  } >>"$ZSHRC"
fi

printf '已写入 %s（权限 600），并已加入 %s 的自动加载。\n' "$ENV_FILE" "$ZSHRC"

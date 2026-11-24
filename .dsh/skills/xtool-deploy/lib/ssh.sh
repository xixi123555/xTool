#!/usr/bin/env bash
# SSH 执行封装：优先 expect（macOS 自带），其次 sshpass，最后直接用密钥。
# 密码只通过环境变量传给 expect，不出现在命令行参数或日志中。

xt_shell_quote() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

# 远程非登录 shell 不加载 nvm（bash 只读 $BASH_ENV，不读 ~/.bashrc），
# node/pnpm/pm2 因此不在 PATH 里，远程脚本会在“检查运行时”那步误判未安装。
# 统一在远程命令前补一段 PATH 探测，避免每个远程脚本各自处理。
xt_remote_path_bootstrap() {
  cat <<'BOOTSTRAP'
for d in /root/.nvm/versions/node/*/bin; do
  [ -x "$d/node" ] || continue
  case ":$PATH:" in *":$d:"*) ;; *) PATH="$d:$PATH" ;; esac
done;
export PATH;
BOOTSTRAP
}

xt_ssh_args() {
  # 输出一行一个参数，供数组读取，避免 eval
  printf '%s\n' \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=15 \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=10 \
    -o NumberOfPasswordPrompts=1 \
    -p "$XTOOL_DEPLOY_PORT"
  if [ -n "$XTOOL_DEPLOY_IDENTITY_FILE" ]; then
    printf '%s\n' -i "$XTOOL_DEPLOY_IDENTITY_FILE"
  fi
}

xt_ssh_run() {
  local remote_command="$1"
  local bootstrap
  bootstrap="$(xt_remote_path_bootstrap)"
  # 补 PATH 后拼接原命令：远程脚本与临时命令都能用到 nvm 里的 node/pnpm/pm2
  remote_command="$bootstrap $remote_command"
  local -a args=()
  local line
  while IFS= read -r line; do
    args+=("$line")
  done < <(xt_ssh_args)

  if [ -n "$XTOOL_DEPLOY_PASSWORD" ] && command -v expect >/dev/null 2>&1; then
    XT_SSH_HOST="$XTOOL_DEPLOY_HOST" \
      XT_SSH_USER="$XTOOL_DEPLOY_USER" \
      XT_SSH_PORT="$XTOOL_DEPLOY_PORT" \
      XT_SSH_IDENTITY="$XTOOL_DEPLOY_IDENTITY_FILE" \
      XT_SSH_PASSWORD="$XTOOL_DEPLOY_PASSWORD" \
      XT_SSH_COMMAND="$remote_command" \
      expect "$XT_SKILL_DIR/lib/ssh-password.exp"
    return $?
  fi

  if [ -n "$XTOOL_DEPLOY_PASSWORD" ] && command -v sshpass >/dev/null 2>&1; then
    sshpass -p "$XTOOL_DEPLOY_PASSWORD" ssh "${args[@]}" \
      "$XTOOL_DEPLOY_USER@$XTOOL_DEPLOY_HOST" "$remote_command"
    return $?
  fi

  ssh "${args[@]}" "$XTOOL_DEPLOY_USER@$XTOOL_DEPLOY_HOST" "$remote_command"
}

# 把本地远程脚本上传到 /tmp 后执行，避免手写多层引号。
xt_ssh_run_file() {
  local file="$1"
  shift
  [ -f "$file" ] || xt_die "远程脚本不存在: $file"

  local payload
  payload="$(base64 < "$file" | tr -d '\n')"
  local remote_script="/tmp/xtool-deploy-$$-$(date +%s).sh"
  local args=''
  local arg
  for arg in "$@"; do
    args="$args $(xt_shell_quote "$arg")"
  done

  local env_prefix
  env_prefix="$(
    printf 'XTOOL_REMOTE_ROOT=%s XTOOL_REMOTE_WEB_ROOT=%s XTOOL_REMOTE_BRANCH=%s XTOOL_REMOTE_NAME=%s XTOOL_REMOTE_PM2_CONFIG=%s XTOOL_REMOTE_PULL=%s XTOOL_REMOTE_CHAT_DEPS=%s XTOOL_REMOTE_NGINX_RELOAD=%s XTOOL_REMOTE_ROLLBACK_COMMIT=%s XTOOL_REMOTE_HEALTH_URL=%s XTOOL_REMOTE_CHAT_HEALTH_URL=%s XTOOL_REMOTE_MCP_HEALTH_URL=%s XTOOL_REMOTE_WEB_URL=%s' \
      "$(xt_shell_quote "$XTOOL_DEPLOY_ROOT")" \
      "$(xt_shell_quote "$XTOOL_DEPLOY_WEB_ROOT")" \
      "$(xt_shell_quote "$XTOOL_DEPLOY_BRANCH")" \
      "$(xt_shell_quote "$XTOOL_DEPLOY_REMOTE")" \
      "$(xt_shell_quote "$XTOOL_DEPLOY_PM2_CONFIG")" \
      "$(xt_shell_quote "${XT_REMOTE_PULL:-1}")" \
      "$(xt_shell_quote "${XT_REMOTE_CHAT_DEPS:-0}")" \
      "$(xt_shell_quote "${XT_REMOTE_NGINX_RELOAD:-0}")" \
      "$(xt_shell_quote "${XT_REMOTE_ROLLBACK_COMMIT:-}")" \
      "$(xt_shell_quote "$XTOOL_DEPLOY_HEALTH_URL")" \
      "$(xt_shell_quote "$XTOOL_DEPLOY_CHAT_HEALTH_URL")" \
      "$(xt_shell_quote "$XTOOL_DEPLOY_MCP_HEALTH_URL")" \
      "$(xt_shell_quote "$XTOOL_DEPLOY_WEB_URL")"
  )"

  local command
  command="echo $(xt_shell_quote "$payload") | base64 -d > $(xt_shell_quote "$remote_script") && $env_prefix bash $(xt_shell_quote "$remote_script")$args; rc=\$?; rm -f $(xt_shell_quote "$remote_script"); exit \$rc"

  xt_ssh_run "$command"
}

xt_ssh_interactive_hint() {
  cat <<EOF
交互式登录命令：

  ssh -p $XTOOL_DEPLOY_PORT $XTOOL_DEPLOY_USER@$XTOOL_DEPLOY_HOST

密码由本机 $XT_ENV_FILE 中的 XTOOL_DEPLOY_PASSWORD 提供；
如需免密，建议把本机公钥加入服务器 ~/.ssh/authorized_keys。
EOF
}

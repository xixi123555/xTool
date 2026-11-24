#!/usr/bin/env bash
# 统一的终端输出格式；不打印任何密钥。

if [ -t 1 ]; then
  XT_COLOR_RESET='\033[0m'
  XT_COLOR_INFO='\033[1;36m'
  XT_COLOR_OK='\033[1;32m'
  XT_COLOR_WARN='\033[1;33m'
  XT_COLOR_ERR='\033[1;31m'
else
  XT_COLOR_RESET=''
  XT_COLOR_INFO=''
  XT_COLOR_OK=''
  XT_COLOR_WARN=''
  XT_COLOR_ERR=''
fi

xt_info() {
  printf "${XT_COLOR_INFO}==>${XT_COLOR_RESET} %s\n" "$*"
}

xt_ok() {
  printf "${XT_COLOR_OK}OK${XT_COLOR_RESET} %s\n" "$*"
}

xt_warn() {
  printf "${XT_COLOR_WARN}WARN${XT_COLOR_RESET} %s\n" "$*" >&2
}

xt_error() {
  printf "${XT_COLOR_ERR}ERROR${XT_COLOR_RESET} %s\n" "$*" >&2
}

xt_die() {
  xt_error "$*"
  exit 1
}

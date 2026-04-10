#!/usr/bin/env python3
import argparse
import subprocess
import sys


def run_command(command: str) -> None:
    print(f"\n>>> 执行: {command}")
    result = subprocess.run(command, shell=True)
    if result.returncode != 0:
        print(f"\n命令失败（退出码 {result.returncode}）: {command}")
        sys.exit(result.returncode)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="重启项目服务（支持全部服务或排除 electron）"
    )
    parser.add_argument(
        "--mode",
        choices=["all", "except-electron"],
        default="except-electron",
        help="all: 启动全部服务; except-electron: 启动除 electron 外的服务",
    )
    args = parser.parse_args()

    run_command("yarn stop:all")

    if args.mode == "all":
        run_command("yarn start:all")
    else:
        run_command("yarn start:all:except-electron")

    print("\n服务重启完成。")


if __name__ == "__main__":
    main()

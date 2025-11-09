# DevTools Suite

DevTools Suite 是一个基于 Electron + React 的开发者效率工具集，当前内置剪贴板历史管理与 JSON 格式化等能力，可按需扩展更多 Panel。

## 快速开始

### 环境要求

- Node.js >= 18
- Yarn 1 (通过 `corepack enable` 或直接安装)

### 安装依赖

```bash
yarn install
```

### 开发模式

```bash
yarn dev
```

该命令将并行启动：

- `renderer` 工作空间的 Vite 开发服务器（默认端口 5173）
- `electron` 工作空间的主进程构建与 Electron 应用

Electron 会在 `renderer` 构建完成后自动连接到 Vite 服务，实现热重载体验。

### 构建与打包

- 仅构建：

  ```bash
yarn build
  ```

  会依次执行 `renderer`、`electron`、`packages/shared` 的 TypeScript/Vite 构建，产出分别位于：

  - `renderer/dist`
  - `electron/dist`
  - `packages/shared/dist`

- 生成安装包：

  ```bash
yarn dist
  ```

  在执行完所有构建后，调用 `electron-builder` 根据 `electron-builder.yml` 生成应用安装包。

  - macOS 生成 `dmg` 与 `zip`
  - Windows 生成 `nsis`

构建结果默认输出到 `dist/` 目录。

## 项目结构

```
├─ electron/              # Electron 主进程源码（TypeScript）
│  ├─ src/
│  │  ├─ clipboard/       # 剪贴板监听与持久化
│  │  ├─ utils/
│  │  ├─ main.ts          # 应用入口，创建窗口与注册 IPC
│  │  └─ preload.ts       # 预加载脚本，向 renderer 暴露 API
│  └─ dist/               # 主进程编译产物
├─ renderer/              # React 渲染进程（Vite + Tailwind）
│  ├─ src/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ store/
│  │  └─ App.tsx
│  └─ dist/               # 渲染端打包产物
├─ packages/shared/       # 主/渲染进程共享的类型定义与工具
├─ resources/             # electron-builder 需要的图标等静态资源
├─ electron-builder.yml   # 打包配置
├─ tsconfig.base.json     # 所有工作空间共享的 TS 基础配置
└─ README.md
```

## 开发约定

### TypeScript 配置

- 根目录 `tsconfig.base.json` 定义共有配置与路径别名：
  - `baseUrl: .` + `paths.devtools-suite-shared -> packages/shared/src`
- `electron/tsconfig.json` 追加：
  - `module/moduleResolution: NodeNext`
  - `baseUrl: ./src` 以避免与根目录工作空间同名冲突
- `renderer/tsconfig.json` 引入 `../electron/src/types`（如有自定义类型声明可统一维护）

### 代码组织

- **Electron 主进程**
  - 保持模块化：`clipboard`、`utils` 等按功能拆分
  - 通过 `preload.ts` 向渲染端暴露受控 API，遵循 `contextIsolation` + `sandbox`=false 的安全原则
  - 与 ESM-only 依赖交互时采用动态导入（如 `electron-store`）

- **Renderer (React)**
  - Vite + React + Zustand 状态管理
  - 所有组件使用 Tailwind Utility class，复用 `btn-primary` 等自定义 className
  - IPC 交互通过 `window.api` 包装，React 组件不直接访问 Node API

- **共享包 `packages/shared`**
  - 仅包含纯 TypeScript 类型或无副作用工具函数，供主进程与渲染进程同时引用

### 命名与样式

- 变量/函数使用完整语义名词/动词组合，避免单字符缩写
- React 组件文件名采用 PascalCase，对外导出的组件与文件名保持一致
- 新增 Panel 时，遵循：
  - 在 `renderer/src/components` 下新增对应文件/子目录
  - 在 `renderer/src/store` 中扩展 Zustand Store 状态
  - 通过 `Sidebar` 注册入口按钮
  - 在主进程根据业务需求注册新的 IPC handler

### 调试建议

- 开发模式下可使用 Chrome DevTools 直接连接 Vite
- Electron 主进程日志保存在 `app.getPath('userData')/logs/main.log`
- 若需调试 preload 或主进程，可在执行 `yarn dev` 后手动开启 `chrome://inspect`

## 常见问题

- 如果 TypeScript 提示找不到 `electron` 类型，确认 `electron/tsconfig.json` 中的 `baseUrl` 为 `./src`
- 若遇到 `ERR_REQUIRE_ESM`，说明在 CommonJS 环境下引入了 ESM-only 包，按照 `electron/src/clipboard/store.ts` 示例改用动态导入

---

如需扩展更多工具模块，建议新建子目录并复用现有状态管理、安全沙箱与 IPC 机制，确保主/渲染进程职责清晰。

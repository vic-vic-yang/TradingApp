# trading-web

`trading-web` 是 TradingAgents 的前端工作台，负责把多智能体分析结果可视化，并提供参数配置、执行过程查看和结果解读能力。  
技术栈基于 Next.js 16 + React 19 + TypeScript。

## 业务分析

### 1) 业务目标

- **降低分析门槛**：把命令行和原始报告转成可交互页面，让非研发用户也能使用。
- **提升决策效率**：把策略分析结果、关键结论和上下文聚合在一个界面中，减少来回切换。
- **标准化流程**：将“设置参数 -> 发起分析 -> 查看结果 -> 复盘”固化成统一工作流。

### 2) 在整体系统中的定位

- `TradingAgents`（后端）负责执行分析任务、生成报告数据。
- `trading-web`（前端）负责展示、交互和用户操作入口。
- 两者联动后形成完整闭环：**用户在前端发起/查看 -> 后端计算 -> 前端呈现结果**。

### 3) 核心用户与价值

- **研究/交易用户**：快速查看结论、对比不同参数下结果。
- **开发/运维用户**：快速验证流程是否跑通，定位分析过程问题。
- **团队协作场景**：统一界面有助于共享结果与复盘讨论。

## 使用说明

## 环境要求

- Node.js 18+（建议 LTS）
- 包管理器：`pnpm`（推荐）或 `npm`
- 已可运行的 `TradingAgents` 后端（Python 环境）

## 启动 Web

进入当前目录后执行：

```bash
pnpm dev
```

如果没有 `pnpm`，可以使用：

```bash
npm run dev
```

## 环境变量（Vercel）

前端请求的后端域名可通过环境变量配置：

- `NEXT_PUBLIC_API_BASE_URL`：浏览器侧请求使用（推荐，Vercel 请配置这个）
- `API_BASE_URL`：服务端渲染请求可单独覆盖（可选）

兼容旧变量：

- `NEXT_PUBLIC_API_URL`
- `API_URL`

示例（本地）：

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

示例（Vercel）：

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-tradingagents-api.vercel.app
```

## 常用命令

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

## 常见问题

### 1) `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`

原因：在错误目录执行了 `pnpm`（当前目录没有 `package.json`）。  
解决：确认在 `D:\code\ai\trading-web` 目录执行。

### 2) 页面能打开但没有数据

通常是后端 API 未启动或地址配置不一致。  
先确认 `TradingAgents` 后端已启动，再检查前后端联调配置。

### 3) 端口冲突

默认端口是 `3000`。若被占用，可先释放端口或改用其他端口启动 Next.js。

## 开发建议

- 前后端联调时，先确认后端 API 可用，再启动前端页面。
- 提交前至少执行一次 `pnpm lint`，保证基础代码质量。

# 根因分析系统（Root Cause Analysis System）

结构化问题归因工具：内置 5 Why、鱼骨图、时间线分析、对比分析、系统思考、快速复盘 6 种分析方法模板，引导从问题定义到对策验证的完整闭环。纯前端应用，数据保存在浏览器 IndexedDB 中，按本地账户隔离。

## 技术栈

Vite + React 18 + TypeScript（strict）+ TailwindCSS + React Hook Form + IndexedDB（idb）+ react-router-dom + date-fns + uuid + clsx + recharts。

## 开发

```bash
npm install
npm run dev        # 本地开发
npm run test        # Vitest 单元测试（表单引擎与仪表盘的核心纯函数）
npm run typecheck    # TypeScript 严格模式检查
npm run build        # 生产构建
```

## 目录结构

- `src/types` 全局类型定义
- `src/templates` 6 个分析方法模板配置
- `src/services` IndexedDB 数据层、本地账户认证、Markdown 导出
- `src/hooks` 认证/数据/阶段锁定逻辑/Toast 等 hooks
- `src/components` 表单引擎（FormRenderer 及其子组件）与仪表盘组件
- `src/pages` 路由页面
- `src/utils` 表单校验与仪表盘统计的核心纯函数

## 数据与导出

- 所有数据保存在当前浏览器的 IndexedDB 中，账户之间互相隔离
- 支持在"数据管理"页导出/导入全量 JSON 备份
- 单条记录支持导出为 Markdown；打印/导出 PDF 通过浏览器打印功能实现

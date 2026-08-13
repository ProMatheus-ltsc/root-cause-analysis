# 根因分析系统（Root Cause Analysis System）

结构化问题归因工具：内置 **要因分析、5 Why、鱼骨图、对比分析、系统思考、技术专题** 6 类根因分析方法（含隐藏兼容的旧模板），从问题定义 → 方法分析 → 可视化 → 根因结论 → 对策验证形成完整闭环。纯前端应用，数据保存在浏览器 IndexedDB 中，按本地账户隔离，无需后端服务。

## 核心特性

- **模板驱动表单引擎**：每种分析方法是一个"模板"（sections/fields/phases 配置），引擎统一渲染——支持重复条目段（repeatable）、表格字段（table）、条件显示、计算字段（computed，自动汇总且可编辑）、自定义组件（custom）、阶段引导与锁定、自动保存。
- **6 类分析方法 + 全量可视化**：

  | 方法 | 解决什么问题 | 可视化 |
  | --- | --- | --- |
  | 要因分析法 🎯（推荐） | 复杂多因素问题，区分源头/传导/表象 | 矩阵热力图 + 因果定位表 + 关键因素排序表 |
  | 5 Why 追问法 🔍 | 单一问题快速追问深层原因 | 追问阶梯图 |
  | 鱼骨图分析法 🐟 | 人机料法环测六大维度系统排查 | 鱼骨图（六维度发现自动汇总） |
  | 对比分析法 ⚖️ | "为什么有时正常有时异常" | 正常/异常差异对照图 |
  | 系统思考分析 🔄 | 反复出现的循环性问题 | 反馈回路图 + 杠杆点 |
  | 技术专题分析 🛠️ | 故障复盘一条龙：时间线发现影响面 → 日志定位问题 → 5Why 追溯根因 | 时间线图 |

- **手动桥接 AI**（项目暂不内嵌 AI，采用"导出 → 外部 AI → 粘贴解析"模式）：
  - 系统思考：导出问题详情+候选原因给 AI，AI 返回回路/杠杆点 JSON，粘贴解析后自动生成回路图、自动填入杠杆点与干预方案。
  - 要因分析：AI 一次性返回所有因果对（cause/effect/strength），跳过逐对判断 105 次的繁琐流程。
- **根因结论自动汇总**：所有分析方法的根因结论从前序流程自动生成（多个根因全部列出），用户只需编辑修改，不必手动复制。
- **填写体验**：条目折叠/展开（可拖动悬浮按钮一键全局折叠/展开）、卡片条浏览与跳转、"上一条/下一条"专注导航、**相似原因实时检测**（基于字符 2-gram 的 Dice 系数，自动标注"与 #N 相似 XX%"）。
- **数据安全**：IndexedDB 本地存储、账户隔离（PBKDF2 密码哈希）、全量 JSON 导入导出、Markdown 导出、PDF 导出。

## 技术栈

Vite 8 + React 19 + TypeScript 6（strict）+ Tailwind CSS 4 + React Hook Form 7 + IndexedDB（idb）+ react-router-dom 7（HashRouter）+ recharts + @xyflow/react + @react-pdf/renderer + zustand + flexsearch + date-fns；测试用 Vitest 4 + Testing Library + fake-indexeddb。

## 环境要求

- Node.js **20.19+ 或 22.12+**（Vite 8 要求）
- npm（随 Node.js 安装）

## 快速启动

### Windows

**方式一：命令提示符（CMD）**

```bat
cd 项目目录
npm install
npm run dev
```

**方式二：PowerShell**

```powershell
cd 项目目录
npm install
npm run dev
```

### macOS / Linux

```bash
cd 项目目录
npm install
npm run dev
```

启动后在浏览器打开终端提示的本地地址（默认 `http://localhost:5173`）。

> 首次使用需先执行 `npm install` 安装依赖；之后启动只需 `npm run dev`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 本地开发启动（默认 http://localhost:5173） |
| `npm run test` | Vitest 全量单元测试（表单引擎/校验/相似度/可视化等） |
| `npm run test:watch` | Vitest 监听模式 |
| `npm run typecheck` | TypeScript 严格模式检查 |
| `npm run lint` | oxlint 代码检查 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 本地预览生产构建产物 |

## 使用流程

1. **注册/登录**：本地账户（默认可创建任意账户，数据互相隔离）。
2. **新建问题**（仪表盘 → 新建问题）：问题定义向导——4W2H 拆解、目标/现状差距、原因头脑风暴。
3. **选择分析方法**：在问题详情页添加分析方法，或从首页直接创建"技术专题分析"（轻量入口，不走向导）。
4. **按阶段填写**：每个方法分阶段引导，前序数据自动传入后续阶段；填完即生成可视化图表。
5. **根因结论**：系统自动汇总分析结果到根因结论，确认后生成对策与验证方式。

## 测试数据（可选）

项目内置一组覆盖全部分析方法的种子数据，可一键导入 admin 账户：

1. 启动应用后访问 `http://localhost:5173/#/dev/seed`
2. 点击"一键创建 admin 并导入测试数据"（用户名 `admin` / 密码 `admin`）
3. 自动登录进入仪表盘，可看到示例问题 + 各方法已完成的分析记录

种子数据由 `scripts/gen_seed_data.py` 从备份 JSON 生成，`public/seed-test-data.json` 为产物。

## 目录结构

- `src/types` 全局类型定义（FormTemplate / FormField / Problem / Record 等）
- `src/templates` 分析方法模板配置（要因分析/5Why/鱼骨图/对比/系统思考/技术专题等 9 个，含问题向导）
- `src/services` IndexedDB 数据层、账户认证、Markdown 导出、导入校验、联想建议
- `src/hooks` 认证 / 数据读写 / 阶段锁定 / Toast / 搜索 / 快照等 hooks
- `src/stores` zustand 状态（问题 / 记录）
- `src/constants` 模板展示元数据（颜色、排序）
- `src/utils` 纯函数：表单校验、默认值解析、AI 桥接解析、回路检测、统计、相似度
- `src/components` 表单引擎（FormRenderer / FieldRenderer / RepeatableSection / 各输入组件）与可视化组件
  - `form/` 各类输入组件（矩阵引导、AI 面板、表格、条件字段等）
  - `visualize/` 图表（热力图、鱼骨图、时间线、回路图、阶梯图、差异图等）
  - `stats/` 仪表盘统计组件；`history/` 快照；`export/` PDF 导出；`dashboard/` 布局
- `src/pages` 路由页面（仪表盘 / 问题 / 分析表单 / 历史 / 数据管理 / 登录 / 种子导入）
- `scripts/` 开发辅助脚本（种子数据生成等）
- `public/` 静态资源（含 `seed-test-data.json`）

## 数据与导出

- 所有数据保存在当前浏览器的 IndexedDB 中，账户之间互相隔离
- 支持在"数据管理"页导出/导入全量 JSON 备份
- 单条记录支持导出为 Markdown；打印/导出 PDF 通过浏览器打印功能实现

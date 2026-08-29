/**
 * 应用入口：把 React 应用挂载到 index.html 的 #root 节点上。
 * 这是整个应用的起点——浏览器加载 HTML 后执行本文件，一切从这里开始渲染。
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// 移动端响应式全局基线：触控目标 44px / 输入 16px 防聚焦缩放 / safe-area / dvh / modal-clamp / 容器查询
import '@shared/core/styles/responsive.css'
import App from './App.tsx'

// createRoot 创建 React 根节点，render 挂载根组件 <App />。
// document.getElementById('root')! 的 ! 是"非空断言"：告诉 TypeScript 这里一定找得到该元素，
// 因为 index.html 里固定写有 <div id="root"></div>。
// StrictMode 是 React 开发期的严格模式：会故意让组件渲染两次，帮助暴露副作用写坏的问题，
// 对生产构建没有影响。
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

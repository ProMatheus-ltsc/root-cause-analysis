/**
 * 测试环境初始化：让 Vitest 里的每个测试文件自动拥有 Testing Library 的断言能力。
 * 具体来说，import 这个包之后，expect(...).toBeInTheDocument() 等 DOM 断言就可用。
 */
import '@testing-library/jest-dom/vitest';

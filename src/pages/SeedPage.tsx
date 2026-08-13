/**
 * 测试数据一键导入页（/dev/seed）：
 * 1. 若 admin 账户不存在则创建（用户名 admin / 密码 admin）
 * 2. 把 public/seed-test-data.json（覆盖全部 7 种根因分析方法）导入 admin 业务库
 * 3. 自动登录 admin，跳转到仪表盘
 * 仅用于开发/验收测试，不在导航中暴露入口。
 * 核心概念：账户与数据分离——先保证 admin 账户存在，再把种子数据导入"该账户专属"的业务库；
 *   登录态存于 localStorage，所以直接写 localStorage 即等同于已登录。
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAccounts, setCurrentAccountId, importAllData, type ExportedData } from '../services/db';
import { registerAccount } from '../services/auth';
import { AUTH_STORAGE_KEY } from '../hooks/useAuth';

/** 导入流程的阶段状态机：idle 初始 / working 进行中 / done 完成 / error 失败 */
type Phase = 'idle' | 'working' | 'done' | 'error';

/**
 * 测试数据导入页组件：一键创建 admin 账户并导入覆盖全部分析方法的种子数据。
 * props：无（仅供开发/验收测试使用）。
 */
export default function SeedPage() {
  const navigate = useNavigate();
  // phase：当前流程阶段；message：进度/结果提示文案
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');

  /**
   * 一键导入主流程（步骤见文件头）：保证 admin 账户存在 → 切换业务库并导入种子数据 → 本地登录。
   * 两个细节：
   * 1. fetch 的路径用 import.meta.env.BASE_URL 拼接，保证应用部署在子路径下也能找到 JSON 文件；
   * 2. localStorage.setItem(AUTH_STORAGE_KEY, ...) 写入的正是 useAuth 中"当前登录账户"的持久化来源，
   *    写完后整个应用即认为已登录 admin。
   */
  async function runSeed() {
    setPhase('working');
    setMessage('正在准备测试数据…');
    try {
      // 1. 确保 admin 账户存在
      const accounts = await listAccounts();
      let admin = accounts.find((a) => a.username === 'admin');
      if (!admin) {
        setMessage('正在创建 admin 账户（admin / admin）…');
        admin = await registerAccount('admin', 'admin');
      } else {
        setMessage('admin 账户已存在，直接导入测试数据…');
      }

      // 2. 切到 admin 业务库并导入种子数据
      setCurrentAccountId(admin.id);
      const resp = await fetch(`${import.meta.env.BASE_URL}seed-test-data.json`);
      if (!resp.ok) throw new Error(`种子数据加载失败（HTTP ${resp.status}）`);
      const seed = (await resp.json()) as ExportedData;
      await importAllData(seed);

      // 3. 自动登录 admin
      localStorage.setItem(AUTH_STORAGE_KEY, admin.id);
      setMessage(`导入完成：${seed.problems?.length ?? 0} 个问题、${seed.records?.length ?? 0} 条分析记录（覆盖全部 7 种方法）。`);
      setPhase('done');
    } catch (err) {
      setMessage(`导入失败：${err instanceof Error ? err.message : String(err)}`);
      setPhase('error');
    }
  }

  // 导入完成后延迟 1.2 秒自动跳转首页：让用户来得及看到"导入完成"的提示再离开
  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(() => navigate('/', { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [phase, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">测试数据导入</h1>
        <p className="mt-1 text-sm text-slate-500">
          创建 <strong>admin / admin</strong> 账户，并导入覆盖全部 7 种根因分析方法（要因分析 / 5Why / 鱼骨图 / 时间线 /
          对比 / 系统思考 / 技术故障）的测试数据。
        </p>
        {phase === 'working' && <p className="mt-4 text-sm text-slate-500">处理中…</p>}
        {message && (
          <p
            className={`mt-4 rounded-md border px-3 py-2 text-sm ${
              phase === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {message}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={phase === 'working' || phase === 'done'}
            onClick={runSeed}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-40"
          >
            一键创建 admin 并导入测试数据
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            去登录
          </button>
        </div>
      </div>
    </div>
  );
}

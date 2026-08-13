/**
 * 数据管理页（/data）：全量 JSON 导入导出（导入前做结构校验）、清空数据、登出。
 * 交互流程：导出 → 把当前账户全部数据序列化为 JSON 文件下载，并记录"上次导出时间"（供首页备份提醒）；
 *   导入 → 选择文件 → 校验数据结构 → 覆盖写入当前账户业务库；清空 → 二次确认后删除全部数据。
 * 核心概念：数据只存在浏览器 IndexedDB，导出 JSON 是换设备 / 清缓存时防丢数据的唯一途径；
 *   导入是"整体覆盖"，操作前务必先导出一份备份。
 */
import { useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { clearAllData, exportAllData, importAllData, setSetting, type ExportedData } from '../services/db';
import { validateExportedData } from '../services/importValidation';

/**
 * 数据管理页组件：数据备份导出、数据导入、清空数据、登出。
 * props：无（路由页面，由 Router 直接渲染）。
 */
export default function DataPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  // fileInputRef：隐藏的 <input type="file"> 的引用，点"导入数据"按钮时通过它触发文件选择框
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 导出全部数据：把 IndexedDB 中的全部业务数据序列化为 JSON 并下载到本地。
   * Blob + URL.createObjectURL 是浏览器生成"可下载文件"的标准做法：
   * 先创建二进制对象 → 生成临时 URL → 模拟点击 <a download> 触发下载 → 用 revokeObjectURL 及时释放内存。
   * 导出成功后把当前时间写入设置，让首页据此计算"多少天没备份了"。
   */
  async function handleExport() {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rca-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await setSetting('lastExportedAt', new Date().toISOString());
  }

  /**
   * 导入数据文件处理：读取文件 → JSON.parse 解析 → validateExportedData 结构校验
   * → importAllData 覆盖写入当前账户业务库。
   * try/catch 兜底所有解析与校验错误，统一提示"导入失败"；
   * finally 里清空 e.target.value 很关键：否则再次选择同一个文件不会触发 change 事件。
   */
  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const errors = validateExportedData(parsed);
      if (errors.length > 0) {
        showToast(`导入失败：${errors.slice(0, 3).join('；')}${errors.length > 3 ? ' 等' : ''}`, 'error');
        return;
      }
      await importAllData(parsed as ExportedData);
      showToast('导入成功', 'success');
    } catch {
      showToast('导入失败，请检查文件格式', 'error');
    } finally {
      e.target.value = '';
    }
  }

  /** 清空数据：浏览器 confirm 二次确认后调用 clearAllData 删除当前账户全部数据（不可恢复）。 */
  async function handleClearAll() {
    if (!confirm('确定清空当前账户下的所有数据吗？此操作不可撤销。')) return;
    await clearAllData();
    showToast('数据已清空', 'success');
  }

  /** 登出：清除本地登录态，再跳回登录页；replace 表示替换当前历史记录，用户点"返回"不会回到已登出的页面。 */
  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="max-w-xl space-y-8">
      <h2 className="text-lg font-semibold text-slate-900">数据管理</h2>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">数据备份</h3>
        <div className="flex gap-3">
          <button onClick={handleExport} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            导出全部数据（JSON）
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            导入数据
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        </div>
      </section>

      <section className="rounded-lg border border-rose-200 bg-rose-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-rose-700">危险操作</h3>
        <button onClick={handleClearAll} className="rounded-md bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700">
          清空当前账户全部数据
        </button>
      </section>

      <section>
        <button onClick={handleLogout} className="text-sm text-slate-500 hover:underline">
          登出
        </button>
      </section>
    </div>
  );
}

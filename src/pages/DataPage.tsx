/**
 * 数据管理页：全量 JSON 导入导出（导入前做结构校验）、清空数据、登出。
 */
import { useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { clearAllData, exportAllData, importAllData, setSetting, type ExportedData } from '../services/db';
import { validateExportedData } from '../services/importValidation';

export default function DataPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleClearAll() {
    if (!confirm('确定清空当前账户下的所有数据吗？此操作不可撤销。')) return;
    await clearAllData();
    showToast('数据已清空', 'success');
  }

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

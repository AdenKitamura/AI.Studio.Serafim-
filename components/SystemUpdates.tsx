import React, { useState, useEffect } from 'react';
import { getPendingUpdates, mergeUpdate, PullRequest } from '../services/githubService';
import { Loader2, GitPullRequest, CheckCircle, AlertCircle, GitMerge } from 'lucide-react';

const SystemUpdates: React.FC = () => {
  const [updates, setUpdates] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mergingId, setMergingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPendingUpdates();
      setUpdates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch updates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleMerge = async (pullNumber: number) => {
    try {
      setMergingId(pullNumber);
      setError(null);
      await mergeUpdate(pullNumber);
      setSuccessMsg(`Деплой запущен! Система обновится через пару минут.`);
      setUpdates(updates.filter(u => u.number !== pullNumber));
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to merge update');
    } finally {
      setMergingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)]">
        <Loader2 className="animate-spin mb-2" size={24} />
        <p className="text-xs uppercase tracking-widest font-bold">Проверка обновлений...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[var(--text-main)]">
          <GitPullRequest size={18} className="text-[var(--accent)]" />
          <h3 className="text-sm font-black uppercase tracking-widest">Ожидающие патчи</h3>
        </div>
        <button 
          onClick={fetchUpdates}
          className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-widest"
        >
          Обновить
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-500 text-xs">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3 text-emerald-500 text-xs">
          <CheckCircle size={14} className="shrink-0 mt-0.5" />
          <p>{successMsg}</p>
        </div>
      )}

      {updates.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center border border-[var(--border-color)]">
          <CheckCircle size={32} className="text-emerald-500/50 mx-auto mb-3" />
          <p className="text-sm font-bold text-[var(--text-main)]">Система актуальна</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Нет ожидающих обновлений от ИИ.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map(update => (
            <div key={update.id} className="glass-panel p-4 rounded-2xl border border-[var(--border-color)] flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">{update.title}</h4>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1">
                    PR #{update.number} • {new Date(update.created_at).toLocaleDateString()}
                  </p>
                </div>
                <a 
                  href={update.html_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-[var(--accent)] hover:underline uppercase tracking-widest shrink-0"
                >
                  Код
                </a>
              </div>
              
              <button
                onClick={() => handleMerge(update.number)}
                disabled={mergingId === update.number}
                className="w-full py-2.5 bg-[var(--accent)] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mergingId === update.number ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <GitMerge size={14} />
                )}
                Одобрить и Задеплоить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SystemUpdates;

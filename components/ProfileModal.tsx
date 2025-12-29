
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ThemeKey } from '../types';
import Settings from './Settings';
import { 
  X, Cpu, Database, Settings as SettingsIcon, Activity, RefreshCw, HardDrive, ShieldCheck
} from 'lucide-react';

interface ProfileModalProps {
  appState: AppState;
  userName: string;
  currentTheme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  onClose: () => void;
  onImport: (data: any) => void;
  hasAiKey: boolean;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ 
    appState, userName, currentTheme, setTheme, onClose, onImport, hasAiKey 
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'system'>('settings');
  const [storageInfo, setStorageInfo] = useState<{ used: string, total: string, percent: number } | null>(null);
  const [lastCheck, setLastCheck] = useState<string>(new Date().toLocaleTimeString());

  const runDiagnostics = useCallback(async () => {
    setLastCheck(new Date().toLocaleTimeString());
    
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usedBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || 1;
      const usedMB = usedBytes / (1024 * 1024);
      const totalGB = quotaBytes / (1024 * 1024 * 1024);
      
      setStorageInfo({
        used: usedMB.toFixed(2) + ' MB',
        total: totalGB.toFixed(1) + ' GB',
        percent: Math.min(100, (usedBytes / quotaBytes) * 100)
      });
    }
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center animate-in fade-in duration-300">
        <div className="w-full sm:max-w-md h-[80vh] bg-[var(--bg-main)] sm:rounded-[3rem] rounded-t-[3rem] shadow-2xl flex flex-col overflow-hidden border border-[var(--border-color)]">
            
            <div className="flex-none p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white font-black text-2xl shadow-[0_10px_30px_var(--accent-glow)]">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-extrabold text-xl text-[var(--text-main)] tracking-tight">{userName}</h3>
                        <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest opacity-60">Serafim OS Engine</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-3 bg-[var(--bg-item)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] transition-all active:scale-90">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-none p-4 pb-0 bg-[var(--bg-main)]">
                <div className="flex bg-[var(--bg-item)] p-1.5 rounded-[1.5rem] border border-[var(--border-color)] gap-1">
                    <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><SettingsIcon size={16} /> Настройки</button>
                    <button onClick={() => setActiveTab('system')} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'system' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Activity size={16} /> Система</button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'settings' && <Settings currentTheme={currentTheme} setTheme={setTheme} onClose={onClose} exportData={{ ...appState, user: userName }} onImport={onImport} />}
                
                {activeTab === 'system' && (
                  <div className="p-6 h-full overflow-y-auto space-y-6 no-scrollbar pb-32">
                    <div className="flex justify-between items-center px-1">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-40">Диагностика памяти</h4>
                        <button onClick={runDiagnostics} className="p-2 bg-[var(--bg-item)] rounded-xl text-[var(--accent)] hover:text-[var(--text-main)] transition-colors border border-[var(--border-color)]">
                            <RefreshCw size={14} />
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-[2rem] p-6 relative overflow-hidden group">
                            <div className="absolute -right-8 -bottom-8 text-[var(--accent)] opacity-5">
                                <HardDrive size={160} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-end mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-[var(--accent)]/10 text-[var(--accent)] rounded-2xl"><Database size={24} /></div>
                                        <div>
                                            <p className="text-base font-bold text-[var(--text-main)]">Ядро Данных</p>
                                            <p className="text-[10px] font-medium text-[var(--text-muted)] opacity-60">Локальная база</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-[var(--text-main)]">{storageInfo?.percent.toFixed(4)}%</p>
                                        <p className="text-[9px] font-black uppercase text-[var(--accent)]">{storageInfo?.used}</p>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-[var(--bg-main)] rounded-full overflow-hidden border border-[var(--border-color)] p-[1px]">
                                    <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-1000 shadow-[0_0_10px_var(--accent-glow)]" style={{ width: `${Math.max(1, storageInfo?.percent || 0)}%` }}></div>
                                </div>
                                <div className="flex justify-between mt-3 px-1">
                                    <span className="text-[9px] font-black uppercase text-[var(--text-muted)] opacity-40">0 MB</span>
                                    <span className="text-[9px] font-black uppercase text-[var(--text-muted)] opacity-40">Лимит: {storageInfo?.total}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-[1.5rem] p-5">
                                <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest opacity-40">Статус ИИ</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-sm font-black text-[var(--text-main)]">Active</span>
                                </div>
                            </div>
                            <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-[1.5rem] p-5">
                                <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest opacity-40">Безопасность</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <ShieldCheck size={14} className="text-indigo-400" />
                                    <span className="text-sm font-black text-[var(--text-main)]">Local</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 text-center">
                        <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-20">Serafim OS v3.5 Stable Engine</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-20 mt-1">Scan at {lastCheck}</p>
                    </div>
                  </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ProfileModal;


import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ThemeKey } from '../types';
import Settings from './Settings';
import { 
  X, Cpu, Database, Settings as SettingsIcon, Activity, CheckCircle2, RefreshCw, Layers
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
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const [lastCheck, setLastCheck] = useState<string>(new Date().toLocaleTimeString());

  const runDiagnostics = useCallback(async () => {
    setLastCheck(new Date().toLocaleTimeString());
    
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const used = (estimate.usage || 0) / (1024 * 1024);
      const total = (estimate.quota || 0) / (1024 * 1024);
      setStorageInfo({
        used: used.toFixed(2) + ' MB',
        total: (total / 1024).toFixed(1) + ' GB',
        percent: Math.min(100, (used / (total || 1)) * 100)
      });
    }

    try {
      const dbCheck = indexedDB.open('SerafimOS_DB');
      dbCheck.onsuccess = () => {
        setDbStatus('connected');
        dbCheck.result.close();
      };
      dbCheck.onerror = () => setDbStatus('error');
    } catch (e) {
      setDbStatus('error');
    }
  }, []);

  useEffect(() => {
    runDiagnostics();
    const interval = setInterval(runDiagnostics, 30000);
    return () => clearInterval(interval);
  }, [runDiagnostics]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in duration-300">
        <div className="w-full sm:max-w-md h-[80vh] bg-[var(--bg-main)] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border border-white/5">
            
            <div className="flex-none p-5 border-b border-white/5 flex justify-between items-center bg-[var(--bg-main)]">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-extrabold text-lg text-white tracking-tight">{userName}</h3>
                        <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Serafim OS Core</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white border border-white/5 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-none p-4 pb-0 bg-[var(--bg-main)]">
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 gap-1">
                    <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}><SettingsIcon size={14} /> Конфигурация</button>
                    <button onClick={() => setActiveTab('system')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'system' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}><Activity size={14} /> Состояние</button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'settings' && <Settings currentTheme={currentTheme} setTheme={setTheme} onClose={onClose} exportData={{ ...appState, user: userName }} onImport={onImport} />}
                
                {activeTab === 'system' && (
                  <div className="p-6 h-full overflow-y-auto space-y-6 no-scrollbar pb-24">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black uppercase tracking-widest text-white/30">Параметры Ядра</h4>
                        <button onClick={runDiagnostics} className="p-2 bg-white/5 rounded-lg text-indigo-400 hover:text-white transition-colors">
                            <RefreshCw size={14} />
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {/* Database Status */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl"><Database size={20} /></div>
                                <div>
                                    <p className="text-sm font-bold text-white">Хранилище DB</p>
                                    <p className="text-[10px] font-medium text-white/30">IndexedDB Local v3</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-emerald-500">{dbStatus}</span>
                                <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
                            </div>
                        </div>

                        {/* Memory Usage */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl"><Activity size={20} /></div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Квота памяти</p>
                                        <p className="text-[10px] font-medium text-white/30">{storageInfo?.used} занято</p>
                                    </div>
                                </div>
                                <span className="text-xs font-mono font-bold text-white/40">{storageInfo?.percent.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${storageInfo?.percent || 0}%` }}></div>
                            </div>
                        </div>

                        {/* Data Overview */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">Всего Задач</span>
                                <span className="text-xl font-black text-white">{appState.tasks.length}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">Мысли/Узлы</span>
                                <span className="text-xl font-black text-white">{appState.thoughts.length}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">Проекты</span>
                                <span className="text-xl font-black text-white">{appState.projects.length}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">Записи</span>
                                <span className="text-xl font-black text-white">{appState.journal.length}</span>
                            </div>
                        </div>

                        {/* AI Status */}
                        <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-2xl p-5 flex items-start gap-4">
                            <Cpu size={24} className="text-indigo-500 mt-1" />
                            <div>
                                <h5 className="text-xs font-black uppercase tracking-widest text-white/80 mb-1">Ядро Gemini 3</h5>
                                <p className="text-[10px] text-white/40 leading-relaxed">
                                    Нейронная модель активна. Обработка запросов и декомпозиция целей работают в штатном режиме.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 text-center">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Serafim OS Engine v3.0.0-build.2025</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mt-1">Last Sync: {lastCheck}</p>
                    </div>
                  </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ProfileModal;

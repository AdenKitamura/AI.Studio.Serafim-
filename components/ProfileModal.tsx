
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ThemeKey } from '../types';
import Settings from './Settings';
import { 
  User, Settings as SettingsIcon, X, Smartphone, 
  Database, Activity, Info, CheckCircle2, AlertCircle, 
  Zap, Cpu, HardDrive, HelpCircle, Download, RefreshCw
} from 'lucide-react';

interface ProfileModalProps {
  appState: AppState;
  userName: string;
  currentTheme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  onClose: () => void;
  onImport: (data: any) => void;
  canInstall?: boolean;
  onInstall?: () => void;
  swStatus?: 'loading' | 'active' | 'error';
  hasAiKey: boolean;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ 
    appState, userName, currentTheme, setTheme, onClose, onImport, canInstall, onInstall, swStatus, hasAiKey 
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'install' | 'system'>('settings');
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
        percent: Math.min(100, (used / total) * 100)
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
    const interval = setInterval(runDiagnostics, 10000);
    return () => clearInterval(interval);
  }, [runDiagnostics]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
        <div className="w-full sm:max-w-md h-[85vh] sm:h-[75vh] bg-[var(--bg-main)] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border border-[var(--border-color)]">
            
            <div className="flex-none p-4 border-b border-[var(--bg-card)] flex justify-between items-center bg-[var(--bg-main)]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-main)]">Настройки</h3>
                        <p className="text-xs text-[var(--text-muted)]">Конфигурация ядра</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-[var(--bg-item)] rounded-full text-[var(--text-muted)] hover:text-white border border-[var(--border-color)]">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-none p-4 pb-0 bg-[var(--bg-main)]">
                <div className="flex bg-[var(--bg-item)] p-1 rounded-xl border border-[var(--bg-card)] gap-1">
                    <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${activeTab === 'settings' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}><SettingsIcon size={14} /> Опции</button>
                    <button onClick={() => setActiveTab('system')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${activeTab === 'system' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}><Cpu size={14} /> Система</button>
                    <button onClick={() => setActiveTab('install')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${activeTab === 'install' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}><Smartphone size={14} /> PWA</button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'settings' && <Settings currentTheme={currentTheme} setTheme={setTheme} onClose={onClose} exportData={{ ...appState, user: userName }} onImport={onImport} />}
                
                {activeTab === 'system' && (
                  <div className="p-6 h-full overflow-y-auto space-y-4 no-scrollbar pb-20">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Состояние системы</h4>
                        <div className="flex items-center gap-1.5 text-[8px] font-bold text-indigo-500/50 uppercase">
                            Обновление: {lastCheck}
                        </div>
                    </div>
                    
                    <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><Database size={20} /></div>
                        <span className="text-sm font-bold text-[var(--text-main)]">IndexedDB</span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </div>

                    <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-bold text-[var(--text-main)]">Хранилище</span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{storageInfo?.used || '...'}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--bg-main)] rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${storageInfo?.percent || 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'install' && (
                  <div className="p-6 h-full overflow-y-auto space-y-6">
                    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-5 text-center">
                      <Smartphone className="mx-auto mb-3 text-indigo-500" size={40} />
                      <h4 className="text-lg font-bold text-white mb-4">Установка</h4>
                      {canInstall ? (
                        <button onClick={onInstall} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Download size={18} /> Установить PWA</button>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed text-center">Для iOS: нажмите "Поделиться" &rarr; "На экран Домой".</p>
                      )}
                    </div>
                  </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ProfileModal;

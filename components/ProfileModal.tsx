
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ThemeKey } from '../types';
import AnalyticsView from './AnalyticsView';
import Settings from './Settings';
import { 
  User, Settings as SettingsIcon, BarChart2, X, Smartphone, 
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
  const [activeTab, setActiveTab] = useState<'analytics' | 'settings' | 'install' | 'system'>('analytics');
  const [storageInfo, setStorageInfo] = useState<{ used: string, total: string, percent: number } | null>(null);
  const [showWiki, setShowWiki] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const [lastCheck, setLastCheck] = useState<string>(new Date().toLocaleTimeString());

  // System Diagnostic Function
  const runDiagnostics = useCallback(async () => {
    setLastCheck(new Date().toLocaleTimeString());
    
    // 1. Check Storage
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

    // 2. Check IndexedDB Health
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

  // Set up 10-second heartbeat
  useEffect(() => {
    runDiagnostics();
    const interval = setInterval(runDiagnostics, 10000);
    return () => clearInterval(interval);
  }, [runDiagnostics]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
        <div className="w-full sm:max-w-md h-[90vh] sm:h-[80vh] bg-[var(--bg-main)] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 border border-[var(--border-color)]">
            
            <div className="flex-none p-4 border-b border-[var(--bg-card)] flex justify-between items-center bg-[var(--bg-main)]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-main)]">{userName}</h3>
                        <p className="text-xs text-[var(--text-muted)]">Serafim OS User</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-[var(--bg-item)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)]">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-none p-4 pb-0 bg-[var(--bg-main)]">
                <div className="flex bg-[var(--bg-item)] p-1 rounded-xl border border-[var(--bg-card)] gap-1 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('analytics')} className={`flex-1 min-w-[80px] py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${activeTab === 'analytics' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}><BarChart2 size={14} /> Инфо</button>
                    <button onClick={() => setActiveTab('system')} className={`flex-1 min-w-[80px] py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${activeTab === 'system' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}><Cpu size={14} /> Система</button>
                    <button onClick={() => setActiveTab('install')} className={`flex-1 min-w-[80px] py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${activeTab === 'install' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}><Smartphone size={14} /> PWA</button>
                    <button onClick={() => setActiveTab('settings')} className={`flex-1 min-w-[80px] py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${activeTab === 'settings' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}><SettingsIcon size={14} /> Опции</button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'analytics' && <AnalyticsView tasks={appState.tasks} habits={appState.habits} journal={appState.journal} currentTheme={currentTheme} onClose={onClose} />}
                
                {activeTab === 'system' && (
                  <div className="p-6 h-full overflow-y-auto space-y-4 animate-in fade-in no-scrollbar pb-20">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Диагностика ядра</h4>
                        <div className="flex items-center gap-1.5 text-[8px] font-bold text-indigo-500/50 uppercase">
                            <RefreshCw size={8} className="animate-spin" />
                            Обновление: {lastCheck}
                        </div>
                    </div>
                    
                    {/* IndexedDB Health */}
                    <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                          <Database size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-[var(--text-main)]">IndexedDB</span>
                            <button 
                              onClick={() => setShowWiki(!showWiki)}
                              className={`transition-colors ${showWiki ? 'text-blue-400' : 'text-[var(--text-muted)] hover:text-blue-400'}`}
                            >
                              <HelpCircle size={14} />
                            </button>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-tight">Локальная База Данных</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase ${dbStatus === 'connected' ? 'text-emerald-500' : dbStatus === 'checking' ? 'text-orange-500' : 'text-red-500'}`}>
                          {dbStatus === 'connected' ? 'OK' : dbStatus === 'checking' ? 'PINGING' : 'FAILED'}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                      </div>
                    </div>

                    {showWiki && (
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 animate-in slide-in-from-top-2">
                        <div className="flex items-start gap-2">
                          <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                            <b>Wiki:</b> IndexedDB — это ваша личная сейфовая ячейка внутри браузера. Serafim OS использует её, чтобы ваши данные никогда не покидали устройство и были доступны мгновенно даже в режиме полета.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Gemini AI Intelligence */}
                    <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                          <Zap size={20} />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-[var(--text-main)]">Gemini AI</span>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-tight">Когнитивный слой</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase ${hasAiKey ? 'text-emerald-500' : 'text-orange-500'}`}>
                          {hasAiKey ? 'ONLINE' : 'AUTH_REQUIRED'}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${hasAiKey ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
                      </div>
                    </div>

                    {/* Storage / Memory */}
                    <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                            <HardDrive size={20} />
                            </div>
                            <div>
                            <span className="text-sm font-bold text-[var(--text-main)]">Память</span>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-tight">Дисковая квота</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[var(--text-muted)]">
                            {storageInfo?.used || '...'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                          <span>Загрузка: {storageInfo?.percent.toFixed(1) || 0}%</span>
                          <span>Лимит: {storageInfo?.total || '...'}</span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--bg-main)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 transition-all duration-1000 ease-out" 
                            style={{ width: `${storageInfo?.percent || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Service Worker Status */}
                    <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                          <Activity size={20} />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-[var(--text-main)]">Service Worker</span>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-tight">Автономный движок</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase ${swStatus === 'active' ? 'text-emerald-500' : 'text-orange-500'}`}>
                          {swStatus === 'active' ? 'ACTIVE' : 'READY'}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${swStatus === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-orange-500 animate-pulse'}`}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'install' && (
                  <div className="p-6 h-full overflow-y-auto space-y-6 animate-in fade-in no-scrollbar">
                    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-5 text-center">
                      <Smartphone className="mx-auto mb-3 text-indigo-500" size={40} />
                      <h4 className="text-lg font-bold text-white mb-2">Установка Serafim</h4>
                      
                      <div className="flex flex-col gap-2 mb-6">
                         <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl">
                            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Service Worker</span>
                            {swStatus === 'active' ? <CheckCircle2 size={14} className="text-emerald-500"/> : <AlertCircle size={14} className="text-orange-500"/>}
                         </div>
                         <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl">
                            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">PWA Manifest</span>
                            {canInstall ? <CheckCircle2 size={14} className="text-emerald-500"/> : <AlertCircle size={14} className="text-orange-500"/>}
                         </div>
                      </div>

                      {canInstall ? (
                        <button onClick={onInstall} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Download size={18} /> Установить на экран</button>
                      ) : (
                        <div className="p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">PWA уже установлено или ваш браузер не поддерживает прямую инсталляцию. Для iOS: "Поделиться" -> "На экран Домой".</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && <Settings currentTheme={currentTheme} setTheme={setTheme} onClose={onClose} exportData={{ ...appState, user: userName }} onImport={onImport} />}
            </div>
        </div>
    </div>
  );
};

export default ProfileModal;

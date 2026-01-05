
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ThemeKey, FontFamily, IconWeight, TextureType } from '../types';
import Settings from './Settings';
import * as googleService from '../services/googleService';
import { 
  X, Database, Settings as SettingsIcon, Activity, RefreshCw, HardDrive, ShieldCheck, HelpCircle,
  Cloud, CheckCircle, AlertCircle, LogOut, User, Calendar, CheckSquare, FileText, Server, AlertTriangle, Terminal
} from 'lucide-react';

interface ProfileModalProps {
  appState: AppState;
  userName: string;
  currentTheme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  onClose: () => void;
  onImport: (data: any) => void;
  hasAiKey: boolean;
  customization: {
    font: FontFamily;
    setFont: (f: FontFamily) => void;
    iconWeight: IconWeight;
    setIconWeight: (w: IconWeight) => void;
    texture: TextureType;
    setTexture: (t: TextureType) => void;
    customBg?: string;
    setCustomBg?: (bg: string) => void;
  };
  googleUser?: googleService.GoogleUserProfile | null;
  authError?: string | null;
  onRetryAuth?: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ 
    appState, userName, currentTheme, setTheme, onClose, onImport, hasAiKey, customization, googleUser, authError, onRetryAuth
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'google' | 'system' | 'faq'>('settings');
  const [storageInfo, setStorageInfo] = useState<{ used: string, total: string, percent: number } | null>(null);
  const [lastCheck, setLastCheck] = useState<string>(new Date().toLocaleTimeString());
  const [isSyncing, setIsSyncing] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);

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

  const handleManualSync = async () => {
      setIsSyncing(true);
      try {
          await googleService.syncToDrive(appState);
          alert('Синхронизация успешно завершена!');
      } catch(e) {
          alert('Ошибка синхронизации. Проверьте интернет.');
      } finally {
          setIsSyncing(false);
      }
  };

  const handleTestConnection = async () => {
      setDiagResult('Connecting to /api/auth...');
      const res = await googleService.testConnection();
      setDiagResult(res);
  };

  const handleForceUpdate = () => {
    if (confirm('Это обновит приложение до последней версии с сервера. Продолжить?')) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          for(let registration of registrations) {
            registration.unregister();
          }
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-main)]/80 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-[var(--accent-glow)] overflow-hidden">
                    {googleUser?.picture ? <img src={googleUser.picture} className="w-full h-full object-cover" /> : userName.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-bold text-lg text-[var(--text-main)] leading-none mb-1">{googleUser?.name || userName}</h3>
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${googleUser ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
                       <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest opacity-80">
                           {googleUser ? 'Server Online' : 'Offline Mode'}
                       </p>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="p-2 bg-[var(--bg-item)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] transition-all active:scale-90 shadow-sm glass-btn">
                <X size={24} />
            </button>
        </div>

        {/* Navigation Tabs */}
        <div className="p-4 pb-0">
            <div className="flex bg-[var(--bg-item)] p-1 rounded-xl border border-[var(--border-color)] gap-1 shadow-inner overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setActiveTab('settings')} 
                    className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'settings' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    <SettingsIcon size={14} /> Настройки
                </button>
                <button 
                    onClick={() => setActiveTab('google')} 
                    className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'google' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    <Cloud size={14} /> Server
                </button>
                <button 
                    onClick={() => setActiveTab('system')} 
                    className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'system' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    <Activity size={14} /> Система
                </button>
                <button 
                    onClick={() => setActiveTab('faq')} 
                    className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'faq' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    <HelpCircle size={14} /> FAQ
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            {activeTab === 'settings' && (
              <div className="h-full overflow-y-auto no-scrollbar pb-24">
                <div className="p-6">
                  <Settings 
                    currentTheme={currentTheme} 
                    setTheme={setTheme} 
                    onClose={onClose} 
                    exportData={{ ...appState, user: userName }} 
                    onImport={onImport}
                    customization={customization}
                  />
                </div>
              </div>
            )}

            {/* --- GOOGLE INTEGRATION TAB --- */}
            {activeTab === 'google' && (
                <div className="p-6 h-full overflow-y-auto no-scrollbar pb-32 space-y-6">
                    <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-1 ${googleUser ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
                                <Server size={32} className="text-black" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-main)]">Cloud Server</h3>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {googleUser ? 'Vercel Function: OK' : 'Vercel Function: Error'}
                                </p>
                            </div>
                        </div>

                        {googleUser ? (
                             <div className="space-y-4">
                                 <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                                     <CheckCircle size={24} className="text-emerald-500" />
                                     <div>
                                         <p className="text-sm font-bold text-emerald-500">Система подключена</p>
                                         <p className="text-[10px] text-[var(--text-muted)]">Авторизация через Vercel Backend успешна.</p>
                                     </div>
                                 </div>
                                 
                                 <div className="flex gap-3 mt-6">
                                     <button 
                                         onClick={handleManualSync} 
                                         disabled={isSyncing}
                                         className="flex-1 py-3 bg-[var(--accent)] text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                                     >
                                         <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                                         {isSyncing ? 'Синхронизация...' : 'Бэкап сейчас'}
                                     </button>
                                     <button onClick={googleService.signOut} className="py-3 px-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold text-xs hover:bg-rose-500 hover:text-white transition-colors">
                                         <LogOut size={16} />
                                     </button>
                                 </div>
                             </div>
                        ) : (
                             <div className="space-y-4">
                                 <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                                     <div className="flex items-center gap-2 mb-2 text-rose-500">
                                         <AlertTriangle size={18} />
                                         <span className="font-bold text-xs uppercase">Статус подключения</span>
                                     </div>
                                     <p className="text-[10px] text-[var(--text-muted)] font-mono break-all whitespace-pre-wrap">
                                         {authError ? `Ошибка: ${authError}` : 'Необходимо подключение к серверу.'}
                                     </p>
                                 </div>

                                 <button 
                                     onClick={onRetryAuth}
                                     className="w-full py-4 bg-[var(--bg-item)] border border-[var(--border-color)] text-[var(--text-main)] rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--bg-main)] transition-colors"
                                 >
                                     <RefreshCw size={16} /> Повторить попытку
                                 </button>

                                 <div className="border-t border-[var(--border-color)] pt-4 mt-4">
                                     <div className="flex justify-between items-center mb-2">
                                         <h4 className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Диагностика API</h4>
                                         <button onClick={handleTestConnection} className="text-[10px] text-[var(--accent)] hover:underline">Запустить тест</button>
                                     </div>
                                     <div className="bg-black p-3 rounded-xl border border-white/10 font-mono text-[9px] h-32 overflow-y-auto whitespace-pre-wrap break-all text-green-400">
                                         <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-1 text-white/50"><Terminal size={10}/> /api/auth response</div>
                                         {diagResult ? JSON.stringify(diagResult, null, 2) : 'Нажмите "Запустить тест" для проверки ответа сервера...'}
                                     </div>
                                 </div>
                             </div>
                        )}
                    </div>
                </div>
            )}
            
            {activeTab === 'system' && (
              <div className="p-6 h-full overflow-y-auto space-y-6 no-scrollbar pb-32">
                {/* ... existing system tab content ... */}
                <div className="glass-panel rounded-[2rem] p-6 relative overflow-hidden group">
                    <div className="absolute -right-10 -bottom-10 text-[var(--accent)] opacity-[0.03]">
                        <HardDrive size={200} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-end mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-[var(--accent)]/10 text-[var(--accent)] rounded-2xl"><Database size={28} /></div>
                                <div>
                                    <p className="text-lg font-bold text-[var(--text-main)]">IndexedDB Core</p>
                                    <p className="text-[10px] font-bold text-[var(--text-muted)] opacity-60 uppercase tracking-wide">Локальная БД</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-[var(--text-main)]">{storageInfo?.percent.toFixed(2)}%</p>
                                <p className="text-[9px] font-black uppercase text-[var(--accent)]">{storageInfo?.used}</p>
                            </div>
                        </div>
                        <div className="h-3 w-full bg-[var(--bg-main)] rounded-full overflow-hidden border border-[var(--border-color)] p-[2px]">
                            <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-1000 shadow-[0_0_15px_var(--accent-glow)]" style={{ width: `${Math.max(2, storageInfo?.percent || 0)}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-panel rounded-[1.5rem] p-6 flex flex-col items-center text-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${googleUser ? 'bg-emerald-500' : 'bg-rose-500'} shadow-[0_0_8px_currentColor] animate-pulse`}></div>
                         <span className="text-sm font-black text-[var(--text-main)]">Server</span>
                         <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">{googleUser ? 'Online' : 'Offline'}</span>
                    </div>
                    <div className="glass-panel rounded-[1.5rem] p-6 flex flex-col items-center text-center gap-2">
                         <ShieldCheck size={18} className="text-indigo-400" />
                         <span className="text-sm font-black text-[var(--text-main)]">Приватность</span>
                         <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Локально</span>
                    </div>
                </div>

                {/* UPDATE APP BUTTON */}
                <button 
                  onClick={handleForceUpdate}
                  className="w-full mt-4 glass-panel py-4 rounded-2xl flex items-center justify-center gap-2 text-rose-500 hover:bg-rose-500/10 transition-all border-dashed border border-[var(--border-color)]"
                >
                  <RefreshCw size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Hard Reset (Перезагрузка)</span>
                </button>

                <div className="pt-8 text-center border-t border-[var(--border-color)] mt-4">
                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-30">Scan Timestamp: {lastCheck}</p>
                </div>
              </div>
            )}

            {/* FAQ TAB */}
            {activeTab === 'faq' && (
              <div className="p-6 h-full overflow-y-auto no-scrollbar pb-32 space-y-6">
                 {/* ... existing faq ... */}
                 <div className="space-y-4">
                    {[
                      { q: "Где хранятся мои данные?", a: "Все данные (задачи, дневник, настройки) хранятся ТОЛЬКО в браузере вашего устройства (IndexedDB). Мы не имеем доступа к вашим записям." },
                      { q: "Почему не работает синхронизация?", a: "Проверьте 'Server' вкладку. Если там 'Offline', нажмите 'Повторить попытку'. Убедитесь, что серверные функции Vercel настроены." },
                      { q: "Что делать, если приложение тормозит?", a: "Попробуйте нажать кнопку 'Hard Reset' во вкладке Система." }
                    ].map((item, idx) => (
                      <div key={idx} className="glass-panel p-5 rounded-2xl border border-[var(--border-color)]">
                         <h5 className="font-bold text-[var(--text-main)] text-sm mb-2 flex items-start gap-2">
                           <span className="text-[var(--accent)]">Q.</span> {item.q}
                         </h5>
                         <p className="text-xs text-[var(--text-muted)] leading-relaxed pl-5 border-l-2 border-[var(--border-color)]">
                           {item.a}
                         </p>
                      </div>
                    ))}
                 </div>
              </div>
            )}
        </div>
    </div>
  );
};

export default ProfileModal;

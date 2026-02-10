import React, { useState, useEffect, useRef } from 'react';
import { AppState, ThemeKey, FontFamily, IconWeight, TextureType, GeminiModel } from '../types';
import Settings from './Settings';
import { 
  X, Settings as SettingsIcon, HardDrive, 
  CheckCircle, LogOut, User, Terminal, Wifi, Cloud, Activity
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { logger, SystemLog } from '../services/logger';

interface ProfileModalProps {
  appState: AppState;
  userName: string;
  currentTheme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  geminiModel: GeminiModel;
  setGeminiModel: (m: GeminiModel) => void;
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
  };
  session: any;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ 
    appState, userName, currentTheme, setTheme, geminiModel, setGeminiModel,
    onClose, onImport, customization, session, hasAiKey
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'settings' | 'console'>('general');
  const [storageInfo, setStorageInfo] = useState<{ used: string, total: string, percent: number, rawQuota: number } | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [connectionStatus, setConnectionStatus] = useState({
      supabase: 'checking',
      gemini: 'checking',
      google: 'checking'
  });
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Storage Estimate
  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
            const usedBytes = estimate.usage || 0;
            const quotaBytes = estimate.quota || 1;
            setStorageInfo({
                used: (usedBytes / (1024 * 1024)).toFixed(2) + ' MB',
                total: (quotaBytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
                percent: Math.min(100, (usedBytes / quotaBytes) * 100),
                rawQuota: quotaBytes
            });
        });
    }
  }, []);

  // Logs Subscription
  useEffect(() => {
      setLogs(logger.getLogs());
      const unsub = logger.subscribe((newLogs) => {
          setLogs([...newLogs]);
      });
      return unsub;
  }, []);

  // Auto-scroll logs
  useEffect(() => {
      if (activeTab === 'console') {
          setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
  }, [logs, activeTab]);

  // Connection Check
  useEffect(() => {
      const checkConnections = async () => {
          const { error } = await supabase.from('tasks').select('id').limit(1);
          const sbStatus = error ? 'error' : 'connected';
          const gemStatus = hasAiKey ? 'connected' : 'disconnected';
          const googleStatus = session?.provider_token ? 'connected' : 'disconnected';

          setConnectionStatus({
              supabase: sbStatus,
              gemini: gemStatus,
              google: googleStatus
          });
      };
      
      if (activeTab === 'console') {
          checkConnections();
      }
  }, [activeTab, session, hasAiKey]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const statusColor = (status: string) => {
      if (status === 'connected') return 'text-emerald-500';
      if (status === 'checking') return 'text-yellow-500 animate-pulse';
      return 'text-rose-500';
  };

  const statusIcon = (status: string) => {
      if (status === 'connected') return <CheckCircle size={14} />;
      if (status === 'checking') return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping"/>;
      return <X size={14} />;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-main)]/80 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header - Redesigned Layout */}
        <div className="p-4 border-b border-[var(--border-color)] grid grid-cols-[1fr_auto_1fr] items-center bg-[var(--bg-main)]/90 backdrop-blur-md sticky top-0 z-20 shadow-sm gap-4">
            
            {/* Left: Status */}
            <div className="flex items-center gap-2 justify-start min-w-0">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
               <span className="font-black text-[10px] uppercase text-[var(--text-main)] tracking-widest whitespace-nowrap truncate">
                 Serafim Cloud Active
               </span>
            </div>

            {/* Center: Name */}
            <div className="flex items-center justify-center min-w-0">
               <h3 className="font-bold text-lg text-[var(--text-main)] leading-none truncate text-center">
                 {userName}
               </h3>
            </div>

            {/* Right: Close */}
            <div className="flex justify-end">
                <button onClick={onClose} className="p-2 bg-[var(--bg-item)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] transition-all active:scale-90 shadow-sm glass-btn">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Navigation Tabs */}
        <div className="p-4 pb-0">
            <div className="flex bg-[var(--bg-item)] p-1 rounded-xl border border-[var(--border-color)] gap-1 shadow-inner overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('general')} className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'general' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                    <User size={14} /> Профиль
                </button>
                <button onClick={() => setActiveTab('settings')} className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                    <SettingsIcon size={14} /> Настройки
                </button>
                <button onClick={() => setActiveTab('console')} className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'console' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                    <Terminal size={14} /> Консоль
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            
            {/* --- GENERAL TAB (User Info + Storage) --- */}
            {activeTab === 'general' && (
                <div className="p-6 h-full overflow-y-auto no-scrollbar pb-32 flex flex-col gap-6">
                    
                    {/* User Card */}
                    <div className="glass-panel p-6 rounded-[2rem] text-center border border-[var(--border-color)]">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/20 mb-4 animate-in zoom-in">
                            <CheckCircle size={40} className="text-emerald-500" />
                        </div>
                        <h2 className="text-xl font-black text-[var(--text-main)]">Serafim Identity</h2>
                        <p className="text-[10px] font-bold uppercase text-emerald-500 tracking-widest mt-1 mb-6">Авторизован</p>
                        
                        <button onClick={handleLogout} className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2">
                            <LogOut size={16} /> Выйти из системы
                        </button>
                    </div>

                    {/* Storage Widget - Refactored for Responsiveness */}
                    <div className="glass-panel rounded-[2rem] p-6 relative overflow-hidden group border border-[var(--border-color)]">
                        <div className="absolute -right-10 -bottom-10 text-[var(--accent)] opacity-[0.03]">
                            <HardDrive size={150} />
                        </div>
                        <div className="relative z-10 flex flex-col gap-4">
                            {/* Icon & Title */}
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[var(--accent)]/10 text-[var(--accent)] rounded-2xl shrink-0">
                                    <HardDrive size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-lg font-bold text-[var(--text-main)] truncate">IndexedDB</p>
                                    <p className="text-[10px] font-bold text-[var(--text-muted)] opacity-60 uppercase tracking-wide truncate">Браузерная память</p>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Занято</p>
                                    <p className="text-sm font-black text-[var(--text-main)]">{storageInfo?.used || '...'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Всего</p>
                                    <p className="text-sm font-black text-[var(--text-main)]">{storageInfo?.total || '...'}</p>
                                </div>
                            </div>

                            {/* Progress Bar Container - Ensuring it fits */}
                            <div className="w-full bg-[var(--bg-main)] rounded-full h-4 border border-[var(--border-color)] overflow-hidden mt-1 relative">
                                {/* Track Background */}
                                <div className="absolute inset-0 bg-white/5"></div>
                                {/* Fill */}
                                <div 
                                    className="h-full bg-[var(--accent)] rounded-full transition-all duration-1000 shadow-[0_0_10px_var(--accent-glow)] relative z-10" 
                                    style={{ width: `${Math.max(5, storageInfo?.percent || 0)}%` }}
                                ></div>
                            </div>
                            <div className="text-center text-[10px] font-black text-[var(--text-muted)] opacity-60">
                                {storageInfo?.percent.toFixed(1)}% Использовано
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SETTINGS TAB --- */}
            {activeTab === 'settings' && (
              <div className="h-full overflow-y-auto no-scrollbar pb-24">
                <div className="p-6">
                  <Settings 
                    currentTheme={currentTheme} 
                    setTheme={setTheme} 
                    geminiModel={geminiModel}
                    setGeminiModel={setGeminiModel}
                    onClose={onClose} 
                    exportData={{ ...appState, user: userName }} 
                    onImport={onImport}
                    customization={customization}
                  />
                </div>
              </div>
            )}
            
            {/* --- CONSOLE TAB (Real-time Logs) --- */}
            {activeTab === 'console' && (
              <div className="p-6 h-full overflow-y-auto space-y-6 no-scrollbar pb-32 flex flex-col">
                  
                  {/* Connectivity Dashboard */}
                  <div className="glass-panel rounded-2xl p-5 border border-[var(--border-color)] space-y-4 shrink-0">
                      <div className="flex items-center gap-2 mb-2">
                          <Activity size={16} className="text-[var(--accent)]"/>
                          <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Статус Сети</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                              <div className="flex items-center gap-3">
                                  <Cloud size={14} className="text-emerald-500" />
                                  <span className="text-[10px] font-bold text-[var(--text-main)]">Supabase DB</span>
                              </div>
                              <div className={`flex items-center gap-2 text-[9px] font-black uppercase ${statusColor(connectionStatus.supabase)}`}>
                                  {connectionStatus.supabase} {statusIcon(connectionStatus.supabase)}
                              </div>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                              <div className="flex items-center gap-3">
                                  <Terminal size={14} className="text-purple-500" />
                                  <span className="text-[10px] font-bold text-[var(--text-main)]">Gemini API</span>
                              </div>
                              <div className={`flex items-center gap-2 text-[9px] font-black uppercase ${statusColor(connectionStatus.gemini)}`}>
                                  {connectionStatus.gemini} {statusIcon(connectionStatus.gemini)}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Real-time System Logs */}
                  <div className="glass-panel rounded-2xl p-1 border border-[var(--border-color)] flex flex-col flex-1 overflow-hidden shadow-2xl">
                      <div className="px-4 py-3 bg-[var(--bg-main)] border-b border-[var(--border-color)] rounded-t-xl flex justify-between items-center shrink-0">
                          <div className="flex items-center gap-2">
                            <Terminal size={12} className="text-[var(--accent)]" />
                            <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Live Kernel Output</span>
                          </div>
                          <button onClick={() => logger.clear()} className="text-[9px] font-bold uppercase text-[var(--text-muted)] hover:text-white bg-white/5 px-2 py-1 rounded">Clear</button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-[10px] bg-black/80 rounded-b-xl scrollbar-thin scrollbar-thumb-white/20">
                          {logs.length === 0 && <span className="text-[var(--text-muted)] opacity-50 italic">{'>'}{'>'} System initialized. Waiting for input...</span>}
                          {logs.map(log => (
                              <div key={log.id} className="flex gap-2 break-all animate-in fade-in slide-in-from-left-1 duration-100">
                                  <span className="text-[var(--text-muted)] opacity-40 shrink-0">[{log.timestamp}]</span>
                                  <span className={`${log.type === 'error' ? 'text-red-400 font-bold' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : 'text-emerald-500/80'}`}>
                                      <span className="opacity-50 mr-2">{'>'}</span>{log.message}
                                  </span>
                              </div>
                          ))}
                          <div ref={logsEndRef} className="h-4" />
                      </div>
                  </div>

              </div>
            )}
        </div>
    </div>
  );
};

export default ProfileModal;

import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ThemeKey, FontFamily, IconWeight, TextureType } from '../types';
import Settings from './Settings';
import { 
  X, Database, Settings as SettingsIcon, Activity, RefreshCw, HardDrive, ShieldCheck
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
  };
}

const ProfileModal: React.FC<ProfileModalProps> = ({ 
    appState, userName, currentTheme, setTheme, onClose, onImport, hasAiKey, customization
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
    <div className="fixed inset-0 z-[100] bg-[var(--bg-main)]/80 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-[var(--accent-glow)]">
                    {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-bold text-lg text-[var(--text-main)] leading-none mb-1">{userName}</h3>
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                       <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest opacity-80">System Online</p>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="p-2 bg-[var(--bg-item)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] transition-all active:scale-90 shadow-sm glass-btn">
                <X size={24} />
            </button>
        </div>

        {/* Navigation Tabs */}
        <div className="p-4 pb-0">
            <div className="flex bg-[var(--bg-item)] p-1 rounded-xl border border-[var(--border-color)] gap-1 shadow-inner">
                <button 
                    onClick={() => setActiveTab('settings')} 
                    className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'settings' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    <SettingsIcon size={14} /> Настройки
                </button>
                <button 
                    onClick={() => setActiveTab('system')} 
                    className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'system' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    <Activity size={14} /> Система
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            {activeTab === 'settings' && (
              <Settings 
                currentTheme={currentTheme} 
                setTheme={setTheme} 
                onClose={onClose} 
                exportData={{ ...appState, user: userName }} 
                onImport={onImport}
                customization={customization}
              />
            )}
            
            {activeTab === 'system' && (
              <div className="p-6 h-full overflow-y-auto space-y-6 no-scrollbar pb-32">
                <div className="flex justify-between items-center px-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Диагностика Хранилища</h4>
                    <button onClick={runDiagnostics} className="p-2 bg-[var(--bg-item)] rounded-xl text-[var(--accent)] hover:text-[var(--text-main)] transition-colors border border-[var(--border-color)]">
                        <RefreshCw size={16} />
                    </button>
                </div>
                
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
                         <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                         <span className="text-sm font-black text-[var(--text-main)]">Gemini AI</span>
                         <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Подключено</span>
                    </div>
                    <div className="glass-panel rounded-[1.5rem] p-6 flex flex-col items-center text-center gap-2">
                         <ShieldCheck size={18} className="text-indigo-400" />
                         <span className="text-sm font-black text-[var(--text-main)]">Приватность</span>
                         <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Локально</span>
                    </div>
                </div>

                <div className="pt-8 text-center border-t border-[var(--border-color)] mt-4">
                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-30">Scan Timestamp: {lastCheck}</p>
                </div>
              </div>
            )}
        </div>
    </div>
  );
};

export default ProfileModal;

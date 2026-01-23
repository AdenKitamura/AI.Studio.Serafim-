import React, { useState, useEffect } from 'react';
import { AppState, ThemeKey, FontFamily, IconWeight, TextureType } from '../types';
import Settings from './Settings';
import { 
  X, Database, Settings as SettingsIcon, HardDrive, 
  CloudLightning, Cloud, CheckCircle, Shield, LogOut
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

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
}

const ProfileModal: React.FC<ProfileModalProps> = ({ 
    appState, userName, currentTheme, setTheme, onClose, onImport, customization
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'account' | 'system'>('account');
  const [storageInfo, setStorageInfo] = useState<{ used: string, total: string, percent: number } | null>(null);
  
  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
            const usedBytes = estimate.usage || 0;
            const quotaBytes = estimate.quota || 1;
            setStorageInfo({
                used: (usedBytes / (1024 * 1024)).toFixed(2) + ' MB',
                total: (quotaBytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
                percent: Math.min(100, (usedBytes / quotaBytes) * 100)
            });
        });
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-main)]/80 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
               <div className="relative group">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-800 flex items-center justify-center text-white font-bold text-lg ring-2 ring-[var(--border-color)]">
                    {userName.charAt(0).toUpperCase()}
                  </div>
               </div>
               <div>
                   <h3 className="font-bold text-lg text-[var(--text-main)] leading-none mb-1">{userName}</h3>
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest opacity-80">Serafim Cloud Active</p>
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
                <button onClick={() => setActiveTab('account')} className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'account' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                    <Cloud size={14} /> Аккаунт
                </button>
                <button onClick={() => setActiveTab('settings')} className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                    <SettingsIcon size={14} /> Настройки
                </button>
                <button onClick={() => setActiveTab('system')} className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'system' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                    <HardDrive size={14} /> Система
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            
            {activeTab === 'account' && (
                <div className="p-6 h-full overflow-y-auto no-scrollbar pb-32 flex flex-col gap-6 items-center justify-center">
                    <div className="w-full max-w-sm space-y-4">
                        <div className="glass-panel p-6 rounded-[2rem] text-center border border-[var(--border-color)]">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/20 mb-4 animate-in zoom-in">
                                <CheckCircle size={40} className="text-emerald-500" />
                            </div>
                            <h2 className="text-xl font-black text-[var(--text-main)]">Serafim Cloud</h2>
                            <p className="text-[10px] font-bold uppercase text-emerald-500 tracking-widest mt-1 mb-4">Подключено • Защищено</p>
                            
                            <div className="space-y-3 text-left">
                                <div className="flex items-center justify-between p-3 bg-[var(--bg-item)] rounded-xl border border-[var(--border-color)]">
                                    <span className="text-xs font-bold text-[var(--text-muted)]">Пользователь</span>
                                    <span className="text-xs font-bold text-[var(--text-main)]">{userName}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-[var(--bg-item)] rounded-xl border border-[var(--border-color)]">
                                    <span className="text-xs font-bold text-[var(--text-muted)]">База Данных</span>
                                    <span className="text-[10px] font-black uppercase text-emerald-500">Supabase RLS</span>
                                </div>
                            </div>

                            <button onClick={handleLogout} className="w-full mt-6 py-4 bg-rose-500/10 text-rose-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2">
                                <LogOut size={16} /> Выйти из системы
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
            
            {activeTab === 'system' && (
              <div className="p-6 h-full overflow-y-auto space-y-6 no-scrollbar pb-32">
                <div className="glass-panel rounded-[2rem] p-6 relative overflow-hidden group border border-[var(--border-color)]">
                    <div className="absolute -right-10 -bottom-10 text-[var(--accent)] opacity-[0.03]">
                        <HardDrive size={200} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-end mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-[var(--accent)]/10 text-[var(--accent)] rounded-2xl"><Database size={28} /></div>
                                <div>
                                    <p className="text-lg font-bold text-[var(--text-main)]">IndexedDB Core</p>
                                    <p className="text-[10px] font-bold text-[var(--text-muted)] opacity-60 uppercase tracking-wide">Локальный кэш</p>
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
              </div>
            )}
        </div>
    </div>
  );
};

export default ProfileModal;

import React, { useState, useEffect } from 'react';
import { AppState, ThemeKey } from '../types';
import AnalyticsView from './AnalyticsView';
import Settings from './Settings';
import { User, Settings as SettingsIcon, BarChart2, X, Smartphone, Share, Chrome, Download, AlertCircle, CheckCircle2 } from 'lucide-react';

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
}

const ProfileModal: React.FC<ProfileModalProps> = ({ 
    appState, userName, currentTheme, setTheme, onClose, onImport, canInstall, onInstall, swStatus 
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'settings' | 'install'>('analytics');
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    } else if (/android/.test(ua)) {
      setPlatform('android');
    }
  }, []);

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
                <div className="flex bg-[var(--bg-item)] p-1 rounded-xl border border-[var(--bg-card)] gap-1">
                    <button onClick={() => setActiveTab('analytics')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${activeTab === 'analytics' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}><BarChart2 size={14} /> Инфо</button>
                    <button onClick={() => setActiveTab('install')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${activeTab === 'install' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}><Smartphone size={14} /> Установка</button>
                    <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${activeTab === 'settings' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}><SettingsIcon size={14} /> Опции</button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'analytics' && <AnalyticsView tasks={appState.tasks} habits={appState.habits} journal={appState.journal} currentTheme={currentTheme} onClose={onClose} />}
                
                {activeTab === 'install' && (
                  <div className="p-6 h-full overflow-y-auto space-y-6 animate-in fade-in no-scrollbar">
                    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-5 text-center">
                      <Smartphone className="mx-auto mb-3 text-indigo-500" size={40} />
                      <h4 className="text-lg font-bold text-white mb-2">Установка Serafim</h4>
                      
                      {/* PWA Diagnostics */}
                      <div className="flex justify-center gap-4 mb-4">
                         <div className="flex items-center gap-1 text-[9px] uppercase font-bold">
                            {swStatus === 'active' ? <CheckCircle2 size={10} className="text-emerald-500"/> : <AlertCircle size={10} className="text-orange-500"/>}
                            <span className={swStatus === 'active' ? 'text-emerald-500' : 'text-orange-500'}>Ядро OK</span>
                         </div>
                         <div className="flex items-center gap-1 text-[9px] uppercase font-bold">
                            {canInstall ? <CheckCircle2 size={10} className="text-emerald-500"/> : <AlertCircle size={10} className="text-orange-500"/>}
                            <span className={canInstall ? 'text-emerald-500' : 'text-orange-500'}>Система видит PWA</span>
                         </div>
                      </div>

                      {canInstall ? (
                        <button onClick={onInstall} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Download size={18} /> Установить СЕЙЧАС</button>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] mb-4">Браузер пока не выдал разрешение на прямую установку. Используйте меню Chrome.</p>
                      )}
                    </div>

                    <div className={`space-y-4 p-4 rounded-2xl border ${platform === 'android' ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-[var(--border-color)]'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Chrome size={18} className="text-emerald-500" />
                        <span className="font-bold text-sm">Chrome на Android</span>
                        {platform === 'android' && <span className="text-[8px] bg-emerald-500 text-black px-1.5 py-0.5 rounded font-black uppercase ml-auto">Ваше устройство</span>}
                      </div>
                      <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-2">
                        <p className="text-[10px] text-orange-400 font-bold uppercase mb-1">Как победить "AI Studio":</p>
                        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                          Если вы нажимаете "Добавить на гл. экран" и видите Студию — это значит Chrome не переключился на манифест Serafim. <b>Попробуйте обновить страницу</b> или дождаться появления кнопки "Установить приложение" в меню ⋮ (вместо "Добавить на гл. экран").
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3"><div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-bold shrink-0">1</div><p className="text-xs text-[var(--text-main)]">Нажмите <b>⋮ (три точки)</b> вверху Chrome.</p></div>
                        <div className="flex items-start gap-3"><div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-bold shrink-0">2</div><p className="text-xs text-[var(--text-main)]">Ищите пункт <b>«Установить приложение»</b>.</p></div>
                      </div>
                    </div>

                    <div className={`space-y-4 p-4 rounded-2xl border ${platform === 'ios' ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-[var(--border-color)]'}`}>
                      <div className="flex items-center gap-2 mb-2"><Share size={18} className="text-blue-400" /><span className="font-bold text-sm">Safari на iOS</span></div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3"><div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">1</div><p className="text-xs text-[var(--text-main)]">Нажмите <b>Поделиться</b>.</p></div>
                        <div className="flex items-start gap-3"><div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">2</div><p className="text-xs text-[var(--text-main)]">Выберите <b>«На экран "Домой"»</b>.</p></div>
                      </div>
                    </div>
                    <div className="pt-4 opacity-40 text-[9px] text-center uppercase tracking-widest font-bold pb-10 italic">Serafim OS Build v2.1.0</div>
                  </div>
                )}

                {activeTab === 'settings' && <Settings currentTheme={currentTheme} setTheme={setTheme} onClose={onClose} exportData={{ ...appState, user: userName }} onImport={onImport} />}
            </div>
        </div>
    </div>
  );
};

export default ProfileModal;


import React, { useRef } from 'react';
import { themes } from '../themes';
import { ThemeKey } from '../types';
import { CheckCircle, Palette, Database, Download, Upload, AlertTriangle, User } from 'lucide-react';

interface SettingsProps {
  currentTheme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  onClose: () => void;
  exportData: any;
  onImport: (data: any) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentTheme, setTheme, onClose, exportData, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `serafim-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target?.result as string);
            onImport(json);
            alert('Данные успешно импортированы!');
        } catch (err) {
            alert('Ошибка импорта. Некорректный формат файла.');
        }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-transparent p-6 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300 relative z-50 overflow-y-auto no-scrollbar">
      
      {/* SECTION: APPEARANCE */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><Palette size={18} /></div>
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Оформление</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(themes) as ThemeKey[]).map((key) => {
            const theme = themes[key];
            const isActive = currentTheme === key;
            return (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={`
                  relative p-4 rounded-2xl flex flex-col gap-3 transition-all text-left border
                  ${isActive ? 'bg-indigo-600/10 border-indigo-500 shadow-lg' : 'bg-white/5 border-white/5 hover:border-white/20'}
                `}
              >
                <div className="flex justify-between items-center w-full">
                    <div className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center" style={{ backgroundColor: theme.colors['--bg-main'] }}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors['--accent'] }}></div>
                    </div>
                    {isActive && <CheckCircle size={14} className="text-indigo-500" />}
                </div>
                <span className={`block text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-white/30'}`}>
                    {theme.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* SECTION: DATA MANAGEMENT */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><Database size={18} /></div>
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Данные и Бэкап</h3>
        </div>
        
        <div className="space-y-3">
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-amber-500/70 uppercase leading-relaxed tracking-tight">
                    Локальное хранилище очищается при сбросе браузера. Сохраняйте бэкап регулярно.
                </p>
            </div>

            <button 
                onClick={handleExport}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
            >
                <div className="flex items-center gap-3">
                    <Download size={18} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Экспорт системы</span>
                </div>
            </button>

            <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
            >
                <div className="flex items-center gap-3">
                    <Upload size={18} className="text-emerald-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Импорт системы</span>
                </div>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileImport} />
        </div>
      </section>

      <div className="h-10" />
    </div>
  );
};

export default Settings;


import React, { useRef } from 'react';
import { themes } from '../themes';
import { ThemeKey } from '../types';
import { CheckCircle, X, Sun, Moon, Database, Download, Upload, AlertTriangle, Palette } from 'lucide-react';

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
    <div className="flex flex-col h-full bg-transparent p-6 animate-in fade-in slide-in-from-bottom-4 duration-300 relative z-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 space-y-10">
        
        {/* ВНЕШНИЙ ВИД */}
        <section>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><Palette size={18} /></div>
                <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Визуальный стиль</h3>
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
                    ${isActive ? 'bg-white/10 border-indigo-500 shadow-lg' : 'bg-white/5 border-white/5 hover:border-white/20'}
                    `}
                >
                    <div className="flex justify-between items-center w-full">
                        <div className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center shadow-inner" style={{ backgroundColor: theme.colors['--bg-main'] }}>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors['--accent'] }}></div>
                        </div>
                        {isActive && <CheckCircle size={14} className="text-indigo-500" />}
                    </div>
                    
                    <div>
                        <span className={`block text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-white' : 'text-white/40'}`}>
                            {theme.name}
                        </span>
                    </div>
                </button>
                );
            })}
            </div>
        </section>

        {/* УПРАВЛЕНИЕ ДАННЫМИ */}
        <section>
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><Database size={18} /></div>
                <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Данные</h3>
            </div>
            
            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 space-y-6">
                <div className="flex items-start gap-4 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[10px] text-amber-500/60 leading-relaxed font-bold uppercase tracking-tight">
                        Все записи хранятся локально. Делайте бэкап перед очисткой браузера.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <button 
                        onClick={handleExport}
                        className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <Download size={18} className="text-indigo-400" />
                            <span className="text-xs font-bold text-white uppercase tracking-widest">Экспорт JSON</span>
                        </div>
                    </button>

                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <Upload size={18} className="text-emerald-400" />
                            <span className="text-xs font-bold text-white uppercase tracking-widest">Импорт JSON</span>
                        </div>
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".json"
                        onChange={handleFileImport}
                    />
                </div>
            </div>
        </section>

      </div>
    </div>
  );
};

export default Settings;

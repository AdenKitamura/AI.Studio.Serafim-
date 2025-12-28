
import React, { useRef } from 'react';
import { themes } from '../themes';
import { ThemeKey } from '../types';
import { CheckCircle, X, Sun, Moon, Database, Download, Upload, AlertTriangle, FileJson } from 'lucide-react';

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
            alert('Резервная копия успешно восстановлена!');
        } catch (err) {
            alert('Ошибка чтения файла. Убедитесь, что это корректный файл JSON от Serafim.');
        }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] p-6 animate-in fade-in slide-in-from-right-4 duration-300 relative z-50">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--border-color)] flex-none">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-main)]">Настройки</h2>
            <p className="text-sm text-[var(--text-muted)]">Конфигурация системы</p>
          </div>
          <button onClick={onClose} className="p-2 bg-[var(--bg-item)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border-color)]">
              <X size={24} />
          </button>
      </div>
      
      <div className="flex-1 overflow-y-auto no-scrollbar pb-20 space-y-8">
        
        {/* === DATA & SECURITY === */}
        <section>
             <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Database size={16} />
                Данные и Безопасность
            </h3>
            
            <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-3 p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
                    <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        Все данные хранятся <strong>локально</strong> в вашем браузере. Регулярно делайте резервные копии, чтобы не потерять мысли при очистке кэша или смене устройства.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                        onClick={handleExport}
                        className="flex flex-col items-center justify-center gap-2 p-6 bg-[var(--bg-main)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] rounded-xl transition-all group"
                    >
                        <div className="p-3 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full group-hover:scale-110 transition-transform">
                            <Download size={24} />
                        </div>
                        <span className="font-bold text-[var(--text-main)]">Скачать бэкап</span>
                        <span className="text-[10px] text-[var(--text-muted)]">Сохранить JSON файл</span>
                    </button>

                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 p-6 bg-[var(--bg-main)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-emerald-500 rounded-xl transition-all group"
                    >
                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full group-hover:scale-110 transition-transform">
                            <Upload size={24} />
                        </div>
                        <span className="font-bold text-[var(--text-main)]">Восстановить</span>
                        <span className="text-[10px] text-[var(--text-muted)]">Загрузить JSON файл</span>
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

        {/* === APPEARANCE === */}
        <section>
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sun size={16} />
                Внешний вид
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(themes) as ThemeKey[]).map((key) => {
                const theme = themes[key];
                const isActive = currentTheme === key;
                return (
                <button
                    key={key}
                    onClick={() => setTheme(key)}
                    className={`
                    relative p-4 rounded-2xl flex items-center gap-4 transition-all text-left
                    ${isActive ? 'bg-[var(--bg-item)] border-2 border-[var(--accent)] shadow-lg' : 'bg-[var(--bg-item)] border border-[var(--border-color)] hover:bg-[var(--bg-card)] hover:border-[var(--text-muted)]'}
                    `}
                >
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full border border-white/10 shadow-inner flex items-center justify-center" style={{ backgroundColor: theme.colors['--bg-main'] }}>
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors['--accent'] }}></div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-[var(--bg-card)] rounded-full p-0.5 shadow-sm border border-[var(--border-color)]">
                            {theme.type === 'light' ? <Sun size={10} className="text-[var(--text-muted)]"/> : <Moon size={10} className="text-[var(--text-muted)]"/>}
                        </div>
                    </div>
                    
                    <div>
                        <span className={`block text-sm font-bold ${isActive ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                            {theme.name}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] opacity-70 uppercase">{theme.type === 'light' ? 'Светлая' : 'Темная'}</span>
                    </div>

                    {isActive && (
                    <div className="ml-auto text-[var(--accent)] animate-in zoom-in">
                        <CheckCircle size={20} />
                    </div>
                    )}
                </button>
                );
            })}
            </div>
        </section>

      </div>
    </div>
  );
};

export default Settings;

import React, { useRef } from 'react';
import { themes } from '../themes';
import { ThemeKey, IconWeight } from '../types';
import { 
  CheckCircle, Palette, Database, Download, Upload, 
  AlertTriangle, Image as ImageIcon, Trash2, PenTool, 
  Zap
} from 'lucide-react';

interface SettingsProps {
  currentTheme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  onClose: () => void;
  exportData: any;
  onImport: (data: any) => void;
  customization: {
    iconWeight: IconWeight;
    setIconWeight: (w: IconWeight) => void;
    customBg?: string;
    setCustomBg?: (bg: string) => void;
  };
}

const Settings: React.FC<SettingsProps> = ({ currentTheme, setTheme, onClose, exportData, onImport, customization }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

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

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result as string;
        if (customization.setCustomBg) {
            customization.setCustomBg(result);
        }
    };
    reader.readAsDataURL(file);
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  const clearBg = () => {
      if (customization.setCustomBg) customization.setCustomBg('');
  };

  const iconWeights: {id: IconWeight, label: string}[] = [
      { id: '1px', label: 'Ultra Thin' },
      { id: '1.5px', label: 'Thin' },
      { id: '2px', label: 'Regular' },
      { id: '2.5px', label: 'Medium' },
      { id: '3px', label: 'Bold' },
  ];

  return (
    <div className="h-full bg-transparent p-6 overflow-y-auto no-scrollbar relative z-50">
      
      <div className="max-w-xl mx-auto space-y-8 pb-24">
        
        {/* --- APPEARANCE --- */}
        <section>
          <div className="flex items-center gap-3 mb-4 px-2">
            <Palette size={16} className="text-[var(--accent)]" />
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Атмосфера</h3>
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
                     relative h-20 rounded-2xl p-3 flex flex-col justify-between transition-all duration-300
                     ${isActive ? 'ring-2 ring-[var(--accent)] scale-[1.02] shadow-lg' : 'hover:scale-[1.02]'}
                     glass-panel
                   `}
                   style={{
                      backgroundColor: isActive ? 'color-mix(in srgb, var(--bg-item), transparent 20%)' : 'color-mix(in srgb, var(--bg-item), transparent 60%)'
                   }}
                 >
                   <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: theme.colors['--accent'] }}></div>
                      <div className="w-4 h-4 rounded-full shadow-sm border border-white/10" style={{ backgroundColor: theme.colors['--bg-main'] }}></div>
                   </div>
                   <div className="flex justify-between items-end">
                     <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                       {theme.name}
                     </span>
                     {isActive && <CheckCircle size={12} className="text-[var(--accent)]" />}
                   </div>
                 </button>
               );
             })}
          </div>
        </section>

        {/* --- BACKGROUND UPLOAD --- */}
        <section>
          <div className="flex items-center gap-3 mb-4 px-2">
            <ImageIcon size={16} className="text-[var(--accent)]" />
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Фон Интерфейса</h3>
          </div>
          
          <div className="glass-panel p-5 rounded-3xl space-y-4">
              <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
              
              {customization.customBg ? (
                  <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-[var(--border-color)] group">
                      <img src={customization.customBg} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                          <button onClick={() => bgInputRef.current?.click()} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 text-white"><Upload size={20} /></button>
                          <button onClick={clearBg} className="p-3 bg-rose-500/20 rounded-xl hover:bg-rose-500 text-white"><Trash2 size={20} /></button>
                      </div>
                  </div>
              ) : (
                  <button 
                    onClick={() => bgInputRef.current?.click()}
                    className="w-full h-24 rounded-2xl border border-dashed border-[var(--border-color)] flex flex-col items-center justify-center gap-2 hover:bg-[var(--bg-item)] transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  >
                      <Upload size={20} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Загрузить фото</span>
                  </button>
              )}
              <p className="text-[9px] text-[var(--text-muted)] text-center opacity-60">Изображение накладывается поверх темы</p>
          </div>
        </section>

        {/* --- ICON WEIGHT --- */}
        <section>
          <div className="flex items-center gap-3 mb-4 px-2">
            <PenTool size={16} className="text-[var(--accent)]" />
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Вес Иконок</h3>
          </div>
          <div className="flex bg-[var(--bg-main)] p-1 rounded-xl border border-[var(--border-color)]">
              {iconWeights.map((w) => (
                  <button
                      key={w.id}
                      onClick={() => customization.setIconWeight(w.id)}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-all ${customization.iconWeight === w.id ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                  >
                      <div className="w-4 h-4 rounded-full border border-current" style={{ borderWidth: w.id }}></div>
                  </button>
              ))}
          </div>
        </section>

        {/* --- DATA --- */}
        <section>
          <div className="flex items-center gap-3 mb-4 px-2">
            <Database size={16} className="text-amber-500" />
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Данные</h3>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-500/80 font-bold leading-relaxed">
                      Локальное хранилище. Создавайте резервные копии.
                  </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <button 
                      onClick={handleExport}
                      className="py-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[var(--text-muted)] transition-all group"
                  >
                      <Download size={20} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
                      <span className="text-[9px] font-black uppercase text-[var(--text-muted)] group-hover:text-[var(--text-main)]">Бэкап</span>
                  </button>
                  <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="py-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[var(--text-muted)] transition-all group"
                  >
                      <Upload size={20} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
                      <span className="text-[9px] font-black uppercase text-[var(--text-muted)] group-hover:text-[var(--text-main)]">Восстановить</span>
                  </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileImport} />
          </div>
        </section>
        
        {/* Footer */}
        <div className="text-center py-6 opacity-30">
            <p className="text-[9px] font-black uppercase tracking-widest">Serafim OS v4.0 Personal</p>
            <p className="text-[9px] font-serif italic mt-1">For Cognitive Excellence</p>
        </div>

      </div>
    </div>
  );
};

export default Settings;
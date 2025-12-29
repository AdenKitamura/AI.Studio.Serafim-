
import React, { useRef } from 'react';
import { themes } from '../themes';
import { ThemeKey, FontFamily, IconWeight, TextureType } from '../types';
import { 
  CheckCircle, Palette, Database, Download, Upload, 
  AlertTriangle, RefreshCw, Layers, Box, 
  Grid, FileText, Smartphone, Type, PenTool, Hash, 
  Cpu, Activity, Zap
} from 'lucide-react';

interface SettingsProps {
  currentTheme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  onClose: () => void;
  exportData: any;
  onImport: (data: any) => void;
  customization: {
    font: FontFamily;
    setFont: (f: FontFamily) => void;
    iconWeight: IconWeight;
    setIconWeight: (w: IconWeight) => void;
    texture: TextureType;
    setTexture: (t: TextureType) => void;
  };
}

const Settings: React.FC<SettingsProps> = ({ currentTheme, setTheme, onClose, exportData, onImport, customization }) => {
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

  const handleHardRefresh = () => {
    if (confirm('Это перезагрузит приложение для применения обновлений. Продолжить?')) {
      window.location.reload();
    }
  };

  const fontList: {id: FontFamily, label: string, category: string}[] = [
      { id: 'Plus Jakarta Sans', label: 'Jakarta', category: 'Sans' },
      { id: 'Inter', label: 'Inter', category: 'Sans' },
      { id: 'DM Sans', label: 'DM Sans', category: 'Sans' },
      { id: 'Outfit', label: 'Outfit', category: 'Sans' },
      { id: 'Manrope', label: 'Manrope', category: 'Sans' },
      { id: 'Space Grotesk', label: 'Space', category: 'Display' },
      { id: 'Syne', label: 'Syne', category: 'Display' },
      { id: 'JetBrains Mono', label: 'Mono', category: 'Mono' },
      { id: 'Playfair Display', label: 'Playfair', category: 'Serif' },
      { id: 'Cormorant Garamond', label: 'Garamond', category: 'Serif' },
  ];

  const textureList: {id: TextureType, label: string, icon: React.ReactNode}[] = [
      { id: 'none', label: 'Нет', icon: <Box size={14}/> },
      { id: 'noise', label: 'Шум', icon: <Layers size={14}/> },
      { id: 'grid', label: 'Сетка', icon: <Grid size={14}/> },
      { id: 'dots', label: 'Точки', icon: <Activity size={14}/> },
      { id: 'paper', label: 'Бумага', icon: <FileText size={14}/> },
      { id: 'mesh', label: 'Меш', icon: <Hash size={14}/> },
      { id: 'carbon', label: 'Карбон', icon: <Database size={14}/> },
      { id: 'circuit', label: 'Схема', icon: <Cpu size={14}/> },
      { id: 'waves', label: 'Волны', icon: <Zap size={14}/> },
      { id: 'brushed', label: 'Металл', icon: <Layers size={14}/> },
  ];

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
        
        {/* --- REFRESH APP --- */}
        <button 
          onClick={handleHardRefresh}
          className="w-full glass-panel py-3 rounded-2xl flex items-center justify-center gap-2 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all active:scale-95 border-dashed border-[var(--border-color)]"
        >
          <RefreshCw size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Перезагрузить</span>
        </button>

        {/* --- APPEARANCE --- */}
        <section>
          <div className="flex items-center gap-3 mb-4 px-2">
            <Palette size={16} className="text-[var(--accent)]" />
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Тема и Цвет</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                       {theme.name.split(' ')[0]}
                     </span>
                     {isActive && <CheckCircle size={12} className="text-[var(--accent)]" />}
                   </div>
                 </button>
               );
             })}
          </div>
        </section>

        {/* --- TYPOGRAPHY --- */}
        <section>
          <div className="flex items-center gap-3 mb-4 px-2">
            <Type size={16} className="text-[var(--accent)]" />
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Типографика</h3>
          </div>
          <div className="glass-panel p-4 rounded-3xl grid grid-cols-2 gap-3">
             {fontList.map(font => (
                 <button
                    key={font.id}
                    onClick={() => customization.setFont(font.id)}
                    className={`
                        px-3 py-3 rounded-xl flex flex-col items-start gap-1 transition-all border
                        ${customization.font === font.id 
                            ? 'bg-[var(--accent)] text-white border-transparent shadow-lg scale-[1.02]' 
                            : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-muted)]'
                        }
                    `}
                 >
                     <span className="text-xs font-bold leading-none" style={{ fontFamily: font.id }}>Abc</span>
                     <span className="text-[9px] uppercase tracking-wider opacity-80" style={{ fontFamily: font.id }}>{font.label}</span>
                 </button>
             ))}
          </div>
        </section>

        {/* --- INTERFACE --- */}
        <section>
          <div className="flex items-center gap-3 mb-4 px-2">
            <PenTool size={16} className="text-[var(--accent)]" />
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Интерфейс</h3>
          </div>
          
          <div className="glass-panel p-5 rounded-3xl space-y-6">
              {/* Texture Grid */}
              <div>
                  <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-3 block opacity-60">Фоновая текстура</label>
                  <div className="grid grid-cols-5 gap-2">
                      {textureList.map((t) => (
                          <button
                              key={t.id}
                              onClick={() => customization.setTexture(t.id)}
                              className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all border ${customization.texture === t.id ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-transparent' : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)]'}`}
                              title={t.label}
                          >
                              {t.icon}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Icon Weight */}
              <div>
                  <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-3 block opacity-60">Вес иконок</label>
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
              </div>
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
            <p className="text-[9px] font-black uppercase tracking-widest">Serafim OS v3.2</p>
            <p className="text-[9px] font-serif italic mt-1">Designed for Focus</p>
        </div>

      </div>
    </div>
  );
};

export default Settings;

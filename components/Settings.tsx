import React, { useRef } from 'react';
import { themes } from '../themes';
import { ThemeKey, FontFamily, IconWeight, TextureType } from '../types';
import { 
  CheckCircle, Palette, Database, Download, Upload, 
  AlertTriangle, Type, RefreshCw, Layers, Box, 
  Grid, FileText, Smartphone, Laptop 
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

  const textures: {id: TextureType, label: string, icon: React.ReactNode}[] = [
      { id: 'none', label: 'Clear', icon: <Box size={16}/> },
      { id: 'noise', label: 'Noise', icon: <Layers size={16}/> },
      { id: 'grid', label: 'Mesh', icon: <Grid size={16}/> },
      { id: 'paper', label: 'Paper', icon: <FileText size={16}/> },
  ];

  return (
    <div className="h-full bg-transparent p-6 overflow-y-auto no-scrollbar relative z-50">
      
      <div className="max-w-xl mx-auto space-y-8 pb-20">
        
        {/* --- UPDATE --- */}
        <button 
          onClick={handleHardRefresh}
          className="w-full glass-panel py-3 rounded-2xl flex items-center justify-center gap-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all active:scale-95"
        >
          <RefreshCw size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Перезагрузить приложение</span>
        </button>

        {/* --- VISUALS BENTO --- */}
        <section>
          <div className="flex items-center gap-3 mb-4 px-2">
            <Palette size={16} className="text-[var(--accent)]" />
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Визуальный Стиль</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
             {/* THEME SELECTOR - Full Width in Grid */}
             <div className="col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
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

             {/* TEXTURE & FONT ROW */}
             <div className="col-span-2 glass-panel p-4 rounded-3xl mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    
                    {/* Texture Selection */}
                    <div>
                        <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-3 block opacity-60">Текстура</label>
                        <div className="grid grid-cols-4 gap-2">
                            {textures.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => customization.setTexture(t.id)}
                                    className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${customization.texture === t.id ? 'bg-[var(--text-main)] text-[var(--bg-main)]' : 'bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)]'}`}
                                >
                                    {t.icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Typography */}
                    <div>
                        <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-3 block opacity-60">Шрифт</label>
                        <div className="space-y-2">
                            {[
                              { id: 'Plus Jakarta Sans', label: 'Modern Sans' },
                              { id: 'Inter', label: 'Minimal' },
                              { id: 'Playfair Display', label: 'Serif' },
                            ].map((font) => (
                               <button
                                  key={font.id}
                                  onClick={() => customization.setFont(font.id as FontFamily)}
                                  className={`w-full px-3 py-2 rounded-lg flex justify-between items-center transition-all text-xs ${customization.font === font.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)]'}`}
                                  style={{ fontFamily: font.id }}
                               >
                                  <span>{font.label}</span>
                               </button>
                            ))}
                        </div>
                    </div>

                </div>
             </div>
          </div>
        </section>

        {/* --- DATA SECTION --- */}
        <section>
          <div className="flex items-center gap-3 mb-4 px-2">
            <Database size={16} className="text-amber-500" />
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Управление Данными</h3>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-500/80 font-bold leading-relaxed">
                      Все данные хранятся только на этом устройстве. Регулярно делайте бэкап.
                  </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <button 
                      onClick={handleExport}
                      className="py-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[var(--text-muted)] transition-all group"
                  >
                      <Download size={20} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
                      <span className="text-[9px] font-black uppercase text-[var(--text-muted)] group-hover:text-[var(--text-main)]">Скачать</span>
                  </button>
                  <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="py-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[var(--text-muted)] transition-all group"
                  >
                      <Upload size={20} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
                      <span className="text-[9px] font-black uppercase text-[var(--text-muted)] group-hover:text-[var(--text-main)]">Загрузить</span>
                  </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileImport} />
          </div>
        </section>
        
        {/* Footer */}
        <div className="text-center py-6 opacity-30">
            <p className="text-[9px] font-black uppercase tracking-widest">Serafim OS v3.1</p>
            <p className="text-[9px] font-serif italic mt-1">Designed for Focus</p>
        </div>

      </div>
    </div>
  );
};

export default Settings;

import React, { useRef } from 'react';
import { themes } from '../themes';
import { ThemeKey, FontFamily, IconWeight, TextureType } from '../types';
import { CheckCircle, Palette, Database, Download, Upload, AlertTriangle, Type, RefreshCcw, Layers, Box, Grid, FileText, Component } from 'lucide-react';

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
      { id: 'none', label: 'Гладкий', icon: <Box size={14}/> },
      { id: 'noise', label: 'Шум', icon: <Layers size={14}/> },
      { id: 'grid', label: 'Сетка', icon: <Grid size={14}/> },
      { id: 'paper', label: 'Бумага', icon: <FileText size={14}/> },
      { id: 'concrete', label: 'Бетон', icon: <Component size={14}/> },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent p-6 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300 relative z-50 overflow-y-auto no-scrollbar">
      
      {/* UPDATE / DEV ACTION */}
      <button 
        onClick={handleHardRefresh}
        className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
      >
        <RefreshCcw size={14} />
        Обновить приложение
      </button>

      {/* SECTION: APPEARANCE (THEMES) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg"><Palette size={18} /></div>
            <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Палитра</h3>
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
                  relative p-4 rounded-2xl flex flex-col gap-3 transition-all text-left border glass-btn
                  ${isActive ? 'bg-[var(--accent)]/20 border-[var(--accent)] shadow-lg' : 'bg-[var(--bg-item)]/50 border-[var(--border-color)] hover:border-[var(--text-muted)]'}
                `}
              >
                <div className="flex justify-between items-center w-full">
                    <div className="w-8 h-8 rounded-xl border border-[var(--border-color)] flex items-center justify-center" style={{ backgroundColor: theme.colors['--bg-main'] }}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors['--accent'] }}></div>
                    </div>
                    {isActive && <CheckCircle size={14} className="text-[var(--accent)]" />}
                </div>
                <span className={`block text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                    {theme.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* SECTION: VISUAL STYLE (Icons & Texture) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg"><Box size={18} /></div>
            <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Материал и Стиль</h3>
        </div>
        
        <div className="space-y-6">
             {/* Textures */}
             <div>
                <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-3 block">Текстура фона</label>
                <div className="grid grid-cols-3 gap-2">
                    {textures.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => customization.setTexture(t.id)}
                            className={`py-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${customization.texture === t.id ? 'bg-[var(--accent)] text-white border-transparent shadow-lg' : 'bg-[var(--bg-item)] text-[var(--text-muted)] border-[var(--border-color)]'}`}
                        >
                            {t.icon}
                            <span className="text-[9px] font-black uppercase">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Icon Weight */}
            <div>
               <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-3 block">Толщина иконок</label>
               <div className="flex bg-[var(--bg-item)] p-1 rounded-xl border border-[var(--border-color)]">
                  {['1.5px', '2px', '2.5px', '3px'].map((w) => (
                      <button
                        key={w}
                        onClick={() => customization.setIconWeight(w as IconWeight)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${customization.iconWeight === w ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}
                      >
                         {w === '1.5px' ? 'Thin' : w === '2px' ? 'Reg' : w === '2.5px' ? 'Bold' : 'Heavy'}
                      </button>
                  ))}
               </div>
            </div>
        </div>
      </section>

      {/* SECTION: TYPOGRAPHY */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg"><Type size={18} /></div>
            <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Типографика</h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'Plus Jakarta Sans', label: 'Modern Sans' },
              { id: 'Inter', label: 'Minimal' },
              { id: 'Playfair Display', label: 'Elegant Serif' },
              { id: 'JetBrains Mono', label: 'Developer Mono' }
            ].map((font) => (
               <button
                  key={font.id}
                  onClick={() => customization.setFont(font.id as FontFamily)}
                  className={`px-4 py-3 rounded-xl border flex justify-between items-center transition-all ${customization.font === font.id ? 'bg-[var(--accent)] text-white border-transparent' : 'bg-[var(--bg-item)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-main)]'}`}
                  style={{ fontFamily: font.id }}
               >
                  <span className="text-sm">{font.label}</span>
                  {customization.font === font.id && <CheckCircle size={14} />}
               </button>
            ))}
        </div>
      </section>

      {/* SECTION: DATA MANAGEMENT */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><Database size={18} /></div>
            <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Данные и Бэкап</h3>
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
                className="w-full flex items-center justify-between p-4 glass-panel rounded-2xl transition-all hover:bg-[var(--bg-item)] glass-btn"
            >
                <div className="flex items-center gap-3">
                    <Download size={18} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">Экспорт системы</span>
                </div>
            </button>

            <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-between p-4 glass-panel rounded-2xl transition-all hover:bg-[var(--bg-item)] glass-btn"
            >
                <div className="flex items-center gap-3">
                    <Upload size={18} className="text-emerald-400" />
                    <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">Импорт системы</span>
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

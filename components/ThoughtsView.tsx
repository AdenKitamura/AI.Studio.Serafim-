
import React, { useState, useRef } from 'react';
import { Thought } from '../types';
import { Brain, Lightbulb, Plus, Trash2, Quote as QuoteIcon, Library, Download, X, User, Link as LinkIcon, File as FileIcon, Globe, Paperclip, Network } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';

interface ThoughtsViewProps {
  thoughts: Thought[];
  onAdd: (content: string, type: 'thought' | 'idea' | 'quote' | 'link' | 'file', tags: string[], metadata?: any) => void;
  onDelete: (id: string) => void;
}

const ThoughtsView: React.FC<ThoughtsViewProps> = ({ thoughts, onAdd, onDelete }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'thought' | 'link' | 'file'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [addType, setAddType] = useState<'thought' | 'link' | 'file'>('thought');
  
  const [newContent, setNewContent] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleManualAdd = () => {
    if (!newContent.trim() && !newUrl.trim()) return;
    const tags = tagInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
    
    if (addType === 'link') {
      onAdd(newContent || newUrl, 'link', tags, { url: newUrl });
    } else {
      onAdd(newContent, 'thought', tags);
    }
    
    resetForm();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onAdd(file.name, 'file', [file.type.split('/')[0]], { 
        fileName: file.name, 
        fileType: file.type, 
        fileData: reader.result 
      });
      setIsAdding(false);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setNewContent('');
    setNewUrl('');
    setTagInput('');
    setIsAdding(false);
  };

  const filteredThoughts = thoughts.filter(t => activeFilter === 'all' || t.type === activeFilter);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-[var(--bg-main)]/80 backdrop-blur-md sticky top-0 z-20">
        <h2 className="text-2xl font-black text-white tracking-tighter mb-4 uppercase">Архив Знаний</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Все', icon: <Globe size={12}/> },
            { id: 'thought', label: 'Мысли', icon: <Brain size={12}/> },
            { id: 'link', label: 'Ссылки', icon: <LinkIcon size={12}/> },
            { id: 'file', label: 'Файлы', icon: <FileIcon size={12}/> }
          ].map(f => (
            <button 
              key={f.id} 
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === f.id ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'}`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-32">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {filteredThoughts.map(t => (
            <div key={t.id} className="break-inside-avoid group bg-white/5 border border-white/5 rounded-3xl p-6 relative hover:border-indigo-500/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl bg-black/20 ${t.type === 'link' ? 'text-blue-400' : t.type === 'file' ? 'text-amber-400' : 'text-indigo-400'}`}>
                    {t.type === 'link' ? <LinkIcon size={14}/> : t.type === 'file' ? <FileIcon size={14}/> : <Brain size={14}/>}
                  </div>
                  <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">{t.type}</span>
                </div>
                <button onClick={() => onDelete(t.id)} className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-rose-500 transition-all"><Trash2 size={14}/></button>
              </div>

              {t.type === 'link' ? (
                <a href={t.metadata?.url} target="_blank" rel="noopener noreferrer" className="block">
                  <p className="text-sm font-bold text-white mb-2 hover:text-indigo-400 transition-colors">{t.content}</p>
                  <p className="text-[10px] text-blue-400 truncate opacity-60 underline">{t.metadata?.url}</p>
                </a>
              ) : t.type === 'file' ? (
                <div className="flex items-center gap-3">
                   <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{t.content}</p>
                      <p className="text-[10px] text-white/30 uppercase font-black">{t.metadata?.fileType?.split('/')[1] || 'FILE'}</p>
                   </div>
                   <button className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-white"><Download size={14}/></button>
                </div>
              ) : (
                <p className="text-sm text-white/80 leading-relaxed">{t.content}</p>
              )}
              
              {/* Context Links Indicator */}
              {t.links && t.links.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                      <Network size={12} className="text-indigo-400" />
                      <span className="text-[10px] font-black uppercase text-indigo-400/80 tracking-wider">{t.links.length} связей</span>
                  </div>
              )}

              {t.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-1">
                  {t.tags.map(tag => <span key={tag} className="text-[9px] font-bold text-indigo-400">#{tag}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-28 right-6 z-40">
        <button onClick={() => setIsAdding(true)} className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"><Plus size={24}/></button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-[var(--bg-item)] w-full max-w-md p-8 rounded-[3rem] border border-white/10 shadow-3xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black uppercase tracking-tighter">Добавить в архив</h3>
              <button onClick={resetForm}><X size={24}/></button>
            </div>

            <div className="flex bg-white/5 p-1 rounded-2xl mb-6">
              {[
                { id: 'thought', label: 'Мысль', icon: <Brain size={14}/> },
                { id: 'link', label: 'Ссылка', icon: <LinkIcon size={14}/> },
                { id: 'file', label: 'Файл', icon: <Paperclip size={14}/> }
              ].map(opt => (
                <button key={opt.id} onClick={() => setAddType(opt.id as any)} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${addType === opt.id ? 'bg-indigo-600 text-white' : 'text-white/40'}`}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {addType === 'file' ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-12 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
                >
                  <Paperclip size={32} className="text-white/20 mb-4" />
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Кликни для загрузки</p>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                </div>
              ) : (
                <>
                  {addType === 'link' && (
                    <input 
                      autoFocus
                      value={newUrl} 
                      onChange={e => setNewUrl(e.target.value)} 
                      placeholder="URL ссылки..." 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-indigo-500/50 outline-none"
                    />
                  )}
                  <textarea 
                    autoFocus={addType === 'thought'}
                    value={newContent} 
                    onChange={e => setNewContent(e.target.value)} 
                    placeholder={addType === 'link' ? "Заголовок ссылки (необязательно)..." : "О чем ты думаешь?"} 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white min-h-[120px] focus:border-indigo-500/50 outline-none resize-none"
                  />
                  <input 
                    value={tagInput} 
                    onChange={e => setTagInput(e.target.value)} 
                    placeholder="Теги через запятую..." 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-indigo-500/50 outline-none"
                  />
                  <button onClick={handleManualAdd} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Сохранить</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThoughtsView;

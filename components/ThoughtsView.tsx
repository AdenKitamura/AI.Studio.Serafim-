
import React, { useState, useRef } from 'react';
import { Thought, Attachment } from '../types';
import { 
  Brain, Lightbulb, Plus, Trash2, Quote as QuoteIcon, Library, Download, X, User, 
  Link as LinkIcon, File as FileIcon, Globe, Paperclip, Network, BookOpen, Save,
  Image as ImageIcon, FileText, LayoutDashboard
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ThoughtsViewProps {
  thoughts: Thought[];
  onAdd: (content: string, type: 'thought' | 'idea' | 'quote' | 'link' | 'file', tags: string[], metadata?: any) => void;
  onUpdate?: (id: string, updates: Partial<Thought>) => void; 
  onDelete: (id: string) => void;
  onNavigate?: (view: any) => void; // Added for Pill
}

const ThoughtsView: React.FC<ThoughtsViewProps> = ({ thoughts, onAdd, onUpdate, onDelete, onNavigate }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'thought' | 'link' | 'file'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [addType, setAddType] = useState<'thought' | 'link' | 'file'>('thought');
  
  // Detail Modal State
  const [viewingThought, setViewingThought] = useState<Thought | null>(null);
  
  const [newContent, setNewContent] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const diaryFileInputRef = useRef<HTMLInputElement>(null);

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

  // --- DIARY/IDEA DETAIL LOGIC ---
  const saveDiaryUpdates = () => {
      if (viewingThought && onUpdate) {
          onUpdate(viewingThought.id, { 
              content: viewingThought.content, 
              notes: viewingThought.notes,
              attachments: viewingThought.attachments
          });
          setViewingThought(null);
      }
  };

  const handleDiaryAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !viewingThought) return;
      const reader = new FileReader();
      reader.onload = () => {
          const newAtt: Attachment = {
              id: Date.now().toString(),
              type: file.type.startsWith('image/') ? 'image' : 'file',
              content: reader.result as string,
              name: file.name
          };
          setViewingThought(prev => prev ? ({ ...prev, attachments: [...(prev.attachments || []), newAtt] }) : null);
      };
      reader.readAsDataURL(file);
  };

  // STRICT SEPARATION: Only show thoughts that DO NOT have a projectId
  // This separates the "Ideas Archive" from "Project Boards"
  const filteredThoughts = thoughts.filter(t => 
      !t.projectId && 
      (activeFilter === 'all' || t.type === activeFilter)
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-[var(--bg-main)]/80 backdrop-blur-md sticky top-0 z-20">
        <h2 className="text-2xl font-black text-white tracking-tighter mb-4 uppercase">Архив Идей</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Все', icon: <Globe size={12}/> },
            { id: 'thought', label: 'Идеи', icon: <Lightbulb size={12}/> },
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
            <div key={t.id} onClick={() => setViewingThought(t)} className="break-inside-avoid group bg-white/5 border border-white/5 rounded-3xl p-6 relative hover:border-indigo-500/30 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl bg-black/20 ${t.type === 'link' ? 'text-blue-400' : t.type === 'file' ? 'text-amber-400' : 'text-indigo-400'}`}>
                    {t.type === 'link' ? <LinkIcon size={14}/> : t.type === 'file' ? <FileIcon size={14}/> : <Lightbulb size={14}/>}
                  </div>
                  <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">{t.type === 'thought' ? 'Идея' : t.type}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-rose-500 transition-all"><Trash2 size={14}/></button>
              </div>

              {t.type === 'link' ? (
                <div className="block">
                  <p className="text-sm font-bold text-white mb-2">{t.content}</p>
                  <p className="text-[10px] text-blue-400 truncate opacity-60 underline">{t.metadata?.url}</p>
                </div>
              ) : t.type === 'file' ? (
                <div className="flex items-center gap-3">
                   <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{t.content}</p>
                      <p className="text-[10px] text-white/30 uppercase font-black">{t.metadata?.fileType?.split('/')[1] || 'FILE'}</p>
                   </div>
                   <Download size={14} className="text-white/40"/>
                </div>
              ) : (
                <p className="text-sm text-white/80 leading-relaxed font-serif italic">"{t.content}"</p>
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

      {/* FLOATING ACTION PILL */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full flex justify-center">
         <div className="pointer-events-auto bg-[var(--bg-item)]/95 backdrop-blur-xl border border-[var(--border-color)] rounded-full p-2 shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
             
             {/* Home/Dashboard */}
             <button 
                onClick={() => onNavigate && onNavigate('dashboard')} 
                className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors active:scale-95"
             >
                <LayoutDashboard size={20} />
             </button>

             <div className="w-px h-6 bg-[var(--border-color)] mx-1"></div>

             {/* Link */}
             <button 
                onClick={() => { setAddType('link'); setIsAdding(true); }}
                className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all bg-[var(--bg-main)] border border-[var(--border-color)]"
             >
                <LinkIcon size={20} />
             </button>
             
             {/* Add Note (Primary) */}
             <button 
                onClick={() => { setAddType('thought'); setIsAdding(true); }}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 bg-[var(--accent)] text-white shadow-[0_0_20px_var(--accent-glow)] hover:scale-105"
             >
                <Plus size={24} />
             </button>

         </div>
      </div>

      {/* --- ADD MODAL --- */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-[var(--bg-item)] w-full max-w-md p-8 rounded-[3rem] border border-white/10 shadow-3xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black uppercase tracking-tighter">Новая Идея</h3>
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
                <div onClick={() => fileInputRef.current?.click()} className="w-full py-12 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all">
                  <Paperclip size={32} className="text-white/20 mb-4" />
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Кликни для загрузки</p>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                </div>
              ) : (
                <>
                  {addType === 'link' && (
                    <input autoFocus value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="URL ссылки..." className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-indigo-500/50 outline-none"/>
                  )}
                  <textarea autoFocus={addType === 'thought'} value={newContent} onChange={e => setNewContent(e.target.value)} placeholder={addType === 'link' ? "Заголовок..." : "Суть идеи..."} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white min-h-[120px] focus:border-indigo-500/50 outline-none resize-none"/>
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Теги..." className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-indigo-500/50 outline-none"/>
                  <button onClick={handleManualAdd} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Сохранить</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- IDEA DIARY MODAL (DETAIL VIEW) --- */}
      {viewingThought && (
          <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-10">
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl"><BookOpen size={20}/></div>
                      <h2 className="text-lg font-black text-white">Дневник Идеи</h2>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={saveDiaryUpdates} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-500 transition-colors">
                          <Save size={14} /> Сохранить
                      </button>
                      <button onClick={() => setViewingThought(null)} className="p-3 bg-white/5 text-white/50 hover:text-white rounded-xl"><X size={18}/></button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
                  <input 
                      value={viewingThought.content} 
                      onChange={(e) => setViewingThought({...viewingThought, content: e.target.value})}
                      className="w-full bg-transparent text-3xl font-black text-white outline-none mb-6 border-b border-white/10 pb-4"
                      placeholder="Заголовок идеи..."
                  />

                  {viewingThought.type === 'link' && (
                      <a href={viewingThought.metadata?.url} target="_blank" className="flex items-center gap-2 text-blue-400 mb-6 bg-blue-500/10 p-3 rounded-xl">
                          <LinkIcon size={16} /> {viewingThought.metadata?.url}
                      </a>
                  )}

                  <div className="mb-8">
                      <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block">Записи / Контекст</label>
                      <textarea 
                          value={viewingThought.notes || ''}
                          onChange={(e) => setViewingThought({...viewingThought, notes: e.target.value})}
                          className="w-full h-[40vh] bg-transparent text-lg text-white/80 outline-none resize-none leading-relaxed font-serif"
                          placeholder="Развивайте свою мысль здесь..."
                      />
                  </div>

                  <div>
                      <div className="flex justify-between items-center mb-4 border-t border-white/10 pt-6">
                          <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Материалы</label>
                          <button onClick={() => diaryFileInputRef.current?.click()} className="text-[10px] font-bold uppercase text-indigo-400 hover:text-white transition-colors">+ Добавить файл</button>
                          <input type="file" ref={diaryFileInputRef} className="hidden" onChange={handleDiaryAttachment} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          {viewingThought.attachments?.map((att, idx) => (
                              <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                  {att.type === 'image' ? <ImageIcon size={20} className="text-purple-400"/> : <FileText size={20} className="text-white/50"/>}
                                  <span className="text-xs font-bold text-white truncate flex-1">{att.name}</span>
                                  <button onClick={() => setViewingThought({...viewingThought, attachments: viewingThought.attachments?.filter((_, i) => i !== idx)})} className="text-white/20 hover:text-rose-500"><X size={14}/></button>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ThoughtsView;

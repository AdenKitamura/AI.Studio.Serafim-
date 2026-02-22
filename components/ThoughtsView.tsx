
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Thought, Attachment } from '../types';
import { 
  Brain, Lightbulb, Plus, Trash2, Quote as QuoteIcon, Library, Download, X, User, 
  Link as LinkIcon, File as FileIcon, Globe, Paperclip, Network, BookOpen, Save,
  Image as ImageIcon, FileText, LayoutDashboard, Menu, Mic, Hash, Tag, Folder
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import NavigationPill from './NavigationPill';

interface ThoughtsViewProps {
  thoughts: Thought[];
  onAdd: (content: string, type: 'thought' | 'idea' | 'quote' | 'link' | 'file', tags: string[], metadata?: any) => void;
  onUpdate?: (id: string, updates: Partial<Thought>) => void; 
  onDelete: (id: string) => void;
  onNavigate?: (view: any) => void; 
}

const ThoughtsView: React.FC<ThoughtsViewProps> = ({ thoughts, onAdd, onUpdate, onDelete, onNavigate }) => {
  const [activeCategory, setActiveCategory] = useState<string>('Все');
  const [isAdding, setIsAdding] = useState(false);
  const [addType, setAddType] = useState<'thought' | 'link' | 'file'>('thought');
  const [viewingThought, setViewingThought] = useState<Thought | null>(null);
  
  const [newContent, setNewContent] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [newCategory, setNewCategory] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const diaryFileInputRef = useRef<HTMLInputElement>(null);

  // Derive categories from thoughts + defaults
  const categories = useMemo(() => {
    const cats = new Set(['Все', 'Входящие']);
    thoughts.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats);
  }, [thoughts]);

  // Auto-save effect
  useEffect(() => {
    if (!viewingThought || !onUpdate) return;

    const timeoutId = setTimeout(() => {
      onUpdate(viewingThought.id, {
        content: viewingThought.content,
        notes: viewingThought.notes,
        tags: viewingThought.tags,
        category: viewingThought.category,
        attachments: viewingThought.attachments
      });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [viewingThought, onUpdate]);

  const handleManualAdd = () => {
    if (!newContent.trim() && !newUrl.trim()) return;
    const tags = tagInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
    
    // Extract hashtags from content
    const contentTags = (newContent.match(/#[\wа-яА-Я]+/g) || []).map(t => t.substring(1).toLowerCase());
    const allTags = [...new Set([...tags, ...contentTags])];

    const metadata = addType === 'link' ? { url: newUrl } : undefined;
    const category = activeCategory === 'Все' ? 'Входящие' : activeCategory;

    // We need to pass category to onAdd, but onAdd signature might not support it directly in the interface yet.
    // Assuming onAdd creates the thought, we might need to update it immediately or modify onAdd signature.
    // For now, let's assume onAdd handles basic creation and we might need to update it if we can't pass category.
    // Actually, let's just pass it in metadata for now if onAdd doesn't support it, or update the thought after creation.
    // Ideally, onAdd should accept a partial thought object.
    // Let's use the metadata argument to pass category if possible, or just rely on default 'Inbox' and let user move it.
    // Wait, I can't easily change onAdd signature in App.tsx from here. 
    // I'll just add it, and if onAdd returns the ID (it usually doesn't in this pattern), I'd update it.
    // Let's assume for now new thoughts go to 'Inbox' or we try to pass it.
    
    // Workaround: Pass category in metadata and handle it in App.tsx if possible, 
    // OR just let it be 'Inbox' (undefined) and user moves it.
    // Let's try to pass it in metadata for now.
    onAdd(newContent || newUrl, addType === 'link' ? 'link' : 'thought', allTags, { ...metadata, category });
    
    resetForm();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { 
      onAdd(file.name, 'file', [file.type.split('/')[0]], { 
        fileName: file.name, 
        fileType: file.type, 
        fileData: reader.result,
        category: activeCategory === 'Все' ? 'Входящие' : activeCategory
      }); 
      setIsAdding(false); 
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => { setNewContent(''); setNewUrl(''); setTagInput(''); setIsAdding(false); };

  const handleDiaryAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file || !viewingThought) return;
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

  const openMenu = () => { const menuBtn = document.getElementById('sidebar-trigger'); if(menuBtn) menuBtn.click(); };

  const filteredThoughts = thoughts.filter(t => {
    const cat = t.category || 'Входящие';
    return activeCategory === 'Все' || cat === activeCategory;
  });

  // Helper to render text with links
  const renderContentWithLinks = (text: string) => {
    if (!text) return null;
    
    // Split by URLs or Hashtags
    const parts = text.split(/((?:https?:\/\/[^\s]+)|(?:#[\wа-яА-Я]+))/g);
    
    return parts.map((part, i) => {
      if (part.match(/^https?:\/\//)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-400 hover:underline">{part}</a>;
      }
      if (part.match(/^#/)) {
        return <span key={i} className="text-indigo-400 font-bold cursor-pointer hover:text-indigo-300">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (!viewingThought) return;
    const newText = e.target.value;
    
    // Extract tags
    const contentTags = (newText.match(/#[\wа-яА-Я]+/g) || []).map(t => t.substring(1).toLowerCase());
    const existingTags = viewingThought.tags || [];
    // Merge tags, keeping existing ones that might not be in text? 
    // Or just sync? Let's sync but keep unique.
    const uniqueTags = [...new Set([...existingTags, ...contentTags])];

    setViewingThought({
      ...viewingThought,
      content: newText,
      tags: uniqueTags
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Header with Categories */}
      <div className="p-6 border-b border-white/5 bg-[var(--bg-main)]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Архив Идей</h2>
          <button onClick={() => { setAddType('thought'); setIsAdding(true); }} className="p-2 bg-indigo-600 rounded-full text-white shadow-lg hover:bg-indigo-500 transition-all">
            <Plus size={20} />
          </button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)} 
              className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'}`}
            >
              {cat === 'Все' ? <Globe size={12}/> : cat === 'Входящие' ? <Library size={12}/> : <Folder size={12}/>} 
              {cat}
            </button>
          ))}
          <button onClick={() => {
             const name = prompt('Название новой категории:');
             if (name) setActiveCategory(name);
          }} className="px-3 py-2 rounded-xl bg-white/5 text-white/20 hover:bg-white/10 border border-white/5">
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Main Content - Masonry or List */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-32">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {filteredThoughts.map(t => (
            <div key={t.id} onClick={() => setViewingThought(t)} className="break-inside-avoid group bg-white/5 border border-white/5 rounded-3xl p-6 relative hover:border-indigo-500/30 transition-all cursor-pointer hover:bg-white/[0.07]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl bg-black/20 ${t.type === 'link' ? 'text-blue-400' : t.type === 'file' ? 'text-amber-400' : 'text-indigo-400'}`}>
                    {t.type === 'link' ? <LinkIcon size={14}/> : t.type === 'file' ? <FileIcon size={14}/> : <Lightbulb size={14}/>}
                  </div>
                  <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">{t.category || 'Входящие'}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-rose-500 transition-all">
                  <Trash2 size={14}/>
                </button>
              </div>
              
              {t.type === 'link' ? (
                <div className="block">
                  <p className="text-sm font-bold text-white mb-2">{renderContentWithLinks(t.content)}</p>
                  <a href={t.metadata?.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-blue-400 truncate opacity-60 underline block hover:opacity-100">
                    {t.metadata?.url}
                  </a>
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
                <p className="text-sm text-white/80 leading-relaxed font-serif whitespace-pre-wrap">
                  {renderContentWithLinks(t.content)}
                </p>
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

      <NavigationPill 
        currentView="thoughts"
        onNavigate={onNavigate!}
        onOpenMenu={openMenu}
        toolL={{ icon: <LinkIcon size={22} />, onClick: () => { setAddType('link'); setIsAdding(true); } }}
        toolR={{ icon: <Plus size={22} />, onClick: () => { setAddType('thought'); setIsAdding(true); } }}
      />

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-[var(--bg-item)] w-full max-w-md p-8 rounded-[3rem] border border-white/10 shadow-3xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black uppercase tracking-tighter">Новая Идея</h3>
              <button onClick={resetForm}><X size={24}/></button>
            </div>
            
            <div className="flex bg-white/5 p-1 rounded-2xl mb-6">
              {[{ id: 'thought', label: 'Мысль', icon: <Brain size={14}/> }, { id: 'link', label: 'Ссылка', icon: <LinkIcon size={14}/> }, { id: 'file', label: 'Файл', icon: <Paperclip size={14}/> }].map(opt => (
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
                  <textarea 
                    autoFocus={addType === 'thought'} 
                    value={newContent} 
                    onChange={e => setNewContent(e.target.value)} 
                    placeholder={addType === 'link' ? "Заголовок..." : "Суть идеи... Используйте #теги"} 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white min-h-[120px] focus:border-indigo-500/50 outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Теги (через запятую)..." className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-indigo-500/50 outline-none"/>
                    <select 
                      value={activeCategory} 
                      onChange={(e) => setActiveCategory(e.target.value)}
                      className="bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-indigo-500/50 outline-none"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button onClick={handleManualAdd} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                    Добавить
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit/View Modal - Auto-save enabled */}
      {viewingThought && (
          <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-10">
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                    <BookOpen size={20}/>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Дневник Идеи</h2>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
                         {viewingThought.category || 'Входящие'}
                       </span>
                       <span className="text-[10px] text-emerald-500 flex items-center gap-1 animate-pulse">
                         <Save size={10} /> Авто-сохранение
                       </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setViewingThought(null)} className="p-3 bg-white/5 text-white/50 hover:text-white rounded-xl">
                  <X size={18}/>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
                <div className="mb-6">
                   <select 
                      value={viewingThought.category || 'Входящие'} 
                      onChange={(e) => setViewingThought({...viewingThought, category: e.target.value})}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs text-white/60 mb-4 outline-none focus:border-indigo-500/50"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="Входящие">Входящие</option>
                    </select>
                    
                   <textarea 
                      value={viewingThought.content} 
                      onChange={handleContentChange} 
                      className="w-full bg-transparent text-3xl font-black text-white outline-none border-b border-white/10 pb-4 resize-none overflow-hidden" 
                      placeholder="Заголовок идеи..." 
                      rows={1}
                      style={{ height: 'auto', minHeight: '60px' }}
                      onInput={(e) => {
                        e.currentTarget.style.height = 'auto';
                        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                      }}
                   />
                </div>

                {viewingThought.type === 'link' && (
                  <a href={viewingThought.metadata?.url} target="_blank" className="flex items-center gap-2 text-blue-400 mb-6 bg-blue-500/10 p-3 rounded-xl hover:bg-blue-500/20 transition-colors">
                    <LinkIcon size={16} /> {viewingThought.metadata?.url}
                  </a>
                )}

                <div className="mb-8">
                  <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block">Записи / Контекст</label>
                  <textarea 
                    value={viewingThought.notes || ''} 
                    onChange={(e) => setViewingThought({...viewingThought, notes: e.target.value})} 
                    className="w-full h-[40vh] bg-transparent text-lg text-white/80 outline-none resize-none leading-relaxed font-serif" 
                    placeholder="Развивайте свою мысль здесь... Используйте #теги и ссылки" 
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4 border-t border-white/10 pt-6">
                    <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Материалы</label>
                    <button onClick={() => diaryFileInputRef.current?.click()} className="text-[10px] font-bold uppercase text-indigo-400 hover:text-white transition-colors">
                      + Добавить файл
                    </button>
                    <input type="file" ref={diaryFileInputRef} className="hidden" onChange={handleDiaryAttachment} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {viewingThought.attachments?.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        {att.type === 'image' ? <ImageIcon size={20} className="text-purple-400"/> : <FileText size={20} className="text-white/50"/>}
                        <span className="text-xs font-bold text-white truncate flex-1">{att.name}</span>
                        <button onClick={() => setViewingThought({...viewingThought, attachments: viewingThought.attachments?.filter((_, i) => i !== idx)})} className="text-white/20 hover:text-rose-500">
                          <X size={14}/>
                        </button>
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

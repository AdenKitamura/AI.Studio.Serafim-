
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Thought, Attachment } from '../types';
import { 
  Brain, Lightbulb, Plus, Trash2, Quote as QuoteIcon, Library, Download, X, User, 
  Link as LinkIcon, File as FileIcon, Globe, Paperclip, Network, BookOpen, Save,
  Image as ImageIcon, FileText, LayoutDashboard, Menu, Mic, Hash, Tag, Folder, ChevronDown
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
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addType, setAddType] = useState<'thought' | 'link' | 'file'>('thought');
  const [viewingThought, setViewingThought] = useState<Thought | null>(null);
  
  const [newContent, setNewContent] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  
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
        attachments: viewingThought.attachments,
        sections: viewingThought.sections
      });
    }, 500); // Reduced to 500ms

    return () => clearTimeout(timeoutId);
  }, [viewingThought, onUpdate]);

  // Reset active section when opening a thought
  useEffect(() => {
    if (viewingThought?.id) {
      const firstSectionId = viewingThought.sections?.[0]?.id || 'default';
      setActiveSectionId(firstSectionId);
    }
  }, [viewingThought?.id]);

  const handleClose = () => {
      if (viewingThought && onUpdate) {
          // Force immediate save before closing
          onUpdate(viewingThought.id, {
            content: viewingThought.content,
            notes: viewingThought.notes,
            tags: viewingThought.tags,
            category: viewingThought.category,
            attachments: viewingThought.attachments,
            sections: viewingThought.sections
          });
      }
      setViewingThought(null);
  };

  const handleManualAdd = () => {
    if (!newContent.trim() && !newUrl.trim()) return;
    const tags = tagInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
    
    // Extract hashtags from content
    const contentTags = (newContent.match(/#[\wа-яА-Я]+/g) || []).map(t => t.substring(1).toLowerCase());
    const allTags = [...new Set([...tags, ...contentTags])];

    const metadata = addType === 'link' ? { url: newUrl } : undefined;
    const category = activeCategory === 'Все' ? 'Входящие' : activeCategory;

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
    if (t.type === 'quote' || t.category === 'Wisdom') return false; // Exclude quotes (Wisdom Archive)
    const cat = t.category || 'Мысли';
    const matchesCategory = activeCategory === 'Все' || cat === activeCategory;
    const matchesTag = activeTag ? t.tags?.includes(activeTag) : true;
    return matchesCategory && matchesTag;
  });

  // Helper to render text with links
  const renderContentWithLinks = (text: string) => {
    if (!text) return null;
    
    // Split by URLs or Hashtags
    const parts = text.split(/((?:https?:\/\/[^\s]+)|(?:#[\wа-яА-Я]+))/g);
    
    return parts.map((part, i) => {
      if (part.match(/^https?:\/\//)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:underline">{part}</a>;
      }
      if (part.match(/^#/)) {
        const tag = part.substring(1).toLowerCase();
        return (
          <span 
            key={i} 
            onClick={(e) => { e.stopPropagation(); setActiveTag(tag); }}
            className={`font-bold cursor-pointer hover:opacity-80 transition-colors ${activeTag === tag ? 'text-[var(--accent)] underline' : 'text-[var(--accent)]'}`}
          >
            {part}
          </span>
        );
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
    const uniqueTags = [...new Set([...existingTags, ...contentTags])];

    setViewingThought({
      ...viewingThought,
      content: newText,
      tags: uniqueTags
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Header with Categories - Matching JournalView style */}
      <div className="sticky top-0 z-40 bg-[var(--bg-main)]/95 backdrop-blur-xl border-b border-[var(--border-color)] px-6 py-4 flex flex-col gap-4 transition-all duration-200 mt-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase leading-none">Архив Идей</h2>
            <div className="p-1.5 rounded-full bg-[var(--bg-item)] border border-[var(--border-color)] text-[var(--text-muted)]">
              <Lightbulb size={16} />
            </div>
          </div>
          <button onClick={() => { setAddType('thought'); setIsAdding(true); }} className="p-2 bg-[var(--accent)] rounded-full text-white shadow-lg hover:opacity-90 transition-all">
            <Plus size={20} />
          </button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 items-center">
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)} 
              className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeCategory === cat ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md' : 'bg-[var(--bg-item)] text-[var(--text-muted)] border-[var(--border-color)] hover:bg-[var(--bg-item)]/80'}`}
            >
              {cat === 'Все' ? <Globe size={12}/> : cat === 'Входящие' ? <Library size={12}/> : <Folder size={12}/>} 
              {cat}
            </button>
          ))}
          <button onClick={() => {
             const name = prompt('Название новой категории:');
             if (name) setActiveCategory(name);
          }} className="px-3 py-2 rounded-xl bg-[var(--bg-item)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)]">
            <Plus size={12} />
          </button>
        </div>
        
        {/* Active Tag Filter Indicator */}
        {activeTag && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Фильтр по тегу:</span>
            <button 
              onClick={() => setActiveTag(null)}
              className="px-3 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 flex items-center gap-2 text-xs font-bold hover:bg-[var(--accent)]/20 transition-all"
            >
              #{activeTag} <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Main Content - Masonry or List */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-32">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {filteredThoughts.map(t => (
            <div key={t.id} onClick={() => setViewingThought(t)} className="break-inside-avoid group bg-[var(--bg-item)] border border-[var(--border-color)] rounded-3xl p-6 relative hover:border-[var(--accent)]/30 transition-all cursor-pointer hover:bg-[var(--bg-item)]/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] ${t.type === 'link' ? 'text-blue-500' : t.type === 'file' ? 'text-amber-500' : 'text-[var(--accent)]'}`}>
                    {t.type === 'link' ? <LinkIcon size={14}/> : t.type === 'file' ? <FileIcon size={14}/> : <Lightbulb size={14}/>}
                  </div>
                  <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">{t.category || 'Входящие'}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-[var(--text-muted)] hover:text-rose-500 transition-all">
                  <Trash2 size={14}/>
                </button>
              </div>
              
              {t.type === 'link' ? (
                <div className="block">
                  <p className="text-sm font-bold text-[var(--text-main)] mb-2">{renderContentWithLinks(t.content)}</p>
                  <a href={t.metadata?.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-blue-500 truncate opacity-60 underline block hover:opacity-100">
                    {t.metadata?.url}
                  </a>
                </div>
              ) : t.type === 'file' ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-main)] truncate">{t.content}</p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-black">{t.metadata?.fileType?.split('/')[1] || 'FILE'}</p>
                  </div>
                  <Download size={14} className="text-[var(--text-muted)]"/>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-main)]/80 leading-relaxed font-serif whitespace-pre-wrap">
                  {renderContentWithLinks(t.content)}
                </p>
              )}
              
              {t.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-1">
                  {t.tags.map(tag => (
                    <span 
                      key={tag} 
                      onClick={(e) => { e.stopPropagation(); setActiveTag(tag === activeTag ? null : tag); }}
                      className={`text-[9px] font-bold cursor-pointer transition-colors ${activeTag === tag ? 'text-white bg-[var(--accent)] px-2 py-0.5 rounded-md' : 'text-[var(--accent)] hover:underline'}`}
                    >
                      #{tag}
                    </span>
                  ))}
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
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-[var(--bg-main)] w-full max-w-md p-8 rounded-[3rem] border border-[var(--border-color)] shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black uppercase tracking-tighter text-[var(--text-main)]">Новая Идея</h3>
              <button onClick={resetForm} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={24}/></button>
            </div>
            
            <div className="flex bg-[var(--bg-item)] p-1 rounded-2xl mb-6 border border-[var(--border-color)]">
              {[{ id: 'thought', label: 'Мысль', icon: <Brain size={14}/> }, { id: 'link', label: 'Ссылка', icon: <LinkIcon size={14}/> }, { id: 'file', label: 'Файл', icon: <Paperclip size={14}/> }].map(opt => (
                <button key={opt.id} onClick={() => setAddType(opt.id as any)} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${addType === opt.id ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {addType === 'file' ? (
                <div onClick={() => fileInputRef.current?.click()} className="w-full py-12 border-2 border-dashed border-[var(--border-color)] rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--bg-item)] transition-all">
                  <Paperclip size={32} className="text-[var(--text-muted)] mb-4" />
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Кликни для загрузки</p>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                </div>
              ) : (
                <>
                  {addType === 'link' && (
                    <input autoFocus value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="URL ссылки..." className="w-full bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none"/>
                  )}
                  <textarea 
                    autoFocus={addType === 'thought'} 
                    value={newContent} 
                    onChange={e => setNewContent(e.target.value)} 
                    placeholder={addType === 'link' ? "Заголовок..." : "Суть идеи... Используйте #теги"} 
                    className="w-full bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] min-h-[120px] focus:border-[var(--accent)] outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Теги (через запятую)..." className="flex-1 bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none"/>
                    <select 
                      value={activeCategory} 
                      onChange={(e) => setActiveCategory(e.target.value)}
                      className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button onClick={handleManualAdd} className="w-full py-4 bg-[var(--accent)] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 active:scale-95 transition-all">
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
          <div className="fixed inset-0 z-[150] bg-[var(--bg-main)]/95 backdrop-blur-2xl flex flex-col animate-in slide-in-from-bottom-10">
              <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--bg-item)] text-[var(--accent)] rounded-xl border border-[var(--border-color)]">
                    <BookOpen size={20}/>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[var(--text-main)]">Дневник Идеи</h2>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">
                         {viewingThought.category || 'Входящие'}
                       </span>
                       <span className="text-[10px] text-emerald-500 flex items-center gap-1 animate-pulse">
                         <Save size={10} /> Авто-сохранение
                       </span>
                    </div>
                  </div>
                </div>
                <button onClick={handleClose} className="p-3 bg-[var(--bg-item)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl border border-[var(--border-color)]">
                  <X size={18}/>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
                <div className="mb-6">
                   <select 
                      value={viewingThought.category || 'Входящие'} 
                      onChange={(e) => setViewingThought({...viewingThought, category: e.target.value})}
                      className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-lg px-3 py-1 text-xs text-[var(--text-muted)] mb-4 outline-none focus:border-[var(--accent)]"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="Входящие">Входящие</option>
                    </select>
                    
                   <textarea 
                      value={viewingThought.content} 
                      onChange={handleContentChange} 
                      className="w-full bg-transparent text-3xl font-black text-[var(--text-main)] outline-none border-b border-[var(--border-color)] pb-4 resize-none overflow-hidden placeholder-[var(--text-muted)]/30" 
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
                  <a href={viewingThought.metadata?.url} target="_blank" className="flex items-center gap-2 text-blue-500 mb-6 bg-blue-500/10 p-3 rounded-xl hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                    <LinkIcon size={16} /> {viewingThought.metadata?.url}
                  </a>
                )}

                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                    {(viewingThought.sections || [{ id: 'default', title: 'Заметки', content: viewingThought.notes || '' }]).map((section, idx) => (
                      <button
                        key={section.id}
                        onClick={() => {
                           if (!viewingThought.sections) {
                             setViewingThought({
                               ...viewingThought,
                               sections: [{ id: 'default', title: 'Заметки', content: viewingThought.notes || '' }]
                             });
                           }
                           setActiveSectionId(section.id);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                          (activeSectionId === section.id || (!activeSectionId && idx === 0)) 
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md' 
                            : 'bg-[var(--bg-item)] text-[var(--text-muted)] border-[var(--border-color)] hover:bg-[var(--bg-item)]/80'
                        }`}
                      >
                        {section.title}
                      </button>
                    ))}
                    <button 
                      onClick={() => {
                        const newSection = { id: Date.now().toString(), title: 'Новый раздел', content: '' };
                        const currentSections = viewingThought.sections || [{ id: 'default', title: 'Заметки', content: viewingThought.notes || '' }];
                        setViewingThought({
                          ...viewingThought,
                          sections: [...currentSections, newSection]
                        });
                        setActiveSectionId(newSection.id);
                      }}
                      className="px-3 py-2 rounded-xl bg-[var(--bg-item)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {(() => {
                    const sections = viewingThought.sections || [{ id: 'default', title: 'Заметки', content: viewingThought.notes || '' }];
                    const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];
                    
                    return (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <input 
                          value={activeSection.title}
                          onChange={(e) => {
                            const newSections = sections.map(s => s.id === activeSection.id ? { ...s, title: e.target.value } : s);
                            setViewingThought({ ...viewingThought, sections: newSections });
                          }}
                          className="bg-transparent text-xs font-black uppercase text-[var(--text-muted)] tracking-widest mb-2 outline-none w-full hover:text-[var(--text-main)] focus:text-[var(--accent)] transition-colors"
                          placeholder="НАЗВАНИЕ РАЗДЕЛА"
                        />
                        <textarea 
                          value={activeSection.content} 
                          onChange={(e) => {
                            const newSections = sections.map(s => s.id === activeSection.id ? { ...s, content: e.target.value } : s);
                            setViewingThought({ 
                              ...viewingThought, 
                              sections: newSections,
                              notes: activeSection.id === 'default' ? e.target.value : viewingThought.notes 
                            });
                          }} 
                          className="w-full h-[40vh] bg-transparent text-lg text-[var(--text-main)] outline-none resize-none leading-relaxed font-serif placeholder-[var(--text-muted)]/30" 
                          placeholder="Пишите здесь... Используйте #теги" 
                        />
                        <div className="flex justify-end mt-2">
                           <button 
                             onClick={() => {
                               if (confirm('Удалить этот раздел?')) {
                                 const newSections = sections.filter(s => s.id !== activeSection.id);
                                 setViewingThought({ ...viewingThought, sections: newSections });
                                 if (newSections.length > 0) setActiveSectionId(newSections[0].id);
                               }
                             }}
                             className="text-[10px] text-[var(--text-muted)] hover:text-rose-500 uppercase font-bold tracking-widest"
                           >
                             Удалить раздел
                           </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4 border-t border-[var(--border-color)] pt-6">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Материалы</label>
                    <button onClick={() => diaryFileInputRef.current?.click()} className="text-[10px] font-bold uppercase text-[var(--accent)] hover:text-[var(--text-main)] transition-colors">
                      + Добавить файл
                    </button>
                    <input type="file" ref={diaryFileInputRef} className="hidden" onChange={handleDiaryAttachment} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {viewingThought.attachments?.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-[var(--bg-item)] rounded-xl border border-[var(--border-color)]">
                        {att.type === 'image' ? <ImageIcon size={20} className="text-purple-500"/> : <FileText size={20} className="text-[var(--text-muted)]"/>}
                        <span className="text-xs font-bold text-[var(--text-main)] truncate flex-1">{att.name}</span>
                        <button onClick={() => setViewingThought({...viewingThought, attachments: viewingThought.attachments?.filter((_, i) => i !== idx)})} className="text-[var(--text-muted)] hover:text-rose-500">
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

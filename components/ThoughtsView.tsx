
import React, { useState } from 'react';
import { Thought } from '../types';
import { Brain, Lightbulb, Plus, Trash2, Quote as QuoteIcon, Library, Download, X, User } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { getQuotesByCategory, CATEGORIES, QuoteCategory, Quote } from '../services/quotesService';

interface ThoughtsViewProps {
  thoughts: Thought[];
  onAdd: (content: string, type: 'thought' | 'idea' | 'quote', tags: string[], author?: string) => void;
  onDelete: (id: string) => void;
}

const ThoughtsView: React.FC<ThoughtsViewProps> = ({ thoughts, onAdd, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'library'>('personal');
  const [personalFilter, setPersonalFilter] = useState<'all' | 'thought' | 'idea' | 'quote'>('all');
  const [libraryCategory, setLibraryCategory] = useState<QuoteCategory | 'all'>('all');

  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<'thought'|'idea'|'quote'>('thought');
  const [newAuthor, setNewAuthor] = useState('');
  const [newTag, setNewTag] = useState(''); 

  const handleSaveToMyThoughts = (quote: Quote) => {
      onAdd(quote.text, 'quote', [quote.category], quote.author);
  };

  const handleManualAdd = () => {
      if(!newContent.trim()) return;
      const tags = newTag.trim() ? [newTag.trim()] : [];
      onAdd(newContent, newType, tags, newAuthor.trim() || undefined);
      
      setNewContent('');
      setNewAuthor('');
      setNewTag('');
      setIsAdding(false);
  };

  // Only show library/archived items or quotes
  const filteredThoughts = thoughts.filter(t => 
    (t.isArchived || t.type === 'quote') && (personalFilter === 'all' || t.type === personalFilter)
  );
  const libraryQuotes = getQuotesByCategory(libraryCategory);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 relative bg-[var(--bg-main)]">
       <div className="p-4 flex gap-4 border-b border-[var(--bg-card)] sticky top-0 bg-[var(--bg-main)] z-20">
           <button 
                onClick={() => setActiveTab('personal')}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${activeTab === 'personal' ? 'bg-[var(--bg-item)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}
           >
               <Brain size={18} />
               Архив
           </button>
           <button 
                onClick={() => setActiveTab('library')}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${activeTab === 'library' ? 'bg-[var(--bg-item)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}
           >
               <Library size={18} />
               Мудрость
           </button>
       </div>

       <div className="flex-1 overflow-y-auto relative pb-24">
          {activeTab === 'personal' && (
              <>
                <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar sticky top-0 bg-[var(--bg-main)]/95 backdrop-blur z-10">
                    <button onClick={() => setPersonalFilter('all')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${personalFilter === 'all' ? 'bg-[var(--text-main)] text-[var(--bg-main)]' : 'bg-[var(--bg-item)] text-[var(--text-muted)] border border-[var(--bg-card)]'}`}>Все</button>
                    <button onClick={() => setPersonalFilter('thought')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${personalFilter === 'thought' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-item)] text-[var(--text-muted)] border border-[var(--bg-card)]'}`}>Мысли</button>
                    <button onClick={() => setPersonalFilter('quote')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${personalFilter === 'quote' ? 'bg-pink-500 text-white' : 'bg-[var(--bg-item)] text-[var(--text-muted)] border border-[var(--bg-card)]'}`}>Цитаты</button>
                </div>

                <div className="p-4 pt-0 columns-1 md:columns-2 gap-3 space-y-3">
                    {filteredThoughts.length === 0 && (
                        <div className="text-center py-20 text-[var(--text-muted)]">
                            <Brain size={48} className="mx-auto mb-4 opacity-10" />
                            <p className="text-sm font-medium">Здесь хранятся ваши идеи вне доски планов.</p>
                        </div>
                    )}
                    {filteredThoughts.map(thought => (
                        <div key={thought.id} className="break-inside-avoid mb-3 group bg-[var(--bg-item)] p-5 rounded-2xl border border-[var(--border-color)] relative hover:border-[var(--accent)]/50 transition-all">
                            <div className="flex items-center gap-2 mb-3">
                                {thought.type === 'quote' ? <QuoteIcon size={14} className="text-pink-500"/> : <Brain size={14} className="text-[var(--accent)]"/>}
                                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{thought.type}</span>
                            </div>
                            <p className={`text-[var(--text-main)] leading-relaxed font-serif ${thought.type === 'quote' ? 'italic text-lg' : 'text-base'}`}>
                                {thought.content}
                            </p>
                            {thought.author && <div className="mt-3 text-right"><span className="text-xs font-bold text-[var(--text-muted)] uppercase">— {thought.author}</span></div>}
                            <div className="mt-3 pt-3 border-t border-[var(--bg-card)] flex justify-between items-center opacity-40">
                                <span className="text-[9px] text-[var(--text-muted)]">{format(new Date(thought.createdAt), 'd MMM yyyy', { locale: ru })}</span>
                                <button onClick={() => onDelete(thought.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                            </div>
                        </div>
                    ))}
                </div>
              </>
          )}

          {activeTab === 'library' && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {libraryQuotes.map(quote => (
                      <div key={quote.id} className="bg-[var(--bg-item)] p-6 rounded-2xl border border-[var(--border-color)] relative group hover:border-pink-500/50 transition-all">
                          <p className="relative z-10 text-lg font-serif italic text-[var(--text-main)] mb-4 leading-relaxed">"{quote.text}"</p>
                          <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">{quote.author}</span>
                              <button onClick={() => handleSaveToMyThoughts(quote)} className="p-2 bg-[var(--bg-card)] text-[var(--text-muted)] rounded-lg hover:text-pink-500 transition-colors"><Download size={14} /></button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
       </div>

       {activeTab === 'personal' && !isAdding && (
           <div className="fixed bottom-28 right-6">
                <button onClick={() => setIsAdding(true)} className="bg-[var(--accent)] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform"><Plus size={24} /></button>
           </div>
       )}

       {isAdding && (
           <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-[var(--bg-main)] w-full max-w-md p-6 rounded-3xl border border-[var(--border-color)] shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-[var(--text-main)]">Добавить в архив</h3>
                        <button onClick={() => setIsAdding(false)}><X size={20}/></button>
                    </div>
                    <textarea 
                        autoFocus
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="О чем вы думаете?"
                        className="w-full bg-[var(--bg-item)] rounded-xl p-4 text-[var(--text-main)] min-h-[150px] mb-4 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                    />
                    <button onClick={handleManualAdd} className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-bold">Сохранить</button>
                </div>
           </div>
       )}
    </div>
  );
};

export default ThoughtsView;

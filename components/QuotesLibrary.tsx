
import React, { useState, useMemo } from 'react';
import { Thought } from '../types';
import { Quote as QuoteIcon, X, Download, Search, Sparkles, BookOpen, Calendar, RefreshCw } from 'lucide-react';
import { getQuotesByCategory, CATEGORIES, QuoteCategory, Quote, getAllQuotes } from '../services/quotesService';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';

interface QuotesLibraryProps {
  myQuotes: Thought[];
  onAddQuote: (text: string, author: string, category: string) => void;
  onDeleteQuote: (id: string) => void;
  onClose: () => void;
}

const QuotesLibrary: React.FC<QuotesLibraryProps> = ({ myQuotes, onAddQuote, onDeleteQuote, onClose }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'catalog' | 'collection'>('daily');
  const [selectedCategory, setSelectedCategory] = useState<QuoteCategory | 'all'>('all');
  const [seedOffset, setSeedOffset] = useState(0); // Allows refreshing daily quotes

  const libraryQuotes = getQuotesByCategory(selectedCategory);
  const personalQuotes = myQuotes.filter(t => t.type === 'quote');
  
  const handleSave = (q: Quote) => { onAddQuote(q.text, q.author, q.category); };

  const dailyQuotes = useMemo(() => {
      const all = getAllQuotes();
      const today = new Date().toDateString();
      let seed = seedOffset; 
      // Base seed on date char codes
      for (let i = 0; i < today.length; i++) seed += today.charCodeAt(i);
      
      const shuffled = [...all].sort((a, b) => { 
          const x = Math.sin(seed++) * 10000; 
          const y = Math.sin(seed++) * 10000; 
          return (x - Math.floor(x)) - (y - Math.floor(y)); 
      });
      return shuffled.slice(0, 5);
  }, [seedOffset]);

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-main)]/80 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-2"><div className="p-2 bg-pink-500/10 rounded-lg text-pink-500"><QuoteIcon size={20} /></div><div><h2 className="text-lg font-bold text-[var(--text-main)]">Хранилище Мудрости</h2><p className="text-xs text-[var(--text-muted)]">Вдохновение на сегодня</p></div></div>
            <button onClick={onClose} className="p-2 bg-[var(--bg-item)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] glass-btn"><X size={24} /></button>
        </div>
        <div className="p-4 pb-0"><div className="flex bg-[var(--bg-item)] p-1 rounded-xl border border-[var(--border-color)] gap-1 shadow-inner"><button onClick={() => setActiveTab('daily')} className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'daily' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Calendar size={16} />Сегодня</button><button onClick={() => setActiveTab('catalog')} className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'catalog' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Search size={16} />Каталог</button><button onClick={() => setActiveTab('collection')} className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'collection' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><BookOpen size={16} />Мои</button></div></div>
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            {activeTab === 'daily' && (
                <div className="space-y-6 pb-20 animate-in fade-in">
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">{format(new Date(), 'eeee, d MMMM', { locale: ru })}</p>
                        <button 
                            onClick={() => setSeedOffset(s => s + 100)}
                            className="p-1.5 bg-[var(--bg-item)] rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] border border-[var(--border-color)] transition-colors"
                            title="Новые мысли"
                        >
                            <RefreshCw size={12} />
                        </button>
                    </div>
                    {dailyQuotes.map((quote) => { const isSaved = personalQuotes.some(pq => pq.content === quote.text); return (<div key={quote.id} className="glass-panel p-8 rounded-3xl relative border border-pink-500/20 shadow-[0_10px_40px_rgba(236,72,153,0.1)]"><QuoteIcon className="absolute top-6 left-6 text-pink-500/20" size={40} /><p className="text-[var(--text-main)] font-serif italic text-xl leading-relaxed mb-6 relative z-10 text-center">"{quote.text}"</p><div className="flex flex-col items-center"><div className="h-px w-10 bg-pink-500/50 mb-3"></div><span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{quote.author}</span></div><div className="absolute bottom-4 right-4">{isSaved ? (<div className="p-2 bg-green-500/10 rounded-full text-green-500"><Sparkles size={16} /></div>) : (<button onClick={() => handleSave(quote)} className="p-2 bg-[var(--bg-item)] hover:bg-pink-500 hover:text-white rounded-full text-[var(--text-muted)] transition-all shadow-lg border border-[var(--border-color)]"><Download size={16} /></button>)}</div></div>); })}
                </div>
            )}
            {activeTab === 'catalog' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">{CATEGORIES.map(cat => (<button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-full text-xs font-bold uppercase whitespace-nowrap border transition-all ${selectedCategory === cat.id ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)]' : 'glass-panel text-[var(--text-muted)] border-[var(--border-color)]'}`}>{cat.label}</button>))}</div>
                    <div className="grid grid-cols-1 gap-4 pb-20">{libraryQuotes.map((quote) => { const isSaved = personalQuotes.some(pq => pq.content === quote.text); return (<div key={quote.id} className="glass-panel p-6 rounded-2xl relative hover:border-[var(--accent)]/30 transition-all"><p className="text-[var(--text-main)] font-serif italic text-lg leading-relaxed mb-4 opacity-90">"{quote.text}"</p><div className="flex justify-between items-end border-t border-[var(--border-color)] pt-4 mt-2"><div className="flex flex-col"><span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{quote.author}</span><span className="text-[10px] text-pink-500 opacity-60 mt-1">#{quote.category}</span></div>{isSaved ? (<span className="text-xs font-bold text-green-500 flex items-center gap-1"><Sparkles size={12}/> Сохранено</span>) : (<button onClick={() => handleSave(quote)} className="px-3 py-1.5 bg-[var(--bg-item)] hover:bg-pink-600 hover:text-white rounded-lg text-[var(--text-muted)] text-xs font-bold transition-colors flex items-center gap-2 border border-[var(--border-color)] glass-btn"><Download size={14} />Забрать</button>)}</div></div>); })}</div>
                </div>
            )}
            {activeTab === 'collection' && (
                <div className="space-y-4 pb-20 animate-in fade-in">{personalQuotes.length === 0 ? (<div className="text-center py-20 text-[var(--text-muted)]"><QuoteIcon size={48} className="mx-auto mb-4 opacity-20" /><p>Ваша коллекция пуста.</p><p className="text-sm">Найдите вдохновение в каталоге.</p></div>) : (personalQuotes.map(q => (<div key={q.id} className="glass-panel p-5 rounded-xl border-l-4 border-l-pink-500 relative"><p className="text-[var(--text-main)] font-serif italic text-lg mb-2">"{q.content}"</p><div className="flex justify-between items-center mt-3"><span className="text-xs font-bold text-[var(--text-muted)] uppercase">— {q.author || 'Неизвестный'}</span><button onClick={() => onDeleteQuote(q.id)} className="text-[var(--text-muted)] hover:text-red-400 p-1"><X size={16} /></button></div></div>)))}</div>
            )}
        </div>
    </div>
  );
};

export default QuotesLibrary;

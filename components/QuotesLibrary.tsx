import React, { useState } from 'react';
import { Thought } from '../types';
import { Quote as QuoteIcon, X, Download, Search, Sparkles, BookOpen } from 'lucide-react';
import { getQuotesByCategory, CATEGORIES, QuoteCategory, Quote } from '../services/quotesService';

interface QuotesLibraryProps {
  myQuotes: Thought[];
  onAddQuote: (text: string, author: string, category: string) => void;
  onDeleteQuote: (id: string) => void;
  onClose: () => void;
}

const QuotesLibrary: React.FC<QuotesLibraryProps> = ({ myQuotes, onAddQuote, onDeleteQuote, onClose }) => {
  const [activeTab, setActiveTab] = useState<'collection' | 'catalog'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<QuoteCategory | 'all'>('all');

  const libraryQuotes = getQuotesByCategory(selectedCategory);
  
  // Filter only quotes from thoughts array
  const personalQuotes = myQuotes.filter(t => t.type === 'quote');

  const handleSave = (q: Quote) => {
      onAddQuote(q.text, q.author, q.category);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[var(--bg-main)] flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--bg-card)] flex justify-between items-center bg-[var(--bg-main)]/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500">
                    <QuoteIcon size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-[var(--text-main)]">Хранилище Мудрости</h2>
                    <p className="text-xs text-[var(--text-muted)]">Вдохновение и ментальные модели</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 bg-[var(--bg-item)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X size={24} />
            </button>
        </div>

        {/* Tabs */}
        <div className="p-4 pb-0">
            <div className="flex bg-[var(--bg-item)] p-1 rounded-xl">
                <button 
                    onClick={() => setActiveTab('catalog')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'catalog' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    <Search size={16} />
                    Каталог
                </button>
                <button 
                    onClick={() => setActiveTab('collection')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'collection' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    <BookOpen size={16} />
                    Моя коллекция
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
            
            {/* --- CATALOG VIEW --- */}
            {activeTab === 'catalog' && (
                <div className="space-y-6">
                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                         {CATEGORIES.map(cat => (
                             <button
                               key={cat.id}
                               onClick={() => setSelectedCategory(cat.id)}
                               className={`px-4 py-2 rounded-full text-xs font-bold uppercase whitespace-nowrap border transition-all ${selectedCategory === cat.id ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)]' : 'bg-transparent text-[var(--text-muted)] border-[var(--bg-card)]'}`}
                             >
                                 {cat.label}
                             </button>
                         ))}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {libraryQuotes.map((quote) => {
                            const isSaved = personalQuotes.some(pq => pq.content === quote.text);
                            return (
                                <div key={quote.id} className="group bg-[var(--bg-item)] p-6 rounded-2xl border border-[var(--bg-card)] relative hover:border-pink-500/50 transition-all">
                                    <p className="text-[var(--text-main)] font-serif italic text-lg leading-relaxed mb-4 opacity-90">
                                        "{quote.text}"
                                    </p>
                                    <div className="flex justify-between items-end border-t border-[var(--bg-card)] pt-4 mt-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{quote.author}</span>
                                            <span className="text-[10px] text-pink-500 opacity-60 mt-1">#{quote.category}</span>
                                        </div>
                                        
                                        {isSaved ? (
                                            <span className="text-xs font-bold text-green-500 flex items-center gap-1">
                                                <Sparkles size={12}/> Сохранено
                                            </span>
                                        ) : (
                                            <button 
                                                onClick={() => handleSave(quote)}
                                                className="px-3 py-1.5 bg-[var(--bg-card)] hover:bg-pink-600 hover:text-white rounded-lg text-[var(--text-muted)] text-xs font-bold transition-colors flex items-center gap-2"
                                            >
                                                <Download size={14} />
                                                Забрать
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- COLLECTION VIEW --- */}
            {activeTab === 'collection' && (
                <div className="space-y-4">
                    {personalQuotes.length === 0 ? (
                        <div className="text-center py-20 text-[var(--text-muted)]">
                            <QuoteIcon size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Ваша коллекция пуста.</p>
                            <p className="text-sm">Найдите вдохновение в каталоге.</p>
                        </div>
                    ) : (
                        personalQuotes.map(q => (
                            <div key={q.id} className="bg-[var(--bg-item)] p-5 rounded-xl border-l-4 border-pink-500 relative">
                                <p className="text-[var(--text-main)] font-serif italic text-lg mb-2">"{q.content}"</p>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase">— {q.author || 'Неизвестный'}</span>
                                    <button onClick={() => onDeleteQuote(q.id)} className="text-[var(--text-muted)] hover:text-red-400 p-1">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default QuotesLibrary;

import React, { useEffect, useState } from 'react';
import { Thought } from '../types';
import { getAllQuotes } from '../services/quotesService';

interface TickerProps {
  thoughts: Thought[];
  onClick?: () => void;
}

const Ticker: React.FC<TickerProps> = ({ thoughts, onClick }) => {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const quotes = getAllQuotes().map(q => q.text);
    const userThoughts = thoughts.map(t => t.content);
    // Interleave quotes and thoughts, then shuffle slightly
    const mixed = [...quotes, ...userThoughts].sort(() => Math.random() - 0.5);
    setItems(mixed);
  }, [thoughts]);

  if (items.length === 0) return null;

  return (
    <div 
        onClick={onClick}
        className="relative w-full overflow-hidden bg-[var(--bg-main)]/80 backdrop-blur-sm border-b border-[var(--bg-card)] h-10 flex items-center z-20 cursor-pointer active:bg-[var(--bg-item)] transition-colors"
    >
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-[var(--bg-main)] via-transparent to-[var(--bg-main)]"></div>
      <div className="animate-ticker whitespace-nowrap flex gap-12 items-center px-4">
        {items.map((item, i) => (
          <span key={i} className="text-xs font-medium text-[var(--text-muted)] inline-block">
            {item} •
          </span>
        ))}
         {/* Duplicate for smooth loop */}
         {items.map((item, i) => (
          <span key={`dup-${i}`} className="text-xs font-medium text-[var(--text-muted)] inline-block">
            {item} •
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 240s linear infinite; /* Slowed down significantly */
        }
      `}</style>
    </div>
  );
};

export default Ticker;

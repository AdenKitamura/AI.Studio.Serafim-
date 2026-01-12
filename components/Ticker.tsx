import React, { useEffect, useState } from 'react';
import { getAllQuotes } from '../services/quotesService';

interface TickerProps {
  onClick?: () => void;
}

const Ticker: React.FC<TickerProps> = ({ onClick }) => {
  const [items, setItems] = useState<string[]>([]);

  const shuffleQuotes = () => {
    const quotes = getAllQuotes().map(q => q.text);
    const shuffled = [...quotes].sort(() => Math.random() - 0.5);
    setItems(shuffled.slice(0, 15)); // Take 15 random quotes
  };

  useEffect(() => {
    shuffleQuotes();
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="relative w-full h-10 flex items-center z-20 border-b border-[var(--bg-card)] bg-[var(--bg-main)]/80 backdrop-blur-sm">
      <div 
        onClick={onClick}
        className="flex-1 overflow-hidden h-full flex items-center cursor-pointer active:bg-[var(--bg-item)] transition-colors relative"
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
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 240s linear infinite; 
        }
      `}</style>
    </div>
  );
};

export default Ticker;
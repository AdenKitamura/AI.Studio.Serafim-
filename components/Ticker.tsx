import React, { useEffect, useState } from 'react';
import { getAllQuotes } from '../services/quotesService';

interface TickerProps {
  onClick?: () => void;
}

const Ticker: React.FC<TickerProps> = ({ onClick }) => {
  const [items, setItems] = useState<string[]>([]);

  const fetchDailyQuotes = async () => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('daily_quotes');
    
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.date === today && parsed.quotes.length > 0) {
        setItems(parsed.quotes);
        return;
      }
    }

    try {
      // Fetch from external source
      const res = await fetch('https://dummyjson.com/quotes?limit=15');
      const data = await res.json();
      const newQuotes = data.quotes.map((q: any) => `${q.quote} — ${q.author}`);
      
      localStorage.setItem('daily_quotes', JSON.stringify({
        date: today,
        quotes: newQuotes
      }));
      setItems(newQuotes);
    } catch (e) {
      console.error("Failed to fetch quotes", e);
      // Fallback to local service
      const fallback = getAllQuotes().map(q => q.text).sort(() => Math.random() - 0.5).slice(0, 15);
      setItems(fallback);
    }
  };

  useEffect(() => {
    fetchDailyQuotes();
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="relative w-full h-14 flex items-center z-20 border-b border-[var(--border-color)] bg-[var(--bg-main)]/95 backdrop-blur-md shadow-sm">
      <div 
        onClick={onClick}
        className="flex-1 overflow-hidden h-full flex items-center cursor-pointer hover:bg-[var(--bg-item)]/50 transition-colors relative group"
      >
        {/* Gradients for fade effect */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[var(--bg-main)] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[var(--bg-main)] to-transparent z-10 pointer-events-none"></div>
        
        <div className="animate-ticker whitespace-nowrap flex gap-16 items-center px-4">
          {items.map((item, i) => (
            <span key={i} className="text-sm font-bold text-[var(--text-main)] inline-block tracking-wide opacity-90 hover:opacity-100 transition-opacity">
              {item} <span className="text-[var(--accent)] mx-2">•</span>
            </span>
          ))}
           {/* Duplicate for smooth loop */}
           {items.map((item, i) => (
            <span key={`dup-${i}`} className="text-sm font-bold text-[var(--text-main)] inline-block tracking-wide opacity-90 hover:opacity-100 transition-opacity">
              {item} <span className="text-[var(--accent)] mx-2">•</span>
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
          animation: ticker 180s linear infinite; 
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default Ticker;
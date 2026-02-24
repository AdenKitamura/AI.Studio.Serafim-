import React, { useEffect, useState } from 'react';
import { getAllQuotes } from '../services/quotesService';

interface TickerProps {
  onClick?: () => void;
}

const RUSSIAN_QUOTES = [
  "Сделай шаг, и дорога появится сама. — Стив Джобс",
  "Не бойтесь ошибаться, бойтесь не пробовать. — Джейсон Стейтем",
  "Успех — это способность шагать от одной неудачи к другой, не теряя энтузиазма. — Уинстон Черчилль",
  "Лучший способ предсказать будущее — создать его. — Питер Друкер",
  "Ваше время ограничено, не тратьте его, живя чужой жизнью. — Стив Джобс",
  "Сложнее всего начать действовать, все остальное зависит только от упорства. — Амелия Эрхарт",
  "Жизнь — это то, что с тобой происходит, пока ты строишь планы. — Джон Леннон",
  "Через 20 лет вы будете больше жалеть о том, что не сделали, чем о том, что сделали. — Марк Твен",
  "Стремитесь не к успеху, а к ценностям, которые он дает. — Альберт Эйнштейн",
  "Свобода ничего не стоит, если она не включает в себя свободу ошибаться. — Махатма Ганди",
  "Единственный способ делать великие дела — любить то, что вы делаете. — Стив Джобс",
  "Никогда не поздно стать тем, кем тебе хочется быть. — Джордж Элиот",
  "Победа — это еще не все, все — это постоянное желание побеждать. — Винс Ломбарди",
  "Вы никогда не пересечете океан, если не наберетесь смелости потерять из виду берег. — Христофор Колумб",
  "Два самых важных дня в твоей жизни: день, когда ты появился на свет, и день, когда понял зачем. — Марк Твен"
];

const Ticker: React.FC<TickerProps> = ({ onClick }) => {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    // Shuffle and pick
    const shuffled = [...RUSSIAN_QUOTES].sort(() => 0.5 - Math.random());
    setItems(shuffled);
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
import React, { useState } from 'react';
import { Plus, CheckCircle, Brain, Lightbulb, BookOpen } from 'lucide-react';

interface FabProps {
  onAddTask: () => void; // For Tasks/Plans
  onAddThought: (type: 'thought' | 'idea') => void;
  onAddJournal: () => void; // Open calendar/journal modal
}

const Fab: React.FC<FabProps> = ({ onAddTask, onAddThought, onAddJournal }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <>
           <button 
            onClick={() => handleAction(() => onAddThought('idea'))}
            className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-yellow-700 transition-all animate-in slide-in-from-bottom-2 delay-75"
          >
            <span className="text-sm font-medium">Идея</span>
            <Lightbulb size={20} />
          </button>

          <button 
            onClick={() => handleAction(() => onAddThought('thought'))}
            className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-full shadow-lg hover:bg-[var(--accent-hover)] transition-all animate-in slide-in-from-bottom-2 delay-100"
          >
            <span className="text-sm font-medium">Мысль</span>
            <Brain size={20} />
          </button>

           <button 
            onClick={() => handleAction(onAddJournal)}
            className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-pink-700 transition-all animate-in slide-in-from-bottom-2 delay-150"
          >
            <span className="text-sm font-medium">Дневник</span>
            <BookOpen size={20} />
          </button>

          <button 
            onClick={() => handleAction(onAddTask)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-emerald-700 transition-all animate-in slide-in-from-bottom-2 delay-200"
          >
            <span className="text-sm font-medium">План/Задача</span>
            <CheckCircle size={20} />
          </button>
        </>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-xl transition-all duration-300 ${
          isOpen ? 'bg-[var(--bg-item)] rotate-45 text-[var(--text-muted)] border border-[var(--bg-card)]' : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
        }`}
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default Fab;
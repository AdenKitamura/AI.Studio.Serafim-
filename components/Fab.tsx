
import React, { useState } from 'react';
import { Plus, CheckCircle, Brain, Lightbulb, BookOpen, Quote, LayoutDashboard, Folder, Activity, Mic, X, Layers, CheckSquare } from 'lucide-react';
import { ViewState } from '../types';

interface FabProps {
  onNavigate: (view: ViewState) => void;
  currentView: ViewState;
  onAddTask: () => void; 
  onAddThought: (type: 'thought' | 'idea') => void;
  onAddJournal: () => void;
  onOpenQuotes: () => void;
  onVoiceChat: () => void;
}

const Fab: React.FC<FabProps> = ({ onNavigate, currentView, onAddTask, onAddThought, onAddJournal, onOpenQuotes, onVoiceChat }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const handleNav = (view: ViewState) => {
      onNavigate(view);
      setIsOpen(false);
  };

  // Lift FAB when inside Journal view to avoid overlap with bottom toolbar
  const isLifted = currentView === 'journal';

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]" onClick={() => setIsOpen(false)} />}
      
      <div 
        className={`fixed right-6 z-[100] flex flex-col items-end gap-3 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]`}
        style={{ bottom: isLifted ? '100px' : '32px' }}
      >
        {isOpen && (
          <div className="flex flex-col items-end gap-4 pb-2 animate-in slide-in-from-bottom-10 fade-in duration-300">
            
            {/* Quick Actions (Row) */}
            <div className="flex gap-2">
                 <button 
                  onClick={() => handleAction(onVoiceChat)}
                  className="w-14 h-14 rounded-2xl glass-card border-[var(--border-color)] text-[var(--text-main)] flex flex-col items-center justify-center shadow-lg hover:bg-[var(--bg-item)] active:scale-95 transition-all"
                >
                  <Mic size={20} className="text-rose-500 mb-1" />
                  <span className="text-[7px] font-black uppercase">Voice</span>
                </button>
                <button 
                  onClick={() => handleAction(onAddTask)}
                  className="w-14 h-14 rounded-2xl glass-card border-[var(--border-color)] text-[var(--text-main)] flex flex-col items-center justify-center shadow-lg hover:bg-[var(--bg-item)] active:scale-95 transition-all"
                >
                  <CheckCircle size={20} className="text-emerald-500 mb-1" />
                  <span className="text-[7px] font-black uppercase">Task</span>
                </button>
                <button 
                  onClick={() => handleAction(() => onAddThought('thought'))}
                  className="w-14 h-14 rounded-2xl glass-card border-[var(--border-color)] text-[var(--text-main)] flex flex-col items-center justify-center shadow-lg hover:bg-[var(--bg-item)] active:scale-95 transition-all"
                >
                  <Brain size={20} className="text-[var(--accent)] mb-1" />
                  <span className="text-[7px] font-black uppercase">Idea</span>
                </button>
            </div>

            {/* Navigation Grid (Compact 3x2) */}
             <div className="glass-card p-2 rounded-[1.5rem] border border-[var(--border-color)] shadow-2xl">
                 <div className="grid grid-cols-3 gap-2">
                     <button onClick={() => handleNav('dashboard')} className={`w-20 h-16 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${currentView === 'dashboard' ? 'bg-[var(--accent)] text-white border-transparent shadow-md' : 'bg-[var(--bg-main)]/50 border-transparent hover:bg-[var(--bg-main)] text-[var(--text-muted)]'}`}>
                         <LayoutDashboard size={18} />
                         <span className="text-[8px] font-black uppercase tracking-wide">Главная</span>
                     </button>
                     <button onClick={() => handleNav('projects')} className={`w-20 h-16 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${currentView === 'projects' ? 'bg-[var(--accent)] text-white border-transparent shadow-md' : 'bg-[var(--bg-main)]/50 border-transparent hover:bg-[var(--bg-main)] text-[var(--text-muted)]'}`}>
                         <Folder size={18} />
                         <span className="text-[8px] font-black uppercase tracking-wide">Проекты</span>
                     </button>
                     <button onClick={() => handleNav('journal')} className={`w-20 h-16 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${currentView === 'journal' ? 'bg-[var(--accent)] text-white border-transparent shadow-md' : 'bg-[var(--bg-main)]/50 border-transparent hover:bg-[var(--bg-main)] text-[var(--text-muted)]'}`}>
                         <BookOpen size={18} />
                         <span className="text-[8px] font-black uppercase tracking-wide">Дневник</span>
                     </button>
                     <button onClick={() => handleNav('thoughts')} className={`w-20 h-16 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${currentView === 'thoughts' ? 'bg-[var(--accent)] text-white border-transparent shadow-md' : 'bg-[var(--bg-main)]/50 border-transparent hover:bg-[var(--bg-main)] text-[var(--text-muted)]'}`}>
                         <Layers size={18} />
                         <span className="text-[8px] font-black uppercase tracking-wide">Мысли</span>
                     </button>
                     <button onClick={() => handleNav('planner')} className={`w-20 h-16 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${currentView === 'planner' ? 'bg-[var(--accent)] text-white border-transparent shadow-md' : 'bg-[var(--bg-main)]/50 border-transparent hover:bg-[var(--bg-main)] text-[var(--text-muted)]'}`}>
                         <CheckSquare size={18} />
                         <span className="text-[8px] font-black uppercase tracking-wide">План</span>
                     </button>
                     <button onClick={() => handleNav('analytics')} className={`w-20 h-16 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${currentView === 'analytics' ? 'bg-[var(--accent)] text-white border-transparent shadow-md' : 'bg-[var(--bg-main)]/50 border-transparent hover:bg-[var(--bg-main)] text-[var(--text-muted)]'}`}>
                         <Activity size={18} />
                         <span className="text-[8px] font-black uppercase tracking-wide">Инфо</span>
                     </button>
                 </div>
             </div>
          </div>
        )}
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-16 h-16 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 glass-btn flex items-center justify-center border ${
            isOpen ? 'bg-[var(--bg-item)] text-[var(--text-muted)] border-[var(--border-color)] rotate-45' : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-white/20'
          }`}
        >
          <Plus size={32} strokeWidth={3} />
        </button>
      </div>
    </>
  );
};

export default Fab;

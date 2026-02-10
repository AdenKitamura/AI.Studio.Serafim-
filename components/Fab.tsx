import React from 'react';
import { 
  Mic, 
  Folder, 
  BookOpen, 
  Activity, 
  Calendar
} from 'lucide-react';
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

const Fab: React.FC<FabProps> = ({ 
    onNavigate, 
    currentView, 
    onVoiceChat 
}) => {

  const navItemClass = (isActive: boolean) => `
    relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200
    ${isActive 
      ? 'text-white' 
      : 'text-white/40 hover:text-white hover:bg-white/5'}
  `;

  return (
    <div className="md:hidden fixed bottom-6 left-0 w-full z-[90] pointer-events-none flex justify-center px-4">
        
        {/* Floating Island Container */}
        <div className="pointer-events-auto bg-[#121212]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] p-2 flex items-center shadow-2xl shadow-black/50 relative">
            
            {/* Left Group */}
            <div className="flex items-center gap-1">
                <button 
                    onClick={() => onNavigate('projects')}
                    className={navItemClass(currentView === 'projects')}
                >
                    <Folder size={22} strokeWidth={currentView === 'projects' ? 2.5 : 2} />
                    {currentView === 'projects' && <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></div>}
                </button>

                <button 
                    onClick={() => onNavigate('planner')}
                    className={navItemClass(currentView === 'planner' || currentView === 'dashboard')}
                >
                    <Calendar size={22} strokeWidth={(currentView === 'planner' || currentView === 'dashboard') ? 2.5 : 2} />
                    {(currentView === 'planner' || currentView === 'dashboard') && <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></div>}
                </button>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10 mx-3"></div>

            {/* Center Mic Button */}
            <button 
                onClick={onVoiceChat}
                className={`
                    w-14 h-14 rounded-full flex items-center justify-center
                    bg-gradient-to-tr from-[var(--accent)] to-indigo-500
                    text-white shadow-lg shadow-indigo-500/30
                    transition-transform duration-200 hover:scale-105 active:scale-95
                    relative -my-4 mx-1 z-10 ring-4 ring-[#000]
                `}
            >
                <Mic size={24} strokeWidth={2.5} />
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10 mx-3"></div>

            {/* Right Group */}
            <div className="flex items-center gap-1">
                <button 
                    onClick={() => onNavigate('journal')}
                    className={navItemClass(currentView === 'journal')}
                >
                    <BookOpen size={22} strokeWidth={currentView === 'journal' ? 2.5 : 2} />
                    {currentView === 'journal' && <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></div>}
                </button>

                <button 
                    onClick={() => onNavigate('analytics')}
                    className={navItemClass(currentView === 'analytics')}
                >
                    <Activity size={22} strokeWidth={currentView === 'analytics' ? 2.5 : 2} />
                    {currentView === 'analytics' && <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></div>}
                </button>
            </div>

        </div>
    </div>
  );
};

export default Fab;
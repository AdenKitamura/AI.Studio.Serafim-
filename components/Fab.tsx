import React from 'react';
import { 
  Mic, 
  Folder, 
  BookOpen, 
  Activity, 
  Calendar,
  LayoutDashboard
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
    flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl transition-all duration-300
    ${isActive 
      ? 'text-[var(--text-main)] bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] scale-105' 
      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 active:scale-95'}
  `;

  return (
    <div className="fixed bottom-0 left-0 w-full z-[100] px-4 pb-6 pt-2 pointer-events-none flex justify-center">
        
        {/* Main Dock Container */}
        <div className="pointer-events-auto bg-[#09090b]/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] px-2 h-[80px] flex items-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative max-w-md w-full justify-between">
            
            {/* Left Group */}
            <div className="flex items-center gap-1 pl-2">
                <button 
                    onClick={() => onNavigate('projects')}
                    className={navItemClass(currentView === 'projects')}
                >
                    <Folder size={22} strokeWidth={currentView === 'projects' ? 2.5 : 2} />
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-80">Pro</span>
                </button>

                <button 
                    onClick={() => onNavigate('planner')}
                    className={navItemClass(currentView === 'planner' || currentView === 'dashboard')}
                >
                    <Calendar size={22} strokeWidth={(currentView === 'planner' || currentView === 'dashboard') ? 2.5 : 2} />
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-80">Plan</span>
                </button>
            </div>

            {/* Center Mic Button (Floating) */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3">
                <button 
                    onClick={onVoiceChat}
                    className={`
                        w-20 h-20 rounded-full flex items-center justify-center
                        bg-gradient-to-b from-[var(--accent)] to-[#4f46e5]
                        shadow-[0_10px_30px_rgba(99,102,241,0.4)] border-4 border-[#09090b]
                        transition-all duration-300 hover:scale-105 active:scale-95 group
                        ${currentView === 'chat' ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-black' : ''}
                    `}
                >
                    <div className="relative z-10">
                        <Mic size={32} className="text-white drop-shadow-md group-hover:animate-pulse" strokeWidth={2.5} />
                    </div>
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-white/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
            </div>

            {/* Spacer for Mic */}
            <div className="w-16"></div>

            {/* Right Group */}
            <div className="flex items-center gap-1 pr-2">
                <button 
                    onClick={() => onNavigate('journal')}
                    className={navItemClass(currentView === 'journal')}
                >
                    <BookOpen size={22} strokeWidth={currentView === 'journal' ? 2.5 : 2} />
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-80">Diary</span>
                </button>

                <button 
                    onClick={() => onNavigate('analytics')}
                    className={navItemClass(currentView === 'analytics')}
                >
                    <Activity size={22} strokeWidth={currentView === 'analytics' ? 2.5 : 2} />
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-80">Info</span>
                </button>
            </div>

        </div>
    </div>
  );
};

export default Fab;
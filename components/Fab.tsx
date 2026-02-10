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
    flex flex-col items-center justify-center gap-1.5 w-16 h-full rounded-2xl transition-all duration-300 relative group
    ${isActive 
      ? 'text-[var(--text-main)]' 
      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}
  `;

  const activeIndicator = (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)] animate-in zoom-in duration-300"></div>
  );

  return (
    <div className="fixed bottom-6 left-0 w-full z-[90] px-4 pointer-events-none flex justify-center">
        
        {/* Main Dock Container */}
        <div className="pointer-events-auto bg-[#09090b]/85 backdrop-blur-2xl border border-white/10 rounded-[2rem] px-6 h-[88px] flex items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative max-w-sm w-full justify-between ring-1 ring-white/5">
            
            {/* Left Group */}
            <div className="flex items-center gap-2 h-full py-2">
                <button 
                    onClick={() => onNavigate('projects')}
                    className={navItemClass(currentView === 'projects')}
                >
                    {currentView === 'projects' && activeIndicator}
                    <Folder size={24} strokeWidth={currentView === 'projects' ? 2.5 : 2} />
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-80">Проекты</span>
                </button>

                <button 
                    onClick={() => onNavigate('planner')}
                    className={navItemClass(currentView === 'planner' || currentView === 'dashboard')}
                >
                    {(currentView === 'planner' || currentView === 'dashboard') && activeIndicator}
                    <Calendar size={24} strokeWidth={(currentView === 'planner' || currentView === 'dashboard') ? 2.5 : 2} />
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-80">План</span>
                </button>
            </div>

            {/* Center Mic Button (Floating & Glowing) */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[30%] pointer-events-auto">
                <div className="relative group">
                    {/* Pulsing rings behind */}
                    <div className="absolute inset-0 bg-[var(--accent)] rounded-full blur-xl opacity-20 group-hover:opacity-40 animate-pulse transition-opacity duration-500"></div>
                    
                    <button 
                        onClick={onVoiceChat}
                        className={`
                            w-20 h-20 rounded-full flex items-center justify-center
                            bg-gradient-to-br from-[#1f1f22] to-[#000000]
                            shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] 
                            border-[6px] border-[#000000]
                            transition-all duration-300 hover:scale-105 active:scale-95
                            relative z-10
                        `}
                    >
                        <div className={`
                            absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500
                            bg-gradient-to-tr from-[var(--accent)]/20 to-transparent
                        `}></div>
                        
                        <Mic 
                            size={28} 
                            className={`text-[var(--text-main)] transition-colors duration-300 ${currentView === 'chat' ? 'text-[var(--accent)]' : 'group-hover:text-[var(--accent)]'}`} 
                            strokeWidth={2.5} 
                        />
                    </button>
                </div>
            </div>

            {/* Spacer for Mic */}
            <div className="w-12"></div>

            {/* Right Group */}
            <div className="flex items-center gap-2 h-full py-2">
                <button 
                    onClick={() => onNavigate('journal')}
                    className={navItemClass(currentView === 'journal')}
                >
                    {currentView === 'journal' && activeIndicator}
                    <BookOpen size={24} strokeWidth={currentView === 'journal' ? 2.5 : 2} />
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-80">Дневник</span>
                </button>

                <button 
                    onClick={() => onNavigate('analytics')}
                    className={navItemClass(currentView === 'analytics')}
                >
                    {currentView === 'analytics' && activeIndicator}
                    <Activity size={24} strokeWidth={currentView === 'analytics' ? 2.5 : 2} />
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-80">Инфо</span>
                </button>
            </div>

        </div>
    </div>
  );
};

export default Fab;
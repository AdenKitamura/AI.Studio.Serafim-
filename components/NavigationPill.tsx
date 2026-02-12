
import React from 'react';
import { Menu, Mic, Folder, LayoutGrid, LayoutDashboard } from 'lucide-react';
import { ViewState } from '../types';

interface ToolAction {
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

interface NavigationPillProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onOpenMenu: () => void;
  toolL?: ToolAction;
  toolR?: ToolAction;
}

const NavigationPill: React.FC<NavigationPillProps> = ({ 
  currentView, 
  onNavigate, 
  onOpenMenu, 
  toolL, 
  toolR 
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-6 flex justify-center pointer-events-none">
      <div className="pointer-events-auto relative flex items-center justify-between gap-1 p-2 rounded-[2.5rem] bg-[#121212]/85 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all duration-300">
        
        {/* 1. Menu (Fixed Left) */}
        <button 
          onClick={onOpenMenu}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors active:scale-95 hover:bg-white/5"
        >
          <Menu size={22} strokeWidth={2.5} />
        </button>

        {/* 2. Dynamic Tool L */}
        <div className="w-12 h-12 flex items-center justify-center">
            {toolL && (
                <button 
                    onClick={toolL.onClick}
                    disabled={toolL.disabled}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${toolL.active ? 'bg-white text-black shadow-lg scale-105' : 'text-white hover:bg-white/10 hover:text-white'}`}
                >
                    {toolL.icon}
                </button>
            )}
        </div>

        {/* 3. Mic (Fixed Center) - Main Action */}
        <button 
          onClick={() => onNavigate('chat')}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-amber-500 text-black shadow-[0_0_40px_-10px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-95 transition-all mx-1 border-4 border-[#121212]/50 relative z-10"
        >
          <Mic size={28} strokeWidth={2.5} />
        </button>

        {/* 4. Dynamic Tool R */}
        <div className="w-12 h-12 flex items-center justify-center">
            {toolR && (
                <button 
                    onClick={toolR.onClick}
                    disabled={toolR.disabled}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${toolR.active ? 'bg-white text-black shadow-lg scale-105' : 'text-white hover:bg-white/10 hover:text-white'} ${toolR.disabled ? 'opacity-30' : ''}`}
                >
                    {toolR.icon}
                </button>
            )}
        </div>

        {/* 5. Navigation Anchor (Right) */}
        <button 
          onClick={() => onNavigate(currentView === 'dashboard' ? 'projects' : 'dashboard')}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors active:scale-95 hover:bg-white/5 ${currentView === 'projects' ? 'text-amber-500' : 'text-white/50 hover:text-white'}`}
        >
          {currentView === 'dashboard' ? <Folder size={22} strokeWidth={2.5} /> : <LayoutGrid size={22} strokeWidth={2.5} />}
        </button>

      </div>
    </div>
  );
};

export default NavigationPill;

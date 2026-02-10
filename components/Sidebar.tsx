import React from 'react';
import { ViewState, ChatSession } from '../types';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Calendar, 
  Folder, 
  BookOpen, 
  Zap, 
  Settings, 
  History, 
  Activity, 
  Plus,
  LogOut,
  X
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onVoiceChat: () => void;
  userName: string;
  isOpen: boolean;       // New prop for mobile state
  onClose: () => void;   // New prop to close sidebar
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onNavigate, 
  onOpenSettings, 
  onOpenHistory, 
  onVoiceChat,
  userName,
  isOpen,
  onClose
}) => {

  const menuItems = [
    { id: 'dashboard', label: 'Обзор', icon: <LayoutDashboard size={20} /> },
    { id: 'chat', label: 'Ассистент', icon: <MessageSquare size={20} /> },
    { id: 'planner', label: 'Планнер', icon: <Calendar size={20} /> },
    { id: 'projects', label: 'Проекты', icon: <Folder size={20} /> },
    { id: 'thoughts', label: 'Мысли', icon: <Zap size={20} /> },
    { id: 'journal', label: 'Дневник', icon: <BookOpen size={20} /> },
    { id: 'analytics', label: 'Аналитика', icon: <Activity size={20} /> },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleNavClick = (view: ViewState) => {
    onNavigate(view);
    onClose(); // Close sidebar on mobile after selection
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden animate-in fade-in"
          onClick={onClose}
        />
      )}

      <aside 
        className={`
          fixed top-0 bottom-0 left-0 z-[100] w-72 bg-[var(--bg-main)] border-r border-[var(--border-color)] 
          transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Glow Effect */}
        <div className="absolute top-0 left-0 w-full h-64 bg-[var(--accent)]/5 blur-3xl pointer-events-none" />

        {/* Header / Logo */}
        <div className="p-8 pb-6 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-[var(--accent-glow)]">
               <span className="font-black text-lg">S</span>
            </div>
            <div>
               <h1 className="font-bold text-xl tracking-tight text-[var(--text-main)] leading-none">
                 Serafim
               </h1>
               <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">
                 OS v4.9
               </span>
            </div>
          </div>
          {/* Close Button (Mobile Only) */}
          <button 
            onClick={onClose}
            className="md:hidden p-2 text-[var(--text-muted)] hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar py-4">
          
          <div className="px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-40">
             Меню
          </div>

          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id as ViewState)}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative overflow-hidden
                  ${isActive 
                    ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)]' 
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-item)] hover:text-[var(--text-main)]'}
                `}
              >
                {isActive && (
                   <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-30 pointer-events-none" />
                )}
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </div>
                <span className="text-sm font-bold tracking-wide">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]" />
                )}
              </button>
            );
          })}

          <div className="pt-6 px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-40">
             Действия
          </div>

          <button 
            onClick={() => { onOpenHistory(); onClose(); }}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[var(--text-muted)] hover:bg-[var(--bg-item)] hover:text-[var(--text-main)] transition-all group"
          >
             <History size={20} className="group-hover:text-indigo-400 transition-colors" />
             <span className="text-sm font-bold">История чатов</span>
          </button>

        </nav>

        {/* User Profile Footer */}
        <div className="p-4 mt-auto">
           <div className="glass-panel p-4 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
              
              <div className="flex items-center gap-3 mb-3">
                 <div className="w-10 h-10 rounded-full bg-[var(--bg-item)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-main)] font-black text-sm">
                   {userName.charAt(0).toUpperCase()}
                 </div>
                 <div className="min-w-0 overflow-hidden">
                    <p className="text-sm font-bold text-[var(--text-main)] truncate">{userName}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">Pro Plan Active</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => { onOpenSettings(); onClose(); }} className="py-2 bg-[var(--bg-item)] rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition-all">
                    <Settings size={16} />
                 </button>
                 <button onClick={handleLogout} className="py-2 bg-[var(--bg-item)] rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <LogOut size={16} />
                 </button>
              </div>
           </div>
        </div>

      </aside>
    </>
  );
};

export default Sidebar;

import React, { useState } from 'react';
import { ChatSession, Project } from '../types';
import { X, MessageSquare, Plus, Trash2, Search, Zap, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import ru from 'date-fns/locale/ru';

interface ChatHistoryModalProps {
  sessions: ChatSession[];
  projects: Project[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: (title: string, projectId?: string) => void;
  onDeleteSession: (id: string) => void;
  onClose: () => void;
}

const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({ 
    sessions, projects, activeSessionId, onSelectSession, onNewSession, onDeleteSession, onClose 
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredSessions = sessions.filter(s => {
      if (activeTab === 'all') return true;
      return s.projectId === activeTab;
  });

  const handleCreate = () => { onNewSession(newTitle || 'Новый диалог', activeTab === 'all' ? undefined : activeTab); };
  const getProjectTitle = (id?: string) => { if(!id) return 'Общий'; return projects.find(p => p.id === id)?.title || 'Неизвестный'; };
  const getProjectColor = (id?: string) => { if(!id) return 'var(--text-muted)'; return projects.find(p => p.id === id)?.color || 'var(--text-muted)'; };

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-main)]/80 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-2"><div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><MessageSquare size={20} /></div><div><h2 className="text-lg font-bold text-[var(--text-main)]">Архив Диалогов</h2><p className="text-xs text-[var(--text-muted)]">Контекстная память ИИ</p></div></div>
            <button onClick={onClose} className="p-2 bg-[var(--bg-item)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] glass-btn"><X size={24} /></button>
        </div>
        <div className="p-4 space-y-4">
            <div className="flex gap-2"><input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={activeTab !== 'all' ? `Новый чат в "${getProjectTitle(activeTab)}"...` : "Тема нового диалога..."} className="flex-1 bg-[var(--bg-item)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none" /><button onClick={handleCreate} className="px-4 bg-[var(--accent)] text-white rounded-xl shadow-lg active:scale-95 transition-all"><Plus size={24} /></button></div>
            <div className="flex bg-[var(--bg-item)] p-1 rounded-xl border border-[var(--border-color)] overflow-x-auto no-scrollbar gap-1"><button onClick={() => setActiveTab('all')} className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'all' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><MessageCircle size={14} />Все</button>{projects.map(p => (<button key={p.id} onClick={() => setActiveTab(p.id)} className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === p.id ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>{p.title}</button>))}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pt-0 no-scrollbar space-y-2 pb-20">
            {filteredSessions.map(session => (
                <div key={session.id} onClick={() => onSelectSession(session.id)} className={`glass-panel p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-between group ${activeSessionId === session.id ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'hover:border-[var(--text-muted)]'}`}>
                    <div className="flex items-center gap-3 overflow-hidden"><div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activeSessionId === session.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-item)] text-[var(--text-muted)]'}`}><Zap size={18} /></div><div className="min-w-0"><h3 className={`text-sm font-bold truncate ${activeSessionId === session.id ? 'text-[var(--accent)]' : 'text-[var(--text-main)]'}`}>{session.title}</h3><div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-[var(--text-muted)]">{format(session.lastInteraction, 'd MMM', { locale: ru })}</span>{session.projectId && (<><span className="w-1 h-1 rounded-full bg-[var(--border-color)]"></span><span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-item)] border border-[var(--border-color)] flex items-center gap-1" style={{ color: getProjectColor(session.projectId) }}>{getProjectTitle(session.projectId)}</span></>)}</div></div></div>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} className="p-2 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                </div>
            ))}
            {filteredSessions.length === 0 && (<div className="text-center py-20 opacity-40"><Search size={40} className="mx-auto mb-4 text-[var(--text-muted)]" /><p className="text-sm font-bold text-[var(--text-muted)]">В этой категории пусто</p></div>)}
        </div>
    </div>
  );
};

export default ChatHistoryModal;

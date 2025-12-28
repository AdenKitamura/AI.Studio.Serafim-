
import React, { useState } from 'react';
import { Task } from '../types';
import { Bell, CheckCircle, Clock, X, Calendar, ArrowRight, Zap } from 'lucide-react';

interface NotificationModalProps {
  task: Task;
  onClose: () => void;
  onComplete: () => void;
  onSnooze: (minutes: number) => void;
  onReschedule: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ task, onClose, onComplete, onSnooze, onReschedule }) => {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
       <div className="w-full max-w-sm glass-card rounded-[2.5rem] p-8 shadow-2xl border-2 border-indigo-500/20 relative overflow-hidden">
           
           {/* Декоративная линия прогресса уведомления */}
           <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600 animate-pulse"></div>
           
           <div className="flex justify-center mb-8">
               <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                   <Bell size={40} className="text-indigo-400 animate-bounce" />
               </div>
           </div>

           <div className="text-center mb-10">
               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 block">Системный Фокус</span>
               <h2 className="text-2xl font-bold text-white tracking-tighter leading-tight mb-2">
                   {task.title}
               </h2>
               <p className="text-xs text-white/40 font-medium px-4">
                   Пора выполнить запланированную задачу. Система ожидает подтверждения.
               </p>
           </div>

           <div className="space-y-3">
               <button 
                  onClick={onComplete}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
               >
                   <CheckCircle size={20} strokeWidth={3} />
                   Выполнено
               </button>

               {!showOptions ? (
                   <button 
                      onClick={() => setShowOptions(true)}
                      className="w-full py-4 glass text-white/60 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:text-white transition-all"
                   >
                       <Clock size={18} />
                       Другое время
                   </button>
               ) : (
                   <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-bottom-2">
                       <button 
                          onClick={() => onSnooze(15)}
                          className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-white/40 hover:text-white hover:bg-white/10 transition-all"
                       >
                           +15 мин
                       </button>
                       <button 
                          onClick={onReschedule}
                          className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-white/40 hover:text-white hover:bg-white/10 transition-all"
                       >
                           В Календарь
                       </button>
                   </div>
               )}
           </div>

           <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 text-white/10 hover:text-white transition-colors"
           >
               <X size={24} />
           </button>
       </div>
    </div>
  );
};

export default NotificationModal;

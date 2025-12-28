import React, { useState } from 'react';
import { Task } from '../types';
import { Bell, CheckCircle, Clock, X, Calendar } from 'lucide-react';
import { addSeconds } from 'date-fns';

interface NotificationModalProps {
  task: Task;
  onClose: () => void;
  onComplete: () => void;
  onSnooze: (minutes: number) => void; // Keeping prop interface for compatibility but using internally for manual time
  onReschedule: () => void; // Legacy, we handle logic inside now
}

const NotificationModal: React.FC<NotificationModalProps> = ({ task, onClose, onComplete, onSnooze }) => {
  const [showRescheduleInput, setShowRescheduleInput] = useState(false);
  const [rescheduleTime, setRescheduleTime] = useState('');

  const handleManualReschedule = () => {
      if (!rescheduleTime) return;
      const newDate = new Date(rescheduleTime);
      const now = new Date();
      const diffMinutes = Math.floor((newDate.getTime() - now.getTime()) / 60000);
      
      if (diffMinutes > 0) {
          onSnooze(diffMinutes);
      } else {
          // Fallback if time is in past, just set it anyway (logic in App handles display)
          // Or just close/do nothing. Let's assume onSnooze handles adding minutes to NOW.
          // Wait, onSnooze implementation in App uses `addSeconds(new Date(), minutes*60)`.
          // So passing minutes difference is correct.
          onSnooze(Math.max(1, diffMinutes));
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
       <div className="w-full max-w-sm bg-[var(--bg-main)] border border-[var(--accent)] shadow-[0_0_50px_rgba(var(--accent),0.3)] rounded-3xl p-6 relative overflow-hidden">
           {/* Background Pulse Effect */}
           <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent)] animate-pulse"></div>
           
           <div className="flex justify-center mb-6">
               <div className="w-20 h-20 rounded-full bg-[var(--accent)]/20 flex items-center justify-center animate-bounce">
                   <Bell size={40} className="text-[var(--accent)]" />
               </div>
           </div>

           <h2 className="text-2xl font-bold text-center text-[var(--text-main)] mb-2">Напоминание</h2>
           <p className="text-center text-[var(--text-muted)] text-lg mb-8 font-medium">
               {task.title}
           </p>

           <div className="space-y-3">
               <button 
                  onClick={onComplete}
                  className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
               >
                   <CheckCircle size={24} />
                   Выполнено
               </button>

               {!showRescheduleInput ? (
                   <button 
                      onClick={() => setShowRescheduleInput(true)}
                      className="w-full py-3 bg-[var(--bg-item)] text-[var(--text-main)] rounded-xl font-medium hover:bg-[var(--bg-card)] flex items-center justify-center gap-2 transition-colors"
                   >
                       <Clock size={18} />
                       Перенести
                   </button>
               ) : (
                   <div className="bg-[var(--bg-item)] p-3 rounded-xl border border-[var(--bg-card)] animate-in slide-in-from-bottom-2">
                       <label className="text-xs text-[var(--text-muted)] uppercase font-bold mb-1 block">Новое время</label>
                       <input 
                          type="datetime-local"
                          value={rescheduleTime}
                          onChange={(e) => setRescheduleTime(e.target.value)}
                          className="w-full bg-[var(--bg-main)] border border-[var(--bg-card)] rounded-lg p-2 text-[var(--text-main)] mb-2 text-sm outline-none focus:border-[var(--accent)]"
                       />
                       <div className="flex gap-2">
                           <button 
                                onClick={() => setShowRescheduleInput(false)}
                                className="flex-1 py-2 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-card)] rounded-lg"
                           >
                               ОТМЕНА
                           </button>
                           <button 
                                onClick={handleManualReschedule}
                                className="flex-1 py-2 text-xs font-bold text-[var(--bg-main)] bg-[var(--text-main)] rounded-lg"
                           >
                               OK
                           </button>
                       </div>
                   </div>
               )}
           </div>

           <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-muted)] p-2 hover:text-[var(--text-main)]">
               <X size={24} />
           </button>
       </div>
    </div>
  );
};

export default NotificationModal;
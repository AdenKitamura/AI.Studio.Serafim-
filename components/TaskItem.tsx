
import React from 'react';
import { Task, Priority } from '../types';
import { CheckCircle, Circle, Trash2, Clock, Folder } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  projectInfo?: { title: string; color: string };
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, projectInfo }) => {
  const priorityColor = {
    [Priority.HIGH]: 'text-red-400',
    [Priority.MEDIUM]: 'text-yellow-400',
    [Priority.LOW]: 'text-blue-400',
  };

  const priorityLabel = {
    [Priority.HIGH]: 'Высокий',
    [Priority.MEDIUM]: 'Средний',
    [Priority.LOW]: 'Низкий',
  };

  return (
    <div className={`group flex items-center justify-between p-4 mb-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-item)]/50 backdrop-blur-sm transition-all shadow-sm ${task.isCompleted ? 'opacity-40' : 'hover:border-[var(--accent)]/30 hover:scale-[1.01]'}`}>
      <div className="flex items-center gap-4 overflow-hidden">
        <button onClick={() => onToggle(task.id)} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)] transition-all">
          {task.isCompleted ? <CheckCircle className="text-[var(--accent)]" size={22} /> : <Circle size={22} />}
        </button>
        
        <div className="flex flex-col min-w-0">
          <span className={`truncate text-sm font-bold ${task.isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>
            {task.title}
          </span>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1.5 flex-wrap">
            {task.dueDate && (
              <span className="flex items-center gap-1 bg-[var(--bg-main)] px-2 py-0.5 rounded-md border border-[var(--border-color)]">
                <Clock size={10} />
                {format(new Date(task.dueDate), 'd MMM, HH:mm', { locale: ru })}
              </span>
            )}
            <span className={`${priorityColor[task.priority]} px-2 py-0.5 rounded-md bg-[var(--bg-main)] border border-[var(--border-color)]`}>
              {priorityLabel[task.priority]}
            </span>
            {projectInfo && (
               <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--bg-main)] border border-[var(--border-color)]" style={{ color: projectInfo.color }}>
                 <Folder size={10} fill="currentColor" fillOpacity={0.2} />
                 {projectInfo.title}
               </span>
            )}
          </div>
        </div>
      </div>

      <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 p-2 text-[var(--text-muted)] hover:text-red-500 transition-all active:scale-90">
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export default TaskItem;

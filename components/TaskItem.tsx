
import React from 'react';
import { Task, Priority } from '../types';
import { CheckCircle, Circle, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
// Fix: Import locale directly from the specific path to resolve export issues
import { ru } from 'date-fns/locale/ru';

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
    <div className={`group flex items-center justify-between p-4 mb-3 rounded-xl border border-[var(--bg-card)] bg-[var(--bg-item)]/50 backdrop-blur-sm transition-all ${task.isCompleted ? 'opacity-50' : 'hover:border-[var(--text-muted)]'}`}>
      <div className="flex items-center gap-3 overflow-hidden">
        <button onClick={() => onToggle(task.id)} className="shrink-0 text-[var(--text-muted)] hover:text-emerald-400 transition-colors">
          {task.isCompleted ? <CheckCircle className="text-emerald-500" size={24} /> : <Circle size={24} />}
        </button>
        
        <div className="flex flex-col min-w-0">
          <span className={`truncate text-base ${task.isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>
            {task.title}
          </span>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1 flex-wrap">
            {task.dueDate && (
              <span className="flex items-center gap-1 bg-[var(--bg-card)] px-1.5 py-0.5 rounded-md">
                <Clock size={12} />
                {/* Fix: Replace parseISO with native Date constructor */}
                {format(new Date(task.dueDate), 'd MMM, HH:mm', { locale: ru })}
              </span>
            )}
            <span className={`${priorityColor[task.priority]} font-medium px-1.5 py-0.5 rounded-md bg-[var(--bg-card)]`}>
              {priorityLabel[task.priority]}
            </span>
            {projectInfo && (
               <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--bg-card)]" style={{ color: projectInfo.color }}>
                 <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: projectInfo.color }}></div>
                 {projectInfo.title}
               </span>
            )}
          </div>
        </div>
      </div>

      <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 p-2 text-[var(--text-muted)] hover:text-red-400 transition-all">
        <Trash2 size={18} />
      </button>
    </div>
  );
};

export default TaskItem;
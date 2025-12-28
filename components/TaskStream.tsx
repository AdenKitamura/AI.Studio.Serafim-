import React from 'react';
import { Task } from '../types';
import TaskItem from './TaskItem';
import { CheckCircle } from './Icons';

interface TaskStreamProps {
  tasks: Task[];
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

const TaskStream: React.FC<TaskStreamProps> = ({ tasks, toggleTask, deleteTask }) => {
  return (
    <div className="pb-24 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-[var(--text-main)] mb-6">Поток задач</h2>
      <div className="space-y-1">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
            <CheckCircle size={48} className="mb-4 opacity-20" />
            <p>Задач нет</p>
          </div>
        ) : (
          tasks.sort((a,b) => Number(a.isCompleted) - Number(b.isCompleted)).map(task => (
            <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
          ))
        )}
      </div>
    </div>
  );
};

export default TaskStream;
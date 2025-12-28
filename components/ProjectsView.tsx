
import React, { useState } from 'react';
import { Project, Task, Thought, Priority } from '../types';
import { 
  Folder, Plus, Trash2, ArrowLeft, 
  CheckCircle, Layers, X, Target
} from 'lucide-react';
import TaskItem from './TaskItem';
import { format } from 'date-fns';
// Fix: Import locale directly from the specific path to resolve export issues
import { ru } from 'date-fns/locale/ru';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  thoughts: Thought[];
  onAddProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (task: Task) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

const COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

const ProjectsView: React.FC<ProjectsViewProps> = ({ 
  projects, tasks, thoughts, 
  onAddProject, onDeleteProject, 
  onAddTask, onToggleTask, onDeleteTask 
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Creation State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(COLORS[5]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    onAddProject({
      id: Date.now().toString(),
      title: newTitle,
      description: newDesc,
      color: newColor,
      createdAt: new Date().toISOString()
    });
    setNewTitle('');
    setNewDesc('');
    setNewColor(COLORS[5]);
    setIsCreating(false);
  };

  // --- DETAIL VIEW ---
  if (selectedProject) {
    const projectTasks = tasks.filter(t => t.projectId === selectedProject.id);
    const projectThoughts = thoughts.filter(t => t.projectId === selectedProject.id || t.tags.includes(selectedProject.title.toLowerCase()));
    
    const completedTasks = projectTasks.filter(t => t.isCompleted).length;
    const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;

    return (
      <div className="flex flex-col h-full bg-[var(--bg-main)] animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-[var(--bg-card)] bg-[var(--bg-main)]/80 backdrop-blur sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button onClick={() => setSelectedProjectId(null)} className="p-2 -ml-2 hover:bg-[var(--bg-item)] rounded-full transition-colors">
                <ArrowLeft size={24} className="text-[var(--text-muted)]" />
             </button>
             <div>
                <h2 className="text-xl font-bold text-[var(--text-main)] leading-none">{selectedProject.title}</h2>
                <span className="text-xs text-[var(--text-muted)]">Проект</span>
             </div>
          </div>
          <button 
            onClick={() => { onDeleteProject(selectedProject.id); setSelectedProjectId(null); }}
            className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-28">
           {/* Info Card */}
           <div className="mb-6 bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Folder size={100} color={selectedProject.color} />
              </div>
              <p className="text-[var(--text-muted)] text-sm mb-4 relative z-10">{selectedProject.description || "Нет описания"}</p>
              
              <div className="relative z-10">
                  <div className="flex justify-between text-xs font-bold uppercase text-[var(--text-muted)] mb-1">
                      <span>Прогресс</span>
                      <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: selectedProject.color }}></div>
                  </div>
              </div>
           </div>

           {/* Tasks Section */}
           <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle size={16} /> Задачи
                  </h3>
                  <button 
                    onClick={() => onAddTask({
                        id: Date.now().toString(),
                        title: 'Новая задача',
                        priority: Priority.MEDIUM,
                        isCompleted: false,
                        dueDate: new Date().toISOString(),
                        projectId: selectedProject.id,
                        createdAt: new Date().toISOString()
                    })}
                    className="text-xs font-bold text-[var(--accent)] hover:underline"
                  >
                      + Добавить
                  </button>
              </div>
              
              <div className="space-y-2">
                  {projectTasks.length === 0 ? (
                      <p className="text-center py-4 text-[var(--text-muted)] text-sm italic">Задач пока нет</p>
                  ) : (
                      projectTasks.map(task => (
                          <TaskItem 
                            key={task.id} 
                            task={task} 
                            onToggle={onToggleTask} 
                            onDelete={onDeleteTask} 
                          />
                      ))
                  )}
              </div>
           </div>

           {/* Thoughts Section (Linked implicitly) */}
           {projectThoughts.length > 0 && (
               <div>
                  <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 mb-3">
                      <Layers size={16} /> Связанные мысли
                  </h3>
                  <div className="space-y-3">
                      {projectThoughts.map(thought => (
                          <div key={thought.id} className="p-4 bg-[var(--bg-item)]/50 rounded-xl border border-[var(--border-color)]">
                              <p className="text-sm text-[var(--text-main)] mb-2">{thought.content}</p>
                              <div className="text-[10px] text-[var(--text-muted)]">
                                  {/* Fix: Replace parseISO with native Date constructor */}
                                  {format(new Date(thought.createdAt), 'd MMM yyyy', { locale: ru })}
                              </div>
                          </div>
                      ))}
                  </div>
               </div>
           )}

        </div>
      </div>
    );
  }

  // --- OVERVIEW VIEW ---
  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] pb-24">
       <div className="p-5 border-b border-[var(--bg-card)] flex justify-between items-center sticky top-0 bg-[var(--bg-main)]/80 backdrop-blur z-10">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-main)]">Проекты</h2>
            <p className="text-sm text-[var(--text-muted)]">Сферы жизни и цели</p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="p-3 bg-[var(--text-main)] text-[var(--bg-main)] rounded-full hover:scale-110 transition-transform shadow-lg"
          >
             <Plus size={20} />
          </button>
       </div>

       <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(project => {
             const pTasks = tasks.filter(t => t.projectId === project.id);
             const completed = pTasks.filter(t => t.isCompleted).length;
             const progress = pTasks.length > 0 ? (completed / pTasks.length) * 100 : 0;
             
             return (
               <div 
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className="group bg-[var(--bg-item)] border border-[var(--border-color)] p-5 rounded-2xl relative overflow-hidden cursor-pointer hover:border-[var(--text-muted)] transition-all active:scale-[0.98]"
               >
                   <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: project.color }}></div>
                   
                   <div className="flex justify-between items-start mb-3">
                       <div className="p-2 rounded-lg bg-[var(--bg-main)]">
                          <Folder size={24} color={project.color} />
                       </div>
                       <div className="text-xs font-bold text-[var(--text-muted)] px-2 py-1 rounded-md bg-[var(--bg-main)]">
                           {pTasks.length} задач
                       </div>
                   </div>

                   <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">{project.title}</h3>
                   <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-4 h-10">
                       {project.description || "Нет описания"}
                   </p>

                   {/* Progress Bar */}
                   <div className="w-full h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden">
                       <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: project.color }}></div>
                   </div>
               </div>
             )
          })}
          
          {projects.length === 0 && (
             <div className="col-span-full flex flex-col items-center justify-center py-20 text-[var(--text-muted)] opacity-50">
                {/* Fixed: Import Target icon from lucide-react */}
                <Target size={48} className="mb-4" />
                <p>Проектов пока нет</p>
                <p className="text-sm">Создайте первый проект, чтобы навести порядок.</p>
             </div>
          )}
       </div>

       {/* Create Modal */}
       {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-[var(--bg-main)] w-full max-w-md rounded-3xl border border-[var(--border-color)] p-6 shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-[var(--text-main)]">Новый проект</h3>
                      <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-[var(--bg-item)] rounded-full text-[var(--text-muted)]">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Название</label>
                          <input 
                            autoFocus
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="w-full bg-[var(--bg-item)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-main)] focus:border-[var(--accent)] outline-none"
                            placeholder="Например: Здоровье"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Описание</label>
                          <textarea 
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            className="w-full bg-[var(--bg-item)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-main)] focus:border-[var(--accent)] outline-none resize-none h-24"
                            placeholder="Краткое описание целей..."
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Цвет</label>
                          <div className="flex gap-3 flex-wrap">
                              {COLORS.map(c => (
                                  <button
                                    key={c}
                                    onClick={() => setNewColor(c)}
                                    className={`w-8 h-8 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-[var(--text-main)] ring-offset-2 ring-offset-[var(--bg-main)]' : 'hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                  />
                              ))}
                          </div>
                      </div>

                      <button 
                        onClick={handleCreate}
                        disabled={!newTitle.trim()}
                        className="w-full py-4 mt-4 bg-[var(--text-main)] text-[var(--bg-main)] rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                          Создать проект
                      </button>
                  </div>
              </div>
          </div>
       )}
    </div>
  );
};

export default ProjectsView;

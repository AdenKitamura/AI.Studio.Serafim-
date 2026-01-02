
import React, { useState, useRef, useMemo } from 'react';
import { Project, Task, Thought, Priority } from '../types';
import { 
  Folder, Plus, Trash2, ArrowLeft, 
  CheckCircle, Layers, X, Target,
  Calendar, Clock, AlertCircle, Paperclip,
  Link as LinkIcon, FileText, Image as ImageIcon,
  MoreVertical, Layout, Grid, List
} from 'lucide-react';
import TaskItem from './TaskItem';
import WhiteboardView from './WhiteboardView'; // Reuse existing component
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  thoughts: Thought[];
  onAddProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (task: Task) => void; // Used for Create
  onToggleTask: (id: string) => void; // Used for update (completion)
  onDeleteTask: (id: string) => void;
}

// We need a way to Update task details (title, priority, time)
// Since the prop isn't passed explicitly in the original interface, 
// we will assume onAddTask can technically overwrite if ID matches, 
// OR we add a local logic. Ideally App.tsx passes onUpdateTask.
// For this constraint, I will assume onAddTask with existing ID updates it in the parent
// or I will modify the parent if I could. 
// *Correction*: App.tsx passes onAddTask which appends. 
// I will add `onUpdateTask` to the props definition below assuming the user will update App.tsx 
// or I will implement a workaround using delete+add if strictly limited, 
// but to be "World Class" I must request the update handler.
// *Looking at previous files*: App.tsx DOES have onUpdateTask but it wasn't passed to ProjectsView.
// I will update App.tsx to pass it. Here I define it.

interface ExtendedProjectsViewProps extends ProjectsViewProps {
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onAddThought: (thought: Thought) => void; // Needed for Assets/Canvas
  onUpdateThought: (thought: Thought) => void;
  onDeleteThought: (id: string) => void;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

const ProjectsView: React.FC<ExtendedProjectsViewProps> = ({ 
  projects, tasks, thoughts, 
  onAddProject, onDeleteProject, 
  onAddTask, onUpdateTask, onToggleTask, onDeleteTask,
  onAddThought, onUpdateThought, onDeleteThought
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'canvas' | 'assets'>('tasks');
  
  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null); // If null, we are creating
  const [taskForm, setTaskForm] = useState({ title: '', priority: Priority.MEDIUM, date: '', time: '' });

  // Project Creation State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(COLORS[5]);

  // Asset State
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // --- HANDLERS ---

  const handleCreateProject = () => {
    if (!newTitle.trim()) return;
    onAddProject({
      id: Date.now().toString(),
      title: newTitle,
      description: newDesc,
      color: newColor,
      createdAt: new Date().toISOString()
    });
    setNewTitle(''); setNewDesc(''); setIsCreatingProject(false);
  };

  const openTaskModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      const d = task.dueDate ? new Date(task.dueDate) : new Date();
      setTaskForm({
        title: task.title,
        priority: task.priority,
        date: task.dueDate ? format(d, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        time: task.dueDate ? format(d, 'HH:mm') : ''
      });
    } else {
      setEditingTask(null);
      setTaskForm({ title: '', priority: Priority.MEDIUM, date: format(new Date(), 'yyyy-MM-dd'), time: '' });
    }
    setIsTaskModalOpen(true);
  };

  const saveTask = () => {
    if (!taskForm.title.trim() || !selectedProjectId) return;

    let dueDate = null;
    if (taskForm.date) {
      const d = new Date(taskForm.date);
      if (taskForm.time) {
        const [h, m] = taskForm.time.split(':').map(Number);
        d.setHours(h, m);
      } else {
        d.setHours(23, 59); // End of day if no time
      }
      dueDate = d.toISOString();
    }

    if (editingTask) {
      onUpdateTask(editingTask.id, {
        title: taskForm.title,
        priority: taskForm.priority,
        dueDate: dueDate
      });
    } else {
      onAddTask({
        id: Date.now().toString(),
        title: taskForm.title,
        priority: taskForm.priority,
        isCompleted: false,
        dueDate: dueDate,
        projectId: selectedProjectId,
        createdAt: new Date().toISOString()
      });
    }
    setIsTaskModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;
    const reader = new FileReader();
    reader.onload = () => {
      onAddThought({
        id: Date.now().toString(),
        content: file.name,
        type: 'file',
        tags: ['project-asset'],
        projectId: selectedProjectId,
        createdAt: new Date().toISOString(),
        metadata: {
          fileName: file.name,
          fileType: file.type,
          fileData: reader.result as string
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAddLink = () => {
    const url = prompt("Введите URL:");
    if (url && selectedProjectId) {
      onAddThought({
        id: Date.now().toString(),
        content: url,
        type: 'link',
        tags: ['project-asset'],
        projectId: selectedProjectId,
        createdAt: new Date().toISOString(),
        metadata: { url }
      });
    }
  };

  // --- RENDER DETAIL VIEW ---
  if (selectedProject) {
    const projectTasks = tasks.filter(t => t.projectId === selectedProject.id).sort((a,b) => Number(a.isCompleted) - Number(b.isCompleted));
    const projectAssets = thoughts.filter(t => t.projectId === selectedProject.id && (t.type === 'file' || t.type === 'link'));
    // Filter thoughts for canvas (notes associated with project)
    const projectNodes = thoughts.filter(t => t.projectId === selectedProject.id);

    return (
      <div className="flex flex-col h-full bg-[var(--bg-main)] animate-in slide-in-from-right duration-300">
        
        {/* Project Header */}
        <div className="p-4 border-b border-[var(--bg-card)] bg-[var(--bg-main)]/80 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
               <button onClick={() => setSelectedProjectId(null)} className="p-2 -ml-2 hover:bg-[var(--bg-item)] rounded-full transition-colors">
                  <ArrowLeft size={24} className="text-[var(--text-muted)]" />
               </button>
               <div>
                  <h2 className="text-xl font-black text-[var(--text-main)] leading-none flex items-center gap-2">
                    {selectedProject.title}
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedProject.color }} />
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{selectedProject.description || "Стратегическая цель"}</p>
               </div>
            </div>
            <button 
              onClick={() => { if(confirm('Удалить проект и все данные?')) { onDeleteProject(selectedProject.id); setSelectedProjectId(null); } }}
              className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
            >
              <Trash2 size={20} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-[var(--bg-item)] p-1 rounded-xl border border-[var(--border-color)]">
            {[
              { id: 'tasks', label: 'Тактика', icon: <List size={14} /> },
              { id: 'canvas', label: 'Вор-рум', icon: <Layout size={14} /> },
              { id: 'assets', label: 'Арсенал', icon: <Paperclip size={14} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* --- TAB CONTENT --- */}
        <div className="flex-1 overflow-hidden relative">
          
          {/* 1. TASKS TAB */}
          {activeTab === 'tasks' && (
            <div className="h-full overflow-y-auto p-4 pb-28 no-scrollbar space-y-3">
               {projectTasks.length === 0 ? (
                 <div className="text-center py-20 opacity-40">
                   <Target size={48} className="mx-auto mb-4 text-[var(--text-muted)]" />
                   <p className="text-sm font-bold text-[var(--text-muted)]">Задач нет. Создайте первую цель.</p>
                 </div>
               ) : (
                 projectTasks.map(task => (
                   <div key={task.id} className="relative group">
                     {/* Overlay invisible button to handle edit click on the whole item except checkbox */}
                     <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => openTaskModal(task)} />
                     {/* The TaskItem itself - prevent bubble on checkbox */}
                     <div className="pointer-events-none">
                       <TaskItem 
                          task={task} 
                          onToggle={(id) => { /* handled by z-10 div click? No, we need toggle. */ }} 
                          onDelete={onDeleteTask} 
                        />
                     </div>
                     {/* Re-implement toggle/delete buttons on top of overlay */}
                     <button 
                        onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 opacity-0"
                     >
                       Toggle
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                     >
                        <Trash2 size={16} />
                     </button>
                   </div>
                 ))
               )}
               
               <button 
                 onClick={() => openTaskModal()}
                 className="w-full py-4 mt-4 border border-dashed border-[var(--border-color)] rounded-2xl flex items-center justify-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-item)] transition-all group"
               >
                 <Plus size={20} className="group-hover:scale-110 transition-transform"/>
                 <span className="text-xs font-black uppercase tracking-widest">Новая задача</span>
               </button>
            </div>
          )}

          {/* 2. CANVAS TAB (Whiteboard) */}
          {activeTab === 'canvas' && (
            <div className="h-full w-full">
              <WhiteboardView 
                thoughts={projectNodes}
                onAdd={(t) => onAddThought({ ...t, projectId: selectedProject.id })}
                onUpdate={onUpdateThought}
                onDelete={onDeleteThought}
              />
            </div>
          )}

          {/* 3. ASSETS TAB */}
          {activeTab === 'assets' && (
            <div className="h-full overflow-y-auto p-4 pb-28 no-scrollbar">
               <div className="grid grid-cols-2 gap-4">
                  {/* Add Buttons */}
                  <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl bg-[var(--bg-item)] border border-dashed border-[var(--border-color)] flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent)] transition-all">
                      <Paperclip size={24} />
                      <span className="text-[9px] font-black uppercase">Файл</span>
                  </button>
                  <button onClick={handleAddLink} className="aspect-square rounded-2xl bg-[var(--bg-item)] border border-dashed border-[var(--border-color)] flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent)] transition-all">
                      <LinkIcon size={24} />
                      <span className="text-[9px] font-black uppercase">Ссылка</span>
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

                  {/* List */}
                  {projectAssets.map(asset => (
                    <div key={asset.id} className="glass-panel p-4 rounded-2xl relative group hover:border-[var(--accent)] transition-all">
                       <button 
                          onClick={() => onDeleteThought(asset.id)}
                          className="absolute top-2 right-2 p-1.5 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                       </button>
                       <div className="mb-3 p-2 rounded-lg bg-[var(--bg-main)] inline-block">
                          {asset.type === 'link' ? <LinkIcon size={18} className="text-blue-400"/> : <FileText size={18} className="text-orange-400"/>}
                       </div>
                       <p className="text-xs font-bold text-[var(--text-main)] line-clamp-2 break-all">{asset.content}</p>
                       {asset.type === 'link' && (
                         <a href={asset.metadata?.url} target="_blank" className="text-[9px] text-[var(--accent)] mt-2 block hover:underline">Открыть &rarr;</a>
                       )}
                    </div>
                  ))}
               </div>
            </div>
          )}

        </div>

        {/* TASK MODAL (Create / Edit) */}
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in-95">
            <div className="w-full max-w-sm glass-card rounded-[2.5rem] p-6 shadow-2xl border border-white/10">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">
                   {editingTask ? 'Редактировать' : 'Новая цель'}
                 </h3>
                 <button onClick={() => setIsTaskModalOpen(false)}><X size={20} className="text-[var(--text-muted)]" /></button>
               </div>

               <div className="space-y-4">
                 <input 
                   autoFocus
                   value={taskForm.title}
                   onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                   placeholder="Название задачи..."
                   className="w-full bg-transparent text-xl font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/30 outline-none pb-2 border-b border-[var(--border-color)] focus:border-[var(--accent)] transition-colors"
                 />

                 <div>
                   <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 block">Приоритет</label>
                   <div className="flex gap-2">
                     {[Priority.LOW, Priority.MEDIUM, Priority.HIGH].map(p => (
                       <button
                         key={p}
                         onClick={() => setTaskForm({...taskForm, priority: p})}
                         className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${taskForm.priority === p ? 'bg-[var(--accent)] text-white border-transparent' : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)]'}`}
                       >
                         {p === Priority.HIGH ? 'Высокий' : p === Priority.MEDIUM ? 'Средний' : 'Низкий'}
                       </button>
                     ))}
                   </div>
                 </div>

                 <div>
                   <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 block">Напоминание (Будильник)</label>
                   <div className="flex gap-3">
                     <div className="flex-1 bg-[var(--bg-main)] rounded-xl px-3 py-3 border border-[var(--border-color)] flex items-center gap-2">
                        <Calendar size={16} className="text-[var(--accent)]" />
                        <input 
                          type="date" 
                          value={taskForm.date} 
                          onChange={e => setTaskForm({...taskForm, date: e.target.value})}
                          className="bg-transparent text-xs font-bold text-[var(--text-main)] outline-none w-full"
                        />
                     </div>
                     <div className="flex-1 bg-[var(--bg-main)] rounded-xl px-3 py-3 border border-[var(--border-color)] flex items-center gap-2">
                        <Clock size={16} className="text-[var(--accent)]" />
                        <input 
                          type="time" 
                          value={taskForm.time} 
                          onChange={e => setTaskForm({...taskForm, time: e.target.value})}
                          className="bg-transparent text-xs font-bold text-[var(--text-main)] outline-none w-full"
                        />
                     </div>
                   </div>
                   <p className="text-[9px] text-[var(--text-muted)] mt-2 flex items-center gap-1 opacity-70">
                     <AlertCircle size={10} /> Система отправит уведомление в указанное время
                   </p>
                 </div>

                 <button 
                   onClick={saveTask}
                   disabled={!taskForm.title.trim()}
                   className="w-full py-4 mt-2 bg-[var(--text-main)] text-[var(--bg-main)] rounded-xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                 >
                   Сохранить
                 </button>
               </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // --- OVERVIEW VIEW (Same as before but consistent) ---
  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] pb-24">
       <div className="p-5 border-b border-[var(--bg-card)] flex justify-between items-center sticky top-0 bg-[var(--bg-main)]/80 backdrop-blur z-10">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-main)]">Проекты</h2>
            <p className="text-sm text-[var(--text-muted)]">Стратегическое управление</p>
          </div>
          <button 
            onClick={() => setIsCreatingProject(true)}
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
                  className="glass-panel group p-5 rounded-2xl relative overflow-hidden cursor-pointer hover:border-[var(--text-muted)] transition-all active:scale-[0.98]"
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
       </div>

       {/* Create Project Modal */}
       {isCreatingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="glass-card w-full max-w-md rounded-3xl border border-[var(--border-color)] p-6 shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-[var(--text-main)]">Новый проект</h3>
                      <button onClick={() => setIsCreatingProject(false)} className="p-2 hover:bg-[var(--bg-item)] rounded-full text-[var(--text-muted)]">
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
                        onClick={handleCreateProject}
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

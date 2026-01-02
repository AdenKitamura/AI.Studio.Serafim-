
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Project, Task, Thought, Priority, ProjectColumn, Attachment } from '../types';
import { 
  Folder, Plus, Trash2, ArrowLeft, 
  CheckCircle, Layers, X, Target,
  Calendar, Clock, AlertCircle, Paperclip,
  Link as LinkIcon, FileText, Image as ImageIcon,
  MoreVertical, Layout, Grid, List, Edit2, Move,
  ChevronRight, Mic
} from 'lucide-react';
import TaskItem from './TaskItem';
import WhiteboardView from './WhiteboardView'; 
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';

interface ExtendedProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  thoughts: Thought[];
  onAddProject: (project: Project) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void; // Added for column management
  onDeleteProject: (id: string) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onAddThought: (thought: Thought) => void;
  onUpdateThought: (thought: Thought) => void;
  onDeleteThought: (id: string) => void;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

const ProjectsView: React.FC<ExtendedProjectsViewProps> = ({ 
  projects, tasks, thoughts, 
  onAddProject, onUpdateProject, onDeleteProject, 
  onAddTask, onUpdateTask, onToggleTask, onDeleteTask,
  onAddThought, onUpdateThought, onDeleteThought
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [activeTab, setActiveTab] = useState<'board' | 'canvas'>('board');
  
  // --- TASK MODAL STATE ---
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<{
    title: string; 
    priority: Priority; 
    date: string; 
    time: string;
    columnId: string;
    attachments: Attachment[];
  }>({ 
    title: '', priority: Priority.MEDIUM, date: '', time: '', columnId: '', attachments: [] 
  });

  // --- PROJECT CREATION STATE ---
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(COLORS[5]);

  // --- ATTACHMENT REFS ---
  const taskFileInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Initialize columns if missing
  useEffect(() => {
    if (selectedProject && (!selectedProject.columns || selectedProject.columns.length === 0)) {
        onUpdateProject(selectedProject.id, {
            columns: [
                { id: 'c1', title: 'Нужно сделать', order: 0 },
                { id: 'c2', title: 'В работе', order: 1 },
                { id: 'c3', title: 'Готово', order: 2 }
            ]
        });
    }
  }, [selectedProject]);

  // --- HANDLERS ---

  const handleCreateProject = () => {
    if (!newTitle.trim()) return;
    onAddProject({
      id: Date.now().toString(),
      title: newTitle,
      description: newDesc,
      color: newColor,
      createdAt: new Date().toISOString(),
      columns: [
          { id: 'c1', title: 'Нужно сделать', order: 0 },
          { id: 'c2', title: 'В работе', order: 1 },
          { id: 'c3', title: 'Готово', order: 2 }
      ]
    });
    setNewTitle(''); setNewDesc(''); setIsCreatingProject(false);
  };

  // --- TASK MANAGEMENT ---

  const openTaskModal = (task?: Task, defaultColumnId?: string) => {
    if (task) {
      setEditingTask(task);
      const d = task.dueDate ? new Date(task.dueDate) : null;
      setTaskForm({
        title: task.title,
        priority: task.priority,
        date: d ? format(d, 'yyyy-MM-dd') : '',
        time: d ? format(d, 'HH:mm') : '',
        columnId: task.columnId || selectedProject?.columns?.[0].id || 'c1',
        attachments: task.attachments || []
      });
    } else {
      setEditingTask(null);
      setTaskForm({ 
          title: '', 
          priority: Priority.MEDIUM, 
          date: '', 
          time: '',
          columnId: defaultColumnId || selectedProject?.columns?.[0].id || 'c1',
          attachments: []
      });
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
        d.setHours(23, 59);
      }
      dueDate = d.toISOString();
    }

    const taskData = {
        title: taskForm.title,
        priority: taskForm.priority,
        dueDate: dueDate,
        columnId: taskForm.columnId,
        attachments: taskForm.attachments
    };

    if (editingTask) {
      onUpdateTask(editingTask.id, taskData);
    } else {
      onAddTask({
        id: Date.now().toString(),
        ...taskData,
        isCompleted: false,
        projectId: selectedProjectId,
        createdAt: new Date().toISOString()
      });
    }
    setIsTaskModalOpen(false);
  };

  // --- ATTACHMENT HANDLERS ---
  const handleTaskAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
          const newAtt: Attachment = {
              id: Date.now().toString(),
              type: file.type.startsWith('image/') ? 'image' : 'file',
              content: reader.result as string,
              name: file.name
          };
          setTaskForm(prev => ({ ...prev, attachments: [...prev.attachments, newAtt] }));
      };
      reader.readAsDataURL(file);
  };

  const handleAddLinkToTask = () => {
      const url = prompt("URL:");
      if (url) {
          const newAtt: Attachment = {
              id: Date.now().toString(),
              type: 'link',
              content: url,
              name: url
          };
          setTaskForm(prev => ({ ...prev, attachments: [...prev.attachments, newAtt] }));
      }
  };

  const removeAttachment = (attId: string) => {
      setTaskForm(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== attId) }));
  };

  // --- COLUMN MANAGEMENT ---
  const handleAddColumn = () => {
      const title = prompt("Название категории:");
      if (title && selectedProject) {
          const newCol = { id: Date.now().toString(), title, order: (selectedProject.columns?.length || 0) };
          onUpdateProject(selectedProject.id, {
              columns: [...(selectedProject.columns || []), newCol]
          });
      }
  };

  const handleRenameColumn = (colId: string) => {
      const col = selectedProject?.columns?.find(c => c.id === colId);
      if(!col || !selectedProject) return;
      const newTitle = prompt("Новое название:", col.title);
      if (newTitle) {
          const updatedCols = selectedProject.columns!.map(c => c.id === colId ? {...c, title: newTitle} : c);
          onUpdateProject(selectedProject.id, { columns: updatedCols });
      }
  };

  // --- RENDER DETAIL VIEW ---
  if (selectedProject) {
    const projectTasks = tasks.filter(t => t.projectId === selectedProject.id);
    const columns = selectedProject.columns || [];
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
              { id: 'board', label: 'ЗАДАЧИ', icon: <List size={14} /> },
              { id: 'canvas', label: 'ВОР-РУМ', icon: <Layout size={14} /> },
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
          
          {/* 1. KANBAN BOARD TAB */}
          {activeTab === 'board' && (
            <div className="h-full overflow-x-auto overflow-y-hidden p-4 pb-20">
               <div className="flex gap-4 h-full">
                   {columns.map(col => {
                       const colTasks = projectTasks.filter(t => (t.columnId === col.id) || (!t.columnId && col.id === columns[0].id));
                       
                       return (
                           <div key={col.id} className="flex-none w-72 flex flex-col h-full bg-[var(--bg-item)]/30 rounded-2xl border border-[var(--border-color)]">
                               {/* Column Header */}
                               <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-item)] rounded-t-2xl">
                                   <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">{col.title}</span>
                                   <div className="flex gap-1">
                                       <button onClick={() => handleRenameColumn(col.id)} className="p-1 hover:text-[var(--text-main)] text-[var(--text-muted)]"><Edit2 size={12} /></button>
                                       <button onClick={() => openTaskModal(undefined, col.id)} className="p-1 hover:text-[var(--accent)] text-[var(--text-muted)]"><Plus size={14} /></button>
                                   </div>
                               </div>
                               
                               {/* Column Content */}
                               <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                                   {colTasks.map(task => (
                                       <div 
                                          key={task.id} 
                                          onClick={() => openTaskModal(task)}
                                          className="p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] shadow-sm hover:border-[var(--accent)] transition-all cursor-pointer group relative"
                                       >
                                           <div className="flex justify-between items-start mb-2">
                                               <p className={`text-sm font-bold leading-tight ${task.isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>{task.title}</p>
                                               <div className={`w-2 h-2 rounded-full ${task.priority === Priority.HIGH ? 'bg-red-500' : task.priority === Priority.MEDIUM ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                           </div>
                                           
                                           <div className="flex items-center gap-2 text-[9px] font-black uppercase text-[var(--text-muted)]">
                                               {task.dueDate ? (
                                                   <span className="flex items-center gap-1 text-[var(--accent)]"><Clock size={10} /> {format(new Date(task.dueDate), 'd MMM')}</span>
                                               ) : (
                                                   <span className="opacity-50">Без даты</span>
                                               )}
                                               {task.attachments && task.attachments.length > 0 && (
                                                   <span className="flex items-center gap-1"><Paperclip size={10} /> {task.attachments.length}</span>
                                               )}
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       );
                   })}
                   
                   {/* Add Column Button */}
                   <button 
                      onClick={handleAddColumn}
                      className="flex-none w-12 h-full rounded-2xl border-2 border-dashed border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)] transition-all"
                   >
                       <span className="rotate-90 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Новая колонка</span>
                   </button>
               </div>
            </div>
          )}

          {/* 2. INFINITE CANVAS TAB (War Room) */}
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

        </div>

        {/* TASK MODAL (Create / Edit) */}
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in-95">
            <div className="w-full max-w-sm glass-card rounded-[2.5rem] p-6 shadow-2xl border border-white/10 max-h-[85vh] overflow-y-auto no-scrollbar">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">
                   {editingTask ? 'Редактировать' : 'Новая задача'}
                 </h3>
                 <button onClick={() => setIsTaskModalOpen(false)}><X size={20} className="text-[var(--text-muted)]" /></button>
               </div>

               <div className="space-y-5">
                 <input 
                   autoFocus
                   value={taskForm.title}
                   onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                   placeholder="Название задачи..."
                   className="w-full bg-transparent text-xl font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/30 outline-none pb-2 border-b border-[var(--border-color)] focus:border-[var(--accent)] transition-colors"
                 />

                 {/* Column & Priority */}
                 <div className="grid grid-cols-2 gap-3">
                     <div>
                         <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Категория</label>
                         <select 
                            value={taskForm.columnId}
                            onChange={(e) => setTaskForm({...taskForm, columnId: e.target.value})}
                            className="w-full bg-[var(--bg-main)] text-xs text-[var(--text-main)] p-2 rounded-xl border border-[var(--border-color)] outline-none"
                         >
                             {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                         </select>
                     </div>
                     <div>
                         <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Приоритет</label>
                         <select 
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm({...taskForm, priority: e.target.value as Priority})}
                            className="w-full bg-[var(--bg-main)] text-xs text-[var(--text-main)] p-2 rounded-xl border border-[var(--border-color)] outline-none"
                         >
                             <option value={Priority.LOW}>Низкий</option>
                             <option value={Priority.MEDIUM}>Средний</option>
                             <option value={Priority.HIGH}>Высокий</option>
                         </select>
                     </div>
                 </div>

                 {/* Date & Time (Optional) */}
                 <div>
                   <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 block">Сроки (Необязательно)</label>
                   <div className="flex gap-3">
                     <div className="flex-1 bg-[var(--bg-main)] rounded-xl px-3 py-2 border border-[var(--border-color)] flex items-center gap-2">
                        <Calendar size={14} className="text-[var(--accent)]" />
                        <input 
                          type="date" 
                          value={taskForm.date} 
                          onChange={e => setTaskForm({...taskForm, date: e.target.value})}
                          className="bg-transparent text-xs font-bold text-[var(--text-main)] outline-none w-full"
                        />
                     </div>
                     <div className="flex-1 bg-[var(--bg-main)] rounded-xl px-3 py-2 border border-[var(--border-color)] flex items-center gap-2">
                        <Clock size={14} className="text-[var(--accent)]" />
                        <input 
                          type="time" 
                          value={taskForm.time} 
                          onChange={e => setTaskForm({...taskForm, time: e.target.value})}
                          className="bg-transparent text-xs font-bold text-[var(--text-main)] outline-none w-full"
                        />
                     </div>
                   </div>
                 </div>

                 {/* Attachments */}
                 <div>
                     <div className="flex justify-between items-center mb-2">
                         <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Вложения</label>
                         <div className="flex gap-2">
                             <button onClick={handleAddLinkToTask} className="p-1 bg-[var(--bg-item)] rounded hover:text-[var(--accent)]"><LinkIcon size={12}/></button>
                             <button onClick={() => taskFileInputRef.current?.click()} className="p-1 bg-[var(--bg-item)] rounded hover:text-[var(--accent)]"><Paperclip size={12}/></button>
                             <input type="file" ref={taskFileInputRef} className="hidden" onChange={handleTaskAttachment} />
                         </div>
                     </div>
                     <div className="space-y-2">
                         {taskForm.attachments.map(att => (
                             <div key={att.id} className="flex items-center gap-2 p-2 bg-[var(--bg-item)] rounded-lg border border-[var(--border-color)]">
                                 {att.type === 'image' ? <ImageIcon size={14} className="text-purple-400"/> : att.type === 'link' ? <LinkIcon size={14} className="text-blue-400"/> : <FileText size={14} className="text-orange-400"/>}
                                 <span className="flex-1 text-[10px] text-[var(--text-main)] truncate">{att.name}</span>
                                 <button onClick={() => removeAttachment(att.id)} className="text-[var(--text-muted)] hover:text-red-500"><X size={12}/></button>
                             </div>
                         ))}
                         {taskForm.attachments.length === 0 && <p className="text-[10px] text-[var(--text-muted)] opacity-50 italic">Нет вложений</p>}
                     </div>
                 </div>

                 <div className="flex gap-2 pt-2">
                    {editingTask && (
                        <button 
                            onClick={() => { onDeleteTask(editingTask.id); setIsTaskModalOpen(false); }}
                            className="p-4 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button 
                        onClick={saveTask}
                        disabled={!taskForm.title.trim()}
                        className="flex-1 py-4 bg-[var(--text-main)] text-[var(--bg-main)] rounded-xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        Сохранить
                    </button>
                 </div>
               </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // --- DASHBOARD LIST VIEW (Fixed Grid) ---
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

       <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4 pb-10">
              {projects.map(project => {
                 const pTasks = tasks.filter(t => t.projectId === project.id);
                 const completed = pTasks.filter(t => t.isCompleted).length;
                 const progress = pTasks.length > 0 ? (completed / pTasks.length) * 100 : 0;
                 
                 return (
                   <div 
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className="glass-panel group p-5 rounded-2xl relative overflow-hidden cursor-pointer hover:border-[var(--text-muted)] transition-all active:scale-[0.98] flex flex-col justify-between min-h-[160px]"
                   >
                       <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: project.color }}></div>
                       
                       <div>
                           <div className="flex justify-between items-start mb-3">
                               <div className="p-2 rounded-lg bg-[var(--bg-main)]">
                                  <Folder size={24} color={project.color} />
                               </div>
                               <div className="text-xs font-bold text-[var(--text-muted)] px-2 py-1 rounded-md bg-[var(--bg-main)]">
                                   {pTasks.length}
                               </div>
                           </div>

                           <h3 className="text-sm font-bold text-[var(--text-main)] mb-1 line-clamp-2">{project.title}</h3>
                       </div>

                       <div>
                           {/* Progress Bar */}
                           <div className="w-full h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden mt-4">
                               <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: project.color }}></div>
                           </div>
                       </div>
                   </div>
                 )
              })}
          </div>
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

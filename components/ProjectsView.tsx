
import React, { useState, useRef, useEffect } from 'react';
import { Project, Task, Thought, Priority, ProjectColumn, Attachment, ProjectBoard } from '../types';
import { 
  Folder, Plus, Trash2, ArrowLeft, 
  CheckCircle, Layers, X, Target,
  Calendar, Clock, AlertCircle, Paperclip,
  Link as LinkIcon, FileText, Image as ImageIcon,
  MoreVertical, Layout, Grid, List, Edit2, Move,
  ChevronRight, Mic, Palette, Maximize2, Download, Eye
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
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
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
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#808080'
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
  
  // --- STATE ---
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null); 
  const [isTaskCreateOpen, setIsTaskCreateOpen] = useState(false); 
  const [createColumnId, setCreateColumnId] = useState<string>('');
  
  // Preview State
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  // Task Form (Shared)
  const [taskForm, setTaskForm] = useState<{
    title: string; 
    priority: Priority; 
    date: string; 
    time: string;
    columnId: string;
    description: string;
    attachments: Attachment[];
  }>({ 
    title: '', priority: Priority.MEDIUM, date: '', time: '', columnId: '', description: '', attachments: [] 
  });

  // Project Creation
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(COLORS[5]);

  const detailFileInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Init Data
  useEffect(() => {
    if (selectedProject) {
        if (!selectedProject.columns || selectedProject.columns.length === 0) {
            onUpdateProject(selectedProject.id, {
                columns: [
                    { id: 'c1', title: 'Нужно сделать', order: 0, color: COLORS[8] },
                    { id: 'c2', title: 'В работе', order: 1, color: COLORS[2] },
                    { id: 'c3', title: 'Готово', order: 2, color: COLORS[3] }
                ]
            });
        }
        if (!selectedProject.boards || selectedProject.boards.length === 0) {
             const mainBoardId = `b-${Date.now()}`;
             onUpdateProject(selectedProject.id, {
                 boards: [{ id: mainBoardId, title: 'Главная доска' }]
             });
             setActiveBoardId(mainBoardId);
        } else if (!activeBoardId) {
            setActiveBoardId(selectedProject.boards[0].id);
        }
    }
  }, [selectedProject]);

  // --- ACTIONS ---

  const handleCreateProject = () => {
    if (!newTitle.trim()) return;
    onAddProject({
      id: Date.now().toString(),
      title: newTitle,
      description: newDesc,
      color: newColor,
      createdAt: new Date().toISOString(),
      columns: [
          { id: 'c1', title: 'Нужно сделать', order: 0, color: COLORS[8] },
          { id: 'c2', title: 'В работе', order: 1, color: COLORS[2] },
          { id: 'c3', title: 'Готово', order: 2, color: COLORS[3] }
      ],
      boards: [{ id: `b-${Date.now()}`, title: 'Главная доска' }]
    });
    setNewTitle(''); setNewDesc(''); setIsCreatingProject(false);
  };

  // --- TASK MANAGEMENT ---

  const openCreateModal = (colId?: string) => {
      setViewingTask(null);
      setTaskForm({ 
          title: '', priority: Priority.MEDIUM, date: '', time: '', description: '',
          columnId: colId || selectedProject?.columns?.[0].id || 'c1', attachments: []
      });
      setCreateColumnId(colId || '');
      setIsTaskCreateOpen(true);
  };

  const openDetailModal = (task: Task) => {
      setIsTaskCreateOpen(false);
      setViewingTask(task);
      const d = task.dueDate ? new Date(task.dueDate) : null;
      setTaskForm({
        title: task.title,
        priority: task.priority,
        date: d ? format(d, 'yyyy-MM-dd') : '',
        time: d ? format(d, 'HH:mm') : '',
        columnId: task.columnId || selectedProject?.columns?.[0].id || 'c1',
        description: task.description || '',
        attachments: task.attachments || []
      });
  };

  const saveTask = (isUpdate: boolean) => {
    if (!taskForm.title.trim() || !selectedProjectId) return;

    let dueDate = null;
    if (taskForm.date) {
      const d = new Date(taskForm.date);
      if (taskForm.time) {
        const [h, m] = taskForm.time.split(':').map(Number);
        d.setHours(h, m);
      } else { d.setHours(23, 59); }
      dueDate = d.toISOString();
    }

    const taskData = {
        title: taskForm.title,
        priority: taskForm.priority,
        dueDate: dueDate,
        columnId: taskForm.columnId,
        description: taskForm.description,
        attachments: taskForm.attachments
    };

    if (isUpdate && viewingTask) {
      onUpdateTask(viewingTask.id, taskData);
      setViewingTask({ ...viewingTask, ...taskData }); 
    } else {
      onAddTask({
        id: Date.now().toString(),
        ...taskData,
        isCompleted: false,
        projectId: selectedProjectId,
        createdAt: new Date().toISOString()
      });
      setIsTaskCreateOpen(false);
    }
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>, isDetail: boolean) => {
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
          const newAttachments = [...taskForm.attachments, newAtt];
          setTaskForm(prev => ({ ...prev, attachments: newAttachments }));
          
          if (isDetail && viewingTask) {
              onUpdateTask(viewingTask.id, { attachments: newAttachments });
          }
      };
      reader.readAsDataURL(file);
  };

  const handleDeleteAttachment = (e: React.MouseEvent, attId: string) => {
      e.stopPropagation();
      const newAttachments = taskForm.attachments.filter(a => a.id !== attId);
      setTaskForm(prev => ({ ...prev, attachments: newAttachments }));
      if (viewingTask) {
          onUpdateTask(viewingTask.id, { attachments: newAttachments });
      }
  };

  const handleAddBoard = () => {
      const title = prompt("Название доски:");
      if(title && selectedProject) {
          const newBoard = { id: `b-${Date.now()}`, title };
          onUpdateProject(selectedProject.id, { boards: [...(selectedProject.boards || []), newBoard] });
          setActiveBoardId(newBoard.id);
      }
  };

  const handleChangeColumnColor = (colId: string) => {
      const col = selectedProject?.columns?.find(c => c.id === colId);
      if(!col || !selectedProject) return;
      const nextColor = COLORS[(COLORS.indexOf(col.color || COLORS[0]) + 1) % COLORS.length];
      const updated = selectedProject.columns!.map(c => c.id === colId ? {...c, color: nextColor} : c);
      onUpdateProject(selectedProject.id, { columns: updated });
  };

  // --- RENDER ---
  if (selectedProject) {
    const projectTasks = tasks.filter(t => t.projectId === selectedProject.id);
    const columns = selectedProject.columns || [];
    const projectNodes = thoughts.filter(t => t.projectId === selectedProject.id && t.boardId === activeBoardId);

    // FULL SCREEN BOARD MODE
    if (activeTab === 'canvas') {
        return (
            <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex flex-col">
                <div className="absolute top-4 left-4 z-50 flex items-center gap-2 pointer-events-none">
                    <button onClick={() => setActiveTab('board')} className="pointer-events-auto p-3 bg-white/10 backdrop-blur rounded-full text-white hover:bg-white/20 transition-all shadow-lg">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="pointer-events-auto flex items-center gap-1 bg-black/50 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10">
                        {selectedProject.boards?.map(board => (
                            <button 
                                key={board.id}
                                onClick={() => setActiveBoardId(board.id)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeBoardId === board.id ? 'bg-[var(--accent)] text-white' : 'text-white/50 hover:text-white'}`}
                            >
                                {board.title}
                            </button>
                        ))}
                        <button onClick={handleAddBoard} className="p-2 text-white/50 hover:text-white"><Plus size={14}/></button>
                    </div>
                </div>

                <WhiteboardView 
                    thoughts={projectNodes}
                    activeBoardId={activeBoardId || 'default'}
                    onAdd={(t) => onAddThought({ ...t, projectId: selectedProject.id, boardId: activeBoardId || 'default' })}
                    onUpdate={onUpdateThought}
                    onDelete={onDeleteThought}
                />
            </div>
        );
    }

    // STANDARD PROJECT VIEW
    return (
      <div className="flex flex-col h-full bg-[var(--bg-main)] animate-in slide-in-from-right duration-300">
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
               </div>
            </div>
            <button onClick={() => { if(confirm('Удалить проект?')) { onDeleteProject(selectedProject.id); setSelectedProjectId(null); } }} className="text-[var(--text-muted)] hover:text-red-500">
              <Trash2 size={20} />
            </button>
          </div>

          <div className="flex bg-[var(--bg-item)] p-1 rounded-xl border border-[var(--border-color)]">
            <button onClick={() => setActiveTab('board')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'board' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}>
                <List size={14} /> ЗАДАЧИ
            </button>
            <button onClick={() => setActiveTab('canvas')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'canvas' ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}>
                <Layout size={14} /> ДОСКА
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-x-auto overflow-y-hidden p-4 pb-20">
               <div className="flex gap-4 h-full">
                   {columns.map(col => {
                       const colTasks = projectTasks.filter(t => (t.columnId === col.id) || (!t.columnId && col.id === columns[0].id));
                       return (
                           <div key={col.id} className="flex-none w-72 flex flex-col h-full bg-[var(--bg-item)]/30 rounded-2xl border border-[var(--border-color)]">
                               <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-item)] rounded-t-2xl relative overflow-hidden">
                                   <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: col.color || COLORS[0] }}></div>
                                   <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">{col.title}</span>
                                   <div className="flex gap-1">
                                       <button onClick={() => handleChangeColumnColor(col.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"><Palette size={12} /></button>
                                       <button onClick={() => openCreateModal(col.id)} className="p-1 hover:text-[var(--accent)] text-[var(--text-muted)]"><Plus size={14} /></button>
                                   </div>
                               </div>
                               <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                                   {colTasks.map(task => (
                                       <div key={task.id} onClick={() => openDetailModal(task)} className="p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] shadow-sm hover:border-[var(--accent)] transition-all cursor-pointer group hover:scale-[1.02]">
                                           <div className="flex justify-between items-start mb-2">
                                               <p className={`text-sm font-bold leading-tight ${task.isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>{task.title}</p>
                                               <div className={`w-2 h-2 rounded-full ${task.priority === Priority.HIGH ? 'bg-red-500' : task.priority === Priority.MEDIUM ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                           </div>
                                           <div className="flex items-center gap-2 text-[9px] font-black uppercase text-[var(--text-muted)]">
                                               {task.dueDate && <span className="flex items-center gap-1 text-[var(--accent)]"><Clock size={10} /> {format(new Date(task.dueDate), 'd MMM')}</span>}
                                               {task.attachments && task.attachments.length > 0 && <span className="flex items-center gap-1"><Paperclip size={10} /> {task.attachments.length}</span>}
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       );
                   })}
               </div>
            </div>
        </div>

        {/* TASK MODALS (Create/Detail) */}
        {isTaskCreateOpen && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in-95">
            <div className="w-full max-w-sm glass-card rounded-[2.5rem] p-6 shadow-2xl border border-white/10">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Новая задача</h3>
                 <button onClick={() => setIsTaskCreateOpen(false)}><X size={20} className="text-[var(--text-muted)]" /></button>
               </div>
               <input autoFocus value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="Название..." className="w-full bg-transparent text-xl font-bold text-[var(--text-main)] outline-none pb-2 border-b border-[var(--border-color)] mb-4" />
               <div className="flex gap-2">
                   <input type="date" className="bg-[var(--bg-item)] p-2 rounded-lg text-xs text-white outline-none" value={taskForm.date} onChange={e => setTaskForm({...taskForm, date: e.target.value})} />
                   <button onClick={() => saveTask(false)} className="flex-1 py-2 bg-[var(--text-main)] text-[var(--bg-main)] rounded-lg font-bold text-xs uppercase">Создать</button>
               </div>
            </div>
          </div>
        )}

        {viewingTask && (
            <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex justify-end animate-in slide-in-from-right duration-300">
                <div className="w-full max-w-md h-full bg-[var(--bg-main)] border-l border-[var(--border-color)] flex flex-col shadow-2xl">
                    <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-start">
                        <div className="flex-1 mr-4">
                            <textarea value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-transparent text-2xl font-black text-[var(--text-main)] outline-none resize-none leading-tight" rows={2} />
                            <div className="flex items-center gap-2 mt-2">
                                <select value={taskForm.columnId} onChange={e => setTaskForm({...taskForm, columnId: e.target.value})} className="bg-[var(--bg-item)] text-[var(--text-muted)] text-[10px] font-bold uppercase py-1 px-2 rounded-lg border border-[var(--border-color)] outline-none">
                                    {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                                <select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value as Priority})} className="bg-[var(--bg-item)] text-[var(--text-muted)] text-[10px] font-bold uppercase py-1 px-2 rounded-lg border border-[var(--border-color)] outline-none">
                                    <option value={Priority.LOW}>Низкий</option><option value={Priority.MEDIUM}>Средний</option><option value={Priority.HIGH}>Высокий</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={() => { saveTask(true); setViewingTask(null); }} className="p-2 bg-[var(--bg-item)] rounded-full hover:text-[var(--text-main)] text-[var(--text-muted)] transition-colors"><X size={24} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                        <div>
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Дедлайн</label>
                            <div className="flex gap-3">
                                <div className="flex items-center gap-2 bg-[var(--bg-item)] p-3 rounded-xl border border-[var(--border-color)] flex-1"><Calendar size={16} className="text-[var(--accent)]" /><input type="date" value={taskForm.date} onChange={e => setTaskForm({...taskForm, date: e.target.value})} className="bg-transparent text-sm text-[var(--text-main)] outline-none w-full"/></div>
                                <div className="flex items-center gap-2 bg-[var(--bg-item)] p-3 rounded-xl border border-[var(--border-color)] flex-1"><Clock size={16} className="text-[var(--accent)]" /><input type="time" value={taskForm.time} onChange={e => setTaskForm({...taskForm, time: e.target.value})} className="bg-transparent text-sm text-[var(--text-main)] outline-none w-full"/></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Вложения ({taskForm.attachments.length})</label>
                                <button onClick={() => detailFileInputRef.current?.click()} className="text-[var(--accent)] text-[10px] font-bold uppercase hover:underline">+ Добавить</button>
                                <input type="file" ref={detailFileInputRef} className="hidden" onChange={e => handleAttachment(e, true)} />
                            </div>
                            {taskForm.attachments.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {taskForm.attachments.map(att => (
                                        <div key={att.id} onClick={() => setPreviewAttachment(att)} className="relative group rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-item)] aspect-square flex flex-col cursor-zoom-in">
                                            {att.type === 'image' ? <img src={att.content} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><FileText size={32}/></div>}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"><Eye size={24} className="text-white" /></div>
                                            <button onClick={(e) => handleDeleteAttachment(e, att.id)} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white/70 hover:text-red-500 rounded-full hover:bg-black/70 pointer-events-auto"><Trash2 size={14}/></button>
                                            <div className="absolute bottom-0 w-full p-2 bg-black/60 backdrop-blur-sm text-[9px] text-white truncate">{att.name}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (<div onClick={() => detailFileInputRef.current?.click()} className="h-24 border-2 border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text-main)] cursor-pointer transition-all"><Paperclip size={20} className="mb-2" /><span className="text-[9px] font-bold uppercase">Перетащите файлы</span></div>)}
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Заметки</label>
                            <textarea value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} placeholder="Детали задачи..." className="w-full bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] min-h-[150px] outline-none focus:border-[var(--accent)] resize-none" />
                        </div>
                        <button onClick={() => { onDeleteTask(viewingTask.id); setViewingTask(null); }} className="w-full py-4 border border-red-500/30 text-red-500 rounded-2xl font-bold uppercase text-xs hover:bg-red-500/10 transition-all">Удалить задачу</button>
                    </div>
                    <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]">
                        <button onClick={() => { saveTask(true); setViewingTask(null); }} className="w-full py-4 bg-[var(--text-main)] text-[var(--bg-main)] rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">Сохранить изменения</button>
                    </div>
                </div>
            </div>
        )}

        {previewAttachment && (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in zoom-in-95" onClick={() => setPreviewAttachment(null)}>
                <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
                    {previewAttachment.type === 'image' ? <img src={previewAttachment.content} className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" /> : <div className="w-80 h-80 bg-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 text-white"><FileText size={64} /><p className="text-xl font-bold">{previewAttachment.name}</p><a href={previewAttachment.content} download className="px-6 py-2 bg-[var(--accent)] rounded-lg font-bold">Скачать</a></div>}
                    <button onClick={() => setPreviewAttachment(null)} className="absolute -top-12 right-0 text-white/50 hover:text-white p-2"><X size={32} /></button>
                </div>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] pb-24">
       {/* List view logic remains same ... */}
       <div className="p-5 border-b border-[var(--bg-card)] flex justify-between items-center sticky top-0 bg-[var(--bg-main)]/80 backdrop-blur z-10">
          <div><h2 className="text-2xl font-bold text-[var(--text-main)]">Проекты</h2><p className="text-sm text-[var(--text-muted)]">Стратегическое управление</p></div>
          <button onClick={() => setIsCreatingProject(true)} className="p-3 bg-[var(--text-main)] text-[var(--bg-main)] rounded-full hover:scale-110 transition-transform shadow-lg"><Plus size={20} /></button>
       </div>
       <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4 pb-10">
              {projects.map(project => {
                 const pTasks = tasks.filter(t => t.projectId === project.id);
                 const completed = pTasks.filter(t => t.isCompleted).length;
                 const progress = pTasks.length > 0 ? (completed / pTasks.length) * 100 : 0;
                 return (
                   <div key={project.id} onClick={() => setSelectedProjectId(project.id)} className="glass-panel group p-5 rounded-2xl relative overflow-hidden cursor-pointer hover:border-[var(--text-muted)] transition-all active:scale-[0.98] flex flex-col justify-between min-h-[160px]">
                       <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: project.color }}></div>
                       <div><div className="flex justify-between items-start mb-3"><div className="p-2 rounded-lg bg-[var(--bg-main)]"><Folder size={24} color={project.color} /></div><div className="text-xs font-bold text-[var(--text-muted)] px-2 py-1 rounded-md bg-[var(--bg-main)]">{pTasks.length}</div></div><h3 className="text-sm font-bold text-[var(--text-main)] mb-1 line-clamp-2">{project.title}</h3></div>
                       <div><div className="w-full h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden mt-4"><div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: project.color }}></div></div></div>
                   </div>
                 )
              })}
          </div>
       </div>
       {isCreatingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="glass-card w-full max-w-md rounded-3xl border border-[var(--border-color)] p-6 shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-[var(--text-main)]">Новый проект</h3><button onClick={() => setIsCreatingProject(false)} className="p-2 hover:bg-[var(--bg-item)] rounded-full text-[var(--text-muted)]"><X size={20} /></button></div>
                  <div className="space-y-4">
                      <div><label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Название</label><input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full bg-[var(--bg-item)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-main)] focus:border-[var(--accent)] outline-none" placeholder="Например: Здоровье" /></div>
                      <div><label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Описание</label><textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="w-full bg-[var(--bg-item)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-main)] focus:border-[var(--accent)] outline-none resize-none h-24" placeholder="Краткое описание целей..." /></div>
                      <div><label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Цвет</label><div className="flex gap-3 flex-wrap">{COLORS.map(c => (<button key={c} onClick={() => setNewColor(c)} className={`w-8 h-8 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-[var(--text-main)] ring-offset-2 ring-offset-[var(--bg-main)]' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />))}</div></div>
                      <button onClick={handleCreateProject} disabled={!newTitle.trim()} className="w-full py-4 mt-4 bg-[var(--text-main)] text-[var(--bg-main)] rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-opacity">Создать проект</button>
                  </div>
              </div>
          </div>
       )}
    </div>
  );
};

export default ProjectsView;

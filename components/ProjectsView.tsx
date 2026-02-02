import React, { useState, useRef, useEffect } from 'react';
import { Project, Task, Thought, Priority, Attachment } from '../types';
import { Folder, Plus, Trash2, ArrowLeft, Clock, Paperclip, Palette, X, Eye, FileText, GripVertical } from 'lucide-react';
import { format } from 'date-fns';

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
  onUpdateThought: (id: string, updates: Partial<Thought>) => void;
  onDeleteThought: (id: string) => void;
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#808080'];

const ProjectsView: React.FC<ExtendedProjectsViewProps> = ({ 
  projects, tasks, onAddProject, onUpdateProject, onDeleteProject, 
  onAddTask, onUpdateTask, onDeleteTask
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null); 
  const [isTaskCreateOpen, setIsTaskCreateOpen] = useState(false); 
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [taskForm, setTaskForm] = useState<{ title: string; priority: Priority; date: string; time: string; columnId: string; description: string; attachments: Attachment[]; }>({ title: '', priority: Priority.MEDIUM, date: '', time: '', columnId: '', description: '', attachments: [] });
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(COLORS[5]);
  const detailFileInputRef = useRef<HTMLInputElement>(null);
  
  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [touchDragTask, setTouchDragTask] = useState<{ id: string, title: string, x: number, y: number } | null>(null);
  const longPressTimer = useRef<any>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  useEffect(() => {
    if (selectedProject) {
        if (!selectedProject.columns || selectedProject.columns.length === 0) {
            onUpdateProject(selectedProject.id, {
                columns: [{ id: 'c1', title: 'Нужно сделать', order: 0, color: COLORS[8] }, { id: 'c2', title: 'В работе', order: 1, color: COLORS[2] }, { id: 'c3', title: 'Готово', order: 2, color: COLORS[3] }]
            });
        }
    }
  }, [selectedProject]);

  const handleCreateProject = () => {
    if (!newTitle.trim()) return;
    onAddProject({ id: Date.now().toString(), title: newTitle, description: newDesc, color: newColor, createdAt: new Date().toISOString(), columns: [{ id: 'c1', title: 'Нужно сделать', order: 0, color: COLORS[8] }, { id: 'c2', title: 'В работе', order: 1, color: COLORS[2] }, { id: 'c3', title: 'Готово', order: 2, color: COLORS[3] }], boards: [] });
    setNewTitle(''); setNewDesc(''); setIsCreatingProject(false);
  };

  const openCreateModal = (colId?: string) => { setViewingTask(null); setTaskForm({ title: '', priority: Priority.MEDIUM, date: '', time: '', description: '', columnId: colId || selectedProject?.columns?.[0].id || 'c1', attachments: [] }); setIsTaskCreateOpen(true); };
  const openDetailModal = (task: Task) => {
      setIsTaskCreateOpen(false); setViewingTask(task);
      const d = task.dueDate ? new Date(task.dueDate) : null;
      setTaskForm({ title: task.title, priority: task.priority, date: d ? format(d, 'yyyy-MM-dd') : '', time: d ? format(d, 'HH:mm') : '', columnId: task.columnId || selectedProject?.columns?.[0].id || 'c1', description: task.description || '', attachments: task.attachments || [] });
  };

  const saveTask = (isUpdate: boolean) => {
    if (!taskForm.title.trim() || !selectedProjectId) return;
    let dueDate = null;
    if (taskForm.date) { const d = new Date(taskForm.date); if (taskForm.time) { const [h, m] = taskForm.time.split(':').map(Number); d.setHours(h, m); } else { d.setHours(23, 59); } dueDate = d.toISOString(); }
    const taskData = { title: taskForm.title, priority: taskForm.priority, dueDate: dueDate, columnId: taskForm.columnId, description: taskForm.description, attachments: taskForm.attachments };
    if (isUpdate && viewingTask) { onUpdateTask(viewingTask.id, taskData); setViewingTask({ ...viewingTask, ...taskData }); } else { onAddTask({ id: Date.now().toString(), ...taskData, isCompleted: false, projectId: selectedProjectId, createdAt: new Date().toISOString() }); setIsTaskCreateOpen(false); }
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>, isDetail: boolean) => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
          const newAtt: Attachment = { id: Date.now().toString(), type: file.type.startsWith('image/') ? 'image' : 'file', content: reader.result as string, name: file.name };
          const newAttachments = [...taskForm.attachments, newAtt];
          setTaskForm(prev => ({ ...prev, attachments: newAttachments }));
          if (isDetail && viewingTask) { onUpdateTask(viewingTask.id, { attachments: newAttachments }); }
      }; reader.readAsDataURL(file);
  };

  const handleDeleteAttachment = (e: React.MouseEvent, attId: string) => { e.stopPropagation(); const newAttachments = taskForm.attachments.filter(a => a.id !== attId); setTaskForm(prev => ({ ...prev, attachments: newAttachments })); if (viewingTask) { onUpdateTask(viewingTask.id, { attachments: newAttachments }); } };
  const handleChangeColumnColor = (colId: string) => { const col = selectedProject?.columns?.find(c => c.id === colId); if(!col || !selectedProject) return; const nextColor = COLORS[(COLORS.indexOf(col.color || COLORS[0]) + 1) % COLORS.length]; const updated = selectedProject.columns!.map(c => c.id === colId ? {...c, color: nextColor} : c); onUpdateProject(selectedProject.id, { columns: updated }); };

  // --- LOGIC: MOVE TASK (Updates Progress if Done) ---
  const moveTask = (taskId: string, targetColId: string) => {
      const targetCol = selectedProject?.columns?.find(c => c.id === targetColId);
      // Determine if task is completed based on column (usually the last one or named 'Готово')
      // We assume the last column in the array is "Done" if not explicitly named
      const isDone = targetCol?.title === 'Готово' || targetCol?.id === 'c3' || (selectedProject?.columns && targetColId === selectedProject.columns[selectedProject.columns.length - 1].id);
      
      onUpdateTask(taskId, { columnId: targetColId, isCompleted: !!isDone });
  };

  // --- DND HANDLERS (MOUSE) ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      e.stopPropagation();
      setDraggedTaskId(taskId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
      e.preventDefault();
      if (draggedTaskId) {
          moveTask(draggedTaskId, targetColumnId);
          setDraggedTaskId(null);
      }
  };

  // --- TOUCH DND HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent, task: Task) => {
      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;

      longPressTimer.current = setTimeout(() => {
          setTouchDragTask({ id: task.id, title: task.title, x: startX, y: startY });
          if (navigator.vibrate) navigator.vibrate(50);
      }, 400); // 400ms long press trigger
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (longPressTimer.current && !touchDragTask) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
      if (touchDragTask) {
          e.preventDefault(); // Stop scroll ONLY when dragging
          const touch = e.touches[0];
          setTouchDragTask(prev => prev ? ({ ...prev, x: touch.clientX, y: touch.clientY }) : null);
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      
      if (touchDragTask) {
          const touch = e.changedTouches[0];
          // Find drop target manually via coordinates
          const element = document.elementFromPoint(touch.clientX, touch.clientY);
          const columnEl = element?.closest('[data-column-id]');
          
          if (columnEl) {
              const colId = columnEl.getAttribute('data-column-id');
              if (colId) moveTask(touchDragTask.id, colId);
          }
          setTouchDragTask(null);
      }
  };

  // --- PROJECT DETAIL VIEW (KANBAN) ---
  if (selectedProject) {
    const projectTasks = tasks.filter(t => t.projectId === selectedProject.id);
    const columns = selectedProject.columns || [];
    const completedCount = projectTasks.filter(t => t.isCompleted).length;
    const progress = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;

    return (
      <div 
        className="flex flex-col h-full bg-[var(--bg-main)] animate-in slide-in-from-right duration-300 max-w-[100vw] overflow-x-hidden"
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* Header */}
        <div className="p-6 pb-2 bg-[var(--bg-main)]/95 backdrop-blur z-20 sticky top-0 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
               <button onClick={() => setSelectedProjectId(null)} className="p-3 bg-[var(--bg-item)] hover:bg-[var(--bg-card)] rounded-xl transition-all border border-[var(--border-color)] group">
                  <ArrowLeft size={20} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
               </button>
               <div>
                  <h2 className="text-2xl font-black text-[var(--text-main)] leading-none flex items-center gap-2">
                     {selectedProject.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedProject.color }} />
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{completedCount} / {projectTasks.length} Задач</span>
                  </div>
               </div>
            </div>
            <button onClick={() => { if(confirm('Удалить проект?')) { onDeleteProject(selectedProject.id); setSelectedProjectId(null); } }} className="p-3 hover:bg-red-500/10 rounded-xl text-[var(--text-muted)] hover:text-red-500 transition-all">
                <Trash2 size={20} />
            </button>
          </div>
          
          <div className="w-full h-1 bg-[var(--bg-item)] rounded-full overflow-hidden mb-2">
              <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: selectedProject.color }}></div>
          </div>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-x-auto overflow-y-hidden p-6 pb-24">
               <div className="flex gap-6 h-full min-w-max"> 
                   {columns.map(col => {
                       const colTasks = projectTasks.filter(t => (t.columnId === col.id) || (!t.columnId && col.id === columns[0].id));
                       return (
                           <div 
                              key={col.id} 
                              data-column-id={col.id}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, col.id)}
                              className={`flex-none w-80 flex flex-col h-full bg-[var(--bg-item)]/40 rounded-[2rem] border border-[var(--border-color)] backdrop-blur-sm transition-colors ${touchDragTask ? 'border-dashed border-[var(--accent)] bg-[var(--accent)]/5' : ''}`}
                           >
                               <div className="p-4 flex justify-between items-center border-b border-[var(--border-color)]">
                                   <div className="flex items-center gap-3">
                                       <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: col.color || COLORS[0] }}></div>
                                       <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">{col.title}</span>
                                       <span className="bg-[var(--bg-main)] px-2 py-0.5 rounded-md text-[9px] font-bold text-[var(--text-muted)]">{colTasks.length}</span>
                                   </div>
                                   <div className="flex gap-1">
                                       <button onClick={() => handleChangeColumnColor(col.id)} className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg text-[var(--text-muted)] transition-colors"><Palette size={14} /></button>
                                       <button onClick={() => openCreateModal(col.id)} className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><Plus size={14} /></button>
                                   </div>
                               </div>
                               
                               <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                                   {colTasks.map(task => (
                                       <div 
                                          key={task.id} 
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, task.id)}
                                          onTouchStart={(e) => handleTouchStart(e, task)}
                                          onClick={() => openDetailModal(task)} 
                                          className={`
                                            p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] shadow-sm 
                                            hover:border-[var(--accent)] transition-all cursor-pointer group hover:scale-[1.02] active:scale-95 select-none
                                            ${draggedTaskId === task.id || touchDragTask?.id === task.id ? 'opacity-30' : ''}
                                          `}
                                       >
                                           <div className="flex justify-between items-start mb-3">
                                               <p className={`text-sm font-bold leading-snug ${task.isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>{task.title}</p>
                                               <div className="flex gap-2">
                                                 {task.priority === Priority.HIGH && <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                                                 <GripVertical size={14} className="text-[var(--text-muted)] opacity-20 group-hover:opacity-100" />
                                               </div>
                                           </div>
                                           <div className="flex items-center gap-3 text-[9px] font-black uppercase text-[var(--text-muted)]">
                                               {task.dueDate && <span className="flex items-center gap-1 bg-[var(--bg-item)] px-1.5 py-0.5 rounded"><Clock size={10} /> {format(new Date(task.dueDate), 'd MMM')}</span>}
                                               {task.attachments && task.attachments.length > 0 && <span className="flex items-center gap-1 bg-[var(--bg-item)] px-1.5 py-0.5 rounded"><Paperclip size={10} /> {task.attachments.length}</span>}
                                           </div>
                                       </div>
                                   ))}
                                   <button onClick={() => openCreateModal(col.id)} className="w-full py-3 border border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-muted)] text-xs font-bold uppercase hover:bg-[var(--bg-item)] hover:text-[var(--text-main)] transition-all opacity-50 hover:opacity-100">+ Добавить</button>
                               </div>
                           </div>
                       );
                   })}
               </div>
            </div>
        </div>

        {/* Touch Drag Overlay */}
        {touchDragTask && (
            <div 
                className="fixed z-[200] pointer-events-none p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--accent)] shadow-2xl w-64"
                style={{ 
                    left: touchDragTask.x, 
                    top: touchDragTask.y,
                    transform: 'translate(-50%, -50%) rotate(3deg)'
                }}
            >
                <p className="text-sm font-bold text-[var(--text-main)]">{touchDragTask.title}</p>
                <div className="mt-2 flex items-center gap-2 text-[var(--accent)]">
                    <GripVertical size={16} /> <span className="text-[10px] font-black uppercase">Перенос...</span>
                </div>
            </div>
        )}

        {/* Task Creation Modal */}
        {isTaskCreateOpen && (<div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in-95"><div className="w-full max-w-sm glass-card rounded-[2.5rem] p-6 shadow-2xl border border-white/10"><div className="flex justify-between items-center mb-6"><h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Новая задача</h3><button onClick={() => setIsTaskCreateOpen(false)}><X size={20} className="text-[var(--text-muted)]" /></button></div><input autoFocus value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="Название..." className="w-full bg-transparent text-xl font-bold text-[var(--text-main)] outline-none pb-2 border-b border-[var(--border-color)] mb-4" /><div className="flex gap-2"><input type="date" className="bg-[var(--bg-item)] p-2 rounded-lg text-xs text-white outline-none" value={taskForm.date} onChange={e => setTaskForm({...taskForm, date: e.target.value})} /><button onClick={() => saveTask(false)} className="flex-1 py-2 bg-[var(--text-main)] text-[var(--bg-main)] rounded-lg font-bold text-xs uppercase">Создать</button></div></div></div>)}
        
        {/* Task Detail Modal */}
        {viewingTask && (<div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex justify-end animate-in slide-in-from-right duration-300"><div className="w-full max-w-md h-full bg-[var(--bg-main)] border-l border-[var(--border-color)] flex flex-col shadow-2xl"><div className="p-6 border-b border-[var(--border-color)] flex justify-between items-start"><div className="flex-1 mr-4"><textarea value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-transparent text-2xl font-black text-[var(--text-main)] outline-none resize-none leading-tight" rows={2} /><div className="flex items-center gap-2 mt-2"><select value={taskForm.columnId} onChange={e => setTaskForm({...taskForm, columnId: e.target.value})} className="bg-[var(--bg-item)] text-[var(--text-muted)] text-[10px] font-bold uppercase py-1 px-2 rounded-lg border border-[var(--border-color)] outline-none">{columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select><select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value as Priority})} className="bg-[var(--bg-item)] text-[var(--text-muted)] text-[10px] font-bold uppercase py-1 px-2 rounded-lg border border-[var(--border-color)] outline-none"><option value={Priority.LOW}>Низкий</option><option value={Priority.MEDIUM}>Средний</option><option value={Priority.HIGH}>Высокий</option></select></div></div><button onClick={() => { saveTask(true); setViewingTask(null); }} className="p-2 bg-[var(--bg-item)] rounded-full hover:text-[var(--text-main)] text-[var(--text-muted)] transition-colors"><X size={24} /></button></div><div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar"><div><label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Дедлайн</label><div className="flex gap-3"><div className="flex items-center gap-2 bg-[var(--bg-item)] p-3 rounded-xl border border-[var(--border-color)] flex-1"><Clock size={16} className="text-[var(--accent)]" /><input type="date" value={taskForm.date} onChange={e => setTaskForm({...taskForm, date: e.target.value})} className="bg-transparent text-sm text-[var(--text-main)] outline-none w-full"/></div><div className="flex items-center gap-2 bg-[var(--bg-item)] p-3 rounded-xl border border-[var(--border-color)] flex-1"><Clock size={16} className="text-[var(--accent)]" /><input type="time" value={taskForm.time} onChange={e => setTaskForm({...taskForm, time: e.target.value})} className="bg-transparent text-sm text-[var(--text-main)] outline-none w-full"/></div></div></div><div><div className="flex justify-between items-center mb-3"><label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Вложения ({taskForm.attachments.length})</label><button onClick={() => detailFileInputRef.current?.click()} className="text-[var(--accent)] text-[10px] font-bold uppercase hover:underline">+ Добавить</button><input type="file" ref={detailFileInputRef} className="hidden" onChange={e => handleAttachment(e, true)} /></div>{taskForm.attachments.length > 0 ? (<div className="grid grid-cols-2 gap-3">{taskForm.attachments.map(att => (<div key={att.id} onClick={() => setPreviewAttachment(att)} className="relative group rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-item)] aspect-square flex flex-col cursor-zoom-in">{att.type === 'image' ? <img src={att.content} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><FileText size={32}/></div>}<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"><Eye size={24} className="text-white" /></div><button onClick={(e) => handleDeleteAttachment(e, att.id)} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white/70 hover:text-red-500 rounded-full hover:bg-black/70 pointer-events-auto"><Trash2 size={14}/></button><div className="absolute bottom-0 w-full p-2 bg-black/60 backdrop-blur-sm text-[9px] text-white truncate">{att.name}</div></div>))}</div>) : (<div onClick={() => detailFileInputRef.current?.click()} className="h-24 border-2 border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text-main)] cursor-pointer transition-all"><Paperclip size={20} className="mb-2" /><span className="text-[9px] font-bold uppercase">Перетащите файлы</span></div>)}</div><div><label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Заметки</label><textarea value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} placeholder="Детали задачи..." className="w-full bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] min-h-[150px] outline-none focus:border-[var(--accent)] resize-none" /></div><button onClick={() => { onDeleteTask(viewingTask.id); setViewingTask(null); }} className="w-full py-4 border border-red-500/30 text-red-500 rounded-2xl font-bold uppercase text-xs hover:bg-red-500/10 transition-all">Удалить задачу</button></div><div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]"><button onClick={() => { saveTask(true); setViewingTask(null); }} className="w-full py-4 bg-[var(--text-main)] text-[var(--bg-main)] rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">Сохранить изменения</button></div></div></div>)}
        
        {previewAttachment && (<div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in zoom-in-95" onClick={() => setPreviewAttachment(null)}><div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>{previewAttachment.type === 'image' ? <img src={previewAttachment.content} className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" /> : <div className="w-80 h-80 bg-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 text-white"><FileText size={64} /><p className="text-xl font-bold">{previewAttachment.name}</p><a href={previewAttachment.content} download className="px-6 py-2 bg-[var(--accent)] rounded-lg font-bold">Скачать</a></div>}<button onClick={() => setPreviewAttachment(null)} className="absolute -top-12 right-0 text-white/50 hover:text-white p-2"><X size={32} /></button></div></div>)}
      </div>
    );
  }

  // --- PROJECT LIST VIEW (GRID) ---
  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] p-6 overflow-y-auto no-scrollbar max-w-[100vw] overflow-x-hidden">
        
        <div className="max-w-4xl mx-auto w-full pt-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tighter mb-1">Проекты</h2>
                    <p className="text-[var(--text-muted)] text-sm font-bold opacity-60">Центр управления задачами</p>
                </div>
                <button 
                    onClick={() => setIsCreatingProject(true)}
                    className="w-12 h-12 bg-[var(--accent)] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--accent-glow)] hover:scale-105 transition-all active:scale-95"
                >
                    <Plus size={24} strokeWidth={3} />
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="glass-panel p-12 rounded-[3rem] text-center flex flex-col items-center justify-center opacity-70">
                    <Folder size={64} className="text-[var(--text-muted)] mb-4 opacity-30" />
                    <h3 className="text-xl font-bold text-[var(--text-main)]">Пока пусто</h3>
                    <p className="text-sm text-[var(--text-muted)] mb-8">Создайте свой первый большой проект.</p>
                    <button onClick={() => setIsCreatingProject(true)} className="px-6 py-3 bg-[var(--bg-item)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] font-bold text-xs uppercase hover:bg-[var(--accent)] hover:text-white transition-all">Создать</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
                    {projects.map(p => {
                        const pTasks = tasks.filter(t => t.projectId === p.id);
                        const progress = pTasks.length > 0 ? Math.round((pTasks.filter(t => t.isCompleted).length / pTasks.length) * 100) : 0;
                        
                        return (
                            <div 
                                key={p.id} 
                                onClick={() => setSelectedProjectId(p.id)}
                                className="group glass-panel p-6 rounded-[2rem] cursor-pointer hover:border-[var(--accent)]/50 hover:shadow-xl transition-all relative overflow-hidden h-64 flex flex-col"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--accent)]/10 to-transparent rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
                                
                                <div className="flex justify-between items-start mb-auto">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg" style={{ backgroundColor: p.color }}>
                                        {p.title.charAt(0)}
                                    </div>
                                    <div className="p-2 bg-[var(--bg-main)] rounded-full border border-[var(--border-color)] opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowLeft size={16} className="rotate-180 text-[var(--text-muted)]" />
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <h3 className="text-xl font-black text-[var(--text-main)] mb-1 truncate">{p.title}</h3>
                                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-4 h-8">{p.description || 'Нет описания'}</p>
                                    
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-2">
                                        <span>Прогресс</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-[var(--bg-main)] rounded-full overflow-hidden border border-[var(--border-color)]">
                                        <div className="h-full transition-all duration-1000 group-hover:saturate-150" style={{ width: `${progress}%`, backgroundColor: p.color }}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Create Modal */}
        {isCreatingProject && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95">
                <div className="w-full max-w-sm glass-card rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
                    <div className="flex justify-between items-center mb-8">
                        <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.2em]">Создание проекта</span>
                        <button onClick={() => setIsCreatingProject(false)}><X size={24} className="text-[var(--text-muted)] hover:text-white" /></button>
                    </div>
                    
                    <div className="space-y-6">
                        <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Название проекта" className="w-full bg-transparent text-2xl font-bold text-white outline-none border-b border-white/10 pb-2 placeholder:text-white/20" />
                        <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Краткое описание..." className="w-full bg-[var(--bg-item)] rounded-xl p-4 text-sm text-white outline-none border border-white/10 resize-none h-24" />
                        <div>
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">Цвет обложки</label>
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map(c => (
                                    <button key={c} onClick={() => setNewColor(c)} className={`w-8 h-8 rounded-full transition-all ${newColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-40 hover:opacity-100'}`} style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <button onClick={handleCreateProject} disabled={!newTitle.trim()} className="w-full mt-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">Создать</button>
                </div>
            </div>
        )}
    </div>
  );
};

export default ProjectsView;
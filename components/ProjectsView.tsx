import React, { useState, useRef, useEffect } from 'react';
import { Project, Task, Thought, Priority, Attachment } from '../types';
import { Folder, Plus, Trash2, ArrowLeft, Clock, Paperclip, Palette, List, X, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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

  if (selectedProject) {
    const projectTasks = tasks.filter(t => t.projectId === selectedProject.id);
    const columns = selectedProject.columns || [];

    return (
      <div className="flex flex-col h-full bg-[var(--bg-main)] animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-[var(--bg-card)] bg-[var(--bg-main)]/80 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3"><button onClick={() => setSelectedProjectId(null)} className="p-2 -ml-2 hover:bg-[var(--bg-item)] rounded-full transition-colors"><ArrowLeft size={24} className="text-[var(--text-muted)]" /></button><div><h2 className="text-xl font-black text-[var(--text-main)] leading-none flex items-center gap-2">{selectedProject.title}<div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedProject.color }} /></h2></div></div>
            <button onClick={() => { if(confirm('Удалить проект?')) { onDeleteProject(selectedProject.id); setSelectedProjectId(null); } }} className="text-[var(--text-muted)] hover:text-red-500"><Trash2 size={20} /></button>
          </div>
          <div className="flex bg-[var(--bg-item)] p-1 rounded-xl border border-[var(--border-color)]">
              <div className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm">
                  <List size={14} /> ЗАДАЧИ
              </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-x-auto overflow-y-hidden p-4 pb-20">
               <div className="flex gap-4 h-full">
                   {columns.map(col => {
                       const colTasks = projectTasks.filter(t => (t.columnId === col.id) || (!t.columnId && col.id === columns[0].id));
                       return (
                           <div key={col.id} className="flex-none w-72 flex flex-col h-full bg-[var(--bg-item)]/30 rounded-2xl border border-[var(--border-color)]">
                               <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-item)] rounded-t-2xl relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: col.color || COLORS[0] }}></div><span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">{col.title}</span><div className="flex gap-1"><button onClick={() => handleChangeColumnColor(col.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"><Palette size={12} /></button><button onClick={() => openCreateModal(col.id)} className="p-1 hover:text-[var(--accent)] text-[var(--text-muted)]"><Plus size={14} /></button></div></div>
                               <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                                   {colTasks.map(task => (<div key={task.id} onClick={() => openDetailModal(task)} className="p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] shadow-sm hover:border-[var(--accent)] transition-all cursor-pointer group hover:scale-[1.02]"><div className="flex justify-between items-start mb-2"><p className={`text-sm font-bold leading-tight ${task.isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>{task.title}</p><div className={`w-2 h-2 rounded-full ${task.priority === Priority.HIGH ? 'bg-red-500' : task.priority === Priority.MEDIUM ? 'bg-yellow-500' : 'bg-blue-500'}`} /></div><div className="flex items-center gap-2 text-[9px] font-black uppercase text-[var(--text-muted)]">{task.dueDate && <span className="flex items-center gap-1 text-[var(--accent)]"><Clock size={10} /> {format(new Date(task.dueDate), 'd MMM')}</span>}{task.attachments && task.attachments.length > 0 && <span className="flex items-center gap-1"><Paperclip size={10} /> {task.attachments.length}</span>}</div></div>))}
                               </div>
                           </div>
                       );
                   })}
               </div>
            </div>
        </div>
        {isTaskCreateOpen && (<div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in-95"><div className="w-full max-w-sm glass-card rounded-[2.5rem] p-6 shadow-2xl border border-white/10"><div className="flex justify-between items-center mb-6"><h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Новая задача</h3><button onClick={() => setIsTaskCreateOpen(false)}><X size={20} className="text-[var(--text-muted)]" /></button></div><input autoFocus value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="Название..." className="w-full bg-transparent text-xl font-bold text-[var(--text-main)] outline-none pb-2 border-b border-[var(--border-color)] mb-4" /><div className="flex gap-2"><input type="date" className="bg-[var(--bg-item)] p-2 rounded-lg text-xs text-white outline-none" value={taskForm.date} onChange={e => setTaskForm({...taskForm, date: e.target.value})} /><button onClick={() => saveTask(false)} className="flex-1 py-2 bg-[var(--text-main)] text-[var(--bg-main)] rounded-lg font-bold text-xs uppercase">Создать</button></div></div></div>)}
        {viewingTask && (<div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex justify-end animate-in slide-in-from-right duration-300"><div className="w-full max-w-md h-full bg-[var(--bg-main)] border-l border-[var(--border-color)] flex flex-col shadow-2xl"><div className="p-6 border-b border-[var(--border-color)] flex justify-between items-start"><div className="flex-1 mr-4"><textarea value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-transparent text-2xl font-black text-[var(--text-main)] outline-none resize-none leading-tight" rows={2} /><div className="flex items-center gap-2 mt-2"><select value={taskForm.columnId} onChange={e => setTaskForm({...taskForm, columnId: e.target.value})} className="bg-[var(--bg-item)] text-[var(--text-muted)] text-[10px] font-bold uppercase py-1 px-2 rounded-lg border border-[var(--border-color)] outline-none">{columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select><select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value as Priority})} className="bg-[var(--bg-item)] text-[var(--text-muted)] text-[10px] font-bold uppercase py-1 px-2 rounded-lg border border-[var(--border-color)] outline-none"><option value={Priority.LOW}>Низкий</option><option value={Priority.MEDIUM}>Средний</option><option value={Priority.HIGH}>Высокий</option></select></div></div><button onClick={() => { saveTask(true); setViewingTask(null); }} className="p-2 bg-[var(--bg-item)] rounded-full hover:text-[var(--text-main)] text-[var(--text-muted)] transition-colors"><X size={24} /></button></div><div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar"><div><label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Дедлайн</label><div className="flex gap-3"><div className="flex items-center gap-2 bg-[var(--bg-item)] p-3 rounded-xl border border-[var(--border-color)] flex-1"><Clock size={16} className="text-[var(--accent)]" /><input type="date" value={taskForm.date} onChange={e => setTaskForm({...taskForm, date: e.target.value})} className="bg-transparent text-sm text-[var(--text-main)] outline-none w-full"/></div><div className="flex items-center gap-2 bg-[var(--bg-item)] p-3 rounded-xl border border-[var(--border-color)] flex-1"><Clock size={16} className="text-[var(--accent)]" /><input type="time" value={taskForm.time} onChange={e => setTaskForm({...taskForm, time: e.target.value})} className="bg-transparent text-sm text-[var(--text-main)] outline-none w-full"/></div></div></div><div><div className="flex justify-between items-center mb-3"><label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Вложения ({taskForm.attachments.length})</label><button onClick={() => detailFileInputRef.current?.click()} className="text-[var(--accent)] text-[10px] font-bold uppercase hover:underline">+ Добавить</button><input type="file" ref={detailFileInputRef} className="hidden" onChange={e => handleAttachment(e, true)} /></div>{taskForm.attachments.length > 0 ? (<div className="grid grid-cols-2 gap-3">{taskForm.attachments.map(att => (<div key={att.id} onClick={() => setPreviewAttachment(att)} className="relative group rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-item)] aspect-square flex flex-col cursor-zoom-in">{att.type === 'image' ? <img src={att.content} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><FileText size={32}/></div>}<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"><Eye size={24} className="text-white" /></div><button onClick={(e) => handleDeleteAttachment(e, att.id)} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white/70 hover:text-red-500 rounded-full hover:bg-black/70 pointer-events-auto"><Trash2 size={14}/></button><div className="absolute bottom-0 w-full p-2 bg-black/60 backdrop-blur-sm text-[9px] text-white truncate">{att.name}</div></div>))}</div>) : (<div onClick={() => detailFileInputRef.current?.click()} className="h-24 border-2 border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text-main)] cursor-pointer transition-all"><Paperclip size={20} className="mb-2" /><span className="text-[9px] font-bold uppercase">Перетащите файлы</span></div>)}</div><div><label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Заметки</label><textarea value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} placeholder="Детали задачи..." className="w-full bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] min-h-[150px] outline-none focus:border-[var(--accent)] resize-none" /></div><button onClick={() => { onDeleteTask(viewingTask.id); setViewingTask(null); }} className="w-full py-4 border border-red-500/30 text-red-500 rounded-2xl font-bold uppercase text-xs hover:bg-red-500/10 transition-all">Удалить задачу</button></div><div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]"><button onClick={() => { saveTask(true); setViewingTask(null); }} className="w-full py-4 bg-[var(--text-main)] text-[var(--bg-main)] rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">Сохранить изменения</button></div></div></div>)}
        {previewAttachment && (<div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in zoom-in-95" onClick={() => setPreviewAttachment(null)}><div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>{previewAttachment.type === 'image' ? <img src={previewAttachment.content} className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" /> : <div className="w-80 h-80 bg-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 text-white"><FileText size={64} /><p className="text-xl font-bold">{previewAttachment.name}</p><a href={previewAttachment.content} download className="px-6 py-2 bg-[var(--accent)] rounded-lg font-bold">Скачать</a></div>}<button onClick={() => setPreviewAttachment(null)} className="absolute -top-12 right-0 text-white/50 hover:text-white p-2"><X size={32} /></button></div></div>)}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] items-center justify-center text-center p-6 animate-in fade-in duration-300">
        <div className="max-w-md w-full glass-panel p-8 rounded-[3rem] border border-[var(--border-color)] shadow-2xl">
            <div className="w-20 h-20 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--accent)]">
                <Folder size={40} />
            </div>
            <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">Проекты</h2>
            <p className="text-[var(--text-muted)] mb-8">Управляйте сложными задачами и идеями в одном месте.</p>
            
            {projects.length > 0 && (
                <div className="grid grid-cols-1 gap-3 mb-8 max-h-[40vh] overflow-y-auto no-scrollbar">
                    {projects.map(p => (
                        <button key={p.id} onClick={() => setSelectedProjectId(p.id)} className="flex items-center gap-4 p-4 bg-[var(--bg-item)] rounded-2xl hover:bg-[var(--bg-main)] border border-[var(--border-color)] transition-all group hover:scale-[1.02] text-left">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg" style={{ backgroundColor: p.color }}>{p.title.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-[var(--text-main)] truncate">{p.title}</h3>
                                <p className="text-[10px] text-[var(--text-muted)] truncate opacity-70">{p.description || 'Нет описания'}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <button onClick={() => setIsCreatingProject(true)} className="w-full py-4 bg-[var(--accent)] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[var(--accent-glow)] hover:scale-[1.02] active:scale-95 transition-all">Новый проект</button>
        </div>

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
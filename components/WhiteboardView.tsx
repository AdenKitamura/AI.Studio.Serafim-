
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Thought, NodeLink, LinkType, Attachment } from '../types';
import { 
  Plus, Maximize2, X, Link as LinkIcon, 
  Zap, Target, Share2, CheckSquare, 
  Wrench, LayoutGrid, Focus, Trash2,
  Sparkles, PlusCircle, ArrowRight, Circle,
  Paperclip, Image as ImageIcon, FileText, GitBranch
} from 'lucide-react';

interface WhiteboardViewProps {
  thoughts: Thought[];
  onAdd: (thought: Thought) => void;
  onUpdate: (thought: Thought) => void;
  onDelete: (id: string) => void;
  onConvertToTask?: (title: string) => void;
}

const LINK_TYPES: { type: LinkType, label: string, color: string }[] = [
    { type: 'related', label: 'Связь', color: '#94a3b8' }, 
    { type: 'cause', label: 'Причина', color: '#f59e0b' }, 
    { type: 'effect', label: 'Следствие', color: '#10b981' }, 
    { type: 'hypothesis', label: 'Гипотеза', color: '#8b5cf6' }, 
    { type: 'blocker', label: 'Блокер', color: '#ef4444' }, 
];

const WhiteboardView: React.FC<WhiteboardViewProps> = ({ thoughts, onAdd, onUpdate, onDelete, onConvertToTask }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  
  // Local state for smooth dragging
  const [localNodePositions, setLocalNodePositions] = useState<Record<string, {x: number, y: number}>>({});
  
  // Linking State
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [tempLinkEnd, setTempLinkEnd] = useState<{x: number, y: number} | null>(null);
  const [linkMenu, setLinkMenu] = useState<{ x: number, y: number, sourceId: string, targetId: string } | null>(null);

  // Edit/Add Menu State
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nodes = useMemo(() => 
    thoughts.filter(t => t.type !== 'quote' && !t.isArchived), 
  [thoughts]);

  const screenToCanvas = (clientX: number, clientY: number) => ({
    x: (clientX - offset.x) / zoom,
    y: (clientY - offset.y) / zoom
  });

  // --- MOUSE & TOUCH HANDLERS ---

  const handlePointerDown = (e: React.PointerEvent) => {
    // Check if clicking interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('.node-card-interactive') || target.closest('.floating-ui') || target.closest('.link-handle')) return;
    
    // Background interaction -> Pan
    setIsPanning(true);
    setLinkMenu(null); 
    setEditingNodeId(null);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else if (draggedNodeId) {
      const node = nodes.find(n => n.id === draggedNodeId);
      if (node) {
        const dx = (e.clientX - lastMousePos.current.x) / zoom;
        const dy = (e.clientY - lastMousePos.current.y) / zoom;
        
        const currentPos = localNodePositions[draggedNodeId] || { x: node.x || 0, y: node.y || 0 };
        const newX = currentPos.x + dx;
        const newY = currentPos.y + dy;

        setLocalNodePositions(prev => ({ ...prev, [draggedNodeId]: { x: newX, y: newY } }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    } else if (linkingSourceId) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setTempLinkEnd({ x: canvasPos.x, y: canvasPos.y });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (draggedNodeId) {
        const node = nodes.find(n => n.id === draggedNodeId);
        const finalPos = localNodePositions[draggedNodeId];
        if (node && finalPos) {
            onUpdate({ ...node, x: finalPos.x, y: finalPos.y });
        }
        setDraggedNodeId(null);
        setLocalNodePositions(prev => {
            const next = {...prev};
            delete next[draggedNodeId];
            return next;
        });
    }
    
    if (linkingSourceId) {
        const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.node-card');
        if (target) {
            const targetId = target.getAttribute('data-id');
            if (targetId && targetId !== linkingSourceId) {
                setLinkMenu({
                    x: e.clientX,
                    y: e.clientY,
                    sourceId: linkingSourceId,
                    targetId: targetId
                });
            }
        }
        setLinkingSourceId(null);
        setTempLinkEnd(null);
    }
  };

  // --- ACTIONS ---

  const createNode = (type: Thought['type'], x?: number, y?: number) => {
    const coords = (x !== undefined && y !== undefined) ? {x, y} : screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
    const newNode: Thought = {
      id: Date.now().toString(),
      content: type === 'task_node' ? 'Новая цель' : 'Новая заметка',
      type,
      tags: ['workspace'],
      createdAt: new Date().toISOString(),
      x: coords.x,
      y: coords.y,
      links: [],
      attachments: []
    };
    onAdd(newNode);
    return newNode;
  };

  const createBranch = (parentId: string) => {
      const parent = nodes.find(n => n.id === parentId);
      if (!parent) return;
      
      const parentPos = getNodePos(parent);
      // Spawn to the right
      const newNode = createNode('thought', parentPos.x + 250, parentPos.y);
      
      // Link parent to child
      onUpdate({
          ...parent,
          links: [...(parent.links || []), { targetId: newNode.id, type: 'related' }]
      });
  };

  const createLink = (type: LinkType) => {
      if (!linkMenu) return;
      const sourceNode = nodes.find(n => n.id === linkMenu.sourceId);
      if (sourceNode) {
          const newLink: NodeLink = { targetId: linkMenu.targetId, type };
          const updatedLinks = [...(sourceNode.links || []), newLink];
          onUpdate({ ...sourceNode, links: updatedLinks });
      }
      setLinkMenu(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editingNodeId) return;
      const node = nodes.find(n => n.id === editingNodeId);
      if (!node) return;

      const reader = new FileReader();
      reader.onload = () => {
          const newAtt: Attachment = {
              id: Date.now().toString(),
              type: file.type.startsWith('image/') ? 'image' : 'file',
              content: reader.result as string,
              name: file.name
          };
          onUpdate({ ...node, attachments: [...(node.attachments || []), newAtt] });
      };
      reader.readAsDataURL(file);
  };

  const handleAddLinkAttachment = () => {
      if (!editingNodeId) return;
      const node = nodes.find(n => n.id === editingNodeId);
      if (!node) return;
      const url = prompt("URL:");
      if (url) {
          const newAtt: Attachment = { id: Date.now().toString(), type: 'link', content: url, name: url };
          onUpdate({ ...node, attachments: [...(node.attachments || []), newAtt] });
      }
  };

  // Helper to get render position
  const getNodePos = (node: Thought) => {
      if (localNodePositions[node.id]) {
          return localNodePositions[node.id];
      }
      return { x: node.x || 0, y: node.y || 0 };
  };

  return (
    <div 
      ref={containerRef}
      className="h-full w-full relative overflow-hidden bg-[#09090b] select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={(e) => {
        if (e.ctrlKey) {
            // Pinch zoom simulation
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.min(Math.max(zoom * delta, 0.2), 3);
            const mouseBefore = screenToCanvas(e.clientX, e.clientY);
            setZoom(newZoom);
            setOffset({ x: e.clientX - mouseBefore.x * newZoom, y: e.clientY - mouseBefore.y * newZoom });
        } else {
            // Pan
            setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
      }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`, backgroundSize: `${40 * zoom}px ${40 * zoom}px`, backgroundPosition: `${offset.x}px ${offset.y}px` }} />

      {/* SVG Layer for Links */}
      <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#525252" />
            </marker>
        </defs>
        
        {nodes.map(node => (node.links || []).map((link, idx) => {
          const target = nodes.find(n => n.id === link.targetId);
          if (!target) return null;
          
          const sourcePos = getNodePos(node);
          const targetPos = getNodePos(target);

          const sx = offset.x + sourcePos.x * zoom;
          const sy = offset.y + sourcePos.y * zoom;
          const tx = offset.x + targetPos.x * zoom;
          const ty = offset.y + targetPos.y * zoom;
          const linkColor = LINK_TYPES.find(t => t.type === link.type)?.color || '#525252';

          return (
            <line 
                key={`${node.id}-${link.targetId}-${idx}`}
                x1={sx} y1={sy} x2={tx} y2={ty} 
                stroke={linkColor} 
                strokeWidth={2 * zoom} 
                strokeOpacity="0.4"
                markerEnd="url(#arrowhead)"
            />
          );
        }))}

        {linkingSourceId && tempLinkEnd && (() => {
            const source = nodes.find(n => n.id === linkingSourceId);
            if (!source) return null;
            const sourcePos = getNodePos(source);
            return <line x1={offset.x + sourcePos.x * zoom} y1={offset.y + sourcePos.y * zoom} x2={offset.x + tempLinkEnd.x * zoom} y2={offset.y + tempLinkEnd.y * zoom} stroke="var(--accent)" strokeWidth={2 * zoom} strokeDasharray="5,5" />;
        })()}
      </svg>

      {/* Nodes Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {nodes.map(node => {
            const pos = getNodePos(node);
            const isEditing = editingNodeId === node.id;
            return (
              <div 
                key={node.id}
                data-id={node.id}
                onPointerDown={(e) => { 
                    e.stopPropagation(); 
                    if((e.target as HTMLElement).closest('.link-handle') || (e.target as HTMLElement).closest('.node-action')) return;
                    setDraggedNodeId(node.id); 
                    setEditingNodeId(node.id); // Set active
                    lastMousePos.current = { x: e.clientX, y: e.clientY }; 
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                }}
                className={`node-card pointer-events-auto absolute rounded-2xl border transition-all duration-200 shadow-2xl flex flex-col group
                  ${node.type === 'task_node' ? 'bg-[#18181b] border-l-4 border-l-emerald-500 border-y-white/5 border-r-white/5' : 'bg-[#121214]/90 border-white/10'}
                  ${draggedNodeId === node.id || isEditing ? 'z-50 scale-105 border-[var(--accent)]/50' : 'z-10'}
                `}
                style={{ 
                    left: offset.x + pos.x * zoom, 
                    top: offset.y + pos.y * zoom, 
                    width: 240 * zoom, 
                    transform: 'translate(-50%, -50%)', 
                    backdropFilter: 'blur(12px)',
                    minHeight: 100 * zoom
                }}
              >
                {/* Header Actions */}
                <div className="flex items-center justify-between p-3 pb-1 node-card-interactive">
                   <span className="font-bold text-white/30 uppercase tracking-widest" style={{ fontSize: 9 * zoom }}>{node.type === 'task_node' ? 'Task' : 'Note'}</span>
                   <div className="flex gap-1">
                       <button onClick={() => createBranch(node.id)} className="node-action p-1 text-white/20 hover:text-[var(--accent)]"><GitBranch size={12 * zoom}/></button>
                       <button onClick={() => onDelete(node.id)} className="node-action p-1 text-white/20 hover:text-red-500"><X size={12 * zoom}/></button>
                   </div>
                </div>

                {/* Content */}
                <div className="px-3 pb-2 pt-1 flex-1 flex flex-col node-card-interactive">
                    <textarea 
                        value={node.content} 
                        onPointerDown={e => e.stopPropagation()} 
                        onChange={e => onUpdate({ ...node, content: e.target.value })} 
                        className={`w-full bg-transparent text-white focus:outline-none resize-none no-scrollbar leading-snug font-medium ${node.metadata?.taskStatus ? 'opacity-40 line-through' : ''}`}
                        style={{ fontSize: 13 * zoom, height: '100%', minHeight: 40 * zoom }} 
                    />
                </div>

                {/* Attachments Section (Visible if Editing or has items) */}
                {(isEditing || (node.attachments && node.attachments.length > 0)) && (
                    <div className="px-3 pb-3 pt-2 border-t border-white/5 node-card-interactive">
                        <div className="flex flex-wrap gap-2 mb-2">
                            {node.attachments?.map(att => (
                                <div key={att.id} className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-[9px] text-white/70 max-w-full truncate border border-white/10">
                                    {att.type === 'link' ? <LinkIcon size={10} /> : <Paperclip size={10} />}
                                    <span className="truncate max-w-[80px]">{att.name}</span>
                                </div>
                            ))}
                        </div>
                        {isEditing && (
                            <div className="flex gap-2 justify-end opacity-50 hover:opacity-100 transition-opacity">
                                <button onClick={handleAddLinkAttachment} className="node-action p-1 bg-white/5 rounded hover:text-white"><LinkIcon size={12 * zoom} /></button>
                                <button onClick={() => fileInputRef.current?.click()} className="node-action p-1 bg-white/5 rounded hover:text-white"><Paperclip size={12 * zoom} /></button>
                            </div>
                        )}
                    </div>
                )}

                {/* Link Handle */}
                <div 
                    className="link-handle absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/5 hover:bg-[var(--accent)] border border-white/10 flex items-center justify-center cursor-crosshair opacity-0 hover:opacity-100 transition-opacity z-20"
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        setLinkingSourceId(node.id);
                        setTempLinkEnd({ x: pos.x, y: pos.y });
                    }}
                >
                    <div className="w-1.5 h-1.5 bg-white rounded-full pointer-events-none" />
                </div>

              </div>
            );
        })}
      </div>

      {/* Helper Input for File Upload */}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

      {/* Link Menu */}
      {linkMenu && (
          <div 
            className="fixed z-[100] bg-[#18181b] border border-white/10 rounded-xl shadow-2xl p-1 flex flex-col gap-1 min-w-[120px] animate-in zoom-in-95 floating-ui"
            style={{ left: linkMenu.x, top: linkMenu.y }}
          >
              <div className="px-3 py-1 text-[9px] font-black uppercase text-white/30">Тип связи</div>
              {LINK_TYPES.map(lt => (
                  <button 
                    key={lt.type}
                    onClick={() => createLink(lt.type)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-left transition-colors"
                  >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lt.color }} />
                      <span className="text-xs font-bold text-white/80">{lt.label}</span>
                  </button>
              ))}
          </div>
      )}

      {/* Add Menu */}
      <div className="floating-ui fixed bottom-28 left-6 flex flex-col items-start gap-3 z-[30]">
          {isAddMenuOpen && (
            <div className="flex flex-col gap-1 p-1.5 bg-[#18181b]/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-3xl animate-in slide-in-from-bottom-2">
                <button onClick={() => createNode('task_node')} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-xl text-white/70 hover:text-emerald-400 transition-all">
                    <Target size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Задача</span>
                </button>
                <button onClick={() => createNode('thought')} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-xl text-white/70 hover:text-[var(--accent)] transition-all">
                    <PlusCircle size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Заметка</span>
                </button>
            </div>
          )}
          <button 
            onClick={() => { setIsAddMenuOpen(!isAddMenuOpen); }}
            className={`p-4 rounded-2xl shadow-3xl transition-all border border-white/10 ${isAddMenuOpen ? 'bg-white text-black rotate-45' : 'bg-[var(--accent)] text-white hover:scale-105'}`}
          >
              <Plus size={24} strokeWidth={3} />
          </button>
      </div>

      <div className="floating-ui fixed bottom-28 right-6 flex flex-col gap-2 z-[30]">
          <button onClick={() => { setZoom(1); setOffset({x: window.innerWidth/2, y: window.innerHeight/2}); }} className="p-3 bg-[#18181b] border border-white/10 rounded-xl text-white/50 hover:text-white">
              <Maximize2 size={18} />
          </button>
      </div>

    </div>
  );
};

export default WhiteboardView;

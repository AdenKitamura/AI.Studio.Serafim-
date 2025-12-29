
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Thought, NodeLink, LinkType } from '../types';
import { 
  Plus, Maximize2, X, Link as LinkIcon, 
  Zap, Target, Share2, CheckSquare, 
  Wrench, LayoutGrid, Focus, Trash2,
  Sparkles, PlusCircle, ArrowRight, Circle
} from 'lucide-react';

interface WhiteboardViewProps {
  thoughts: Thought[];
  onAdd: (thought: Thought) => void;
  onUpdate: (thought: Thought) => void;
  onDelete: (id: string) => void;
  onConvertToTask?: (title: string) => void;
}

const LINK_TYPES: { type: LinkType, label: string, color: string }[] = [
    { type: 'related', label: 'Связь', color: '#94a3b8' }, // Slate
    { type: 'cause', label: 'Причина', color: '#f59e0b' }, // Amber
    { type: 'effect', label: 'Следствие', color: '#10b981' }, // Emerald
    { type: 'hypothesis', label: 'Гипотеза', color: '#8b5cf6' }, // Violet
    { type: 'blocker', label: 'Блокер', color: '#ef4444' }, // Red
];

const WhiteboardView: React.FC<WhiteboardViewProps> = ({ thoughts, onAdd, onUpdate, onDelete, onConvertToTask }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  
  // Linking State
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [tempLinkEnd, setTempLinkEnd] = useState<{x: number, y: number} | null>(null);
  const [linkMenu, setLinkMenu] = useState<{ x: number, y: number, sourceId: string, targetId: string } | null>(null);

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const nodes = useMemo(() => 
    thoughts.filter(t => t.type !== 'quote' && !t.isArchived), 
  [thoughts]);

  const screenToCanvas = (clientX: number, clientY: number) => ({
    x: (clientX - offset.x) / zoom,
    y: (clientY - offset.y) / zoom
  });

  // --- MOUSE HANDLERS ---

  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicking on background
    if ((e.target as HTMLElement).closest('.node-card') || (e.target as HTMLElement).closest('.floating-ui') || (e.target as HTMLElement).closest('.link-handle')) return;
    
    setIsPanning(true);
    setLinkMenu(null); // Close menu if clicking away
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
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
        onUpdate({
          ...node,
          x: (node.x || 0) + dx,
          y: (node.y || 0) + dy
        });
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    } else if (linkingSourceId) {
        // Draw temporary line
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setTempLinkEnd({ x: canvasPos.x, y: canvasPos.y });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
    setDraggedNodeId(null);
    
    // Check if we dropped a link on a node
    if (linkingSourceId) {
        const target = (e.target as HTMLElement).closest('.node-card');
        if (target) {
            const targetId = target.getAttribute('data-id');
            if (targetId && targetId !== linkingSourceId) {
                // Open Link Type Menu
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

  const createNode = (type: Thought['type']) => {
    const coords = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
    const newNode: Thought = {
      id: Date.now().toString(),
      content: type === 'task_node' ? 'Новая цель' : 'Новая заметка',
      type,
      tags: ['workspace'],
      createdAt: new Date().toISOString(),
      x: coords.x,
      y: coords.y,
      links: []
    };
    onAdd(newNode);
    setIsAddMenuOpen(false);
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

  const deleteLink = (sourceId: string, targetId: string) => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (sourceNode) {
          const updatedLinks = (sourceNode.links || []).filter(l => l.targetId !== targetId);
          onUpdate({ ...sourceNode, links: updatedLinks });
      }
  };

  const toggleTaskStatus = (node: Thought) => {
      const newStatus = !node.metadata?.taskStatus;
      onUpdate({
          ...node,
          metadata: { ...node.metadata, taskStatus: newStatus }
      });
  };

  return (
    <div 
      ref={containerRef}
      className="h-full w-full relative overflow-hidden bg-[#09090b] select-none touch-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={(e) => {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(Math.max(zoom * delta, 0.2), 3);
        const mouseBefore = screenToCanvas(e.clientX, e.clientY);
        setZoom(newZoom);
        setOffset({ x: e.clientX - mouseBefore.x * newZoom, y: e.clientY - mouseBefore.y * newZoom });
      }}
    >
      {/* Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`, backgroundSize: `${40 * zoom}px ${40 * zoom}px`, backgroundPosition: `${offset.x}px ${offset.y}px` }} />

      {/* SVG Layer for Links */}
      <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#525252" />
            </marker>
        </defs>
        
        {/* Render Existing Links */}
        {nodes.map(node => (node.links || []).map((link, idx) => {
          const target = nodes.find(n => n.id === link.targetId);
          if (!target) return null;
          
          const sx = offset.x + (node.x || 0) * zoom;
          const sy = offset.y + (node.y || 0) * zoom;
          const tx = offset.x + (target.x || 0) * zoom;
          const ty = offset.y + (target.y || 0) * zoom;
          const linkColor = LINK_TYPES.find(t => t.type === link.type)?.color || '#525252';

          return (
            <g key={`${node.id}-${link.targetId}-${idx}`} className="pointer-events-auto group">
                <line 
                    x1={sx} y1={sy} x2={tx} y2={ty} 
                    stroke={linkColor} 
                    strokeWidth={2 * zoom} 
                    strokeOpacity="0.4"
                    markerEnd="url(#arrowhead)"
                />
                {/* Link Label (Visible on Hover) */}
                <foreignObject x={(sx + tx) / 2 - 40} y={(sy + ty) / 2 - 10} width="80" height="20" className="overflow-visible">
                    <div className="flex items-center justify-center">
                         <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#09090b] text-white/50 border border-white/10 shadow-sm" style={{ borderColor: linkColor }}>
                             {LINK_TYPES.find(t => t.type === link.type)?.label}
                         </span>
                    </div>
                </foreignObject>
                {/* Invisible thicker line for easier clicking/hovering */}
                <line 
                    x1={sx} y1={sy} x2={tx} y2={ty} 
                    stroke="transparent" 
                    strokeWidth={15 * zoom} 
                    className="cursor-pointer"
                    onContextMenu={(e) => { e.preventDefault(); deleteLink(node.id, link.targetId); }}
                />
            </g>
          );
        }))}

        {/* Render Temporary Drag Link */}
        {linkingSourceId && tempLinkEnd && (() => {
            const source = nodes.find(n => n.id === linkingSourceId);
            if (!source) return null;
            const sx = offset.x + (source.x || 0) * zoom;
            const sy = offset.y + (source.y || 0) * zoom;
            const tx = offset.x + tempLinkEnd.x * zoom;
            const ty = offset.y + tempLinkEnd.y * zoom;
            return <line x1={sx} y1={sy} x2={tx} y2={ty} stroke="var(--accent)" strokeWidth={2 * zoom} strokeDasharray="5,5" />;
        })()}
      </svg>

      {/* Nodes Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {nodes.map(node => (
          <div 
            key={node.id}
            data-id={node.id}
            onMouseDown={(e) => { 
                e.stopPropagation(); 
                if((e.target as HTMLElement).closest('.link-handle')) return; // Don't drag node if dragging handle
                setDraggedNodeId(node.id); 
                lastMousePos.current = { x: e.clientX, y: e.clientY }; 
            }}
            className={`node-card absolute pointer-events-auto rounded-2xl border transition-all duration-200 shadow-2xl flex flex-col
              ${node.type === 'task_node' ? 'bg-[#18181b] border-l-4 border-l-emerald-500 border-y-white/5 border-r-white/5' : 'bg-[#121214]/90 border-white/10'}
            `}
            style={{ 
                left: offset.x + (node.x || 0) * zoom, 
                top: offset.y + (node.y || 0) * zoom, 
                width: 220 * zoom, 
                transform: 'translate(-50%, -50%)', 
                backdropFilter: 'blur(12px)',
                minHeight: 80 * zoom
            }}
          >
            {/* Header / Meta */}
            <div className="flex items-center justify-between p-3 pb-1">
               <div className="flex items-center gap-2">
                   {node.type === 'task_node' && (
                       <button 
                         onClick={() => toggleTaskStatus(node)}
                         className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${node.metadata?.taskStatus ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}
                         style={{ width: 14 * zoom, height: 14 * zoom }}
                       >
                           {node.metadata?.taskStatus && <CheckSquare size={10 * zoom} className="text-white" />}
                       </button>
                   )}
                   <span className="font-bold text-white/30 uppercase tracking-widest" style={{ fontSize: 9 * zoom }}>{node.type === 'task_node' ? 'Task' : 'Note'}</span>
               </div>
               <button onMouseDown={(e) => { e.stopPropagation(); onDelete(node.id); }} className="text-white/10 hover:text-red-500"><X size={12 * zoom} /></button>
            </div>

            {/* Content */}
            <div className="px-3 pb-3 pt-1 flex-1 flex flex-col">
                <textarea 
                    value={node.content} 
                    onMouseDown={e => e.stopPropagation()} 
                    onChange={e => onUpdate({ ...node, content: e.target.value })} 
                    className={`w-full bg-transparent text-white focus:outline-none resize-none no-scrollbar leading-snug font-medium ${node.metadata?.taskStatus ? 'opacity-40 line-through' : ''}`}
                    style={{ fontSize: 13 * zoom, height: '100%' }} 
                />
            </div>

            {/* Link Handles (Right side for dragging OUT) */}
            <div 
                className="link-handle absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/5 hover:bg-[var(--accent)] border border-white/10 flex items-center justify-center cursor-crosshair opacity-0 hover:opacity-100 transition-opacity z-20"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    setLinkingSourceId(node.id);
                    setTempLinkEnd({ x: (node.x || 0), y: (node.y || 0) });
                }}
            >
                <div className="w-1.5 h-1.5 bg-white rounded-full pointer-events-none" />
            </div>

          </div>
        ))}
      </div>

      {/* Floating Menus */}
      
      {/* 1. Link Type Selection Menu */}
      {linkMenu && (
          <div 
            className="fixed z-[100] bg-[#18181b] border border-white/10 rounded-xl shadow-2xl p-1 flex flex-col gap-1 min-w-[120px] animate-in zoom-in-95"
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

      {/* 2. Main Add Menu (Bottom Left) */}
      <div className="floating-ui fixed bottom-28 left-6 flex flex-col items-start gap-3 z-[60]">
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

      {/* 3. Controls (Bottom Right) */}
      <div className="floating-ui fixed bottom-28 right-6 flex flex-col gap-2 z-[60]">
          <button onClick={() => { setZoom(1); setOffset({x: window.innerWidth/2, y: window.innerHeight/2}); }} className="p-3 bg-[#18181b] border border-white/10 rounded-xl text-white/50 hover:text-white">
              <Maximize2 size={18} />
          </button>
      </div>
      
      {/* Help Hint */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 pointer-events-none opacity-40 text-center">
          <p className="text-[10px] font-bold uppercase text-white/50 tracking-[0.2em] bg-black/50 px-4 py-1 rounded-full backdrop-blur-md">
            Drag handles to link • Right Click link to delete
          </p>
      </div>

    </div>
  );
};

export default WhiteboardView;

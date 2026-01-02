
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Thought, NodeLink, LinkType, Attachment } from '../types';
import { 
  Plus, Maximize2, X, Link as LinkIcon, 
  Zap, Target, Share2, CheckSquare, 
  Wrench, LayoutGrid, Focus, Trash2,
  Sparkles, PlusCircle, ArrowRight, Circle,
  Paperclip, Image as ImageIcon, FileText, GitBranch,
  Type as TypeIcon, Palette
} from 'lucide-react';

interface WhiteboardViewProps {
  thoughts: Thought[];
  activeBoardId: string;
  onAdd: (thought: Thought) => void;
  onUpdate: (thought: Thought) => void;
  onDelete: (id: string) => void;
}

const LINK_COLORS = ['#94a3b8', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const WhiteboardView: React.FC<WhiteboardViewProps> = ({ thoughts, activeBoardId, onAdd, onUpdate, onDelete }) => {
  // Transform State (Pan/Zoom)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  
  // Interaction State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [tempLinkEnd, setTempLinkEnd] = useState<{x: number, y: number} | null>(null);
  
  // UI State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [linkMenu, setLinkMenu] = useState<{ x: number, y: number, sourceId: string, targetId: string } | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Center
  useEffect(() => {
      setTransform({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 });
  }, []);

  // --- HELPERS ---
  const screenToWorld = (screenX: number, screenY: number) => {
      return {
          x: (screenX - transform.x) / transform.scale,
          y: (screenY - transform.y) / transform.scale
      };
  };

  // --- INPUT HANDLERS (Performance Optimized) ---
  const handleWheel = (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const zoomSensitivity = 0.001;
          const delta = -e.deltaY * zoomSensitivity;
          const newScale = Math.min(Math.max(0.1, transform.scale + delta), 5);
          
          // Zoom towards pointer
          const worldPos = screenToWorld(e.clientX, e.clientY);
          const newX = e.clientX - worldPos.x * newScale;
          const newY = e.clientY - worldPos.y * newScale;

          setTransform({ x: newX, y: newY, scale: newScale });
      } else {
          setTransform(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.node-interactive') || target.closest('.ui-layer')) return;
      
      setIsPanning(true);
      setEditingNodeId(null);
      setLinkMenu(null);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (isPanning) {
          const dx = e.clientX - lastMousePos.current.x;
          const dy = e.clientY - lastMousePos.current.y;
          setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          lastMousePos.current = { x: e.clientX, y: e.clientY };
      } else if (draggedNodeId) {
          const dx = (e.clientX - lastMousePos.current.x) / transform.scale;
          const dy = (e.clientY - lastMousePos.current.y) / transform.scale;
          const node = thoughts.find(n => n.id === draggedNodeId);
          if (node) {
              onUpdate({ ...node, x: (node.x || 0) + dx, y: (node.y || 0) + dy });
          }
          lastMousePos.current = { x: e.clientX, y: e.clientY };
      } else if (linkingSourceId) {
          const worldPos = screenToWorld(e.clientX, e.clientY);
          setTempLinkEnd(worldPos);
      }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      setIsPanning(false);
      setDraggedNodeId(null);
      
      if (linkingSourceId) {
          // Check if dropped on a node
          const targetEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-node-id]');
          if (targetEl) {
              const targetId = targetEl.getAttribute('data-node-id');
              if (targetId && targetId !== linkingSourceId) {
                  setLinkMenu({ x: e.clientX, y: e.clientY, sourceId: linkingSourceId, targetId });
              }
          }
          setLinkingSourceId(null);
          setTempLinkEnd(null);
      }
      containerRef.current?.releasePointerCapture(e.pointerId);
  };

  // --- ACTIONS ---
  const createNode = (type: Thought['type'], content: string = '', metadata: any = {}) => {
      const pos = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
      onAdd({
          id: Date.now().toString(),
          content: content || (type === 'task_node' ? 'Новая цель' : type === 'annotation' ? 'Текст' : 'Заметка'),
          type,
          tags: [],
          createdAt: new Date().toISOString(),
          x: pos.x,
          y: pos.y,
          metadata
      });
      setIsMenuOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => createNode('image', 'Image', { imageSrc: reader.result as string });
          reader.readAsDataURL(file);
      }
  };

  const createLink = (color: string) => {
      if (linkMenu) {
          const source = thoughts.find(n => n.id === linkMenu.sourceId);
          if (source) {
              onUpdate({
                  ...source,
                  links: [...(source.links || []), { targetId: linkMenu.targetId, type: 'related', color }]
              });
          }
          setLinkMenu(null);
      }
  };

  // --- RENDER ---
  return (
    <div 
        ref={containerRef}
        className="w-full h-full relative overflow-hidden bg-[#0a0a0a] touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
    >
        {/* GRID BACKGROUND (Moves with transform) */}
        <div 
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transformOrigin: '0 0',
                backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
                backgroundSize: `50px 50px`
            }}
        />

        {/* WORLD LAYER (Contains everything that moves) */}
        <div 
            className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform"
            style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
        >
            {/* LINKS LAYER (SVG) */}
            <svg className="absolute top-[-50000px] left-[-50000px] w-[100000px] h-[100000px] pointer-events-none overflow-visible">
                <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="20" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L9,3 z" fill="#555" />
                    </marker>
                </defs>
                {thoughts.map(node => (node.links || []).map((link, i) => {
                    const target = thoughts.find(n => n.id === link.targetId);
                    if(!target) return null;
                    // Coordinate offset handled by SVG wrapper big size
                    const sx = 50000 + (node.x || 0); 
                    const sy = 50000 + (node.y || 0);
                    const tx = 50000 + (target.x || 0);
                    const ty = 50000 + (target.y || 0);
                    return <line key={`${node.id}-${i}`} x1={sx} y1={sy} x2={tx} y2={ty} stroke={link.color || '#555'} strokeWidth="2" markerEnd="url(#arrow)" />;
                }))}
                {linkingSourceId && tempLinkEnd && (() => {
                    const source = thoughts.find(n => n.id === linkingSourceId);
                    if(!source) return null;
                    const sx = 50000 + (source.x || 0);
                    const sy = 50000 + (source.y || 0);
                    const tx = 50000 + tempLinkEnd.x;
                    const ty = 50000 + tempLinkEnd.y;
                    return <line x1={sx} y1={sy} x2={tx} y2={ty} stroke="white" strokeDasharray="5,5" strokeWidth="2" />;
                })()}
            </svg>

            {/* NODES LAYER */}
            {thoughts.map(node => (
                <div
                    key={node.id}
                    data-node-id={node.id}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        // Drag logic
                        if((e.target as HTMLElement).closest('.resize-handle')) return;
                        setDraggedNodeId(node.id);
                        setEditingNodeId(node.id);
                        lastMousePos.current = { x: e.clientX, y: e.clientY };
                    }}
                    className={`absolute node-interactive group flex flex-col items-center justify-center transition-shadow duration-200
                        ${node.type === 'annotation' ? '' : 'rounded-2xl border shadow-xl backdrop-blur-md'}
                        ${editingNodeId === node.id ? 'ring-2 ring-[var(--accent)] z-50' : 'z-10'}
                        ${node.type === 'task_node' ? 'bg-[#18181b] border-l-4 border-l-emerald-500 border-white/10 w-64' : ''}
                        ${node.type === 'thought' ? 'bg-[#121214]/90 border-white/10 w-56' : ''}
                        ${node.type === 'image' ? 'p-1 bg-white/5 border-transparent' : ''}
                    `}
                    style={{
                        left: node.x, top: node.y,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    {/* Node Content */}
                    {node.type === 'image' ? (
                        <div className="relative group/img">
                            <img src={node.metadata?.imageSrc} className="max-w-xs rounded-lg shadow-lg pointer-events-none" />
                            <button onClick={() => onDelete(node.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-auto"><X size={12}/></button>
                        </div>
                    ) : node.type === 'annotation' ? (
                        <textarea
                            value={node.content}
                            onChange={(e) => onUpdate({ ...node, content: e.target.value })}
                            className="bg-transparent text-white font-black text-2xl outline-none text-center resize-none w-80 overflow-hidden"
                            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                            onPointerDown={e => e.stopPropagation()} // Allow selecting text
                        />
                    ) : (
                        <div className="w-full p-4">
                            <div className="flex justify-between items-center mb-2 opacity-50 text-[10px] font-black uppercase tracking-widest">
                                <span>{node.type === 'task_node' ? 'Цель' : 'Заметка'}</span>
                                <div className="flex gap-1">
                                    <div 
                                        className="w-4 h-4 bg-white/10 rounded-full cursor-crosshair hover:bg-[var(--accent)] pointer-events-auto"
                                        onPointerDown={(e) => { e.stopPropagation(); setLinkingSourceId(node.id); setTempLinkEnd({x: node.x||0, y: node.y||0}); }}
                                    />
                                    <button onClick={() => onDelete(node.id)} className="hover:text-red-500"><X size={12}/></button>
                                </div>
                            </div>
                            <textarea
                                value={node.content}
                                onChange={(e) => onUpdate({ ...node, content: e.target.value })}
                                className="w-full bg-transparent text-white text-sm outline-none resize-none font-medium pointer-events-auto"
                                rows={3}
                                onPointerDown={e => e.stopPropagation()}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>

        {/* UI LAYER (Static) */}
        <div className="absolute inset-0 pointer-events-none ui-layer">
            {/* Tools Menu */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
                <div className={`flex gap-2 bg-[#18181b]/80 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl transition-all ${isMenuOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none translate-y-10'}`}>
                    <button onClick={() => createNode('task_node')} className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-xl w-16">
                        <Target size={20} className="text-emerald-400"/> <span className="text-[8px]">Цель</span>
                    </button>
                    <button onClick={() => createNode('thought')} className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-xl w-16">
                        <PlusCircle size={20} className="text-blue-400"/> <span className="text-[8px]">Заметка</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-xl w-16">
                        <ImageIcon size={20} className="text-purple-400"/> <span className="text-[8px]">Фото</span>
                    </button>
                    <button onClick={() => createNode('annotation')} className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-xl w-16">
                        <TypeIcon size={20} className="text-yellow-400"/> <span className="text-[8px]">Текст</span>
                    </button>
                </div>
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="h-14 w-14 bg-[var(--accent)] rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform"
                >
                    <Plus size={28} className={`transition-transform duration-300 ${isMenuOpen ? 'rotate-45' : ''}`} />
                </button>
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-2 pointer-events-auto">
                <button onClick={() => setTransform(prev => ({...prev, scale: prev.scale + 0.1}))} className="p-3 bg-[#18181b] border border-white/10 rounded-xl text-white hover:bg-white/10">+</button>
                <button onClick={() => setTransform(prev => ({...prev, scale: Math.max(0.1, prev.scale - 0.1)}))} className="p-3 bg-[#18181b] border border-white/10 rounded-xl text-white hover:bg-white/10">-</button>
            </div>

            {/* Link Menu Modal */}
            {linkMenu && (
                <div 
                    className="absolute pointer-events-auto bg-[#18181b] p-2 rounded-xl border border-white/10 shadow-2xl flex gap-2"
                    style={{ left: linkMenu.x, top: linkMenu.y }}
                >
                    {LINK_COLORS.map(c => (
                        <button 
                            key={c}
                            onClick={() => createLink(c)}
                            className="w-6 h-6 rounded-full border border-white/20 hover:scale-125 transition-transform"
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            )}
        </div>

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
};

export default WhiteboardView;


import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Thought, NodeLink, LinkType, Attachment } from '../types';
import { 
  Plus, Maximize2, X, Link as LinkIcon, 
  Zap, Target, Share2, CheckSquare, 
  Wrench, LayoutGrid, Focus, Trash2,
  Sparkles, PlusCircle, ArrowRight, Circle,
  Paperclip, Image as ImageIcon, FileText, GitBranch,
  Type as TypeIcon, Palette, Link2
} from 'lucide-react';

interface WhiteboardViewProps {
  thoughts: Thought[];
  activeBoardId: string;
  onAdd: (thought: Thought) => void;
  onUpdate: (thought: Thought) => void;
  onDelete: (id: string) => void;
}

const WhiteboardView: React.FC<WhiteboardViewProps> = ({ thoughts, activeBoardId, onAdd, onUpdate, onDelete }) => {
  // Transform State (Pan/Zoom)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // Interaction State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null); // For connecting lines
  
  // Gesture State
  const lastTouchRef = useRef<{ x: number, y: number, dist: number }>({ x: 0, y: 0, dist: 0 });
  const isPinchingRef = useRef(false);
  const resizingImageIdRef = useRef<string | null>(null); // Track if we are resizing an image

  // UI State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Center
  useEffect(() => {
      setTransform({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 });
  }, []);

  // --- HELPERS ---
  const getDistance = (t1: React.Touch, t2: React.Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
  };

  const getMidpoint = (t1: React.Touch, t2: React.Touch) => {
      return {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
      };
  };

  const screenToWorld = (screenX: number, screenY: number) => {
      return {
          x: (screenX - transform.x) / transform.scale,
          y: (screenY - transform.y) / transform.scale
      };
  };

  // --- TOUCH HANDLERS (Gestures) ---
  
  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
          isPinchingRef.current = true;
          // Check if both touches are on an image node to trigger resize
          const target1 = e.touches[0].target as HTMLElement;
          const imgNode = target1.closest('[data-type="image"]');
          
          if (imgNode) {
              resizingImageIdRef.current = imgNode.getAttribute('data-node-id');
          } else {
              resizingImageIdRef.current = null;
          }

          lastTouchRef.current.dist = getDistance(e.touches[0], e.touches[1]);
          // If board zoom, store midpoint
          if (!resizingImageIdRef.current) {
             const mid = getMidpoint(e.touches[0], e.touches[1]);
             lastTouchRef.current.x = mid.x;
             lastTouchRef.current.y = mid.y;
          }
      } else if (e.touches.length === 1) {
          isPinchingRef.current = false;
          lastTouchRef.current.x = e.touches[0].clientX;
          lastTouchRef.current.y = e.touches[0].clientY;
          
          const target = e.target as HTMLElement;
          // Drag node check
          const nodeEl = target.closest('[data-node-id]');
          if (nodeEl && !target.closest('.no-drag')) {
              setDraggedNodeId(nodeEl.getAttribute('data-node-id'));
          } else if (!target.closest('.ui-layer')) {
              // Pan board start
          }
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2 && isPinchingRef.current) {
          const newDist = getDistance(e.touches[0], e.touches[1]);
          const scaleFactor = newDist / lastTouchRef.current.dist;

          if (resizingImageIdRef.current) {
              // --- IMAGE RESIZE ---
              const node = thoughts.find(n => n.id === resizingImageIdRef.current);
              if (node) {
                  const currentWidth = node.width || 200; // Default width
                  // Apply scale factor to width
                  const newWidth = Math.max(100, Math.min(800, currentWidth * scaleFactor));
                  onUpdate({ ...node, width: newWidth });
              }
          } else {
              // --- BOARD ZOOM ---
              const newScale = Math.min(Math.max(0.1, transform.scale * scaleFactor), 5);
              
              // Zoom towards center of pinch
              const mid = getMidpoint(e.touches[0], e.touches[1]);
              const worldMid = screenToWorld(mid.x, mid.y);
              
              // Adjust position to keep worldMid under mid
              const newX = mid.x - worldMid.x * newScale;
              const newY = mid.y - worldMid.y * newScale;

              setTransform({ x: newX, y: newY, scale: newScale });
          }
          lastTouchRef.current.dist = newDist;

      } else if (e.touches.length === 1 && !isPinchingRef.current) {
          const dx = e.touches[0].clientX - lastTouchRef.current.x;
          const dy = e.touches[0].clientY - lastTouchRef.current.y;

          if (draggedNodeId) {
              // --- DRAG NODE ---
              const node = thoughts.find(n => n.id === draggedNodeId);
              if (node) {
                  onUpdate({ ...node, x: (node.x || 0) + dx / transform.scale, y: (node.y || 0) + dy / transform.scale });
              }
          } else {
              // --- PAN BOARD ---
              setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          }
          lastTouchRef.current.x = e.touches[0].clientX;
          lastTouchRef.current.y = e.touches[0].clientY;
      }
  };

  const handleTouchEnd = () => {
      setDraggedNodeId(null);
      isPinchingRef.current = false;
      resizingImageIdRef.current = null;
  };

  // --- MOUSE HANDLERS (Fallback for desktop) ---
  const handleMouseDown = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.ui-layer')) return;
      const nodeEl = target.closest('[data-node-id]');
      
      if (nodeEl && !target.closest('.no-drag')) {
          setDraggedNodeId(nodeEl.getAttribute('data-node-id'));
      }
      lastTouchRef.current.x = e.clientX;
      lastTouchRef.current.y = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (e.buttons !== 1) return; // Only drag on left click
      const dx = e.clientX - lastTouchRef.current.x;
      const dy = e.clientY - lastTouchRef.current.y;

      if (draggedNodeId) {
          const node = thoughts.find(n => n.id === draggedNodeId);
          if (node) {
              onUpdate({ ...node, x: (node.x || 0) + dx / transform.scale, y: (node.y || 0) + dy / transform.scale });
          }
      } else {
          setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      }
      lastTouchRef.current.x = e.clientX;
      lastTouchRef.current.y = e.clientY;
  };

  const handleMouseUp = () => {
      setDraggedNodeId(null);
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
          metadata,
          width: type === 'image' ? 200 : undefined
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

  const initiateLink = (nodeId: string, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      if (connectingSourceId === nodeId) {
          setConnectingSourceId(null); // Cancel
      } else if (connectingSourceId) {
          // Complete Connection
          const source = thoughts.find(n => n.id === connectingSourceId);
          if (source) {
              // Avoid duplicates
              if (!source.links?.some(l => l.targetId === nodeId)) {
                  onUpdate({
                      ...source,
                      links: [...(source.links || []), { targetId: nodeId, type: 'related', color: '#555' }]
                  });
              }
          }
          setConnectingSourceId(null);
      } else {
          // Start Connection
          setConnectingSourceId(nodeId);
      }
  };

  // --- RENDER ---
  return (
    <div 
        ref={containerRef}
        className="w-full h-full relative overflow-hidden bg-[#0a0a0a] touch-none select-none cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
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
                {thoughts.map(node => (node.links || []).map((link, i) => {
                    const target = thoughts.find(n => n.id === link.targetId);
                    if(!target) return null;
                    const sx = 50000 + (node.x || 0); 
                    const sy = 50000 + (node.y || 0);
                    const tx = 50000 + (target.x || 0);
                    const ty = 50000 + (target.y || 0);
                    return <line key={`${node.id}-${i}`} x1={sx} y1={sy} x2={tx} y2={ty} stroke={link.color || '#555'} strokeWidth="2" strokeOpacity="0.6" />;
                }))}
                
                {/* Visual feedback line would go here if we tracked cursor pos, currently we just highlight nodes */}
            </svg>

            {/* NODES LAYER */}
            {thoughts.map(node => (
                <div
                    key={node.id}
                    data-node-id={node.id}
                    data-type={node.type}
                    onClick={() => { if(connectingSourceId && connectingSourceId !== node.id) initiateLink(node.id, {} as any); }}
                    className={`absolute flex flex-col items-center justify-center transition-all duration-200
                        ${node.type === 'annotation' ? '' : 'rounded-2xl border shadow-xl backdrop-blur-md'}
                        ${editingNodeId === node.id ? 'ring-2 ring-[var(--accent)] z-50' : 'z-10'}
                        ${node.type === 'task_node' ? 'bg-[#18181b] border-l-4 border-l-emerald-500 border-white/10 w-64' : ''}
                        ${node.type === 'thought' ? 'bg-[#121214]/90 border-white/10 w-56' : ''}
                        ${node.type === 'image' ? 'p-1 bg-white/5 border-transparent' : ''}
                        ${connectingSourceId === node.id ? 'ring-4 ring-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : ''}
                        ${connectingSourceId && connectingSourceId !== node.id ? 'hover:ring-2 hover:ring-yellow-500/50 cursor-pointer' : ''}
                    `}
                    style={{
                        left: node.x, top: node.y,
                        transform: 'translate(-50%, -50%)',
                        width: node.type === 'image' ? (node.width || 200) : undefined // Apply resized width
                    }}
                >
                    {/* Link Trigger Button (On every node) */}
                    <button 
                        onClick={(e) => initiateLink(node.id, e)}
                        className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center border no-drag transition-all z-20 ${connectingSourceId === node.id ? 'bg-yellow-500 text-black border-yellow-500 rotate-12 scale-110' : 'bg-[#18181b] text-white/50 border-white/10 hover:text-white hover:border-[var(--accent)]'}`}
                    >
                        <Link2 size={14} />
                    </button>

                    {/* Node Content */}
                    {node.type === 'image' ? (
                        <div className="relative group/img w-full h-full">
                            <img src={node.metadata?.imageSrc} className="w-full h-full rounded-lg shadow-lg pointer-events-none select-none" />
                            <button onTouchEnd={() => onDelete(node.id)} onMouseUp={() => onDelete(node.id)} className="no-drag absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-auto"><X size={12}/></button>
                        </div>
                    ) : node.type === 'annotation' ? (
                        <textarea
                            value={node.content}
                            onChange={(e) => onUpdate({ ...node, content: e.target.value })}
                            className="bg-transparent text-white font-black text-2xl outline-none text-center resize-none w-80 overflow-hidden no-drag"
                            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                        />
                    ) : (
                        <div className="w-full p-4">
                            <div className="flex justify-between items-center mb-2 opacity-50 text-[10px] font-black uppercase tracking-widest">
                                <span>{node.type === 'task_node' ? 'Цель' : 'Заметка'}</span>
                                <button onTouchEnd={() => onDelete(node.id)} onMouseUp={() => onDelete(node.id)} className="hover:text-red-500 no-drag"><X size={12}/></button>
                            </div>
                            <textarea
                                value={node.content}
                                onChange={(e) => onUpdate({ ...node, content: e.target.value })}
                                className="w-full bg-transparent text-white text-sm outline-none resize-none font-medium pointer-events-auto no-drag"
                                rows={3}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>

        {/* UI LAYER (Static) */}
        <div className="absolute inset-0 pointer-events-none ui-layer">
            
            {/* Context Info */}
            {connectingSourceId && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse shadow-lg pointer-events-auto" onClick={() => setConnectingSourceId(null)}>
                    Выберите объект для связи... (Нажми чтобы отменить)
                </div>
            )}

            {/* Tools Menu (Bottom Left) */}
            <div className="absolute bottom-8 left-8 flex flex-col items-start gap-4 pointer-events-auto">
                <div className={`flex flex-col gap-2 bg-[#18181b]/90 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl transition-all origin-bottom-left ${isMenuOpen ? 'scale-100 opacity-100' : 'scale-75 opacity-0 pointer-events-none translate-y-10'}`}>
                    <button onClick={() => createNode('task_node')} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-xl w-32">
                        <Target size={18} className="text-emerald-400"/> <span className="text-[10px] font-bold text-white">Цель</span>
                    </button>
                    <button onClick={() => createNode('thought')} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-xl w-32">
                        <PlusCircle size={18} className="text-blue-400"/> <span className="text-[10px] font-bold text-white">Заметка</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-xl w-32">
                        <ImageIcon size={18} className="text-purple-400"/> <span className="text-[10px] font-bold text-white">Фото</span>
                    </button>
                    <button onClick={() => createNode('annotation')} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-xl w-32">
                        <TypeIcon size={18} className="text-yellow-400"/> <span className="text-[10px] font-bold text-white">Текст</span>
                    </button>
                </div>
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="h-14 w-14 bg-[var(--accent)] rounded-full flex items-center justify-center text-white shadow-[0_0_30px_var(--accent-glow)] hover:scale-110 transition-transform active:scale-90"
                >
                    <Plus size={28} className={`transition-transform duration-300 ${isMenuOpen ? 'rotate-45' : ''}`} />
                </button>
            </div>
        </div>

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
};

export default WhiteboardView;

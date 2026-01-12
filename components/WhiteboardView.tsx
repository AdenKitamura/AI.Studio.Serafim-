import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Thought } from '../types';
import { 
  Plus, Maximize2, X, Link as LinkIcon, 
  Target, LayoutGrid, Focus,
  PlusCircle, Link2, Crosshair, Image as ImageIcon, Type as TypeIcon
} from 'lucide-react';

interface WhiteboardViewProps {
  thoughts: Thought[];
  activeBoardId?: string;
  onAdd: (thought: Thought) => void;
  onUpdate: (thought: Thought) => void;
  onDelete: (id: string) => void;
  onConvertToTask?: (title: string) => void;
}

const WhiteboardView: React.FC<WhiteboardViewProps> = ({ thoughts, activeBoardId, onAdd, onUpdate, onDelete, onConvertToTask }) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  
  const lastTouchRef = useRef<{ x: number, y: number, dist: number }>({ x: 0, y: 0, dist: 0 });
  const isPinchingRef = useRef(false);
  const resizingImageIdRef = useRef<string | null>(null);
  const longPressTimerRef = useRef<any>(null);
  const isDraggingRef = useRef(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      centerBoard();
  }, []);

  const centerBoard = () => {
      setTransform({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 });
  };

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

  const handleTouchStart = (e: React.TouchEvent) => {
      if(e.touches.length === 2) {
          e.preventDefault();
          isPinchingRef.current = true;
          const target1 = e.touches[0].target as HTMLElement;
          const target2 = e.touches[1].target as HTMLElement;
          const imgNode = target1.closest('[data-type="image"]') || target2.closest('[data-type="image"]');
          if (imgNode) resizingImageIdRef.current = imgNode.getAttribute('data-node-id');
          else resizingImageIdRef.current = null;
          const dist = getDistance(e.touches[0], e.touches[1]);
          const mid = getMidpoint(e.touches[0], e.touches[1]);
          lastTouchRef.current = { x: mid.x, y: mid.y, dist };
      } else if (e.touches.length === 1) {
          const t = e.touches[0];
          lastTouchRef.current = { x: t.clientX, y: t.clientY, dist: 0 };
          const target = e.target as HTMLElement;
          const nodeEl = target.closest('[data-node-id]');
          if (nodeEl && !target.closest('.no-drag')) {
              const nodeId = nodeEl.getAttribute('data-node-id');
              longPressTimerRef.current = setTimeout(() => {
                  setDraggedNodeId(nodeId);
                  isDraggingRef.current = true;
                  if (navigator.vibrate) navigator.vibrate(50);
              }, 500); 
          }
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      e.preventDefault(); 
      if (e.touches.length === 2 && isPinchingRef.current) {
          const newDist = getDistance(e.touches[0], e.touches[1]);
          const scaleFactor = newDist / (lastTouchRef.current.dist || 1);
          if (resizingImageIdRef.current) {
              const node = thoughts.find(n => n.id === resizingImageIdRef.current);
              if (node) {
                  const currentWidth = node.width || 200;
                  const newWidth = Math.max(100, Math.min(1000, currentWidth * scaleFactor));
                  onUpdate({ ...node, width: newWidth });
                  lastTouchRef.current.dist = newDist;
              }
          } else {
              const newMid = getMidpoint(e.touches[0], e.touches[1]);
              const newScale = Math.min(Math.max(0.1, transform.scale * scaleFactor), 5);
              const dx = newMid.x - lastTouchRef.current.x;
              const dy = newMid.y - lastTouchRef.current.y;
              setTransform(prev => ({ scale: newScale, x: prev.x + dx, y: prev.y + dy }));
              lastTouchRef.current = { x: newMid.x, y: newMid.y, dist: newDist };
          }
      } else if (e.touches.length === 1) {
          const t = e.touches[0];
          const dx = t.clientX - lastTouchRef.current.x;
          const dy = t.clientY - lastTouchRef.current.y;
          if (longPressTimerRef.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
          }
          if (isDraggingRef.current && draggedNodeId) {
              const node = thoughts.find(n => n.id === draggedNodeId);
              if (node) {
                  onUpdate({ ...node, x: (node.x || 0) + dx / transform.scale, y: (node.y || 0) + dy / transform.scale });
              }
          } else if (!draggedNodeId && !isPinchingRef.current && !resizingImageIdRef.current) {
              setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          }
          lastTouchRef.current = { ...lastTouchRef.current, x: t.clientX, y: t.clientY };
      }
  };

  const handleTouchEnd = () => {
      if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
      setDraggedNodeId(null);
      isDraggingRef.current = false;
      isPinchingRef.current = false;
      resizingImageIdRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-node-id]') || target.closest('.floating-ui')) return;
    isDraggingRef.current = true; 
    lastTouchRef.current = { x: e.clientX, y: e.clientY, dist: 0 };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current && !draggedNodeId) {
        const dx = e.clientX - lastTouchRef.current.x;
        const dy = e.clientY - lastTouchRef.current.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        lastTouchRef.current = { x: e.clientX, y: e.clientY, dist: 0 };
    } else if (draggedNodeId) {
        const node = thoughts.find(n => n.id === draggedNodeId);
        if (node) {
            const dx = (e.clientX - lastTouchRef.current.x) / transform.scale;
            const dy = (e.clientY - lastTouchRef.current.y) / transform.scale;
            onUpdate({ ...node, x: (node.x || 0) + dx, y: (node.y || 0) + dy });
            lastTouchRef.current = { x: e.clientX, y: e.clientY, dist: 0 };
        }
    }
  };

  const handleMouseUp = () => { isDraggingRef.current = false; setDraggedNodeId(null); };

  const createNode = (type: Thought['type']) => {
      const pos = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
      onAdd({
          id: Date.now().toString(),
          content: type === 'task_node' ? 'Новая цель' : type === 'annotation' ? 'Текст' : 'Заметка',
          type,
          tags: [],
          createdAt: new Date().toISOString(),
          x: pos.x,
          y: pos.y,
          width: type === 'image' ? 200 : undefined
      });
      setIsMenuOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => {
             const pos = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
             onAdd({
                 id: Date.now().toString(),
                 content: 'Image',
                 type: 'image',
                 tags: [],
                 createdAt: new Date().toISOString(),
                 x: pos.x,
                 y: pos.y,
                 width: 200,
                 metadata: { imageSrc: reader.result as string }
             });
          };
          reader.readAsDataURL(file);
      }
  };

  const initiateLink = (nodeId: string, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      if (connectingSourceId === nodeId) {
          setConnectingSourceId(null); 
      } else if (connectingSourceId) {
          const source = thoughts.find(n => n.id === connectingSourceId);
          if (source && !source.links?.some(l => l.targetId === nodeId)) {
              onUpdate({
                  ...source,
                  links: [...(source.links || []), { targetId: nodeId, type: 'related', color: '#555' }]
              });
          }
          setConnectingSourceId(null);
      } else {
          setConnectingSourceId(nodeId);
      }
  };

  const autoLayout = () => {
    if (thoughts.length === 0) return;
    const itemsPerRow = Math.ceil(Math.sqrt(thoughts.length));
    thoughts.forEach((node, idx) => {
      onUpdate({
        ...node,
        x: (idx % itemsPerRow) * 300 - (itemsPerRow * 150),
        y: Math.floor(idx / itemsPerRow) * 250 - (itemsPerRow * 125)
      });
    });
  };

  const focusContent = () => {
    if (thoughts.length === 0) { centerBoard(); return; }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    thoughts.forEach(n => {
      minX = Math.min(minX, n.x || 0); maxX = Math.max(maxX, n.x || 0);
      minY = Math.min(minY, n.y || 0); maxY = Math.max(maxY, n.y || 0);
    });
    setTransform({ 
        x: window.innerWidth / 2 - ((minX + maxX) / 2) * transform.scale, 
        y: window.innerHeight / 2 - ((minY + maxY) / 2) * transform.scale,
        scale: transform.scale 
    });
  };

  return (
    <div className="fixed inset-0 z-0">
        {/* CANVAS */}
        <div 
            ref={containerRef}
            className="absolute inset-0 bg-[#0a0a0a] touch-none select-none overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={(e) => {
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                const newScale = Math.min(Math.max(delta * transform.scale, 0.2), 3);
                setTransform(prev => ({ ...prev, scale: newScale }));
            }}
        >
            <div 
                className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: '0 0',
                    backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
                    backgroundSize: `50px 50px`
                }}
            />

            <div 
                className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform"
                style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
            >
                {/* LINKS */}
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
                </svg>

                {/* NODES */}
                {thoughts.map(node => (
                    <div
                        key={node.id}
                        data-node-id={node.id}
                        data-type={node.type}
                        onMouseDown={(e) => { e.stopPropagation(); setDraggedNodeId(node.id); lastTouchRef.current = { x: e.clientX, y: e.clientY, dist: 0 }; }}
                        onClick={() => { if(connectingSourceId && connectingSourceId !== node.id) initiateLink(node.id, {} as any); }}
                        className={`absolute flex flex-col items-center justify-center transition-all duration-200
                            ${node.type === 'annotation' ? 'opacity-70 hover:opacity-100' : 'rounded-2xl border shadow-xl backdrop-blur-md'}
                            ${draggedNodeId === node.id ? 'scale-110 shadow-2xl z-[100] cursor-grabbing' : 'z-10'}
                            ${node.type === 'task_node' ? 'bg-[#18181b] border-l-4 border-l-emerald-500 border-white/10 w-64' : ''}
                            ${node.type === 'thought' ? 'bg-[#121214]/90 border-white/10 w-56' : ''}
                            ${node.type === 'image' ? 'p-1 bg-white/5 border-transparent' : ''}
                            ${connectingSourceId === node.id ? 'ring-4 ring-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : ''}
                        `}
                        style={{
                            left: node.x, top: node.y,
                            transform: 'translate(-50%, -50%)',
                            width: node.type === 'image' ? (node.width || 200) : undefined
                        }}
                    >
                        {/* Link Button */}
                        <button 
                            onClick={(e) => initiateLink(node.id, e)}
                            className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center border no-drag transition-all z-20 ${connectingSourceId === node.id ? 'bg-yellow-500 text-black border-yellow-500 rotate-12 scale-110' : 'bg-[#18181b] text-white/50 border-white/10 hover:text-white hover:border-[var(--accent)]'}`}
                        >
                            <Link2 size={14} />
                        </button>

                        {/* Content */}
                        {node.type === 'image' ? (
                            <div className="relative group/img w-full h-full">
                                <img src={node.metadata?.imageSrc} className="w-full h-full rounded-lg shadow-lg pointer-events-none select-none" />
                                <button onTouchEnd={() => onDelete(node.id)} onMouseDown={(e) => { e.stopPropagation(); onDelete(node.id); }} className="no-drag absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-auto"><X size={12}/></button>
                            </div>
                        ) : node.type === 'annotation' ? (
                            <textarea
                                value={node.content}
                                onChange={(e) => onUpdate({ ...node, content: e.target.value })}
                                onMouseDown={(e) => e.stopPropagation()} 
                                className="bg-transparent text-white font-black text-2xl outline-none text-center resize-none w-80 overflow-hidden"
                                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                            />
                        ) : (
                            <div className="w-full p-4">
                                <div className="flex justify-between items-center mb-2 opacity-50 text-[10px] font-black uppercase tracking-widest">
                                    <span>{node.type === 'task_node' ? 'Цель' : 'Заметка'}</span>
                                    <button onTouchEnd={() => onDelete(node.id)} onMouseDown={(e) => { e.stopPropagation(); onDelete(node.id); }} className="hover:text-red-500 no-drag"><X size={12}/></button>
                                </div>
                                <textarea
                                    value={node.content}
                                    onChange={(e) => onUpdate({ ...node, content: e.target.value })}
                                    onMouseDown={(e) => e.stopPropagation()} 
                                    className="w-full bg-transparent text-white text-sm outline-none resize-none font-medium pointer-events-auto no-drag"
                                    rows={3}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* UI LAYER */}
        <div className="absolute inset-0 pointer-events-none z-50">
            <button onClick={centerBoard} className="absolute bottom-8 right-8 pointer-events-auto p-4 bg-[#18181b] border border-white/10 rounded-full text-white/50 hover:text-white shadow-lg">
                <Crosshair size={24} />
            </button>
            
            <div className="absolute top-20 right-6 flex flex-col gap-2 pointer-events-auto">
                <button onClick={autoLayout} className="p-3 bg-[#18181b]/80 backdrop-blur rounded-xl border border-white/10 text-white/60 hover:text-white transition-all"><LayoutGrid size={20} /></button>
                <button onClick={focusContent} className="p-3 bg-[#18181b]/80 backdrop-blur rounded-xl border border-white/10 text-white/60 hover:text-white transition-all"><Focus size={20} /></button>
            </div>

            {connectingSourceId && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse shadow-lg pointer-events-auto" onClick={() => setConnectingSourceId(null)}>
                    Выберите объект для связи...
                </div>
            )}

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
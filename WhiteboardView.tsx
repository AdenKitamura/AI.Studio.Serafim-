
import React, { useState, useMemo, useRef } from 'react';
import { Thought } from '../types';
import { 
  Plus, Maximize2, X, Link as LinkIcon, 
  Zap, Target, Share2, CheckSquare, 
  Wrench, LayoutGrid, Focus, Trash2,
  Sparkles, PlusCircle
} from 'lucide-react';

interface WhiteboardViewProps {
  thoughts: Thought[];
  onAdd: (thought: Thought) => void;
  onUpdate: (thought: Thought) => void;
  onDelete: (id: string) => void;
  onConvertToTask?: (title: string) => void;
}

const WhiteboardView: React.FC<WhiteboardViewProps> = ({ thoughts, onAdd, onUpdate, onDelete, onConvertToTask }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const nodes = useMemo(() => 
    thoughts.filter(t => t.type !== 'quote' && !t.isArchived), 
  [thoughts]);

  const screenToCanvas = (clientX: number, clientY: number) => ({
    x: (clientX - offset.x) / zoom,
    y: (clientY - offset.y) / zoom
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.node-card') || target.closest('.floating-ui')) return;
    setIsPanning(true);
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
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
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
      linkedIds: []
    };
    onAdd(newNode);
    setIsAddMenuOpen(false);
  };

  const autoLayout = () => {
    if (nodes.length === 0) return;
    const itemsPerRow = Math.ceil(Math.sqrt(nodes.length));
    nodes.forEach((node, idx) => {
      onUpdate({
        ...node,
        x: (idx % itemsPerRow) * 300 - (itemsPerRow * 150),
        y: Math.floor(idx / itemsPerRow) * 250 - (itemsPerRow * 125)
      });
    });
    setIsToolsMenuOpen(false);
  };

  const focusContent = () => {
    if (nodes.length === 0) {
      setOffset({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      setZoom(1);
      return;
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x || 0); maxX = Math.max(maxX, n.x || 0);
      minY = Math.min(minY, n.y || 0); maxY = Math.max(maxY, n.y || 0);
    });
    setOffset({ x: window.innerWidth / 2 - ((minX + maxX) / 2) * zoom, y: window.innerHeight / 2 - ((minY + maxY) / 2) * zoom });
    setIsToolsMenuOpen(false);
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
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`, backgroundSize: `${40 * zoom}px ${40 * zoom}px`, backgroundPosition: `${offset.x}px ${offset.y}px` }} />

      <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
        {nodes.map(node => (node.linkedIds || []).map(targetId => {
          const target = nodes.find(n => n.id === targetId);
          if (!target) return null;
          return <line key={`${node.id}-${targetId}`} x1={offset.x + (node.x || 0) * zoom} y1={offset.y + (node.y || 0) * zoom} x2={offset.x + (target.x || 0) * zoom} y2={offset.y + (target.y || 0) * zoom} stroke="var(--accent)" strokeWidth={1.5 * zoom} strokeOpacity="0.2" />;
        }))}
      </svg>

      <div className="absolute inset-0 pointer-events-none">
        {nodes.map(node => (
          <div 
            key={node.id}
            onMouseDown={(e) => { e.stopPropagation(); setDraggedNodeId(node.id); lastMousePos.current = { x: e.clientX, y: e.clientY }; }}
            className={`node-card absolute pointer-events-auto p-4 rounded-2xl border transition-all duration-300 cursor-grab active:cursor-grabbing bg-[#121214]/85 border-white/5 shadow-2xl ${node.type === 'task_node' ? 'border-l-4 border-l-emerald-500' : ''}`}
            style={{ left: offset.x + (node.x || 0) * zoom, top: offset.y + (node.y || 0) * zoom, width: 200 * zoom, transform: 'translate(-50%, -50%)', backdropFilter: 'blur(12px)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest" style={{ fontSize: 8 * zoom }}>{node.type}</span>
              <button onMouseDown={(e) => { e.stopPropagation(); onDelete(node.id); }} className="p-1 hover:bg-white/5 rounded text-white/20 hover:text-red-500"><X size={10 * zoom} /></button>
            </div>
            <textarea value={node.content} onMouseDown={e => e.stopPropagation()} onChange={e => onUpdate({ ...node, content: e.target.value })} className="w-full bg-transparent text-white focus:outline-none resize-none no-scrollbar leading-tight font-medium" style={{ fontSize: 13 * zoom, height: 50 * zoom }} />
          </div>
        ))}
      </div>

      {/* LEFT CORNER: ADD MENU */}
      <div className="floating-ui fixed bottom-28 left-6 flex flex-col items-start gap-3 z-[60]">
          {isAddMenuOpen && (
            <div className="flex flex-col gap-1 p-1.5 bg-[#18181b]/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-3xl animate-in slide-in-from-bottom-2">
                <button onClick={() => createNode('task_node')} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-xl text-white/70 hover:text-emerald-400 transition-all">
                    <Target size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Цель</span>
                </button>
                <button onClick={() => createNode('thought')} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-xl text-white/70 hover:text-[var(--accent)] transition-all">
                    <PlusCircle size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Мысль</span>
                </button>
            </div>
          )}
          <button 
            onClick={() => { setIsAddMenuOpen(!isAddMenuOpen); setIsToolsMenuOpen(false); }}
            className={`p-4 rounded-2xl shadow-3xl transition-all border border-white/10 ${isAddMenuOpen ? 'bg-white text-black rotate-45' : 'bg-[var(--accent)] text-white hover:scale-105'}`}
          >
              <Plus size={24} strokeWidth={3} />
          </button>
      </div>

      {/* RIGHT CORNER: TOOLS MENU */}
      <div className="floating-ui fixed bottom-28 right-6 flex flex-col items-end gap-3 z-[60]">
          {isToolsMenuOpen && (
              <div className="flex flex-col gap-1 p-1.5 bg-[#18181b]/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-3xl animate-in slide-in-from-bottom-2">
                  <button onClick={autoLayout} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-xl text-white/70 hover:text-blue-400 transition-all">
                      <LayoutGrid size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Сетка</span>
                  </button>
                  <button onClick={focusContent} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-xl text-white/70 hover:text-purple-400 transition-all">
                      <Focus size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Фокус</span>
                  </button>
                  <button onClick={() => { setZoom(1); setOffset({x: window.innerWidth/2, y: window.innerHeight/2}); setIsToolsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-xl text-white/70 hover:text-white transition-all">
                      <Maximize2 size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Сброс</span>
                  </button>
              </div>
          )}
          <button 
              onClick={() => { setIsToolsMenuOpen(!isToolsMenuOpen); setIsAddMenuOpen(false); }}
              className={`p-4 bg-[#18181b]/80 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-xl transition-all ${isToolsMenuOpen ? 'text-[var(--accent)] border-[var(--accent)]/30' : 'text-white/40 hover:text-white'}`}
          >
              <Wrench size={22} />
          </button>
      </div>
    </div>
  );
};

export default WhiteboardView;

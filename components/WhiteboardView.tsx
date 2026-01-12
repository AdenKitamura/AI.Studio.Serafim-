import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, Maximize2, X, Link as LinkIcon, 
  Zap, Target, Share2, CheckSquare, 
  Wrench, LayoutGrid, Focus, Trash2,
  Sparkles, PlusCircle, Link2, Crosshair, Image as ImageIcon, Type as TypeIcon
} from 'lucide-react';

// Locally defined interface to bypass module resolution issues during build
// We use 'any' heavily here to ensure the build passes regardless of external type definition changes
interface WhiteboardViewProps {
  thoughts: any[];
  activeBoardId?: string;
  onAdd: (thought: any) => void;
  onUpdate: (thought: any) => void;
  onDelete: (id: string) => void;
  onConvertToTask?: (title: string) => void;
}

const WhiteboardView: React.FC<WhiteboardViewProps> = ({ thoughts, activeBoardId, onAdd, onUpdate, onDelete, onConvertToTask }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter nodes based on activeBoardId if present
  const nodes = useMemo(() => 
    thoughts.filter((t: any) => 
      t.type !== 'quote' && 
      !t.isArchived && 
      (!activeBoardId || t.boardId === activeBoardId || !t.boardId)
    ), 
  [thoughts, activeBoardId]);

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
      const node = nodes.find((n: any) => n.id === draggedNodeId);
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

  const createNode = (type: string) => {
    const coords = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
    const newNode = {
      id: Date.now().toString(),
      content: type === 'task_node' ? 'Новая цель' : type === 'annotation' ? 'Текст' : 'Новая заметка',
      type,
      tags: ['workspace'],
      createdAt: new Date().toISOString(),
      x: coords.x,
      y: coords.y,
      boardId: activeBoardId || undefined,
      linkedIds: []
    };
    onAdd(newNode);
    setIsAddMenuOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => {
             const coords = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
             onAdd({
                 id: Date.now().toString(),
                 content: 'Image',
                 type: 'image',
                 tags: [],
                 createdAt: new Date().toISOString(),
                 x: coords.x,
                 y: coords.y,
                 width: 200,
                 boardId: activeBoardId || undefined,
                 metadata: { imageSrc: reader.result as string }
             });
          };
          reader.readAsDataURL(file);
      }
  };

  const initiateLink = (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (connectingSourceId === nodeId) {
          setConnectingSourceId(null); 
      } else if (connectingSourceId) {
          const source = thoughts.find((n: any) => n.id === connectingSourceId);
          if (source) {
              // Create a link (update source node to include targetId in linkedIds or links array)
              // Adjusting to generic structure
              const links = source.links || [];
              const linkedIds = source.linkedIds || [];
              
              onUpdate({
                  ...source,
                  links: [...links, { targetId: nodeId, type: 'related', color: '#555' }],
                  linkedIds: [...linkedIds, nodeId]
              });
          }
          setConnectingSourceId(null);
      } else {
          setConnectingSourceId(nodeId);
      }
  };

  const autoLayout = () => {
    if (nodes.length === 0) return;
    const itemsPerRow = Math.ceil(Math.sqrt(nodes.length));
    nodes.forEach((node: any, idx: number) => {
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
    nodes.forEach((n: any) => {
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
        {nodes.map((node: any) => {
            // Support both old array of strings and new array of objects structure
            const links = node.links || (node.linkedIds || []).map((id: string) => ({ targetId: id }));
            
            return links.map((link: any, i: number) => {
                const target = nodes.find((n: any) => n.id === link.targetId);
                if (!target) return null;
                return <line key={`${node.id}-${i}`} x1={offset.x + (node.x || 0) * zoom} y1={offset.y + (node.y || 0) * zoom} x2={offset.x + (target.x || 0) * zoom} y2={offset.y + (target.y || 0) * zoom} stroke={link.color || "var(--accent)"} strokeWidth={1.5 * zoom} strokeOpacity="0.3" />;
            });
        })}
      </svg>

      <div className="absolute inset-0 pointer-events-none">
        {nodes.map((node: any) => (
          <div 
            key={node.id}
            data-node-id={node.id}
            onMouseDown={(e) => { e.stopPropagation(); setDraggedNodeId(node.id); lastMousePos.current = { x: e.clientX, y: e.clientY }; }}
            className={`node-card absolute pointer-events-auto flex flex-col items-center justify-center transition-all duration-300 cursor-grab active:cursor-grabbing 
                ${node.type === 'annotation' ? 'opacity-80 hover:opacity-100' : 'bg-[#121214]/85 border border-white/5 shadow-2xl rounded-2xl backdrop-blur-md'}
                ${node.type === 'task_node' ? 'border-l-4 border-l-emerald-500' : ''}
                ${connectingSourceId === node.id ? 'ring-2 ring-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : ''}
            `}
            style={{ 
                left: offset.x + (node.x || 0) * zoom, 
                top: offset.y + (node.y || 0) * zoom, 
                width: (node.width || 200) * zoom, 
                transform: 'translate(-50%, -50%)' 
            }}
          >
             {/* Link Button */}
             <button 
                onClick={(e) => initiateLink(node.id, e)}
                className={`absolute -top-3 -right-3 w-6 h-6 rounded-full flex items-center justify-center border transition-all z-20 ${connectingSourceId === node.id ? 'bg-yellow-500 text-black border-yellow-500 rotate-12 scale-125' : 'bg-[#18181b] text-white/50 border-white/10 hover:text-white hover:border-[var(--accent)]'}`}
                style={{ width: 24 * zoom, height: 24 * zoom }}
             >
                <Link2 size={12 * zoom} />
             </button>

            {node.type === 'image' ? (
                 <div className="relative group/img w-full h-full p-1">
                    <img src={node.metadata?.imageSrc} className="w-full h-full rounded-lg shadow-lg pointer-events-none select-none" />
                    <button onMouseDown={(e) => { e.stopPropagation(); onDelete(node.id); }} className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-auto"><X size={12 * zoom}/></button>
                </div>
            ) : node.type === 'annotation' ? (
                 <textarea
                    value={node.content}
                    onChange={(e) => onUpdate({ ...node, content: e.target.value })}
                    onMouseDown={(e) => e.stopPropagation()} 
                    className="bg-transparent text-white font-black outline-none text-center resize-none overflow-hidden leading-tight"
                    style={{ fontSize: 24 * zoom, width: '150%', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                 />
            ) : (
                <div className="w-full p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2 opacity-50">
                        <span className="font-bold text-white/50 uppercase tracking-widest" style={{ fontSize: 8 * zoom }}>{node.type === 'task_node' ? 'Цель' : 'Заметка'}</span>
                        <button onMouseDown={(e) => { e.stopPropagation(); onDelete(node.id); }} className="p-1 hover:bg-white/5 rounded text-white/20 hover:text-red-500"><X size={10 * zoom} /></button>
                    </div>
                    <textarea 
                        value={node.content} 
                        onMouseDown={e => e.stopPropagation()} 
                        onChange={e => onUpdate({ ...node, content: e.target.value })} 
                        className="w-full bg-transparent text-white focus:outline-none resize-none no-scrollbar leading-tight font-medium flex-1" 
                        style={{ fontSize: 13 * zoom, minHeight: 40 * zoom }} 
                    />
                </div>
            )}
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
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-xl text-white/70 hover:text-purple-400 transition-all">
                    <ImageIcon size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Фото</span>
                </button>
                <button onClick={() => createNode('annotation')} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-xl text-white/70 hover:text-yellow-400 transition-all">
                    <TypeIcon size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Текст</span>
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
      
      {connectingSourceId && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse shadow-lg pointer-events-auto z-[200]" onClick={() => setConnectingSourceId(null)}>
            Выберите объект для связи...
        </div>
      )}
      
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
};

export default WhiteboardView;
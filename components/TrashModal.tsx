import React, { useState, useEffect } from 'react';
import { X, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { TrashItem } from '../types';
import { dbService } from '../services/dbService';

interface TrashModalProps {
  onClose: () => void;
  onRestore: (item: TrashItem) => void;
}

const TrashModal: React.FC<TrashModalProps> = ({ onClose, onRestore }) => {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    setIsLoading(true);
    try {
      const trashItems = await dbService.getAll<TrashItem>('trash');
      // Sort by newest deleted first
      trashItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
      
      // Auto-cleanup items older than 30 days
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const validItems = [];
      
      for (const item of trashItems) {
        if (now - new Date(item.deletedAt).getTime() > thirtyDays) {
           await dbService.deleteItem('trash', item.id, false);
        } else {
           validItems.push(item);
        }
      }
      
      setItems(validItems);
    } catch (e) {
      console.error("Failed to load trash", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handePermanentDelete = async (id: string) => {
    await dbService.deleteItem('trash', id, false);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Вы уверены? Это действие необратимо.')) return;
    for (const item of items) {
       await dbService.deleteItem('trash', item.id, false);
    }
    setItems([]);
  };

  const getTitle = (item: TrashItem) => {
      const obj = item.originalItem;
      if (item.storeName === 'tasks') return obj.title || 'Задача без названия';
      if (item.storeName === 'thoughts') return obj.content ? obj.content.substring(0, 40) + '...' : 'Заметка';
      if (item.storeName === 'projects') return obj.title || 'Проект';
      if (item.storeName === 'habits') return obj.title || 'Привычка';
      if (item.storeName === 'memories') return obj.content || 'Память';
      return 'Неизвестный элемент';
  };

  const getStoreLabel = (store: string) => {
      switch(store) {
          case 'tasks': return 'Задача';
          case 'thoughts': return 'Мысль';
          case 'projects': return 'Проект';
          case 'habits': return 'Привычка';
          case 'memories': return 'Память';
          default: return store;
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="w-full max-w-2xl bg-[var(--bg-main)] border border-[var(--border-color)] rounded-3xl shadow-2xl flex flex-col h-[80vh] overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-card)]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
              <Trash2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[var(--text-main)]">Корзина</h2>
              <p className="text-xs text-[var(--text-muted)]">Удаленные элементы хранятся 30 дней</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
              {items.length > 0 && (
                  <button onClick={handleEmptyTrash} className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold uppercase hover:bg-red-500 hover:text-white transition-all">
                      Очистить
                  </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-[var(--bg-item)] rounded-full text-[var(--text-muted)] transition-colors">
                <X size={24} />
              </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
             <div className="flex justify-center items-center h-full opacity-50">
                <div className="animate-spin w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full"></div>
             </div>
          ) : items.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-center opacity-50 space-y-4">
                 <Trash2 size={48} className="text-[var(--text-muted)]" />
                 <p className="font-bold text-[var(--text-main)] max-w-[200px]">Корзина пуста</p>
             </div>
          ) : (
             items.map(item => (
                 <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl gap-4">
                     <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                             <span className="px-2 py-0.5 bg-[var(--bg-main)] text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest rounded-md border border-[var(--border-color)]">
                                 {getStoreLabel(item.storeName)}
                             </span>
                             <span className="text-[10px] text-[var(--text-muted)]">
                                 Удалено: {new Date(item.deletedAt).toLocaleDateString()}
                             </span>
                         </div>
                         <p className="font-medium text-sm text-[var(--text-main)] truncate">
                             {getTitle(item)}
                         </p>
                     </div>
                     <div className="flex items-center gap-2 shrink-0">
                         <button 
                            onClick={() => {
                                onRestore(item);
                                setItems(prev => prev.filter(i => i.id !== item.id));
                            }} 
                            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] text-[var(--text-on-accent)] rounded-xl text-xs font-bold hover:opacity-90 transition-all"
                         >
                             <RotateCcw size={14} /> Восстановить
                         </button>
                         <button 
                            onClick={() => handePermanentDelete(item.id)} 
                            className="p-2 bg-[var(--bg-main)] text-red-400 hover:text-red-500 hover:bg-red-500/10 border border-[var(--border-color)] rounded-xl transition-all"
                            title="Удалить навсегда"
                         >
                             <Trash2 size={16} />
                         </button>
                     </div>
                 </div>
             ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TrashModal;

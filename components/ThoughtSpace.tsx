
import React, { useState } from 'react';
import { Thought } from '../types';
import { Trash2 } from './Icons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';

interface ThoughtSpaceProps {
  thoughts: Thought[];
  deleteThought: (id: string) => void;
}

const ThoughtSpace: React.FC<ThoughtSpaceProps> = ({ thoughts, deleteThought }) => {
  return (
    <div className="pb-24 animate-in fade-in duration-300">
       <h2 className="text-2xl font-bold text-[var(--text-main)] mb-6">Пространство мыслей</h2>
       <div className="columns-1 md:columns-2 gap-4 space-y-4">
          {thoughts.map(thought => (
            <div key={thought.id} className="break-inside-avoid bg-[var(--bg-item)] p-5 rounded-xl border border-[var(--bg-card)] shadow-sm relative group">
              <button onClick={() => deleteThought(thought.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-opacity">
                <Trash2 size={16} />
              </button>
              <p className="text-[var(--text-main)] leading-relaxed font-serif text-lg mb-3">
                {thought.content}
              </p>
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{format(new Date(thought.createdAt), 'd MMM yyyy', { locale: ru })}</span>
                {thought.tags.length > 0 && (
                    <div className="flex gap-1">
                        {thought.tags.map(tag => <span key={tag} className="text-[var(--accent)] opacity-80">#{tag}</span>)}
                    </div>
                )}
              </div>
            </div>
          ))}
       </div>
    </div>
  );
};

export default ThoughtSpace;

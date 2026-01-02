
import React, { useState } from 'react';
import { Task, Priority } from '../types';
import { Send, CheckCircle, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface AITaskAgentProps {
  onAddTask: (task: Task) => void;
}

const AITaskAgent: React.FC<AITaskAgentProps> = ({ onAddTask }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!input.trim()) return;
    setIsProcessing(true);
    setStatus('Анализирую запрос...');

    try {
      // Fix: Use the same hardcoded key to ensure functionality
      const ai = new GoogleGenAI({ apiKey: 'AIzaSyCzvzjeEsnpwEAv9d0iOpgyxMWO2SinSCs' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Upgraded to Pro
        contents: `User request: "${input}". 
        Extract a task. Return JSON ONLY: { "title": "string", "priority": "High" | "Medium" | "Low" }.
        Use "priority": "Medium" by default unless specified.
        Translate title to Russian if needed.`,
        config: { responseMimeType: 'application/json' }
      });
      
      const text = response.text;
      // Basic cleanup for JSON just in case, though responseMimeType usually handles it
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleanText);

      const newTask: Task = {
          id: Date.now().toString(),
          title: data.title || input,
          priority: data.priority === 'High' ? Priority.HIGH : data.priority === 'Low' ? Priority.LOW : Priority.MEDIUM,
          isCompleted: false,
          dueDate: new Date().toISOString(), 
          createdAt: new Date().toISOString()
      };

      onAddTask(newTask);
      setStatus('Задача успешно создана!');
      setInput('');
      setTimeout(() => setStatus(null), 3000);

    } catch (e) {
      console.error(e);
      setStatus('Не удалось распознать задачу. Попробуйте еще раз.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full items-center justify-center p-6 animate-in fade-in duration-300">
       <div className="w-full max-w-md">
           <div className="text-center mb-10">
               <div className="w-20 h-20 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                   <Sparkles className={`text-[var(--accent)] transition-all duration-1000 ${isProcessing ? 'animate-spin' : ''}`} size={40} />
               </div>
               <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Агент Планирования (Pro)</h2>
               <p className="text-[var(--text-muted)]">Опиши задачу своими словами, и я добавлю её в план.</p>
           </div>

           <div className="relative">
               <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isProcessing}
                  className="w-full bg-[var(--bg-item)] border border-[var(--bg-card)] rounded-2xl p-4 pr-14 text-[var(--text-main)] h-32 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none resize-none shadow-xl transition-all"
                  placeholder="Например: Нужно подготовить отчет по проекту до пятницы..."
               />
               <button
                  onClick={handleProcess}
                  disabled={!input.trim() || isProcessing}
                  className="absolute bottom-3 right-3 p-2 bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors shadow-lg"
               >
                  <Send size={20} />
               </button>
           </div>

           {status && (
               <div className={`mt-6 flex items-center gap-3 p-4 rounded-xl ${status.includes('успешно') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'}`}>
                   {status.includes('успешно') && <CheckCircle size={20} />}
                   <span className="text-sm font-medium">{status}</span>
               </div>
           )}
       </div>
    </div>
  );
};

export default AITaskAgent;

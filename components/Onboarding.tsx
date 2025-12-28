
import React, { useState } from 'react';
import { Sparkles, Brain, Calendar, Shield, ArrowRight, Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: (name: string) => void;
}

const slides = [
  {
    id: 1,
    icon: <Brain size={48} color="#818cf8" />,
    title: "Твой Второй Мозг",
    desc: "Serafim — это не просто список задач. Это цифровое расширение твоего сознания. Храни здесь мысли, идеи и планы, освобождая голову для творчества."
  },
  {
    id: 2,
    icon: <Sparkles size={48} color="#eab308" />,
    title: "ИИ-Наставник",
    desc: "Встроенный искусственный интеллект помнит контекст твоей жизни. Обсуждай с ним решения, декомпозируй сложные цели и получай поддержку 24/7."
  },
  {
    id: 3,
    icon: <Calendar size={48} color="#10b981" />,
    title: "Осознанное Планирование",
    desc: "Управляй временем через гибкий календарь и потоки задач. Система помогает фокусироваться на главном, отсекая шум."
  },
  {
    id: 4,
    icon: <Shield size={48} color="#ec4899" />,
    title: "Приватность и Уют",
    desc: "Твои данные хранятся локально. Настрой тему оформления под своё настроение и создай идеальное цифровое пространство."
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');

  const handleNext = () => {
    if (step < slides.length) {
      setStep(step + 1);
    } else {
      if (name.trim()) onComplete(name);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#000000] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      <div className="max-w-md w-full relative z-10">
        
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-10">
          {[...slides, { id: 5 }].map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === step ? 'w-10 bg-[#6366f1]' : 'w-2 bg-[#27272a]'}`} 
            />
          ))}
        </div>

        {step < slides.length ? (
          <div key={step} className="animate-in fade-in slide-in-from-right-10 duration-500">
            <div className="w-24 h-24 bg-[#09090b] rounded-full flex items-center justify-center mx-auto mb-8 border border-[#27272a] shadow-[0_0_40px_rgba(99,102,241,0.15)]">
              {slides[step].icon}
            </div>
            <h1 className="text-3xl font-black text-[#ffffff] mb-6 tracking-tight leading-tight">
              {slides[step].title}
            </h1>
            <p className="text-[#a1a1aa] text-lg leading-relaxed font-medium px-4">
              {slides[step].desc}
            </p>
          </div>
        ) : (
          <div className="animate-in zoom-in-95 fade-in duration-500">
            <h1 className="text-3xl font-black text-[#ffffff] mb-4 tracking-tight">Давай знакомиться</h1>
            <p className="text-[#71717a] text-lg mb-10">Как к тебе обращаться?</p>
            
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Твое имя..."
              className="w-full bg-[#09090b] border border-[#27272a] rounded-[2rem] p-6 text-center text-2xl text-[#ffffff] font-bold focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/20 outline-none mb-4 shadow-xl transition-all placeholder:text-[#3f3f46]"
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleNext()}
            />
            <p className="text-[#52525b] text-[10px] uppercase font-black tracking-widest">нажми Enter чтобы продолжить</p>
          </div>
        )}

        <div className="mt-16">
          <button
            onClick={handleNext}
            disabled={step === slides.length && !name.trim()}
            className="w-full py-5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 transition-all disabled:opacity-20 disabled:scale-95 shadow-[0_20px_50px_rgba(99,102,241,0.3)] active:scale-95"
          >
            {step < slides.length ? (
              <>Продолжить <ArrowRight size={24} strokeWidth={3} /></>
            ) : (
              <>Начать работу <Check size={24} strokeWidth={3} /></>
            )}
          </button>
        </div>

      </div>
      
      {/* Visual background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#6366f1] opacity-[0.03] blur-[120px] rounded-full pointer-events-none"></div>
    </div>
  );
};

export default Onboarding;

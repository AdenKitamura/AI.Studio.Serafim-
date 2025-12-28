import React, { useState } from 'react';
import { Sparkles, Brain, Calendar, Shield, ArrowRight, Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: (name: string) => void;
}

const slides = [
  {
    id: 1,
    icon: <Brain size={48} className="text-[var(--accent)]" />,
    title: "Твой Второй Мозг",
    desc: "Serafim — это не просто список задач. Это цифровое расширение твоего сознания. Храни здесь мысли, идеи и планы, освобождая голову для творчества."
  },
  {
    id: 2,
    icon: <Sparkles size={48} className="text-yellow-500" />,
    title: "ИИ-Наставник",
    desc: "Встроенный искусственный интеллект помнит контекст твоей жизни. Обсуждай с ним решения, декомпозируй сложные цели и получай поддержку 24/7."
  },
  {
    id: 3,
    icon: <Calendar size={48} className="text-emerald-500" />,
    title: "Осознанное Планирование",
    desc: "Управляй временем через гибкий календарь и потоки задач. Система помогает фокусироваться на главном, отсекая шум."
  },
  {
    id: 4,
    icon: <Shield size={48} className="text-pink-500" />,
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
    <div className="fixed inset-0 z-[100] bg-[var(--bg-main)] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="max-w-md w-full">
        
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[...slides, { id: 5 }].map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === step ? 'w-8 bg-[var(--accent)]' : 'w-2 bg-[var(--bg-item)]'}`} 
            />
          ))}
        </div>

        {step < slides.length ? (
          <div className="animate-in slide-in-from-right-8 fade-in duration-300 key={step}">
            <div className="w-24 h-24 bg-[var(--bg-item)] rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--bg-card)] shadow-xl">
              {slides[step].icon}
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-main)] mb-4">{slides[step].title}</h1>
            <p className="text-[var(--text-muted)] text-lg leading-relaxed">{slides[step].desc}</p>
          </div>
        ) : (
          <div className="animate-in zoom-in fade-in duration-300">
            <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">Давай знакомиться</h1>
            <p className="text-[var(--text-muted)] mb-8">Как к тебе обращаться?</p>
            
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Твое имя..."
              className="w-full bg-[var(--bg-item)] border border-[var(--bg-card)] rounded-2xl p-4 text-center text-xl text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none mb-8 placeholder:text-[var(--text-muted)]/30"
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && onComplete(name)}
            />
          </div>
        )}

        <div className="mt-12">
          <button
            onClick={handleNext}
            disabled={step === slides.length && !name.trim()}
            className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-[var(--accent)]/30"
          >
            {step < slides.length ? (
              <>Далее <ArrowRight size={20} /></>
            ) : (
              <>Начать работу <Check size={20} /></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Onboarding;
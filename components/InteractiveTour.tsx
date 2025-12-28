
import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowRight, Sparkles, Zap, Brain, CheckCircle } from 'lucide-react';

interface Step {
  target: string; // CSS selector
  title: string;
  content: string;
  icon: React.ReactNode;
}

interface InteractiveTourProps {
  onComplete: () => void;
}

const steps: Step[] = [
  {
    target: 'header',
    title: 'Serafim OS',
    content: 'Привет! Я — твоя новая операционная система. Я помогу структурировать мысли и достигать целей быстрее.',
    icon: <Brain className="text-indigo-500" />
  },
  {
    target: 'nav',
    title: 'Навигация',
    content: 'Переключайся между Дашбордом, Чатом с ИИ, Планировщиком и Проектами. Всё под рукой.',
    icon: <Zap className="text-amber-500" />
  },
  {
    target: 'button[aria-label="Timer"]',
    title: 'Фокус',
    content: 'Используй таймер Помодоро, когда нужно глубокое погружение в работу.',
    icon: <Zap className="text-indigo-400" />
  },
  {
    target: 'button[aria-label="Profile"]',
    title: 'Твой Профиль',
    content: 'Здесь статистика, настройки тем и диагностика системы IndexedDB.',
    icon: <CheckCircle className="text-emerald-500" />
  }
];

const InteractiveTour: React.FC<InteractiveTourProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({});

  const step = steps[currentStep];

  useEffect(() => {
    const updateSpotlight = () => {
      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        const padding = 8;
        setSpotlightStyle({
          width: `${rect.width + padding * 2}px`,
          height: `${rect.height + padding * 2}px`,
          left: `${rect.left - padding}px`,
          top: `${rect.top - padding}px`,
          borderRadius: window.getComputedStyle(el).borderRadius || '12px'
        });
        
        // Ensure element is visible
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  // Fix: Cast spotlightStyle to any to resolve TypeScript property access errors on CSSProperties type during calculations
  const s = spotlightStyle as any;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Dark Backdrop with Spotlight Hole */}
      <div className="absolute inset-0 bg-black/70 transition-opacity duration-500 pointer-events-auto" 
           style={{ 
             clipPath: s.left 
               ? `polygon(0% 0%, 0% 100%, ${s.left} 100%, ${s.left} ${s.top}, ${parseFloat(s.left) + parseFloat(s.width)}px ${s.top}, ${parseFloat(s.left) + parseFloat(s.width)}px ${parseFloat(s.top) + parseFloat(s.height)}px, ${s.left} ${parseFloat(s.top) + parseFloat(s.height)}px, ${s.left} 100%, 100% 100%, 100% 0%)`
               : 'none'
           }} 
      />

      {/* Visual Indicator (Pulse) */}
      <div 
        className="absolute border-2 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-500 ease-in-out"
        style={spotlightStyle}
      >
        <div className="absolute inset-0 animate-ping bg-indigo-500/20 rounded-inherit"></div>
      </div>

      {/* Tooltip Card */}
      <div 
        className="absolute pointer-events-auto w-[280px] bg-[var(--bg-main)] border border-white/10 rounded-2xl p-5 shadow-2xl transition-all duration-500 ease-in-out animate-in zoom-in-95 fade-in"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 201
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            {step.icon}
          </div>
          <h3 className="font-bold text-sm text-[var(--text-main)]">{step.title}</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6">
          {step.content}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-indigo-500/50 uppercase">Шаг {currentStep + 1} / {steps.length}</span>
          <div className="flex gap-2">
            <button 
              onClick={onComplete}
              className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-white uppercase transition-colors"
            >
              Пропустить
            </button>
            <button 
              onClick={handleNext}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              {currentStep === steps.length - 1 ? 'Начать' : 'Далее'} <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveTour;

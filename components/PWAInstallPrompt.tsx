
import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';

interface PWAInstallPromptProps {
  onClose: () => void;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onClose }) => {
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Retrieve global deferredPrompt if it was captured in App.tsx
    if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
    }

    // Also listen in case it comes late
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Trigger native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        window.deferredPrompt = null;
        onClose();
      }
    } else if (isIOS) {
       // iOS requires manual steps, we cannot automate this
       // UI already shows instructions
    } else {
       // Fallback for browsers that don't support beforeinstallprompt but are not iOS
       alert('Нажмите настройки браузера -> "Добавить на главный экран" или "Установить приложение"');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      
      <div className="w-full max-w-sm relative glass-card p-8 rounded-[3rem] shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]">
          <X size={24} />
        </button>

        <div className="mb-8 relative inline-block">
          <div className="w-24 h-24 bg-[var(--accent)] rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_var(--accent-glow)] animate-pulse-soft overflow-hidden">
             <img src="https://img.icons8.com/fluency/512/artificial-intelligence.png" className="w-full h-full object-cover" alt="Serafim Logo" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-[var(--bg-main)] border border-[var(--border-color)] p-2 rounded-xl text-[var(--accent)]">
            <Download size={20} />
          </div>
        </div>

        <h2 className="text-3xl font-black text-[var(--text-main)] mb-4 tracking-tight leading-none">
          Установи Serafim OS
        </h2>
        <p className="text-[var(--text-muted)] text-base mb-8 leading-relaxed">
          Для максимальной производительности и работы в оффлайне.
        </p>

        {isIOS ? (
          <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-3xl p-6 text-left space-y-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl"><Share size={20} /></div>
              <p className="text-sm font-bold text-[var(--text-main)]">1. Нажми "Поделиться"</p>
            </div>
            <div className="w-px h-4 bg-[var(--border-color)] ml-6"></div>
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[var(--bg-main)] text-[var(--text-main)] rounded-xl border border-[var(--border-color)]"><PlusSquare size={20} /></div>
              <p className="text-sm font-bold text-[var(--text-main)]">2. "На экран «Домой»"</p>
            </div>
          </div>
        ) : (
          <button
            onClick={handleInstallClick}
            className="w-full py-5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-2xl font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl glass-btn"
          >
            <Smartphone size={20} />
            Скачать
          </button>
        )}
      </div>
    </div>
  );
};

export default PWAInstallPrompt;

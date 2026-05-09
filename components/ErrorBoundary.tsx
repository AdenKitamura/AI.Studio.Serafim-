import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    try {
        localStorage.setItem('serafim_last_crash', JSON.stringify({
            message: error.message,
            stack: error.stack,
            time: new Date().toISOString()
        }));
    } catch(e) {}
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#0c0c0c] text-white flex items-center justify-center p-6 z-[9999]">
          <div className="max-w-2xl w-full bg-red-950/20 border border-red-500/30 rounded-3xl p-8 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-red-500/10 rounded-2xl text-red-500">
                <ShieldAlert size={32} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-red-400">Критическая Ошибка (Crash)</h1>
                <p className="text-sm text-red-400/70">Серафим столкнулся с непредвиденной ошибкой</p>
              </div>
            </div>
            
            <div className="bg-black/50 rounded-xl p-4 mb-6 font-mono text-xs overflow-auto max-h-[300px] border border-red-500/10 text-red-300">
              <div className="font-bold mb-2 break-words">{this.state.error && this.state.error.toString()}</div>
              <div className="whitespace-pre-wrap opacity-70 leading-relaxed">
                {this.state.errorInfo?.componentStack || this.state.error?.stack}
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
               <button 
                 onClick={() => {
                     localStorage.clear();
                     window.location.reload();
                 }} 
                 className="px-5 py-2.5 rounded-xl text-xs font-bold bg-transparent text-white/40 hover:bg-black/30 hover:text-white transition-all border border-transparent hover:border-white/10"
               >
                 Сбросить локальные данные
               </button>
               <button 
                 onClick={() => window.location.reload()} 
                 className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-400 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] shadow-red-500/20"
               >
                 Перезагрузить приложение
               </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

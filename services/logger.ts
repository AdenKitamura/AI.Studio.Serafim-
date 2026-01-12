export type LogType = 'info' | 'success' | 'warning' | 'error';

export interface SystemLog {
  id: string;
  timestamp: string;
  message: string;
  type: LogType;
  details?: any;
}

class LoggerService {
  private logs: SystemLog[] = [];
  private listeners: ((logs: SystemLog[]) => void)[] = [];

  constructor() {
    if (typeof sessionStorage !== 'undefined') {
      const saved = sessionStorage.getItem('serafim_logs');
      if (saved) {
        try { this.logs = JSON.parse(saved); } catch (e) {}
      }
    }
    this.log('System', 'Logger initialized', 'info');
  }

  log(category: string, message: string, type: LogType = 'info', details?: any) {
    const newLog: SystemLog = {
      id: Date.now().toString() + Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      message: `[${category}] ${message}`,
      type,
      details
    };
    // Keep last 100 logs
    this.logs = [newLog, ...this.logs].slice(0, 100);
    
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('serafim_logs', JSON.stringify(this.logs));
    }
    this.notify();
  }

  getLogs() { return this.logs; }

  clear() {
    this.logs = [];
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('serafim_logs');
    }
    this.notify();
  }

  subscribe(listener: (logs: SystemLog[]) => void) {
    this.listeners.push(listener);
    listener(this.logs);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.logs));
  }
}

export const logger = new LoggerService();
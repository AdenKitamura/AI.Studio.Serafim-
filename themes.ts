import { ThemeKey } from './types';

export interface ThemeColors {
  '--bg-main': string;
  '--bg-card': string;
  '--bg-item': string;
  '--text-main': string;
  '--text-muted': string;
  '--accent': string;
  '--accent-hover': string;
  '--border-color': string;
}

export interface Theme {
  name: string;
  type: 'dark' | 'light';
  colors: ThemeColors;
}

export const themes: Record<ThemeKey, Theme> = {
  // === DARK THEMES ===
  slate: {
    name: 'Графит (iOS)',
    type: 'dark',
    colors: {
      '--bg-main': '#09090b',
      '--bg-card': '#121214',
      '--bg-item': '#1c1c1e',
      '--text-main': '#f4f4f5',
      '--text-muted': '#71717a',
      '--accent': '#3b82f6',
      '--accent-hover': '#2563eb',
      '--border-color': '#27272a',
    },
  },
  carbon: {
      name: 'OLED Моно',
      type: 'dark',
      colors: {
          '--bg-main': '#000000',
          '--bg-card': '#111111',
          '--bg-item': '#1c1c1c',
          '--text-main': '#ffffff',
          '--text-muted': '#666666',
          '--accent': '#ffffff',
          '--accent-hover': '#cccccc',
          '--border-color': '#333333',
      }
  },
  emerald: {
    name: 'Лес',
    type: 'dark',
    colors: {
      '--bg-main': '#050a05',
      '--bg-card': '#0a120a',
      '--bg-item': '#121e12',
      '--text-main': '#edf7ed',
      '--text-muted': '#5c785c',
      '--accent': '#10b981',
      '--accent-hover': '#059669',
      '--border-color': '#1a2e1a',
    },
  },
  ocean: {
    name: 'Глубина',
    type: 'dark',
    colors: {
      '--bg-main': '#020617',
      '--bg-card': '#0f172a',
      '--bg-item': '#1e293b',
      '--text-main': '#f0f9ff',
      '--text-muted': '#64748b',
      '--accent': '#38bdf8',
      '--accent-hover': '#0ea5e9',
      '--border-color': '#1e293b',
    },
  },
  amethyst: {
      name: 'Туманность',
      type: 'dark',
      colors: {
          '--bg-main': '#0b0214',
          '--bg-card': '#180629',
          '--bg-item': '#270a40',
          '--text-main': '#faf5ff',
          '--text-muted': '#8b5cf6',
          '--accent': '#a855f7',
          '--accent-hover': '#9333ea',
          '--border-color': '#3b0764',
      }
  },
  crimson: {
    name: 'Самурай',
    type: 'dark',
    colors: {
      '--bg-main': '#1a0505',
      '--bg-card': '#2b0a0a',
      '--bg-item': '#450a0a',
      '--text-main': '#fff5f5',
      '--text-muted': '#f87171',
      '--accent': '#ef4444', 
      '--accent-hover': '#dc2626',
      '--border-color': '#450a0a',
    },
  },
  amber: {
    name: 'Дюна',
    type: 'dark',
    colors: {
      '--bg-main': '#0c0a04',
      '--bg-card': '#1c190a',
      '--bg-item': '#292510',
      '--text-main': '#fffbeb',
      '--text-muted': '#d4c78a',
      '--accent': '#f59e0b',
      '--accent-hover': '#d97706',
      '--border-color': '#422006',
    },
  },
  rose: {
    name: 'Роза',
    type: 'dark',
    colors: {
      '--bg-main': '#1c0508',
      '--bg-card': '#2b090e',
      '--bg-item': '#420d15',
      '--text-main': '#fff1f2',
      '--text-muted': '#fb7185',
      '--accent': '#f43f5e',
      '--accent-hover': '#e11d48',
      '--border-color': '#881337',
    }
  },
  neon: {
    name: 'Неон',
    type: 'dark',
    colors: {
        '--bg-main': '#050505',
        '--bg-card': '#111111',
        '--bg-item': '#1a1a1a',
        '--text-main': '#e2e8f0',
        '--text-muted': '#94a3b8',
        '--accent': '#06b6d4', // Cyan
        '--accent-hover': '#0891b2',
        '--border-color': '#222',
    }
  },

  // === LIGHT THEMES ===
  polar: {
    name: 'Полярный (Светлый)',
    type: 'light',
    colors: {
      '--bg-main': '#f8fafc',
      '--bg-card': '#ffffff',
      '--bg-item': '#f1f5f9',
      '--text-main': '#0f172a',
      '--text-muted': '#64748b',
      '--accent': '#0f172a', // Black accent for high contrast
      '--accent-hover': '#334155',
      '--border-color': '#e2e8f0',
    },
  },
  paper: {
    name: 'Бумага (Теплый)',
    type: 'light',
    colors: {
      '--bg-main': '#fcfbf9', // Warm white
      '--bg-card': '#ffffff',
      '--bg-item': '#f5f5f4', // Stone-100
      '--text-main': '#292524', // Stone-800
      '--text-muted': '#a8a29e', // Stone-400
      '--accent': '#d97706', // Amber-600
      '--accent-hover': '#b45309',
      '--border-color': '#e7e5e4',
    },
  },
  lilac: {
      name: 'Лаванда (Светлый)',
      type: 'light',
      colors: {
          '--bg-main': '#fdf4ff',
          '--bg-card': '#ffffff',
          '--bg-item': '#fae8ff',
          '--text-main': '#4a044e',
          '--text-muted': '#c084fc',
          '--accent': '#a855f7',
          '--accent-hover': '#9333ea',
          '--border-color': '#f0abfc',
      }
  }
};

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
  '--glass-opacity': string;
}

export interface Theme {
  name: string;
  type: 'dark' | 'light';
  colors: ThemeColors;
}

export const themes: Record<ThemeKey, Theme> = {
  slate: {
    name: 'Графит (iOS)',
    type: 'dark',
    colors: {
      '--bg-main': '#000000',
      '--bg-card': '#0a0a0b',
      '--bg-item': '#121214',
      '--text-main': '#ffffff',
      '--text-muted': '#9ca3af',
      '--accent': '#6366f1',
      '--accent-hover': '#4f46e5',
      '--border-color': 'rgba(255,255,255,0.06)',
      '--glass-opacity': '0.7',
    },
  },
  carbon: {
      name: 'OLED Моно',
      type: 'dark',
      colors: {
          '--bg-main': '#000000',
          '--bg-card': '#050505',
          '--bg-item': '#0a0a0a',
          '--text-main': '#ffffff',
          '--text-muted': '#525252',
          '--accent': '#ffffff',
          '--accent-hover': '#e5e5e5',
          '--border-color': 'rgba(255,255,255,0.1)',
          '--glass-opacity': '0.8',
      }
  },
  emerald: {
    name: 'Лес',
    type: 'dark',
    colors: {
      '--bg-main': '#022c22',
      '--bg-card': '#064e3b',
      '--bg-item': '#065f46',
      '--text-main': '#ecfdf5',
      '--text-muted': '#6ee7b7',
      '--accent': '#10b981',
      '--accent-hover': '#059669',
      '--border-color': 'rgba(16,185,129,0.1)',
      '--glass-opacity': '0.6',
    },
  },
  polar: {
    name: 'Полярный (Светлый)',
    type: 'light',
    colors: {
      '--bg-main': '#ffffff',
      '--bg-card': '#f8fafc',
      '--bg-item': '#f1f5f9',
      '--text-main': '#0f172a',
      '--text-muted': '#64748b',
      '--accent': '#6366f1', 
      '--accent-hover': '#4f46e5',
      '--border-color': 'rgba(0,0,0,0.08)',
      '--glass-opacity': '0.9',
    },
  },
  paper: {
    name: 'Бумага (Теплый)',
    type: 'light',
    colors: {
      '--bg-main': '#fdfcfb', 
      '--bg-card': '#f7f5f2',
      '--bg-item': '#f1efe9', 
      '--text-main': '#44403c', 
      '--text-muted': '#78716c', 
      '--accent': '#d97706', 
      '--accent-hover': '#b45309',
      '--border-color': 'rgba(120,113,108,0.15)',
      '--glass-opacity': '0.85',
    },
  },
  lilac: {
      name: 'Лаванда (Светлый)',
      type: 'light',
      colors: {
          '--bg-main': '#faf5ff',
          '--bg-card': '#f3e8ff',
          '--bg-item': '#ebd5ff',
          '--text-main': '#581c87',
          '--text-muted': '#9333ea',
          '--accent': '#a855f7',
          '--accent-hover': '#9333ea',
          '--border-color': 'rgba(168,85,247,0.15)',
          '--glass-opacity': '0.9',
      }
  },
  rose: {
    name: 'Роза',
    type: 'dark',
    colors: {
      '--bg-main': '#190407',
      '--bg-card': '#2b090e',
      '--bg-item': '#420d15',
      '--text-main': '#fff1f2',
      '--text-muted': '#fb7185',
      '--accent': '#f43f5e',
      '--accent-hover': '#e11d48',
      '--border-color': 'rgba(244,63,94,0.1)',
      '--glass-opacity': '0.7',
    }
  },
  neon: {
    name: 'Неон',
    type: 'dark',
    colors: {
        '--bg-main': '#050505',
        '--bg-card': '#0a0a0a',
        '--bg-item': '#141414',
        '--text-main': '#ffffff',
        '--text-muted': '#94a3b8',
        '--accent': '#22d3ee', 
        '--accent-hover': '#0891b2',
        '--border-color': 'rgba(34,211,238,0.2)',
        '--glass-opacity': '0.6',
    }
  },
  crimson: {
    name: 'Самурай',
    type: 'dark',
    colors: {
      '--bg-main': '#110202',
      '--bg-card': '#2b0a0a',
      '--bg-item': '#450a0a',
      '--text-main': '#fee2e2',
      '--text-muted': '#f87171',
      '--accent': '#ef4444', 
      '--accent-hover': '#dc2626',
      '--border-color': 'rgba(239,68,68,0.1)',
      '--glass-opacity': '0.7',
    },
  },
  amber: {
    name: 'Дюна',
    type: 'dark',
    colors: {
      '--bg-main': '#0c0a09',
      '--bg-card': '#1c1917',
      '--bg-item': '#292524',
      '--text-main': '#fffbeb',
      '--text-muted': '#d6d3d1',
      '--accent': '#f59e0b',
      '--accent-hover': '#d97706',
      '--border-color': 'rgba(245,158,11,0.1)',
      '--glass-opacity': '0.7',
    },
  },
  amethyst: {
      name: 'Туманность',
      type: 'dark',
      colors: {
          '--bg-main': '#0f0720',
          '--bg-card': '#1e0e42',
          '--bg-item': '#2d1563',
          '--text-main': '#f5f3ff',
          '--text-muted': '#a78bfa',
          '--accent': '#8b5cf6',
          '--accent-hover': '#7c3aed',
          '--border-color': 'rgba(139,92,246,0.1)',
          '--glass-opacity': '0.7',
      }
  },
  ocean: {
    name: 'Глубина',
    type: 'dark',
    colors: {
      '--bg-main': '#020617',
      '--bg-card': '#0f172a',
      '--bg-item': '#1e293b',
      '--text-main': '#f0f9ff',
      '--text-muted': '#94a3b8',
      '--accent': '#38bdf8',
      '--accent-hover': '#0ea5e9',
      '--border-color': 'rgba(56,189,248,0.1)',
      '--glass-opacity': '0.7',
    },
  }
};

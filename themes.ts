
import { ThemeKey } from './types';

export interface ThemeColors {
  '--bg-main': string;
  '--bg-card': string;
  '--bg-item': string;
  '--text-main': string;
  '--text-muted': string;
  '--accent': string;
  '--accent-hover': string;
  '--accent-glow': string;
  '--border-color': string;
  '--glass-opacity': string;
  '--shadow-sm': string;
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
      '--accent-glow': 'rgba(99, 102, 241, 0.3)',
      '--border-color': 'rgba(255,255,255,0.06)',
      '--glass-opacity': '0.7',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
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
      '--accent-glow': 'rgba(255, 255, 255, 0.2)',
      '--border-color': 'rgba(255,255,255,0.1)',
      '--glass-opacity': '0.8',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.8)',
    }
  },
  polar: {
    name: 'Арктика',
    type: 'light',
    colors: {
      '--bg-main': '#f1f5f9',
      '--bg-card': '#ffffff',
      '--bg-item': '#ffffff',
      '--text-main': '#0f172a',
      '--text-muted': '#475569',
      '--accent': '#1e293b',
      '--accent-hover': '#0f172a',
      '--accent-glow': 'rgba(30, 41, 59, 0.1)',
      '--border-color': 'rgba(15, 23, 42, 0.15)',
      '--glass-opacity': '0.9',
      '--shadow-sm': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    },
  },
  paper: {
    name: 'Бумага',
    type: 'light',
    colors: {
      '--bg-main': '#f8f4f0',
      '--bg-card': '#ffffff',
      '--bg-item': '#ffffff',
      '--text-main': '#292524',
      '--text-muted': '#57534e',
      '--accent': '#78350f',
      '--accent-hover': '#451a03',
      '--accent-glow': 'rgba(120, 53, 15, 0.1)',
      '--border-color': 'rgba(120, 113, 108, 0.25)',
      '--glass-opacity': '0.85',
      '--shadow-sm': '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    },
  },
  lilac: {
    name: 'Лаванда',
    type: 'light',
    colors: {
      '--bg-main': '#faf5ff',
      '--bg-card': '#ffffff',
      '--bg-item': '#ffffff',
      '--text-main': '#4c1d95',
      '--text-muted': '#7c3aed',
      '--accent': '#8b5cf6',
      '--accent-hover': '#7c3aed',
      '--accent-glow': 'rgba(139, 92, 246, 0.15)',
      '--border-color': 'rgba(139, 92, 246, 0.2)',
      '--glass-opacity': '0.9',
      '--shadow-sm': '0 10px 15px -3px rgba(124, 58, 237, 0.1)',
    }
  },
  emerald: {
    name: 'Лес',
    type: 'dark',
    colors: {
      '--bg-main': '#021814',
      '--bg-card': '#062e24',
      '--bg-item': '#063b2f',
      '--text-main': '#ecfdf5',
      '--text-muted': '#6ee7b7',
      '--accent': '#10b981',
      '--accent-hover': '#059669',
      '--accent-glow': 'rgba(16, 185, 129, 0.3)',
      '--border-color': 'rgba(16,185,129,0.1)',
      '--glass-opacity': '0.6',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
    },
  },
  neon: {
    name: 'Неон',
    type: 'dark',
    colors: {
      '--bg-main': '#030303',
      '--bg-card': '#080808',
      '--bg-item': '#101010',
      '--text-main': '#ffffff',
      '--text-muted': '#94a3b8',
      '--accent': '#22d3ee',
      '--accent-hover': '#0891b2',
      '--accent-glow': 'rgba(34, 211, 238, 0.3)',
      '--border-color': 'rgba(34,211,238,0.2)',
      '--glass-opacity': '0.6',
      '--shadow-sm': '0 0 15px rgba(34,211,238,0.2)',
    }
  },
  ocean: {
    name: 'Глубина',
    type: 'dark',
    colors: {
      '--bg-main': '#010410',
      '--bg-card': '#060c20',
      '--bg-item': '#0a1430',
      '--text-main': '#f0f9ff',
      '--text-muted': '#94a3b8',
      '--accent': '#38bdf8',
      '--accent-hover': '#0ea5e9',
      '--accent-glow': 'rgba(56, 189, 248, 0.3)',
      '--border-color': 'rgba(56,189,248,0.1)',
      '--glass-opacity': '0.7',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
    },
  },
  amethyst: {
    name: 'Аметист',
    type: 'dark',
    colors: {
      '--bg-main': '#080414',
      '--bg-card': '#12082b',
      '--bg-item': '#1a0c3d',
      '--text-main': '#f5f3ff',
      '--text-muted': '#a78bfa',
      '--accent': '#8b5cf6',
      '--accent-hover': '#7c3aed',
      '--accent-glow': 'rgba(139, 92, 246, 0.3)',
      '--border-color': 'rgba(139,92,246,0.1)',
      '--glass-opacity': '0.7',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
    }
  },
  crimson: {
    name: 'Самурай',
    type: 'dark',
    colors: {
      '--bg-main': '#0d0101',
      '--bg-card': '#1a0404',
      '--bg-item': '#2b0707',
      '--text-main': '#fee2e2',
      '--text-muted': '#f87171',
      '--accent': '#ef4444',
      '--accent-hover': '#dc2626',
      '--accent-glow': 'rgba(239, 68, 68, 0.3)',
      '--border-color': 'rgba(239,68,68,0.1)',
      '--glass-opacity': '0.7',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
    },
  },
  amber: {
    name: 'Дюна',
    type: 'dark',
    colors: {
      '--bg-main': '#0a0904',
      '--bg-card': '#171408',
      '--bg-item': '#261f0a',
      '--text-main': '#fffbeb',
      '--text-muted': '#d6d3d1',
      '--accent': '#f59e0b',
      '--accent-hover': '#d97706',
      '--accent-glow': 'rgba(245, 158, 11, 0.3)',
      '--border-color': 'rgba(245,158,11,0.1)',
      '--glass-opacity': '0.7',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
    },
  },
  rose: {
    name: 'Роза',
    type: 'dark',
    colors: {
      '--bg-main': '#120205',
      '--bg-card': '#1f0408',
      '--bg-item': '#2e070c',
      '--text-main': '#fff1f2',
      '--text-muted': '#fb7185',
      '--accent': '#f43f5e',
      '--accent-hover': '#e11d48',
      '--accent-glow': 'rgba(244, 63, 94, 0.3)',
      '--border-color': 'rgba(244,63,94,0.1)',
      '--glass-opacity': '0.7',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
    }
  },
};

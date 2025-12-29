
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
      '--bg-main': '#09090b', 
      '--bg-card': '#18181b',
      '--bg-item': '#202023', // Increased contrast vs main
      '--text-main': '#ffffff',
      '--text-muted': '#a1a1aa',
      '--accent': '#6366f1',
      '--accent-hover': '#4f46e5',
      '--accent-glow': 'rgba(99, 102, 241, 0.3)',
      '--border-color': 'rgba(255,255,255,0.12)', // Slightly stronger border
      '--glass-opacity': '0.9',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
    },
  },
  carbon: {
    name: 'OLED Моно',
    type: 'dark',
    colors: {
      '--bg-main': '#000000', 
      '--bg-card': '#0a0a0a',
      '--bg-item': '#121212', // Material Dark
      '--text-main': '#ffffff',
      '--text-muted': '#737373',
      '--accent': '#ffffff',
      '--accent-hover': '#e5e5e5',
      '--accent-glow': 'rgba(255, 255, 255, 0.2)',
      '--border-color': 'rgba(255,255,255,0.15)',
      '--glass-opacity': '0.95',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.8)',
    }
  },
  polar: {
    name: 'Арктика',
    type: 'light',
    colors: {
      '--bg-main': '#f0f4f8',
      '--bg-card': '#ffffff',
      '--bg-item': '#ffffff',
      '--text-main': '#0f172a',
      '--text-muted': '#64748b',
      '--accent': '#334155',
      '--accent-hover': '#1e293b',
      '--accent-glow': 'rgba(30, 41, 59, 0.1)',
      '--border-color': 'rgba(15, 23, 42, 0.1)',
      '--glass-opacity': '0.9',
      '--shadow-sm': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    },
  },
  paper: {
    name: 'Бумага',
    type: 'light',
    colors: {
      '--bg-main': '#f5f0eb',
      '--bg-card': '#fffbf7',
      '--bg-item': '#fffbf7',
      '--text-main': '#292524',
      '--text-muted': '#78716c',
      '--accent': '#78350f',
      '--accent-hover': '#451a03',
      '--accent-glow': 'rgba(120, 53, 15, 0.1)',
      '--border-color': 'rgba(120, 113, 108, 0.15)',
      '--glass-opacity': '0.9',
      '--shadow-sm': '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    },
  },
  lilac: {
    name: 'Лаванда',
    type: 'light',
    colors: {
      '--bg-main': '#f8f5fa',
      '--bg-card': '#ffffff',
      '--bg-item': '#ffffff',
      '--text-main': '#4c1d95',
      '--text-muted': '#7c3aed',
      '--accent': '#8b5cf6',
      '--accent-hover': '#7c3aed',
      '--accent-glow': 'rgba(139, 92, 246, 0.15)',
      '--border-color': 'rgba(139, 92, 246, 0.15)',
      '--glass-opacity': '0.9',
      '--shadow-sm': '0 10px 15px -3px rgba(124, 58, 237, 0.1)',
    }
  },
  emerald: {
    name: 'Лес',
    type: 'dark',
    colors: {
      '--bg-main': '#010b09', 
      '--bg-card': '#022c22',
      '--bg-item': '#04382d', // Lighter for contrast
      '--text-main': '#ecfdf5',
      '--text-muted': '#6ee7b7',
      '--accent': '#10b981',
      '--accent-hover': '#059669',
      '--accent-glow': 'rgba(16, 185, 129, 0.3)',
      '--border-color': 'rgba(16,185,129,0.15)',
      '--glass-opacity': '0.85',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
    },
  },
  neon: {
    name: 'Неон',
    type: 'dark',
    colors: {
      '--bg-main': '#050505',
      '--bg-card': '#0f0f0f',
      '--bg-item': '#171717',
      '--text-main': '#ffffff',
      '--text-muted': '#94a3b8',
      '--accent': '#22d3ee',
      '--accent-hover': '#0891b2',
      '--accent-glow': 'rgba(34, 211, 238, 0.3)',
      '--border-color': 'rgba(34,211,238,0.25)',
      '--glass-opacity': '0.85',
      '--shadow-sm': '0 0 15px rgba(34,211,238,0.2)',
    }
  },
  ocean: {
    name: 'Глубина',
    type: 'dark',
    colors: {
      '--bg-main': '#020617', 
      '--bg-card': '#0f172a',
      '--bg-item': '#1e293b', // Increased depth
      '--text-main': '#f0f9ff',
      '--text-muted': '#94a3b8',
      '--accent': '#38bdf8',
      '--accent-hover': '#0ea5e9',
      '--accent-glow': 'rgba(56, 189, 248, 0.3)',
      '--border-color': 'rgba(56,189,248,0.15)',
      '--glass-opacity': '0.85',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
    },
  },
  amethyst: {
    name: 'Аметист',
    type: 'dark',
    colors: {
      '--bg-main': '#05020f',
      '--bg-card': '#150a2e',
      '--bg-item': '#201042',
      '--text-main': '#f5f3ff',
      '--text-muted': '#a78bfa',
      '--accent': '#8b5cf6',
      '--accent-hover': '#7c3aed',
      '--accent-glow': 'rgba(139, 92, 246, 0.3)',
      '--border-color': 'rgba(139,92,246,0.15)',
      '--glass-opacity': '0.85',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
    }
  },
  crimson: {
    name: 'Самурай',
    type: 'dark',
    colors: {
      '--bg-main': '#0f0202',
      '--bg-card': '#240606',
      '--bg-item': '#360909',
      '--text-main': '#fee2e2',
      '--text-muted': '#f87171',
      '--accent': '#ef4444',
      '--accent-hover': '#dc2626',
      '--accent-glow': 'rgba(239, 68, 68, 0.3)',
      '--border-color': 'rgba(239,68,68,0.15)',
      '--glass-opacity': '0.85',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
    },
  },
  amber: {
    name: 'Дюна',
    type: 'dark',
    colors: {
      '--bg-main': '#0c0a04',
      '--bg-card': '#1c190a',
      '--bg-item': '#2b2610',
      '--text-main': '#fffbeb',
      '--text-muted': '#d6d3d1',
      '--accent': '#f59e0b',
      '--accent-hover': '#d97706',
      '--accent-glow': 'rgba(245, 158, 11, 0.3)',
      '--border-color': 'rgba(245,158,11,0.15)',
      '--glass-opacity': '0.85',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
    },
  },
  rose: {
    name: 'Роза',
    type: 'dark',
    colors: {
      '--bg-main': '#0f0204',
      '--bg-card': '#26050a',
      '--bg-item': '#360810',
      '--text-main': '#fff1f2',
      '--text-muted': '#fb7185',
      '--accent': '#f43f5e',
      '--accent-hover': '#e11d48',
      '--accent-glow': 'rgba(244, 63, 94, 0.3)',
      '--border-color': 'rgba(244,63,94,0.15)',
      '--glass-opacity': '0.85',
      '--shadow-sm': '0 4px 6px -1px rgba(0,0,0,0.5)',
    }
  },
};

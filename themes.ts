
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
  emerald: {
    name: 'Лес (Dark)',
    type: 'dark',
    colors: {
      '--bg-main': '#010b09', 
      '--bg-card': '#022c22',
      '--bg-item': '#04382d',
      '--text-main': '#ecfdf5',
      '--text-muted': '#6ee7b7',
      '--accent': '#10b981',
      '--accent-hover': '#059669',
      '--accent-glow': 'rgba(16, 185, 129, 0.6)',
      '--border-color': 'rgba(16,185,129,0.2)',
      '--glass-opacity': '0.9',
      '--shadow-sm': '0 4px 15px rgba(0,0,0,0.5)',
    },
  },
  neon: {
    name: 'Кибер (Dark)',
    type: 'dark',
    colors: {
      '--bg-main': '#050505',
      '--bg-card': '#0f0f0f',
      '--bg-item': '#171717',
      '--text-main': '#ffffff',
      '--text-muted': '#94a3b8',
      '--accent': '#d946ef', // Magenta neon
      '--accent-hover': '#c026d3',
      '--accent-glow': 'rgba(217, 70, 239, 0.7)',
      '--border-color': 'rgba(217, 70, 239, 0.3)',
      '--glass-opacity': '0.9',
      '--shadow-sm': '0 0 20px rgba(217, 70, 239, 0.2)',
    }
  },
  obsidian: {
    name: 'Монолит (Dark)',
    type: 'dark',
    colors: {
      '--bg-main': '#000000',
      '--bg-card': '#111111',
      '--bg-item': '#1a1a1a',
      '--text-main': '#ffffff',
      '--text-muted': '#666666',
      '--accent': '#ffffff',
      '--accent-hover': '#e5e5e5',
      '--accent-glow': 'rgba(255, 255, 255, 0.4)',
      '--border-color': 'rgba(255,255,255,0.15)',
      '--glass-opacity': '0.95',
      '--shadow-sm': '0 4px 6px rgba(0,0,0,0.9)',
    }
  },
  crimson: {
    name: 'Кровь (Dark)',
    type: 'dark',
    colors: {
      '--bg-main': '#0f0202',
      '--bg-card': '#2b0505',
      '--bg-item': '#3f0a0a',
      '--text-main': '#ffe4e6',
      '--text-muted': '#fda4af',
      '--accent': '#f43f5e',
      '--accent-hover': '#e11d48',
      '--accent-glow': 'rgba(244, 63, 94, 0.6)',
      '--border-color': 'rgba(244, 63, 94, 0.25)',
      '--glass-opacity': '0.9',
      '--shadow-sm': '0 4px 15px rgba(0,0,0,0.6)',
    }
  },
  ocean: {
    name: 'Океан (Dark)',
    type: 'dark',
    colors: {
      '--bg-main': '#020617', 
      '--bg-card': '#0f172a',
      '--bg-item': '#1e293b',
      '--text-main': '#f0f9ff',
      '--text-muted': '#94a3b8',
      '--accent': '#38bdf8',
      '--accent-hover': '#0ea5e9',
      '--accent-glow': 'rgba(56, 189, 248, 0.6)',
      '--border-color': 'rgba(56,189,248,0.2)',
      '--glass-opacity': '0.85',
      '--shadow-sm': '0 4px 15px rgba(0,0,0,0.5)',
    },
  },
  amber: {
    name: 'Дюна (Dark)',
    type: 'dark',
    colors: {
      '--bg-main': '#0c0a04',
      '--bg-card': '#1c190a',
      '--bg-item': '#2b2610',
      '--text-main': '#fffbeb',
      '--text-muted': '#d6d3d1',
      '--accent': '#f59e0b',
      '--accent-hover': '#d97706',
      '--accent-glow': 'rgba(245, 158, 11, 0.5)',
      '--border-color': 'rgba(245,158,11,0.2)',
      '--glass-opacity': '0.85',
      '--shadow-sm': '0 4px 15px rgba(0,0,0,0.5)',
    },
  },
  cloud: {
    name: 'Облако (Light)',
    type: 'light',
    colors: {
      '--bg-main': '#f8fafc',
      '--bg-card': '#ffffff',
      '--bg-item': '#f1f5f9',
      '--text-main': '#0f172a',
      '--text-muted': '#64748b',
      '--accent': '#3b82f6',
      '--accent-hover': '#2563eb',
      '--accent-glow': 'rgba(59, 130, 246, 0.4)',
      '--border-color': 'rgba(148, 163, 184, 0.3)',
      '--glass-opacity': '0.7',
      '--shadow-sm': '0 4px 6px rgba(0,0,0,0.05)',
    }
  },
  paper: {
    name: 'Бумага (Light)',
    type: 'light',
    colors: {
      '--bg-main': '#f5f5f4',
      '--bg-card': '#ffffff',
      '--bg-item': '#e7e5e4',
      '--text-main': '#1c1917',
      '--text-muted': '#57534e',
      '--accent': '#d97706',
      '--accent-hover': '#b45309',
      '--accent-glow': 'rgba(217, 119, 6, 0.3)',
      '--border-color': 'rgba(120, 113, 108, 0.2)',
      '--glass-opacity': '0.6',
      '--shadow-sm': '0 2px 4px rgba(0,0,0,0.05)',
    }
  }
};

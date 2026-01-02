
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
    name: 'Лес',
    type: 'dark',
    colors: {
      '--bg-main': '#010b09', 
      '--bg-card': '#022c22',
      '--bg-item': '#04382d',
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
      '--bg-item': '#1e293b',
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
};

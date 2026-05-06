
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
  '--bg-glass': string;
  '--text-on-accent': string;
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
      '--bg-glass': 'rgba(255, 255, 255, 0.03)',
      '--text-on-accent': '#ffffff',
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
      '--bg-glass': 'rgba(255, 255, 255, 0.03)',
      '--text-on-accent': '#ffffff',
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
      '--bg-glass': 'rgba(255, 255, 255, 0.03)',
      '--text-on-accent': '#000000',
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
      '--bg-glass': 'rgba(255, 255, 255, 0.03)',
      '--text-on-accent': '#ffffff',
    }
  },
  ocean: {
    name: 'Океан (Dark)',
    type: 'dark',
    colors: {
      '--bg-main': '#0a0f1c', 
      '--bg-card': '#111827',
      '--bg-item': '#1f2937',
      '--text-main': '#f8fafc',
      '--text-muted': '#94a3b8',
      '--accent': '#3b82f6', // Classic blue
      '--accent-hover': '#2563eb',
      '--accent-glow': 'rgba(59, 130, 246, 0.6)',
      '--border-color': 'rgba(59, 130, 246, 0.2)',
      '--glass-opacity': '0.85',
      '--shadow-sm': '0 4px 15px rgba(0,0,0,0.5)',
      '--bg-glass': 'rgba(255, 255, 255, 0.03)',
      '--text-on-accent': '#ffffff',
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
      '--bg-glass': 'rgba(255, 255, 255, 0.03)',
      '--text-on-accent': '#000000',
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
      '--bg-glass': 'rgba(255, 255, 255, 0.6)',
      '--text-on-accent': '#ffffff',
    }
  },
  paper: {
    name: 'Моно (Light)',
    type: 'light',
    colors: {
      '--bg-main': '#ffffff', // Pure white background
      '--bg-card': '#fafafa', // Almost white card
      '--bg-item': '#f4f4f5', // Zinc 100 - Visible grey for buttons
      '--text-main': '#09090b', // Zinc 950 - Sharp Black
      '--text-muted': '#52525b', // Zinc 600 - Readable Grey
      '--accent': '#18181b', // Zinc 900 - Black Accent (High Contrast)
      '--accent-hover': '#27272a',
      '--accent-glow': 'rgba(0, 0, 0, 0.1)',
      '--border-color': '#e4e4e7', // Zinc 200 - Visible border
      '--glass-opacity': '0.9',
      '--shadow-sm': '0 1px 2px rgba(0,0,0,0.05)',
      '--bg-glass': 'rgba(255, 255, 255, 0.8)',
      '--text-on-accent': '#ffffff',
    }
  },
  'deep-purple': {
    name: 'Deep Purple (Cyber)',
    type: 'dark',
    colors: {
      '--bg-main': '#050014',
      '--bg-card': '#110022',
      '--bg-item': 'rgba(51, 0, 102, 0.4)',
      '--text-main': '#f3e8ff',
      '--text-muted': '#c084fc',
      '--accent': '#d946ef',
      '--accent-hover': '#c026d3',
      '--accent-glow': 'rgba(217, 70, 239, 0.8)',
      '--border-color': 'rgba(217, 70, 239, 0.3)',
      '--glass-opacity': '0.7',
      '--shadow-sm': '0 8px 32px 0 rgba(31, 38, 135, 0.37);',
      '--bg-glass': 'rgba(5, 0, 20, 0.2)',
      '--text-on-accent': '#ffffff',
    }
  },
  matrix: {
    name: 'Matrix Green (Cyber)',
    type: 'dark',
    colors: {
      '--bg-main': '#000000',
      '--bg-card': '#001400',
      '--bg-item': 'rgba(0, 40, 0, 0.4)',
      '--text-main': '#e5ffe5',
      '--text-muted': '#4ade80',
      '--accent': '#22c55e',
      '--accent-hover': '#16a34a',
      '--accent-glow': 'rgba(34, 197, 94, 0.8)',
      '--border-color': 'rgba(34, 197, 94, 0.3)',
      '--glass-opacity': '0.7',
      '--shadow-sm': '0 8px 32px 0 rgba(0, 50, 0, 0.37);',
      '--bg-glass': 'rgba(0, 0, 0, 0.2)',
      '--text-on-accent': '#000000',
    }
  },
  'cyber-sunset': {
    name: 'Cyber Sunset (Cyber)',
    type: 'dark',
    colors: {
      '--bg-main': '#1a0b16',
      '--bg-card': '#2a0a20',
      '--bg-item': 'rgba(88, 28, 65, 0.4)',
      '--text-main': '#ffe4e6',
      '--text-muted': '#fbcfe8',
      '--accent': '#f43f5e',
      '--accent-hover': '#e11d48',
      '--accent-glow': 'rgba(244, 63, 94, 0.8)',
      '--border-color': 'rgba(244, 63, 94, 0.3)',
      '--glass-opacity': '0.7',
      '--shadow-sm': '0 8px 32px 0 rgba(100, 20, 50, 0.37);',
      '--bg-glass': 'rgba(26, 11, 22, 0.2)',
      '--text-on-accent': '#ffffff',
    }
  },
  mint: {
    name: 'Мята (Light)',
    type: 'light',
    colors: {
      '--bg-main': '#f0fdf4',
      '--bg-card': '#ffffff',
      '--bg-item': '#dcfce7',
      '--text-main': '#14532d',
      '--text-muted': '#166534',
      '--accent': '#22c55e',
      '--accent-hover': '#16a34a',
      '--accent-glow': 'rgba(34, 197, 94, 0.3)',
      '--border-color': 'rgba(34, 197, 94, 0.2)',
      '--glass-opacity': '0.8',
      '--shadow-sm': '0 4px 6px rgba(0,0,0,0.05)',
      '--bg-glass': 'rgba(255, 255, 255, 0.7)',
      '--text-on-accent': '#ffffff',
    }
  },
  latte: {
    name: 'Латте (Light)',
    type: 'light',
    colors: {
      '--bg-main': '#faf8f5',
      '--bg-card': '#ffffff',
      '--bg-item': '#f5f0e6',
      '--text-main': '#4338ca', // deep indigo/brown contrast
      '--text-muted': '#78716c',
      '--accent': '#d97706',
      '--accent-hover': '#b45309',
      '--accent-glow': 'rgba(217, 119, 6, 0.3)',
      '--border-color': 'rgba(217, 119, 6, 0.2)',
      '--glass-opacity': '0.8',
      '--shadow-sm': '0 4px 6px rgba(0,0,0,0.05)',
      '--bg-glass': 'rgba(255, 255, 255, 0.7)',
      '--text-on-accent': '#ffffff',
    }
  },
  turquoise: {
    name: 'Бирюза (Dark)',
    type: 'dark',
    colors: {
      '--bg-main': '#041f24',
      '--bg-card': '#0a2e36',
      '--bg-item': '#114652',
      '--text-main': '#ccfbf1',
      '--text-muted': '#5eead4',
      '--accent': '#14b8a6',
      '--accent-hover': '#0d9488',
      '--accent-glow': 'rgba(20, 184, 166, 0.6)',
      '--border-color': 'rgba(20, 184, 166, 0.2)',
      '--glass-opacity': '0.85',
      '--shadow-sm': '0 4px 15px rgba(0,0,0,0.5)',
      '--bg-glass': 'rgba(255, 255, 255, 0.04)',
      '--text-on-accent': '#ffffff',
    }
  },
  ash: {
    name: 'Пепел (Dark)',
    type: 'dark',
    colors: {
      '--bg-main': '#121212',
      '--bg-card': '#1e1e1e',
      '--bg-item': '#2d2d2d',
      '--text-main': '#f4f4f5',
      '--text-muted': '#a1a1aa',
      '--accent': '#71717a',
      '--accent-hover': '#52525b',
      '--accent-glow': 'rgba(161, 161, 170, 0.5)',
      '--border-color': 'rgba(161, 161, 170, 0.2)',
      '--glass-opacity': '0.9',
      '--shadow-sm': '0 8px 32px 0 rgba(100, 100, 100, 0.1)',
      '--bg-glass': 'rgba(255, 255, 255, 0.05)',
      '--text-on-accent': '#ffffff',
    }
  }
};

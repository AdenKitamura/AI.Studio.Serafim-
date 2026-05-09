import { useState, useEffect } from 'react';
import { ThemeKey, FontFamily, IconWeight, GeminiModel } from '../types';
import { themes } from '../themes';

export const useThemeManager = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(() => (localStorage.getItem('sb_theme') || 'emerald') as ThemeKey);
  const [currentFont, setCurrentFont] = useState<FontFamily>(() => (localStorage.getItem('sb_font') || 'JetBrains Mono') as FontFamily);
  const [iconWeight, setIconWeight] = useState<IconWeight>(() => (localStorage.getItem('sb_icon_weight') || '2px') as IconWeight);
  const [geminiModel, setGeminiModel] = useState<GeminiModel>(() => (localStorage.getItem('sb_gemini_model') || 'flash') as GeminiModel);

  useEffect(() => {
    const validTheme = themes[currentTheme] ? currentTheme : 'emerald';
    const theme = themes[validTheme];
    const root = document.documentElement;
    const body = document.body;

    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value as string);
    });

    const fontFamilies: Record<FontFamily, string> = {
        'JetBrains Mono': '"JetBrains Mono", monospace',
        'Inter': '"Inter", sans-serif',
        'SF Pro Text': '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
        'Roboto': '"Roboto", sans-serif',
        'Outfit': '"Outfit", sans-serif',
        'Space Grotesk': '"Space Grotesk", sans-serif',
        'Playfair Display': '"Playfair Display", serif',
        'Fira Code': '"Fira Code", monospace',
        'system-ui': 'system-ui, sans-serif'
    };

    root.style.setProperty('--app-font', fontFamilies[currentFont] || fontFamilies['JetBrains Mono']);
    root.style.setProperty('--icon-weight', iconWeight);
    body.setAttribute('data-theme-type', theme.type);

    if (theme.type === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('sb_theme', validTheme);
    localStorage.setItem('sb_font', currentFont);
    localStorage.setItem('sb_icon_weight', iconWeight);
    localStorage.setItem('sb_gemini_model', geminiModel);

  }, [currentTheme, currentFont, iconWeight, geminiModel]);

  return {
    currentTheme, setCurrentTheme,
    currentFont, setCurrentFont,
    iconWeight, setIconWeight,
    geminiModel, setGeminiModel
  };
};

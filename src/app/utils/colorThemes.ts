export interface ColorTheme {
  id: string;
  name: string;
  emoji: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
  };
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'default',
    name: 'Rose & Sky',
    emoji: '🌸',
    colors: {
      primary: '#d4a5a5',
      secondary: '#b8c5d6',
      accent: '#e8dfd6',
      background: '#faf8f6',
      surface: '#ffffff',
      border: '#e3ddd5',
      textPrimary: '#4a4a4a',
      textSecondary: '#6a6a6a',
      textMuted: '#8b8680'
    }
  },
  {
    id: 'cal-bears',
    name: 'Cal Bears',
    emoji: '🐻',
    colors: {
      primary: '#003262',
      secondary: '#FDB515',
      accent: '#f5e6c8',
      background: '#faf9f6',
      surface: '#ffffff',
      border: '#d4c9b0',
      textPrimary: '#003262',
      textSecondary: '#2a4a6a',
      textMuted: '#7a8a9a'
    }
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    emoji: '🌊',
    colors: {
      primary: '#5aa9b8',
      secondary: '#7bc4d4',
      accent: '#d6eef2',
      background: '#f5fafb',
      surface: '#ffffff',
      border: '#d1e8ed',
      textPrimary: '#2c4a52',
      textSecondary: '#4a6a72',
      textMuted: '#7a9aa2'
    }
  },
  {
    id: 'forest',
    name: 'Forest Green',
    emoji: '🌲',
    colors: {
      primary: '#7ba882',
      secondary: '#9ec4a3',
      accent: '#e3ede5',
      background: '#f7faf8',
      surface: '#ffffff',
      border: '#d8e6da',
      textPrimary: '#3a4a3c',
      textSecondary: '#5a6a5c',
      textMuted: '#8a9a8c'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    emoji: '🌅',
    colors: {
      primary: '#e89a6f',
      secondary: '#c988b8',
      accent: '#f5e4d9',
      background: '#fef9f6',
      surface: '#ffffff',
      border: '#ead9cf',
      textPrimary: '#4a3a34',
      textSecondary: '#6a5a54',
      textMuted: '#9a8a84'
    }
  },
  {
    id: 'lavender',
    name: 'Lavender Fields',
    emoji: '💜',
    colors: {
      primary: '#b5a4d4',
      secondary: '#d4b5d4',
      accent: '#e9e4f2',
      background: '#faf8fc',
      surface: '#ffffff',
      border: '#e0d8ed',
      textPrimary: '#44394a',
      textSecondary: '#64596a',
      textMuted: '#84798a'
    }
  },
  {
    id: 'coral',
    name: 'Coral Reef',
    emoji: '🪸',
    colors: {
      primary: '#f4a5a5',
      secondary: '#f5c4a4',
      accent: '#fce9e4',
      background: '#fffaf8',
      surface: '#ffffff',
      border: '#f0ddd8',
      textPrimary: '#4a3434',
      textSecondary: '#6a5454',
      textMuted: '#8a7474'
    }
  },
  {
    id: 'monochrome',
    name: 'Minimal Gray',
    emoji: '⚫',
    colors: {
      primary: '#6b7280',
      secondary: '#9ca3af',
      accent: '#e5e7eb',
      background: '#f9fafb',
      surface: '#ffffff',
      border: '#d1d5db',
      textPrimary: '#1f2937',
      textSecondary: '#4b5563',
      textMuted: '#9ca3af'
    }
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    emoji: '✨',
    colors: {
      primary: '#d4af37',
      secondary: '#e8c468',
      accent: '#f5ead6',
      background: '#fffcf5',
      surface: '#ffffff',
      border: '#ede4d1',
      textPrimary: '#4a4234',
      textSecondary: '#6a6254',
      textMuted: '#8a8274'
    }
  }
];

export function getThemeById(id: string): ColorTheme {
  return COLOR_THEMES.find(theme => theme.id === id) || COLOR_THEMES[0];
}

export function applyTheme(theme: ColorTheme) {
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
}

export function saveCustomTheme(theme: ColorTheme) {
  localStorage.setItem('customTheme', JSON.stringify(theme));
}

export function getCustomTheme(): ColorTheme | null {
  const saved = localStorage.getItem('customTheme');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

export function createCustomTheme(colors: ColorTheme['colors']): ColorTheme {
  return {
    id: 'custom',
    name: 'My Custom Theme',
    emoji: '🎨',
    colors
  };
}

export function deleteCustomTheme() {
  localStorage.removeItem('customTheme');
}

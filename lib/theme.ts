/**
 * Global theme configuration
 * Centralized theme colors that can be easily customized
 */

export type ThemeName = 'light' | 'dark';

export interface Theme {
  name: ThemeName;
  // Primary colors
  primary: string;
  primaryHover: string;
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  // Text colors
  foreground: string;
  foregroundMuted: string;
  foregroundMutedHover: string;
  // Borders
  border: string;
  // Input/Form
  input: string;
  inputBorder: string;
  inputFocus: string;
  // Messages
  messageUserBg: string;
  messageAssistantText: string;
  // UI Elements
  sidebarBg: string;
  buttonBg: string;
  buttonHoverBg: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    // Primary colors
    primary: '#00692a',
    primaryHover: '#00a83a',
    // Backgrounds
    background: '#212121',
    backgroundSecondary: '#1a1a1a',
    backgroundTertiary: '#2a2a2a',
    // Text colors
    foreground: '#ededed',
    foregroundMuted: '#a0a0a0',
    foregroundMutedHover: '#c0c0c0',
    // Borders
    border: '#333333',
    // Input/Form
    input: '#1a1a1a',
    inputBorder: '#333333',
    inputFocus: '#00692a',
    // Messages
    messageUserBg: '#00692a',
    messageAssistantText: '#d1d5db',
    // UI Elements
    sidebarBg: '#1a1a1a',
    buttonBg: '#00692a',
    buttonHoverBg: '#00a83a',
  },
  light: {
    name: 'light',
    // Primary colors
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    // Backgrounds
    background: '#ffffff',
    backgroundSecondary: '#f3f4f6',
    backgroundTertiary: '#e5e7eb',
    // Text colors
    foreground: '#111827',
    foregroundMuted: '#6b7280',
    foregroundMutedHover: '#374151',
    // Borders
    border: '#d1d5db',
    // Input/Form
    input: '#ffffff',
    inputBorder: '#d1d5db',
    inputFocus: '#d4c5f9',
    // Messages
    messageUserBg: '#6366f1',
    messageAssistantText: '#111827',
    // UI Elements
    sidebarBg: '#ffffff',
    buttonBg: '#6366f1',
    buttonHoverBg: '#4f46e5',
  },
} as const;

export const THEME = THEMES.dark;

/**
 * Apply a theme by updating CSS variables and HTML class
 */
export function applyTheme(themeName: ThemeName) {
  const theme = THEMES[themeName];
  if (!theme) {
    console.warn(`Theme "${themeName}" not found`);
    return;
  }
  
  // Update HTML class for Tailwind dark mode
  if (themeName === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Apply all theme colors to CSS variables
  document.documentElement.style.setProperty('--primary', theme.primary);
  document.documentElement.style.setProperty('--primary-hover', theme.primaryHover);
  document.documentElement.style.setProperty('--background', theme.background);
  document.documentElement.style.setProperty('--background-secondary', theme.backgroundSecondary);
  document.documentElement.style.setProperty('--background-tertiary', theme.backgroundTertiary);
  document.documentElement.style.setProperty('--foreground', theme.foreground);
  document.documentElement.style.setProperty('--foreground-muted', theme.foregroundMuted);
  document.documentElement.style.setProperty('--foreground-muted-hover', theme.foregroundMutedHover);
  document.documentElement.style.setProperty('--border', theme.border);
  document.documentElement.style.setProperty('--input', theme.input);
  document.documentElement.style.setProperty('--input-border', theme.inputBorder);
  document.documentElement.style.setProperty('--input-focus', theme.inputFocus);
  document.documentElement.style.setProperty('--message-user-bg', theme.messageUserBg);
  document.documentElement.style.setProperty('--message-assistant-text', theme.messageAssistantText);
  document.documentElement.style.setProperty('--sidebar-bg', theme.sidebarBg);
  document.documentElement.style.setProperty('--button-bg', theme.buttonBg);
  document.documentElement.style.setProperty('--button-hover-bg', theme.buttonHoverBg);
  document.documentElement.style.setProperty('--action-color', theme.primary);
  
  // Save to localStorage for persistence
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme', themeName);
  }
}

/**
 * Get the saved theme from localStorage or default to dark
 */
export function getSavedTheme(): ThemeName {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  
  const saved = localStorage.getItem('theme');
  return (saved as ThemeName) || 'dark';
}

/**
 * Update the CSS variable for action color
 * This is useful if you want to change the theme dynamically at runtime
 */
export function setActionColor(color: string) {
  document.documentElement.style.setProperty('--action-color', color);
}

/**
 * Get the current action color from CSS variable
 */
export function getActionColor(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--action-color').trim();
}


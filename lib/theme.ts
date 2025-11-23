/**
 * Global theme configuration
 * Centralized theme colors that can be easily customized
 */

export type ThemeName = 'light' | 'dark' | 'dim' | 'blue' | 'warm' | 'soft';

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
  dim: {
    name: 'dim',
    // Primary colors
    primary: '#4b5563',
    primaryHover: '#6b7280',
    // Backgrounds
    background: '#18181b',
    backgroundSecondary: '#27272a',
    backgroundTertiary: '#3f3f46',
    // Text colors
    foreground: '#e5e7eb',
    foregroundMuted: '#9ca3af',
    foregroundMutedHover: '#d1d5db',
    // Borders
    border: '#3f3f46',
    // Input/Form
    input: '#18181b',
    inputBorder: '#3f3f46',
    inputFocus: '#4b5563',
    // Messages
    messageUserBg: '#4b5563',
    messageAssistantText: '#e5e7eb',
    // UI Elements
    sidebarBg: '#18181b',
    buttonBg: '#4b5563',
    buttonHoverBg: '#6b7280',
  },
  blue: {
    name: 'blue',
    // Primary colors
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    // Backgrounds
    background: '#020617',
    backgroundSecondary: '#0f172a',
    backgroundTertiary: '#1e293b',
    // Text colors
    foreground: '#e5e7eb',
    foregroundMuted: '#9ca3af',
    foregroundMutedHover: '#d1d5db',
    // Borders
    border: '#1e293b',
    // Input/Form
    input: '#020617',
    inputBorder: '#1e293b',
    inputFocus: '#2563eb',
    // Messages
    messageUserBg: '#2563eb',
    messageAssistantText: '#e5e7eb',
    // UI Elements
    sidebarBg: '#020617',
    buttonBg: '#2563eb',
    buttonHoverBg: '#1d4ed8',
  },
  warm: {
    name: 'warm',
    // Primary colors
    primary: '#ea580c',
    primaryHover: '#c2410c',
    // Backgrounds
    background: '#fefce8',
    backgroundSecondary: '#fef3c7',
    backgroundTertiary: '#fde68a',
    // Text colors
    foreground: '#1f2937',
    foregroundMuted: '#6b7280',
    foregroundMutedHover: '#374151',
    // Borders
    border: '#facc15',
    // Input/Form
    input: '#ffffff',
    inputBorder: '#facc15',
    inputFocus: '#f97316',
    // Messages
    messageUserBg: '#f97316',
    messageAssistantText: '#1f2937',
    // UI Elements
    sidebarBg: '#fef9c3',
    buttonBg: '#ea580c',
    buttonHoverBg: '#c2410c',
  },
  soft: {
    name: 'soft',
    // Primary colors
    primary: '#0ea5e9',
    primaryHover: '#0284c7',
    // Backgrounds
    background: '#f9fafb',
    backgroundSecondary: '#e5f3fb',
    backgroundTertiary: '#dbeafe',
    // Text colors
    foreground: '#0f172a',
    foregroundMuted: '#6b7280',
    foregroundMutedHover: '#1f2937',
    // Borders
    border: '#bfdbfe',
    // Input/Form
    input: '#ffffff',
    inputBorder: '#bfdbfe',
    inputFocus: '#0ea5e9',
    // Messages
    messageUserBg: '#0ea5e9',
    messageAssistantText: '#0f172a',
    // UI Elements
    sidebarBg: '#eff6ff',
    buttonBg: '#0ea5e9',
    buttonHoverBg: '#0284c7',
  },
} as const;

export const THEME = THEMES.dark;

/**
 * Helper: which themes should be treated as "dark mode" for styling
 */
export const DARK_THEMES: ThemeName[] = ['dark', 'dim', 'blue'];

export function isDarkTheme(themeName: ThemeName): boolean {
  return DARK_THEMES.includes(themeName);
}

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
  if (isDarkTheme(themeName)) {
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


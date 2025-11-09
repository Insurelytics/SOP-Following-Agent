# Global Theme Configuration

## Overview

The action color (previously hardcoded green) is now configured globally through a centralized theme system. All components now use the CSS variable `--action-color` which is set to `#303030` (grey).

## Files Modified

1. **`lib/theme.ts`** (NEW)
   - Centralized theme configuration
   - Exports `THEME` object with current colors
   - Provides utility functions to change theme at runtime

2. **`app/globals.css`**
   - Added `--action-color: #303030` to `:root` CSS variables

3. **`tailwind.config.ts`**
   - Added `action: "var(--action-color)"` to theme colors
   - Enables use of `bg-action`, `text-action`, `border-action`, etc. in Tailwind classes

4. **Components Updated**
   - `components/MessageList.tsx` - User message bubble background
   - `components/ChatInput.tsx` - Send button and input focus ring
   - `components/Sidebar.tsx` - "New Chat" button
   - `app/page.tsx` - "Create New Chat" button

## How to Use

### Change the Action Color Globally

Simply edit the `--action-color` value in `app/globals.css`:

```css
:root {
  --action-color: #FF0000; /* Change to any color you want */
}
```

### Change the Action Color at Runtime (JavaScript)

If you need to change the theme dynamically:

```typescript
import { setActionColor, getActionColor } from '@/lib/theme';

// Set new action color
setActionColor('#FF0000');

// Get current action color
const currentColor = getActionColor();
```

### Add More Theme Colors

To add additional theme colors:

1. Add the color to `lib/theme.ts` THEME object
2. Add CSS variable to `app/globals.css` `:root`
3. Add Tailwind color extension in `tailwind.config.ts`
4. Use in components (e.g., `bg-primary`, `text-primary`)

Example:
```css
/* app/globals.css */
:root {
  --action-color: #303030;
  --primary: #007bff;
}
```

```typescript
// tailwind.config.ts
colors: {
  action: "var(--action-color)",
  primary: "var(--primary)",
}
```

## Theme Picker

A theme picker is available in the Sidebar footer under "Signed in as". Click on it to see a dropdown menu with available themes.

### Available Themes

1. **Dark Theme** (default)
   - Action Color: `#303030` (grey)
   - Background: `#0f0f0f`
   - Foreground: `#ededed`

2. **Light Theme**
   - Action Color: `#4f46e5` (indigo)
   - Background: `#f5f5f5`
   - Foreground: `#1f1f1f`

### Theme Persistence

The selected theme is saved to localStorage and will be restored when the user returns to the app.

## Current Theme Colors

- **Action Color**: `#303030` (grey) - used for buttons and interactive elements
- **Background**: `#0f0f0f` (dark)
- **Foreground**: `#ededed` (light)


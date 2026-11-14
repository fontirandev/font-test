import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/vazirmatn/300.css';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/600.css';
import './styles.css';
import { App } from './App';
import { readStoredTheme, resolveTheme } from './lib/theme';

// Apply the stored theme before the first paint so dark mode does not flash light.
document.documentElement.dataset.theme = resolveTheme(readStoredTheme() ?? 'light');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

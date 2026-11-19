import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import './styles.css';
import { App } from './App';
import { ConfirmProvider } from './components/Confirm';
import { readPref } from './store/storage';
import { TournamentProvider } from './store/TournamentContext';
import { applyTheme, DEFAULT_THEME } from './theme/theme';

// aplica o tema antes do primeiro render para evitar flash
applyTheme(readPref('theme', ['dark', 'light'] as const, DEFAULT_THEME));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TournamentProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </TournamentProvider>
  </StrictMode>,
);

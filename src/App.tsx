import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { readPref, writePref } from './store/storage';
import { useTournament } from './store/TournamentContext';
import { Dashboard } from './screens/Dashboard';
import { FormatScreen } from './screens/FormatScreen';
import { Registration } from './screens/Registration';
import { applyTheme, DEFAULT_THEME, type ThemeMode } from './theme/theme';

export function App() {
  const { state, corrupted } = useTournament();
  const [theme, setTheme] = useState<ThemeMode>(() => readPref('theme', ['dark', 'light'] as const, DEFAULT_THEME));
  const [notice, setNotice] = useState<string | null>(
    corrupted ? 'Não foi possível ler os dados salvos. Um campeonato novo foi iniciado.' : null,
  );
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    applyTheme(theme);
    writePref('theme', theme);
  }, [theme]);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), 4000);
  }, []);

  return (
    <div className="app">
      <Header theme={theme} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} onNotice={showNotice} />
      {notice && (
        <div className="notice" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
      {state.phase === 'registration' && <Registration />}
      {state.phase === 'format' && <FormatScreen />}
      {state.phase === 'tournament' && <Dashboard />}
    </div>
  );
}

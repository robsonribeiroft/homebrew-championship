import { useEffect, useRef, useState } from 'react';
import { isValidState, phaseLabel } from '../domain/tournament';
import { useTournament } from '../store/TournamentContext';
import type { ThemeMode } from '../theme/theme';
import { useConfirm } from './Confirm';
import { MenuIcon, MoonIcon, SunIcon } from './Icons';

interface Props {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onNotice: (msg: string) => void;
}

export function Header({ theme, onToggleTheme, onNotice }: Props) {
  const { state, dispatch } = useTournament();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (fn: () => void | Promise<void>) => () => {
    setOpen(false);
    void fn();
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campeonato-fifa-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onNotice('Backup exportado');
  };

  const importFile = async (file: File) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      onNotice('Arquivo inválido: não é um JSON');
      return;
    }
    if (!isValidState(parsed)) {
      onNotice('Arquivo inválido: não é um backup deste app');
      return;
    }
    const ok = await confirm({
      title: 'Importar backup?',
      message: `O campeonato atual será substituído pelo do arquivo (${parsed.players.length} jogadores).`,
      confirmLabel: 'Substituir',
      danger: true,
    });
    if (ok) {
      dispatch({ type: 'replace', state: parsed });
      onNotice('Backup importado');
    }
  };

  const hasData = state.players.length > 0 || state.phase !== 'registration';
  const canUndoKo = state.phase === 'tournament' && !!state.knockout && !state.skipGroups;

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark">FIFA</span>
        <span className="brand__name">Fifinha Championship</span>
      </div>
      <div className="topbar__right">
        <span className="tag tag--phase">{phaseLabel(state)}</span>
        <button className="btn btn--icon" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          <span className="btn__text">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        <div className="menu" ref={menuRef}>
          <button className="btn btn--icon" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <MenuIcon />
            <span className="btn__text">Menu</span>
          </button>
          {open && (
            <div className="menu__list" role="menu">
              <button role="menuitem" onClick={run(exportJson)} disabled={!hasData}>Exportar backup</button>
              <button role="menuitem" onClick={run(() => fileRef.current?.click())}>Importar backup</button>
              {canUndoKo && (
                <button
                  role="menuitem"
                  onClick={run(async () => {
                    const ok = await confirm({
                      title: 'Desfazer mata-mata?',
                      message: 'Todos os resultados do mata-mata serão apagados e a fase de grupos volta a ser editável.',
                      confirmLabel: 'Desfazer',
                      danger: true,
                    });
                    if (ok) dispatch({ type: 'undoKnockout' });
                  })}
                >
                  Desfazer mata-mata
                </button>
              )}
              <hr />
              <button
                role="menuitem"
                disabled={state.players.length === 0 || state.phase === 'registration'}
                onClick={run(async () => {
                  const ok = await confirm({
                    title: 'Novo campeonato (mesmos jogadores)?',
                    message: 'Jogos e resultados serão apagados. Inscritos e times são mantidos e você volta à inscrição.',
                    confirmLabel: 'Recomeçar',
                    danger: true,
                  });
                  if (ok) dispatch({ type: 'resetKeepPlayers' });
                })}
              >
                Novo campeonato (mesmos jogadores)
              </button>
              <button
                role="menuitem"
                className="is-danger"
                disabled={!hasData}
                onClick={run(async () => {
                  const ok = await confirm({
                    title: 'Novo campeonato do zero?',
                    message: 'Tudo será apagado: inscritos, jogos e resultados. Considere exportar um backup antes.',
                    confirmLabel: 'Apagar tudo',
                    danger: true,
                  });
                  if (ok) dispatch({ type: 'resetAll' });
                })}
              >
                Novo campeonato (do zero)
              </button>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void importFile(f);
          }}
        />
      </div>
    </header>
  );
}

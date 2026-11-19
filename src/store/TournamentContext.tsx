import { createContext, useContext, useEffect, useReducer, useRef, type Dispatch, type ReactNode } from 'react';
import { initialState, reducer, type Action } from '../domain/tournament';
import type { TournamentState } from '../domain/types';
import { loadState, saveState } from './storage';

interface Ctx {
  state: TournamentState;
  dispatch: Dispatch<Action>;
  /** dados salvos estavam ilegíveis ao abrir */
  corrupted: boolean;
}

const TournamentCtx = createContext<Ctx | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const loaded = useRef(loadState());
  const [state, dispatch] = useReducer(reducer, undefined, () => loaded.current.state ?? initialState());
  const initial = useRef(state);

  useEffect(() => {
    // não sobrescreve dados ilegíveis até o usuário fazer algo
    if (loaded.current.corrupted && state === initial.current) return;
    saveState(state);
  }, [state]);

  return (
    <TournamentCtx.Provider value={{ state, dispatch, corrupted: loaded.current.corrupted }}>{children}</TournamentCtx.Provider>
  );
}

export function useTournament(): Ctx {
  const ctx = useContext(TournamentCtx);
  if (!ctx) throw new Error('useTournament fora do TournamentProvider');
  return ctx;
}

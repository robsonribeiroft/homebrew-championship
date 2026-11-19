import { buildBracket, canEditKo, matchWinner, setKoResult, sizeOfBracket, stageName } from './bracket';
import { computeStandings } from './standings';
import type { Draft, Match, Player, PlayerId, Score, TournamentState } from './types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 20;
export const MAX_NAME_LENGTH = 20;
export const MAX_GOALS = 99;

export const initialState = (): TournamentState => ({
  schemaVersion: 1,
  phase: 'registration',
  exclusiveTeams: true,
  players: [],
  qualifiers: null,
  skipGroups: false,
  groupMatches: [],
  knockout: null,
  drafts: {},
});

/* ------------------------------------------------------------------ ações */

export type Action =
  | { type: 'setExclusive'; value: boolean }
  | { type: 'addPlayer'; player: Player }
  | { type: 'removePlayer'; id: PlayerId }
  | { type: 'goToFormat' }
  | { type: 'backToRegistration' }
  | { type: 'start'; qualifiers: number; skipGroups: boolean; groupMatches: Match[]; seeds: PlayerId[] | null }
  | { type: 'setDraft'; matchId: string; draft: Draft | null }
  | { type: 'finishMatch'; matchId: string; score: Score; pens: Score | null }
  | { type: 'clearResult'; matchId: string }
  | { type: 'generateKnockout' }
  | { type: 'undoKnockout' }
  | { type: 'resetKeepPlayers' }
  | { type: 'resetAll' }
  | { type: 'replace'; state: TournamentState };

const withoutDraft = (drafts: Record<string, Draft>, ...ids: string[]) => {
  const out = { ...drafts };
  for (const id of ids) delete out[id];
  return out;
};

export function reducer(state: TournamentState, action: Action): TournamentState {
  switch (action.type) {
    case 'setExclusive':
      if (state.phase !== 'registration') return state;
      if (action.value && hasDuplicateTeams(state.players)) return state;
      return { ...state, exclusiveTeams: action.value };

    case 'addPlayer': {
      if (state.phase !== 'registration') return state;
      const err = validateNewPlayer(state, action.player.name, action.player.teamId);
      if (err) return state;
      return { ...state, players: [...state.players, { ...action.player, name: action.player.name.trim() }] };
    }

    case 'removePlayer':
      if (state.phase !== 'registration') return state;
      return { ...state, players: state.players.filter((p) => p.id !== action.id) };

    case 'goToFormat':
      if (state.phase !== 'registration' || state.players.length < MIN_PLAYERS) return state;
      return { ...state, phase: 'format' };

    case 'backToRegistration':
      if (state.phase !== 'format') return state;
      return { ...state, phase: 'registration' };

    case 'start': {
      if (state.phase !== 'format') return state;
      const skip = action.skipGroups && action.qualifiers === state.players.length && !!action.seeds;
      return {
        ...state,
        phase: 'tournament',
        qualifiers: action.qualifiers,
        skipGroups: skip,
        groupMatches: skip ? [] : action.groupMatches,
        knockout: skip ? buildBracket(action.seeds!) : null,
        drafts: {},
      };
    }

    case 'setDraft':
      return {
        ...state,
        drafts: action.draft ? { ...state.drafts, [action.matchId]: action.draft } : withoutDraft(state.drafts, action.matchId),
      };

    case 'finishMatch':
    case 'clearResult': {
      const score = action.type === 'finishMatch' ? clampScore(action.score) : null;
      const pens = action.type === 'finishMatch' && action.pens ? clampScore(action.pens) : null;
      const g = state.groupMatches.find((m) => m.id === action.matchId);
      if (g) {
        if (state.knockout) return state; // fase de grupos travada
        return {
          ...state,
          groupMatches: state.groupMatches.map((m) => (m.id === g.id ? { ...m, score, pens: null } : m)),
          drafts: withoutDraft(state.drafts, g.id),
        };
      }
      const k = findKoMatch(state, action.matchId);
      if (!k || !state.knockout || !k.a || !k.b) return state;
      if (!canEditKo(state.knockout, k.round, k.slot)) return state;
      if (score && score.a === score.b && (!pens || pens.a === pens.b)) return state; // precisa de vencedor
      const ko = setKoResult(state.knockout, k.round, k.slot, score, pens);
      // se o vencedor mudou, o rascunho do jogo seguinte deixa de fazer sentido
      const next = ko[k.round + 1]?.[Math.floor(k.slot / 2)];
      const before = state.knockout[k.round + 1]?.[Math.floor(k.slot / 2)];
      const changed = next && before && (next.a !== before.a || next.b !== before.b);
      return {
        ...state,
        knockout: ko,
        drafts: withoutDraft(state.drafts, k.id, ...(changed ? [next.id] : [])),
      };
    }

    case 'generateKnockout': {
      if (state.phase !== 'tournament' || state.knockout || !state.qualifiers) return state;
      if (!isGroupComplete(state)) return state;
      const seeds = computeStandings(state.players, state.groupMatches)
        .slice(0, state.qualifiers)
        .map((r) => r.player.id);
      return { ...state, knockout: buildBracket(seeds) };
    }

    case 'undoKnockout': {
      if (!state.knockout || state.skipGroups) return state;
      const koIds = state.knockout.flat().map((m) => m.id);
      return { ...state, knockout: null, drafts: withoutDraft(state.drafts, ...koIds) };
    }

    case 'resetKeepPlayers':
      return { ...initialState(), exclusiveTeams: state.exclusiveTeams, players: state.players };

    case 'resetAll':
      return initialState();

    case 'replace':
      return action.state;
  }
}

/* ------------------------------------------------------------- validações */

export function hasDuplicateTeams(players: readonly Player[]): boolean {
  return new Set(players.map((p) => p.teamId)).size !== players.length;
}

const normalizeName = (s: string) => s.trim().toLocaleLowerCase('pt-BR');

export function validateNewPlayer(state: TournamentState, name: string, teamId: string | null): string | null {
  const trimmed = name.trim();
  if (state.players.length >= MAX_PLAYERS) return `Limite de ${MAX_PLAYERS} jogadores atingido`;
  if (!trimmed) return 'Digite o nome do jogador';
  if (trimmed.length > MAX_NAME_LENGTH) return `Máximo de ${MAX_NAME_LENGTH} caracteres`;
  if (state.players.some((p) => normalizeName(p.name) === normalizeName(trimmed))) return 'Já existe um jogador com esse nome';
  if (!teamId) return 'Selecione um time';
  if (state.exclusiveTeams && state.players.some((p) => p.teamId === teamId)) return 'Esse time já foi escolhido';
  return null;
}

const clampGoals = (n: number) => Math.max(0, Math.min(MAX_GOALS, Math.floor(Number.isFinite(n) ? n : 0)));
const clampScore = (s: Score): Score => ({ a: clampGoals(s.a), b: clampGoals(s.b) });

/* -------------------------------------------------------------- seletores */

export const playerById = (state: TournamentState, id: PlayerId | null) =>
  id ? state.players.find((p) => p.id === id) ?? null : null;

export function findKoMatch(state: TournamentState, id: string): Match | null {
  return state.knockout?.flat().find((m) => m.id === id) ?? null;
}

export function findMatch(state: TournamentState, id: string): Match | null {
  return state.groupMatches.find((m) => m.id === id) ?? findKoMatch(state, id);
}

export const isGroupComplete = (state: TournamentState) =>
  state.groupMatches.length > 0 && state.groupMatches.every((m) => m.score !== null);

/** Próximo jogo a acontecer, ou null (grupos encerrados aguardando mata-mata, ou campeão). */
export function nextMatch(state: TournamentState): Match | null {
  if (state.phase !== 'tournament') return null;
  if (!state.knockout) return state.groupMatches.find((m) => m.score === null) ?? null;
  for (const round of state.knockout) {
    const m = round.find((x) => x.a && x.b && x.score === null);
    if (m) return m;
  }
  return null;
}

export function champion(state: TournamentState): { player: Player; final: Match } | null {
  const final = state.knockout?.[state.knockout.length - 1]?.[0];
  if (!final) return null;
  const w = matchWinner(final);
  const player = playerById(state, w);
  return player ? { player, final } : null;
}

export function isMatchLocked(state: TournamentState, m: Match): boolean {
  if (m.stage === 'group') return state.knockout !== null;
  if (!state.knockout || !m.a || !m.b) return true;
  return !canEditKo(state.knockout, m.round, m.slot);
}

/** Rótulo de fase de um jogo de mata-mata. */
export function koStageName(state: TournamentState, round: number): string {
  if (!state.knockout) return '';
  return stageName(sizeOfBracket(state.knockout) / 2 ** round);
}

export function phaseLabel(state: TournamentState): string {
  if (state.phase === 'registration') return 'Inscrição';
  if (state.phase === 'format') return 'Formato';
  if (champion(state)) return 'Encerrado';
  if (!state.knockout) return isGroupComplete(state) ? 'Grupos encerrados' : 'Fase de grupos';
  const n = nextMatch(state);
  return n ? koStageName(state, n.round) : 'Mata-mata';
}

/* ------------------------------------------------------------- validação */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isScore = (v: unknown) => v === null || (isObj(v) && typeof v.a === 'number' && typeof v.b === 'number');
const isMatch = (v: unknown) =>
  isObj(v) &&
  typeof v.id === 'string' &&
  (v.stage === 'group' || v.stage === 'ko') &&
  typeof v.round === 'number' &&
  typeof v.slot === 'number' &&
  (v.a === null || typeof v.a === 'string') &&
  (v.b === null || typeof v.b === 'string') &&
  isScore(v.score) &&
  isScore(v.pens);
const isPlayer = (v: unknown) =>
  isObj(v) &&
  typeof v.id === 'string' &&
  typeof v.name === 'string' &&
  typeof v.teamId === 'string' &&
  typeof v.teamName === 'string' &&
  typeof v.leagueName === 'string' &&
  typeof v.drawKey === 'number';

/** Valida estrutura de um estado salvo/importado. */
export function isValidState(v: unknown): v is TournamentState {
  if (!isObj(v) || v.schemaVersion !== 1) return false;
  if (!['registration', 'format', 'tournament'].includes(v.phase as string)) return false;
  if (typeof v.exclusiveTeams !== 'boolean' || typeof v.skipGroups !== 'boolean') return false;
  if (!(v.qualifiers === null || typeof v.qualifiers === 'number')) return false;
  if (!Array.isArray(v.players) || !v.players.every(isPlayer)) return false;
  if (!Array.isArray(v.groupMatches) || !v.groupMatches.every(isMatch)) return false;
  if (!(v.knockout === null || (Array.isArray(v.knockout) && v.knockout.every((r) => Array.isArray(r) && r.every(isMatch)))))
    return false;
  if (!isObj(v.drafts)) return false;
  const ids = new Set((v.players as Player[]).map((p) => p.id));
  const refsOk = [...(v.groupMatches as Match[]), ...((v.knockout as Match[][] | null)?.flat() ?? [])].every(
    (m) => (m.a === null || ids.has(m.a)) && (m.b === null || ids.has(m.b)),
  );
  return refsOk;
}

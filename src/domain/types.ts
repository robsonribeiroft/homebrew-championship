export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  /** id do catálogo (`<liga>/<time>`) */
  teamId: string;
  /** cópias para fallback se o time sumir de `logos/` (ex.: backup importado) */
  teamName: string;
  leagueName: string;
  /** desempate final por sorteio — sorteado na inscrição e persistido */
  drawKey: number;
}

export interface Score {
  a: number;
  b: number;
}

export type Stage = 'group' | 'ko';

export interface Match {
  id: string;
  stage: Stage;
  /** grupo: rodada (1..n) · mata-mata: índice da fase (0 = primeira fase) */
  round: number;
  /** posição dentro da rodada/fase */
  slot: number;
  a: PlayerId | null;
  b: PlayerId | null;
  score: Score | null;
  pens: Score | null;
}

export interface Draft {
  a: number;
  b: number;
  pens: Score | null;
}

export type Phase = 'registration' | 'format' | 'tournament';

export interface TournamentState {
  schemaVersion: 1;
  phase: Phase;
  exclusiveTeams: boolean;
  players: Player[];
  /** quantos se classificam ao mata-mata (2, 4, 8 ou 16) */
  qualifiers: number | null;
  skipGroups: boolean;
  groupMatches: Match[];
  /** fases do mata-mata; null = ainda não gerado */
  knockout: Match[][] | null;
  /** placares em edição (ainda não finalizados), por id de partida */
  drafts: Record<string, Draft>;
}

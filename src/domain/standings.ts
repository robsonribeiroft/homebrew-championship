import type { Match, Player, PlayerId } from './types';

export interface StandingRow {
  player: Player;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export const POINTS = { win: 3, draw: 1, loss: 0 } as const;

function tally(players: readonly Player[], matches: readonly Match[]): Map<PlayerId, StandingRow> {
  const rows = new Map<PlayerId, StandingRow>();
  for (const p of players) {
    rows.set(p.id, { player: p, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 });
  }
  for (const m of matches) {
    if (!m.score || !m.a || !m.b) continue;
    const ra = rows.get(m.a);
    const rb = rows.get(m.b);
    if (!ra || !rb) continue;
    const { a, b } = m.score;
    ra.played++; rb.played++;
    ra.goalsFor += a; ra.goalsAgainst += b;
    rb.goalsFor += b; rb.goalsAgainst += a;
    if (a > b) { ra.won++; rb.lost++; ra.points += POINTS.win; rb.points += POINTS.loss; }
    else if (a < b) { rb.won++; ra.lost++; rb.points += POINTS.win; ra.points += POINTS.loss; }
    else { ra.drawn++; rb.drawn++; ra.points += POINTS.draw; rb.points += POINTS.draw; }
  }
  for (const r of rows.values()) r.goalDiff = r.goalsFor - r.goalsAgainst;
  return rows;
}

/**
 * Classificação: pontos → saldo → gols marcados → confronto direto (mini-tabela entre os
 * empatados: pontos, depois saldo) → sorteio (drawKey persistido na inscrição).
 */
export function computeStandings(players: readonly Player[], matches: readonly Match[]): StandingRow[] {
  const rows = [...tally(players, matches).values()];
  const primary = (x: StandingRow, y: StandingRow) =>
    y.points - x.points || y.goalDiff - x.goalDiff || y.goalsFor - x.goalsFor;
  rows.sort(primary);

  const out: StandingRow[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length && primary(rows[i], rows[j]) === 0) j++;
    const tied = rows.slice(i, j);
    if (tied.length > 1) {
      const ids = new Set(tied.map((r) => r.player.id));
      const h2h = tally(
        tied.map((r) => r.player),
        matches.filter((m) => m.a && m.b && ids.has(m.a) && ids.has(m.b)),
      );
      tied.sort((x, y) => {
        const hx = h2h.get(x.player.id)!;
        const hy = h2h.get(y.player.id)!;
        return hy.points - hx.points || hy.goalDiff - hx.goalDiff || x.player.drawKey - y.player.drawKey;
      });
    }
    out.push(...tied);
    i = j;
  }
  return out;
}

import { shuffle, type Rng } from './random';
import type { Match, PlayerId } from './types';

/**
 * Turno único pelo método do círculo. A ordem dos jogadores e a ordem dos jogos dentro de
 * cada rodada são embaralhadas uma vez. Evita, quando possível, que alguém jogue o último
 * jogo de uma rodada e o primeiro da seguinte.
 */
export function generateRoundRobin(ids: readonly PlayerId[], rng: Rng = Math.random): Match[] {
  if (ids.length < 2) return [];
  const ring: (PlayerId | null)[] = shuffle(ids, rng);
  if (ring.length % 2 === 1) ring.push(null); // folga
  const n = ring.length;

  const rounds: [PlayerId, PlayerId][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [PlayerId, PlayerId][] = [];
    for (let i = 0; i < n / 2; i++) {
      const x = ring[i];
      const y = ring[n - 1 - i];
      if (x && y) pairs.push(r % 2 === 0 ? [x, y] : [y, x]);
    }
    rounds.push(pairs);
    // gira todos menos o primeiro
    ring.splice(1, 0, ring.pop()!);
  }

  const matches: Match[] = [];
  let prev: [PlayerId, PlayerId] | null = null;
  rounds.forEach((pairs, ri) => {
    const ordered = shuffle(pairs, rng);
    if (prev) {
      const last: [PlayerId, PlayerId] = prev;
      const clash = (p: [PlayerId, PlayerId]) => p.includes(last[0]) || p.includes(last[1]);
      if (clash(ordered[0])) {
        const idx = ordered.findIndex((p) => !clash(p));
        if (idx > 0) [ordered[0], ordered[idx]] = [ordered[idx], ordered[0]];
      }
    }
    ordered.forEach(([a, b], slot) => {
      matches.push({ id: `g${ri + 1}-${slot + 1}`, stage: 'group', round: ri + 1, slot, a, b, score: null, pens: null });
    });
    prev = ordered[ordered.length - 1] ?? prev;
  });
  return matches;
}

export const groupMatchCount = (players: number) => (players * (players - 1)) / 2;

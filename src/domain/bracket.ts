import type { Match, PlayerId, Score } from './types';

/** Ordem das posições na chave para que 1º e 2º só se cruzem na final. */
export const SEED_ORDER: Record<number, number[]> = {
  2: [1, 2],
  4: [1, 4, 2, 3],
  8: [1, 8, 4, 5, 2, 7, 3, 6],
  16: [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11],
};

export const BRACKET_SIZES = [2, 4, 8, 16] as const;

/** Nome da fase a partir de quantos jogadores ainda estão nela. */
export function stageName(playersInRound: number): string {
  switch (playersInRound) {
    case 2: return 'Final';
    case 4: return 'Semifinal';
    case 8: return 'Quartas de final';
    case 16: return 'Oitavas de final';
    default: return `Fase de ${playersInRound}`;
  }
}

export const qualifierOptions = (players: number): number[] => BRACKET_SIZES.filter((q) => q <= players);

/** Opção pré-selecionada: a maior que NÃO classifica todos (ou a única que existir). */
export function defaultQualifiers(players: number): number {
  const opts = qualifierOptions(players);
  const notAll = opts.filter((q) => q < players);
  return notAll.length ? notAll[notAll.length - 1] : opts[opts.length - 1];
}

/** `seeded[0]` = 1º colocado (ou 1º do sorteio). */
export function buildBracket(seeded: readonly PlayerId[]): Match[][] {
  const size = seeded.length;
  const order = SEED_ORDER[size];
  if (!order) throw new Error(`Tamanho de chave inválido: ${size}`);
  const rounds: Match[][] = [];
  let count = size / 2;
  let r = 0;
  while (count >= 1) {
    const round: Match[] = [];
    for (let slot = 0; slot < count; slot++) {
      const a = r === 0 ? seeded[order[slot * 2] - 1] : null;
      const b = r === 0 ? seeded[order[slot * 2 + 1] - 1] : null;
      round.push({ id: `k${r}-${slot}`, stage: 'ko', round: r, slot, a, b, score: null, pens: null });
    }
    rounds.push(round);
    count /= 2;
    r++;
  }
  return rounds;
}

export function matchWinner(m: Match): PlayerId | null {
  if (!m.score || !m.a || !m.b) return null;
  if (m.score.a > m.score.b) return m.a;
  if (m.score.b > m.score.a) return m.b;
  if (m.pens && m.pens.a !== m.pens.b) return m.pens.a > m.pens.b ? m.a : m.b;
  return null;
}

function nextOf(ko: Match[][], round: number, slot: number): { match: Match; side: 'a' | 'b' } | null {
  const next = ko[round + 1]?.[Math.floor(slot / 2)];
  return next ? { match: next, side: slot % 2 === 0 ? 'a' : 'b' } : null;
}

/** Trava em cascata: só edita se o jogo seguinte do vencedor ainda não foi finalizado. */
export function canEditKo(ko: Match[][], round: number, slot: number): boolean {
  const n = nextOf(ko, round, slot);
  return !n || n.match.score === null;
}

/** Retorna nova chave com o resultado aplicado e o vencedor propagado. */
export function setKoResult(ko: Match[][], round: number, slot: number, score: Score | null, pens: Score | null): Match[][] {
  const out = ko.map((r) => r.map((m) => ({ ...m })));
  const m = out[round][slot];
  m.score = score;
  m.pens = score && score.a === score.b ? pens : null;
  const n = nextOf(out, round, slot);
  if (n) {
    const target = out[n.match.round][n.match.slot];
    target[n.side] = matchWinner(m);
  }
  return out;
}

export const sizeOfBracket = (ko: Match[][]) => (ko[0]?.length ?? 0) * 2;

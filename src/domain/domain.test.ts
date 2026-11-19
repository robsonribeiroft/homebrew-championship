import { describe, expect, it } from 'vitest';
import { buildBracket, canEditKo, defaultQualifiers, matchWinner, qualifierOptions, setKoResult } from './bracket';
import { seededRng } from './random';
import { generateRoundRobin, groupMatchCount } from './roundRobin';
import { computeStandings } from './standings';
import { champion, initialState, isValidState, nextMatch, reducer, validateNewPlayer } from './tournament';
import type { Match, Player, TournamentState } from './types';

const mkPlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `P${i + 1}`,
    teamId: `liga/t${i + 1}`,
    teamName: `T${i + 1}`,
    leagueName: 'Liga',
    drawKey: i / 100,
  }));

const g = (a: string, b: string, sa: number, sb: number, id = `${a}-${b}`): Match => ({
  id, stage: 'group', round: 1, slot: 0, a, b, score: { a: sa, b: sb }, pens: null,
});

describe('round robin', () => {
  for (const n of [2, 3, 4, 5, 8, 11, 20]) {
    it(`gera todos os confrontos uma única vez para ${n} jogadores`, () => {
      const ids = mkPlayers(n).map((p) => p.id);
      const ms = generateRoundRobin(ids, seededRng(n));
      expect(ms).toHaveLength(groupMatchCount(n));
      const keys = new Set(ms.map((m) => [m.a, m.b].sort().join('|')));
      expect(keys.size).toBe(ms.length);
      expect(new Set(ms.map((m) => m.id)).size).toBe(ms.length);
    });
  }

  it('não repete jogador dentro da mesma rodada', () => {
    const ms = generateRoundRobin(mkPlayers(8).map((p) => p.id), seededRng(1));
    const byRound = new Map<number, string[]>();
    for (const m of ms) byRound.set(m.round, [...(byRound.get(m.round) ?? []), m.a!, m.b!]);
    for (const ps of byRound.values()) expect(new Set(ps).size).toBe(ps.length);
  });

  it('evita jogos seguidos do mesmo jogador entre rodadas (n par ≥ 6)', () => {
    const ms = generateRoundRobin(mkPlayers(6).map((p) => p.id), seededRng(7));
    for (let i = 1; i < ms.length; i++) {
      const shared = [ms[i].a, ms[i].b].some((x) => x === ms[i - 1].a || x === ms[i - 1].b);
      expect(shared).toBe(false);
    }
  });
});

describe('classificação', () => {
  const ps = mkPlayers(4);

  it('ordena por pontos, saldo e gols marcados', () => {
    const rows = computeStandings(ps, [g('p1', 'p2', 1, 0), g('p3', 'p4', 3, 0), g('p2', 'p4', 2, 2)]);
    expect(rows.map((r) => r.player.id)).toEqual(['p3', 'p1', 'p2', 'p4']);
    expect(rows[0]).toMatchObject({ points: 3, goalDiff: 3, goalsFor: 3, won: 1 });
    expect(rows[2]).toMatchObject({ points: 1, drawn: 1, played: 2 });
  });

  it('usa confronto direto quando pontos/saldo/gols empatam', () => {
    // p1 e p2: 3 pts, saldo 0, 2 gols cada; p2 venceu p1
    const ms = [g('p1', 'p2', 1, 2), g('p1', 'p3', 1, 0), g('p2', 'p4', 0, 1)];
    const rows = computeStandings(ps, ms);
    const order = rows.map((r) => r.player.id);
    expect(order.indexOf('p2')).toBeLessThan(order.indexOf('p1'));
  });

  it('cai no sorteio persistido quando tudo empata', () => {
    const rows = computeStandings(
      [{ ...ps[0], drawKey: 0.9 }, { ...ps[1], drawKey: 0.1 }],
      [g('p1', 'p2', 1, 1)],
    );
    expect(rows.map((r) => r.player.id)).toEqual(['p2', 'p1']);
  });
});

describe('mata-mata', () => {
  it('opções e pré-seleção seguem o número de inscritos', () => {
    expect(qualifierOptions(2)).toEqual([2]);
    expect(qualifierOptions(7)).toEqual([2, 4]);
    expect(qualifierOptions(20)).toEqual([2, 4, 8, 16]);
    expect(defaultQualifiers(2)).toBe(2);
    expect(defaultQualifiers(4)).toBe(2);
    expect(defaultQualifiers(8)).toBe(4);
    expect(defaultQualifiers(9)).toBe(8);
  });

  it('chave fixa por posição', () => {
    const seeds = mkPlayers(8).map((p) => p.id);
    const ko = buildBracket(seeds);
    expect(ko.map((r) => r.length)).toEqual([4, 2, 1]);
    expect(ko[0].map((m) => [m.a, m.b])).toEqual([['p1', 'p8'], ['p4', 'p5'], ['p2', 'p7'], ['p3', 'p6']]);
    expect(buildBracket(seeds.slice(0, 4))[0].map((m) => [m.a, m.b])).toEqual([['p1', 'p4'], ['p2', 'p3']]);
  });

  it('propaga vencedor, decide nos pênaltis e trava em cascata', () => {
    let ko = buildBracket(['p1', 'p2', 'p3', 'p4']);
    ko = setKoResult(ko, 0, 0, { a: 2, b: 0 }, null);
    ko = setKoResult(ko, 0, 1, { a: 1, b: 1 }, { a: 3, b: 4 });
    expect(ko[1][0]).toMatchObject({ a: 'p1', b: 'p3' });
    expect(matchWinner(ko[0][1])).toBe('p3');
    expect(canEditKo(ko, 0, 0)).toBe(true);
    ko = setKoResult(ko, 1, 0, { a: 0, b: 1 }, null);
    expect(canEditKo(ko, 0, 0)).toBe(false);
    expect(canEditKo(ko, 1, 0)).toBe(true);
  });
});

describe('fluxo completo pelo reducer', () => {
  const run = (s: TournamentState, ...actions: Parameters<typeof reducer>[1][]) => actions.reduce(reducer, s);

  it('4 jogadores → grupos → semifinal → campeão', () => {
    const ps = mkPlayers(4);
    let s = run(initialState(), ...ps.map((player) => ({ type: 'addPlayer' as const, player })), { type: 'goToFormat' });
    expect(s.phase).toBe('format');
    s = reducer(s, {
      type: 'start', qualifiers: 4, skipGroups: false, seeds: null,
      groupMatches: generateRoundRobin(ps.map((p) => p.id), seededRng(3)),
    });
    expect(s.groupMatches).toHaveLength(6);
    while (nextMatch(s)?.stage === 'group') {
      const m = nextMatch(s)!;
      // jogador de número menor sempre vence
      const aWins = Number(m.a!.slice(1)) < Number(m.b!.slice(1));
      s = reducer(s, { type: 'finishMatch', matchId: m.id, score: aWins ? { a: 1, b: 0 } : { a: 0, b: 1 }, pens: null });
    }
    expect(nextMatch(s)).toBeNull();
    s = reducer(s, { type: 'generateKnockout' });
    expect(s.knockout![0].map((m) => [m.a, m.b])).toEqual([['p1', 'p4'], ['p2', 'p3']]);
    // grupos travados
    const locked = reducer(s, { type: 'clearResult', matchId: s.groupMatches[0].id });
    expect(locked).toBe(s);
    // empate sem pênaltis é recusado
    const semi = nextMatch(s)!;
    expect(reducer(s, { type: 'finishMatch', matchId: semi.id, score: { a: 1, b: 1 }, pens: null })).toBe(s);
    s = reducer(s, { type: 'finishMatch', matchId: semi.id, score: { a: 1, b: 1 }, pens: { a: 5, b: 4 } });
    s = reducer(s, { type: 'finishMatch', matchId: nextMatch(s)!.id, score: { a: 0, b: 2 }, pens: null });
    s = reducer(s, { type: 'finishMatch', matchId: nextMatch(s)!.id, score: { a: 3, b: 1 }, pens: null });
    expect(champion(s)?.player.id).toBe('p1');
    expect(isValidState(JSON.parse(JSON.stringify(s)))).toBe(true);
  });

  it('pular fase de grupos só quando todos se classificam', () => {
    const ps = mkPlayers(2);
    let s = run(initialState(), ...ps.map((player) => ({ type: 'addPlayer' as const, player })), { type: 'goToFormat' });
    s = reducer(s, { type: 'start', qualifiers: 2, skipGroups: true, seeds: ['p2', 'p1'], groupMatches: [] });
    expect(s.skipGroups).toBe(true);
    expect(nextMatch(s)).toMatchObject({ stage: 'ko', a: 'p2', b: 'p1' });
  });

  it('valida inscrição: nome único, time exclusivo e limite', () => {
    const s = run(initialState(), { type: 'addPlayer', player: mkPlayers(1)[0] });
    expect(validateNewPlayer(s, ' p1 ', 'liga/x')).toMatch(/Já existe/);
    expect(validateNewPlayer(s, 'Outro', 'liga/t1')).toMatch(/já foi escolhido/);
    expect(validateNewPlayer({ ...s, exclusiveTeams: false }, 'Outro', 'liga/t1')).toBeNull();
    expect(validateNewPlayer(s, 'Outro', null)).toMatch(/Selecione/);
    // não deixa ligar exclusividade com times repetidos
    const dup = { ...s, exclusiveTeams: false, players: [...s.players, { ...mkPlayers(2)[1], teamId: 'liga/t1' }] };
    expect(reducer(dup, { type: 'setExclusive', value: true }).exclusiveTeams).toBe(false);
  });

  it('novo campeonato com os mesmos jogadores', () => {
    const ps = mkPlayers(3);
    let s = run(initialState(), ...ps.map((player) => ({ type: 'addPlayer' as const, player })), { type: 'goToFormat' });
    s = reducer(s, { type: 'start', qualifiers: 2, skipGroups: false, seeds: null, groupMatches: generateRoundRobin(['p1', 'p2', 'p3']) });
    s = reducer(s, { type: 'resetKeepPlayers' });
    expect(s.phase).toBe('registration');
    expect(s.players).toHaveLength(3);
    expect(s.groupMatches).toHaveLength(0);
  });
});

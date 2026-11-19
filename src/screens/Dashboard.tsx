import { useState, type ReactNode } from 'react';
import { Carousel, type Slide } from '../components/Carousel';
import { Crest, teamDisplayName } from '../components/Crest';
import { matchWinner } from '../domain/bracket';
import { computeStandings } from '../domain/standings';
import { champion, findMatch, isGroupComplete, koStageName, nextMatch, playerById } from '../domain/tournament';
import type { Match, TournamentState } from '../domain/types';
import { useTournament } from '../store/TournamentContext';
import { ChampionCard, GroupDoneCard, MatchCard } from './MatchCard';

export function Dashboard() {
  const { state } = useTournament();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const next = nextMatch(state);
  const champ = champion(state);
  const sel = selectedId ? findMatch(state, selectedId) : null;
  const selected = sel && sel.a && sel.b && sel.id !== next?.id ? sel : null;

  const select = (m: Match) => {
    if (!m.a || !m.b) return;
    setSelectedId(m.id === next?.id ? null : m.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => setSelectedId(null);

  let top: ReactNode = null;
  if (selected) top = <MatchCard key={selected.id} match={selected} selected onBack={back} />;
  else if (next) top = <MatchCard key={next.id} match={next} selected={false} onBack={back} />;
  else if (champ) top = <ChampionCard player={champ.player} final={champ.final} />;
  else if (!state.knockout && isGroupComplete(state)) top = <GroupDoneCard />;

  const activeId = selected?.id ?? next?.id ?? null;

  const slides: Slide[] = [];
  if (!state.skipGroups && state.groupMatches.length > 0) {
    slides.push({ key: 'standings', label: 'Classificação', content: <Standings state={state} /> });
    slides.push({ key: 'games', label: 'Jogos', content: <GroupGames state={state} activeId={activeId} onSelect={select} /> });
  }
  if (state.knockout) {
    slides.push({ key: 'bracket', label: 'Chave', content: <Bracket state={state} activeId={activeId} onSelect={select} /> });
  }

  return (
    <main className="dashboard">
      {top}
      {slides.length > 0 && <Carousel id="dashboard" slides={slides} indicator="labels" keyboard className="dashboard__carousel" />}
    </main>
  );
}

/* --------------------------------------------------------------- classificação */

function Standings({ state }: { state: TournamentState }) {
  const rows = computeStandings(state.players, state.groupMatches);
  const q = state.qualifiers ?? 0;
  return (
    <div className="table-wrap">
      <table className="standings">
        <thead>
          <tr>
            <th className="num">#</th>
            <th className="left">Jogador</th>
            <th title="Jogos">J</th>
            <th title="Vitórias">V</th>
            <th title="Empates" className="opt">E</th>
            <th title="Derrotas" className="opt">D</th>
            <th title="Gols pró" className="opt">GP</th>
            <th title="Gols contra" className="opt">GC</th>
            <th title="Saldo de gols">SG</th>
            <th title="Pontos" className="pts">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.player.id} className={i < q ? 'is-qualified' : ''}>
              <td className="num pos">{i + 1}</td>
              <td className="left">
                <div className="standings__player">
                  <Crest teamId={r.player.teamId} teamName={r.player.teamName} size={36} />
                  <div>
                    <div className="standings__name">{r.player.name}</div>
                    <div className="standings__team">{teamDisplayName(r.player.teamId, r.player.teamName)}</div>
                  </div>
                </div>
              </td>
              <td>{r.played}</td>
              <td>{r.won}</td>
              <td className="opt">{r.drawn}</td>
              <td className="opt">{r.lost}</td>
              <td className="opt">{r.goalsFor}</td>
              <td className="opt">{r.goalsAgainst}</td>
              <td>{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
              <td className="pts">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="legend">
        <span className="legend__swatch" /> Zona de classificação · {q} vagas · Desempate: saldo, gols pró, confronto direto, sorteio
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------- jogos */

function GroupGames({ state, activeId, onSelect }: { state: TournamentState; activeId: string | null; onSelect: (m: Match) => void }) {
  const rounds = new Map<number, Match[]>();
  for (const m of state.groupMatches) rounds.set(m.round, [...(rounds.get(m.round) ?? []), m]);
  const done = state.groupMatches.filter((m) => m.score).length;
  return (
    <div className="games">
      <p className="games__progress">
        <span className="mono">
          {done}/{state.groupMatches.length}
        </span>{' '}
        jogos realizados
        <span className="progress" aria-hidden>
          <span style={{ width: `${(done / state.groupMatches.length) * 100}%` }} />
        </span>
      </p>
      {[...rounds.entries()].map(([round, ms]) => (
        <div key={round} className="games__round">
          <h3 className="games__round-title">Rodada {round}</h3>
          {ms.map((m) => (
            <GameRow key={m.id} state={state} match={m} active={m.id === activeId} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </div>
  );
}

function GameRow({ state, match, active, onSelect }: { state: TournamentState; match: Match; active: boolean; onSelect: (m: Match) => void }) {
  const a = playerById(state, match.a);
  const b = playerById(state, match.b);
  const w = matchWinner(match);
  const idx = state.groupMatches.indexOf(match);
  return (
    <button className={`game-row ${active ? 'is-active' : ''} ${match.score ? 'is-played' : ''}`} onClick={() => onSelect(match)}>
      <span className="game-row__num">{String(idx + 1).padStart(2, '0')}</span>
      <span className={`game-row__side ${w && w === a?.id ? 'is-winner' : ''}`}>
        <span className="game-row__name">{a?.name}</span>
        {a && <Crest teamId={a.teamId} teamName={a.teamName} size={32} />}
      </span>
      <span className="game-row__score">{match.score ? `${match.score.a} × ${match.score.b}` : '— × —'}</span>
      <span className={`game-row__side game-row__side--b ${w && w === b?.id ? 'is-winner' : ''}`}>
        {b && <Crest teamId={b.teamId} teamName={b.teamName} size={32} />}
        <span className="game-row__name">{b?.name}</span>
      </span>
      <span className="game-row__status">{active ? 'Em foco' : match.score ? 'Jogado' : ''}</span>
    </button>
  );
}

/* ---------------------------------------------------------------------- chave */

function Bracket({ state, activeId, onSelect }: { state: TournamentState; activeId: string | null; onSelect: (m: Match) => void }) {
  const ko = state.knockout!;
  return (
    <div className="bracket" style={{ ['--rounds' as string]: ko.length }}>
      {ko.map((round, r) => (
        <div key={r} className="bracket__round">
          <h3 className="bracket__title">{koStageName(state, r)}</h3>
          <div className="bracket__matches">
            {round.map((m) => {
              const w = matchWinner(m);
              const playable = !!m.a && !!m.b;
              return (
                <button
                  key={m.id}
                  className={`bracket__match ${m.id === activeId ? 'is-active' : ''} ${m.score ? 'is-played' : ''}`}
                  disabled={!playable}
                  onClick={() => onSelect(m)}
                >
                  {(['a', 'b'] as const).map((side) => {
                    const p = playerById(state, m[side]);
                    const goals = m.score?.[side];
                    const pens = m.pens?.[side];
                    return (
                      <span key={side} className={`bracket__slot ${w && w === p?.id ? 'is-winner' : ''} ${w && p && w !== p.id ? 'is-loser' : ''}`}>
                        {p ? <Crest teamId={p.teamId} teamName={p.teamName} size={28} /> : <span className="bracket__empty" />}
                        <span className="bracket__name">{p?.name ?? 'A definir'}</span>
                        <span className="bracket__goals">
                          {goals ?? ''}
                          {pens != null && <small> ({pens})</small>}
                        </span>
                      </span>
                    );
                  })}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

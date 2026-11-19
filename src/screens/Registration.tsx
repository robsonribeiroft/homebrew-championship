import { useMemo, useRef, useState } from 'react';
import { Carousel, type Slide } from '../components/Carousel';
import { Crest, teamDisplayName } from '../components/Crest';
import { CloseIcon } from '../components/Icons';
import { Toggle } from '../components/Toggle';
import { findTeam, LEAGUES, type League } from '../data/catalog';
import { makeId } from '../domain/random';
import { hasDuplicateTeams, MAX_NAME_LENGTH, MAX_PLAYERS, MIN_PLAYERS, validateNewPlayer } from '../domain/tournament';
import type { Player } from '../domain/types';
import { useTournament } from '../store/TournamentContext';

export function Registration() {
  const { state, dispatch } = useTournament();
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const takenBy = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of state.players) m.set(p.teamId, [...(m.get(p.teamId) ?? []), p.name]);
    return m;
  }, [state.players]);

  const error = validateNewPlayer(state, name, teamId);
  const full = state.players.length >= MAX_PLAYERS;
  const selectedTeam = teamId ? findTeam(teamId) : undefined;
  const duplicates = hasDuplicateTeams(state.players);

  const submit = () => {
    setTouched(true);
    if (error || !selectedTeam) return;
    const league = LEAGUES.find((l) => l.id === selectedTeam.leagueId);
    const player: Player = {
      id: makeId('p'),
      name: name.trim(),
      teamId: selectedTeam.id,
      teamName: selectedTeam.name,
      leagueName: league?.name ?? '',
      drawKey: Math.random(),
    };
    dispatch({ type: 'addPlayer', player });
    setName('');
    setTeamId(null);
    setTouched(false);
    nameRef.current?.focus();
  };

  const slides: Slide[] = LEAGUES.map((league) => ({
    key: league.id,
    label: league.name,
    content: (
      <LeagueGrid
        league={league}
        selected={teamId}
        takenBy={takenBy}
        exclusive={state.exclusiveTeams}
        disabled={full}
        onSelect={(id) => setTeamId((cur) => (cur === id ? null : id))}
      />
    ),
  }));

  // só mostra erro de nome/time depois de interagir, exceto conflitos imediatos
  const nameError = name.trim() && error && /nome|caracteres/.test(error) ? error : null;
  const shownError = nameError ?? (touched ? error : null);

  return (
    <main className="registration">
      <section
        className="panel registration__form"
        onKeyDown={(e) => {
          // Enter confirma de qualquer ponto do formulário (inclusive com o foco num time,
          // onde o Enter nativo do botão desmarcaria a seleção)
          if (e.key === 'Enter' && !e.nativeEvent.isComposing && !(e.target as HTMLElement).closest('.toggle')) {
            e.preventDefault();
            submit();
          }
        }}
      >
        <div className="panel__head">
          <h1 className="panel__title">
            <span className="panel__num">01</span> Inscrição
          </h1>
          <Toggle
            label="Time exclusivo"
            checked={state.exclusiveTeams}
            disabled={!state.exclusiveTeams && duplicates}
            hint={!state.exclusiveTeams && duplicates ? 'Há times repetidos' : state.exclusiveTeams ? 'Cada time, um jogador' : 'Times podem se repetir'}
            onChange={(v) => dispatch({ type: 'setExclusive', value: v })}
          />
        </div>

        <label className="field">
          <span className="field__label">
            Nome do jogador
            <span className="field__count">
              {name.trim().length}/{MAX_NAME_LENGTH}
            </span>
          </span>
          <input
            ref={nameRef}
            className="field__input"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            placeholder={full ? 'Limite de jogadores atingido' : 'Digite o nome…'}
            disabled={full}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="field">
          <span className="field__label">Time</span>
          {LEAGUES.length === 0 ? (
            <p className="empty">Nenhuma liga encontrada em <code>logos/</code>.</p>
          ) : (
            <Carousel id="leagues" slides={slides} indicator="dots" keyboard />
          )}
        </div>

        <div className="confirm-bar">
          <div className="confirm-bar__summary">
            {selectedTeam ? (
              <>
                <Crest teamId={selectedTeam.id} size={44} />
                <div>
                  <div className="confirm-bar__player">{name.trim() || '—'}</div>
                  <div className="confirm-bar__team">{selectedTeam.name}</div>
                </div>
              </>
            ) : (
              <span className="muted">Nenhum time selecionado</span>
            )}
            {shownError && <span className="error">{shownError}</span>}
          </div>
          <button className="btn btn--primary btn--lg" disabled={!!error} onClick={submit}>
            Confirmar
          </button>
        </div>
      </section>

      <div className="registration__side">
      <aside className="panel registration__list">
        <div className="panel__head">
          <h2 className="panel__title">
            <span className="panel__num">02</span> Inscritos
          </h2>
          <span className="counter">
            {String(state.players.length).padStart(2, '0')}/{MAX_PLAYERS}
          </span>
        </div>

        {state.players.length === 0 ? (
          <p className="empty">Ninguém inscrito ainda. Mínimo de {MIN_PLAYERS} jogadores.</p>
        ) : (
          <ol className="roster">
            {state.players.map((p, i) => (
              <li key={p.id} className="roster__item">
                <span className="roster__pos">{String(i + 1).padStart(2, '0')}</span>
                <Crest teamId={p.teamId} teamName={p.teamName} size={44} />
                <div className="roster__names">
                  <span className="roster__player">{p.name}</span>
                  <span className="roster__team">{teamDisplayName(p.teamId, p.teamName)}</span>
                </div>
                <button
                  className="btn btn--icon btn--ghost roster__remove"
                  aria-label={`Remover ${p.name}`}
                  onClick={() => dispatch({ type: 'removePlayer', id: p.id })}
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ol>
        )}

        <div className="registration__start">
          <button
            className="btn btn--primary btn--lg btn--block"
            disabled={state.players.length < MIN_PLAYERS}
            onClick={() => dispatch({ type: 'goToFormat' })}
          >
            Iniciar campeonato →
          </button>
          {state.players.length < MIN_PLAYERS && (
            <span className="muted small">Faltam {MIN_PLAYERS - state.players.length} para começar</span>
          )}
        </div>
      </aside>
      </div>
    </main>
  );
}

interface GridProps {
  league: League;
  selected: string | null;
  takenBy: Map<string, string[]>;
  exclusive: boolean;
  disabled: boolean;
  onSelect: (teamId: string) => void;
}

function LeagueGrid({ league, selected, takenBy, exclusive, disabled, onSelect }: GridProps) {
  return (
    <div className="league">
      <div className="league__head">
        {league.logo ? <img className="league__logo" src={league.logo} alt="" /> : null}
        <div>
          <div className="league__name">{league.name}</div>
          <div className="league__meta">
            {league.season ? `Temporada ${league.season} · ` : ''}
            {league.teams.length} times
          </div>
        </div>
      </div>
      <div className="team-grid">
        {league.teams.map((t) => {
          const owners = takenBy.get(t.id);
          const blocked = disabled || (exclusive && !!owners);
          const isSel = selected === t.id;
          return (
            <button
              key={t.id}
              className={`team-tile ${isSel ? 'is-selected' : ''} ${owners ? 'is-taken' : ''}`}
              disabled={blocked}
              aria-pressed={isSel}
              onClick={() => onSelect(t.id)}
              title={owners ? `${t.name} — ${owners.join(', ')}` : t.name}
            >
              <Crest teamId={t.id} size={64} />
              <span className="team-tile__name">{t.name}</span>
              {owners && <span className="team-tile__owner">↳ {owners.join(', ')}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

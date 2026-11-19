import { useState } from 'react';
import { Crest } from '../components/Crest';
import { Toggle } from '../components/Toggle';
import { buildBracket, defaultQualifiers, qualifierOptions, stageName } from '../domain/bracket';
import { shuffle } from '../domain/random';
import { generateRoundRobin, groupMatchCount } from '../domain/roundRobin';
import { playerById } from '../domain/tournament';
import { useTournament } from '../store/TournamentContext';

export function FormatScreen() {
  const { state, dispatch } = useTournament();
  const n = state.players.length;
  const options = qualifierOptions(n);
  const [qualifiers, setQualifiers] = useState(() => defaultQualifiers(n));
  const [skip, setSkip] = useState(false);
  const [seeds, setSeeds] = useState(() => shuffle(state.players.map((p) => p.id)));

  const allQualify = qualifiers === n;
  const skipping = allQualify && skip;
  const preview = skipping ? buildBracket(seeds)[0] : [];

  const start = () => {
    dispatch({
      type: 'start',
      qualifiers,
      skipGroups: skipping,
      seeds: skipping ? seeds : null,
      groupMatches: skipping ? [] : generateRoundRobin(state.players.map((p) => p.id)),
    });
  };

  return (
    <main className="format">
      <section className="panel">
        <div className="panel__head">
          <h1 className="panel__title">
            <span className="panel__num">03</span> Formato do mata-mata
          </h1>
          <span className="counter">{n} jogadores</span>
        </div>
        <p className="muted">Escolha em qual fase o mata-mata começa. Os melhores da fase de grupos se classificam.</p>

        <div className="format__options" role="radiogroup">
          {options.map((q) => {
            const isAll = q === n;
            const sel = q === qualifiers;
            return (
              <button
                key={q}
                role="radio"
                aria-checked={sel}
                className={`format-card ${sel ? 'is-selected' : ''}`}
                onClick={() => {
                  setQualifiers(q);
                  if (q !== n) setSkip(false);
                }}
              >
                <span className="format-card__stage">{stageName(q)}</span>
                <span className="format-card__stat">
                  <b>{q}</b> classificados{isAll ? ' (todos)' : ''}
                </span>
                <span className="format-card__stat">
                  <b>{groupMatchCount(n)}</b> jogos na fase de grupos
                </span>
                <span className="format-card__stat">
                  <b>{q - 1}</b> {q - 1 === 1 ? 'jogo' : 'jogos'} no mata-mata
                </span>
              </button>
            );
          })}
        </div>

        {allQualify && (
          <div className="format__skip">
            <Toggle
              label="Pular fase de grupos"
              checked={skip}
              onChange={setSkip}
              hint={skip ? 'Chave definida por sorteio' : 'Grupos definem as posições na chave'}
            />
          </div>
        )}

        {skipping && (
          <div className="draw">
            <div className="draw__head">
              <span className="field__label">Sorteio da chave · {stageName(qualifiers)}</span>
              <button className="btn btn--ghost" onClick={() => setSeeds(shuffle(seeds))}>
                Sortear de novo
              </button>
            </div>
            <div className="draw__list">
              {preview.map((m) => {
                const side = (id: string | null, b = false) => {
                  const p = playerById(state, id);
                  return (
                    <div className={`draw__side ${b ? 'draw__side--b' : ''}`}>
                      {p && <Crest teamId={p.teamId} teamName={p.teamName} size={36} />}
                      <span>{p?.name}</span>
                    </div>
                  );
                };
                return (
                  <div key={m.id} className="draw__match">
                    {side(m.a)}
                    <span className="draw__vs">×</span>
                    {side(m.b, true)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="format__actions">
          <button className="btn btn--ghost btn--lg" onClick={() => dispatch({ type: 'backToRegistration' })}>
            ← Voltar à inscrição
          </button>
          <button className="btn btn--primary btn--lg" onClick={start}>
            Começar →
          </button>
        </div>
      </section>
    </main>
  );
}

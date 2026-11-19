import { useConfirm } from '../components/Confirm';
import { Crest, teamDisplayName } from '../components/Crest';
import { ChevronDown, ChevronUp } from '../components/Icons';
import { matchWinner, stageName } from '../domain/bracket';
import { computeStandings } from '../domain/standings';
import { isMatchLocked, koStageName, MAX_GOALS, playerById } from '../domain/tournament';
import type { Draft, Match, Player, Score } from '../domain/types';
import { useTournament } from '../store/TournamentContext';

interface Props {
  match: Match;
  /** carregado a partir da lista (não é o próximo jogo) */
  selected: boolean;
  onBack: () => void;
}

export function MatchCard({ match, selected, onBack }: Props) {
  const { state, dispatch } = useTournament();
  const confirm = useConfirm();
  const a = playerById(state, match.a);
  const b = playerById(state, match.b);
  const isKo = match.stage === 'ko';
  const played = match.score !== null;
  const locked = isMatchLocked(state, match);

  const saved: Draft = match.score ? { a: match.score.a, b: match.score.b, pens: match.pens } : { a: 0, b: 0, pens: null };
  const draft: Draft = (!locked && state.drafts[match.id]) || saved;
  const tie = draft.a === draft.b;
  const showPens = isKo && tie && draft.pens !== null;

  const setDraft = (d: Draft) => {
    // fora do empate os pênaltis deixam de existir
    const next: Draft = d.a === d.b ? d : { ...d, pens: null };
    dispatch({ type: 'setDraft', matchId: match.id, draft: next });
  };

  const meta = (() => {
    if (!isKo) {
      const idx = state.groupMatches.findIndex((m) => m.id === match.id);
      return `Rodada ${match.round} · Jogo ${idx + 1}/${state.groupMatches.length}`;
    }
    const roundLen = state.knockout?.[match.round]?.length ?? 1;
    return roundLen > 1 ? `${koStageName(state, match.round)} · Jogo ${match.slot + 1}/${roundLen}` : koStageName(state, match.round);
  })();

  const finish = () => {
    if (locked) return;
    if (isKo && tie) {
      if (!draft.pens) {
        setDraft({ ...draft, pens: { a: 0, b: 0 } });
        return;
      }
      if (draft.pens.a === draft.pens.b) return;
    }
    dispatch({
      type: 'finishMatch',
      matchId: match.id,
      score: { a: draft.a, b: draft.b },
      pens: isKo && tie ? draft.pens : null,
    });
    onBack();
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'Apagar resultado?',
      message: `${a?.name} × ${b?.name} volta a ficar sem placar.`,
      confirmLabel: 'Apagar',
      danger: true,
    });
    if (ok) {
      dispatch({ type: 'clearResult', matchId: match.id });
      onBack();
    }
  };

  const finishLabel = showPens ? 'Finalizar nos pênaltis' : played ? 'Atualizar partida' : 'Finalizar partida';
  const finishDisabled = locked || (showPens && draft.pens!.a === draft.pens!.b);
  const winner = played ? matchWinner(match) : null;

  return (
    <section className={`match-card ${selected ? 'is-selected' : ''}`} aria-label="Partida">
      <div className="match-card__head">
        <span className="match-card__label">{selected ? 'Jogo selecionado' : 'Próximo jogo'}</span>
        <span className="match-card__meta">{meta}</span>
        {selected && (
          <button className="link" onClick={onBack}>
            ← voltar ao próximo jogo
          </button>
        )}
      </div>

      <div className="match-card__body">
        <Side player={a} align="left" winner={!!winner && winner === a?.id} />
        <Stepper className="match-card__sa" value={draft.a} disabled={locked} label={a?.name ?? 'A'} onChange={(v) => setDraft({ ...draft, a: v })} />
        <span className="match-card__x">×</span>
        <Stepper className="match-card__sb" value={draft.b} disabled={locked} label={b?.name ?? 'B'} onChange={(v) => setDraft({ ...draft, b: v })} />
        <Side player={b} align="right" winner={!!winner && winner === b?.id} />
      </div>

      {showPens && draft.pens && (
        <div className="pens">
          <span className="pens__label">Pênaltis</span>
          <div className="pens__row">
            <Stepper small value={draft.pens.a} disabled={locked} label={`pênaltis ${a?.name}`} onChange={(v) => setDraft({ ...draft, pens: { ...draft.pens!, a: v } })} />
            <span className="match-card__x match-card__x--small">×</span>
            <Stepper small value={draft.pens.b} disabled={locked} label={`pênaltis ${b?.name}`} onChange={(v) => setDraft({ ...draft, pens: { ...draft.pens!, b: v } })} />
          </div>
          {draft.pens.a === draft.pens.b && <span className="muted small">Os pênaltis precisam ter um vencedor</span>}
        </div>
      )}

      <div className="match-card__actions">
        {locked ? (
          <p className="locked-note">
            {isKo ? 'Travado: o jogo seguinte do vencedor já foi finalizado.' : 'Fase de grupos travada. Para editar, use “Desfazer mata-mata” no menu.'}
          </p>
        ) : (
          <>
            <button className="btn btn--primary btn--xl" disabled={finishDisabled} onClick={finish}>
              {finishLabel}
            </button>
            {played && (
              <button className="btn btn--ghost btn--danger-text" onClick={remove}>
                Apagar resultado
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Side({ player, align, winner }: { player: Player | null; align: 'left' | 'right'; winner: boolean }) {
  return (
    <div className={`side side--${align} ${winner ? 'is-winner' : ''}`}>
      {player ? (
        <>
          <Crest teamId={player.teamId} teamName={player.teamName} size={160} large className="side__crest" />
          <span className="side__player">{player.name}</span>
          <span className="side__team">{teamDisplayName(player.teamId, player.teamName)}</span>
        </>
      ) : (
        <span className="side__player muted">A definir</span>
      )}
    </div>
  );
}

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  small?: boolean;
  label: string;
  className?: string;
}

function Stepper({ value, onChange, disabled, small, label, className = '' }: StepperProps) {
  return (
    <div className={`stepper ${small ? 'stepper--small' : ''} ${className}`}>
      <button className="stepper__btn" disabled={disabled || value >= MAX_GOALS} onClick={() => onChange(value + 1)} aria-label={`Mais um gol para ${label}`}>
        <ChevronUp size={small ? 22 : 34} />
      </button>
      <output key={value} className="stepper__value" aria-live="polite">{value}</output>
      <button className="stepper__btn" disabled={disabled || value <= 0} onClick={() => onChange(value - 1)} aria-label={`Menos um gol para ${label}`}>
        <ChevronDown size={small ? 22 : 34} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------- cards de estado */

export function GroupDoneCard() {
  const { state, dispatch } = useTournament();
  const q = state.qualifiers ?? 2;
  const top = computeStandings(state.players, state.groupMatches).slice(0, q);
  return (
    <section className="match-card match-card--info">
      <div className="match-card__head">
        <span className="match-card__label">Fase de grupos encerrada</span>
        <span className="match-card__meta">{q} classificados</span>
      </div>
      <ol className="qualified">
        {top.map((r, i) => (
          <li key={r.player.id} className="qualified__item">
            <span className="qualified__pos">{i + 1}º</span>
            <Crest teamId={r.player.teamId} teamName={r.player.teamName} size={40} />
            <span className="qualified__name">{r.player.name}</span>
          </li>
        ))}
      </ol>
      <div className="match-card__actions">
        <button className="btn btn--primary btn--xl" onClick={() => dispatch({ type: 'generateKnockout' })}>
          Gerar mata-mata · {stageName(q)}
        </button>
        <span className="muted small">Ao gerar, os resultados da fase de grupos ficam travados. Ainda dá para editar qualquer jogo pela lista.</span>
      </div>
    </section>
  );
}

export function ChampionCard({ player, final }: { player: Player; final: Match }) {
  const { state } = useTournament();
  const a = playerById(state, final.a);
  const b = playerById(state, final.b);
  const s = final.score as Score;
  return (
    <section className="match-card champion">
      <div className="match-card__head">
        <span className="match-card__label">Campeão</span>
      </div>
      <div className="champion__body">
        <Crest teamId={player.teamId} teamName={player.teamName} size={220} large className="champion__crest" />
        <div className="champion__info">
          <span className="champion__player">{player.name}</span>
          <span className="champion__team">{teamDisplayName(player.teamId, player.teamName)}</span>
          <span className="champion__final">
            Final: {a?.name} <b>{s.a}</b> × <b>{s.b}</b> {b?.name}
            {final.pens ? ` (pên. ${final.pens.a} × ${final.pens.b})` : ''}
          </span>
        </div>
      </div>
    </section>
  );
}

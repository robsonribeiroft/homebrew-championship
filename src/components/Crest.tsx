import { findTeam } from '../data/catalog';

interface Props {
  teamId: string;
  /** usado no fallback se o time não existir mais em logos/ */
  teamName?: string;
  size?: number;
  large?: boolean;
  className?: string;
}

/** Escudo do time; fallback genérico (escudo com iniciais) se o arquivo não existir. */
export function Crest({ teamId, teamName, size = 48, large = false, className = '' }: Props) {
  const team = findTeam(teamId);
  const style = { width: size, height: size };
  if (team) {
    return (
      <img
        className={`crest ${className}`}
        style={style}
        src={large ? team.logoLarge : team.logoSmall}
        alt={team.name}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    );
  }
  const initials = (teamName ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <svg className={`crest crest--fallback ${className}`} style={style} viewBox="0 0 64 64" role="img" aria-label={teamName ?? 'Time'}>
      <path d="M32 3 57 11v19c0 15-10.5 25.5-25 31C17.5 55.5 7 45 7 30V11Z" fill="var(--c-surface-alt)" stroke="var(--c-border)" strokeWidth="3" />
      <text x="32" y="38" textAnchor="middle" fontFamily="var(--f-mono)" fontWeight="700" fontSize="17" fill="var(--c-text)">
        {initials || '?'}
      </text>
    </svg>
  );
}

export function teamDisplayName(teamId: string, fallback: string): string {
  return findTeam(teamId)?.name ?? fallback;
}

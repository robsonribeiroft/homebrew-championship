/**
 * Catálogo de ligas e times, descoberto em build time a partir da pasta `logos/`.
 *
 * Estrutura esperada (formato de download do football-logos.cc):
 *   logos/<liga>[.football-logos.cc]/128x128/<time>[.football-logos.cc].png   (obrigatório)
 *   logos/<liga>[.football-logos.cc]/256x256/<time>[.football-logos.cc].png   (recomendado)
 *   logos/<liga>[.football-logos.cc]/*.svg                                      (opcional: logo da liga)
 *   logos/<liga>[.football-logos.cc]/names.json                                 (opcional: nomes/acentos)
 *
 * Para adicionar uma liga basta copiar a pasta e reiniciar `npm run dev` (ou refazer o build).
 */

export interface Team {
  /** `<ligaSlug>/<timeSlug>` — estável, usado no estado salvo. */
  id: string;
  slug: string;
  name: string;
  leagueId: string;
  logoSmall: string;
  logoLarge: string;
}

export interface League {
  id: string;
  name: string;
  season: string | null;
  logo: string | null;
  teams: Team[];
}

interface NamesFile {
  league?: string;
  teams?: Record<string, string>;
}

const small = import.meta.glob('/logos/*/128x128/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const large = import.meta.glob('/logos/*/256x256/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const leagueLogos = import.meta.glob('/logos/*/*.svg', { eager: true, import: 'default' }) as Record<string, string>;
const namesFiles = import.meta.glob('/logos/*/names.json', { eager: true, import: 'default' }) as Record<string, NamesFile>;

const SUFFIX = '.football-logos.cc';

const stripSuffix = (s: string) => (s.endsWith(SUFFIX) ? s.slice(0, -SUFFIX.length) : s);

/** "sao-bernardo" → "Sao Bernardo" (names.json corrige acentos). */
export function titleFromSlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** "brazil-serie-b-2025-2026" → { base: "brazil-serie-b", season: "2025/26" } */
export function splitSeason(slug: string): { base: string; season: string | null } {
  const m = slug.match(/^(.*?)-(\d{4})-(\d{4})$/);
  if (m) return { base: m[1], season: `${m[2]}/${m[3].slice(2)}` };
  const y = slug.match(/^(.*?)-(\d{4})$/);
  if (y) return { base: y[1], season: y[2] };
  return { base: slug, season: null };
}

/** Quebra "/logos/<pasta>/<resto>" */
function parsePath(path: string): { folder: string; file: string } | null {
  const parts = path.split('/').filter(Boolean); // ["logos", folder, ..., file]
  if (parts.length < 3 || parts[0] !== 'logos') return null;
  return { folder: parts[1], file: parts[parts.length - 1] };
}

function fileSlug(file: string): string {
  return stripSuffix(file.replace(/\.[a-z0-9]+$/i, ''));
}

function buildCatalog(): League[] {
  type Draft = { folder: string; logos: Map<string, { small?: string; large?: string }>; svg: string | null; names: NamesFile };
  const drafts = new Map<string, Draft>();
  const get = (folder: string) => {
    let d = drafts.get(folder);
    if (!d) {
      d = { folder, logos: new Map(), svg: null, names: {} };
      drafts.set(folder, d);
    }
    return d;
  };

  for (const [path, url] of Object.entries(small)) {
    const p = parsePath(path);
    if (!p) continue;
    const slug = fileSlug(p.file);
    const d = get(p.folder);
    d.logos.set(slug, { ...d.logos.get(slug), small: url });
  }
  for (const [path, url] of Object.entries(large)) {
    const p = parsePath(path);
    if (!p) continue;
    const slug = fileSlug(p.file);
    const d = get(p.folder);
    d.logos.set(slug, { ...d.logos.get(slug), large: url });
  }
  for (const [path, url] of Object.entries(leagueLogos)) {
    const p = parsePath(path);
    if (!p) continue;
    const d = get(p.folder);
    if (!d.svg) d.svg = url;
  }
  for (const [path, data] of Object.entries(namesFiles)) {
    const p = parsePath(path);
    if (!p) continue;
    get(p.folder).names = data ?? {};
  }

  const leagues: League[] = [];
  for (const d of drafts.values()) {
    if (d.logos.size === 0) continue;
    const leagueId = stripSuffix(d.folder);
    const { base, season } = splitSeason(leagueId);
    const teams: Team[] = [];
    for (const [slug, l] of d.logos) {
      const logoSmall = l.small ?? l.large;
      const logoLarge = l.large ?? l.small;
      if (!logoSmall || !logoLarge) continue;
      teams.push({
        id: `${leagueId}/${slug}`,
        slug,
        name: d.names.teams?.[slug] ?? titleFromSlug(slug),
        leagueId,
        logoSmall,
        logoLarge,
      });
    }
    teams.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    leagues.push({
      id: leagueId,
      name: d.names.league ?? titleFromSlug(base),
      season,
      logo: d.svg,
      teams,
    });
  }
  leagues.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return leagues;
}

export const LEAGUES: League[] = buildCatalog();

const TEAM_INDEX = new Map<string, Team>(LEAGUES.flatMap((l) => l.teams.map((t) => [t.id, t] as const)));
const LEAGUE_INDEX = new Map<string, League>(LEAGUES.map((l) => [l.id, l]));

export const findTeam = (id: string): Team | undefined => TEAM_INDEX.get(id);
export const findLeague = (id: string): League | undefined => LEAGUE_INDEX.get(id);

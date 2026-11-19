/**
 * ============================================================================
 *  TEMA — constantes globais de cor e tipografia
 * ============================================================================
 *  Edite os valores abaixo para experimentar. Tudo no app lê estas variáveis
 *  (aplicadas como CSS custom properties `--c-*` / `--f-*` no <html>).
 */

/** Cor de destaque principal (verde-limão ácido). */
export const ACCENT = '#C6FF00';

/** Cor do texto/ícones sobre o ACCENT. */
export const ON_ACCENT = '#0B0B0C';

export const DANGER = '#FF3B30';
export const WARNING = '#FFB800';

export type ThemeMode = 'dark' | 'light';

export interface Palette {
  /** fundo da página */
  bg: string;
  /** cartões, painéis */
  surface: string;
  /** áreas secundárias (cabeçalhos de tabela, tiles) */
  surfaceAlt: string;
  /** texto principal */
  text: string;
  /** texto secundário */
  textMuted: string;
  /** linhas finas de estrutura */
  line: string;
  /** bordas grossas de componentes (neo-brutalismo) */
  border: string;
  /** sombra dura deslocada */
  shadow: string;
  /** accent usado como TEXTO sobre o fundo (no light o verde-limão puro não tem contraste) */
  accentText: string;
  /** grade decorativa do fundo */
  grid: string;
}

export const PALETTES: Record<ThemeMode, Palette> = {
  dark: {
    bg: '#0B0B0C',
    surface: '#141416',
    surfaceAlt: '#1D1D20',
    text: '#F4F4F0',
    textMuted: '#8D8D88',
    line: '#2A2A2E',
    border: '#F4F4F0',
    shadow: '#3A3A40',
    accentText: ACCENT,
    grid: 'rgba(244, 244, 240, 0.035)',
  },
  light: {
    bg: '#EFEEE8',
    surface: '#FFFFFF',
    surfaceAlt: '#E4E3DC',
    text: '#0B0B0C',
    textMuted: '#5E5E59',
    line: '#CFCEC6',
    border: '#0B0B0C',
    shadow: '#0B0B0C',
    accentText: '#4B6300',
    grid: 'rgba(11, 11, 12, 0.05)',
  },
};

export const FONTS = {
  /** títulos, nomes (caixa alta) */
  display: "'Space Grotesk', 'Arial Narrow', system-ui, sans-serif",
  /** placares, números, rótulos técnicos */
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
};

/** Espessura das bordas e deslocamento da sombra dura. */
export const SHAPE = {
  borderWidth: '3px',
  shadowOffset: '6px',
  radius: '0px',
};

export const DEFAULT_THEME: ThemeMode = 'dark';

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  const p = PALETTES[mode];
  const vars: Record<string, string> = {
    '--c-accent': ACCENT,
    '--c-on-accent': ON_ACCENT,
    '--c-danger': DANGER,
    '--c-warning': WARNING,
    '--c-bg': p.bg,
    '--c-surface': p.surface,
    '--c-surface-alt': p.surfaceAlt,
    '--c-text': p.text,
    '--c-text-muted': p.textMuted,
    '--c-line': p.line,
    '--c-border': p.border,
    '--c-shadow': p.shadow,
    '--c-accent-text': p.accentText,
    '--c-grid': p.grid,
    '--f-display': FONTS.display,
    '--f-mono': FONTS.mono,
    '--bw': SHAPE.borderWidth,
    '--so': SHAPE.shadowOffset,
    '--radius': SHAPE.radius,
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
}

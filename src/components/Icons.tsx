type P = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
  'aria-hidden': true,
});

export const ChevronLeft = ({ size = 28, className }: P) => (
  <svg {...base(size)} className={className}><path d="M15 4 7 12l8 8" /></svg>
);
export const ChevronRight = ({ size = 28, className }: P) => (
  <svg {...base(size)} className={className}><path d="m9 4 8 8-8 8" /></svg>
);
export const ChevronUp = ({ size = 28, className }: P) => (
  <svg {...base(size)} className={className}><path d="m4 15 8-8 8 8" /></svg>
);
export const ChevronDown = ({ size = 28, className }: P) => (
  <svg {...base(size)} className={className}><path d="m4 9 8 8 8-8" /></svg>
);
export const CloseIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M5 5l14 14M19 5 5 19" /></svg>
);
export const SunIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} strokeWidth={2.5} className={className}>
    <rect x="8" y="8" width="8" height="8" />
    <path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </svg>
);
export const MoonIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} strokeWidth={2.5} className={className}><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" /></svg>
);
export const MenuIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
);

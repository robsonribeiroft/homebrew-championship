import { useEffect, useRef, useState, type ReactNode } from 'react';

const CLOSE_FALLBACK_MS = 450;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Props {
  open: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Expande/recolhe o conteúdo animando a altura de 0 até a altura natural
 * (grid-template-rows 0fr → 1fr). Ao fechar, mantém o último conteúdo visível
 * durante o recolhimento e só então desmonta.
 */
export function Expand({ open, children, className = '' }: Props) {
  const [mounted, setMounted] = useState(open);
  const last = useRef<ReactNode>(children);
  if (open) last.current = children;

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (prefersReducedMotion()) {
      setMounted(false);
      return;
    }
    // garantia caso o animationend não dispare
    const t = window.setTimeout(() => setMounted(false), CLOSE_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open && !mounted) return null;

  return (
    <div
      className={`expand ${open ? 'is-open' : 'is-closing'} ${className}`}
      aria-hidden={!open}
      onAnimationEnd={(e) => {
        if (!open && e.target === e.currentTarget) setMounted(false);
      }}
    >
      <div className="expand__clip">{open ? children : last.current}</div>
    </div>
  );
}

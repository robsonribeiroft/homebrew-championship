import { useLayoutEffect, useRef, type RefObject } from 'react';

/** Duração do deslize das linhas (ms). */
export const FLIP_DURATION = 700;
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Tempo que as classes de destaque ficam aplicadas (ms). */
const HIGHLIGHT_MS = 1600;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Anima a reordenação de uma lista com a técnica FLIP (First, Last, Invert, Play).
 *
 * Cada item precisa de `data-flip-key` (estável entre renders) e, opcionalmente,
 * `data-flip-value` (ex.: pontos). Quando um item muda de posição ele desliza da posição
 * antiga até a nova. Itens cujo valor mudou recebem `flip-changed` (+ `flip-up`/`flip-down`
 * se mudaram de posição); itens apenas empurrados recebem `flip-shift`.
 * No primeiro render (ou ao remontar) nada é animado.
 */
export function useFlipList(container: RefObject<HTMLElement | null>): void {
  const positions = useRef<Map<string, number>>(new Map());
  const values = useRef<Map<string, string>>(new Map());
  const timers = useRef<Map<string, number>>(new Map());

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const animate = !prefersReducedMotion();
    const nextPositions = new Map<string, number>();
    const nextValues = new Map<string, string>();

    root.querySelectorAll<HTMLElement>('[data-flip-key]').forEach((node) => {
      const key = node.dataset.flipKey!;
      const top = node.offsetTop;
      const value = node.dataset.flipValue ?? '';
      nextPositions.set(key, top);
      nextValues.set(key, value);

      const before = positions.current.get(key);
      if (before === undefined) return; // item novo ou primeiro render

      const dy = before - top;
      const valueChanged = values.current.get(key) !== value;
      if (!dy && !valueChanged) return;

      // Só quem teve o valor alterado (jogou a partida) recebe cor de subida/descida;
      // quem apenas foi empurrado de posição desliza sem destaque (flip-shift).
      const classes: string[] = [];
      if (valueChanged) {
        classes.push('flip-changed');
        if (dy > 0) classes.push('flip-up');
        if (dy < 0) classes.push('flip-down');
      } else {
        classes.push('flip-shift');
      }
      highlight(node, key, classes);

      if (dy && animate) {
        node.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], {
          duration: FLIP_DURATION,
          easing: EASING,
        });
      }
    });

    positions.current = nextPositions;
    values.current = nextValues;
  });

  function highlight(node: HTMLElement, key: string, classes: string[]) {
    const all = ['flip-up', 'flip-down', 'flip-changed', 'flip-shift'];
    node.classList.remove(...all);
    void node.offsetWidth; // reinicia as animações CSS se o item mudou de novo
    node.classList.add(...classes);
    window.clearTimeout(timers.current.get(key));
    timers.current.set(
      key,
      window.setTimeout(() => node.classList.remove(...all), HIGHLIGHT_MS),
    );
  }
}

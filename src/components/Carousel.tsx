import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { readString, writePref } from '../store/storage';
import { ChevronLeft, ChevronRight } from './Icons';

export interface Slide {
  key: string;
  label: string;
  content: ReactNode;
}

interface Props {
  /** identificador para lembrar o último slide visto */
  id: string;
  slides: Slide[];
  /** "labels" = rótulos clicáveis · "dots" = pontos */
  indicator: 'labels' | 'dots';
  /** setas do teclado navegam este carrossel */
  keyboard?: boolean;
  /** conteúdo extra à direita da barra de indicadores */
  aside?: ReactNode;
  className?: string;
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/**
 * Carrossel sem loop: chevrons laterais (desabilitados nas pontas), setas do teclado,
 * swipe no toque e indicadores do slide atual. Lembra o último slide no localStorage.
 */
export function Carousel({ id, slides, indicator, keyboard = false, aside, className = '' }: Props) {
  const prefKey = `carousel:${id}`;
  const [activeKey, setActiveKey] = useState<string | null>(() => readString(prefKey));
  const [dir, setDir] = useState<'next' | 'prev' | 'none'>('none');
  const touchX = useRef<number | null>(null);

  const found = slides.findIndex((s) => s.key === activeKey);
  const index = found >= 0 ? found : 0;
  const slide = slides[index];

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= slides.length || to === index) return;
      setDir(to > index ? 'next' : 'prev');
      setActiveKey(slides[to].key);
      writePref(prefKey, slides[to].key);
    },
    [slides, index, prefKey],
  );

  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
      if (document.querySelector('[data-modal-open]')) return;
      if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key === 'ArrowRight') go(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keyboard, go, index]);

  if (!slide) return null;

  return (
    <section className={`carousel ${className}`} aria-roledescription="carrossel">
      <div className="carousel__bar">
        {indicator === 'labels' ? (
          <div className="carousel__labels" role="tablist">
            {slides.map((s, i) => (
              <button
                key={s.key}
                role="tab"
                aria-selected={i === index}
                className={`carousel__label ${i === index ? 'is-active' : ''}`}
                onClick={() => go(i)}
              >
                <span className="carousel__label-num">{String(i + 1).padStart(2, '0')}</span>
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="carousel__dots">
            <span className="carousel__count">
              {String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>
            {slides.map((s, i) => (
              <button
                key={s.key}
                className={`carousel__dot ${i === index ? 'is-active' : ''}`}
                onClick={() => go(i)}
                aria-label={s.label}
                title={s.label}
              />
            ))}
          </div>
        )}
        {aside}
      </div>

      <div
        className="carousel__body"
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (start == null || end == null) return;
          const dx = end - start;
          if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        <button className="carousel__chevron carousel__chevron--prev" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Anterior">
          <ChevronLeft size={32} />
        </button>
        <div className="carousel__viewport">
          <div key={slide.key} className={`carousel__slide carousel__slide--${dir}`} aria-label={slide.label}>
            {slide.content}
          </div>
        </div>
        <button
          className="carousel__chevron carousel__chevron--next"
          onClick={() => go(index + 1)}
          disabled={index === slides.length - 1}
          aria-label="Próximo"
        >
          <ChevronRight size={32} />
        </button>
      </div>
    </section>
  );
}

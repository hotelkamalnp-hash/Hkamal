import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalTabSliderProps {
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
  scrollStep?: number;
  ariaLabel?: string;
}

export const HorizontalTabSlider: React.FC<HorizontalTabSliderProps> = ({
  children,
  className = '',
  trackClassName = '',
  scrollStep = 240,
  ariaLabel = 'Horizontal menu navigation',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();

    const handleScroll = () => updateScrollButtons();
    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateScrollButtons);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateScrollButtons());
      ro.observe(el);
    }

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateScrollButtons);
      ro?.disconnect();
    };
  }, [updateScrollButtons, children]);

  const scrollByAmount = (delta: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className={`relative flex items-center gap-1.5 min-w-0 w-full ${className}`}>
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-scrollStep)}
          aria-label="Scroll menu left"
          className="shrink-0 w-7 h-7 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center justify-center shadow-xs transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      <div
        ref={scrollRef}
        role="region"
        aria-label={ariaLabel}
        className={`flex-1 min-w-0 overflow-x-auto kamal-slider-scroll pb-1.5 ${trackClassName}`}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(scrollStep)}
          aria-label="Scroll menu right"
          className="shrink-0 w-7 h-7 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center justify-center shadow-xs transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

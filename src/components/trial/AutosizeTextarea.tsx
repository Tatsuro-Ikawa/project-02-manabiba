'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type TextareaHTMLAttributes,
} from 'react';

export type AutosizeTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> & {
  minHeightPx?: number;
  maxHeightPx?: number | null;
};

export function AutosizeTextarea({
  minHeightPx = 100,
  maxHeightPx = null,
  className = '',
  style,
  value,
  onChange,
  ...props
}: AutosizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [heightPx, setHeightPx] = useState(minHeightPx);
  const [overflowY, setOverflowY] = useState<'hidden' | 'auto'>('hidden');

  const recalc = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const sh = el.scrollHeight;
    const capped = maxHeightPx != null ? Math.min(sh, maxHeightPx) : sh;
    setHeightPx(Math.max(minHeightPx, capped));
    setOverflowY(maxHeightPx != null && sh > maxHeightPx ? 'auto' : 'hidden');
  }, [minHeightPx, maxHeightPx]);

  useLayoutEffect(() => {
    recalc();
  }, [value, recalc]);

  useEffect(() => {
    const fn = () => recalc();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [recalc]);

  return (
    <textarea
      ref={ref}
      rows={1}
      className={['resize-none overflow-x-hidden', className].filter(Boolean).join(' ')}
      style={{
        ...style,
        minHeight: minHeightPx,
        height: heightPx,
        overflowY,
      }}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}

import { useEffect, useRef, useState } from 'react';

interface StreamingTextProps {
  text: string;
  /** When false, render full text immediately (e.g. restored history). */
  animate?: boolean;
  speed?: number; // ms per chunk
  onDone?: () => void;
}

/**
 * Simulated streaming for AI answers. The backend returns the full response
 * in one shot (no SSE), so we reveal it progressively for a "live" feel.
 * Honors prefers-reduced-motion by showing the text instantly.
 */
export function StreamingText({ text, animate = true, speed = 12, onDone }: StreamingTextProps) {
  const [shown, setShown] = useState(animate ? '' : text);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!animate) {
      setShown(text);
      onDone?.();
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(text);
      onDone?.();
      return;
    }

    let i = 0;
    doneRef.current = false;
    const chunk = Math.max(2, Math.round(text.length / 220)); // ~220 frames total
    const timer = setInterval(() => {
      i = Math.min(text.length, i + chunk);
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }
    }, speed);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, animate]);

  return <>{shown}</>;
}

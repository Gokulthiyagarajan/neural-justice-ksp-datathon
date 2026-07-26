import { useState, useEffect, useCallback } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

export function useId(prefix = ''): string {
  const [id, setId] = useState('');
  useEffect(() => {
    setId(`${prefix}-${Math.random().toString(36).substr(2, 9)}`);
  }, [prefix]);
  return id;
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {return initialValue;}
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // Error handling for localStorage
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

export function useOnScreen(ref: React.RefObject<Element>, rootMargin = '0px'): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { rootMargin }
    );
    if (ref.current) {observer.observe(ref.current);}
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return isIntersecting;
}

export function useKeyPress(targetKey: string, handler: () => void): void {
  useEffect(() => {
    const downHandler = (event: KeyboardEvent) => {
      if (event.key === targetKey) {handler();}
    };
    window.addEventListener('keydown', downHandler);
    return () => window.removeEventListener('keydown', downHandler);
  }, [targetKey, handler]);
}

export function useWindowSize(): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

export function useIsMobile(breakpoint = 768): boolean {
  const { width } = useWindowSize();
  return width < breakpoint;
}

export function useCountUp(
  end: number,
  duration = 900,
  options: { decimals?: number; startOnMount?: boolean } = {}
): number {
  const { decimals = 0, startOnMount = true } = options;
  const [value, setValue] = useState(startOnMount ? 0 : end);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || duration <= 0) {
      setValue(end);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const from = 0;
    const factor = Math.pow(10, decimals);

    const tick = (ts: number) => {
      if (start === null) {start = ts;}
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (end - from) * eased;
      setValue(Math.round(current * factor) / factor);
      if (progress < 1) {raf = requestAnimationFrame(tick);}
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, decimals, reduced]);

  return value;
}
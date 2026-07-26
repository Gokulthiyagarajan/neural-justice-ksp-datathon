import { useState, useEffect, useCallback, useRef } from 'react';

export function useTOTPTimer(initialSeconds: number = 30) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const expiryTimerRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setSeconds(initialSeconds);
    setExpired(false);
  }, [initialSeconds]);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-reset 2s after expiry
    expiryTimerRef.current = null;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
    };
  }, [initialSeconds]);

  // Reset timer 2s after expiry
  useEffect(() => {
    if (expired) {
      expiryTimerRef.current = window.setTimeout(() => {
        reset();
      }, 2000);
    }
    return () => {
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
    };
  }, [expired, reset]);

  return { seconds, expired, reset };
}
import { useCallback, useRef } from 'react';
import type { DashboardCard } from '../types/copilot.types';

const CARD_ATTRIBUTE = 'data-copilot-card';

export function useDashboardHighlight() {
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const highlight = useCallback((cardIds: DashboardCard[]) => {
    cardIds.forEach((id) => {
      // Clear any existing timeout for this card
      const existing = timeoutsRef.current.get(id);
      if (existing) clearTimeout(existing);

      const elements = document.querySelectorAll(`[${CARD_ATTRIBUTE}="${id}"]`);
      elements.forEach((el) => {
        el.classList.add('copilot-highlighted');
      });

      const timeout = setTimeout(() => {
        elements.forEach((el) => {
          el.classList.remove('copilot-highlighted');
        });
        timeoutsRef.current.delete(id);
      }, 3000);

      timeoutsRef.current.set(id, timeout);
    });
  }, []);

  return { highlight };
}

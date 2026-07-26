import { useEffect } from 'react';
import type { DashboardCard } from './types/copilot.types';

interface CopilotHighlightProps {
  cardIds: DashboardCard[];
}

/**
 * This component doesn't render anything visible.
 * It calls the highlight effect when cardIds change.
 * The actual highlight is managed by useDashboardHighlight hook,
 * which is wired through useCopilot.
 *
 * This component exists as a declarative wrapper for places where
 * you want to trigger highlights from a non-hook context.
 */
export default function CopilotHighlight({ cardIds }: CopilotHighlightProps) {
  useEffect(() => {
    if (cardIds.length === 0) return;

    cardIds.forEach((id) => {
      const elements = document.querySelectorAll(`[data-copilot-card="${id}"]`);
      elements.forEach((el) => {
        el.classList.add('copilot-highlighted');
        setTimeout(() => {
          el.classList.remove('copilot-highlighted');
        }, 3000);
      });
    });
  }, [cardIds]);

  return null;
}

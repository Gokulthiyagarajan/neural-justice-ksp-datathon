import { useCallback, useState } from 'react';
import type { FIR } from '@/types/fir.types';

export function useFIRSelection(firs: FIR[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === firs.length && firs.length > 0) {
        return new Set();
      }
      return new Set(firs.map((f) => f.fir_id));
    });
  }, [firs]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const allSelected = firs.length > 0 && selected.size === firs.length;

  return {
    selected,
    selectedCount: selected.size,
    isSelected: (id: string) => selected.has(id),
    allSelected,
    toggleOne,
    toggleAll,
    clearSelection,
  };
}

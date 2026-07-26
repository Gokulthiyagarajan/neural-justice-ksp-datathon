import { create } from 'zustand';
import type { ReactNode } from 'react';

interface RightDrawerState {
  isOpen: boolean;
  title: string;
  content: ReactNode | null;
  onCloseHandler: (() => void) | null;
  open: (params: { title: string; content: ReactNode; onClose?: () => void }) => void;
  close: () => void;
}

export const useRightDrawer = create<RightDrawerState>((set) => ({
  isOpen: false,
  title: '',
  content: null,
  onCloseHandler: null,
  open: ({ title, content, onClose }) => set({ isOpen: true, title, content, onCloseHandler: onClose ?? null }),
  close: () => {
    set((s) => {
      s.onCloseHandler?.();
      return { isOpen: false, title: '', content: null, onCloseHandler: null };
    });
  },
}));

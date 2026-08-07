import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X } from 'lucide-react';
import { useAiAssistant } from '@/context/AiAssistantContext';

interface AiFloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export default function AiFloatingButton({ onClick, isOpen }: AiFloatingButtonProps) {
  const { messages } = useAiAssistant();
  const [hovered, setHovered] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const unreadCount = messages.filter(m => m.role === 'assistant' && !m.streaming).length;

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
    onClick();
  }, [onClick]);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl cursor-pointer overflow-hidden select-none"
      style={{
        background: isOpen
          ? 'linear-gradient(135deg, var(--destructive) 0%, color-mix(in srgb, var(--destructive) 72%, #000) 100%)'
          : 'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 72%, #000) 100%)',
        boxShadow: isOpen
          ? '0 8px 32px color-mix(in srgb, var(--destructive) 35%, transparent), 0 0 0 1px color-mix(in srgb, var(--destructive) 30%, transparent)'
          : '0 8px 32px color-mix(in srgb, var(--primary) 35%, transparent), 0 0 0 1px color-mix(in srgb, var(--primary) 30%, transparent)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
    >
      {/* Ripple containers */}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ opacity: 0.5, scale: 0 }}
            animate={{ opacity: 0, scale: 3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute w-8 h-8 rounded-full bg-primary-foreground-30 pointer-events-none"
            style={{ left: r.x - 16, top: r.y - 16 }}
          />
        ))}
      </AnimatePresence>

      {/* Icon */}
      <div className="relative z-10 flex items-center justify-center">
        {isOpen ? (
          <X className="w-5 h-5 text-primary-foreground" />
        ) : (
          <Bot className="w-5 h-5 text-primary-foreground" />
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary-foreground animate-pulse" />
        )}
      </div>

      {/* Label */}
      <span className="relative z-10 text-13.3333px font-semibold text-primary-foreground tracking-wide whitespace-nowrap">
        {isOpen ? 'Close AI' : 'Ask AI'}
      </span>
    </motion.button>
  );
}

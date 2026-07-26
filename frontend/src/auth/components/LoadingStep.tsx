import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface LoadingStepProps {
  label: string;
  done: boolean;
  delay: number;
}

export function LoadingStep({ label, done, delay }: LoadingStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center gap-3"
    >
      <span className="flex items-center justify-center w-5 h-5">
        {done ? (
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-ksp-success" fill="none">
            <motion.path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3 }}
            />
          </svg>
        ) : (
          <span className="w-4 h-4 border-2 border-ksp-steel border-t-ksp-amber rounded-full animate-spin" />
        )}
      </span>
      <span className={clsx('text-sm', done ? 'text-ksp-success' : 'text-ksp-muted')}>{label}</span>
    </motion.div>
  );
}

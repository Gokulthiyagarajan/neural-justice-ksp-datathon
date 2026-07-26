import { motion } from 'framer-motion';
import { LoadingStep } from '../components/LoadingStep';
import { COPY } from '../constants/copy';

interface DashboardLoadProps {
  officerName: string;
  sessionId: string;
  onComplete: () => void;
}

export function DashboardLoad({ officerName, sessionId, onComplete }: DashboardLoadProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-[440px] px-4"
    >
      <div className="flex flex-col items-center text-center">
        <h2 className="text-xl font-semibold text-ksp-white">{COPY.dashboardLoad.officerName}</h2>
        <p className="mt-1 text-sm text-ksp-muted">{officerName}</p>
        <p className="mt-0.5 font-mono text-xs text-ksp-amber/80">{sessionId}</p>

        <div className="mt-8 w-full space-y-4">
          {COPY.dashboardLoad.steps.map((step, i) => (
            <LoadingStep key={i} label={step.loading} done delay={0.1 + i * 0.3} />
          ))}
        </div>

        <div className="mt-8 w-full h-1 rounded-full bg-ksp-navy-light overflow-hidden">
          <motion.div
            className="h-full bg-ksp-amber rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.8, ease: 'easeInOut', onComplete }}
          />
        </div>
      </div>
    </motion.div>
  );
}

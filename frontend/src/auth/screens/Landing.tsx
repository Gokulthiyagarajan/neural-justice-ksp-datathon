import { motion } from 'framer-motion';
import { COPY } from '../constants/copy';

interface LandingProps {
  onNext: () => void;
}

export function Landing({ onNext }: LandingProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="landing-bg relative w-full max-w-md px-4 pb-16 text-center"
      >
        <div className="mb-8 flex flex-col items-center">
          {/* Logo Container */}
          <div className="mb-4 flex items-center justify-center w-24 h-24 sm:w-[100px] sm:h-[100px] rounded-2xl border border-ksp-navy-light/50 bg-ksp-navy-mid/80 backdrop-blur-lg shadow-[0_0_30px_rgba(59,130,246,0.20)]">
            <img
              src="/app/nj-logo.png"
              alt="Neural Justice"
              className="w-20 sm:w-[80px] h-auto object-contain"
              loading="eager"
            />
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-ksp-white tracking-tight">{COPY.platformName}</h1>
          <p className="mt-1 text-sm text-ksp-muted">{COPY.platformNameKn}</p>
          <div className="mt-2 space-y-0.5">
            <p className="text-sm text-ksp-muted tracking-[0.02em]">{COPY.tagline}</p>
            <p className="text-xs text-ksp-muted/80">{COPY.taglineKn}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="group inline-flex items-center justify-center gap-2 bg-transparent border border-ksp-amber text-ksp-amber px-7 py-3 min-h-12 min-w-12 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-ksp-amber hover:text-ksp-navy focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {COPY.landing.cta.replace(' →', '')}
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </button>
      </motion.div>

      {/* Fixed footer bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[rgba(15,32,64,0.6)] border-t border-ksp-navy-light px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-mono text-ksp-muted text-center">
        {COPY.footer}
      </div>
    </>
  );
}

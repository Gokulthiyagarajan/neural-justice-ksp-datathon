import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { AuditCheckbox } from '../components/AuditCheckbox';
import { SessionChip } from '../components/SessionChip';
import { COPY } from '../constants/copy';

interface AuditGateProps {
  roleTitle: string;
  sessionId: string;
  onChangeRole: () => void;
  onConfirm: () => void;
}

function formatIST(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${day} ${month} ${year}  ${hh}:${mm}:${ss} IST`;
}

const SESSION_ROWS = [
  { label: COPY.auditGate.sessionIdLabel, key: 'sessionId' as const },
  { label: COPY.auditGate.accessRoleLabel, key: 'accessRole' as const },
  { label: COPY.auditGate.timestampLabel, key: 'timestamp' as const },
  { label: COPY.auditGate.ipAddressLabel, key: 'ipAddress' as const },
];

export function AuditGate({ roleTitle, sessionId, onChangeRole, onConfirm }: AuditGateProps) {
  const [consent, setConsent] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const rowValues: Record<string, string> = {
    sessionId,
    accessRole: roleTitle,
    timestamp: formatIST(now),
    ipAddress: '192.168.1.42',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-[440px] px-4"
    >
      <div className="mb-5">
        <SessionChip label={roleTitle} onBack={onChangeRole} backLabel={COPY.credentials.changeRole} />
      </div>

      <div className="rounded-lg border border-ksp-navy-light overflow-hidden bg-ksp-navy-mid">
        {/* Amber classified banner strip */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-ksp-amber/10 border-b border-ksp-amber/30">
          <ShieldAlert className="w-4 h-4 text-ksp-amber shrink-0" />
          <span className="text-[11px] font-bold tracking-[0.1em] text-ksp-amber">
            {COPY.auditGate.banner}
          </span>
        </div>

        {/* Session info block — 4 rows */}
        <div className="p-3.5 space-y-2.5 font-mono">
          {SESSION_ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4">
              <span className="text-[10px] uppercase tracking-[0.08em] text-ksp-muted">
                {row.label}
              </span>
              <span className="text-xs text-ksp-white text-right">{rowValues[row.key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legal text — white, amber left border box */}
      <div className="mt-4 rounded-r-lg bg-[rgba(26,51,88,0.4)] border-l-[3px] border-ksp-amber/40 px-4 py-3.5">
        <p className="text-[13px] leading-[1.7] text-ksp-white whitespace-pre-line">
          {COPY.auditGate.legalText}
        </p>
      </div>

      <div className="mt-5">
        <AuditCheckbox
          checked={consent}
          onChange={setConsent}
          label={COPY.auditGate.checkboxLabel}
        />
      </div>

      <button
        type="button"
        disabled={!consent}
        onClick={onConfirm}
        className={consent
          ? 'mt-6 w-full h-12 rounded-xl bg-ksp-amber text-ksp-navy font-semibold text-sm transition-all duration-200 hover:brightness-110'
          : 'mt-6 w-full h-12 rounded-xl bg-ksp-navy-light text-ksp-muted font-semibold text-sm opacity-50 cursor-not-allowed pointer-events-none transition-all duration-200'}
      >
        {COPY.auditGate.enterBtn}
      </button>
    </motion.div>
  );
}

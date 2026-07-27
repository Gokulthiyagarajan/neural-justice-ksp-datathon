import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, UserPlus, Flag, X } from 'lucide-react';
import { useToast } from '@/components/Common/Toast';
import { C } from '../theme';

interface Props {
  count: number;
  onClear: () => void;
}

const OFFICERS = [
  'Inspector R. Kumar',
  'SI M. Reddy',
  'Inspector A. Shetty',
  'SI P. Nair',
  'Inspector K. Rao',
];

function GhostButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        border: 'none',
        color: C.white,
        fontSize: 12,
        cursor: 'pointer',
        padding: '6px 10px',
        borderRadius: 6,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.navyLight)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      {label}
    </button>
  );
}

export function FIRBulkActionBar({ count, onClear }: Props) {
  const { toast } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'sticky',
        bottom: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 52,
        background: C.navyMid,
        border: `1px solid ${C.steel}`,
        borderRadius: 8,
        padding: '0 16px',
        marginTop: 8,
        zIndex: 30,
      }}
    >
      <span style={{ fontSize: 13, color: C.white }}>
        <strong>{count}</strong> FIRs selected
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
        <GhostButton
          icon={<Download size={15} />}
          label="Export PDF"
          onClick={() => toast('success', `Exporting ${count} FIRs…`)}
        />
        <GhostButton
          icon={<UserPlus size={15} />}
          label="Assign Investigator"
          onClick={() => setAssignOpen((o) => !o)}
        />
        <GhostButton
          icon={<Flag size={15} />}
          label="Flag for Review"
          onClick={() => {
            toast('warning', `Flagged ${count} FIR(s) for supervisor review`);
            onClear();
          }}
        />

        {assignOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              right: 0,
              width: 220,
              background: C.navyMid,
              border: `1px solid ${C.navyLight}`,
              borderRadius: 8,
              padding: 4,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              zIndex: 40,
            }}
          >
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, padding: '6px 8px' }}>
              Assign to
            </div>
            {OFFICERS.map((officer) => (
              <button
                key={officer}
                type="button"
                onClick={() => {
                  setAssignOpen(false);
                  toast('success', `Assigned ${count} FIR(s) to ${officer}`);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 6,
                  fontSize: 13,
                  color: C.white,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.navyLight)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {officer}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onClear}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          color: C.muted,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
        onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
      >
        <X size={14} /> Clear selection
      </button>
    </motion.div>
  );
}

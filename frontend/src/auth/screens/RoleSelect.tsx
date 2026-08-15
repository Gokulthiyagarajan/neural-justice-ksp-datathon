import { motion } from 'framer-motion';
import { ROLE_CONFIGS } from '../constants/roleConfig';
import { RoleCard } from '../components/RoleCard';
import { COPY } from '../constants/copy';
import type { KSPRole } from '@/config/navConfig';
import { useTranslation } from 'react-i18next';

interface RoleSelectProps {
  selectedRole: string | null;
  onSelect: (role: KSPRole) => void;
  onNext: () => void;
}

export function RoleSelect({ selectedRole, onSelect, onNext }: RoleSelectProps) {
  const { i18n } = useTranslation();
  const isKn = i18n.language?.startsWith('kn');
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-[520px] px-4"
    >
      <h2 className="text-xl font-semibold text-ksp-white text-center">{COPY.roleSelect.header}</h2>
      <p className="mt-1 text-sm text-ksp-muted text-center">{COPY.roleSelect.subtext}</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {ROLE_CONFIGS.map((role, index) => (
          <div
            key={role.value}
            className={index === ROLE_CONFIGS.length - 1 ? 'col-span-2 max-w-[calc(50%-0.375rem)] justify-self-center' : ''}
          >
            <RoleCard
              icon={role.icon}
              title={isKn ? role.titleKn : role.title}
              abbrev={role.abbrev}
              scope={role.scope}
              badge={role.badge}
              selected={selectedRole === role.value}
              onSelect={() => onSelect(role.value)}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!selectedRole}
        onClick={onNext}
        className={`mt-6 w-full h-12 rounded-xl font-semibold text-sm transition-all duration-200 ${
          selectedRole
            ? 'bg-ksp-amber text-ksp-navy hover:brightness-110 cursor-pointer'
            : 'bg-ksp-navy-mid border border-ksp-navy-light text-ksp-muted opacity-50 cursor-not-allowed'
        }`}
      >
        {COPY.roleSelect.continueBtn}
      </button>
    </motion.div>
  );
}

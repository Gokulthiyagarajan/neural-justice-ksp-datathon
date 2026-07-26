import { useMemo, useState } from 'react';
import { Copy, Mail, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/Common/Modal';
import { useToast } from '@/components/Common/Toast';
import { COPY, resolveDistrictRecipient } from '../constants/copy';

type FieldKey = (typeof COPY.forgotMail.fields)[number]['key'];

interface ForgotCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotCredentialsModal({ isOpen, onClose }: ForgotCredentialsModalProps) {
  const { toast } = useToast();
  const fields = COPY.forgotMail.fields;

  const [values, setValues] = useState<Record<FieldKey, string>>({
    officerName: '',
    policeId: '',
    rank: '',
    department: '',
    station: '',
    district: '',
    email: '',
    mobile: '',
  });

  const buildBody = (vals: Record<FieldKey, string>) =>
    COPY.forgotMail.bodyTemplate.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => vals[key as FieldKey] || `[${key}]`);

  const body = useMemo(() => buildBody(values), [values]);

  const subject = useMemo(
    () => COPY.forgotMail.subject.replace('[Police ID]', values.policeId || 'Police ID'),
    [values.policeId]
  );

  // Auto-detected recipient: resolved from the district the officer typed.
  const recipient = useMemo(
    () => resolveDistrictRecipient(values.district),
    [values.district]
  );

  const handleCopy = async () => {
    const text = `To: ${recipient}\nSubject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      toast('success', COPY.forgotMail.copiedToast);
    } catch {
      toast('error', 'Unable to copy', 'Please select and copy the text manually.');
    }
  };

  // Opens the officer's mail client (Gmail if default) with To: + subject +
  // body pre-filled, so they only need to press Send.
  const handleSend = () => {
    const mailto = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    toast('info', COPY.forgotMail.sendToast);
  };

  const inputClass =
    'w-full h-10 px-3 rounded-lg appearance-none bg-ksp-navy-mid border border-ksp-navy-light text-ksp-white text-sm outline-none placeholder:text-ksp-muted/60 focus:border-ksp-amber focus:shadow-[0_0_0_1px_rgba(245,158,11,0.3)] transition-colors duration-150';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={COPY.forgotMail.title}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-ksp-muted hover:text-ksp-white transition-colors duration-150"
          >
            {COPY.forgotMail.closeBtn}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-ksp-navy-light text-ksp-white hover:bg-ksp-navy-light transition-colors duration-150"
          >
            <Copy className="w-4 h-4" />
            {COPY.forgotMail.copyBtn}
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-ksp-amber text-ksp-navy hover:brightness-110 transition-all duration-150"
          >
            <Mail className="w-4 h-4" />
            {COPY.forgotMail.openBtn}
          </button>
        </div>
      }
    >
      <p className="text-sm text-ksp-muted leading-relaxed mb-4">{COPY.forgotMail.intro}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key} className={f.key === 'email' ? 'sm:col-span-2' : ''}>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ksp-muted mb-1.5">
              {f.label}
            </label>
            <input
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className={inputClass}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-ksp-navy-light bg-ksp-navy-mid p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-ksp-amber shrink-0" />
          <span className="text-[11px] uppercase tracking-[0.08em] text-ksp-muted">
            {values.district.trim() ? 'Auto-detected recipient' : COPY.forgotMail.recipientLabel}
          </span>
        </div>
        <div className="mb-2 text-xs text-ksp-white">
          <span className="text-ksp-muted">To: </span>
          <span className="font-medium text-ksp-amber">{recipient}</span>
        </div>
        <pre className="whitespace-pre-wrap text-xs leading-relaxed text-ksp-white/90 font-sans max-h-56 overflow-y-auto">
          {`Subject: ${subject}\n\n${body}`}
        </pre>
      </div>
    </Modal>
  );
}

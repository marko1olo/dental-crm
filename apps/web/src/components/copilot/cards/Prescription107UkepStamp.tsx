import React from 'react';
import { AlertCircle, FileSignature } from 'lucide-react';
import type { Prescription107Data } from './types';

export interface Prescription107UkepStampProps {
  isSigned: boolean;
  prescription: Prescription107Data;
}

export const Prescription107UkepStamp: React.FC<Prescription107UkepStampProps> = ({
  isSigned,
  prescription,
}) => {
  if (isSigned) {
    return (
      <div className="copilot-rx-ukep-stamp signed">
        <FileSignature size={18} className="text-[var(--teal)] flex-shrink-0" />
        <div style={{ minWidth: 0 }}>
          <div className="font-bold text-xs uppercase tracking-wider text-[var(--teal-dark)]">
            Электронный документ подписан УКЭП
          </div>
          <div className="text-[11px] text-[var(--ink)] mt-0.5">
            Сертификат: <code className="font-mono">{prescription.ukepCertificate || '00E10352F71B39D48C19'}</code>
          </div>
          <div className="text-[10px] text-[var(--muted)]">
            Владелец: {prescription.doctorName} • {prescription.ukepSignedAt || '31.08.2026 22:30'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="copilot-rx-ukep-stamp">
      <AlertCircle size={15} className="text-[var(--amber)] flex-shrink-0" />
      <span>Черновик рецепта. Требуется подписание УКЭП врача.</span>
    </div>
  );
};

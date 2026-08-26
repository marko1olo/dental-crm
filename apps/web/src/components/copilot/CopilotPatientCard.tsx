import React from 'react';
import { User, Phone, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import type { PatientResult, SelectIdHandler } from './copilotTypes';

export interface CopilotPatientCardProps {
  patient: PatientResult;
  onSelect?: SelectIdHandler | undefined;
  onSelectPatient?: SelectIdHandler | undefined;
}

export const CopilotPatientCard: React.FC<CopilotPatientCardProps> = ({
  patient,
  onSelect,
  onSelectPatient,
}) => {
  const handler = onSelect || onSelectPatient;
  const initial =
    patient.full_name && patient.full_name.length > 0
      ? patient.full_name.charAt(0).toUpperCase()
      : null;

  const isActive = patient.status === 'active';

  return (
    <div className="copilot-patient-card">
      <div className="copilot-patient-top">
        <div className="copilot-patient-info">
          <div className="copilot-patient-avatar">
            {initial || <User size={16} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="copilot-patient-name">{patient.full_name}</span>
              {patient.status && (
                <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: isActive ? 'var(--teal-soft)' : 'var(--paper-soft)', color: isActive ? 'var(--teal-dark)' : 'var(--muted)' }}>
                  {isActive ? 'Активен' : patient.status}
                </span>
              )}
            </div>
            <div className="copilot-patient-meta">
              {Boolean(patient.phone) && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={12} />
                  {patient.phone}
                </span>
              )}
              {Boolean(patient.birth_date || patient.date_of_birth) && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  <Calendar size={12} />
                  {patient.birth_date || patient.date_of_birth}
                </span>
              )}
            </div>
          </div>
        </div>
        {handler && (
          <button
            type="button"
            onClick={() => handler(patient.id)}
            className="copilot-card-btn"
            title="Открыть карту пациента"
          >
            <span>Карта</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

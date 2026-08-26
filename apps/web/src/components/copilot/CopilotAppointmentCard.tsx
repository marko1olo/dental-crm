import React from 'react';
import { Calendar, Clock, User, ArrowRight, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import type { AppointmentResult, SelectIdHandler } from './copilotTypes';
import { formatTimeRange } from './useCopilotFormat';

export interface CopilotAppointmentCardProps {
  appointment: AppointmentResult;
  onSelect?: SelectIdHandler | undefined;
  onSelectAppointment?: SelectIdHandler | undefined;
}

export const CopilotAppointmentCard: React.FC<CopilotAppointmentCardProps> = ({
  appointment,
  onSelect,
  onSelectAppointment,
}) => {
  const handler = onSelect || onSelectAppointment;
  const isConfirmed = appointment.status === 'confirmed' || appointment.status === 'completed';
  const isCancelled = appointment.status === 'cancelled';

  return (
    <div className="copilot-appt-card">
      <div className="copilot-appt-header">
        <div>
          <div className="copilot-appt-title">{appointment.patient_name || 'Приём пациента'}</div>
          <div className="copilot-appt-time">
            <Clock size={13} />
            <span>{formatTimeRange(appointment.start_time || '', appointment.end_time)}</span>
          </div>
        </div>
        <span className={`copilot-status-badge ${isConfirmed ? 'confirmed' : isCancelled ? 'destructive' : 'pending'}`}>
          {isConfirmed ? (
            <>
              <CheckCircle2 size={11} />
              <span>Подтвержден</span>
            </>
          ) : isCancelled ? (
            <>
              <XCircle size={11} />
              <span>Отменен</span>
            </>
          ) : (
            <>
              <AlertCircle size={11} />
              <span>Ожидает</span>
            </>
          )}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--line)', fontSize: '11px', color: 'var(--muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {appointment.doctor_name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <User size={11} />
              {appointment.doctor_name}
            </span>
          )}
          {appointment.cabinet && <span>Кабинет: {appointment.cabinet}</span>}
        </div>
        {handler && (
          <button
            type="button"
            onClick={() => handler(appointment.id)}
            className="copilot-card-btn"
            style={{ minHeight: '32px', padding: '0 8px', fontSize: '11px' }}
          >
            <span>Открыть</span>
            <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

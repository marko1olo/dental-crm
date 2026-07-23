import type { ChangeEvent } from "react";
import type { Appointment, AppointmentReadiness, Dashboard, ScheduleSuggestion } from "@dental/shared";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export type AppointmentCardProps = {
  appointment: Appointment;
  dashboard: Dashboard;
  visibleScheduleSuggestions: ScheduleSuggestion[];
  appointmentReadinessById: Map<string, AppointmentReadiness>;
  appointmentLabels: Record<Appointment["status"], string>;
  appointmentDraft: any;
  appointmentSaveState: string;
  appointmentSaveError: string | null;
  appointmentDirty: boolean;
  appointmentEditing: boolean;
  appointmentHasOpenVisit: boolean;
  appointmentActiveVisitStatusLocked: boolean;
  appointmentMissingSteps: string[];
  appointmentReadyToSave: boolean;
  openScheduleSuggestion: (section: string) => void;
  formatTime: (value: string) => string;
  patientName: (patients: Dashboard["patients"], patientId: string | null) => string;
  openAppointmentEditor: (appointment: Appointment) => void;
  closeAppointmentEditor: (appointmentId: string) => void;
  updateAppointmentScheduleDraft: (appointmentId: string, key: string, value: any) => void;
  saveAppointmentSchedule: (appointmentId: string) => Promise<boolean>;
  normalizedAppointmentStatus: (value: unknown) => Appointment["status"];
  toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
  fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
  useManualSelects: boolean;
  activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
};

export function AppointmentCard(props: AppointmentCardProps) {
  const {
    appointment,
    dashboard,
    visibleScheduleSuggestions,
    appointmentReadinessById,
    appointmentLabels,
    appointmentDraft,
    appointmentSaveState,
    appointmentSaveError,
    appointmentDirty,
    appointmentEditing,
    appointmentHasOpenVisit,
    appointmentActiveVisitStatusLocked,
    appointmentMissingSteps,
    appointmentReadyToSave,
    openScheduleSuggestion,
    formatTime,
    patientName,
    openAppointmentEditor,
    closeAppointmentEditor,
    updateAppointmentScheduleDraft,
    saveAppointmentSchedule,
    normalizedAppointmentStatus,
    toDateTimeLocalValue,
    fromDateTimeLocalValue,
    useManualSelects,
    activeVisitLockedAppointmentStatuses
  } = props;

  const appointmentSuggestions = visibleScheduleSuggestions.filter(s => s.appointmentId === appointment.id);
  const readiness = appointmentReadinessById.get(appointment.id);
  const appointmentDoctor = dashboard.clinicSettings.staff.find((member) => member.id === appointment.doctorUserId);
  const appointmentAssistant = appointment.assistantUserId
    ? dashboard.clinicSettings.staff.find((member) => member.id === appointment.assistantUserId)
    : null;
  const appointmentChair = dashboard.clinicSettings.chairs.find((chair) => chair.id === appointment.chairId);
  const appointmentSaveMissingId = `appointment-save-missing-${appointment.id}`;
  const appointmentEditorId = `appointment-editor-${appointment.id}`;
  const appointmentHandoffNoteId = `appointment-handoff-note-${appointment.id}`;
  const appointmentPatientName = patientName(dashboard.patients, appointment.patientId);

  return (
    <div className="timeline-node" key={appointment.id}>
      <div className="timeline-line"></div>
      <div className="timeline-time">{formatTime(appointment.startsAt)}</div>
      
      <div className="timeline-content">
        <p style={{ display: 'none' }}>{appointment.reason}</p>
        <article className={`appointment-card ${readiness ? 'readiness-' + readiness.state : ""}`} style={{ padding: '16px', background: 'white', border: '1px solid var(--slate-200)', borderRadius: '12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="appointment-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--slate-100)', paddingBottom: '8px', marginBottom: '4px' }}>
        <div className="appointment-card-time" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {formatTime(appointment.startsAt)}
          <span style={{ fontWeight: 400, color: 'var(--slate-500)' }}>{formatTime(appointment.endsAt)}</span>
        </div>
        <span className={`appointment-card-status status-pill status-${appointment.status}`}>
          {appointmentLabels[appointment.status]}
        </span>
        {appointmentHasOpenVisit ? <span className="handoff-lock">Открыт прием: пациент закреплен</span> : null}
      </div>

      <div className="appointment-card-body">
        <h3>{appointmentPatientName}</h3>
        <div className="chip-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {appointmentSuggestions.map((suggestion) => (
            <span 
              key={suggestion.id} 
              className={`chip chip-suggestion priority-${suggestion.priority}`} 
              onClick={(e) => { e.stopPropagation(); openScheduleSuggestion(suggestion.section); }}
              style={{ 
                cursor: 'pointer', 
                background: suggestion.priority === 'urgent' ? '#fee2e2' : '#fef3c7',
                color: suggestion.priority === 'urgent' ? '#991b1b' : '#92400e',
                border: `1px solid ${suggestion.priority === 'urgent' ? '#fca5a5' : '#fcd34d'}`
              }}
              title={suggestion.detail}
            >
              ⚠️ {suggestion.title}
            </span>
          ))}
          <span className="chip chip-reason">
            {appointment.reason || "Причина не указана"}
          </span>
          <span className="chip chip-doctor">
            {appointmentDoctor?.fullName.split(" ")[0] ?? "Врач не назначен"}
          </span>
          <span className="chip chip-assistant">
            {appointmentAssistant?.fullName.split(" ")[0] ?? "ассистент не назначен"}
          </span>
          {appointmentChair && (
            <span className="chip chip-chair">{appointmentChair.name}</span>
          )}
        </div>
        {readiness && (
          <div className="appt-readiness-row">
            <span className={`readiness-dot readiness-dot-${readiness.state}`} />
            <span className="appt-next-action">{readiness.nextAction}</span>
            <span className="appt-readiness-score">{readiness.score}%</span>
          </div>
        )}
      </div>

      {appointmentHasOpenVisit ? (
        <p className="appointment-handoff-note" id={appointmentHandoffNoteId} style={{ fontSize: '12px', color: 'var(--amber)', background: 'var(--amber-50)', padding: '6px', borderRadius: '4px', marginTop: '4px' }}>
          Пациент и закрывающий статус этой записи меняются только после закрытия приема.
        </p>
      ) : null}

      <div className="appointment-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--slate-50)' }}>
        <button
          className="secondary-button appointment-edit-button"
          type="button"
          onClick={() => openAppointmentEditor(appointment)}
          aria-expanded={appointmentEditing}
          aria-controls={appointmentEditorId}
          aria-label={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}
          title={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}
          style={{ padding: '4px 12px', minHeight: '28px', fontSize: '12px' }}
        >
          Настроить
        </button>
      </div>

      {appointmentEditing ? (
        <div className="appointment-editor form-span-2" id={appointmentEditorId} aria-label={`Редактирование записи: ${appointmentPatientName}`}>
          <label>
            Начало
            <input
              type="datetime-local"
              value={toDateTimeLocalValue(appointmentDraft.startsAt, dashboard.clinicSettings.profile.timezone)}
              onChange={(event: TextFieldChangeEvent) =>
                updateAppointmentScheduleDraft(
                  appointment.id,
                  "startsAt",
                  fromDateTimeLocalValue(event.target.value, dashboard.clinicSettings.profile.timezone)
                )
              }
            />
          </label>
          <label>
            Окончание
            <input
              type="datetime-local"
              value={toDateTimeLocalValue(appointmentDraft.endsAt, dashboard.clinicSettings.profile.timezone)}
              onChange={(event: TextFieldChangeEvent) =>
                updateAppointmentScheduleDraft(
                  appointment.id,
                  "endsAt",
                  fromDateTimeLocalValue(event.target.value, dashboard.clinicSettings.profile.timezone)
                )
              }
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '16px', gridColumn: '1 / -1' }}>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Пациент</span>
              {useManualSelects || dashboard.patients.length > 20 ? (
                <select
                  value={appointmentDraft.patientId || ''}
                  onChange={(e) => updateAppointmentScheduleDraft(appointment.id, 'patientId', e.target.value)}
                  disabled={appointment.id === dashboard.activeVisit.appointmentId}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
                  aria-describedby={appointmentHasOpenVisit ? appointmentHandoffNoteId : undefined}
                >
                  <option value="">-- Выберите пациента --</option>
                  {dashboard.patients.filter(p => p.status === 'active').map(p => (
                    <option key={p.id} value={p.id}>{p.fullName}</option>
                  ))}
                </select>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {dashboard.patients
                    .filter((patient) => patient.status === "active")
                    .map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        className={`quick-chip ${appointmentDraft.patientId === patient.id ? 'active' : ''}`}
                        onClick={() => updateAppointmentScheduleDraft(appointment.id, "patientId", patient.id)}
                        disabled={appointment.id === dashboard.activeVisit.appointmentId}
                      >
                        {patient.fullName}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div>
              <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Врач</span>
              {useManualSelects ? (
                <select
                  value={appointmentDraft.doctorUserId || ''}
                  onChange={(e) => updateAppointmentScheduleDraft(appointment.id, 'doctorUserId', e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
                >
                  <option value="">-- Выберите врача --</option>
                  {dashboard.clinicSettings.staff.filter(m => m.active && (m.role === 'doctor' || m.role === 'owner')).map(m => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {dashboard.clinicSettings.staff
                    .filter((member) => member.active && (member.role === "doctor" || member.role === "owner"))
                    .map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        className={`quick-chip ${appointmentDraft.doctorUserId === member.id ? 'active' : ''}`}
                        onClick={() => updateAppointmentScheduleDraft(appointment.id, "doctorUserId", member.id)}
                        
                      >
                        {member.fullName}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {dashboard.clinicSettings.profile.mode !== "solo_doctor" && (
            <div>
              <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Ассистент</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {dashboard.clinicSettings.staff
                  .filter((member) => member.active && member.role === "assistant")
                  .map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className={`quick-chip ${appointmentDraft.assistantUserId === member.id ? 'active' : ''}`}
                      onClick={() => updateAppointmentScheduleDraft(appointment.id, "assistantUserId", appointmentDraft.assistantUserId === member.id ? "" : member.id)}
                      
                    >
                      {member.fullName}
                    </button>
                  ))}
              </div>
            </div>
            )}

            <div>
              <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Кресло</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {dashboard.clinicSettings.chairs
                  .filter((chair) => chair.active)
                  .map((chair) => (
                    <button
                      key={chair.id}
                      type="button"
                      className={`quick-chip ${appointmentDraft.chairId === chair.id ? 'active' : ''}`}
                      onClick={() => updateAppointmentScheduleDraft(appointment.id, "chairId", chair.id)}
                      
                    >
                      {chair.name}
                    </button>
                  ))}
              </div>
            </div>
            
            <div>
              <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Статус</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(Object.keys(appointmentLabels) as Appointment["status"][]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`quick-chip ${appointmentDraft.status === status ? 'active' : ''}`}
                      onClick={() => updateAppointmentScheduleDraft(appointment.id, "status", normalizedAppointmentStatus(status))}
                      
                      disabled={appointmentHasOpenVisit && activeVisitLockedAppointmentStatuses.has(status)}
                    >
                      {appointmentLabels[status]}
                    </button>
                ))}
              </div>
            </div>
          </div>
          <label className="form-span-2">
            Причина
            <input value={appointmentDraft.reason} onChange={(event: TextFieldChangeEvent) => updateAppointmentScheduleDraft(appointment.id, "reason", event.target.value)} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {["Кариес", "Пульпит", "Удаление", "Осмотр", "Профгигиена", "Консультация", "Брекеты", "Коронка", "КЛКТ", "Имплантация"].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    const currentVal = appointmentDraft.reason.trim();
                    const newVal = currentVal ? `${currentVal}, ${chip.toLowerCase()}` : chip;
                    updateAppointmentScheduleDraft(appointment.id, "reason", newVal);
                  }}
                  className="quick-chip quick-chip--sm"
                  
                  
                >
                  + {chip}
                </button>
              ))}
            </div>
          </label>
          <label className="form-span-2">
            Комментарий
            <textarea value={appointmentDraft.comment} onChange={(event: TextFieldChangeEvent) => updateAppointmentScheduleDraft(appointment.id, "comment", event.target.value)} rows={2} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {["Первичный", "Острая боль", "По ДМС", "Повторный", "Снимок с собой", "Требуется КТ"].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    const currentVal = appointmentDraft.comment.trim();
                    const newVal = currentVal ? `${currentVal}, ${chip.toLowerCase()}` : chip;
                    updateAppointmentScheduleDraft(appointment.id, "comment", newVal);
                  }}
                  className="quick-chip quick-chip--sm"
                  
                  
                >
                  + {chip}
                </button>
              ))}
            </div>
          </label>
          <div className="appointment-editor-actions">
            <div className="min-h-reserved-error" style={{ flex: 1, flexDirection: 'column' }}>
              {appointmentSaveError ? <span className="save-error">{appointmentSaveError}</span> : null}
              {appointmentMissingSteps.length ? (
                <div className="schedule-create-missing schedule-save-missing" id={appointmentSaveMissingId} role="status" aria-live="polite">
                  <strong>Чтобы сохранить запись, исправьте:</strong>
                  <ul>
                    {appointmentMissingSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <span className={`save-state save-state-${appointmentSaveState}`}>
              {appointmentSaveState === "saving"
                ? "Сохраняю"
                : appointmentSaveState === "saved"
                  ? "Сохранено"
                  : appointmentSaveState === "error"
                    ? "Ошибка сохранения"
                    : "Ждет сохранения"}
            </span>
            <button className="secondary-button" type="button" disabled={appointmentSaveState === "saving"} aria-busy={appointmentSaveState === "saving" || undefined} onClick={() => closeAppointmentEditor(appointment.id)}>
              Закрыть
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => void saveAppointmentSchedule(appointment.id)}
              disabled={appointmentSaveState === "saving" || !appointmentReadyToSave}
              aria-busy={appointmentSaveState === "saving" || undefined}
              aria-describedby={!appointmentReadyToSave && appointmentMissingSteps.length ? appointmentSaveMissingId : undefined}
            >
              Сохранить запись
            </button>
          </div>
        </div>
      ) : null}
    </article>
  </div>
</div>
  );
}

import { SmartMicrophoneButton } from '../SmartMicrophoneButton';
import type { TextFieldChangeEvent, PatientCoreDraft } from '../../PatientsView';

type PatientCoreFormProps = {
  patientCoreDraft: PatientCoreDraft;
  updatePatientCoreDraft: (field: keyof PatientCoreDraft, value: string) => void;
};

export function PatientCoreForm({ patientCoreDraft, updatePatientCoreDraft }: PatientCoreFormProps) {
  return (
    <div className="clinic-profile-form-grid patient-core-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
      <label className="form-span-2">
        ФИО пациента
        <input
          autoComplete="name"
          value={patientCoreDraft.fullName}
          onChange={(event: TextFieldChangeEvent) => updatePatientCoreDraft("fullName", event.target.value)}
          placeholder="Фамилия Имя Отчество"
        />
      </label>
      <label>
        Дата рождения
        <input
          type="date"
          autoComplete="bday"
          value={patientCoreDraft.birthDate}
          onChange={(event: TextFieldChangeEvent) => updatePatientCoreDraft("birthDate", event.target.value)}
        />
      </label>
      <label>
        Телефон
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={patientCoreDraft.phone}
          onChange={(event: TextFieldChangeEvent) => updatePatientCoreDraft("phone", event.target.value)}
          placeholder="+7..."
        />
      </label>
      <label>
        Email
        <input
          type="email"
          autoComplete="email"
          value={patientCoreDraft.email}
          onChange={(event: TextFieldChangeEvent) => updatePatientCoreDraft("email", event.target.value)}
          placeholder="patient@example.ru"
        />
      </label>
      <div className="form-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-700)' }}>Заметки для команды</span>
          <SmartMicrophoneButton
            context="general"
            onResult={(t: string) => {
              const prev = patientCoreDraft.notes || "";
              updatePatientCoreDraft("notes", prev ? `${prev}, ${t}` : t);
            }}
          />
        </div>
        <textarea
          value={patientCoreDraft.notes}
          onChange={(event: TextFieldChangeEvent) => updatePatientCoreDraft("notes", event.target.value)}
          placeholder="важное для связи, приема и документов"
          rows={3}
          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--slate-300)', fontSize: '14px', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
          {["Очень тревожный", "Сложный пациент", "VIP", "Просит звонить заранее", "Часто отменяет", "Плохо переносит анестезию", "Должник", "Рвотный рефлекс"].map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                const currentVal = patientCoreDraft.notes.trim();
                const newVal = currentVal ? `${currentVal}, ${chip.toLowerCase()}` : chip;
                updatePatientCoreDraft("notes", newVal);
              }}
              style={{ padding: '2px 8px', fontSize: '12px', background: 'var(--slate-100)', border: '1px solid var(--slate-200)', borderRadius: '12px', cursor: 'pointer', color: 'var(--slate-700)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--slate-200)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--slate-100)'; }}
            >
              + {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

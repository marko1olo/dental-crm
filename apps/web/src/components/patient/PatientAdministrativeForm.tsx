import type { TextFieldChangeEvent, PatientAdministrativeProfileDraft, WeekdayOption } from '../../PatientsView';

type PatientAdministrativeFormProps = {
  patientAdministrativeProfileDraft: PatientAdministrativeProfileDraft;
  updatePatientAdministrativeProfileDraft: (field: keyof PatientAdministrativeProfileDraft, value: string | number[]) => void;
  weekdayOptions: WeekdayOption[];
  normalizeOptionalWorkingDaysDraft: (days: number[]) => number[];
};

export function PatientAdministrativeForm({
  patientAdministrativeProfileDraft,
  updatePatientAdministrativeProfileDraft,
  weekdayOptions,
  normalizeOptionalWorkingDaysDraft
}: PatientAdministrativeFormProps) {
  return (
    <div className="clinic-profile-form-grid patient-admin-form-grid">
      <label>
        Документ пациента
        <input
          autoComplete="off"
          value={patientAdministrativeProfileDraft.identityDocument}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("identityDocument", event.target.value)}
          placeholder="паспорт РФ 0000 000000"
        />
      </label>
      <label>
        ИНН пациента
        <input
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          value={patientAdministrativeProfileDraft.taxpayerInn}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("taxpayerInn", event.target.value.replace(/[^\d]/g, "").slice(0, 12))}
          placeholder="10 или 12 цифр"
        />
      </label>
      <label>
        Адрес регистрации
        <input
          autoComplete="street-address"
          value={patientAdministrativeProfileDraft.registrationAddress}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("registrationAddress", event.target.value)}
          placeholder="индекс, город, улица, дом"
        />
      </label>
      <label>
        Адрес проживания
        <input
          autoComplete="street-address"
          value={patientAdministrativeProfileDraft.residentialAddress}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("residentialAddress", event.target.value)}
          placeholder="если отличается"
        />
      </label>
      <label>
        Полис / ДМС
        <input
          autoComplete="off"
          value={patientAdministrativeProfileDraft.insurancePolicyNumber}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("insurancePolicyNumber", event.target.value)}
          placeholder="номер при наличии"
        />
      </label>
      <label>
        СНИЛС
        <input
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9 -]*"
          value={patientAdministrativeProfileDraft.snils}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("snils", event.target.value)}
          placeholder="000-000-000 00"
        />
      </label>
      <label>
        Законный представитель
        <input
          autoComplete="off"
          value={patientAdministrativeProfileDraft.legalRepresentativeFullName}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("legalRepresentativeFullName", event.target.value)}
          placeholder="ФИО представителя"
        />
      </label>
      <label>
        Основание
        <input
          autoComplete="off"
          value={patientAdministrativeProfileDraft.legalRepresentativeRelationship}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("legalRepresentativeRelationship", event.target.value)}
          placeholder="родитель, опекун, доверенность"
        />
      </label>
      <label>
        Документ представителя
        <input
          autoComplete="off"
          value={patientAdministrativeProfileDraft.legalRepresentativeIdentityDocument}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("legalRepresentativeIdentityDocument", event.target.value)}
          placeholder="паспорт / доверенность"
        />
      </label>
      <label>
        Телефон представителя
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={patientAdministrativeProfileDraft.legalRepresentativePhone}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("legalRepresentativePhone", event.target.value)}
          placeholder="+7..."
        />
      </label>
      <label className="form-span-2">
        Кому выдавать документы
        <input
          autoComplete="off"
          value={patientAdministrativeProfileDraft.preferredDocumentRecipient}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("preferredDocumentRecipient", event.target.value)}
          placeholder="пациенту / представителю / доверенному лицу"
        />
      </label>
      <div className="form-span-2 patient-appointment-preferences">
        <span>Удобные дни записи</span>
        <div className="weekday-toggle-row" role="group" aria-label="Удобные дни записи пациента">
          {weekdayOptions.map((day) => {
            const weekdaySelected = patientAdministrativeProfileDraft.preferredAppointmentWeekdays.includes(day.value);
            return (
              <button
                aria-pressed={weekdaySelected}
                className={weekdaySelected ? "active" : ""}
                key={`patient-weekday-${day.value}`}
                type="button"
                onClick={() => {
                  const currentDays = patientAdministrativeProfileDraft.preferredAppointmentWeekdays;
                  const nextDays = weekdaySelected
                    ? currentDays.filter((item) => item !== day.value)
                    : [...currentDays, day.value];
                  updatePatientAdministrativeProfileDraft("preferredAppointmentWeekdays", normalizeOptionalWorkingDaysDraft(nextDays));
                }}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>
      <label>
        Удобно с
        <input
          type="time"
          value={patientAdministrativeProfileDraft.preferredAppointmentStart}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("preferredAppointmentStart", event.target.value)}
        />
      </label>
      <label>
        Удобно до
        <input
          type="time"
          value={patientAdministrativeProfileDraft.preferredAppointmentEnd}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("preferredAppointmentEnd", event.target.value)}
        />
      </label>
      <label className="form-span-2">
        Комментарий к записи
        <input
          autoComplete="off"
          value={patientAdministrativeProfileDraft.preferredAppointmentNote}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("preferredAppointmentNote", event.target.value)}
          placeholder="например: только утро, не звонить после 19:00, нужен сопровождающий"
        />
      </label>
      <label className="form-span-2">
        Основание обработки ПДн
        <input
          autoComplete="off"
          value={patientAdministrativeProfileDraft.dataProcessingBasisNote}
          onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("dataProcessingBasisNote", event.target.value)}
          placeholder="согласие пациента, представитель, договор, иной законный контекст"
        />
      </label>
    </div>
  );
}

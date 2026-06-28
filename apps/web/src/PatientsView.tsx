import { usePatientStore } from "./store/patientStore";
import { ArrowRight, Plus, Search, ShieldCheck, UserCheck } from "lucide-react";
import type { ChangeEvent } from "react";
import type { Dashboard, Patient, PatientAdministrativeProfile } from "@dental/shared";

type PatientInsight = Dashboard["patientInsights"][number];
type PatientCoreSaveState = "idle" | "saving" | "saved" | "error";
type PatientAdministrativeProfileSaveState = "idle" | "saving" | "saved" | "error";

type PatientCoreDraft = {
  fullName: string;
  birthDate: string;
  phone: string;
  email: string;
  notes: string;
};

type PatientAdministrativeProfileDraft = {
  [K in Exclude<keyof PatientAdministrativeProfile, "preferredAppointmentWeekdays">]: string;
} & {
  preferredAppointmentWeekdays: number[];
};

type WeekdayOption = {
  label: string;
  value: number;
};

type PatientsViewProps = {
  createPatient: () => void | Promise<void>;
  filteredPatients: Patient[];
  money: (amountRub: number) => string;
  normalizeOptionalWorkingDaysDraft: (days: number[]) => number[];
  patientAdministrativeProfileValidationMessage: string | null;
  patientInsightById: Map<string, PatientInsight>;
  patientInsightRiskLabels: Record<PatientInsight["riskLevel"], string>;
  query: string;
  savePatientAdministrativeProfile: () => void | Promise<void | boolean>;
  savePatientCore: () => void | Promise<void | boolean>;
  selectedPatient: Patient | null | undefined;
  setQuery: (value: string) => void;
  updatePatientAdministrativeProfileDraft: (field: keyof PatientAdministrativeProfileDraft, value: string | number[]) => void;
  updatePatientCoreDraft: (field: keyof PatientCoreDraft, value: string) => void;
  weekdayOptions: WeekdayOption[];
};

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function PatientsView(props: PatientsViewProps) {
  const {
    selectedPatientId,
    patientCoreDraft,
    patientCoreSaveState,
    patientCoreDirty,
    patientAdministrativeProfileDraft,
    patientAdministrativeProfileSaveState,
    patientAdministrativeProfileDirty,
    newPatientName,
    newPatientPhone,
    newPatientBirthDate,
    isPatientCreating,
    newRulePatientText,
    setSelectedPatientId,
    setPatientCoreDraft,
    setPatientCoreSaveState,
    setPatientCoreDirty,
    setPatientAdministrativeProfileDraft,
    setPatientAdministrativeProfileSaveState,
    setPatientAdministrativeProfileDirty,
    setNewPatientName,
    setNewPatientPhone,
    setNewPatientBirthDate,
    setIsPatientCreating,
    setNewRulePatientText
  } = usePatientStore();
  const {
    createPatient,
    filteredPatients,
    money,
    normalizeOptionalWorkingDaysDraft,
    patientAdministrativeProfileValidationMessage,
    patientInsightById,
    patientInsightRiskLabels,
    query,
    savePatientAdministrativeProfile,
    savePatientCore,
    selectedPatient,
    setQuery,
    updatePatientAdministrativeProfileDraft,
    updatePatientCoreDraft,
    weekdayOptions
  } = props;

  const patientNameReady = newPatientName.trim().length > 0;
  const patientCreatePhoneIssue = newPatientPhone.trim().length > 0 && newPatientPhone.replace(/\D/g, "").length < 5;
  const patientCreateReady = patientNameReady && !patientCreatePhoneIssue && !isPatientCreating;
  const patientCreateGuidance = !patientNameReady
    ? "Укажите ФИО пациента. Телефон и дату рождения можно добавить позже."
    : patientCreatePhoneIssue
      ? "Телефон пациента слишком короткий. Исправьте номер или очистите поле."
      : null;
  const patientCoreNameMissing = patientCoreDraft.fullName.trim().length === 0;
  const patientCoreReadyToSave =
    Boolean(selectedPatient) && patientCoreDirty && patientCoreSaveState !== "saving" && !patientCoreNameMissing;
  const patientAdministrativeProfileReadyToSave =
    Boolean(selectedPatient) &&
    patientAdministrativeProfileDirty &&
    patientAdministrativeProfileSaveState !== "saving" &&
    !patientAdministrativeProfileValidationMessage;
  const patientCoreSaveGuidanceId = "patient-core-save-guidance";
  const patientAdministrativeSaveGuidanceId = "patient-admin-save-guidance";
  const patientCoreSaveGuidance = !selectedPatient
    ? "Выберите пациента перед сохранением карточки."
    : patientCoreNameMissing
      ? "ФИО пациента обязательно для расписания, документов и связи."
      : patientCoreSaveState === "saving"
        ? "Карточка пациента уже сохраняется."
        : !patientCoreDirty
          ? "В карточке пациента нет новых изменений."
          : null;
  const patientAdministrativeSaveGuidance = !selectedPatient
    ? "Выберите пациента перед сохранением реквизитов."
    : patientAdministrativeProfileValidationMessage
      ? patientAdministrativeProfileValidationMessage
      : patientAdministrativeProfileSaveState === "saving"
        ? "Реквизиты пациента уже сохраняются."
        : !patientAdministrativeProfileDirty
          ? "В реквизитах пациента нет новых изменений."
          : null;

  return (
          <div className="panel patients-panel" id="patients">
            <div className="panel-heading">
              <h2>Быстрый поиск</h2>
              <div className="search-box">
                <Search aria-hidden="true" />
                <input
                  aria-label="Поиск пациента"
                  type="search"
                  autoComplete="off"
                  value={query}
                  onChange={(event: TextFieldChangeEvent) => setQuery(event.target.value)}
                  placeholder="ФИО или телефон"
                />
              </div>
            </div>
            <div className="quick-create">
              <input
                aria-label="ФИО нового пациента"
                autoComplete="name"
                value={newPatientName}
                onChange={(event: TextFieldChangeEvent) => setNewPatientName(event.target.value)}
                placeholder="Новый пациент"
              />
              <input
                aria-label="Телефон нового пациента"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={newPatientPhone}
                onChange={(event: TextFieldChangeEvent) => setNewPatientPhone(event.target.value)}
                placeholder="+7 телефон"
              />
              <input
                aria-label="Дата рождения нового пациента"
                type="date"
                autoComplete="bday"
                value={newPatientBirthDate}
                onChange={(event: TextFieldChangeEvent) => setNewPatientBirthDate(event.target.value)}
              />
              <button
                className="primary-button quick-create-action"
                type="button"
                title="Создать пациента"
                onClick={createPatient}
                aria-describedby={patientCreateGuidance ? "patient-create-guidance" : undefined}
                disabled={!patientCreateReady}
                aria-busy={isPatientCreating || undefined}
              >
                <Plus aria-hidden="true" /> Создать
              </button>
            </div>
            {patientCreateGuidance ? (
              <p className="quick-create-guidance" id="patient-create-guidance" role="status" aria-live="polite">
                {patientCreateGuidance}
              </p>
            ) : null}
            <div className="patient-list">
              {filteredPatients.map((patient) => {
                const insight = patientInsightById.get(patient.id);
                const patientIsSelected = selectedPatient?.id === patient.id;
                return (
                  <article className={`patient-row ${insight ? `risk-${insight.riskLevel}` : ""} ${patientIsSelected ? "selected" : ""}`} key={patient.id}>
                    <div>
                      <h3>{patient.fullName}</h3>
                      <p>{patient.phone ?? "телефон не указан"}</p>
                      {insight ? (
                        <div className="patient-row-meta">
                          <span>{patientInsightRiskLabels[insight.riskLevel]}</span>
                          <strong className="patient-next-action">{insight.nextBestAction}</strong>
                          {insight.balanceDueRub ? <span>{money(insight.balanceDueRub)}</span> : null}
                        </div>
                      ) : null}
                    </div>
                    <button
                      aria-label={`Открыть карточку пациента: ${patient.fullName}`}
                      aria-pressed={patientIsSelected}
                      className="round-link"
                      type="button"
                      title={`Открыть карточку пациента: ${patient.fullName}`}
                      onClick={() => setSelectedPatientId(patient.id)}
                    >
                      <ArrowRight aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
              {filteredPatients.length === 0 ? (
                <article className="patient-empty-state">
                  <Search aria-hidden="true" />
                  <div>
                    <strong>Пациент не найден</strong>
                    <p>Проверьте ФИО или телефон. Если это новый пациент, заполните строку выше и нажмите «Создать».</p>
                  </div>
                </article>
              ) : null}
            </div>
            <section className="patient-admin-panel" aria-label="Административные данные активного пациента">
              <div className="panel-heading compact-heading">
                <div>
                  <p className="eyebrow">Карточка и документы пациента</p>
                  <h3>{selectedPatient?.fullName ?? "Пациент не выбран"}</h3>
                </div>
                <span className={`status-pill status-${patientCoreSaveState === "error" || patientAdministrativeProfileSaveState === "error" ? "cancelled" : "confirmed"}`}>
                  {patientCoreSaveState === "saving"
                    ? "карточка сохраняется"
                    : patientAdministrativeProfileSaveState === "saving"
                      ? "документы сохраняются"
                      : patientCoreSaveState === "error" || patientAdministrativeProfileSaveState === "error"
                        ? "ошибка"
                        : patientCoreDirty || patientAdministrativeProfileDirty
                          ? "Ждет сохранения"
                          : "сохранено"}
                </span>
              </div>
              <div className="clinic-profile-form-grid patient-core-form-grid">
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
                <label className="form-span-2">
                  Заметки для команды
                  <textarea
                    value={patientCoreDraft.notes}
                    onChange={(event: TextFieldChangeEvent) => updatePatientCoreDraft("notes", event.target.value)}
                    placeholder="важное для связи, приема и документов"
                    rows={2}
                  />
                </label>
              </div>
              <div className="patient-admin-actions">
                <p>ФИО, дата рождения и контакты сразу используются в расписании, документах, налоговых формах, Telegram-связи и напоминаниях.</p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={savePatientCore}
                  aria-busy={patientCoreSaveState === "saving" || undefined}
                  aria-describedby={patientCoreSaveGuidance ? patientCoreSaveGuidanceId : undefined}
                  disabled={!patientCoreReadyToSave}
                >
                  <UserCheck aria-hidden="true" /> Сохранить карточку
                </button>
              </div>
              {patientCoreSaveGuidance ? (
                <p className="patient-save-guidance" id={patientCoreSaveGuidanceId} role="status" aria-live="polite">
                  {patientCoreSaveGuidance}
                </p>
              ) : null}
            <details className="settings-advanced-block patient-docs-collapsible">
              <summary className="settings-advanced-toggle">
                <span className="settings-advanced-label">
                  <span className="settings-advanced-icon">📝</span>
                  Реквизиты и пожелания для документов
                </span>
                <span className="settings-advanced-hint">Паспорт, ИНН, представитель, удобное время</span>
                <span className="settings-advanced-chevron">▼</span>
              </summary>
              <div className="settings-advanced-form">
                <div className="panel-heading compact-heading patient-doc-heading">
                  <div>
                    <p className="eyebrow">Реквизиты для документов</p>
                    <h3>{selectedPatient?.fullName ?? "Пациент не выбран"}</h3>
                  </div>
                  <span className={`status-pill status-${patientAdministrativeProfileSaveState === "error" || patientAdministrativeProfileValidationMessage ? "cancelled" : "confirmed"}`}>
                    {patientAdministrativeProfileSaveState === "saving"
                      ? "сохранение"
                      : patientAdministrativeProfileSaveState === "saved"
                        ? "сохранено"
                        : patientAdministrativeProfileSaveState === "error" || patientAdministrativeProfileValidationMessage
                          ? "ошибка"
                          : patientAdministrativeProfileDirty
                            ? "Ждет сохранения"
                            : "локально"}
                  </span>
                </div>
                {patientAdministrativeProfileValidationMessage ? (
                  <p className="save-error patient-admin-validation">{patientAdministrativeProfileValidationMessage}</p>
                ) : null}
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
              <div className="patient-admin-actions">
                <p>Эти данные подставляются в согласия, запросы копий меддокументации и расписки о выдаче. Пустые поля не печатаются.</p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={savePatientAdministrativeProfile}
                  aria-busy={patientAdministrativeProfileSaveState === "saving" || undefined}
                  aria-describedby={patientAdministrativeSaveGuidance ? patientAdministrativeSaveGuidanceId : undefined}
                  disabled={!patientAdministrativeProfileReadyToSave}
                >
                  <ShieldCheck aria-hidden="true" /> Сохранить для документов
                </button>
              </div>
              {patientAdministrativeSaveGuidance ? (
                <p className="patient-save-guidance" id={patientAdministrativeSaveGuidanceId} role="status" aria-live="polite">
                  {patientAdministrativeSaveGuidance}
                </p>
              ) : null}
              </div>
            </details>
            </section>
          </div>

          );
}

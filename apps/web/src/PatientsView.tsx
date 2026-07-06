import { usePatientStore } from "./store/patientStore";
import { ArrowRight, Plus, Search, ShieldCheck, UserCheck } from "lucide-react";
import { useState } from "react";
import { SmartMicrophoneButton } from './components/SmartMicrophoneButton';
import type { ChangeEvent } from "react";
import type { Dashboard, Patient, PatientAdministrativeProfile } from "@dental/shared";
import { DictationHints } from "./DictationHints";
import { SmartParsePreview } from "./SmartParsePreview";
import { parsePatientDictationLocal } from "./lib/smartPatientParser";
import { OdontogramModule } from "./components/odontogram/OdontogramModule";
import { VisiographAnalyzer } from "./components/imaging/VisiographAnalyzer";

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

  const [smartInputText, setSmartInputText] = useState("");
  const [showSmartPreview, setShowSmartPreview] = useState(false);
  const [smartParsedData, setSmartParsedData] = useState<any>(null);
  const [showHints, setShowHints] = useState(false);
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
    <div className="patients-panel" id="patients">
      <header className="patients-header">
        <div className="patients-search-box">
          <Search aria-hidden="true" />
          <input
            aria-label="Поиск пациента"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event: TextFieldChangeEvent) => setQuery(event.target.value)}
            placeholder="Поиск пациента: ФИО или телефон"
          />
        </div>
        <div className="smart-create-group">
          <div className="smart-input-wrapper">
            <input
              aria-label="ФИО или 'Иванов 89001234567 12.05.1990'"
              autoComplete="name"
              value={smartInputText}
              onChange={(event: TextFieldChangeEvent) => {
                setSmartInputText(event.target.value);
                setNewPatientName(event.target.value); // Sync for normal usage
              }}
              onFocus={() => setShowHints(true)}
              onBlur={() => setTimeout(() => setShowHints(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && smartInputText.trim()) {
                  e.preventDefault();
                  const parsed = parsePatientDictationLocal(smartInputText);
                  setSmartParsedData(parsed);
                  setShowSmartPreview(true);
                  setShowHints(false);
                }
              }}
              placeholder="Умный ввод: ФИО Телефон Дата (Enter)"
            />
            <SmartMicrophoneButton
              context="patient"
              onResult={(text) => {
                setSmartInputText(text);
                const parsed = parsePatientDictationLocal(text);
                setSmartParsedData(parsed);
                setShowSmartPreview(true);
                setShowHints(false);
              }}
              style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <DictationHints isVisible={showHints} type="patient" />
            <SmartParsePreview 
              isVisible={showSmartPreview}
              parsedData={smartParsedData}
              rawText={smartInputText}
              type="patient"
              onApply={(data: Record<string, string | undefined>) => {
                if (data) {
                  setNewPatientName(data.fullName || smartInputText);
                  if (data.phone) setNewPatientPhone(data.phone);
                  if (data.birthDate) setNewPatientBirthDate(data.birthDate);
                  if (data.notes) updatePatientCoreDraft("notes", data.notes);
                }
                setShowSmartPreview(false);
                setSmartInputText(data?.fullName || "");
              }}
              onManual={() => setShowSmartPreview(false)}
              onClose={() => setShowSmartPreview(false)}
            />
          </div>
          <button
            className="btn-primary"
            type="button"
            title="Создать пациента"
            onClick={createPatient}
            aria-describedby={patientCreateGuidance ? "patient-create-guidance" : undefined}
            disabled={!patientCreateReady}
            aria-busy={isPatientCreating || undefined}
          >
            <Plus aria-hidden="true" size={18} /> Создать
          </button>
        </div>
      </header>
      
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
              <div className="panel-heading compact-heading" style={{ borderBottom: 'none', paddingBottom: '0', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Карточка пациента</span>
                </div>
                <span className={`status-pill status-${patientCoreSaveState === "error" || patientAdministrativeProfileSaveState === "error" ? "cancelled" : "confirmed"}`}>
                  {patientCoreSaveState === "saving"
                    ? "сохранение"
                    : patientAdministrativeProfileSaveState === "saving"
                      ? "сохранение"
                      : patientCoreSaveState === "error" || patientAdministrativeProfileSaveState === "error"
                        ? "ошибка"
                        : patientCoreDirty || patientAdministrativeProfileDirty
                          ? "Ждет сохранения"
                          : "сохранено"}
                </span>
              </div>
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
                      onResult={(t) => {
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
              <div className="patient-admin-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-start' }}>
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

              {/* Odontogram Section */}
                <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                  {selectedPatient && <OdontogramModule patientId={selectedPatient.id} />}
                </div>

              {/* ShadowAnalyst — AI 2D X-Ray Analyzer */}
              <VisiographAnalyzer />

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
                <div className="panel-heading compact-heading patient-doc-heading" style={{ borderBottom: 'none', paddingBottom: '0', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Реквизиты для документов</span>
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
                <details className="patient-admin-details" style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--slate-700)' }}>Дополнительные документы и адреса (развернуть)</summary>
                  <div style={{ marginTop: '12px' }}>
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
                  </div>
                </details>
              <div className="patient-admin-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-start' }}>
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

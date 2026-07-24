import { usePatientStore } from "./store/patientStore";
import { ArrowRight, Plus, Search, ShieldCheck, UserCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { SmartMicrophoneButton } from './components/SmartMicrophoneButton';
import type { ChangeEvent } from "react";
import type { Dashboard, Patient, PatientAdministrativeProfile } from "@dental/shared";
import { DictationHints } from "./DictationHints";
import { SmartParsePreview } from "./SmartParsePreview";
import { parsePatientDictationLocal } from "./lib/smartPatientParser";
import { Odontogram } from "./components/Odontogram";
import { VisiographAnalyzer } from "./components/imaging/VisiographAnalyzer";
import { PatientOverviewTab } from "./components/patients/PatientOverviewTab";
import { useAppLogicContext } from "./contexts/AppLogicContext";

type PatientInsight = Dashboard["patientInsights"][number];
type PatientCoreSaveState = "idle" | "saving" | "saved" | "error";
type PatientAdministrativeProfileSaveState = "idle" | "saving" | "saved" | "error";

export type PatientCoreDraft = {
  fullName: string;
  birthDate: string;
  phone: string;
  email: string;
  notes: string;
};

export type PatientAdministrativeProfileDraft = {
  [K in Exclude<keyof PatientAdministrativeProfile, "preferredAppointmentWeekdays">]: string;
} & {
  preferredAppointmentWeekdays: number[];
};

export type WeekdayOption = {
  label: string;
  value: number;
};

export type PatientsViewProps = {
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

export type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function PatientsView(rawProps?: Partial<PatientsViewProps>) {
  const logicContext = useAppLogicContext();
  const props = { ...logicContext, ...rawProps } as PatientsViewProps;
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
    setSelectedPatientId,
    setNewPatientName,
    setNewPatientPhone,
    setNewPatientBirthDate,
  } = usePatientStore();

  const [smartInputText, setSmartInputText] = useState("");
  const [showSmartPreview, setShowSmartPreview] = useState(false);
  const [smartParsedData, setSmartParsedData] = useState<ReturnType<typeof parsePatientDictationLocal> | null>(null);
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
    updatePatientCoreDraft,
    updatePatientAdministrativeProfileDraft,
    weekdayOptions
  } = props;

  useEffect(() => {
    if (!selectedPatientId && filteredPatients.length > 0 && filteredPatients[0]?.id) {
      setSelectedPatientId(filteredPatients[0].id);
    }
  }, [selectedPatientId, filteredPatients, setSelectedPatientId]);

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
              aria-label="Быстрый ввод пациентов"
              autoComplete="name"
              value={smartInputText}
              onChange={(event: TextFieldChangeEvent) => {
                setSmartInputText(event.target.value);
                setNewPatientName(event.target.value);
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
              placeholder="ФИО, телефон, дата рождения (Enter)"
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
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              title="Телефон нового пациента"
              placeholder="Телефон пациента"
              value={newPatientPhone}
              onChange={(e) => setNewPatientPhone(e.target.value)}
              style={{ display: "none" }}
            />
            <input
              type="date"
              autoComplete="bday"
              title="Дата рождения пациента"
              placeholder="Дата рождения"
              value={newPatientBirthDate}
              onChange={(e) => setNewPatientBirthDate(e.target.value)}
              style={{ display: "none" }}
            />
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
            className="primary-button quick-create-action"
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

      <div className="patients-main-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: '16px', marginTop: '16px' }}>
        {/* Left Column: Patient List */}
        <div className="patient-list">
          {filteredPatients.map((patient) => {
            const insight = patientInsightById.get(patient.id);
            const patientIsSelected = selectedPatient?.id === patient.id;
            return (
              <article className={`patient-row ${insight ? `risk-${insight.riskLevel}` : ""} ${patientIsSelected ? "selected" : ""}`} key={patient.id}>
                <div>
                  <h3>{patient.fullName}</h3>
                  <p>{patient.phone ?? "Телефон не указан"}</p>
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
                <p>Проверьте ФИО или телефон. Чтобы добавить нового пациента, введите ФИО выше и нажмите «Создать».</p>
              </div>
            </article>
          ) : null}
        </div>

        {/* Right Column: Selected Patient Details & Widgets */}
        <section className="patient-admin-panel" aria-label="Карточка активного пациента">
          <div className="panel-heading compact-heading" style={{ borderBottom: 'none', paddingBottom: '0', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
                {selectedPatient ? selectedPatient.fullName : "Карточка пациента"}
              </span>
            </div>
            <span className={`status-pill status-${patientCoreSaveState === "error" || patientAdministrativeProfileSaveState === "error" ? "cancelled" : "confirmed"}`}>
              {patientCoreSaveState === "saving"
                ? "Сохраняю..."
                : patientAdministrativeProfileSaveState === "saving"
                  ? "Сохраняю..."
                  : patientCoreSaveState === "error" || patientAdministrativeProfileSaveState === "error"
                    ? "Ошибка"
                    : patientCoreDirty || patientAdministrativeProfileDirty
                      ? "Не сохранено"
                      : "Сохранено"}
            </span>
          </div>

          {/* Core Info Form */}
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
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Заметки и особенности</span>
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
                placeholder="Особые пожелания, аллергии, примечания"
                rows={3}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '14px', resize: 'vertical', background: 'var(--paper)', color: 'var(--ink)' }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                {["Аллергия на анестезию", "Боится уколов", "VIP", "Денег не считает", "Часто отменяет", "Ортодонтический пациент", "Семья", "Согласовать скидку"].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      const currentVal = patientCoreDraft.notes.trim();
                      const newVal = currentVal ? `${currentVal}, ${chip.toLowerCase()}` : chip;
                      updatePatientCoreDraft("notes", newVal);
                    }}
                    style={{ padding: '2px 8px', fontSize: '12px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px', cursor: 'pointer', color: 'var(--ink)' }}
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
              <UserCheck aria-hidden="true" /> Сохранить данные
            </button>
          </div>
          {patientCoreSaveGuidance ? (
            <p className="patient-save-guidance" id={patientCoreSaveGuidanceId} role="status" aria-live="polite">
              {patientCoreSaveGuidance}
            </p>
          ) : null}

          {/* PROMINENT OVERVIEW TAB: FAMILY, LOYALTY, RECLAMATIONS, ORTHODONTIC, TIMELINE, ARCHIVE */}
          {selectedPatient ? (
            <div style={{ marginTop: "24px" }} data-testid="patient-overview-tab">
              <PatientOverviewTab />
            </div>
          ) : null}

          {/* Clinical Tools: Odontogram & 2D X-Ray Analyzer */}
          <div style={{ marginTop: '24px', marginBottom: '16px' }}>
            <Odontogram />
          </div>

          <VisiographAnalyzer />

          {/* Administrative / Passport Documents Collapsible */}
          <details className="settings-advanced-block patient-docs-collapsible" style={{ marginTop: '24px' }}>
            <summary className="settings-advanced-toggle">
              <span className="settings-advanced-label">
                <span className="settings-advanced-icon">📄</span>
                Паспортные данные и реквизиты документов
              </span>
              <span className="settings-advanced-hint">Паспорт, ИНН, СНИЛС, представитель, договор</span>
              <span className="settings-advanced-chevron"> </span>
            </summary>
            <div className="settings-advanced-form">
              <div className="panel-heading compact-heading patient-doc-heading" style={{ borderBottom: 'none', paddingBottom: '0', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>Документы и СНИЛС</span>
                </div>
                <span className={`status-pill status-${patientAdministrativeProfileSaveState === "error" || patientAdministrativeProfileValidationMessage ? "cancelled" : "confirmed"}`}>
                  {patientAdministrativeProfileSaveState === "saving"
                    ? "Сохраняю..."
                    : patientAdministrativeProfileSaveState === "saved"
                      ? "Сохранено"
                      : patientAdministrativeProfileSaveState === "error" || patientAdministrativeProfileValidationMessage
                        ? "Ошибка"
                        : patientAdministrativeProfileDirty
                          ? "Не сохранено"
                          : "Заполнено"}
                </span>
              </div>
              {patientAdministrativeProfileValidationMessage ? (
                <p className="save-error patient-admin-validation">{patientAdministrativeProfileValidationMessage}</p>
              ) : null}
              
              <div className="clinic-profile-form-grid patient-admin-form-grid">
                <label>
                  Паспорт / Документ
                  <input
                    autoComplete="off"
                    value={patientAdministrativeProfileDraft.identityDocument}
                    onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("identityDocument", event.target.value)}
                    placeholder="Паспорт РФ 0000 000000"
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
                    placeholder="Индекс, город, улица, дом"
                  />
                </label>
                <label>
                  Адрес проживания
                  <input
                    autoComplete="street-address"
                    value={patientAdministrativeProfileDraft.residentialAddress}
                    onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("residentialAddress", event.target.value)}
                    placeholder="Если отличается"
                  />
                </label>
                <label>
                  Полис ДМС / ОМС
                  <input
                    autoComplete="off"
                    value={patientAdministrativeProfileDraft.insurancePolicyNumber}
                    onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("insurancePolicyNumber", event.target.value)}
                    placeholder="Номер полиса"
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
                  ФИО представителя
                  <input
                    autoComplete="off"
                    value={patientAdministrativeProfileDraft.legalRepresentativeFullName}
                    onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("legalRepresentativeFullName", event.target.value)}
                    placeholder="ФИО представителя"
                  />
                </label>
                <label>
                  Кем приходится
                  <input
                    autoComplete="off"
                    value={patientAdministrativeProfileDraft.legalRepresentativeRelationship}
                    onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("legalRepresentativeRelationship", event.target.value)}
                    placeholder="Родитель, опекун"
                  />
                </label>
                <label>
                  Паспорт представителя
                  <input
                    autoComplete="off"
                    value={patientAdministrativeProfileDraft.legalRepresentativeIdentityDocument}
                    onChange={(event: TextFieldChangeEvent) => updatePatientAdministrativeProfileDraft("legalRepresentativeIdentityDocument", event.target.value)}
                    placeholder="Паспорт / сессия"
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
                <div className="form-span-2 patient-appointment-preferences">
                  <span>Предпочитаемые дни приема</span>
                  <div className="weekday-toggle-row" role="group" aria-label="Предпочитаемые дни приема пациента">
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
              </div>

              <div className="patient-admin-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  className="primary-button"
                  type="button"
                  onClick={savePatientAdministrativeProfile}
                  aria-busy={patientAdministrativeProfileSaveState === "saving" || undefined}
                  aria-describedby={patientAdministrativeSaveGuidance ? patientAdministrativeSaveGuidanceId : undefined}
                  disabled={!patientAdministrativeProfileReadyToSave}
                >
                  <ShieldCheck aria-hidden="true" /> Сохранить реквизиты
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
    </div>
  );
}

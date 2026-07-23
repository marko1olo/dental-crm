import { usePatientStore } from "./store/patientStore";
import { ArrowRight, Plus, Search, ShieldCheck, UserCheck } from "lucide-react";
import { useState } from "react";
import { SmartMicrophoneButton } from './components/SmartMicrophoneButton';
import type { ChangeEvent } from "react";
import type { Dashboard, Patient, PatientAdministrativeProfile } from "@dental/shared";
import { DictationHints } from "./DictationHints";
import { SmartParsePreview } from "./SmartParsePreview";
import { parsePatientDictationLocal } from "./lib/smartPatientParser";
import { Odontogram } from "./components/Odontogram";
import { VisiographAnalyzer } from "./components/imaging/VisiographAnalyzer";
import { PatientCoreForm } from "./components/patient/PatientCoreForm";
import { PatientAdministrativeForm } from "./components/patient/PatientAdministrativeForm";

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

export type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

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
              <PatientCoreForm patientCoreDraft={patientCoreDraft} updatePatientCoreDraft={updatePatientCoreDraft} />
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
                 <Odontogram />
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
                <PatientAdministrativeForm patientAdministrativeProfileDraft={patientAdministrativeProfileDraft} updatePatientAdministrativeProfileDraft={updatePatientAdministrativeProfileDraft} weekdayOptions={weekdayOptions} normalizeOptionalWorkingDaysDraft={normalizeOptionalWorkingDaysDraft} />
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

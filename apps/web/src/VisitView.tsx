// @ts-nocheck
import React, { Suspense } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Bot, Check, CheckCircle2, ClipboardCheck, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { getToothPath, getToothConfig } from "./utils/toothGeometry";

export interface VisitViewProps {
  AlertTriangle: any;
  Bot: any;
  Check: any;
  CheckCircle2: any;
  ClinicalRulePanel: any;
  ClipboardCheck: any;
  Mic: any;
  Sparkles: any;
  acceptDraftToVisit: any;
  activeAppointment: any;
  activeChair: any;
  activeDoctor: any;
  activeImagingStudies: any;
  activePatient: any;
  activeUsableDocuments: any;
  activeVisitClinicalRuleEvaluations: any;
  activeVisitClinicalRuleSummary: any;
  appendToTranscript: any;
  applyProtocolTemplate: any;
  buildDraft: any;
  buildOfflineDraft: any;
  clearTranscriptWithUndo: any;
  clearedTranscriptSnapshot: any;
  clinicalRuleActionLabels: any;
  clinicalRuleSeverityLabels: any;
  dashboard: any;
  dictationQuickPhrases: any;
  draft: any;
  emptyDictationVoiceActionLabel: any;
  flushPendingSpeechChunks: any;
  flushPendingVisitSaves: any;
  formatTime: any;
  hasVisitTranscriptText: any;
  imagingKindLabels: any;
  isDraftAccepting: any;
  isDraftLoading: any;
  isOnline: any;
  isPendingVisitSyncing: any;
  isServerVoiceRecording: any;
  isTranscriptPolishing: any;
  isVisitDictating: any;
  isVisitNoteDirty: any;
  lastLocalSavedAt: any;
  lastPendingVisitSaveAt: any;
  lastServerDraftSavedAt: any;
  lastVisitSaveReceipt: any;
  localDraftWasRestored: any;
  openVisitWarningAction: any;
  pendingSpeechChunkCount: any;
  pendingSpeechFlushActionLabel: any;
  pendingSpeechFlushActionTitle: any;
  pendingVisitSaveCount: any;
  polishTranscript: any;
  primaryVisitWarning: any;
  scrollToVisitArea: any;
  selectedProtocolTemplate: any;
  selectedSpecialty: any;
  serverDraftSyncState: any;
  serviceTitle: any;
  setClearedTranscriptSnapshot: any;
  setSelectedProtocolId: any;
  setSelectedSpecialty: any;
  setTranscript: any;
  specialtiesWithTemplates: any;
  specialtyLabels: any;
  specialtyProtocolTemplates: any;
  speechGatewayActiveProviderIsLocal: any;
  speechGatewayStatus: any;
  speechRecognitionReady: any;
  speechStatusNote: any;
  staffRoleLabels: any;
  startServerVoiceRecording: any;
  startVisitDictation: any;
  stopServerVoiceRecording: any;
  toothRows: any;
  toothStateByCode: any;
  transcript: any;
  undoTranscriptClear: any;
  updateVisitNoteField: any;
  visibleVisitSpecialtyFocusOptions: any;
  visitCloseChecklist: any;
  visitDraftBuildMissingSteps: any;
  visitDraftMissingFieldLabel: any;
  visitDraftQualityLabels: any;
  visitDraftReadyToBuild: any;
  visitDraftSignalLabel: any;
  visitDraftUserEditedRef: any;
  visitNoteAcceptMissingSteps: any;
  visitNoteActionLabel: any;
  visitNoteFieldDefinitions: any;
  visitNoteForm: any;
  visitNoteReadyToAccept: any;
  visitNoteStatusLabel: any;
  visitPrimaryAction: any;
  visitSafetyCards: any;
  visitSaveReceiptText: any;
  visitWarnings: any;
  visitWorkflowSteps: any;
  setToothState: (code: string, state: string) => void;
}

export function VisitView(props: VisitViewProps) {
  const { AlertTriangle, Bot, Check, CheckCircle2, ClinicalRulePanel, ClipboardCheck, Mic, Sparkles, acceptDraftToVisit, activeAppointment, activeChair, activeDoctor, activeImagingStudies, activePatient, activeUsableDocuments, activeVisitClinicalRuleEvaluations, activeVisitClinicalRuleSummary, appendToTranscript, applyProtocolTemplate, buildDraft, buildOfflineDraft, clearTranscriptWithUndo, clearedTranscriptSnapshot, clinicalRuleActionLabels, clinicalRuleSeverityLabels, dashboard, dictationQuickPhrases, draft, emptyDictationVoiceActionLabel, flushPendingSpeechChunks, flushPendingVisitSaves, formatTime, hasVisitTranscriptText, imagingKindLabels, isDraftAccepting, isDraftLoading, isOnline, isPendingVisitSyncing, isServerVoiceRecording, isTranscriptPolishing, isVisitDictating, isVisitNoteDirty, lastLocalSavedAt, lastPendingVisitSaveAt, lastServerDraftSavedAt, lastVisitSaveReceipt, localDraftWasRestored, openVisitWarningAction, pendingSpeechChunkCount, pendingSpeechFlushActionLabel, pendingSpeechFlushActionTitle, pendingVisitSaveCount, polishTranscript, primaryVisitWarning, scrollToVisitArea, selectedProtocolTemplate, selectedSpecialty, serverDraftSyncState, serviceTitle, setClearedTranscriptSnapshot, setSelectedProtocolId, setSelectedSpecialty, setTranscript, specialtiesWithTemplates, specialtyLabels, specialtyProtocolTemplates, speechGatewayActiveProviderIsLocal, speechGatewayStatus, speechRecognitionReady, speechStatusNote, staffRoleLabels, startServerVoiceRecording, startVisitDictation, stopServerVoiceRecording, toothRows, toothStateByCode, setToothState, transcript, undoTranscriptClear, updateVisitNoteField, visibleVisitSpecialtyFocusOptions, visitCloseChecklist, visitDraftBuildMissingSteps, visitDraftMissingFieldLabel, visitDraftQualityLabels, visitDraftReadyToBuild, visitDraftSignalLabel, visitDraftUserEditedRef, visitNoteAcceptMissingSteps, visitNoteActionLabel, visitNoteFieldDefinitions, visitNoteForm, visitNoteReadyToAccept, visitNoteStatusLabel, visitPrimaryAction, visitSafetyCards, visitSaveReceiptText, visitWarnings, visitWorkflowSteps } = props;

  const [activeEmkTab, setActiveEmkTab] = React.useState("all");
  const [activeQuadrant, setActiveQuadrant] = React.useState(null);
  const [activeStamp, setActiveStamp] = React.useState(null);

  // ── Clinical Context Modal state ─────────────────────────────
  const [selectedToothForMenu, setSelectedToothForMenu] = React.useState<{ code: string; state: string } | null>(null);
  const [materialCategory, setMaterialCategory] = React.useState<"filling" | "crown" | "implant" | null>(null);

  const THERAPY_MATERIALS = [
    { id: "Estelite", label: "Estelite Asteria (Tokuyama, JP)" },
    { id: "Filtek", label: "3M Filtek Supreme (US)" },
    { id: "SDR", label: "SDR Bulk-fill (Dentsply, DE)" }
  ];
  const ORTHO_MATERIALS = [
    { id: "Zirconia", label: "Диоксид циркония" },
    { id: "E-max", label: "Прессованная керамика E-max" },
    { id: "PFM", label: "Металлокерамика (CoCr)" }
  ];
  const IMPLANT_SYSTEMS = [
    { id: "Straumann", label: "Straumann SLActive (CH)" },
    { id: "Osstem", label: "Osstem TSIII (KR)" },
    { id: "Nobel", label: "Nobel Biocare Active (SE)" }
  ];

  const appendToEMKField = (fieldKey: string, text: string) => {
    const currentVal = (visitNoteForm as any)[fieldKey] || "";
    if (!currentVal.includes(text)) {
      const sep = currentVal ? "\n" : "";
      updateVisitNoteField(fieldKey, currentVal + sep + text);
    }
  };

  const closeClinicalModal = () => {
    setSelectedToothForMenu(null);
    setMaterialCategory(null);
  };

  const handleSelectDiagnosis = (state: string, text?: string, fieldKey?: string) => {
    if (!selectedToothForMenu) return;
    setToothState(selectedToothForMenu.code, state as any);
    if (text && fieldKey) appendToEMKField(fieldKey, `Зуб ${selectedToothForMenu.code}: ${text}`);
    closeClinicalModal();
  };

  const handleApplyMaterial = (materialLabel: string, textTemplate: string) => {
    if (!selectedToothForMenu) return;
    setToothState(selectedToothForMenu.code, "planned" as any);
    appendToEMKField("treatmentPlan", `Зуб ${selectedToothForMenu.code}: ${textTemplate} — ${materialLabel}`);
    closeClinicalModal();
  };

  // ─────────────────────────────────────────────────────────────

  const emkTabs = [
    { id: "all", label: "Все поля" },
    { id: "complaint", label: "Жалобы" },
    { id: "anamnesis", label: "Анамнез" },
    { id: "objectiveStatus", label: "Объективно" },
    { id: "diagnosis", label: "Диагноз" },
    { id: "treatmentPlan", label: "Лечение" }
  ];

  const visibleFields = activeEmkTab === "all"
    ? visitNoteFieldDefinitions
    : visitNoteFieldDefinitions.filter((f) => f.key === activeEmkTab);

  const handleToothClick = (code: string, currentState: string) => {
    if (activeStamp !== null) {
      // Quick stamp mode: apply instantly, no popup
      setToothState(code, activeStamp);
    } else {
      // Default mode: open clinical context modal
      setSelectedToothForMenu({ code, state: currentState });
    }
  };

  return <>
          <div className="panel visit-panel" id="visit">
            <div className="panel-heading">
              <h2>Текущий прием</h2>
              <span className="status-pill status-in_treatment">Черновик</span>
            </div>

            <section className="visit-focus-bar" aria-label="Быстрый фокус приема">
              <div className="visit-focus-patient">
                <div className="avatar">{activePatient.fullName.slice(0, 1)}</div>
                <div>
                  <p className="eyebrow">Пациент сейчас</p>
                  <h3>{activePatient.fullName}</h3>
                  <p>
                    {activeAppointment?.reason ?? "прием"} · {activePatient.phone ?? "телефон не указан"}
                  </p>
                </div>
              </div>
              <div className="visit-focus-status">
                <span className={visitWarnings.length ? "" : "ready"}>
                  {visitWarnings.length ? `${visitWarnings.length} предупр.` : "спокойно"}
                </span>
                <strong>{primaryVisitWarning?.title ?? "Можно вести прием"}</strong>
                <p>
                  {visitCloseChecklist ? `${visitCloseChecklist.score}% готовности` : "статус закрытия не рассчитан"} ·{" "}
                  предупреждения не останавливают прием · {activeImagingStudies.length} снимка · {activeUsableDocuments.length} документа
                </p>
              </div>
              <div className="visit-focus-actions">
                <button className="primary-button" type="button" onClick={() => scrollToVisitArea(".dictation-box")}>
                  <Mic aria-hidden="true" /> Диктовка
                </button>
                <button className="secondary-button" type="button" onClick={openVisitWarningAction}>
                  <AlertTriangle aria-hidden="true" /> Риски
                </button>
              </div>
            </section>

            
            <details className="clinical-rules-toggle" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', margin: '0.75rem 0' }}>
              <summary style={{ padding: '0.75rem 1rem', background: '#f8fafc', fontSize: '0.85rem', fontWeight: 700, color: '#475569', cursor: 'pointer', outline: 'none' }}>
                🧭 Шаги приема и статус: {visitPrimaryAction.label}
              </summary>
              <div style={{ marginTop: '1rem', padding: '0 1rem 1rem 1rem' }}>
                <section className="visit-next-step" data-testid="visit-next-step-panel" aria-label="Следующий шаг приема">
              <div className="visit-next-step-main">
                <div>
                  <p className="eyebrow">Сейчас сделать</p>
                  <h3>{visitPrimaryAction.label}</h3>
                  <p id="visit-primary-action-detail">{visitPrimaryAction.detail}</p>
                </div>
                <button
                  className="primary-button visit-primary-action"
                  type="button"
                  onClick={visitPrimaryAction.onClick}
                  disabled={visitPrimaryAction.disabled}
                  aria-describedby="visit-primary-action-detail"
                  data-testid="visit-primary-action"
                >
                  {visitPrimaryAction.kind === "dictation" ? <Mic aria-hidden="true" /> : null}
                  {visitPrimaryAction.kind === "draft" ? <Bot aria-hidden="true" /> : null}
                  {visitPrimaryAction.kind === "save" || visitPrimaryAction.kind === "close" ? <Check aria-hidden="true" /> : null}
                  {visitPrimaryAction.kind === "review" ? <AlertTriangle aria-hidden="true" /> : null}
                  {visitPrimaryAction.label}
                </button>
              </div>
              <div className="visit-progress-strip" data-testid="visit-progress-strip" aria-label="Прогресс приема">
                {visitWorkflowSteps.map((step, index) => (
                  <article className={`visit-progress-step step-${step.state}`} key={step.key}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{step.label}</strong>
                      <p>{step.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
              </div>
            </details>


            <details className="visit-safety-strip-toggle" style={{ margin: '1rem 0', fontSize: '0.85rem', color: 'var(--slate-500)' }}>
              <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Инженерный статус (локальное сохранение, связь с сервером)</summary>
              <section className="visit-safety-strip" aria-label="Сохранность черновика и диктовки" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem', padding: '1rem', background: 'var(--slate-50)', borderRadius: '8px' }}>
                {visitSafetyCards.map((item) => (
                  <article className={`safety-${item.state}`} key={item.key}>
                    <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
                    <strong style={{ display: 'block', margin: '4px 0' }}>{item.value}</strong>
                    <p style={{ margin: '0', fontSize: '0.8rem', lineHeight: '1.2' }}>{item.detail}</p>
                  </article>
                ))}
              </section>
            </details>

            <section className="specialty-focus-bar" aria-label="Фокус специальности приема">
              <div>
                <p className="eyebrow">Фокус врача</p>
                <h3>{specialtyLabels[selectedSpecialty]}</h3>
                <p>{activeDoctor?.fullName.split(" ")[0] ?? "Врач"} · {activeChair?.name ?? "кресло"}</p>
              </div>
              <div className="specialty-focus-options">
                {visibleVisitSpecialtyFocusOptions.map((option) => (
                  <button
                    className={selectedSpecialty === option.specialty ? "active" : ""}
                    type="button"
                    key={option.specialty}
                    aria-pressed={selectedSpecialty === option.specialty}
                    onClick={() => {
                      setSelectedSpecialty(option.specialty);
                      setSelectedProtocolId(null);
                    }}
                  >
                    <strong>{option.title}</strong>
                    <span>{option.hint}</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="dictation-box">
              <div className="dictation-header">
                <Mic aria-hidden="true" />
                <div>
                  <h3>Диктовка врача</h3>
                  <p>
                    Черновик, требует подтверждения врача.{" "}
                    <span style={{ color: 'var(--slate-500)', fontSize: '0.9em' }}>
                      {serverDraftSyncState === "saving" || pendingVisitSaveCount > 0 ? "Синхронизация..." 
                        : !isOnline ? "Офлайн (сохранено локально)"
                        : lastServerDraftSavedAt ? `Сохранено ${formatTime(lastServerDraftSavedAt)}`
                        : lastLocalSavedAt ? `Локально сохранено ${formatTime(lastLocalSavedAt)}`
                        : "Автосохранение включено"}
                    </span>
                    {speechStatusNote ? <span style={{ display: 'inline-block', marginLeft: '8px', color: 'var(--rust)', fontSize: '0.9em' }}>{speechStatusNote}</span> : null}
                  </p>
                </div>
              </div>
              <div className="dictation-quick-row" aria-label="Быстрые фразы для диктовки">
                {dictationQuickPhrases.map((phrase) => (
                  <button type="button" key={phrase.label} onClick={() => appendToTranscript(phrase.text)}>
                    {phrase.label}
                  </button>
                ))}
              </div>
              <textarea
                aria-label="Текст диктовки"
                value={transcript}
                onChange={(event) => {
                  visitDraftUserEditedRef.current = true;
                  setTranscript(event.target.value);
                  if (event.target.value.trim()) setClearedTranscriptSnapshot(null);
                }}
              />
              <div className="dictation-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <button
                  className={isServerVoiceRecording ? "primary-button" : "secondary-button"}
                  type="button"
                  style={{ 
                    padding: '12px 16px', 
                    fontSize: '15px', 
                    justifyContent: 'center', 
                    backgroundColor: isServerVoiceRecording ? 'var(--rust)' : undefined,
                    color: isServerVoiceRecording ? '#fff' : undefined,
                    borderColor: isServerVoiceRecording ? 'var(--rust)' : undefined,
                    animation: isServerVoiceRecording ? 'ai-pulse 2s infinite' : 'none'
                  }}
                  onClick={isServerVoiceRecording ? stopServerVoiceRecording : startServerVoiceRecording}
                >
                  <Mic aria-hidden="true" style={{ width: '18px', height: '18px' }} />{" "}
                  {isServerVoiceRecording ? "Остановить и распознать" : "Начать диктовку"}
                </button>

                <button
                  className="primary-button"
                  type="button"
                  style={{ padding: '12px 16px', fontSize: '15px' }}
                  onClick={buildDraft}
                  disabled={isDraftLoading || !visitDraftReadyToBuild}
                  aria-describedby={!visitDraftReadyToBuild ? "visit-draft-missing" : undefined}
                >
                  <Bot aria-hidden="true" style={{ width: '18px', height: '18px' }} />{" "}
                  {isDraftLoading ? "Собираю" : "Собрать черновик"}
                </button>

                <div style={{ flexGrow: 1 }} />

                <button
                  className="secondary-button"
                  type="button"
                  onClick={clearTranscriptWithUndo}
                  disabled={!hasVisitTranscriptText}
                  title="Очистить текст"
                >
                  Очистить
                </button>
                {clearedTranscriptSnapshot ? (
                  <button className="secondary-button" type="button" onClick={undoTranscriptClear} title="Вернуть текст">
                    Вернуть
                  </button>
                ) : null}
                <details className="advanced-dictation-actions" style={{ display: 'inline-block' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '14px', color: 'var(--slate-500)', padding: '8px' }}>Дополнительно</summary>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {pendingSpeechChunkCount ? (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => flushPendingSpeechChunks({ silent: false })}
                        title={pendingSpeechFlushActionTitle}
                      >
                        {pendingSpeechFlushActionLabel}
                      </button>
                    ) : null}
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={polishTranscript}
                      disabled={!hasVisitTranscriptText || isTranscriptPolishing}
                      aria-describedby={!hasVisitTranscriptText ? "dictation-clear-guidance" : undefined}
                      title={
                        speechGatewayStatus?.polishPolicy.neuralEnabled
                          ? `Аккуратная очистка текста: ${speechGatewayStatus.polishPolicy.modelName ?? "модель"}`
                          : "Локальная очистка терминов, секций и номеров зубов"
                      }
                    >
                      <Sparkles aria-hidden="true" /> {isTranscriptPolishing ? "Чищу" : "Очистить текст"}
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={buildOfflineDraft}
                      disabled={!hasVisitTranscriptText}
                      aria-describedby={!hasVisitTranscriptText ? "dictation-clear-guidance" : undefined}
                    >
                      Локальный разбор
                    </button>
                  </div>
                </details>

                {!hasVisitTranscriptText ? (
                  <div className="dictation-action-guidance" id="dictation-clear-guidance" role="status" aria-live="polite">
                    В диктовке пока нет текста: нажмите «Голос», «{emptyDictationVoiceActionLabel}» или впишите текст вручную.
                  </div>
                ) : null}
                {!visitDraftReadyToBuild ? (
                  <div className="visit-draft-missing" id="visit-draft-missing" role="status" aria-live="polite">
                    <strong>Чтобы собрать черновик, осталось:</strong>
                    <ul>
                      {visitDraftBuildMissingSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="tooth-map" aria-label="Зубная карта">
              <div className="tooth-map-head">
                <div>
                  <h3>Зубная карта</h3>
                  <p>Нажмите зуб для смены статуса. ИИ подсвечивает зубы из диктовки.</p>
                </div>
                <span className="tooth-fdi-badge">FDI</span>
              </div>
              <div className="tooth-map-legend">
                <span className="tooth-legend-item legend-planned">В плане</span>
                <span className="tooth-legend-item legend-treatment">Лечение</span>
                <span className="tooth-legend-item legend-watch">Наблюдение</span>
                <span className="tooth-legend-item legend-done">Готово</span>
                <span className="tooth-legend-item legend-missing">Нет зуба</span>
              </div>

              {/* Панель быстрого штампа статуса зуба (Quick Stamp) */}
              <div className="tooth-stamp-bar" role="toolbar" aria-label="Инструменты быстрого штампа">
                <span className="stamp-bar-title">Быстрый штамп:</span>
                <button
                  type="button"
                  className={`stamp-btn ${activeStamp === null ? "active" : ""}`}
                  onClick={() => setActiveStamp(null)}
                >
                  🔍 Обычный клик
                </button>
                <button
                  type="button"
                  className={`stamp-btn stamp-planned ${activeStamp === "planned" ? "active" : ""}`}
                  onClick={() => setActiveStamp("planned")}
                >
                  📝 В план
                </button>
                <button
                  type="button"
                  className={`stamp-btn stamp-treatment ${activeStamp === "treatment" ? "active" : ""}`}
                  onClick={() => setActiveStamp("treatment")}
                >
                  🔴 Лечение
                </button>
                <button
                  type="button"
                  className={`stamp-btn stamp-watch ${activeStamp === "watch" ? "active" : ""}`}
                  onClick={() => setActiveStamp("watch")}
                >
                  ⚠️ Наблюдение
                </button>
                <button
                  type="button"
                  className={`stamp-btn stamp-done ${activeStamp === "done" ? "active" : ""}`}
                  onClick={() => setActiveStamp("done")}
                >
                  🟢 Готово
                </button>
                <button
                  type="button"
                  className={`stamp-btn stamp-missing ${activeStamp === "missing" ? "active" : ""}`}
                  onClick={() => setActiveStamp("missing")}
                >
                  ❌ Нет зуба
                </button>
              </div>

              {/* Панель выбора квадранта (Focus Mode) */}
              <div className="tooth-quadrant-nav" role="navigation" aria-label="Фокус на квадрант">
                <button
                  type="button"
                  className={`quadrant-nav-btn ${activeQuadrant === null ? "active" : ""}`}
                  onClick={() => setActiveQuadrant(null)}
                >
                  Вся челюсть
                </button>
                <button
                  type="button"
                  className={`quadrant-nav-btn ${activeQuadrant === 2 ? "active" : ""}`}
                  onClick={() => setActiveQuadrant(2)}
                >
                  ВЧ Лево (Q2)
                </button>
                <button
                  type="button"
                  className={`quadrant-nav-btn ${activeQuadrant === 1 ? "active" : ""}`}
                  onClick={() => setActiveQuadrant(1)}
                >
                  ВЧ Право (Q1)
                </button>
                <button
                  type="button"
                  className={`quadrant-nav-btn ${activeQuadrant === 3 ? "active" : ""}`}
                  onClick={() => setActiveQuadrant(3)}
                >
                  НЧ Лево (Q3)
                </button>
                <button
                  type="button"
                  className={`quadrant-nav-btn ${activeQuadrant === 4 ? "active" : ""}`}
                  onClick={() => setActiveQuadrant(4)}
                >
                  НЧ Право (Q4)
                </button>
              </div>

              {/* Зубная схема с квадрантами */}
              <div className={`tooth-arch-wrapper ${activeQuadrant !== null ? "zoom-active" : ""}`}>
                {/* Метки квадрантов — верх */}
                {activeQuadrant === null && (
                  <div className="tooth-quadrant-labels upper-labels">
                    <span className="quadrant-label">Q1</span>
                    <span className="quadrant-label">Q2</span>
                  </div>
                )}

                {/* Верхняя челюсть */}
                {(activeQuadrant === null || activeQuadrant === 1 || activeQuadrant === 2) && (
                  <div className="tooth-jaw upper-jaw">
                    {/* Правая половина верхней: Q1 — 18→11 */}
                    {(activeQuadrant === null || activeQuadrant === 1) && (
                      <div className="tooth-half">
                        {(toothRows[0] || []).slice(0, 8).map((code) => {
                          const state = toothStateByCode[code] ?? "idle";
                          if (code === "15") {
                            console.log("RENDER TOOTH 15 state:", state);
                          }
                          const geom = getToothPath(Number(code));
                          const cfg = getToothConfig(Number(code));
                          const isDetected = (draft?.quality?.detectedToothCodes || []).includes(code);
                          return (
                            <button
                              key={code}
                              type="button"
                              className={`tooth tooth-${state}${isDetected ? " tooth-ai-detected" : ""}`}
                              onClick={() => handleToothClick(code, state)}
                              aria-label={`Зуб ${code}`}
                            >
                              <div className="tooth-svg-wrap" style={{ filter: isDetected ? "drop-shadow(0 0 4px #3b82f6)" : "none" }}>
                                <svg width={cfg.width} height={cfg.height} viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`} fill="none">
                                  {state === "missing" ? (
                                    <g>
                                      <path d={geom.root} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.15" />
                                      <path d={geom.crown} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.15" />
                                      <path d="M20 20L80 130M80 20L20 130" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
                                    </g>
                                  ) : (
                                    <g>
                                      <path d={geom.root} fill={state === "idle" ? "#f8fafc" : state === "planned" ? "#f0f9ff" : state === "treatment" ? "#fff5f5" : state === "watch" ? "#fffbeb" : "#f0fdf4"} stroke={state === "idle" ? "#cbd5e1" : state === "planned" ? "#38bdf8" : state === "treatment" ? "#f87171" : state === "watch" ? "#fbbf24" : "#4ade80"} strokeWidth="1.5" strokeLinejoin="round" />
                                      {geom.canals && (state === "treatment" || state === "done") && <path d={geom.canals} fill="none" stroke={state === "done" ? "#ec4899" : "#dc2626"} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />}
                                      <path d={geom.crown} fill={state === "idle" ? "#fff" : state === "planned" ? "#e0f2fe" : state === "treatment" ? "#fee2e2" : state === "watch" ? "#fef3c7" : "#dcfce7"} stroke={state === "idle" ? "#94a3b8" : state === "planned" ? "#0284c7" : state === "treatment" ? "#dc2626" : state === "watch" ? "#d97706" : "#166534"} strokeWidth="2.2" strokeLinejoin="round" />
                                      {geom.fissures && <path d={geom.fissures} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />}
                                    </g>
                                  )}
                                </svg>
                              </div>
                              <span className="tooth-code">{code}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {/* Центральная линия */}
                    {activeQuadrant === null && <div className="tooth-center-line" aria-hidden="true" />}
                    {/* Левая половина верхней: Q2 — 21→28 */}
                    {(activeQuadrant === null || activeQuadrant === 2) && (
                      <div className="tooth-half">
                        {(toothRows[0] || []).slice(8).map((code) => {
                          const state = toothStateByCode[code] ?? "idle";
                          const geom = getToothPath(Number(code));
                          const cfg = getToothConfig(Number(code));
                          const isDetected = (draft?.quality?.detectedToothCodes || []).includes(code);
                          return (
                            <button
                              key={code}
                              type="button"
                              className={`tooth tooth-${state}${isDetected ? " tooth-ai-detected" : ""}`}
                              onClick={() => handleToothClick(code, state)}
                              aria-label={`Зуб ${code}`}
                            >
                              <div className="tooth-svg-wrap" style={{ filter: isDetected ? "drop-shadow(0 0 4px #3b82f6)" : "none" }}>
                                <svg width={cfg.width} height={cfg.height} viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`} fill="none">
                                  {state === "missing" ? (
                                    <g>
                                      <path d={geom.root} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.15" />
                                      <path d={geom.crown} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.15" />
                                      <path d="M20 20L80 130M80 20L20 130" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
                                    </g>
                                  ) : (
                                    <g>
                                      <path d={geom.root} fill={state === "idle" ? "#f8fafc" : state === "planned" ? "#f0f9ff" : state === "treatment" ? "#fff5f5" : state === "watch" ? "#fffbeb" : "#f0fdf4"} stroke={state === "idle" ? "#cbd5e1" : state === "planned" ? "#38bdf8" : state === "treatment" ? "#f87171" : state === "watch" ? "#fbbf24" : "#4ade80"} strokeWidth="1.5" strokeLinejoin="round" />
                                      {geom.canals && (state === "treatment" || state === "done") && <path d={geom.canals} fill="none" stroke={state === "done" ? "#ec4899" : "#dc2626"} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />}
                                      <path d={geom.crown} fill={state === "idle" ? "#fff" : state === "planned" ? "#e0f2fe" : state === "treatment" ? "#fee2e2" : state === "watch" ? "#fef3c7" : "#dcfce7"} stroke={state === "idle" ? "#94a3b8" : state === "planned" ? "#0284c7" : state === "treatment" ? "#dc2626" : state === "watch" ? "#d97706" : "#166534"} strokeWidth="2.2" strokeLinejoin="round" />
                                      {geom.fissures && <path d={geom.fissures} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />}
                                    </g>
                                  )}
                                </svg>
                              </div>
                              <span className="tooth-code">{code}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Линия окклюзии */}
                {activeQuadrant === null && (
                  <div className="tooth-occlusion-line" aria-hidden="true">
                    <span>— окклюзия —</span>
                  </div>
                )}

                {/* Нижняя челюсть */}
                {(activeQuadrant === null || activeQuadrant === 3 || activeQuadrant === 4) && (
                  <div className="tooth-jaw lower-jaw">
                    {/* Правая нижняя Q4 — 48→41 */}
                    {(activeQuadrant === null || activeQuadrant === 4) && (
                      <div className="tooth-half">
                        {(toothRows[1] || []).slice(0, 8).map((code) => {
                          const state = toothStateByCode[code] ?? "idle";
                          const geom = getToothPath(Number(code));
                          const cfg = getToothConfig(Number(code));
                          const isDetected = (draft?.quality?.detectedToothCodes || []).includes(code);
                          return (
                            <button
                              key={code}
                              type="button"
                              className={`tooth tooth-${state}${isDetected ? " tooth-ai-detected" : ""} tooth-lower`}
                              onClick={() => handleToothClick(code, state)}
                              aria-label={`Зуб ${code}`}
                            >
                              <span className="tooth-code">{code}</span>
                              <div className="tooth-svg-wrap" style={{ filter: isDetected ? "drop-shadow(0 0 4px #3b82f6)" : "none", transform: "scaleY(-1)" }}>
                                <svg width={cfg.width} height={cfg.height} viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`} fill="none">
                                  {state === "missing" ? (
                                    <g>
                                      <path d={geom.root} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.15" />
                                      <path d={geom.crown} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.15" />
                                      <path d="M20 20L80 130M80 20L20 130" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
                                    </g>
                                  ) : (
                                    <g>
                                      <path d={geom.root} fill={state === "idle" ? "#f8fafc" : state === "planned" ? "#f0f9ff" : state === "treatment" ? "#fff5f5" : state === "watch" ? "#fffbeb" : "#f0fdf4"} stroke={state === "idle" ? "#cbd5e1" : state === "planned" ? "#38bdf8" : state === "treatment" ? "#f87171" : state === "watch" ? "#fbbf24" : "#4ade80"} strokeWidth="1.5" strokeLinejoin="round" />
                                      {geom.canals && (state === "treatment" || state === "done") && <path d={geom.canals} fill="none" stroke={state === "done" ? "#ec4899" : "#dc2626"} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />}
                                      <path d={geom.crown} fill={state === "idle" ? "#fff" : state === "planned" ? "#e0f2fe" : state === "treatment" ? "#fee2e2" : state === "watch" ? "#fef3c7" : "#dcfce7"} stroke={state === "idle" ? "#94a3b8" : state === "planned" ? "#0284c7" : state === "treatment" ? "#dc2626" : state === "watch" ? "#d97706" : "#166534"} strokeWidth="2.2" strokeLinejoin="round" />
                                      {geom.fissures && <path d={geom.fissures} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />}
                                    </g>
                                  )}
                                </svg>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {/* Центральная линия нижней */}
                    {activeQuadrant === null && <div className="tooth-center-line" aria-hidden="true" />}
                    {/* Левая нижняя Q3 — 31→38 */}
                    {(activeQuadrant === null || activeQuadrant === 3) && (
                      <div className="tooth-half">
                        {(toothRows[1] || []).slice(8).map((code) => {
                          const state = toothStateByCode[code] ?? "idle";
                          const geom = getToothPath(Number(code));
                          const cfg = getToothConfig(Number(code));
                          const isDetected = (draft?.quality?.detectedToothCodes || []).includes(code);
                          return (
                            <button
                              key={code}
                              type="button"
                              className={`tooth tooth-${state}${isDetected ? " tooth-ai-detected" : ""} tooth-lower`}
                              onClick={() => handleToothClick(code, state)}
                              aria-label={`Зуб ${code}`}
                            >
                              <span className="tooth-code">{code}</span>
                              <div className="tooth-svg-wrap" style={{ filter: isDetected ? "drop-shadow(0 0 4px #3b82f6)" : "none", transform: "scaleY(-1)" }}>
                                <svg width={cfg.width} height={cfg.height} viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`} fill="none">
                                  {state === "missing" ? (
                                    <g>
                                      <path d={geom.root} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.15" />
                                      <path d={geom.crown} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.15" />
                                      <path d="M20 20L80 130M80 20L20 130" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
                                    </g>
                                  ) : (
                                    <g>
                                      <path d={geom.root} fill={state === "idle" ? "#f8fafc" : state === "planned" ? "#f0f9ff" : state === "treatment" ? "#fff5f5" : state === "watch" ? "#fffbeb" : "#f0fdf4"} stroke={state === "idle" ? "#cbd5e1" : state === "planned" ? "#38bdf8" : state === "treatment" ? "#f87171" : state === "watch" ? "#fbbf24" : "#4ade80"} strokeWidth="1.5" strokeLinejoin="round" />
                                      {geom.canals && (state === "treatment" || state === "done") && <path d={geom.canals} fill="none" stroke={state === "done" ? "#ec4899" : "#dc2626"} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />}
                                      <path d={geom.crown} fill={state === "idle" ? "#fff" : state === "planned" ? "#e0f2fe" : state === "treatment" ? "#fee2e2" : state === "watch" ? "#fef3c7" : "#dcfce7"} stroke={state === "idle" ? "#94a3b8" : state === "planned" ? "#0284c7" : state === "treatment" ? "#dc2626" : state === "watch" ? "#d97706" : "#166534"} strokeWidth="2.2" strokeLinejoin="round" />
                                      {geom.fissures && <path d={geom.fissures} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />}
                                    </g>
                                  )}
                                </svg>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Метки квадрантов — низ */}
                {activeQuadrant === null && (
                  <div className="tooth-quadrant-labels lower-labels">
                    <span className="quadrant-label">Q4</span>
                    <span className="quadrant-label">Q3</span>
                  </div>
                )}
              </div>
            </div>


            <section className="visit-note-panel" aria-label="Черновик электронной медицинской карты">
              <div className="visit-note-head">
                <div>
                  <p className="eyebrow">ЭМК после диктовки</p>
                  <h3>{draft ? "Проверьте черновик" : isVisitNoteDirty ? "Проверьте правки" : "Структура приема"}</h3>
                </div>
                <span className={draft || isVisitNoteDirty ? "ready" : ""}>{visitNoteStatusLabel}</span>
              </div>

              {/* Красивые вкладки (EMK Tabs) для уменьшения перегруженности */}
              <div className="emk-tabs-container" role="tablist">
                {emkTabs.map((tab) => {
                  const isFilled = tab.id !== "all" && String(visitNoteForm[tab.id] ?? "").trim().length > 0;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeEmkTab === tab.id}
                      className={`emk-tab-button ${activeEmkTab === tab.id ? "active" : ""}`}
                      onClick={() => setActiveEmkTab(tab.id)}
                    >
                      {tab.label}
                      {isFilled && <span className="emk-tab-dot" title="Заполнено" />}
                    </button>
                  );
                })}
              </div>

              <div className={`visit-fields ${activeEmkTab !== "all" ? "single-tab-mode" : ""}`}>
                {visibleFields.map((field) => (
                  <label key={field.key}>
                    {field.label}
                    <textarea value={visitNoteForm[field.key]} onChange={(event) => updateVisitNoteField(field.key, event.target.value)} />
                  </label>
                ))}
              </div>

              {draft?.quality ? (
                <div className={`visit-draft-quality quality-${draft.quality.level}`}>
                  <div>
                    <strong>{visitDraftQualityLabels[draft.quality.level]}</strong>
                    <span>{Math.round(draft.quality.confidence * 100)}% · {specialtyLabels[draft.quality.specialty]}</span>
                  </div>
                  <p>{draft.quality.nextAction}</p>
                  <div className="visit-draft-signal-row">
                    {draft.quality.detectedToothCodes.slice(0, 6).map((toothCode) => (
                      <span key={`tooth-${toothCode}`}>FDI {toothCode}</span>
                    ))}
                    {draft.quality.signals.slice(0, 7).map((signal) => (
                      <span key={signal}>{visitDraftSignalLabel(signal)}</span>
                    ))}
                    {draft.quality.missingCriticalFields.slice(0, 5).map((field) => (
                      <small key={field}>проверить: {visitDraftMissingFieldLabel(field)}</small>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="ai-draft">
                <ShieldCheck aria-hidden="true" />
                <p>
                  {draft
                    ? draft.warnings.join(" ")
                    : isVisitNoteDirty
                      ? "Правки будут сохранены в ЭМК. Подпись приема остается отдельным действием."
                      : pendingVisitSaveCount
                        ? "Локальное сохранение есть. Серверная синхронизация ожидает подключения или повторной попытки."
                        : lastVisitSaveReceipt
                          ? visitSaveReceiptText(lastVisitSaveReceipt)
                          : dashboard.activeVisit.doctorSummary}
                </p>
                {pendingVisitSaveCount ? (
                  <button className="secondary-button" type="button" onClick={() => void flushPendingVisitSaves({ silent: false })} disabled={isPendingVisitSyncing}>
                    {isPendingVisitSyncing ? "Синхронизирую" : "Синхронизировать"}
                  </button>
                ) : null}
                {(draft || isVisitNoteDirty) ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={acceptDraftToVisit}
                    disabled={!visitNoteReadyToAccept || isDraftAccepting}
                    aria-describedby={!visitNoteReadyToAccept ? "visit-note-missing" : undefined}
                  >
                    <Check aria-hidden="true" /> {visitNoteActionLabel}
                  </button>
                ) : null}
                {(draft || isVisitNoteDirty) && !visitNoteReadyToAccept ? (
                  <div className="visit-note-missing" id="visit-note-missing" role="status" aria-live="polite" style={{ marginTop: '1rem', background: 'var(--amber-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--amber-200)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--amber-900)' }}>Чтобы сохранить запись приема, осталось:</strong>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--amber-800)' }}>
                      {visitNoteAcceptMissingSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>

            <details className="protocol-library" aria-label="Шаблоны приема по специальности">
              <summary className="protocol-summary">
                <div>
                  <h3>Шаблон приема</h3>
                  <p>{selectedProtocolTemplate?.title ?? "Выберите специальность и шаблон"}</p>
                </div>
                <span>{selectedProtocolTemplate ? specialtyLabels[selectedProtocolTemplate.specialty] : dashboard.protocolTemplates.length}</span>
              </summary>
              <div className="protocol-head">
                <div>
                  <h3>Шаблон приема</h3>
                  <p>Выбор специальности меняет протокол, снимки, документы и предупреждения.</p>
                </div>
                <span>{dashboard.protocolTemplates.length}</span>
              </div>
              <div className="specialty-strip">
                {specialtiesWithTemplates.map((specialty) => (
                  <button
                    className={selectedSpecialty === specialty ? "active" : ""}
                    key={specialty}
                    type="button"
                    aria-pressed={selectedSpecialty === specialty}
                    onClick={() => {
                      setSelectedSpecialty(specialty);
                      setSelectedProtocolId(null);
                    }}
                  >
                    {specialtyLabels[specialty]}
                  </button>
                ))}
              </div>
              {selectedProtocolTemplate ? (
                <article className="protocol-card">
                  <div>
                    <strong>{selectedProtocolTemplate.title}</strong>
                    <p>
                      {selectedProtocolTemplate.defaultDurationMinutes} мин · снимки{" "}
                      {selectedProtocolTemplate.suggestedImaging.map((kind) => imagingKindLabels[kind]).join(", ")}
                    </p>
                  </div>
                  <div className="protocol-template-list">
                    {specialtyProtocolTemplates.map((template) => (
                      <button
                        className={selectedProtocolTemplate.id === template.id ? "active" : ""}
                        key={template.id}
                        type="button"
                        aria-pressed={selectedProtocolTemplate.id === template.id}
                        onClick={() => setSelectedProtocolId(template.id)}
                      >
                        {template.visitReason}
                      </button>
                    ))}
                  </div>
                  <ul>
                    {selectedProtocolTemplate.safetyWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                  <button className="secondary-button" type="button" onClick={() => applyProtocolTemplate(selectedProtocolTemplate)}>
                    <ClipboardCheck aria-hidden="true" /> Заполнить диктовку
                  </button>
                </article>
              ) : null}
            </details>

            <details className="clinical-rules-toggle">
              <summary>
                📋 Клинические рекомендации
                {activeVisitClinicalRuleEvaluations?.length
                  ? ` (${activeVisitClinicalRuleEvaluations.length})`
                  : ""}
              </summary>
              <div style={{ marginTop: "1rem" }}>
                <ClinicalRulePanel
                  actionLabels={clinicalRuleActionLabels}
                  context="visit"
                  evaluations={activeVisitClinicalRuleEvaluations}
                  serviceTitle={serviceTitle}
                  severityLabels={clinicalRuleSeverityLabels}
                  staffRoleLabels={staffRoleLabels}
                  summary={activeVisitClinicalRuleSummary}
                />
              </div>
            </details>

                        {visitCloseChecklist ? (
              <div className="close-checklist" aria-label="Предупреждения перед закрытием приема">
                <div className="close-checklist-head">
                  <div>
                    <h3>Закрытие приема</h3>
                    <p>{primaryVisitWarning?.actionLabel ?? visitCloseChecklist.nextAction}</p>
                  </div>
                  <span className={visitCloseChecklist.readyToSign ? "ready" : ""}>
                    {visitCloseChecklist.readyToSign ? "готово" : `${visitCloseChecklist.score}%`}
                  </span>
                </div>
                {visitCloseChecklist.items.map((task) => (
                  <button
                    className={`close-task ${task.ready ? "done" : ""} ${task.blocking && !task.ready ? "blocking" : ""}`}
                    key={task.id}
                    type="button"
                    onClick={() => {
                      window.location.hash = task.section;
                    }}
                  >
                    <CheckCircle2 aria-hidden="true" />
                    <div>
                      <strong>{task.title}</strong>
                      <p>{task.detail}</p>
                      <small>{staffRoleLabels[task.ownerRole]} · {task.actionLabel}</small>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              Clinical Context Modal — открывается по клику на зуб (без штампа)
          ═══════════════════════════════════════════════════════════════ */}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes _ccm-fade { from { opacity:0 } to { opacity:1 } }
            @keyframes _ccm-up {
              from { transform: translate(-50%,-45%) scale(.95); opacity:0 }
              to   { transform: translate(-50%,-50%) scale(1);   opacity:1 }
            }
            ._ccm-overlay {
              position:fixed; inset:0; z-index:3000;
              background:rgba(15,23,42,.52);
              backdrop-filter:blur(14px);
              animation:_ccm-fade .18s ease-out;
            }
            ._ccm-content {
              position:fixed; top:50%; left:50%;
              transform:translate(-50%,-50%);
              display:flex; align-items:stretch; gap:1.25rem;
              z-index:3001;
              width:96%; max-width:900px;
              height:82vh; max-height:580px;
              animation:_ccm-up .22s cubic-bezier(.16,1,.3,1) forwards;
            }
            ._ccm-panel {
              flex:1; min-width:0;
              background:rgba(255,255,255,.92);
              backdrop-filter:blur(20px);
              border:1px solid rgba(255,255,255,.6);
              box-shadow:0 24px 48px -12px rgba(15,23,42,.22);
              border-radius:22px;
              padding:1.25rem 1rem;
              display:flex; flex-direction:column; gap:.55rem;
              overflow-y:auto;
            }
            ._ccm-center {
              width:220px; flex-shrink:0;
              display:flex; flex-direction:column;
              align-items:center; justify-content:space-between;
              background:rgba(255,255,255,.55);
              backdrop-filter:blur(16px);
              border:1px solid rgba(255,255,255,.4);
              border-radius:22px;
              padding:1.25rem .75rem;
            }
            ._ccm-tooth-stage {
              flex:1; display:flex; align-items:center; justify-content:center;
              transform:scale(2.5);
              filter:drop-shadow(0 12px 24px rgba(15,23,42,.18));
            }
            ._ccm-h {
              margin:0 0 .15rem;
              font-size:.9rem; font-weight:700; color:#1e293b;
              border-bottom:1px solid #e2e8f0; padding-bottom:.55rem;
            }
            ._ccm-label {
              font-size:.65rem; font-weight:800; letter-spacing:.06em;
              text-transform:uppercase; color:#64748b;
              margin:.6rem 0 .15rem;
            }
            ._ccm-label:first-of-type { margin-top:0 }
            ._ccm-btn {
              width:100%; padding:.6rem .8rem;
              border-radius:10px;
              border:1px solid #e2e8f0;
              background:#fff; color:#334155;
              font-size:.82rem; font-weight:600;
              text-align:left; cursor:pointer;
              display:flex; align-items:center; justify-content:space-between;
              transition:background .13s, border-color .13s, box-shadow .13s;
            }
            ._ccm-btn:hover { background:#f8fafc; border-color:#cbd5e1; box-shadow:0 2px 8px rgba(15,23,42,.07); }
            ._ccm-btn.active { background:var(--ab,#f0f9ff); color:var(--af,#0369a1); border-color:var(--abr,#bae6fd); }
            ._ccm-btn[data-color="green"] { border-left:3px solid #4ade80 }
            ._ccm-btn[data-color="slate"] { border-left:3px solid #94a3b8 }
            ._ccm-btn[data-color="amber"] { border-left:3px solid #f59e0b }
            ._ccm-btn[data-color="red"]   { border-left:3px solid #f87171 }
            ._ccm-btn[data-color="rose"]  { border-left:3px solid #fb7185 }
            ._ccm-btn[data-color="blue"]  { border-left:3px solid #60a5fa }
            ._ccm-btn[data-color="cyan"]  { border-left:3px solid #22d3ee }
            ._ccm-btn[data-color="violet"]{ border-left:3px solid #a78bfa }
            ._ccm-btn[data-color="pink"]  { border-left:3px solid #f472b6 }
            ._ccm-warn {
              padding:.6rem .75rem; border-radius:10px;
              background:#fffbeb; border:1px solid #fde68a;
              font-size:.73rem; color:#78350f;
            }
            ._ccm-code-badge {
              font-size:.7rem; font-weight:800; letter-spacing:.1em;
              color:#64748b; margin-bottom:.5rem;
            }
            ._ccm-close-btn {
              width:100%; border-radius:12px; padding:.55rem;
              font-size:.8rem; font-weight:700;
              border:1px solid #cbd5e1; background:#f8fafc; color:#475569;
              cursor:pointer; transition:background .13s;
            }
            ._ccm-close-btn:hover { background:#e2e8f0; }
            .clinical-rules-toggle {
              margin: .75rem 0;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              overflow: hidden;
            }
            .clinical-rules-toggle > summary {
              padding: .75rem 1rem;
              background: #f8fafc;
              font-size: .85rem; font-weight: 700; color: #475569;
              cursor: pointer; user-select: none; outline: none;
              list-style: none;
              transition: background .15s;
            }
            .clinical-rules-toggle > summary:hover { background: #f1f5f9; }
            .clinical-rules-toggle > summary::-webkit-details-marker { display: none; }
          ` }} />

          {selectedToothForMenu && (() => {
            const { code } = selectedToothForMenu;
            const state = (toothStateByCode as any)[code] ?? "idle";
            const geom = getToothPath(Number(code));
            const cfg = getToothConfig(Number(code));

            // state → fill/stroke colors (same as tooth map)
            const FILL: Record<string, string> = {
              idle:"#fff", planned:"#e0f2fe", treatment:"#fee2e2",
              watch:"#fef3c7", done:"#dcfce7", missing:"#f1f5f9"
            };
            const STROKE: Record<string, string> = {
              idle:"#94a3b8", planned:"#0284c7", treatment:"#dc2626",
              watch:"#d97706", done:"#166534", missing:"#cbd5e1"
            };
            const ROOT_FILL: Record<string, string> = {
              idle:"#f8fafc", planned:"#f0f9ff", treatment:"#fff5f5",
              watch:"#fffbeb", done:"#f0fdf4", missing:"#f1f5f9"
            };
            const ROOT_STROKE: Record<string, string> = {
              idle:"#cbd5e1", planned:"#38bdf8", treatment:"#f87171",
              watch:"#fbbf24", done:"#4ade80", missing:"#cbd5e1"
            };

            const isLower = Number(code) >= 30;

            const toothSvg = (
              <svg
                width={cfg.width} height={cfg.height}
                viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
                fill="none"
                style={{ transform: isLower ? "scaleY(-1)" : "none" }}
              >
                {state === "missing" ? (
                  <g>
                    <path d={geom.root} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.15" />
                    <path d={geom.crown} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.15" />
                    <path d="M20 20L80 130M80 20L20 130" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
                  </g>
                ) : (
                  <g>
                    <path d={geom.root} fill={ROOT_FILL[state] ?? "#f8fafc"} stroke={ROOT_STROKE[state] ?? "#cbd5e1"} strokeWidth="1.5" strokeLinejoin="round" />
                    {geom.canals && (state === "treatment" || state === "done") && (
                      <path d={geom.canals} fill="none" stroke={state === "done" ? "#ec4899" : "#dc2626"} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                    )}
                    <path d={geom.crown} fill={FILL[state] ?? "#fff"} stroke={STROKE[state] ?? "#94a3b8"} strokeWidth="2.2" strokeLinejoin="round" />
                    {geom.fissures && <path d={geom.fissures} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />}
                  </g>
                )}
              </svg>
            );


            return createPortal(
              <>
                <div className="_ccm-overlay" onClick={closeClinicalModal} />
                <div className="_ccm-content" role="dialog" aria-modal="true" aria-label={`Зуб ${code}`}>

                  {/* ── LEFT: Diagnosis ── */}
                  <div className="_ccm-panel">
                    <h4 className="_ccm-h">🩺 Диагностика</h4>

                    {visitWarnings && visitWarnings.length > 0 && (
                      <div className="_ccm-warn">
                        <strong>⚠️ Риски:</strong>{" "}
                        {visitWarnings.map((w: any) => w.title).join(" · ")}
                      </div>
                    )}

                    <div className="_ccm-label">Состояние</div>

                    <button type="button" className={`_ccm-btn${state === "idle" ? " active" : ""}`}
                      data-color="green"
                      style={{ "--ab":"#f0fdf4","--af":"#166534","--abr":"#bbf7d0" } as any}
                      onClick={() => handleSelectDiagnosis("idle")}>
                      Здоров / Норма <span>🟢</span>
                    </button>

                    <button type="button" className={`_ccm-btn${state === "done" ? " active" : ""}`}
                      data-color="green"
                      style={{ "--ab":"#f0fdf4","--af":"#166534","--abr":"#bbf7d0" } as any}
                      onClick={() => handleSelectDiagnosis("done", "зуб санирован / здоров", "diagnosis")}>
                      Санирован / Готово <span>✅</span>
                    </button>

                    <button type="button" className={`_ccm-btn${state === "missing" ? " active" : ""}`}
                      data-color="slate"
                      onClick={() => handleSelectDiagnosis("missing", "зуб отсутствует", "diagnosis")}>
                      Отсутствует / Удалён <span>❌</span>
                    </button>

                    <div className="_ccm-label">Патологии</div>

                    <button type="button" className={`_ccm-btn${state === "watch" ? " active" : ""}`}
                      data-color="amber"
                      style={{ "--ab":"#fffbeb","--af":"#78350f","--abr":"#fde68a" } as any}
                      onClick={() => handleSelectDiagnosis("watch", "K02.1 Кариес дентина", "diagnosis")}>
                      Кариес дентина (K02.1) <span>⚠️</span>
                    </button>

                    <button type="button" className="_ccm-btn"
                      data-color="red"
                      onClick={() => handleSelectDiagnosis("treatment", "K04.0 Острый пульпит", "diagnosis")}>
                      Острый пульпит (K04.0) <span>🔥</span>
                    </button>

                    <button type="button" className="_ccm-btn"
                      data-color="rose"
                      onClick={() => handleSelectDiagnosis("treatment", "K04.5 Хронический апикальный периодонтит / киста", "diagnosis")}>
                      Периодонтит / Киста (K04.5) <span>🔴</span>
                    </button>

                    <button type="button" className="_ccm-btn"
                      data-color="amber"
                      onClick={() => handleSelectDiagnosis("watch", "K03.1 Клиновидный дефект", "diagnosis")}>
                      Клиновидный дефект (K03.1) <span>🦷</span>
                    </button>
                  </div>

                  {/* ── CENTER: Tooth preview ── */}
                  <div className="_ccm-center">
                    <div className="_ccm-code-badge">FDI {code}</div>
                    <div className="_ccm-tooth-stage" aria-hidden="true">
                      {toothSvg}
                    </div>
                    <button type="button" className="_ccm-close-btn" onClick={closeClinicalModal}>
                      Закрыть
                    </button>
                  </div>

                  {/* ── RIGHT: Treatment ── */}
                  <div className="_ccm-panel">
                    <h4 className="_ccm-h">🛠️ Лечение (Зуб {code})</h4>

                    {materialCategory ? (
                      <div style={{ display:"flex", flexDirection:"column", gap:".45rem", animation:"_ccm-fade .15s ease-out" }}>
                        <div className="_ccm-label">
                          {materialCategory === "filling" ? "Материал реставрации:" :
                           materialCategory === "crown"   ? "Материал коронки:" :
                                                            "Система имплантации:"}
                        </div>
                        {(materialCategory === "filling" ? THERAPY_MATERIALS :
                          materialCategory === "crown"   ? ORTHO_MATERIALS :
                                                           IMPLANT_SYSTEMS).map(mat => (
                          <button key={mat.id} type="button" className="_ccm-btn"
                            data-color="blue"
                            onClick={() => handleApplyMaterial(
                              mat.label,
                              materialCategory === "filling" ? "реставрация композитом" :
                              materialCategory === "crown"   ? "протезирование коронкой" :
                                                               "установка имплантата"
                            )}>
                            {mat.label} <span>✨</span>
                          </button>
                        ))}
                        <button type="button" className="_ccm-btn"
                          style={{ borderStyle:"dashed", justifyContent:"center", marginTop:".25rem" }}
                          onClick={() => setMaterialCategory(null)}>
                          ← Назад
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="_ccm-label">Терапия</div>
                        <button type="button" className="_ccm-btn" data-color="blue"
                          onClick={() => setMaterialCategory("filling")}>
                          Пломба / Реставрация <span>🖊️</span>
                        </button>
                        <button type="button" className="_ccm-btn" data-color="pink"
                          onClick={() => handleSelectDiagnosis("treatment", "депульпирование, обтурация каналов", "treatmentPlan")}>
                          Лечение каналов (Эндо) <span>🌀</span>
                        </button>
                        <button type="button" className="_ccm-btn" data-color="amber"
                          onClick={() => handleSelectDiagnosis("watch", "наблюдение, реминерализация", "treatmentPlan")}>
                          Наблюдение / Реминерализация <span>👁️</span>
                        </button>

                        <div className="_ccm-label">Ортопедия</div>
                        <button type="button" className="_ccm-btn" data-color="cyan"
                          onClick={() => setMaterialCategory("crown")}>
                          Коронка на зуб <span>👑</span>
                        </button>
                        <button type="button" className="_ccm-btn" data-color="violet"
                          onClick={() => handleApplyMaterial("E-max (Kerr / Ivoclar)", "винир")}>
                          Винир <span>✨</span>
                        </button>

                        <div className="_ccm-label">Хирургия</div>
                        <button type="button" className="_ccm-btn" data-color="red"
                          onClick={() => handleSelectDiagnosis("treatment", "удаление зуба: анестезия, синдесмотомия, экстракция, ревизия лунки", "treatmentPlan")}>
                          Удаление зуба <span>❌</span>
                        </button>
                        <button type="button" className="_ccm-btn" data-color="violet"
                          onClick={() => {
                            if (visitWarnings && visitWarnings.some((w: any) =>
                              /бисфосф|bisph/i.test(w.title + w.detail))) {
                              alert(`⚠️ ПРЕДУПРЕЖДЕНИЕ: У пациента обнаружены бисфосфонаты в анамнезе. Имплантация противопоказана — риск остеонекроза. Проконсультируйтесь с хирургом-ортопедом.`);
                              return;
                            }
                            setMaterialCategory("implant");
                          }}>
                          Имплантация <span>🔩</span>
                        </button>
                      </>
                    )}
                  </div>

                </div>
              </>
            , document.body);
          })()}
</>;
}
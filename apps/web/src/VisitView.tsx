// @ts-nocheck
import React, { Suspense } from "react";
import { AlertTriangle, Bot, Check, CheckCircle2, ClipboardCheck, Mic, ShieldCheck, Sparkles } from "lucide-react";

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
  const { AlertTriangle, Bot, Check, CheckCircle2, ClinicalRulePanel, ClipboardCheck, Mic, Sparkles, acceptDraftToVisit, activeAppointment, activeChair, activeDoctor, activeImagingStudies, activePatient, activeUsableDocuments, activeVisitClinicalRuleEvaluations, activeVisitClinicalRuleSummary, appendToTranscript, applyProtocolTemplate, buildDraft, buildOfflineDraft, clearTranscriptWithUndo, clearedTranscriptSnapshot, clinicalRuleActionLabels, clinicalRuleSeverityLabels, dashboard, dictationQuickPhrases, draft, emptyDictationVoiceActionLabel, flushPendingSpeechChunks, flushPendingVisitSaves, formatTime, hasVisitTranscriptText, imagingKindLabels, isDraftAccepting, isDraftLoading, isOnline, isPendingVisitSyncing, isServerVoiceRecording, isTranscriptPolishing, isVisitDictating, isVisitNoteDirty, lastLocalSavedAt, lastPendingVisitSaveAt, lastServerDraftSavedAt, lastVisitSaveReceipt, localDraftWasRestored, openVisitWarningAction, pendingSpeechChunkCount, pendingSpeechFlushActionLabel, pendingSpeechFlushActionTitle, pendingVisitSaveCount, polishTranscript, primaryVisitWarning, scrollToVisitArea, selectedProtocolTemplate, selectedSpecialty, serverDraftSyncState, serviceTitle, setClearedTranscriptSnapshot, setSelectedProtocolId, setSelectedSpecialty, setTranscript, specialtiesWithTemplates, specialtyLabels, specialtyProtocolTemplates, speechGatewayActiveProviderIsLocal, speechGatewayStatus, speechRecognitionReady, speechStatusNote, staffRoleLabels, startServerVoiceRecording, startVisitDictation, stopServerVoiceRecording, toothRows, toothStateByCode, transcript, undoTranscriptClear, updateVisitNoteField, visibleVisitSpecialtyFocusOptions, visitCloseChecklist, visitDraftBuildMissingSteps, visitDraftMissingFieldLabel, visitDraftQualityLabels, visitDraftReadyToBuild, visitDraftSignalLabel, visitDraftUserEditedRef, visitNoteAcceptMissingSteps, visitNoteActionLabel, visitNoteFieldDefinitions, visitNoteForm, visitNoteReadyToAccept, visitNoteStatusLabel, visitPrimaryAction, visitSafetyCards, visitSaveReceiptText, visitWarnings, visitWorkflowSteps } = props;
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

            <section className="visit-note-panel" aria-label="Черновик электронной медицинской карты">
              <div className="visit-note-head">
                <div>
                  <p className="eyebrow">ЭМК после диктовки</p>
                  <h3>{draft ? "Проверьте черновик" : isVisitNoteDirty ? "Проверьте правки" : "Структура приема"}</h3>
                </div>
                <span className={draft || isVisitNoteDirty ? "ready" : ""}>{visitNoteStatusLabel}</span>
              </div>
              <div className="visit-fields">
                {visitNoteFieldDefinitions.map((field) => (
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

            <ClinicalRulePanel
              actionLabels={clinicalRuleActionLabels}
              context="visit"
              evaluations={activeVisitClinicalRuleEvaluations}
              serviceTitle={serviceTitle}
              severityLabels={clinicalRuleSeverityLabels}
              staffRoleLabels={staffRoleLabels}
              summary={activeVisitClinicalRuleSummary}
            />

            <div className="tooth-map" aria-label="Зубная карта">
              <div className="tooth-map-head">
                <div>
                  <h3>Зубная карта</h3>
                  <p>Нажмите зуб для смены статуса. ИИ подсвечивает зубы из диктовки.</p>
                </div>
                <span>FDI</span>
              </div>
              <div className="tooth-map-legend">
                <span className="tooth-legend-item legend-planned">В плане</span>
                <span className="tooth-legend-item legend-treatment">Лечение</span>
                <span className="tooth-legend-item legend-watch">Наблюдение</span>
                <span className="tooth-legend-item legend-done">Готово</span>
                <span className="tooth-legend-item legend-missing">Нет зуба</span>
              </div>
              {toothRows.map((row, rowIndex) => (
                <div className="tooth-row" key={rowIndex === 0 ? "upper" : "lower"}>
                  {row.map((code) => {
                    const state = toothStateByCode[code] ?? "idle";
                    const cycleState = () => {
                      const order: Array<typeof state> = ["idle", "planned", "treatment", "watch", "done", "missing"];
                      const next = order[(order.indexOf(state as any) + 1) % order.length];
                      setToothState(code, next as any);
                    };
                    return (
                      <button
                        key={code}
                        type="button"
                        className={`tooth tooth-${state}${state === "planned" ? " tooth-ai-detected" : ""}`}
                        onClick={cycleState}
                        aria-label={`Зуб ${code}: ${state === "idle" ? "норма" : state === "planned" ? "в плане ИИ" : state === "treatment" ? "лечение" : state === "watch" ? "наблюдение" : state === "done" ? "готово" : "нет зуба"}. Нажмите для смены.`}
                        aria-pressed={state !== "idle"}
                      >
                        <span>{code}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

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
</>;
}
import {
  ExternalLink,
  FileText,
  FlipHorizontal,
  History,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  UploadCloud,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { CtPlanningToolsPanel } from "./ctPlanningTools";
import { type MprWindowPreset } from "./imagingUiLabels";

type ImagingViewProps = Record<string, any>;

export function ImagingView(props: ImagingViewProps) {
  const {
  activeAppointment,
  activeImagingStudies,
  activePatient,
  addImagingViewerNoteAnnotation,
  applyCtPlanningQuickAction,
  applyMprClinicalPreset,
  applyNearestMprClinicalPreset,
  attachBrowserDirectoryInputRef,
  browserImagingFileInputAccept,
  browserImagingFilesInputRef,
  browserImagingScanProgress,
  browserPickedImagingFolder,
  canRetryImagingViewerSave,
  cancelBrowserImagingFolderScan,
  cbctWorkbenchPlanes,
  cbctWorkbenchProjections,
  cbctWorkbenchSeries,
  clampMprAxisDeg,
  clampMprSlabMm,
  clampMprSliceIndex,
  createCtPlanningArtifact,
  createImagingStudy,
  ctPlanningActiveQuickActionId,
  ctPlanningAnnotationRefs,
  ctPlanningImplantPlan,
  defaultImagingViewerState,
  describeMprClinicalPresetProjectionFallback,
  dicomLabel,
  dicomQualityModeLabels,
  dicomTextureStrategyLabels,
  dicomViewerToolStateBundle,
  dicomViewerWorkbenchManifest,
  formatByteSize,
  formatShortDate,
  formatSignedMprStep,
  formatTime,
  handleBrowserDirectoryInputChange,
  handleMprKeyboardNavigation,
  imagingComparisonCandidates,
  imagingCreateSavingKind,
  imagingKindFilter,
  imagingKindLabels,
  imagingKindOptions,
  imagingPreviewSource,
  imagingSourceLabels,
  imagingViewerActiveTool,
  imagingViewerAnnotations,
  imagingViewerHref,
  imagingViewerImageStyle,
  imagingViewerNote,
  imagingViewerNoteMissingId,
  imagingViewerNoteReady,
  imagingViewerRetryMissingId,
  imagingViewerSaveDetail,
  imagingViewerSaveState,
  imagingViewerSaveTitle,
  imagingViewerSessionReady,
  imagingViewerState,
  imagingViewerToolLabels,
  isBrowserImagingFolderPicking,
  isOnline,
  mprActiveProjectionLabel,
  mprActiveProjectionOrientation,
  mprAxisAngleBadge,
  mprAxisBounds,
  mprAxisDeg,
  mprAxisDirectionLabel,
  mprAxisGuidance,
  mprAxisNudgeDeg,
  mprAxisPresetDeg,
  mprAxisRangeValue,
  mprAxisVisualizerLabel,
  mprAxisVisualizerStyle,
  mprClinicalChecklist,
  mprClinicalNextStep,
  mprClinicalPresetButtonClass,
  mprClinicalPresets,
  mprControlsAutoOpen,
  mprControlsReady,
  mprCrosshairEnabled,
  mprLinkedPlanesEnabled,
  mprNearestClinicalPreset,
  mprOperatorSummaryCards,
  mprProjection,
  mprProjectionCompass,
  mprProjectionLabels,
  mprSafeSliceIndex,
  mprSeriesRequiredProjectionLabel,
  mprSlabBadge,
  mprSlabBounds,
  mprSlabMm,
  mprSlabNudgeMm,
  mprSlabPresetMm,
  mprSlabRangeValue,
  mprSliceBadge,
  mprSliceIndexFromFraction,
  mprSliceLabel,
  mprSliceMaxIndex,
  mprSliceNudgeSteps,
  mprSlicePresetFractions,
  mprSliceRangeValue,
  mprUnavailableProjectionLabel,
  mprWindowPreset,
  mprWindowPresetLabels,
  mprWorkbenchDraftRestored,
  mprWorkbenchLocalSavedAt,
  mprWorkbenchSummaryText,
  pickBrowserImagingFiles,
  pickBrowserImagingFolder,
  resetMprControls,
  restoreMprWorkbenchLocalDraft,
  retryImagingViewerSessionSave,
  selectCtPlanningImplant,
  selectedImagingStudy,
  selectedImagingViewerPlan,
  setCtPlanningActiveQuickActionId,
  setCtPlanningImplantPlan,
  setImagingKindFilter,
  setImagingViewerActiveTool,
  setImagingViewerNote,
  setImagingViewerState,
  setMprAxisDeg,
  setMprCrosshairEnabled,
  setMprLinkedPlanesEnabled,
  setMprProjection,
  setMprSlabMm,
  setMprSliceIndex,
  setMprWindowPreset,
  setSelectedImagingStudyId,
  visibleImagingStudies
  } = props;

  return (
    <section className="imaging-panel" id="imaging" aria-label="Снимки пациента">
              <div className="imaging-copy">
                <div>
                  <p className="eyebrow">Снимки пациента</p>
                  <h2>Прицельные, ОПТГ, ТРГ, КТ и фото в одной ленте</h2>
                </div>
                <div className="imaging-actions">
                  <input
                    ref={attachBrowserDirectoryInputRef}
                    data-testid="imaging-browser-local-folder-input"
                    type="file"
                    multiple
                    hidden
                    tabIndex={-1}
                    onChange={(event) => void handleBrowserDirectoryInputChange(event.currentTarget.files)}
                  />
                  <input
                    ref={browserImagingFilesInputRef}
                    data-testid="imaging-browser-local-files-input"
                    type="file"
                    multiple
                    hidden
                    tabIndex={-1}
                    accept={browserImagingFileInputAccept}
                    onChange={(event) => void handleBrowserDirectoryInputChange(event.currentTarget.files)}
                  />
                  <button
                    className="primary-button"
                    type="button"
                    data-testid="imaging-pick-dicom-folder"
                    onClick={() => void pickBrowserImagingFolder()}
                    disabled={isBrowserImagingFolderPicking}
                    title="Выбрать папку DICOM/КТ или папку со снимками"
                  >
                    <UploadCloud aria-hidden="true" /> {isBrowserImagingFolderPicking ? "Сканирую" : "Папка DICOM"}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    data-testid="imaging-pick-dicom-files"
                    onClick={pickBrowserImagingFiles}
                    disabled={isBrowserImagingFolderPicking}
                    title="Выбрать отдельные DICOM, RVG, JPG/PNG/TIFF, ZIP/RAR/7z или 3D-файлы"
                  >
                    <FileText aria-hidden="true" /> Файлы
                  </button>
                  {isBrowserImagingFolderPicking && browserImagingScanProgress ? (
                    <button
                      className="secondary-button browser-scan-stop-button"
                      type="button"
                      data-testid="imaging-cancel-local-imaging-scan"
                      onClick={cancelBrowserImagingFolderScan}
                    >
                      Остановить
                    </button>
                  ) : null}
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => createImagingStudy("periapical")}
                    disabled={Boolean(imagingCreateSavingKind)}
                  >
                    <Plus aria-hidden="true" /> {imagingCreateSavingKind === "periapical" ? "Добавляю" : "Прицельный"}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => createImagingStudy("opg")}
                    disabled={Boolean(imagingCreateSavingKind)}
                  >
                    <Plus aria-hidden="true" /> {imagingCreateSavingKind === "opg" ? "Добавляю" : "ОПТГ"}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => createImagingStudy("ceph")}
                    disabled={Boolean(imagingCreateSavingKind)}
                  >
                    <Plus aria-hidden="true" /> {imagingCreateSavingKind === "ceph" ? "Добавляю" : "ТРГ"}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => createImagingStudy("cbct")}
                    disabled={Boolean(imagingCreateSavingKind)}
                  >
                    <Plus aria-hidden="true" /> {imagingCreateSavingKind === "cbct" ? "Добавляю" : "КТ"}
                  </button>
                </div>
              </div>
    
              <div className="imaging-patient-strip" aria-label="Контекст снимков">
                <article>
                  <span>Пациент</span>
                  <strong>{activePatient.fullName}</strong>
                  <small>{activeAppointment?.reason ?? "текущий прием"}</small>
                </article>
                <article>
                  <span>В ленте</span>
                  <strong>{activeImagingStudies.length}</strong>
                  <small>локально и на сервере, без удаления сырья</small>
                </article>
                <article>
                  <span>Режим</span>
                  <strong>{selectedImagingViewerPlan?.label ?? "просмотрщик"}</strong>
                  <small>{selectedImagingViewerPlan?.warnings[0] ?? "ИИ только помогает, решение остается за врачом"}</small>
                </article>
              </div>
    
              {browserImagingScanProgress || browserPickedImagingFolder ? (
                <div
                  className={`imaging-upload-status ${browserImagingScanProgress?.phase ?? "ready"}`}
                  data-testid="imaging-upload-status"
                  role="status"
                  aria-live="polite"
                >
                  <div>
                    <strong>
                      {browserImagingScanProgress?.phase === "scanning"
                        ? "Проверяю выбранные снимки"
                        : browserImagingScanProgress?.phase === "cancelled"
                          ? "Проверка остановлена"
                          : browserPickedImagingFolder
                            ? "Снимки выбраны"
                            : "Готово к выбору снимков"}
                    </strong>
                    <span>
                      {browserImagingScanProgress?.currentItem ??
                        browserPickedImagingFolder?.nextAction ??
                        "Можно выбрать папку DICOM/КТ или отдельные файлы."}
                    </span>
                  </div>
                  <div className="imaging-upload-stats">
                    <span>файлов: {browserImagingScanProgress?.scannedFiles ?? browserPickedImagingFolder?.scannedFiles ?? 0}</span>
                    <span>папок: {browserImagingScanProgress?.scannedFolders ?? browserPickedImagingFolder?.scannedFolders ?? 0}</span>
                    <span>DICOM/КТ: {browserImagingScanProgress?.dicomLikeFiles ?? browserPickedImagingFolder?.dicomLikeFiles ?? 0}</span>
                    <span>архивов: {browserImagingScanProgress?.archiveFiles ?? browserPickedImagingFolder?.archiveFiles ?? 0}</span>
                    <span>изображений: {browserImagingScanProgress?.imageFiles ?? browserPickedImagingFolder?.imageFiles ?? 0}</span>
                    <span>{formatByteSize(browserImagingScanProgress?.totalBytes ?? browserPickedImagingFolder?.totalBytes ?? 0)}</span>
                  </div>
                  {browserPickedImagingFolder?.warnings?.[0] ? <small>{browserPickedImagingFolder.warnings[0]}</small> : null}
                </div>
              ) : null}
    
              <div className="imaging-kind-filter" aria-label="Фильтр типа снимка">
                <button className={imagingKindFilter === "all" ? "active" : ""} type="button" aria-pressed={imagingKindFilter === "all"} onClick={() => setImagingKindFilter("all")}>
                  Все
                </button>
                {imagingKindOptions.map((kind: any) => (
                  <button
                    className={imagingKindFilter === kind ? "active" : ""}
                    key={kind}
                    type="button"
                    aria-pressed={imagingKindFilter === kind}
                    onClick={() => setImagingKindFilter(kind)}
                  >
                    {imagingKindLabels[kind]}
                  </button>
                ))}
              </div>
    
              <div className="imaging-layout">
                <article className="imaging-viewer">
                  {selectedImagingStudy ? (
                    <>
                      <div className="imaging-viewer-stage">
                        <img
                          src={imagingPreviewSource(selectedImagingStudy)}
                          alt={selectedImagingStudy.title}
                          decoding="async"
                          style={imagingViewerImageStyle}
                        />
                        <div className="imaging-viewer-meta">
                          <strong>{selectedImagingStudy.title}</strong>
                          <span>
                            {imagingKindLabels[selectedImagingStudy.kind]} · {selectedImagingStudy.toothCode ?? selectedImagingStudy.region}
                          </span>
                          <p>{selectedImagingStudy.aiSummary}</p>
                        </div>
                      </div>
    
                      {selectedImagingViewerPlan ? (
                        <div className={`imaging-viewer-plan viewer-plan-${selectedImagingViewerPlan.mode}`}>
                          <div>
                            <strong>{selectedImagingViewerPlan.label}</strong>
                            <span>{selectedImagingViewerPlan.nextAction}</span>
                          </div>
                          <div className="viewer-plan-chip-row">
                            {selectedImagingViewerPlan.primaryTools.slice(0, 5).map((tool: any) => (
                              <span key={tool}>{imagingViewerToolLabels[tool] ?? "инструмент просмотра"}</span>
                            ))}
                          </div>
                          {selectedImagingViewerPlan.warnings[0] ? <small>{selectedImagingViewerPlan.warnings[0]}</small> : null}
                        </div>
                      ) : null}
    
                      {imagingComparisonCandidates.length ? (
                        <div className="imaging-compare-strip" data-testid="imaging-compare-strip" aria-label="Быстрое сравнение снимков пациента">
                          <div className="imaging-compare-head">
                            <strong>Сравнить с</strong>
                            <span>ближайшие по зубу, области, типу или дате</span>
                          </div>
                          <div className="imaging-compare-list">
                            {imagingComparisonCandidates.map(({ study, reason }: any) => (
                              <button
                                key={study.id}
                                type="button"
                                onClick={() => {
                                  if (imagingKindFilter !== "all" && imagingKindFilter !== study.kind) setImagingKindFilter("all");
                                  setSelectedImagingStudyId(study.id);
                                }}
                              >
                                <img src={imagingPreviewSource(study)} alt="" loading="lazy" decoding="async" />
                                <span>
                                  <strong>{imagingKindLabels[study.kind]}</strong>
                                  <small>{formatShortDate(study.capturedAt)} · {reason}</small>
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
    
                      <div className="imaging-viewer-toolbar" aria-label="Настройки рентген-снимка">
                        <div className="imaging-viewer-tools">
                          <button
                            className="viewer-tool-button"
                            type="button"
                            title="Повернуть влево"
                            aria-label="Повернуть снимок влево"
                            onClick={() => setImagingViewerState((state: any) => ({ ...state, rotationDeg: state.rotationDeg - 90 }))}
                          >
                            <RotateCcw aria-hidden="true" />
                          </button>
                          <button
                            className="viewer-tool-button"
                            type="button"
                            title="Повернуть вправо"
                            aria-label="Повернуть снимок вправо"
                            onClick={() => setImagingViewerState((state: any) => ({ ...state, rotationDeg: state.rotationDeg + 90 }))}
                          >
                            <RotateCw aria-hidden="true" />
                          </button>
                          <button
                            className={`viewer-tool-button ${imagingViewerState.flipHorizontal ? "active" : ""}`}
                            type="button"
                            title="Зеркально"
                            aria-label="Зеркально отразить снимок"
                            aria-pressed={imagingViewerState.flipHorizontal}
                            onClick={() => setImagingViewerState((state: any) => ({ ...state, flipHorizontal: !state.flipHorizontal }))}
                          >
                            <FlipHorizontal aria-hidden="true" />
                          </button>
                          <button
                            className={`viewer-tool-button ${imagingViewerState.inverted ? "active" : ""}`}
                            type="button"
                            title="Инверсия"
                            aria-label="Инвертировать снимок"
                            aria-pressed={imagingViewerState.inverted}
                            onClick={() => setImagingViewerState((state: any) => ({ ...state, inverted: !state.inverted }))}
                          >
                            ±
                          </button>
                          <button
                            className="viewer-tool-button"
                            type="button"
                            title="Уменьшить"
                            aria-label="Уменьшить снимок"
                            onClick={() => setImagingViewerState((state: any) => ({ ...state, zoom: Math.max(0.75, state.zoom - 0.1) }))}
                          >
                            <ZoomOut aria-hidden="true" />
                          </button>
                          <button
                            className="viewer-tool-button"
                            type="button"
                            title="Увеличить"
                            aria-label="Увеличить снимок"
                            onClick={() => setImagingViewerState((state: any) => ({ ...state, zoom: Math.min(1.8, state.zoom + 0.1) }))}
                          >
                            <ZoomIn aria-hidden="true" />
                          </button>
                          <button
                            className="viewer-tool-button"
                            type="button"
                            title="Сбросить"
                            aria-label="Сбросить настройки снимка"
                            onClick={() => {
                              setImagingViewerState(defaultImagingViewerState);
                              setImagingViewerActiveTool("window_level");
                              setCtPlanningActiveQuickActionId(null);
                              setCtPlanningImplantPlan(null);
                            }}
                          >
                            <RefreshCw aria-hidden="true" />
                          </button>
                        </div>
                        <div className="viewer-slider-grid">
                          <label>
                            Яркость
                            <input
                              min="0.65"
                              max="1.45"
                              step="0.05"
                              type="range"
                              value={imagingViewerState.brightness}
                              onChange={(event) => setImagingViewerState((state: any) => ({ ...state, brightness: Number(event.target.value) }))}
                            />
                          </label>
                          <label>
                            Контраст
                            <input
                              min="0.75"
                              max="1.85"
                              step="0.05"
                              type="range"
                              value={imagingViewerState.contrast}
                              onChange={(event) => setImagingViewerState((state: any) => ({ ...state, contrast: Number(event.target.value) }))}
                            />
                          </label>
                        </div>
                        <div className={`viewer-session-strip viewer-save-state-${imagingViewerSaveState}`} aria-label="Автосохранение сеанса просмотра снимка">
                          <div>
                            <strong>{imagingViewerSaveTitle[imagingViewerSaveState]}</strong>
                            <span>{imagingViewerSaveDetail}</span>
                          </div>
                          <input
                            aria-label="Заметка к снимку"
                            value={imagingViewerNote}
                            onChange={(event) => setImagingViewerNote(event.target.value)}
                            placeholder="Заметка к снимку"
                          />
                          <div className="viewer-session-actions">
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={addImagingViewerNoteAnnotation}
                              aria-describedby={!imagingViewerNoteReady || !imagingViewerSessionReady ? imagingViewerNoteMissingId : undefined}
                              disabled={!imagingViewerNoteReady || !imagingViewerSessionReady}
                            >
                              <Plus aria-hidden="true" /> Заметка
                            </button>
                            {canRetryImagingViewerSave ? (
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={retryImagingViewerSessionSave}
                                aria-describedby={!isOnline ? imagingViewerRetryMissingId : undefined}
                                disabled={!isOnline}
                              >
                                <RefreshCw aria-hidden="true" /> Повторить
                              </button>
                            ) : null}
                          </div>
                          {!imagingViewerSessionReady ? (
                            <p className="viewer-note-missing" id={imagingViewerNoteMissingId} role="status" aria-live="polite">
                              Дождитесь загрузки просмотра, чтобы прикрепить заметку к снимку.
                            </p>
                          ) : !imagingViewerNoteReady ? (
                            <p className="viewer-note-missing" id={imagingViewerNoteMissingId} role="status" aria-live="polite">
                              Напишите текст заметки, чтобы прикрепить ее к снимку.
                            </p>
                          ) : null}
                          {canRetryImagingViewerSave && !isOnline ? (
                            <p className="viewer-note-missing" id={imagingViewerRetryMissingId} role="status" aria-live="polite">
                              Повторная отправка просмотра станет доступна после подключения к сети.
                            </p>
                          ) : null}
                        </div>
                        {imagingViewerAnnotations.length ? (
                          <div className="viewer-annotation-list" aria-label="Сохраненные разметки к снимкам">
                            {imagingViewerAnnotations.slice(0, 3).map((annotation: any) => (
                              <article key={annotation.id}>
                                <strong>{annotation.label}</strong>
                                <span>
                                  {annotation.toothCode ?? selectedImagingStudy.region ?? "study"} · {formatShortDate(annotation.updatedAt)}
                                </span>
                              </article>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="imaging-empty">
                      <ImageIcon aria-hidden="true" />
                      <p>Снимков по текущему пациенту пока нет.</p>
                    </div>
                  )}
                </article>
    
                <div className="imaging-list">
                  {visibleImagingStudies.map((study: any) => (
                    <article
                      className={`imaging-row imaging-${study.status} ${selectedImagingStudy?.id === study.id ? "active" : ""}`}
                      key={study.id}
                    >
                      <img src={imagingPreviewSource(study)} alt="" loading="lazy" decoding="async" />
                      <div>
                        <h3>{study.title}</h3>
                        <p>
                          {imagingKindLabels[study.kind]} · {study.toothCode ?? study.region ?? "область не указана"} ·{" "}
                          {formatShortDate(study.capturedAt)}
                        </p>
                        <span>{imagingSourceLabels[study.sourceKind]} · {study.sourceName}</span>
                      </div>
                      <div className="imaging-row-actions">
                        <button
                          className="text-button imaging-row-select"
                          type="button"
                          onClick={() => setSelectedImagingStudyId(study.id)}
                          aria-pressed={selectedImagingStudy?.id === study.id}
                          aria-label={`Выбрать снимок: ${study.title}, ${formatShortDate(study.capturedAt)}`}
                          title={`Выбрать снимок: ${study.title}`}
                        >
                          {selectedImagingStudy?.id === study.id ? "Выбрано" : "Выбрать"}
                        </button>
                        <a
                          className="doc-link"
                          href={imagingViewerHref(study)}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label={`Открыть просмотрщик снимка: ${study.title}, ${formatShortDate(study.capturedAt)}`}
                          title={`Открыть просмотрщик снимка: ${study.title}`}
                        >
                          Открыть
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
    
              {selectedImagingStudy?.kind === "cbct" ? (
                <section className="clinical-mpr-panel" aria-label="Управление КЛКТ и КТ-срезами">
                  <div className="clinical-mpr-head">
                    <div>
                      <p className="eyebrow">Рабочее место КЛКТ</p>
                      <h3>3 плоскости, косой срез, панорама и внешний КТ-просмотрщик</h3>
                      <small>
                        Основной прием не блокируется: если серия тяжелая, CRM оставляет предпросмотр и предлагает внешний просмотр или локальный модуль объема.
                      </small>
                    </div>
                    <a
                      className="secondary-button"
                      href={imagingViewerHref(selectedImagingStudy)}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`Открыть КТ-просмотрщик в новой вкладке: ${selectedImagingStudy.title}`}
                      title={`Открыть КТ-просмотрщик в новой вкладке: ${selectedImagingStudy.title}`}
                    >
                      <ExternalLink aria-hidden="true" /> КТ-просмотрщик
                    </a>
                  </div>
                  <div className="clinical-mpr-summary-grid" aria-label="Краткий статус КЛКТ">
                    <article>
                      <strong>{selectedImagingViewerPlan?.mode === "cbct_mpr" ? "Маршрут КТ-срезов" : "Быстрый предпросмотр"}</strong>
                      <span>{selectedImagingViewerPlan?.nextAction ?? "Откройте КТ-просмотрщик, когда нужен 3D-разбор."}</span>
                    </article>
                    <article>
                      <strong>
                        {dicomViewerWorkbenchManifest
                          ? `готовность загрузки ${dicomViewerWorkbenchManifest.readiness.readinessScore}%`
                          : "Рабочее место опционально"}
                      </strong>
                      <span>
                        {dicomViewerWorkbenchManifest
                            ? `${dicomLabel(dicomQualityModeLabels, dicomViewerWorkbenchManifest.renderCachePlan.qualityMode, "режим качества")} / ${dicomLabel(
                              dicomTextureStrategyLabels,
                              dicomViewerWorkbenchManifest.renderCachePlan.textureStrategy,
                              "план загрузки"
                            )}`
                          : "Соберите КТ-пакет в настройках источников; карточка приема останется легкой."}
                      </span>
                    </article>
                    <article>
                      <strong>{imagingViewerSaveTitle[imagingViewerSaveState]}</strong>
                      <span>{imagingViewerAnnotations.length} разметок; исходные снимки остаются в просмотрщике или исходной папке.</span>
                    </article>
                  </div>
                  <div className="mpr-clinical-roadmap" data-testid="ct-mpr-clinical-roadmap" aria-label="Клиническая готовность КТ-срезов">
                    <div className="mpr-clinical-roadmap-head">
                      <strong>Карта КТ-срезов</strong>
                      <span>{mprClinicalNextStep}</span>
                    </div>
                    <div className="mpr-clinical-roadmap-steps">
                      {mprClinicalChecklist.map((item: any) => (
                        <article className={`mpr-clinical-step status-${item.status}`} key={item.id}>
                          <strong>{item.title}</strong>
                          <span>{item.detail}</span>
                        </article>
                      ))}
                    </div>
                  </div>
                  <div className="mpr-operator-summary" data-testid="ct-mpr-operator-summary" aria-label="Быстрая сводка настройки КТ-срезов">
                    {mprOperatorSummaryCards.map((card: any) => (
                      <article className={`tone-${card.tone}`} key={card.id}>
                        <span>{card.title}</span>
                        <strong>{card.value}</strong>
                        <p>{card.detail}</p>
                      </article>
                    ))}
                  </div>
                  <CtPlanningToolsPanel
                    canPlan={mprControlsReady}
                    activeTool={imagingViewerActiveTool}
                    activeQuickActionId={ctPlanningActiveQuickActionId}
                    onActivateTool={applyCtPlanningQuickAction}
                    selectedImplantId={ctPlanningImplantPlan?.itemId ?? null}
                    selectedImplantPlan={ctPlanningImplantPlan}
                    onSelectImplant={selectCtPlanningImplant}
                    localAnnotations={imagingViewerAnnotations}
                    annotationRefs={ctPlanningAnnotationRefs}
                    onCreateArtifact={createCtPlanningArtifact}
                    toolStateBundle={dicomViewerWorkbenchManifest?.toolStateBundle ?? dicomViewerToolStateBundle}
                  />
                  <details className="clinical-mpr-advanced" open={mprControlsAutoOpen}>
                    <summary>
                      <span>Управление КТ-срезами</span>
                      <small>Открывается только для КТ-разбора; обычный прием остается без лишних панелей.</small>
                    </summary>
                  <div className="clinical-mpr-grid">
                    <div className="mpr-plane-grid">
                      {cbctWorkbenchPlanes.map((plane: any) => {
                        const planeSupported = cbctWorkbenchProjections.includes(plane.key);
                        const planeAvailable = mprControlsReady && planeSupported;
                        const planeUnavailableReason = !mprControlsReady
                          ? mprSeriesRequiredProjectionLabel
                          : planeSupported
                            ? ""
                            : mprUnavailableProjectionLabel;
                        return (
                          <button
                            className={`mpr-plane ${mprProjection === plane.key ? "active" : ""}`}
                            key={plane.key}
                            type="button"
                            onClick={() => setMprProjection(plane.key)}
                            disabled={!planeAvailable}
                            aria-pressed={mprProjection === plane.key}
                            aria-label={`${plane.title}: ${plane.detail}${planeUnavailableReason ? `; ${planeUnavailableReason}` : ""}`}
                          >
                            <strong>{plane.title}</strong>
                            <span>{plane.detail}</span>
                            {planeUnavailableReason ? <small className="mpr-plane-unavailable">{planeUnavailableReason}</small> : null}
                          </button>
                        );
                      })}
                    </div>
                    <div
                      className={`mpr-axis-visualizer ${mprControlsReady ? "" : "disabled"}`}
                      data-testid="ct-mpr-axis-visualizer"
                      style={mprAxisVisualizerStyle}
                      role="img"
                      aria-label={mprAxisVisualizerLabel}
                      aria-describedby="ct-mpr-keyboard-help"
                      aria-disabled={!mprControlsReady}
                      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown Home End"
                      tabIndex={mprControlsReady ? 0 : -1}
                      onKeyDown={handleMprKeyboardNavigation}
                    >
                      <span className="visually-hidden" id="ct-mpr-keyboard-help">
                        Стрелки влево и вправо меняют угол оси, стрелки вверх и вниз меняют срез, PageUp и PageDown меняют толщину слоя, Home и End переходят к началу и концу серии.
                      </span>
                      <div className="mpr-axis-board" aria-hidden="true">
                        <span className="mpr-axis-label mpr-axis-label-top">{mprProjectionCompass.top}</span>
                        <span className="mpr-axis-label mpr-axis-label-right">{mprProjectionCompass.right}</span>
                        <span className="mpr-axis-label mpr-axis-label-bottom">{mprProjectionCompass.bottom}</span>
                        <span className="mpr-axis-label mpr-axis-label-left">{mprProjectionCompass.left}</span>
                        <span className="mpr-axis-slab" />
                        <span className="mpr-axis-slice-marker" />
                        <span className="mpr-axis-line mpr-axis-line-primary" />
                        <span className="mpr-axis-line mpr-axis-line-secondary" />
                        <span className={`mpr-axis-crosshair ${mprCrosshairEnabled ? "active" : ""}`} />
                        <span className="mpr-axis-angle-badge">{mprAxisAngleBadge}</span>
                        <span className="mpr-axis-slab-badge">{mprSlabBadge}</span>
                        <span className="mpr-axis-slice-badge">{mprSliceBadge}</span>
                      </div>
                      <div className="mpr-axis-facts">
                        <strong>{mprActiveProjectionLabel}</strong>
                        <span>{mprActiveProjectionOrientation}</span>
                        <span>{mprProjectionCompass.summary}</span>
                        <span>{mprAxisDirectionLabel}</span>
                        <span>слой {mprSlabMm} мм</span>
                        <span>{mprSliceLabel}</span>
                        <div className="mpr-axis-guidance" data-testid="ct-mpr-axis-guidance">
                          <span>{mprAxisGuidance.tiltLabel}</span>
                          <span>{mprAxisGuidance.slabLabel}</span>
                          <span>{mprAxisGuidance.sliceLabel}</span>
                        </div>
                        <small className="mpr-workbench-summary" data-testid="ct-mpr-workbench-summary" aria-live="polite">
                          {mprWorkbenchSummaryText}
                        </small>
                        <small>
                          {mprControlsReady
                            ? `${mprLinkedPlanesEnabled ? "плоскости связаны" : "плоскости отдельно"} · ${mprCrosshairEnabled ? "курсор включен" : "курсор скрыт"}`
                            : "сначала откройте готовую КЛКТ/КТ-серию"}
                        </small>
                        <div className={`mpr-preset-fit ${mprNearestClinicalPreset.exact ? "exact" : ""}`} data-testid="ct-mpr-preset-fit">
                          <span>{mprNearestClinicalPreset.label}</span>
                          <button
                            type="button"
                            onClick={applyNearestMprClinicalPreset}
                            disabled={!mprControlsReady || !mprNearestClinicalPreset.deltas.length || !mprNearestClinicalPreset.title}
                            aria-label={`Подогнать КТ-срезы под ближайший клинический протокол: ${mprNearestClinicalPreset.label}`}
                            title={`Подогнать под протокол: ${mprNearestClinicalPreset.label}`}
                          >
                            Подогнать
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mpr-control-panel">
                      <div className="mpr-toggle-row">
                        {cbctWorkbenchProjections.map((projection: any) => (
                          <button
                            className={mprProjection === projection ? "active" : ""}
                            key={projection}
                            type="button"
                            onClick={() => setMprProjection(projection)}
                            disabled={!mprControlsReady}
                            aria-pressed={mprProjection === projection}
                          >
                            {mprProjectionLabels[projection]}
                          </button>
                        ))}
                      </div>
                      <label>
                        Угол оси: {mprAxisDeg}°
                        <input
                          aria-valuetext={mprAxisRangeValue}
                          disabled={!mprControlsReady}
                          min={mprAxisBounds.min}
                          max={mprAxisBounds.max}
                          step="1"
                          type="range"
                          value={mprAxisDeg}
                          onChange={(event) => setMprAxisDeg(clampMprAxisDeg(Number(event.target.value)))}
                        />
                      </label>
                      <div className="mpr-stepper-row" data-testid="ct-mpr-axis-nudge" aria-label="Точная правка угла КТ-срезов">
                        {mprAxisNudgeDeg.map((delta: any) => (
                          <button
                            key={delta}
                            type="button"
                            onClick={() => setMprAxisDeg(clampMprAxisDeg(mprAxisDeg + delta))}
                            disabled={!mprControlsReady}
                            aria-label={`Изменить угол оси КТ-среза на ${formatSignedMprStep(delta, "°")}`}
                          >
                            {formatSignedMprStep(delta, "°")}
                          </button>
                        ))}
                      </div>
                      <div className="mpr-preset-row" aria-label="Быстрые углы КТ-срезов">
                        {mprAxisPresetDeg.map((angle: any) => (
                          <button
                            className={mprAxisDeg === angle ? "active" : ""}
                            key={angle}
                            type="button"
                            onClick={() => setMprAxisDeg(angle)}
                            disabled={!mprControlsReady}
                            aria-pressed={mprAxisDeg === angle}
                            aria-label={`Установить угол оси КТ-срезов ${angle > 0 ? `+${angle}` : angle}°`}
                          >
                            {angle > 0 ? `+${angle}°` : `${angle}°`}
                          </button>
                        ))}
                      </div>
                      <label>
                        Толщина слоя: {mprSlabMm} мм
                        <input
                          aria-valuetext={mprSlabRangeValue}
                          disabled={!mprControlsReady}
                          min={mprSlabBounds.min}
                          max={mprSlabBounds.max}
                          step="1"
                          type="range"
                          value={mprSlabMm}
                          onChange={(event) => setMprSlabMm(clampMprSlabMm(Number(event.target.value)))}
                        />
                      </label>
                      <div className="mpr-stepper-row" data-testid="ct-mpr-slab-nudge" aria-label="Точная правка толщины слоя КТ-срезов">
                        {mprSlabNudgeMm.map((delta: any) => (
                          <button
                            key={delta}
                            type="button"
                            onClick={() => setMprSlabMm(clampMprSlabMm(mprSlabMm + delta))}
                            disabled={!mprControlsReady}
                            aria-label={`Изменить толщину слоя КТ-срезов на ${formatSignedMprStep(delta, " мм")}`}
                          >
                            {formatSignedMprStep(delta, " мм")}
                          </button>
                        ))}
                      </div>
                      <div className="mpr-preset-row" aria-label="Быстрая толщина слоя КТ-срезов">
                        {mprSlabPresetMm.map((slab: any) => (
                          <button
                            className={mprSlabMm === slab ? "active" : ""}
                            key={slab}
                            type="button"
                            onClick={() => setMprSlabMm(slab)}
                            disabled={!mprControlsReady}
                            aria-pressed={mprSlabMm === slab}
                            aria-label={`Установить толщину слоя КТ-срезов ${slab} мм`}
                          >
                            {slab} мм
                          </button>
                        ))}
                        <button type="button" onClick={() => setMprAxisDeg(0)} disabled={!mprControlsReady} aria-pressed={mprAxisDeg === 0} aria-label="Вернуть ось КТ-срезов к 0°">
                          <RotateCcw aria-hidden="true" /> ось 0°
                        </button>
                      </div>
                      <label>
                        Положение среза: {mprSliceLabel}
                        <input
                          disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
                          min="0"
                          max={mprSliceMaxIndex}
                          step="1"
                          type="range"
                          value={mprSafeSliceIndex}
                          aria-valuetext={mprSliceRangeValue}
                          onChange={(event) => setMprSliceIndex(clampMprSliceIndex(Number(event.target.value), mprSliceMaxIndex))}
                        />
                      </label>
                      <div className="mpr-manual-grid" data-testid="ct-mpr-manual-inputs" aria-label="Точные числовые настройки КТ-срезов">
                        <label>
                          Угол, °
                          <input
                            disabled={!mprControlsReady}
                            inputMode="numeric"
                            max={mprAxisBounds.max}
                            min={mprAxisBounds.min}
                            step="1"
                            type="number"
                            value={mprAxisDeg}
                            onChange={(event) => setMprAxisDeg(clampMprAxisDeg(Number(event.target.value)))}
                          />
                        </label>
                        <label>
                          Слой, мм
                          <input
                            disabled={!mprControlsReady}
                            inputMode="numeric"
                            max={mprSlabBounds.max}
                            min={mprSlabBounds.min}
                            step="1"
                            type="number"
                            value={mprSlabMm}
                            onChange={(event) => setMprSlabMm(clampMprSlabMm(Number(event.target.value)))}
                          />
                        </label>
                        <label>
                          Срез
                          <input
                            disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
                            inputMode="numeric"
                            max={mprSliceMaxIndex + 1}
                            min="1"
                            step="1"
                            type="number"
                            value={mprSafeSliceIndex + 1}
                            onChange={(event) => setMprSliceIndex(clampMprSliceIndex(Number(event.target.value) - 1, mprSliceMaxIndex))}
                          />
                        </label>
                      </div>
                      <div className="mpr-stepper-row" data-testid="ct-mpr-slice-nudge" aria-label="Точная навигация по КТ-срезам">
                        {mprSliceNudgeSteps.map((delta: any) => (
                          <button
                            key={delta}
                            type="button"
                            onClick={() => setMprSliceIndex(clampMprSliceIndex(mprSafeSliceIndex + delta, mprSliceMaxIndex))}
                            disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
                            aria-label={`Перейти по КТ-срезам на ${formatSignedMprStep(delta, " срез")}`}
                          >
                            {formatSignedMprStep(delta, " срез")}
                          </button>
                        ))}
                      </div>
                      <div className="mpr-preset-row" aria-label="Опорные КТ-срезы">
                        {mprSlicePresetFractions.map((preset: any) => {
                          const targetIndex = mprSliceIndexFromFraction(preset.fraction, mprSliceMaxIndex);
                          return (
                            <button
                              className={mprSafeSliceIndex === targetIndex ? "active" : ""}
                              key={preset.id}
                              type="button"
                              onClick={() => setMprSliceIndex(targetIndex)}
                              disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
                              aria-pressed={mprSafeSliceIndex === targetIndex}
                              aria-label={`Перейти на опорный КТ-срез: ${preset.label}`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                      <button className="mpr-reset-button" type="button" onClick={resetMprControls} disabled={!mprControlsReady}>
                        <RefreshCw aria-hidden="true" /> Сбросить КТ-срезы
                      </button>
                      <div className="mpr-memory-strip" data-testid="ct-mpr-memory-strip">
                        <div>
                          <strong>{mprWorkbenchLocalSavedAt ? `Последний вид ${formatTime(mprWorkbenchLocalSavedAt)}` : "Последний вид появится после настройки"}</strong>
                          <span>
                            {mprWorkbenchDraftRestored
                              ? "Серия открыта с сохраненными осями, окном и толщиной слоя."
                              : "Ось, толщина слоя, окно, курсор и связанные плоскости запоминаются для этой КТ-серии."}
                          </span>
                        </div>
                        <button type="button" onClick={restoreMprWorkbenchLocalDraft} disabled={!mprControlsReady || !mprWorkbenchLocalSavedAt}>
                          <History aria-hidden="true" /> Вернуть вид
                        </button>
                      </div>
                      <div className="mpr-clinical-preset-grid" data-testid="ct-mpr-clinical-presets" aria-label="Клинические протоколы КТ-срезов">
                        {mprClinicalPresets.map((preset: any) => {
                          const projectionFallbackNote = mprControlsReady
                            ? describeMprClinicalPresetProjectionFallback(preset.projection, cbctWorkbenchProjections, mprProjectionLabels)
                            : null;
                          return (
                            <button
                              className={mprClinicalPresetButtonClass(preset)}
                              key={preset.id}
                              type="button"
                              onClick={() => applyMprClinicalPreset(preset)}
                              aria-current={mprNearestClinicalPreset.exact && mprNearestClinicalPreset.title === preset.title ? "true" : undefined}
                              disabled={!mprControlsReady}
                            >
                              <strong>{preset.title}</strong>
                              <span>{preset.detail}</span>
                              {projectionFallbackNote ? <small>{projectionFallbackNote}</small> : null}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mpr-toggle-row">
                        {(Object.keys(mprWindowPresetLabels) as MprWindowPreset[]).map((preset) => (
                          <button
                            className={mprWindowPreset === preset ? "active" : ""}
                            key={preset}
                            type="button"
                            onClick={() => setMprWindowPreset(preset)}
                            disabled={!mprControlsReady}
                            aria-pressed={mprWindowPreset === preset}
                          >
                            {mprWindowPresetLabels[preset]}
                          </button>
                        ))}
                      </div>
                      <div className="mpr-check-row">
                        <label>
                          <input checked={mprCrosshairEnabled} disabled={!mprControlsReady} type="checkbox" onChange={(event) => setMprCrosshairEnabled(event.target.checked)} />
                          Синхронный курсор
                        </label>
                        <label>
                          <input checked={mprLinkedPlanesEnabled} disabled={!mprControlsReady} type="checkbox" onChange={(event) => setMprLinkedPlanesEnabled(event.target.checked)} />
                          Связанные плоскости
                        </label>
                      </div>
                      {!mprControlsReady ? (
                        <p className="mpr-control-disabled-note" role="status">
                          Сначала откройте готовую КЛКТ/КТ-серию. После этого включатся оси, толщина слоя и связанные плоскости.
                        </p>
                      ) : null}
                    </div>
                  </div>
                  </details>
                  <div className="clinical-mpr-safety">
                    <span>{selectedImagingViewerPlan?.nextAction ?? "Подготовить серию КЛКТ/КТ к просмотру срезов."}</span>
                    <span>{cbctWorkbenchSeries?.mprReadiness.resourcePolicy.nextAction ?? "Метаданные серии пока не загружены: сначала открываем предпросмотр и внешний просмотр."}</span>
                    <span>ИИ-описание не является диагнозом; врач подтверждает все выводы.</span>
                  </div>
                </section>
              ) : null}
            </section>
  );
}

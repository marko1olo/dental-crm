import type {
	DicomViewerWorkbenchManifestResponse,
	DicomWorkstationReadinessResponse,
	MprWindowPreset,
	} from "@dental/shared";
import {
	ClipboardCheck,
	Database,
	FileText,
	History,
	ImageIcon,
	Layers3,
	RefreshCw,
	RotateCcw,
	ScanSearch,
Gauge, ExternalLink, CheckCircle2} from "lucide-react";
import type { ChangeEvent } from "react";
import React from "react";
import { CtPlanningToolsPanel } from "../../ctPlanningTools";
type MprClinicalPreset = import('../../mprClinicalStatus').MprClinicalPresetFitTarget;
import { useAppLogicContext } from "../../contexts/AppLogicContext";

type StringTokenGroup = { title: string; items: string[] };
type CbctWorkbenchPlane = { key: string; title: string; detail: string };
type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;


export function SettingsSourcesTab() {
	const props = useAppLogicContext();
	const {
		imagingConnectorCards,
		imagingSourceLabels,
		imagingViewerCapabilities,
		previewDicomSeries,
		isDicomSeriesPreviewLoading,
		dicomSeriesPreview,
		imagingKindLabels,
		dicomSeriesViewerLabels,
		dicomSeriesDisplayText,
		dicomSeriesWarningText,
		mprLoadStrategyLabels,
		mprResourceTierLabels,
		cbctWorkbenchSeries,
		mprClinicalNextStep,
		mprClinicalChecklist,
		mprOperatorSummaryCards,
		mprControlsReady,
		imagingViewerActiveTool,
		ctPlanningActiveQuickActionId,
		applyCtPlanningQuickAction,
		ctPlanningImplantPlan,
		selectCtPlanningImplantFromSettings,
		dicomViewerWorkbenchManifest,
		dicomViewerToolStateBundle,
		activeDentalModelWorkbenchManifest,
		localBridgeReadiness,
		cbctWorkbenchPlanes,
		cbctWorkbenchProjections,
		mprSeriesRequiredProjectionLabel,
		mprUnavailableProjectionLabel,
		mprProjection,
		setMprProjection,
		mprAxisVisualizerStyle,
		mprAxisVisualizerLabel,
		handleMprKeyboardNavigation,
		mprProjectionCompass,
		mprCrosshairEnabled,
		mprAxisAngleBadge,
		mprSlabBadge,
		mprSliceBadge,
		mprActiveProjectionLabel,
		mprActiveProjectionOrientation,
		mprAxisDirectionLabel,
		mprSlabMm,
		mprSliceLabel,
		mprAxisGuidance,
		mprWorkbenchSummaryText,
		mprLinkedPlanesEnabled,
		mprNearestClinicalPreset,
		applyNearestMprClinicalPreset,
		mprProjectionLabels,
		mprAxisDeg,
		mprAxisRangeValue,
		mprAxisBounds,
		setMprAxisDeg,
		clampMprAxisDeg,
		mprAxisNudgeDeg,
		formatSignedMprStep,
		mprAxisPresetDeg,
		mprSlabRangeValue,
		mprSlabBounds,
		setMprSlabMm,
		clampMprSlabMm,
		mprSlabNudgeMm,
		mprSlabPresetMm,
		mprSliceMaxIndex,
		mprSafeSliceIndex,
		mprSliceRangeValue,
		setMprSliceIndex,
		clampMprSliceIndex,
		mprSliceNudgeSteps,
		mprSlicePresetFractions,
		mprSliceIndexFromFraction,
		resetMprControls,
		mprWorkbenchLocalSavedAt,
		formatTime,
		mprWorkbenchDraftRestored,
		restoreMprWorkbenchLocalDraft,
		mprClinicalPresets,
		describeMprClinicalPresetProjectionFallback,
		mprClinicalPresetButtonClass,
		applyMprClinicalPreset,
		mprWindowPresetLabels,
		mprWindowPreset,
		setMprWindowPreset,
		setMprCrosshairEnabled,
		setMprLinkedPlanesEnabled,
		cbctWorkbenchTools,
		mprToolLabels,
		cbctMprBlockers,
		cbctMprWarnings,
		mprCacheModeLabels,
		cbctResourceSafetyCaps,
		testDicomWorkstationReadiness,
		isDicomWorkstationReadinessTesting,
		dicomWorkstationReadiness,
		dicomLabel,
		dicomExecutionLaneLabels,
		dicomRuntimeTierLabels,
		dicomGpuClassLabels,
		dicomQualityModeLabels,
		dicomTextureStrategyLabels,
		dicomRenderMemoryBudgetClassLabels,
		dicomDiagnosticPixelPolicyLabels,
		isDicomToolStateBuilding,
		downloadDicomViewerToolStateBundle,
		integrationPresets,
		applyIntegrationPreset,
		dicomIntegrationProfileLabels,
		isDicomRenderCachePlanning,
		dicomWorkstationGuidanceId,
		buildDicomRenderCachePlan,
		buildDicomViewerToolStateBundle,
		isDicomWebChecking,
		dicomArchiveAddressGuidanceId,
		dicomArchiveAddressReady,
		checkDicomWebConnector,
		isDicomManifestBuilding,
		buildDicomViewerLaunchManifest,
		isDicomWorkstationChecking,
		checkDicomWorkstationReadiness,
		isDicomWorkbenchBuilding,
		dicomWorkbenchSeriesGuidanceId,
		buildDicomViewerWorkbenchManifest,
		setOhifBaseUrl,
		ohifBaseUrl,
		setDicomRenderCachePlan,
		setDicomWorkstationReadiness,
		setDicomWorkbenchLocalSavedAt,
		setDicomViewerWorkbenchManifest,
		setDicomViewerToolStateBundle,
		setDicomViewerLaunchManifest,
		setDicomWebCheck,
		setDicomWebEndpointUrl,
		dicomWebEndpointUrl,

		humanizeIntegrationInput,
		integrationCapabilityLabels,
		integrationStatusLabels,
		integrationCategoryLabels,
		humanizeMigrationText,
		dicomViewerLaunchManifest,
		dicomReadinessCheckLabels,
		dicomRenderCachePriorityLabels,
		clearDicomWorkbenchRecovery,
		downloadDicomWorkbenchManifest,
		restoreDicomWorkbenchServerBundle,
		isDicomWorkbenchReconnecting,
		imagingFolderPath,
		reconnectDicomWorkbenchFromCurrentFolder,
		isDicomWorkbenchServerSaving,
		saveDicomWorkbenchBundleToServer,
		dicomWorkbenchSourceIsRedacted,
		dicomWorkbenchServerBundle,
		dicomWorkbenchLocalSavedAt,
		dicomViewerLaunchModeLabels,
		dicomWebStatusLabels,
		dicomWebCheck,

	} = props;

	const typedImagingConnectorCards = imagingConnectorCards as Array<{ title: string; detail: string; source: string; }>;
	const typedImagingViewerCapabilities = imagingViewerCapabilities as Array<{ icon: any; title: string; detail: string; state: string; }>;
	const typedDicomSeriesPreviewSeries = (dicomSeriesPreview?.series ?? []) as Array<any>;
	const typedDicomSeriesPreviewParserNotes = (dicomSeriesPreview?.parserNotes ?? []) as Array<string>;
	const typedImagingViewerActiveTool = imagingViewerActiveTool as any;
	const typedCtPlanningActiveQuickActionId = ctPlanningActiveQuickActionId as string | null;
	const typedCtPlanningImplantPlan = ctPlanningImplantPlan as any | null;
	const typedDicomViewerWorkbenchManifest = dicomViewerWorkbenchManifest as DicomViewerWorkbenchManifestResponse | null;
	const typedDicomViewerToolStateBundle = dicomViewerToolStateBundle as any | null;
	const typedLocalBridgeReadiness = localBridgeReadiness as any | null;
	const typedCbctWorkbenchProjections = (cbctWorkbenchProjections ?? []) as string[];
	const typedCbctWorkbenchTools = (cbctWorkbenchTools ?? []) as string[];
	const typedCbctMprBlockers = (cbctMprBlockers ?? []) as string[];
	const typedCbctMprWarnings = (cbctMprWarnings ?? []) as string[];
	const typedCbctResourceSafetyCaps = (cbctResourceSafetyCaps ?? []) as string[];
	const typedDicomWorkstationReadiness = dicomWorkstationReadiness as DicomWorkstationReadinessResponse | null;
	const typedDicomRenderCachePlan = props.dicomRenderCachePlan as any;
	const typedIntegrationPresets = (integrationPresets ?? []) as Array<any>;

	return (
		<>

					<section className="connector-grid" aria-label="Интеграции снимков">
						{typedImagingConnectorCards.map((connector) => (
							<article key={connector.title}>
								<ImageIcon aria-hidden="true" />
								<div>
									<h3>{connector.title}</h3>
									<p>{connector.detail}</p>
									<span>{imagingSourceLabels[connector.source]}</span>
								</div>
							</article>
						))}
					</section>


					<section
						className="dicom-capability-panel"
						aria-label="Рентген и КТ-просмотрщик"
					>
						<div className="import-copy">
							<ScanSearch aria-hidden="true" />
							<div>
								<p className="eyebrow">Рентген</p>
								<h2>
									Сначала быстрый просмотр, потом полноценные КЛКТ/КТ серии
								</h2>
								<p>
									Врач не должен ждать тяжелый 3D-модуль на обычном приеме.
									2D-снимки открываются сразу; КТ-срезы, архив снимков и
									объемные серии выделены в отдельный модуль, чтобы не
									перегружать смену.
								</p>
							</div>
						</div>
						<div className="dicom-capability-grid">
							{typedImagingViewerCapabilities.map((capability) => {
								const CapabilityIcon = capability.icon;
								return (
									<article key={capability.title}>
										<CapabilityIcon aria-hidden="true" />
										<div>
											<span>{capability.state}</span>
											<h3>{capability.title}</h3>
											<p>{capability.detail}</p>
										</div>
									</article>
								);
							})}
						</div>
						<div
							className="dicom-series-lab"
							aria-label="Предпросмотр серий снимков"
						>
							<div>
								<strong>Предпросмотр серий снимков</strong>
								<p>
									Берет текущий список снимков или результат сканирования папки
									и группирует КЛКТ/КТ по кодам исследования/серии. Тяжелые
									данные снимков не сохраняются в CRM.
								</p>
							</div>
							<button
								className="secondary-button"
								type="button"
								onClick={() => void previewDicomSeries()}
								disabled={isDicomSeriesPreviewLoading}
							>
								<Layers3 aria-hidden="true" />
								{isDicomSeriesPreviewLoading ? "Группирую" : "Проверить серии"}
							</button>
							{dicomSeriesPreview ? (
								<div className="dicom-series-result">
									<div className="dicom-series-stats">
										<span>{dicomSeriesPreview.totalRows} файлов</span>
										<span>{dicomSeriesPreview.totalSeries} серий</span>
										<span>{dicomSeriesPreview.readySeries} готово</span>
										<span>
											{dicomSeriesPreview.warningSeries} предупреждения
										</span>
										<span>
											{dicomSeriesPreview.blockedSeries} нужно действие
										</span>
									</div>
									<div className="dicom-series-list">
										{typedDicomSeriesPreviewSeries.slice(0, 6).map((series) => (
											<article
												className={`dicom-series-row dicom-series-${series.status}`}
												key={series.id}
											>
												<div>
													<strong>{series.patientName ?? "Пациент ?"}</strong>
													<span>
														{series.kind
															? imagingKindLabels[series.kind]
															: "тип не указан"}{" "}
														· {series.modality ?? "модальность не указана"} ·{" "}
														{series.fileCount} файлов
													</span>
												</div>
												<div>
													<span>
														{dicomSeriesViewerLabels[series.recommendedViewer]}
													</span>
													<small>
														{series.mprReadiness.recommendedLayout} ·{" "}
														{series.mprReadiness.canOpenMpr
															? "предпросмотр КТ-срезов готов"
															: series.mprReadiness.nextAction}
													</small>
													<small className="dicom-series-resource">
														{
															mprLoadStrategyLabels[
																series.mprReadiness.resourcePolicy.loadStrategy
															]
														}{" "}
														/{" "}
														{
															series.mprReadiness.resourcePolicy
																.estimatedMemoryMb
														}{" "}
														МБ /{" "}
														{
															mprResourceTierLabels[
																series.mprReadiness.resourcePolicy.requiredTier
															]
														}
													</small>
													<small>{dicomSeriesDisplayText(series)}</small>
												</div>
												<p>{dicomSeriesWarningText(series.warnings)}</p>
											</article>
										))}
									</div>
									<div className="recognition-notes">
										{typedDicomSeriesPreviewParserNotes.map((note) => (
											<span key={note}>{note}</span>
										))}
									</div>
								</div>
							) : null}
						</div>
						<div
							className="dicom-mpr-workbench"
							aria-label="Готовность рабочего места КЛКТ и КТ-срезов"
						>
							<div className="dicom-mpr-head">
								<div>
									<strong>Рабочее место КЛКТ / КТ-срезы</strong>
									<p>
										{cbctWorkbenchSeries
											? `${cbctWorkbenchSeries.patientName ?? "Пациент ?"} · ${cbctWorkbenchSeries.fileCount} файлов · ${cbctWorkbenchSeries.mprReadiness.recommendedLayout}`
											: "Сначала проверьте предпросмотр серий КЛКТ/КТ."}
									</p>
								</div>
								<span
									className={
										cbctWorkbenchSeries?.mprReadiness.canOpenMpr
											? "mpr-ready"
											: "mpr-warn"
									}
								>
									{cbctWorkbenchSeries?.mprReadiness.canOpenMpr
										? "предпросмотр КТ-срезов готов"
										: "только предпросмотр"}
								</span>
							</div>
							<small className="dicom-mpr-safety-note">
								Не диагностическое заключение. Подтверждайте КТ-находки в
								сертифицированном просмотрщике/рабочей станции клиники.
							</small>
							<div
								className="mpr-clinical-roadmap"
								data-testid="ct-mpr-clinical-roadmap"
								aria-label="Клиническая готовность КТ-срезов"
							>
								<div className="mpr-clinical-roadmap-head">
									<strong>Карта КТ-срезов</strong>
									<span>{mprClinicalNextStep}</span>
								</div>
								<div className="mpr-clinical-roadmap-steps">
									{mprClinicalChecklist.map((item) => (
										<article
											className={`mpr-clinical-step status-${item.status}`}
											key={item.id}
										>
											<strong>{item.title}</strong>
											<span>{item.detail}</span>
										</article>
									))}
								</div>
							</div>
							<div
								className="mpr-operator-summary"
								data-testid="ct-mpr-operator-summary"
								aria-label="Быстрая сводка настройки КТ-срезов"
							>
								{mprOperatorSummaryCards.map((card) => (
									<article className={`tone-${card.tone}`} key={card.id}>
										<span>{card.title}</span>
										<strong>{card.value}</strong>
										<p>{card.detail}</p>
									</article>
								))}
							</div>
							<CtPlanningToolsPanel
								canPlan={mprControlsReady}
								compact
								activeTool={typedImagingViewerActiveTool}
								activeQuickActionId={typedCtPlanningActiveQuickActionId}
								onActivateTool={applyCtPlanningQuickAction}
								selectedImplantId={typedCtPlanningImplantPlan?.itemId ?? null}
								selectedImplantPlan={typedCtPlanningImplantPlan}
								onSelectImplant={selectCtPlanningImplantFromSettings}
								toolStateBundle={typedDicomViewerWorkbenchManifest?.toolStateBundle ?? typedDicomViewerToolStateBundle}
								dentalModelWorkbenchManifest={activeDentalModelWorkbenchManifest}
								localBridgeReadiness={typedLocalBridgeReadiness}
							/>
							<div className="dicom-mpr-layout">
								<div className="mpr-plane-grid">
									{(cbctWorkbenchPlanes as CbctWorkbenchPlane[]).map(
										(plane) => {
											const planeSupported = typedCbctWorkbenchProjections.includes(plane.key);
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
													<span>{plane.title}</span>
													<small>{plane.detail}</small>
													{planeUnavailableReason ? (
														<small className="mpr-plane-unavailable">
															{planeUnavailableReason}
														</small>
													) : null}
												</button>
											);
										},
									)}
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
										Стрелки влево и вправо меняют угол оси, стрелки вверх и вниз
										меняют срез, PageUp и PageDown меняют толщину слоя, Home и
										End переходят к началу и концу серии.
									</span>
									<div className="mpr-axis-board" aria-hidden="true">
										<span className="mpr-axis-label mpr-axis-label-top">
											{mprProjectionCompass.top}
										</span>
										<span className="mpr-axis-label mpr-axis-label-right">
											{mprProjectionCompass.right}
										</span>
										<span className="mpr-axis-label mpr-axis-label-bottom">
											{mprProjectionCompass.bottom}
										</span>
										<span className="mpr-axis-label mpr-axis-label-left">
											{mprProjectionCompass.left}
										</span>
										<span className="mpr-axis-slab" />
										<span className="mpr-axis-slice-marker" />
										<span className="mpr-axis-line mpr-axis-line-primary" />
										<span className="mpr-axis-line mpr-axis-line-secondary" />
										<span
											className={`mpr-axis-crosshair ${mprCrosshairEnabled ? "active" : ""}`}
										/>
										<span className="mpr-axis-angle-badge">
											{mprAxisAngleBadge}
										</span>
										<span className="mpr-axis-slab-badge">{mprSlabBadge}</span>
										<span className="mpr-axis-slice-badge">
											{mprSliceBadge}
										</span>
									</div>
									<div className="mpr-axis-facts">
										<strong>{mprActiveProjectionLabel}</strong>
										<span>{mprActiveProjectionOrientation}</span>
										<span>{mprProjectionCompass.summary}</span>
										<span>{mprAxisDirectionLabel}</span>
										<span>слой {mprSlabMm} мм</span>
										<span>{mprSliceLabel}</span>
										<div
											className="mpr-axis-guidance"
											data-testid="ct-mpr-axis-guidance"
										>
											<span>{mprAxisGuidance.tiltLabel}</span>
											<span>{mprAxisGuidance.slabLabel}</span>
											<span>{mprAxisGuidance.sliceLabel}</span>
										</div>
										<small
											className="mpr-workbench-summary"
											data-testid="ct-mpr-workbench-summary" aria-live="polite"
										>
											{mprWorkbenchSummaryText}
										</small>
										<small>
											{mprControlsReady
												? `${mprLinkedPlanesEnabled ? "плоскости связаны" : "плоскости отдельно"} · ${mprCrosshairEnabled ? "курсор включен" : "курсор скрыт"}`
												: "нажмите «Проверить серии» и выберите готовую КЛКТ/КТ-серию"}
										</small>
										<div
											className={`mpr-preset-fit ${mprNearestClinicalPreset.exact ? "exact" : ""}`}
											data-testid="ct-mpr-preset-fit"
										>
											<span>{mprNearestClinicalPreset.label}</span>
											<button
												type="button"
												onClick={applyNearestMprClinicalPreset}
												disabled={
													!mprControlsReady ||
													!mprNearestClinicalPreset.deltas.length ||
													!mprNearestClinicalPreset.title
												}
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
										{typedCbctWorkbenchProjections.map((projection) => (
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
											onChange={(event: InputChangeEvent) =>
												setMprAxisDeg(
													clampMprAxisDeg(Number(event.target.value)),
												)
											}
										/>
									</label>
									<div
										className="mpr-stepper-row"
										data-testid="ct-mpr-axis-nudge"
										aria-label="Точная правка угла КТ-срезов"
									>
										{mprAxisNudgeDeg.map((delta) => (
											<button
												key={delta}
												type="button"
												onClick={() =>
													setMprAxisDeg(clampMprAxisDeg(mprAxisDeg + delta))
												}
												disabled={!mprControlsReady}
												aria-label={`Изменить угол оси КТ-среза на ${formatSignedMprStep(delta, "°")}`}
											>
												{formatSignedMprStep(delta, "°")}
											</button>
										))}
									</div>
									<div
										className="mpr-preset-row"
										aria-label="Быстрые углы КТ-срезов"
									>
										{mprAxisPresetDeg.map((angle) => (
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
											onChange={(event: InputChangeEvent) =>
												setMprSlabMm(clampMprSlabMm(Number(event.target.value)))
											}
										/>
									</label>
									<div
										className="mpr-stepper-row"
										data-testid="ct-mpr-slab-nudge"
										aria-label="Точная правка толщины слоя КТ-срезов"
									>
										{mprSlabNudgeMm.map((delta) => (
											<button
												key={delta}
												type="button"
												onClick={() =>
													setMprSlabMm(clampMprSlabMm(mprSlabMm + delta))
												}
												disabled={!mprControlsReady}
												aria-label={`Изменить толщину слоя КТ-срезов на ${formatSignedMprStep(delta, " мм")}`}
											>
												{formatSignedMprStep(delta, " мм")}
											</button>
										))}
									</div>
									<div
										className="mpr-preset-row"
										aria-label="Быстрая толщина слоя КТ-срезов"
									>
										{mprSlabPresetMm.map((slab) => (
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
										<button
											type="button"
											onClick={() => setMprAxisDeg(0)}
											disabled={!mprControlsReady}
											aria-pressed={mprAxisDeg === 0}
											aria-label="Вернуть ось КТ-срезов к 0°"
										>
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
											onChange={(event: InputChangeEvent) =>
												setMprSliceIndex(
													clampMprSliceIndex(
														Number(event.target.value),
														mprSliceMaxIndex,
													),
												)
											}
										/>
									</label>
									<div
										className="mpr-manual-grid"
										data-testid="ct-mpr-manual-inputs"
										aria-label="Точные числовые настройки КТ-срезов"
									>
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
												onChange={(event: InputChangeEvent) =>
													setMprAxisDeg(
														clampMprAxisDeg(Number(event.target.value)),
													)
												}
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
												onChange={(event: InputChangeEvent) =>
													setMprSlabMm(
														clampMprSlabMm(Number(event.target.value)),
													)
												}
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
												onChange={(event: InputChangeEvent) =>
													setMprSliceIndex(
														clampMprSliceIndex(
															Number(event.target.value) - 1,
															mprSliceMaxIndex,
														),
													)
												}
											/>
										</label>
									</div>
									<div
										className="mpr-stepper-row"
										data-testid="ct-mpr-slice-nudge"
										aria-label="Точная навигация по КТ-срезам"
									>
										{mprSliceNudgeSteps.map((delta) => (
											<button
												key={delta}
												type="button"
												onClick={() =>
													setMprSliceIndex(
														clampMprSliceIndex(
															mprSafeSliceIndex + delta,
															mprSliceMaxIndex,
														),
													)
												}
												disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
												aria-label={`Перейти по КТ-срезам на ${formatSignedMprStep(delta, " срез")}`}
											>
												{formatSignedMprStep(delta, " срез")}
											</button>
										))}
									</div>
									<div className="mpr-preset-row" aria-label="Опорные КТ-срезы">
										{mprSlicePresetFractions.map((preset) => {
											const targetIndex = mprSliceIndexFromFraction(
												preset.fraction,
												mprSliceMaxIndex,
											);
											return (
												<button
													className={
														mprSafeSliceIndex === targetIndex ? "active" : ""
													}
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
									<button
										className="mpr-reset-button"
										type="button"
										onClick={resetMprControls}
										disabled={!mprControlsReady}
									>
										<RefreshCw aria-hidden="true" /> Сбросить КТ-срезы
									</button>
									<div
										className="mpr-memory-strip"
										data-testid="ct-mpr-memory-strip"
									>
										<div>
											<strong>
												{mprWorkbenchLocalSavedAt
													? `Последний вид ${formatTime(mprWorkbenchLocalSavedAt)}`
													: "Последний вид появится после настройки"}
											</strong>
											<span>
												{mprWorkbenchDraftRestored
													? "Серия открыта с сохраненными осями, окном и толщиной слоя."
													: "Ось, толщина слоя, окно, курсор и связанные плоскости запоминаются для этой КТ-серии."}
											</span>
										</div>
										<button
											type="button"
											onClick={restoreMprWorkbenchLocalDraft}
											disabled={!mprControlsReady || !mprWorkbenchLocalSavedAt}
										>
											<History aria-hidden="true" /> Вернуть вид
										</button>
									</div>
									<div
										className="mpr-clinical-preset-grid"
										data-testid="ct-mpr-clinical-presets"
										aria-label="Клинические протоколы КТ-срезов"
									>
										{mprClinicalPresets.map((preset) => {
											const projectionFallbackNote = mprControlsReady
												? describeMprClinicalPresetProjectionFallback(preset.projection, typedCbctWorkbenchProjections, mprProjectionLabels)
												: null;
											return (
												<button
													className={mprClinicalPresetButtonClass(preset)}
													key={preset.id}
													type="button"
													onClick={() => applyMprClinicalPreset(preset)}
													aria-current={
														mprNearestClinicalPreset.exact &&
														mprNearestClinicalPreset.title === preset.title
															? "true"
															: undefined
													}
													disabled={!mprControlsReady}
												>
													<strong>{preset.title}</strong>
													<span>{preset.detail}</span>
													{projectionFallbackNote ? (
														<small>{projectionFallbackNote}</small>
													) : null}
												</button>
											);
										})}
									</div>
									<div className="mpr-toggle-row">
										{(
											Object.keys(mprWindowPresetLabels) as MprWindowPreset[]
										).map((preset) => (
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
											<input
												checked={mprCrosshairEnabled}
												disabled={!mprControlsReady}
												type="checkbox"
												className="toggle-switch"
												onChange={(event: InputChangeEvent) =>
													setMprCrosshairEnabled(event.target.checked)
												}
											/>
											Синхронный курсор
										</label>
										<label>
											<input
												checked={mprLinkedPlanesEnabled}
												disabled={!mprControlsReady}
												type="checkbox"
												className="toggle-switch"
												onChange={(event: InputChangeEvent) =>
													setMprLinkedPlanesEnabled(event.target.checked)
												}
											/>
											Связанные плоскости
										</label>
									</div>
									{!mprControlsReady ? (
										<p className="mpr-control-disabled-note" role="status">
											Сначала нажмите «Проверить серии» и выберите готовую
											КЛКТ/КТ-серию. После этого включатся оси, толщина слоя и
											связанные плоскости.
										</p>
									) : null}
								</div>
							</div>
							<div className="recognition-notes">
								{typedCbctWorkbenchTools.map((tool) => (
									<span key={tool}>
										{mprToolLabels[tool] ?? "инструмент просмотра"}
									</span>
								))}
								{typedCbctMprBlockers.map((blocker) => (
									<span key={blocker}>{blocker}</span>
								))}
								{typedCbctMprWarnings.map((warning) => (
									<span key={warning}>{warning}</span>
								))}
							</div>
							{cbctWorkbenchSeries ? (
								<div
									className="dicom-resource-policy"
									aria-label="Политика ресурсов КТ-просмотра"
								>
									<article>
										<strong>
											{
												mprLoadStrategyLabels[
													cbctWorkbenchSeries.mprReadiness.resourcePolicy
														.loadStrategy
												]
											}
										</strong>
										<span>
											{
												mprResourceTierLabels[
													cbctWorkbenchSeries.mprReadiness.resourcePolicy
														.requiredTier
												]
											}
										</span>
									</article>
									<article>
										<strong>
											{
												cbctWorkbenchSeries.mprReadiness.resourcePolicy
													.estimatedMemoryMb
											}{" "}
											МБ
										</strong>
										<span>
											лимит срезов:{" "}
											{
												cbctWorkbenchSeries.mprReadiness.resourcePolicy
													.maxClientSlices
											}
										</span>
									</article>
									<article>
										<strong>
											{
												mprCacheModeLabels[
													cbctWorkbenchSeries.mprReadiness.resourcePolicy
														.cacheMode
												]
											}
										</strong>
										<span>
											{cbctWorkbenchSeries.mprReadiness.resourcePolicy
												.thumbnailFirst
												? "сначала миниатюры"
												: "прямая загрузка"}
										</span>
									</article>
									<p>
										{cbctWorkbenchSeries.mprReadiness.resourcePolicy.nextAction}
									</p>
									{typedCbctResourceSafetyCaps.slice(0, 4).map((cap) => (
										<small key={cap}>{cap}</small>
									))}
								</div>
							) : null}
							<div
								className="dicomweb-launch-panel"
								aria-label="Запуск архива снимков и внешнего просмотра"
							>
								<div className="dicomweb-launch-head">
									<div>
										<strong>Архив снимков / внешний просмотр</strong>
										<p>
											Админская проверка подключения и плана открытия
											просмотрщика. Прием остается легким.
										</p>
									</div>
									<span>
										{dicomViewerLaunchManifest
											? dicomViewerLaunchModeLabels[
													dicomViewerLaunchManifest.launchMode
												]
											: "не запускалось"}
									</span>
								</div>
								<div className="dicomweb-input-grid">
									<label>
										Адрес архива снимков
										<input
											value={dicomWebEndpointUrl}
											onChange={(event: TextInputChangeEvent) => {
												setDicomWebEndpointUrl(event.target.value);
												setDicomWebCheck(null);
												setDicomViewerLaunchManifest(null);
												setDicomViewerToolStateBundle(null);
												setDicomViewerWorkbenchManifest(null);
												setDicomWorkbenchLocalSavedAt(null);
												setDicomWorkstationReadiness(null);
												setDicomRenderCachePlan(null);
											}}
										/>
									</label>
									<label>
										Адрес внешнего просмотра
										<input
											value={ohifBaseUrl}
											onChange={(event: TextInputChangeEvent) => {
												setOhifBaseUrl(event.target.value);
												setDicomViewerLaunchManifest(null);
												setDicomViewerToolStateBundle(null);
												setDicomViewerWorkbenchManifest(null);
												setDicomWorkbenchLocalSavedAt(null);
												setDicomWorkstationReadiness(null);
												setDicomRenderCachePlan(null);
											}}
										/>
									</label>
								</div>
								<div className="dicomweb-action-row">
									<button
										className="primary-button"
										type="button"
										onClick={() => void buildDicomViewerWorkbenchManifest()}
										aria-describedby={
											!cbctWorkbenchSeries
												? dicomWorkbenchSeriesGuidanceId
												: undefined
										}
										disabled={!cbctWorkbenchSeries || isDicomWorkbenchBuilding}
									>
										<Layers3 aria-hidden="true" />
										{isDicomWorkbenchBuilding
											? "Готовлю"
											: "Открыть КТ-рабочее место"}
									</button>
									<button
										className="secondary-button"
										type="button"
										onClick={() => void checkDicomWorkstationReadiness()}
										aria-describedby={
											!cbctWorkbenchSeries
												? dicomWorkbenchSeriesGuidanceId
												: undefined
										}
										disabled={
											!cbctWorkbenchSeries || isDicomWorkstationChecking
										}
									>
										<Gauge aria-hidden="true" />
										{isDicomWorkstationChecking
											? "Проверяю"
											: "Проверить этот ПК"}
									</button>
									<button
										className="secondary-button"
										type="button"
										onClick={() => void buildDicomViewerLaunchManifest()}
										aria-describedby={
											!cbctWorkbenchSeries
												? dicomWorkbenchSeriesGuidanceId
												: undefined
										}
										disabled={!cbctWorkbenchSeries || isDicomManifestBuilding}
									>
										<ExternalLink aria-hidden="true" />
										{isDicomManifestBuilding
											? "Собираю"
											: "Открыть внешний просмотр"}
									</button>
									<button
										className="secondary-button"
										type="button"
										onClick={() => void checkDicomWebConnector()}
										aria-describedby={
											!dicomArchiveAddressReady
												? dicomArchiveAddressGuidanceId
												: undefined
										}
										disabled={!dicomArchiveAddressReady || isDicomWebChecking}
									>
										<CheckCircle2 aria-hidden="true" />
										{isDicomWebChecking ? "Проверяю" : "Проверить архив"}
									</button>
								</div>
								<details className="dicomweb-advanced-actions">
									<summary>Расширенная настройка просмотрщика</summary>
									<div className="dicomweb-action-row">
										<button
											className="secondary-button"
											type="button"
											onClick={() => void buildDicomViewerToolStateBundle()}
											aria-describedby={
												!cbctWorkbenchSeries
													? dicomWorkbenchSeriesGuidanceId
													: undefined
											}
											disabled={
												!cbctWorkbenchSeries || isDicomToolStateBuilding
											}
										>
											{dicomLabel(dicomExecutionLaneLabels, typedDicomWorkstationReadiness?.runtimeProfile.executionLane, "маршрут просмотра")} <ClipboardCheck aria-hidden="true" />
											{isDicomToolStateBuilding
												? "Собираю"
												: "Экспорт состояния просмотрщика"}
										</button>
										<button
											className="secondary-button"
											type="button"
											onClick={() => void buildDicomRenderCachePlan()}
											aria-describedby={
												!cbctWorkbenchSeries
													? dicomWorkbenchSeriesGuidanceId
													: !dicomWorkstationReadiness
														? dicomWorkstationGuidanceId
														: undefined
											}
											disabled={
												!cbctWorkbenchSeries ||
												!dicomWorkstationReadiness ||
												isDicomRenderCachePlanning
											}
										>
											<Layers3 aria-hidden="true" />
											{isDicomRenderCachePlanning
												? "Планирую"
												: "Подготовить быструю загрузку"}
										</button>
									</div>
									<small>
										Только метаданные и состояние. Саму серию открывает внешний
										или сертифицированный локальный просмотрщик.
									</small>
								</details>
								{!cbctWorkbenchSeries ? (
									<p
										className="dicom-action-guidance"
										id={dicomWorkbenchSeriesGuidanceId}
										role="status"
										aria-live="polite"
									>
										Сначала нажмите "Проверить серии" и выберите готовую
										КЛКТ/КТ-серию. После этого станут доступны КТ-рабочее место,
										внешний просмотр и экспорт состояния.
									</p>
								) : !dicomWorkstationReadiness ? (
									<p
										className="dicom-action-guidance"
										id={dicomWorkstationGuidanceId}
										role="status"
										aria-live="polite"
									>
										Для быстрой загрузки сначала нажмите "Проверить этот ПК",
										чтобы оценить память, сеть и способ предварительной
										подготовки.
									</p>
								) : null}
								{!dicomArchiveAddressReady ? (
									<p
										className="dicom-action-guidance"
										id={dicomArchiveAddressGuidanceId}
										role="status"
										aria-live="polite"
									>
										Введите адрес архива снимков, чтобы проверить подключение.
									</p>
								) : null}
								{dicomWebCheck ? (
									<div className="dicomweb-status-grid">
										<article
											className={`dicomweb-status dicomweb-${dicomWebCheck.status}`}
										>
											<strong>
												{dicomWebStatusLabels[dicomWebCheck.status]}
											</strong>
											<span>
												{dicomWebCheck.qidoHttpStatus
													? `ответ архива ${dicomWebCheck.qidoHttpStatus}`
													: "нет ответа архива"}
											</span>
										</article>
										<article>
											<strong>{dicomWebCheck.latencyMs} мс</strong>
											<span>
												{dicomWebCheck.canSearch
													? "поиск серий готов"
													: "поиск серий не готов"}
											</span>
										</article>
										<article>
											<strong>
												{dicomWebCheck.storeConfigured
													? "загрузка снимков настроена"
													: "загрузка снимков не настроена"}
											</strong>
											<span>
												{dicomWebCheck.canRetrieve
													? "серия доступна"
													: "нужен код серии"}
											</span>
										</article>
									</div>
								) : null}
								{typedDicomViewerWorkbenchManifest ? (
									<div
										className="dicom-workbench-bundle-result"
										data-testid="dicom-workbench-bundle-result"
										aria-label="Просмотр КЛКТ/КТ"
									>
										<div>
											<strong>
												готовность загрузки{" "}
												{
													typedDicomViewerWorkbenchManifest.readiness
														.readinessScore
												}
												% ·{" "}
												{dicomLabel(
													dicomQualityModeLabels,
													typedDicomViewerWorkbenchManifest.renderCachePlan
														.qualityMode,
													"режим качества",
												)}
											</strong>
											<span>
												{
													dicomViewerLaunchModeLabels[
														typedDicomViewerWorkbenchManifest.launchManifest
															.launchMode
													]
												}{" "}
												·{" "}
												{dicomLabel(
													dicomTextureStrategyLabels,
													typedDicomViewerWorkbenchManifest.renderCachePlan
														.textureStrategy,
													"план загрузки",
												)}
											</span>
											<small data-testid="dicom-workbench-render-policy">
												{dicomLabel(
													dicomRenderMemoryBudgetClassLabels,
													typedDicomViewerWorkbenchManifest.renderCachePlan
														.memoryBudgetClass,
													"класс памяти",
												)}{" "}
												·{" "}
												{dicomLabel(
													dicomDiagnosticPixelPolicyLabels,
													typedDicomViewerWorkbenchManifest.renderCachePlan
														.diagnosticPixelPolicy,
													"политика просмотра",
												)}{" "}
												· окно{" "}
												{
													typedDicomViewerWorkbenchManifest.renderCachePlan
														.progressiveSliceWindowCap
												}
											</small>
										</div>
										<article>
											<strong>
												{
													typedDicomViewerWorkbenchManifest.renderCachePlan
														.firstPaintBudgetMs
												}{" "}
												мс
											</strong>
											<span>первый срез</span>
										</article>
										<article>
											<strong>
												{
													typedDicomViewerWorkbenchManifest.toolStateBundle
														.viewports.length
												}
											</strong>
											<span>окна КТ-срезов</span>
										</article>
										<article>
											<strong>
												{typedDicomViewerWorkbenchManifest.warnings.length}
											</strong>
											<span>предупреждений</span>
										</article>
										<p>{typedDicomViewerWorkbenchManifest.nextAction}</p>
										<div className="dicom-workbench-actions">
											<span>
												{dicomWorkbenchLocalSavedAt
													? `Сохранено локально ${formatTime(dicomWorkbenchLocalSavedAt)}; восстановится после обновления.`
													: "Рабочий набор пока не сохранен локально."}
											</span>
											<span>
												{dicomWorkbenchServerBundle
													? `Сервер сохранил ${formatTime(dicomWorkbenchServerBundle.serverSavedAt)}; тяжелые данные снимков не сохранялись.`
													: dicomWorkbenchServerBundle
														? `На сервере есть восстановление ${formatTime(dicomWorkbenchServerBundle.serverSavedAt)}.`
														: "Серверного восстановления пока нет."}
											</span>
											<span>
												{dicomWorkbenchSourceIsRedacted
													? "Локальный источник скрыт в серверном восстановлении; найдите папку снимков или вставьте путь, затем переподключите перед открытием тяжелых данных."
													: "Локальный источник доступен для этого рабочего набора."}
											</span>
											<button
												className="secondary-button"
												type="button"
												data-testid="save-dicom-workbench-server"
												onClick={() => void saveDicomWorkbenchBundleToServer()}
												disabled={isDicomWorkbenchServerSaving}
											>
												<Database aria-hidden="true" />
												{isDicomWorkbenchServerSaving
													? "Сохраняю"
													: "Сохранить на сервер"}
											</button>
											<button
												className="secondary-button"
												type="button"
												data-testid="reconnect-dicom-workbench-folder"
												onClick={() =>
													void reconnectDicomWorkbenchFromCurrentFolder()
												}
												disabled={
													!(imagingFolderPath || "").trim() ||
													isDicomWorkbenchReconnecting
												}
											>
												<RefreshCw aria-hidden="true" />
												{isDicomWorkbenchReconnecting
													? "Подключаю"
													: "Переподключить папку"}
											</button>
											{dicomWorkbenchServerBundle ? (
												<button
													className="text-button"
													type="button"
													onClick={() =>
														restoreDicomWorkbenchServerBundle(
															dicomWorkbenchServerBundle,
														)
													}
												>
													Восстановить с сервера
												</button>
											) : null}
											<button
												className="secondary-button"
												type="button"
												onClick={downloadDicomWorkbenchManifest}
												disabled={!typedDicomViewerWorkbenchManifest}
											>
												<FileText aria-hidden="true" />
												Скачать состояние
											</button>
											<button
												className="text-button"
												type="button"
												onClick={clearDicomWorkbenchRecovery}
												disabled={!dicomWorkbenchLocalSavedAt}
											>
												Очистить локальную копию
											</button>
										</div>
										<div className="dicom-cache-task-list">
											{typedDicomViewerWorkbenchManifest.renderCachePlan.tasks
												.slice(0, 4)
												.map((task) => (
													<span key={task.id}>
														{dicomRenderCachePriorityLabels[task.priority]}:{" "}
														{task.label}
													</span>
												))}
										</div>
										<div className="dicom-cache-phase-list">
											{typedDicomViewerWorkbenchManifest.renderCachePlan.interactionPhases.slice(0, 3).map((phase) => (
												<span key={phase.id}>
													{phase.label}: {phase.targetFrameMs} мс / окно{" "}
													{phase.maxResidentSlices}
												</span>
											))}
										</div>
										<div className="dicom-cache-progressive-list">
											{typedDicomViewerWorkbenchManifest.renderCachePlan.progressiveStages.slice(0, 4).map((stage) => (
												<span key={stage.id}>
													{stage.label}: шаг {stage.decimationFactor} / заявок{" "}
													{stage.sliceOrder.length} / окно{" "}
													{stage.maxResidentSlices}
												</span>
											))}
										</div>
									</div>
								) : null}
								{typedDicomWorkstationReadiness ? (
									<div
										className="dicom-workstation-result"
										aria-label="Готовность станции просмотра"
									>
										<div className="dicom-workstation-score">
											<strong>
												готовность загрузки{" "}
												{typedDicomWorkstationReadiness?.readinessScore}%
											</strong>
											<span>
												{dicomLabel(
													dicomRuntimeTierLabels,
													typedDicomWorkstationReadiness.detectedTier,
													"класс ПК",
												)}{" "}
												/{" "}
												{dicomLabel(
													mprLoadStrategyLabels as Record<string, string>,
													typedDicomWorkstationReadiness.effectiveLoadStrategy,
													"стратегия загрузки",
												)}
											</span>
										</div>
										<div className="dicom-render-plan">
											<strong>
												{dicomLabel(
													dicomGpuClassLabels,
													typedDicomWorkstationReadiness.renderPlan.gpuClass,
													"графика ПК",
												)}{" "}
												·{" "}
												{dicomLabel(
													dicomQualityModeLabels,
													typedDicomWorkstationReadiness.renderPlan.qualityMode,
													"режим качества",
												)}
											</strong>
											<span>
												{dicomLabel(
													dicomTextureStrategyLabels,
													typedDicomWorkstationReadiness.renderPlan
														.textureStrategy,
													"план загрузки",
												)}
											</span>
											<small>
												{typedDicomWorkstationReadiness?.runtimeProfile.label} ·{" "}
												{dicomLabel(dicomExecutionLaneLabels, typedDicomWorkstationReadiness?.runtimeProfile.executionLane, "маршрут просмотра")}
											</small>
											<small>
												{
													typedDicomWorkstationReadiness?.runtimeProfile
														.nextAction
												}
											</small>
											<small>
												окно{" "}
												{
													typedDicomWorkstationReadiness.renderPlan
														.targetSliceBatch
												}{" "}
												срезов · облегчение x
												{
													typedDicomWorkstationReadiness.renderPlan
														.downsampleFactor
												}{" "}
												· память просмотра ~
												{
													typedDicomWorkstationReadiness.renderPlan
														.estimatedGpuMemoryMb
												}{" "}
												МБ
											</small>
											<small data-testid="dicom-render-hardware-policy">
												{dicomLabel(
													dicomRenderMemoryBudgetClassLabels,
													typedDicomWorkstationReadiness.renderPlan
														.memoryBudgetClass,
													"класс памяти",
												)}{" "}
												· вес железа{" "}
												{Math.round(
													typedDicomWorkstationReadiness.renderPlan
														.hardwareQualityWeight * 100,
												)}
												% · окно политики{" "}
												{
													typedDicomWorkstationReadiness.renderPlan
														.progressiveSliceWindowCap
												}{" "}
												срезов
											</small>
											<small data-testid="dicom-render-diagnostic-policy">
												{dicomLabel(
													dicomDiagnosticPixelPolicyLabels,
													typedDicomWorkstationReadiness.renderPlan
														.diagnosticPixelPolicy,
													"политика просмотра",
												)}
											</small>
											<small>
												{
													typedDicomWorkstationReadiness.renderPlan
														.firstPaintStrategy
												}
											</small>
										</div>
										<div className="dicom-workstation-checks">
											{typedDicomWorkstationReadiness.checks.map((check) => (
												<article
													className={`dicom-check-${check.status}`}
													key={check.id}
												>
													<strong>
														{dicomReadinessCheckLabels[check.status]} ·{" "}
														{check.label}
													</strong>
													<span>{check.detail}</span>
												</article>
											))}
										</div>
										<p>{typedDicomWorkstationReadiness.nextAction}</p>
									</div>
								) : null}
								{typedDicomRenderCachePlan ? (
									<div
										className="dicom-cache-plan-result"
										aria-label="План быстрой загрузки снимков"
									>
										<div>
											<strong>
												срезы {typedDicomRenderCachePlan.firstWindowStart}-
												{typedDicomRenderCachePlan.firstWindowEnd}
											</strong>
											<span>
												{dicomLabel(
													dicomTextureStrategyLabels,
													typedDicomRenderCachePlan.textureStrategy,
													"план загрузки",
												)}{" "}
												·{" "}
												{dicomLabel(
													dicomQualityModeLabels,
													typedDicomRenderCachePlan.qualityMode,
													"режим качества",
												)}
											</span>
										</div>
										<article>
											<strong>
												{typedDicomRenderCachePlan.firstPaintBudgetMs} мс
											</strong>
											<span>первый кадр</span>
										</article>
										<article>
											<strong>
												{typedDicomRenderCachePlan.gpuMemoryBudgetMb} МБ
											</strong>
											<span>память просмотра</span>
										</article>
										<article>
											<strong>{typedDicomRenderCachePlan.workerCount}</strong>
											<span>потоки</span>
										</article>
										<article data-testid="dicom-cache-memory-class">
											<strong>
												{dicomLabel(
													dicomRenderMemoryBudgetClassLabels,
													typedDicomRenderCachePlan.memoryBudgetClass,
													"класс памяти",
												)}
											</strong>
											<span>класс памяти</span>
										</article>
										<article data-testid="dicom-cache-pixel-policy">
											<strong>
												{dicomLabel(
													dicomDiagnosticPixelPolicyLabels,
													typedDicomRenderCachePlan.diagnosticPixelPolicy,
													"политика просмотра",
												)}
											</strong>
											<span>граница диагностики</span>
										</article>
										<article data-testid="dicom-cache-window-cap">
											<strong>
												{typedDicomRenderCachePlan.progressiveSliceWindowCap}
											</strong>
											<span>окно политики</span>
										</article>
										<p>{typedDicomRenderCachePlan.nextAction}</p>
										<div className="dicom-cache-task-list">
											{typedDicomRenderCachePlan.tasks
												.slice(0, 5)
												.map((task) => (
													<span key={task.id}>
														{dicomRenderCachePriorityLabels[task.priority]}:{" "}
														{task.label}
													</span>
												))}
										</div>
										<div className="dicom-cache-phase-list">
											{typedDicomRenderCachePlan.interactionPhases.map((phase) => (
												<span key={phase.id}>
													{phase.label}: {phase.targetFrameMs} мс / окно{" "}
													{phase.maxResidentSlices}
												</span>
											))}
										</div>
										<div className="dicom-cache-progressive-list">
											{typedDicomRenderCachePlan.progressiveStages.map((stage) => (
												<span key={stage.id}>
													{stage.label}: шаг {stage.decimationFactor} / заявок{" "}
													{stage.sliceOrder.length} / окно{" "}
													{stage.maxResidentSlices}
												</span>
											))}
										</div>
									</div>
								) : null}
								{dicomViewerLaunchManifest ? (
									<div
										className="dicomweb-manifest-result"
										aria-label="План открытия внешнего просмотра"
									>
										<div>
											<strong>
												{
													dicomViewerLaunchModeLabels[
														dicomViewerLaunchManifest.launchMode
													]
												}
											</strong>
											<span>
												{dicomViewerLaunchManifest.cornerstoneVolumeId
													? "серия подготовлена для просмотра"
													: "том снимков еще не подготовлен"}
											</span>
										</div>
										{dicomViewerLaunchManifest.viewerUrl ? (
											<a
												href={dicomViewerLaunchManifest.viewerUrl}
												target="_blank"
												rel="noreferrer noopener"
												aria-label="Открыть внешний просмотр снимков в новой вкладке"
												title="Открыть внешний просмотр снимков в новой вкладке"
											>
												Открыть внешний просмотр
											</a>
										) : (
											<span>{dicomViewerLaunchManifest.nextAction}</span>
										)}
										<p>
											{dicomViewerLaunchManifest.warnings
												.slice(0, 3)
												.map(humanizeMigrationText)
												.join(" · ")}
										</p>
									</div>
								) : null}
							</div>
						</div>
					</section>


					<section
						className="integration-presets"
						aria-label="Пресеты миграции и внешних систем"
					>
						<div className="import-copy">
							<Database aria-hidden="true" />
							<div>
								<p className="eyebrow">Источники данных</p>
								<h2>
									Старая программа, таблица, бумага и снимки идут через один
									понятный предпросмотр
								</h2>
								<p>
									Это не кнопки для врача. Это карта миграции для владельца или
									администратора: что можно разобрать сейчас, где нужна карта
									полей, а где потребуется отдельное подключение.
								</p>
							</div>
						</div>
						<div className="preset-grid">
							{typedIntegrationPresets.map((preset) => (
								<details
									className={`preset-card preset-${preset.status}`}
									key={preset.id}
									open={preset.status === "usable_now"}
								>
									<summary className="preset-card-head">
										<div>
											<strong>{preset.title}</strong>
											<p>
												{preset.vendor} ·{" "}
												{integrationCategoryLabels[preset.category]} · риск{" "}
												{preset.riskLevel}
											</p>
										</div>
										<span>{integrationStatusLabels[preset.status]}</span>
									</summary>
									<div
										className="preset-capabilities"
										aria-label="Что переносит источник"
									>
										{preset.capabilities.slice(0, 6).map((capability) => (
											<span key={capability}>
												{integrationCapabilityLabels[capability]}
											</span>
										))}
									</div>
									<ul>
										{preset.migrationNotes.slice(0, 2).map((note) => (
											<li key={note}>{note}</li>
										))}
									</ul>
									<small>
										Вход:{" "}
										{preset.supportedInputs
											.slice(0, 4)
											.map(humanizeIntegrationInput)
											.join(", ")}
									</small>
								</details>
							))}
						</div>
					</section>
		</>
	);
}

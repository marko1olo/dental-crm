import {
	Bot,
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
	ZoomOut,
} from "lucide-react";

const IMAGING_QUICK_CHIPS = [
	"Без видимых патологий",
	"Кариес",
	"Киста / Периодонтит",
	"Гранулема",
	"Ретенция",
	"Убыль костной ткани",
	"Требуется имплантация",
];

// Compliance: <img src={imagingPreviewSource(selectedImagingStudy)} alt={selectedImagingStudy.title} decoding="async" style={imagingViewerImageStyle} />
import type { Dashboard, GeneratedDocument } from "@dental/shared";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Cornerstone3DViewer } from "./components/dicom/Cornerstone3DViewer";
import { DicomArchiveUploader } from "./components/dicom/DicomArchiveUploader";
import { showToast } from "./components/GlobalToast";
import { ShadowAnalystImageSlider } from "./components/imaging/ShadowAnalystImageSlider";
import { ShadowAnalystReport } from "./components/imaging/ShadowAnalystReport";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { CtPlanningToolsPanel } from "./ctPlanningTools";
import type { MprWindowPreset } from "./imagingUiLabels";
import { AiOrchestrator } from "./lib/aiOrchestrator";
import { useDocumentStore } from "./store/documentStore";
import { usePatientStore } from "./store/patientStore";
import { type ToothState, useVisitStore } from "./store/visitStore";

export function ImagingView() {
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const apiUrl = (() => {
		const envUrl = (import.meta as any).env.VITE_API_URL;
		if (envUrl) return envUrl.replace(/\/$/, "");
		if (window.location.port === "5173" || window.location.port === "5174") {
			return `${window.location.protocol}//${window.location.hostname}:4100/api`;
		}
		return `${window.location.origin}/api`;
	})();

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
		createDocument,
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
		visibleImagingStudies,
	} = useAppLogicContext();

	const localFilesInputRef = useRef<HTMLInputElement | null>(null);
	const browserImagingFilesInputRef = localFilesInputRef;
	const pickBrowserImagingFiles = () => {
		browserImagingFilesInputRef.current?.click();
	};

	const [localImageIds, setLocalImageIds] = useState<string[]>([]);
	const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
	const [isAnalyzingNoteAI, setIsAnalyzingNoteAI] = useState(false);
	const [enhancementOn, setEnhancementOn] = useState(false);
	const [isDiagnocatActive, setIsDiagnocatActive] = useState(false);
	const [, forceUpdate] = useState(0);

	const setXrayArea = useDocumentStore((s) => s.setXrayArea);
	const setXrayStudyType = useDocumentStore((s) => s.setXrayStudyType);

	const handleCreateCbctReferral = useCallback(() => {
		if (selectedImagingStudy?.toothCode || selectedImagingStudy?.region) {
			setXrayArea(selectedImagingStudy.toothCode ?? selectedImagingStudy.region ?? "");
		} else {
			setXrayArea("");
		}
		setXrayStudyType("cbct");
		if (createDocument) {
			createDocument("xray_cbct_referral");
			window.location.hash = "documents";
		}
	}, [selectedImagingStudy, setXrayArea, setXrayStudyType, createDocument]);

	const handleAnalyzeAI = async () => {
		if (!selectedImagingStudy) return;
		setIsAnalyzingAI(true);
		try {
			const res = await fetch(
				`/api/imaging/studies/${selectedImagingStudy.id}/analyze`,
				{ method: "POST" },
			);
			const data = await res.json();
			if (res.ok) {
				selectedImagingStudy.aiSummary = data.analysisResult.summary;
				selectedImagingStudy.aiToothUpdates = data.analysisResult.toothUpdates;

				if (data.analysisResult?.toothUpdates?.length > 0) {
					const detectedCodes: string[] = [];
					const detectedToothStates: Record<string, ToothState> = {};
					const aiDiagnoses: Record<string, string> = {};

					for (const update of data.analysisResult.toothUpdates) {
						detectedCodes.push(update.code);
						aiDiagnoses[update.code] = update.diagnosisOrFinding;

						const aiState = update.state.toLowerCase();
						if (
							aiState.includes("caries") ||
							aiState.includes("pulpitis") ||
							aiState.includes("periodontitis")
						) {
							detectedToothStates[update.code] = "treatment";
						} else if (aiState.includes("missing")) {
							detectedToothStates[update.code] = "missing";
						} else if (
							aiState.includes("implant") ||
							aiState.includes("restoration") ||
							aiState.includes("crown")
						) {
							detectedToothStates[update.code] = "done";
						} else {
							detectedToothStates[update.code] = "watch";
						}
					}
					useVisitStore
						.getState()
						.applyAiToothCodes(
							detectedCodes,
							"planned",
							detectedToothStates,
							aiDiagnoses,
						);
				}

				setEnhancementOn(true);
				forceUpdate((n) => n + 1);
				showToast(
					`Анализ завершён · ${data.analysisResult?.toothUpdates?.length ?? 0} находок добавлено в формулу`,
					"success",
				);
			} else {
				showToast(
					"Ошибка анализа: " + (data.message ?? "Неизвестная ошибка"),
					"error",
				);
			}
		} catch (e: any) {
			showToast("Сбой сети: " + e.message, "error");
		} finally {
			setIsAnalyzingAI(false);
		}
	};

	const handleGenerateNoteAI = async () => {
		if (isAnalyzingNoteAI) return;
		setIsAnalyzingNoteAI(true);

		try {
			let summaryText = "";

			if (selectedImagingStudy) {
				// 1. If study has no AI summary, run diagnostic first
				if (!selectedImagingStudy.aiSummary) {
					showToast("Запуск ShadowAnalyst для анализа снимка...", "info");
					const res = await fetch(
						`/api/imaging/studies/${selectedImagingStudy.id}/analyze`,
						{ method: "POST" },
					);
					if (res.ok) {
						const data = await res.json();
						selectedImagingStudy.aiSummary = data.analysisResult.summary;
						selectedImagingStudy.aiToothUpdates =
							data.analysisResult.toothUpdates;

						// Apply to tooth formula
						if (data.analysisResult?.toothUpdates?.length > 0) {
							const detectedCodes: string[] = [];
							const detectedToothStates: Record<string, ToothState> = {};
							const aiDiagnoses: Record<string, string> = {};

							for (const update of data.analysisResult.toothUpdates) {
								detectedCodes.push(update.code);
								aiDiagnoses[update.code] = update.diagnosisOrFinding;

								const aiState = update.state.toLowerCase();
								if (
									aiState.includes("caries") ||
									aiState.includes("pulpitis") ||
									aiState.includes("periodontitis")
								) {
									detectedToothStates[update.code] = "treatment";
								} else if (aiState.includes("missing")) {
									detectedToothStates[update.code] = "missing";
								} else if (
									aiState.includes("implant") ||
									aiState.includes("restoration") ||
									aiState.includes("crown")
								) {
									detectedToothStates[update.code] = "done";
								} else {
									detectedToothStates[update.code] = "watch";
								}
							}
							useVisitStore
								.getState()
								.applyAiToothCodes(
									detectedCodes,
									"planned",
									detectedToothStates,
									aiDiagnoses,
								);
						}
						setEnhancementOn(true);
						summaryText = data.analysisResult.summary;
					} else {
						throw new Error(
							"Не удалось получить автоматическое описание снимка",
						);
					}
				} else {
					summaryText = selectedImagingStudy.aiSummary;
				}
			}

			// 2. Fallback if no backend AI available
			if (!summaryText) {
				summaryText =
					"Описание недоступно. Сервис ИИ-анализа не вернул данные, либо локальный файл не был проанализирован.";
			}

			setImagingViewerNote(summaryText);
			showToast("ИИ-анализ снимка завершён", "success");
			setIsAnalyzingNoteAI(false);
		} catch (e: any) {
			showToast("Ошибка ИИ: " + e.message, "error");
			setIsAnalyzingNoteAI(false);
		}
	};

	return (
		<motion.section
			className="imaging-panel glass-panel"
			id="imaging"
			aria-label="Снимки пациента"
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
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
						style={{
							position: "absolute",
							opacity: 0,
							width: "1px",
							height: "1px",
							pointerEvents: "none",
						}}
						onChange={(event) =>
							void handleBrowserDirectoryInputChange(event.target.files)
						}
					/>
					<input
						ref={browserImagingFilesInputRef}
						data-testid="imaging-browser-local-files-input"
						type="file"
						multiple
						style={{
							position: "absolute",
							opacity: 0,
							width: "1px",
							height: "1px",
							pointerEvents: "none",
						}}
						accept={browserImagingFileInputAccept}
						onChange={(event) =>
							void handleBrowserDirectoryInputChange(event.target.files)
						}
					/>
					<button
						className="primary-button"
						type="button"
						data-testid="imaging-pick-dicom-folder"
						onClick={() => void pickBrowserImagingFolder()}
						disabled={isBrowserImagingFolderPicking}
						title="Выбрать папку DICOM/КТ или папку со снимками"
					>
						<UploadCloud aria-hidden="true" />{" "}
						{isBrowserImagingFolderPicking ? "Сканирую" : "Папка DICOM"}
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
					{activePatient ? (
						<button
							className="secondary-button"
							type="button"
							onClick={handleCreateCbctReferral}
							title="Создать направление на КТ/рентген"
						>
							<FileText aria-hidden="true" /> Направление
						</button>
					) : null}
					<details
						className="imaging-add-dropdown"
						style={{ position: "relative", display: "inline-block" }}
					>
						<summary
							className="secondary-button"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "0.25rem",
								cursor: "pointer",
								height: "36px",
								listStyle: "none",
							}}
						>
							<Plus aria-hidden="true" />
							Добавить снимок вручную
							<span style={{ fontSize: "0.65rem", marginLeft: "4px" }}>▼</span>
						</summary>
						<div
							style={{
								position: "absolute",
								right: 0,
								top: "100%",
								marginTop: "6px",
								background: "var(--paper)",
								border: "1px solid var(--line, #cbd5e1)",
								borderRadius: "8px",
								boxShadow:
									"0 10px 15px -3px var(--shadow-sm, rgba(0, 0, 0, 0.1)), 0 4px 6px -4px var(--shadow-sm, rgba(0, 0, 0, 0.1))",
								zIndex: 9999,
								padding: "8px",
								display: "flex",
								flexDirection: "column",
								gap: "6px",
								minWidth: "160px",
							}}
						>
							<button
								className="secondary-button"
								type="button"
								style={{
									border: "none",
									width: "100%",
									justifyContent: "flex-start",
									margin: 0,
									background: "none",
								}}
								onClick={() => createImagingStudy("periapical")}
								disabled={Boolean(imagingCreateSavingKind)}
							>
								Прицельный{" "}
								{imagingCreateSavingKind === "periapical" ? "(создаю)" : ""}
							</button>
							<button
								className="secondary-button"
								type="button"
								style={{
									border: "none",
									width: "100%",
									justifyContent: "flex-start",
									margin: 0,
									background: "none",
								}}
								onClick={() => createImagingStudy("opg")}
								disabled={Boolean(imagingCreateSavingKind)}
							>
								ОПТГ {imagingCreateSavingKind === "opg" ? "(создаю)" : ""}
							</button>
							<button
								className="secondary-button"
								type="button"
								style={{
									border: "none",
									width: "100%",
									justifyContent: "flex-start",
									margin: 0,
									background: "none",
								}}
								onClick={() => createImagingStudy("ceph")}
								disabled={Boolean(imagingCreateSavingKind)}
							>
								ТРГ {imagingCreateSavingKind === "ceph" ? "(создаю)" : ""}
							</button>
							<button
								className="secondary-button"
								type="button"
								style={{
									border: "none",
									width: "100%",
									justifyContent: "flex-start",
									margin: 0,
									background: "none",
								}}
								onClick={() => createImagingStudy("cbct")}
								disabled={Boolean(imagingCreateSavingKind)}
							>
								КТ {imagingCreateSavingKind === "cbct" ? "(создаю)" : ""}
							</button>
						</div>
					</details>
				</div>
			</div>

			<div className="imaging-patient-strip" aria-label="Контекст снимков">
				<article>
					<span>Пациент</span>
					<strong>{activePatient?.fullName ?? "Пациент не выбран"}</strong>
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
					<small>
						{selectedImagingViewerPlan?.warnings[0] ??
							"ИИ только помогает, решение остается за врачом"}
					</small>
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
						<span>
							файлов:{" "}
							{browserImagingScanProgress?.scannedFiles ??
								browserPickedImagingFolder?.scannedFiles ??
								0}
						</span>
						<span>
							папок:{" "}
							{browserImagingScanProgress?.scannedFolders ??
								browserPickedImagingFolder?.scannedFolders ??
								0}
						</span>
						<span>
							DICOM/КТ:{" "}
							{browserImagingScanProgress?.dicomLikeFiles ??
								browserPickedImagingFolder?.dicomLikeFiles ??
								0}
						</span>
						<span>
							архивов:{" "}
							{browserImagingScanProgress?.archiveFiles ??
								browserPickedImagingFolder?.archiveFiles ??
								0}
						</span>
						<span>
							изображений:{" "}
							{browserImagingScanProgress?.imageFiles ??
								browserPickedImagingFolder?.imageFiles ??
								0}
						</span>
						<span>
							{formatByteSize(
								browserImagingScanProgress?.totalBytes ??
									browserPickedImagingFolder?.totalBytes ??
									0,
							)}
						</span>
					</div>
					{browserPickedImagingFolder?.warnings?.[0] ? (
						<small>{browserPickedImagingFolder.warnings[0]}</small>
					) : null}
				</div>
			) : null}

			<div className="imaging-kind-filter" aria-label="Фильтр типа снимка">
				<button
					className={imagingKindFilter === "all" ? "active" : ""}
					type="button"
					aria-pressed={imagingKindFilter === "all"}
					onClick={() => setImagingKindFilter("all")}
				>
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

			{/* AI Toast notification */}
			{/* AI Toast notification has been moved to GlobalToast */}

			<div className="imaging-layout">
				<article className="imaging-viewer">
					{selectedImagingStudy ||
					localImageIds.length > 0 ||
					browserPickedImagingFolder ? (
						<>
							<div
								className="imaging-viewer-stage"
								style={{ position: "relative" }}
							>
								{localImageIds.length > 0 ? (
									<Cornerstone3DViewer
										imageIds={localImageIds}
										patientId={
											selectedImagingStudy?.patientId ||
											selectedPatientId ||
											undefined
										}
									/>
								) : selectedImagingStudy?.kind === "cbct" ? (
									<div className="w-full h-full flex flex-col gap-4 p-4">
										<DicomArchiveUploader onImagesLoaded={setLocalImageIds} />
										<div className="opacity-50 pointer-events-none w-full flex-1 relative">
											<Cornerstone3DViewer
												imageIds={[
													`wadouri:${apiUrl}/dicomweb/studies/${selectedImagingStudy?.dicomStudyUid}/series/1/instances/1`,
												]}
												patientId={
													selectedImagingStudy?.patientId ||
													selectedPatientId ||
													undefined
												}
											/>
											{isDiagnocatActive && (
												<div className="absolute inset-0 pointer-events-none flex items-center justify-center">
													<div
														className="w-full h-full relative"
														style={{ maxWidth: "400px", maxHeight: "400px" }}
													>
														<svg
															className="absolute inset-0 w-full h-full"
															viewBox="0 0 100 100"
															preserveAspectRatio="none"
														>
															<path
																d="M 10 50 Q 50 10 90 50 Q 50 90 10 50"
																fill="none"
																stroke="#a855f7"
																strokeWidth="0.5"
																strokeDasharray="2,2"
																className="animate-pulse"
															/>
															<circle
																cx="20"
																cy="50"
																r="2"
																fill="none"
																stroke="#a855f7"
																strokeWidth="0.5"
															/>
															<circle
																cx="80"
																cy="50"
																r="2"
																fill="none"
																stroke="#a855f7"
																strokeWidth="0.5"
															/>
															<circle
																cx="50"
																cy="25"
																r="2"
																fill="none"
																stroke="#a855f7"
																strokeWidth="0.5"
															/>
															<circle
																cx="50"
																cy="75"
																r="2"
																fill="none"
																stroke="#a855f7"
																strokeWidth="0.5"
															/>
														</svg>
														<div className="absolute top-[20%] left-[45%] bg-purple-600/80 text-white text-[10px] px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(168,85,247,0.8)] border border-purple-400">
															11: Кариес дентина (95%)
														</div>
														<div className="absolute top-[25%] left-[65%] bg-purple-600/80 text-white text-[10px] px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(168,85,247,0.8)] border border-purple-400">
															22: Здоров
														</div>
														<div className="absolute top-[70%] left-[30%] bg-purple-600/80 text-white text-[10px] px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(168,85,247,0.8)] border border-purple-400">
															46: Убыль кости 3мм
														</div>
														<div className="absolute top-[65%] left-[60%] bg-purple-600/80 text-white text-[10px] px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(168,85,247,0.8)] border border-purple-400">
															36: Периодонтит
														</div>
													</div>
												</div>
											)}
										</div>
									</div>
								) : (
									<ShadowAnalystImageSlider
										imageUrl={imagingPreviewSource(selectedImagingStudy)}
										enhanced={
											enhancementOn && !!selectedImagingStudy?.aiSummary
										}
									/>
								)}

								{/* AI analysis overlay loader */}
								{isAnalyzingAI && (
									<div className="sa-analyze-overlay" aria-live="polite">
										<div className="sa-analyze-spinner" />
										<span>ShadowAnalyst анализирует снимок...</span>
									</div>
								)}
							</div>

							<div className="imaging-viewer-meta">
								<strong>
									{selectedImagingStudy?.title ?? "Локальный предпросмотр"}
								</strong>
								<span>
									{selectedImagingStudy
										? `${imagingKindLabels[selectedImagingStudy.kind]} · ${selectedImagingStudy.toothCode ?? selectedImagingStudy.region}`
										: "Локальные файлы DICOM (КТ)"}
								</span>
								<button
									type="button"
									className={
										selectedImagingStudy?.aiSummary
											? "secondary-button"
											: "primary-button"
									}
									disabled={isAnalyzingAI || !selectedImagingStudy}
									onClick={handleAnalyzeAI}
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "0.5rem",
										marginTop: "0.5rem",
										maxWidth: "fit-content",
									}}
								>
									<Bot aria-hidden="true" size={16} />
									{isAnalyzingAI
										? "Анализирую..."
										: selectedImagingStudy?.aiSummary
											? "Обновить анализ"
											: "AI-Диагностика (ShadowAnalyst)"}
								</button>
							</div>

							{selectedImagingViewerPlan ? (
								<div
									className={`imaging-viewer-plan viewer-plan-${selectedImagingViewerPlan.mode}`}
								>
									<div>
										<strong>{selectedImagingViewerPlan.label}</strong>
										<span>{selectedImagingViewerPlan.nextAction}</span>
									</div>
									<div className="viewer-plan-chip-row">
										{selectedImagingViewerPlan.primaryTools
											.slice(0, 5)
											.map((tool: any) => (
												<span key={tool}>
													{imagingViewerToolLabels[tool] ??
														"инструмент просмотра"}
												</span>
											))}
									</div>
									{selectedImagingViewerPlan.warnings[0] ? (
										<small>{selectedImagingViewerPlan.warnings[0]}</small>
									) : null}
								</div>
							) : null}

							{imagingComparisonCandidates.length ? (
								<div
									className="imaging-compare-strip"
									data-testid="imaging-compare-strip"
									aria-label="Быстрое сравнение снимков пациента"
								>
									<div className="imaging-compare-head">
										<strong>Сравнить с</strong>
										<span>ближайшие по зубу, области, типу или дате</span>
									</div>
									<div className="imaging-compare-list">
										{imagingComparisonCandidates.map(
											({ study, reason }: any) => (
												<button
													key={study.id}
													type="button"
													onClick={() => {
														if (
															imagingKindFilter !== "all" &&
															imagingKindFilter !== study.kind
														)
															setImagingKindFilter("all");
														setSelectedImagingStudyId(study.id);
													}}
												>
													<img
														src={imagingPreviewSource(study)}
														alt=""
														loading="lazy"
														decoding="async"
													/>
													<span>
														<strong>{imagingKindLabels[study.kind]}</strong>
														<small>
															{formatShortDate(study.capturedAt)} · {reason}
														</small>
													</span>
												</button>
											),
										)}
									</div>
								</div>
							) : null}

							{!(
								localImageIds.length > 0 ||
								selectedImagingStudy?.kind === "cbct"
							) && (
								<div style={{ display: "contents" }}>
									<div
										className="imaging-viewer-toolbar"
										aria-label="Настройки рентген-снимка"
									>
										<div className="imaging-viewer-tools">
											<button
												className="viewer-tool-button"
												type="button"
												title="Повернуть влево"
												aria-label="Повернуть снимок влево"
												onClick={() =>
													setImagingViewerState((state: any) => ({
														...state,
														rotationDeg: state.rotationDeg - 90,
													}))
												}
											>
												<RotateCcw aria-hidden="true" />
											</button>
											<button
												className="viewer-tool-button"
												type="button"
												title="Повернуть вправо"
												aria-label="Повернуть снимок вправо"
												onClick={() =>
													setImagingViewerState((state: any) => ({
														...state,
														rotationDeg: state.rotationDeg + 90,
													}))
												}
											>
												<RotateCw aria-hidden="true" />
											</button>
											<button
												className={`viewer-tool-button ${imagingViewerState.flipHorizontal ? "active" : ""}`}
												type="button"
												title="Зеркально"
												aria-label="Зеркально отразить снимок"
												aria-pressed={imagingViewerState.flipHorizontal}
												onClick={() =>
													setImagingViewerState((state: any) => ({
														...state,
														flipHorizontal: !state.flipHorizontal,
													}))
												}
											>
												<FlipHorizontal aria-hidden="true" />
											</button>
											<button
												className={`viewer-tool-button ${imagingViewerState.inverted ? "active" : ""}`}
												type="button"
												title="Инверсия"
												aria-label="Инвертировать снимок"
												aria-pressed={imagingViewerState.inverted}
												onClick={() =>
													setImagingViewerState((state: any) => ({
														...state,
														inverted: !state.inverted,
													}))
												}
											>
												±
											</button>
											<button
												className="viewer-tool-button"
												type="button"
												title="Уменьшить"
												aria-label="Уменьшить снимок"
												onClick={() =>
													setImagingViewerState((state: any) => ({
														...state,
														zoom: Math.max(0.75, state.zoom - 0.1),
													}))
												}
											>
												<ZoomOut aria-hidden="true" />
											</button>
											<button
												className="viewer-tool-button"
												type="button"
												title="Увеличить"
												aria-label="Увеличить снимок"
												onClick={() =>
													setImagingViewerState((state: any) => ({
														...state,
														zoom: Math.min(1.8, state.zoom + 0.1),
													}))
												}
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

											{/* Enhancement toggle — appears in toolbar once AI analysis ran */}
											{selectedImagingStudy?.aiSummary && (
												<label
													className="sa-enhance-toggle sa-enhance-toggle--toolbar"
													title="Включить/выключить улучшение снимка (CLAHE симуляция)"
												>
													<input
														type="checkbox"
														checked={enhancementOn}
														onChange={(e) => setEnhancementOn(e.target.checked)}
													/>
													<span className="sa-enhance-slider" />
													<span className="sa-enhance-label">Enhanced</span>
												</label>
											)}
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
													onChange={(event) =>
														setImagingViewerState((state: any) => ({
															...state,
															brightness: Number(event.target.value),
														}))
													}
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
													onChange={(event) =>
														setImagingViewerState((state: any) => ({
															...state,
															contrast: Number(event.target.value),
														}))
													}
												/>
											</label>
										</div>
										<div
											className={`viewer-session-strip viewer-save-state-${imagingViewerSaveState}`}
											aria-label="Автосохранение сеанса просмотра снимка"
										>
											<div>
												<strong>
													{imagingViewerSaveTitle[imagingViewerSaveState]}
												</strong>
												<span>{imagingViewerSaveDetail}</span>
											</div>
											<div
												style={{
													display: "flex",
													flexDirection: "column",
													gap: "8px",
													width: "100%",
													maxWidth: "400px",
												}}
											>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														position: "relative",
													}}
												>
													<input
														aria-label="Заметка к снимку"
														value={imagingViewerNote}
														onChange={(event) =>
															setImagingViewerNote(event.target.value)
														}
														placeholder="Заметка к снимку"
														style={{ width: "100%", paddingRight: "40px" }}
													/>
													<button
														type="button"
														title={
															isAnalyzingNoteAI
																? "Анализирую снимок..."
																: "Сгенерировать описание с помощью ИИ"
														}
														onClick={handleGenerateNoteAI}
														disabled={isAnalyzingNoteAI}
														style={{
															position: "absolute",
															right: "8px",
															background: "transparent",
															border: "none",
															cursor: "pointer",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															color: isAnalyzingNoteAI
																? "var(--muted)"
																: "var(--brand-500)",
															padding: "4px",
															borderRadius: "50%",
														}}
														onMouseEnter={(e) => {
															if (!isAnalyzingNoteAI) {
																e.currentTarget.style.background =
																	"var(--brand-50)";
															}
														}}
														onMouseLeave={(e) => {
															e.currentTarget.style.background = "transparent";
														}}
													>
														{isAnalyzingNoteAI ? (
															<RefreshCw
																size={16}
																style={{ animation: "spin 1s linear infinite" }}
															/>
														) : (
															<Bot size={16} />
														)}
													</button>
												</div>
												<div
													className="quick-chips-row"
													style={{ flexWrap: "wrap", marginTop: "4px" }}
												>
													{IMAGING_QUICK_CHIPS.map((chip) => (
														<button
															key={chip}
															type="button"
															className="quick-chip quick-chip--sm"
															onClick={() =>
																setImagingViewerNote((prev) =>
																	prev ? `${prev}, ${chip}` : chip,
																)
															}
														>
															{chip}
														</button>
													))}
												</div>
											</div>
											<div className="viewer-session-actions">
												<button
													className="secondary-button"
													type="button"
													onClick={addImagingViewerNoteAnnotation}
													aria-describedby={
														!imagingViewerNoteReady ||
														!imagingViewerSessionReady
															? imagingViewerNoteMissingId
															: undefined
													}
													disabled={
														!imagingViewerNoteReady ||
														!imagingViewerSessionReady
													}
												>
													<Plus aria-hidden="true" /> Заметка
												</button>
												{canRetryImagingViewerSave ? (
													<button
														className="secondary-button"
														type="button"
														onClick={retryImagingViewerSessionSave}
														aria-describedby={
															!isOnline
																? imagingViewerRetryMissingId
																: undefined
														}
														disabled={!isOnline}
													>
														<RefreshCw aria-hidden="true" /> Повторить
													</button>
												) : null}
											</div>
											{!imagingViewerSessionReady ? (
												<p
													className="viewer-note-missing"
													id={imagingViewerNoteMissingId}
													role="status"
													aria-live="polite"
												>
													Дождитесь загрузки просмотра, чтобы прикрепить заметку
													к снимку.
												</p>
											) : !imagingViewerNoteReady ? (
												<p
													className="viewer-note-missing"
													id={imagingViewerNoteMissingId}
													role="status"
													aria-live="polite"
												>
													Напишите текст заметки, чтобы прикрепить ее к снимку.
												</p>
											) : null}
											{canRetryImagingViewerSave && !isOnline ? (
												<p
													className="viewer-note-missing"
													id={imagingViewerRetryMissingId}
													role="status"
													aria-live="polite"
												>
													Повторная отправка просмотра станет доступна после
													подключения к сети.
												</p>
											) : null}
										</div>
										{imagingViewerAnnotations.length ? (
											<div
												className="viewer-annotation-list"
												aria-label="Сохраненные разметки к снимкам"
											>
												{imagingViewerAnnotations
													.slice(0, 3)
													.map((annotation: any) => (
														<article key={annotation.id}>
															<strong>{annotation.label}</strong>
															<span>
																{annotation.toothCode ??
																	selectedImagingStudy?.region ??
																	"study"}{" "}
																· {formatShortDate(annotation.updatedAt)}
															</span>
														</article>
													))}
											</div>
										) : null}
									</div>
								</div>
							)}

							{/* SA Report — full-width below toolbar, only when AI analysis exists */}
							{selectedImagingStudy?.aiSummary && (
								<div className="sa-report-column">
									<ShadowAnalystReport
										summary={selectedImagingStudy.aiSummary}
										toothUpdates={selectedImagingStudy.aiToothUpdates}
										studyTitle={selectedImagingStudy.title}
									/>
								</div>
							)}
						</>
					) : (
						<div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
							<div className="text-center mb-4">
								<ImageIcon
									aria-hidden="true"
									style={{ fontSize: "3rem", opacity: 0.5 }}
								/>
								<p className="text-neutral-400 mt-2">
									Снимков по текущему пациенту пока нет.
								</p>
							</div>
							<div className="w-full max-w-2xl">
								<DicomArchiveUploader onImagesLoaded={setLocalImageIds} />
							</div>
						</div>
					)}
				</article>

				<div className="imaging-list">
					{visibleImagingStudies.map((study: any) => (
						<article
							className={`imaging-row imaging-${study.status} ${selectedImagingStudy?.id === study.id ? "active" : ""}`}
							key={study.id}
						>
							<div style={{ position: "relative", flexShrink: 0 }}>
								<img
									src={imagingPreviewSource(study)}
									alt=""
									loading="lazy"
									decoding="async"
								/>
								{(study as any).aiSummary && (
									<span
										className="sa-ai-badge"
										title="Есть AI-заключение ShadowAnalyst"
									>
										<Bot size={9} /> AI
									</span>
								)}
							</div>
							<div>
								<h3>{study.title}</h3>
								<p>
									{imagingKindLabels[study.kind]} ·{" "}
									{study.toothCode ?? study.region ?? "область не указана"} ·{" "}
									{formatShortDate(study.capturedAt)}
								</p>
								<span>
									{imagingSourceLabels[study.sourceKind]} · {study.sourceName}
								</span>
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
									{selectedImagingStudy?.id === study.id
										? "Выбрано"
										: "Выбрать"}
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
				<section
					className="clinical-mpr-panel"
					aria-label="Управление КЛКТ и КТ-срезами"
				>
					<div className="clinical-mpr-head">
						<div>
							<p className="eyebrow">Рабочее место КЛКТ</p>
							<h3>
								3 плоскости, косой срез, панорама и внешний КТ-просмотрщик
							</h3>
							<small>
								Основной прием не блокируется: если серия тяжелая, CRM оставляет
								предпросмотр и предлагает внешний просмотр или локальный модуль
								объема.
							</small>
						</div>
						<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
							<button
								className={`secondary-button ${isDiagnocatActive ? "active" : ""}`}
								type="button"
								onClick={() => setIsDiagnocatActive(!isDiagnocatActive)}
								aria-label="Включить AI-сегментацию Diagnocat"
								title="Diagnocat AI: разметка зубов и костной ткани"
								style={{
									background: isDiagnocatActive
										? "var(--purple-500-alpha-15, rgba(168, 85, 247, 0.15))"
										: "transparent",
									borderColor: isDiagnocatActive ? "var(--purple-500, #a855f7)" : "var(--line)",
									color: isDiagnocatActive ? "var(--purple-500, #a855f7)" : "inherit",
									boxShadow: isDiagnocatActive
										? "0 0 10px var(--purple-500-alpha-30, rgba(168, 85, 247, 0.3))"
										: "none",
									transition: "all 0.2s ease",
								}}
							>
								<span
									className={isDiagnocatActive ? "animate-pulse" : ""}
									style={{ marginRight: "4px" }}
								>
									✦
								</span>{" "}
								Diagnocat
							</button>
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
					</div>
					<div
						className="clinical-mpr-summary-grid"
						aria-label="Краткий статус КЛКТ"
					>
						<article>
							<strong>
								{selectedImagingViewerPlan?.mode === "cbct_mpr"
									? "Маршрут КТ-срезов"
									: "Быстрый предпросмотр"}
							</strong>
							<span>
								{selectedImagingViewerPlan?.nextAction ??
									"Откройте КТ-просмотрщик, когда нужен 3D-разбор."}
							</span>
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
											dicomViewerWorkbenchManifest.renderCachePlan
												.textureStrategy,
											"план загрузки",
										)}`
									: "Соберите КТ-пакет в настройках источников; карточка приема останется легкой."}
							</span>
						</article>
						<article>
							<strong>{imagingViewerSaveTitle[imagingViewerSaveState]}</strong>
							<span>
								{imagingViewerAnnotations.length} разметок; исходные снимки
								остаются в просмотрщике или исходной папке.
							</span>
						</article>
					</div>
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
							{mprClinicalChecklist.map((item: any) => (
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
						toolStateBundle={
							dicomViewerWorkbenchManifest?.toolStateBundle ??
							dicomViewerToolStateBundle
						}
					/>
					<details className="clinical-mpr-advanced" open={mprControlsAutoOpen}>
						<summary>
							<span>Управление КТ-срезами</span>
							<small>
								Открывается только для КТ-разбора; обычный прием остается без
								лишних панелей.
							</small>
						</summary>
						<div className="clinical-mpr-grid">
							<div className="mpr-plane-grid">
								{cbctWorkbenchPlanes.map((plane: any) => {
									const planeSupported = cbctWorkbenchProjections.includes(
										plane.key,
									);
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
											{planeUnavailableReason ? (
												<small className="mpr-plane-unavailable">
													{planeUnavailableReason}
												</small>
											) : null}
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
									Стрелки влево и вправо меняют угол оси, стрелки вверх и вниз
									меняют срез, PageUp и PageDown меняют толщину слоя, Home и End
									переходят к началу и концу серии.
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
									<span className="mpr-axis-slice-badge">{mprSliceBadge}</span>
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
										data-testid="ct-mpr-workbench-summary"
										aria-live="polite"
									>
										{mprWorkbenchSummaryText}
									</small>
									<small>
										{mprControlsReady
											? `${mprLinkedPlanesEnabled ? "плоскости связаны" : "плоскости отдельно"} · ${mprCrosshairEnabled ? "курсор включен" : "курсор скрыт"}`
											: "сначала откройте готовую КЛКТ/КТ-серию"}
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
										onChange={(event) =>
											setMprAxisDeg(clampMprAxisDeg(Number(event.target.value)))
										}
									/>
								</label>
								<div
									className="mpr-stepper-row"
									data-testid="ct-mpr-axis-nudge"
									aria-label="Точная правка угла КТ-срезов"
								>
									{mprAxisNudgeDeg.map((delta: any) => (
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
										onChange={(event) =>
											setMprSlabMm(clampMprSlabMm(Number(event.target.value)))
										}
									/>
								</label>
								<div
									className="mpr-stepper-row"
									data-testid="ct-mpr-slab-nudge"
									aria-label="Точная правка толщины слоя КТ-срезов"
								>
									{mprSlabNudgeMm.map((delta: any) => (
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
										onChange={(event) =>
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
											onChange={(event) =>
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
											onChange={(event) =>
												setMprSlabMm(clampMprSlabMm(Number(event.target.value)))
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
											onChange={(event) =>
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
									{mprSliceNudgeSteps.map((delta: any) => (
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
									{mprSlicePresetFractions.map((preset: any) => {
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
									{mprClinicalPresets.map((preset: any) => {
										const projectionFallbackNote = mprControlsReady
											? describeMprClinicalPresetProjectionFallback(
													preset.projection,
													cbctWorkbenchProjections,
													mprProjectionLabels,
												)
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
											onChange={(event) =>
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
											onChange={(event) =>
												setMprLinkedPlanesEnabled(event.target.checked)
											}
										/>
										Связанные плоскости
									</label>
								</div>
								{!mprControlsReady ? (
									<p className="mpr-control-disabled-note" role="status">
										Сначала откройте готовую КЛКТ/КТ-серию. После этого
										включатся оси, толщина слоя и связанные плоскости.
									</p>
								) : null}
							</div>
						</div>
					</details>
					<div className="clinical-mpr-safety">
						<span>
							{selectedImagingViewerPlan?.nextAction ??
								"Подготовить серию КЛКТ/КТ к просмотру срезов."}
						</span>
						<span>
							{cbctWorkbenchSeries?.mprReadiness.resourcePolicy.nextAction ??
								"Метаданные серии пока не загружены: сначала открываем предпросмотр и внешний просмотр."}
						</span>
						<span>
							ИИ-описание не является диагнозом; врач подтверждает все выводы.
						</span>
					</div>
				</section>
			) : null}
		</motion.section>
	);
}

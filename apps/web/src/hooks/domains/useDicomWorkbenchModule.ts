import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
/**
 * useDicomWorkbenchModule — DICOM / CT / CBCT viewer workbench logic.
 *
 * Extracted from useAppLogic.tsx to reduce monolith size.
 * Handles: DICOM folder workup, series preview, first-frame preview,
 * workbench manifest, tool-state bundle, workstation readiness,
 * render-cache plan, blob-URL preview lifecycle, local folder recovery.
 */

import type {
	Dashboard,
	DicomFirstFramePreviewResponse,
	DicomFolderWorkupPlanResponse,
	DicomRenderCachePlanResponse,
	DicomSeriesPreviewResponse,
	DicomViewerLaunchManifestResponse,
	DicomViewerToolStateBundleResponse,
	DicomViewerWorkbenchManifestResponse,
	DicomWebConnectorCheckResponse,
	DicomWorkbenchBundle,
	DicomWorkbenchBundleListResponse,
	DicomWorkbenchBundleResponse,
	DicomWorkstationClientFacts,
	DicomWorkstationReadinessResponse,
	ImagingViewerSessionState,
} from "@dental/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	collectDicomWorkstationClientFacts,
	type DicomFirstFramePreviewMetadata,
	type DicomFirstFramePreviewOptions,
	dicomWorkbenchSeriesKey,
	imagingViewerPlans,
	isBrowserImagingScanAbortError,
	type LocalImagingFolderDraft,
	localImagingFolderFingerprint,
	operatorWorkflowFailureMessage,
	redactedDicomViewerToolStateBundleForDownload,
	redactedDicomWorkbenchManifestForDownload,
	removeLocalDicomWorkbenchDraft,
	removeLocalImagingFolderDraft,
	responseErrorMessage,
	saveLocalDicomWorkbenchDraft,
	saveLocalImagingFolderDraft,
	viewerWindowPresetForStudy,
} from "../../AppHelpers";
import {
	imagingCaptureDistanceMs,
	imagingComparisonScore,
} from "../../imagingComparison";
import { useAppStore } from "../../store/appStore";
import { useImagingStore } from "../../store/imagingStore";
import { useSettingsStore } from "../../store/settingsStore";
import { defaultDicomFirstFrameViewerState } from "../../utils/draftDefaults";
import { clampMprSliceIndex } from "../../utils/math/mprMath";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DicomAuthContext {
	denteClinicalReadHeaders(
		extra?: Record<string, string>,
	): Record<string, string>;
	denteClinicalMutationHeaders(
		extra?: Record<string, string>,
	): Record<string, string>;
	settingsAccessHeaders(extra?: Record<string, string>): Record<string, string>;
	revokeObjectUrlMap(map: Record<string, string>): void;
	revokeObjectUrlIfNeeded(url: string): void;
}

interface DicomFirstFramePreviewRequestContext {
	folderPath: string;
	metadata: DicomFirstFramePreviewMetadata;
}

export interface UseDicomWorkbenchParams {
	auth: DicomAuthContext;
	currentView: string;
	visibleImagingStudies: Dashboard["imagingStudies"];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDicomWorkbenchModule({
	auth,
	currentView,
	visibleImagingStudies,
}: UseDicomWorkbenchParams) {
	// ===== Zustand stores =====
	const {
		imagingImportText,
		setImagingImportText,
		imagingImportSourceKind,
		setImagingImportSourceKind,
		imagingFolderPath,
		setImagingFolderPath,
		localImagingFolderDraft,
		setLocalImagingFolderDraft,
		setImagingImportPreview,
		setImagingImportCommit,
		dicomSeriesPreview,
		setDicomSeriesPreview,
		setDicomFolderSeriesScan,
		dicomFolderWorkupPlan,
		setDicomFolderWorkupPlan,
		dicomFirstFramePreview,
		setDicomFirstFramePreview,
		dicomFirstFrameViewerState,
		setDicomFirstFrameViewerState,
		dicomWebEndpointUrl,
		setDicomWebEndpointUrl,
		dicomWebCheck,
		setDicomWebCheck,
		dicomViewerLaunchManifest,
		setDicomViewerLaunchManifest,
		dicomViewerToolStateBundle,
		setDicomViewerToolStateBundle,
		dicomViewerWorkbenchManifest,
		setDicomViewerWorkbenchManifest,
		dicomWorkbenchLocalSavedAt,
		setDicomWorkbenchLocalSavedAt,
		dicomWorkbenchServerBundle,
		setDicomWorkbenchServerBundle,
		dicomWorkbenchServerBundles,
		setDicomWorkbenchServerBundles,
		dicomWorkstationReadiness,
		setDicomWorkstationReadiness,
		dicomRenderCachePlan,
		setDicomRenderCachePlan,
		selectedImagingStudyId,
		imagingKindFilter,
		imagingViewerState,
		imagingViewerActiveTool,
		ctPlanningActiveQuickActionId,
		ctPlanningImplantPlan,
		imagingViewerAnnotations,
		mprProjection,
		mprAxisDeg,
		mprSlabMm,
		mprSliceIndex,
		mprWindowPreset,
		mprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		setIsDicomFirstFramePreviewing,
		setIsDicomSeriesPreviewLoading,
		setIsDicomWebChecking,
		setIsDicomManifestBuilding,
		setIsDicomToolStateBuilding,
		setIsDicomWorkbenchBuilding,
		setIsDicomWorkbenchServerSaving,
		setIsDicomWorkbenchReconnecting,
		setIsDicomWorkstationChecking,
		setIsDicomRenderCachePlanning,
		setIsDicomFolderWorkupPlanning,
		setIsLocalDicomOperationActive,
	} = useImagingStore();

	const { setError, dashboard, ohifBaseUrl } = useAppStore();
	const { clinicalAdminSecretSession } = useSettingsStore();

	// ===== Local state =====
	const [imagingPreviewObjectUrls, setImagingPreviewObjectUrls] = useState<
		Record<string, string>
	>({});
	const [dicomFirstFramePreviewRequest, setDicomFirstFramePreviewRequest] =
		useState<DicomFirstFramePreviewRequestContext | null>(null);

	// ===== Refs =====
	const localDicomOperationAbortRef = useRef<AbortController | null>(null);

	// ===== Computed =====
	const activeOrganizationId =
		dashboard?.clinicSettings?.profile?.organizationId ?? null;

	const cbctWorkbenchSeries =
		dicomSeriesPreview?.series?.find(
			(series) => series.mprReadiness.volumeCandidate,
		) ??
		dicomSeriesPreview?.series?.find(
			(series) => series.recommendedViewer === "cbct_mpr",
		) ??
		null;

	const latestImagingStudy = visibleImagingStudies[0] ?? null;
	const selectedImagingStudy =
		visibleImagingStudies?.find(
			(study) => study.id === selectedImagingStudyId,
		) ?? latestImagingStudy;

	const selectedImagingViewerPlan = selectedImagingStudy
		? imagingViewerPlans[selectedImagingStudy.kind]
		: null;

	const latestDicomWorkbenchServerBundle =
		dicomWorkbenchServerBundles?.[0] ?? null;

	const mprSliceMaxIndex = Math.max(
		0,
		(cbctWorkbenchSeries?.fileCount ?? 1) - 1,
	);
	const mprSafeSliceIndex = clampMprSliceIndex(mprSliceIndex, mprSliceMaxIndex);

	const currentImagingViewerSessionState = useMemo<ImagingViewerSessionState>(
		() => ({
			mode:
				selectedImagingViewerPlan?.mode === "cbct_mpr"
					? "mpr"
					: selectedImagingViewerPlan?.mode === "photo"
						? "photo"
						: "two_d",
			activeTool: imagingViewerActiveTool,
			activeQuickActionId: ctPlanningActiveQuickActionId,
			windowPreset:
				selectedImagingStudy?.kind === "cbct"
					? mprWindowPreset
					: viewerWindowPresetForStudy(selectedImagingStudy?.kind),
			windowCenter: null,
			windowWidth: null,
			brightness: imagingViewerState.brightness,
			contrast: imagingViewerState.contrast,
			inverted: imagingViewerState.inverted,
			rotationDeg: imagingViewerState.rotationDeg,
			flipHorizontal: imagingViewerState.flipHorizontal,
			zoom: imagingViewerState.zoom,
			panX: 0,
			panY: 0,
			sliceIndex:
				selectedImagingStudy?.kind === "cbct" ? mprSafeSliceIndex : null,
			projection: selectedImagingStudy?.kind === "cbct" ? mprProjection : null,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			crosshair: mprCrosshairEnabled,
			linkedPlanes: mprLinkedPlanesEnabled,
			implantPlan: ctPlanningImplantPlan,
		}),
		[
			ctPlanningActiveQuickActionId,
			ctPlanningImplantPlan,
			imagingViewerActiveTool,
			imagingViewerState,
			mprAxisDeg,
			mprCrosshairEnabled,
			mprLinkedPlanesEnabled,
			mprProjection,
			mprSafeSliceIndex,
			mprSlabMm,
			mprWindowPreset,
			selectedImagingStudy?.kind,
			selectedImagingViewerPlan?.mode,
		],
	);

	// ===== Imaging preview workset =====
	const imagingPreviewWorkset = useMemo(() => {
		if (currentView !== "imaging" || !dashboard?.imagingStudies?.length)
			return [];
		const activeStudies = (dashboard.imagingStudies || [])
			.filter((study) => study.patientId === dashboard?.activeVisit?.patientId)
			.sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
		const visibleStudies =
			imagingKindFilter === "all"
				? activeStudies
				: activeStudies.filter((study) => study.kind === imagingKindFilter);
		const selectedStudy =
			visibleStudies?.find((study) => study.id === selectedImagingStudyId) ??
			visibleStudies[0] ??
			null;
		const comparisonStudies = selectedStudy
			? activeStudies
					.filter((study) => study.id !== selectedStudy.id)
					.map((study) => ({
						study,
						score: imagingComparisonScore(selectedStudy, study),
					}))
					.sort(
						(left, right) =>
							right.score - left.score ||
							imagingCaptureDistanceMs(
								selectedStudy.capturedAt,
								left.study.capturedAt,
							) -
								imagingCaptureDistanceMs(
									selectedStudy.capturedAt,
									right.study.capturedAt,
								) ||
							right.study.capturedAt.localeCompare(left.study.capturedAt),
					)
					.slice(0, 4)
					.map((item) => item.study)
			: [];
		const workset = new Map<string, Dashboard["imagingStudies"][number]>();
		[selectedStudy, ...comparisonStudies, ...visibleStudies].forEach(
			(study) => {
				if (study) workset.set(study.id, study);
			},
		);
		return Array.from(workset.values());
	}, [currentView, dashboard, imagingKindFilter, selectedImagingStudyId]);

	const _imagingPreviewSignature = imagingPreviewWorkset
		.map((study) => `${study.id}:${study.previewUrl}`)
		.join("|");

	// ===== Helper functions =====

	function stageLocalImagingFolderRecovery(
		folderPath: string,
		metadata: Partial<
			Omit<LocalImagingFolderDraft, "version" | "folderPath" | "savedAt">
		> = {},
	) {
		const cleanFolderPath = folderPath.trim();
		if (!cleanFolderPath || cleanFolderPath === "C:\\Images") {
			removeLocalImagingFolderDraft(activeOrganizationId);
			setLocalImagingFolderDraft(null);
			return null;
		}
		const fingerprint = (
			metadata.folderFingerprint ??
			localImagingFolderFingerprint(cleanFolderPath)
		).toUpperCase();
		const draft: LocalImagingFolderDraft = {
			version: 1,
			folderPath: cleanFolderPath,
			safeDisplayName:
				metadata.safeDisplayName ?? `Локальная папка снимков #${fingerprint}`,
			sourceLabel: metadata.sourceLabel ?? "Ручной выбор локальной папки",
			sourceKind: metadata.sourceKind ?? "manual",
			folderFingerprint: fingerprint,
			origin: metadata.origin ?? "manual",
			savedAt: new Date().toISOString(),
		};
		saveLocalImagingFolderDraft(draft, activeOrganizationId);
		setLocalImagingFolderDraft(draft);
		return draft;
	}

	function rememberLocalImagingFolder(
		folderPath: string,
		metadata: Partial<
			Omit<LocalImagingFolderDraft, "version" | "folderPath" | "savedAt">
		> = {},
	) {
		const draft = stageLocalImagingFolderRecovery(folderPath, metadata);
		if (draft) setImagingFolderPath(draft.folderPath);
		return draft;
	}

	function startLocalDicomOperation() {
		localDicomOperationAbortRef.current?.abort();
		const controller = new AbortController();
		localDicomOperationAbortRef.current = controller;
		setIsLocalDicomOperationActive(true);
		return controller;
	}

	function finishLocalDicomOperation(controller: AbortController) {
		if (localDicomOperationAbortRef.current !== controller) return;
		localDicomOperationAbortRef.current = null;
		setIsLocalDicomOperationActive(false);
	}

	function isLocalDicomOperationAbortError(error: unknown) {
		return isBrowserImagingScanAbortError(error);
	}

	// ===== DICOM API functions =====

	async function previewDicomFirstFrame(
		folderPath = imagingFolderPath.trim(),
		metadata: DicomFirstFramePreviewMetadata = { origin: "manual" },
		options: DicomFirstFramePreviewOptions = {},
	) {
		const cleanFolderPath = folderPath.trim();
		if (!cleanFolderPath) {
			setError(
				"Укажите путь к локальной папке со снимками перед предпросмотром первого среза.",
			);
			return;
		}
		rememberLocalImagingFolder(cleanFolderPath, metadata);
		setDicomFirstFramePreviewRequest({
			folderPath: cleanFolderPath,
			metadata,
		});
		const controller = startLocalDicomOperation();
		setIsDicomFirstFramePreviewing(true);
		setError(null);
		if (options.resetViewer !== false) {
			setDicomFirstFrameViewerState(defaultDicomFirstFrameViewerState);
		}
		try {
			const response = await fetch("/api/imaging/dicom/first-frame-preview", {
				method: "POST",
				signal: controller.signal,
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					folderPath: cleanFolderPath,
					recursive: true,
					maxFiles: 160,
					maxFileBytes: 64 * 1024 * 1024,
					maxPreviewEdge: 512,
					...(typeof options.preferredFileIndex === "number"
						? { preferredFileIndex: options.preferredFileIndex }
						: {}),
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Первый срез снимков не показан",
					),
				);
			}
			setDicomFirstFramePreview(
				(await response.json()) as DicomFirstFramePreviewResponse,
			);
		} catch (previewError) {
			showToast(
				actionFailureToast(
					"Первый срез снимков не показан",
					(previewError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isLocalDicomOperationAbortError(previewError)) return;
			setError(
				operatorWorkflowFailureMessage(
					"Первый срез снимков не показан",
					previewError,
				),
			);
		} finally {
			finishLocalDicomOperation(controller);
			setIsDicomFirstFramePreviewing(false);
		}
	}

	async function previewDicomFirstFrameSlice(preferredFileIndex: number) {
		if (!dicomFirstFramePreviewRequest) return;
		const maxIndex = Math.max(
			0,
			(dicomFirstFramePreview?.selectableFileCount ?? 1) - 1,
		);
		const nextIndex = Math.min(
			maxIndex,
			Math.max(0, Math.round(preferredFileIndex)),
		);
		await previewDicomFirstFrame(
			dicomFirstFramePreviewRequest.folderPath,
			dicomFirstFramePreviewRequest.metadata,
			{
				preferredFileIndex: nextIndex,
				resetViewer: false,
			},
		);
	}

	async function fetchDicomFolderWorkup(
		folderPath: string,
		sourceName: string,
		options: { signal?: AbortSignal | null } = {},
	): Promise<{
		client: DicomWorkstationClientFacts;
		result: DicomFolderWorkupPlanResponse;
	}> {
		const client = await collectDicomWorkstationClientFacts();
		const response = await fetch("/api/imaging/dicom/folder-workup-plan", {
			method: "POST",
			signal: options.signal ?? null,
			headers: auth.denteClinicalReadHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				folderPath,
				recursive: true,
				sourceName,
				client,
				viewerState: currentImagingViewerSessionState,
			}),
		});
		if (!response.ok) {
			throw new Error(
				await responseErrorMessage(
					response,
					"План папки снимков не подготовлен",
				),
			);
		}
		return {
			client,
			result: (await response.json()) as DicomFolderWorkupPlanResponse,
		};
	}

	function selectPreferredDicomWorkupPlan(
		result: DicomFolderWorkupPlanResponse,
	) {
		return (
			result.plans?.find((plan) => plan.recommendedPath === "open_mpr") ??
			result.plans?.find(
				(plan) => plan.recommendedPath === "downsampled_mpr",
			) ??
			result.plans?.find((plan) => plan.series.mprReadiness.volumeCandidate) ??
			result.plans?.find(
				(plan) => plan.recommendedPath === "external_viewer",
			) ??
			result.plans?.[0] ??
			null
		);
	}

	function applyDicomFolderWorkupResult(result: DicomFolderWorkupPlanResponse) {
		const firstPlan = selectPreferredDicomWorkupPlan(result);
		setDicomFolderWorkupPlan(result);
		setDicomFolderSeriesScan(result.folder);
		setImagingImportSourceKind("dicom_file");
		setImagingImportText(result.folder.rawText || imagingImportText);
		setDicomSeriesPreview(result.folder.preview);
		setDicomViewerLaunchManifest(null);
		setDicomViewerToolStateBundle(null);
		setDicomViewerWorkbenchManifest(null);
		setDicomWorkbenchLocalSavedAt(null);
		setDicomWorkstationReadiness(firstPlan?.readiness ?? null);
		setDicomRenderCachePlan(firstPlan?.renderCachePlan ?? null);
		setDicomFirstFramePreview(null);
		setImagingImportPreview(null);
		setImagingImportCommit(null);
	}

	async function buildDicomFolderWorkupPlan() {
		const folderPath = imagingFolderPath.trim();
		if (!folderPath) {
			setError(
				"Укажите путь к локальной папке со снимками перед подготовкой плана.",
			);
			return;
		}
		rememberLocalImagingFolder(folderPath, { origin: "manual" });
		const controller = startLocalDicomOperation();
		setIsDicomFolderWorkupPlanning(true);
		try {
			const { result } = await fetchDicomFolderWorkup(
				folderPath,
				"dicom_folder_workup",
				{ signal: controller.signal },
			);
			applyDicomFolderWorkupResult(result);
		} catch (workupError) {
			showToast(
				actionFailureToast(
					"План папки снимков не подготовлен",
					(workupError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isLocalDicomOperationAbortError(workupError)) return;
			setError(
				operatorWorkflowFailureMessage(
					"План папки снимков не подготовлен",
					workupError,
				),
			);
		} finally {
			finishLocalDicomOperation(controller);
			setIsDicomFolderWorkupPlanning(false);
		}
	}

	async function prepareDicomWorkbenchFromFolder(
		folderPath: string,
		sourceName = "dicom_local_quick_workbench",
		metadata: Partial<
			Omit<LocalImagingFolderDraft, "version" | "folderPath" | "savedAt">
		> = {},
	) {
		const cleanFolderPath = folderPath.trim();
		if (!cleanFolderPath) {
			setError(
				"Укажите путь к локальной папке со снимками перед подготовкой КТ-просмотра.",
			);
			return;
		}
		const controller = startLocalDicomOperation();
		setIsDicomFolderWorkupPlanning(true);
		setIsDicomWorkbenchBuilding(true);
		setError(null);
		try {
			const { client, result } = await fetchDicomFolderWorkup(
				cleanFolderPath,
				sourceName,
				{ signal: controller.signal },
			);
			const selectedPlan = selectPreferredDicomWorkupPlan(result);
			if (!selectedPlan) {
				throw new Error("В этой папке не найдена пригодная серия КЛКТ/КТ.");
			}

			const manifestResponse = await fetch(
				"/api/imaging/dicom/viewer-workbench-manifest",
				{
					method: "POST",
					signal: controller.signal,
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						viewerKind: "cornerstone3d",
						target: "cornerstone3d",
						series: selectedPlan.series,
						client,
						connector: dicomWebCheck,
						viewerState: currentImagingViewerSessionState,
						annotations: imagingViewerAnnotations,
						dicomWebBaseUrl: dicomWebEndpointUrl.trim() || null,
						ohifBaseUrl: ohifBaseUrl.trim() || null,
						allowExternalHandoff: true,
					}),
				},
			);
			if (!manifestResponse.ok) {
				throw new Error(
					await responseErrorMessage(
						manifestResponse,
						"Просмотр КЛКТ/КТ не подготовлен",
					),
				);
			}

			const manifest =
				(await manifestResponse.json()) as DicomViewerWorkbenchManifestResponse;
			const clientSavedAt = new Date().toISOString();
			const savedLocally = await saveLocalDicomWorkbenchDraft(
				manifest,
				clientSavedAt,
				activeOrganizationId,
			);
			rememberLocalImagingFolder(cleanFolderPath, {
				...metadata,
				origin: metadata.origin ?? "workbench",
			});
			applyDicomFolderWorkupResult(result);
			applyDicomWorkbenchManifest(manifest);
			setDicomWorkbenchLocalSavedAt(savedLocally ? clientSavedAt : null);
			setDicomWorkbenchServerBundle(null);
			await saveDicomWorkbenchBundleToServer(manifest, clientSavedAt, {
				silent: true,
				signal: controller.signal,
			});
		} catch (workbenchError) {
			showToast(
				actionFailureToast(
					"Просмотр КЛКТ/КТ не подготовлен",
					(workbenchError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isLocalDicomOperationAbortError(workbenchError)) return;
			setError(
				operatorWorkflowFailureMessage(
					"Просмотр КЛКТ/КТ не подготовлен",
					workbenchError,
				),
			);
		} finally {
			finishLocalDicomOperation(controller);
			setIsDicomFolderWorkupPlanning(false);
			setIsDicomWorkbenchBuilding(false);
		}
	}

	async function previewDicomSeries() {
		if (!imagingImportText.trim()) {
			setError(
				"Вставьте строки со снимками или выберите пример КТ/ОПТГ/ТРГ перед группировкой серий.",
			);
			return;
		}
		const controller = startLocalDicomOperation();
		setIsDicomSeriesPreviewLoading(true);
		try {
			const response = await fetch("/api/imaging/dicom/series-preview", {
				method: "POST",
				signal: controller.signal,
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					sourceName: imagingImportSourceKind,
					sourceKind:
						imagingImportSourceKind === "folder_watch"
							? "dicom_file"
							: imagingImportSourceKind,
					rawText: imagingImportText,
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(response, "Серии снимков не разобраны"),
				);
			}
			setDicomSeriesPreview(
				(await response.json()) as DicomSeriesPreviewResponse,
			);
			setDicomViewerLaunchManifest(null);
			setDicomViewerToolStateBundle(null);
			setDicomViewerWorkbenchManifest(null);
			setDicomWorkbenchLocalSavedAt(null);
			setDicomWorkstationReadiness(null);
			setDicomRenderCachePlan(null);
			setDicomFolderWorkupPlan(null);
		} catch (seriesError) {
			showToast(
				actionFailureToast(
					"Серии снимков не разобраны",
					(seriesError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isLocalDicomOperationAbortError(seriesError)) return;
			setError(
				operatorWorkflowFailureMessage(
					"Серии снимков не разобраны",
					seriesError,
				),
			);
		} finally {
			finishLocalDicomOperation(controller);
			setIsDicomSeriesPreviewLoading(false);
		}
	}

	async function checkDicomWebConnector() {
		if (!dicomWebEndpointUrl.trim()) {
			setError("Укажите адрес архива снимков перед проверкой.");
			return;
		}
		const controller = startLocalDicomOperation();
		setIsDicomWebChecking(true);
		try {
			const response = await fetch("/api/imaging/dicomweb/check", {
				method: "POST",
				signal: controller.signal,
				headers: auth.settingsAccessHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					endpointUrl: dicomWebEndpointUrl.trim(),
					authMode: "reverse_proxy",
					studyInstanceUid: cbctWorkbenchSeries?.studyInstanceUid ?? null,
					seriesInstanceUid: cbctWorkbenchSeries?.seriesInstanceUid ?? null,
					timeoutMs: 5000,
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Проверка архива снимков не выполнена",
					),
				);
			}
			setDicomWebCheck(
				(await response.json()) as DicomWebConnectorCheckResponse,
			);
			setDicomViewerWorkbenchManifest(null);
			setDicomWorkbenchLocalSavedAt(null);
			setDicomWorkstationReadiness(null);
		} catch (checkError) {
			showToast(
				actionFailureToast(
					"Проверка архива снимков не выполнена",
					(checkError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isLocalDicomOperationAbortError(checkError)) return;
			setError(
				operatorWorkflowFailureMessage(
					"Проверка архива снимков не выполнена",
					checkError,
				),
			);
		} finally {
			finishLocalDicomOperation(controller);
			setIsDicomWebChecking(false);
		}
	}

	async function buildDicomViewerWorkbenchManifest() {
		if (!cbctWorkbenchSeries) {
			setError(
				"Сначала проверьте серии снимков и выберите готовую КЛКТ/КТ-серию.",
			);
			return;
		}
		const controller = startLocalDicomOperation();
		setIsDicomWorkbenchBuilding(true);
		try {
			const client = await collectDicomWorkstationClientFacts();
			const response = await fetch(
				"/api/imaging/dicom/viewer-workbench-manifest",
				{
					method: "POST",
					signal: controller.signal,
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						viewerKind: "cornerstone3d",
						target: "cornerstone3d",
						series: cbctWorkbenchSeries,
						client,
						connector: dicomWebCheck,
						viewerState: currentImagingViewerSessionState,
						annotations: imagingViewerAnnotations,
						dicomWebBaseUrl: dicomWebEndpointUrl.trim() || null,
						ohifBaseUrl: ohifBaseUrl.trim() || null,
						allowExternalHandoff: true,
					}),
				},
			);
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Просмотр КЛКТ/КТ не подготовлен",
					),
				);
			}
			const result =
				(await response.json()) as DicomViewerWorkbenchManifestResponse;
			const clientSavedAt = new Date().toISOString();
			const savedLocally = await saveLocalDicomWorkbenchDraft(
				result,
				clientSavedAt,
				activeOrganizationId,
			);
			applyDicomWorkbenchManifest(result);
			setDicomWorkbenchLocalSavedAt(savedLocally ? clientSavedAt : null);
			setDicomWorkbenchServerBundle(null);
			await saveDicomWorkbenchBundleToServer(result, clientSavedAt, {
				silent: true,
				signal: controller.signal,
			});
		} catch (workbenchError) {
			showToast(
				actionFailureToast(
					"Просмотр КЛКТ/КТ не подготовлен",
					(workbenchError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isLocalDicomOperationAbortError(workbenchError)) return;
			setError(
				operatorWorkflowFailureMessage(
					"Просмотр КЛКТ/КТ не подготовлен",
					workbenchError,
				),
			);
		} finally {
			finishLocalDicomOperation(controller);
			setIsDicomWorkbenchBuilding(false);
		}
	}

	async function buildDicomViewerLaunchManifest() {
		if (!cbctWorkbenchSeries) {
			setError(
				"Сначала проверьте серии снимков и выберите готовую КЛКТ/КТ-серию для внешнего просмотра.",
			);
			return;
		}
		const controller = startLocalDicomOperation();
		setIsDicomManifestBuilding(true);
		try {
			const response = await fetch(
				"/api/imaging/dicom/viewer-launch-manifest",
				{
					method: "POST",
					signal: controller.signal,
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						viewerKind: "ohif",
						series: cbctWorkbenchSeries,
						viewerState: currentImagingViewerSessionState,
						annotations: imagingViewerAnnotations,
						dicomWebBaseUrl: dicomWebEndpointUrl.trim() || null,
						ohifBaseUrl: ohifBaseUrl.trim() || null,
						allowExternalHandoff: true,
					}),
				},
			);
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"План открытия снимков не создан",
					),
				);
			}
			setDicomViewerWorkbenchManifest(null);
			setDicomWorkbenchLocalSavedAt(null);
			setDicomViewerLaunchManifest(
				(await response.json()) as DicomViewerLaunchManifestResponse,
			);
		} catch (manifestError) {
			showToast(
				actionFailureToast(
					"План открытия снимков не создан",
					(manifestError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isLocalDicomOperationAbortError(manifestError)) return;
			setError(
				operatorWorkflowFailureMessage(
					"План открытия снимков не создан",
					manifestError,
				),
			);
		} finally {
			finishLocalDicomOperation(controller);
			setIsDicomManifestBuilding(false);
		}
	}

	async function buildDicomViewerToolStateBundle() {
		if (!cbctWorkbenchSeries) {
			setError(
				"Сначала проверьте серии снимков и выберите готовую КЛКТ/КТ-серию для экспорта состояния.",
			);
			return;
		}
		const controller = startLocalDicomOperation();
		setIsDicomToolStateBuilding(true);
		try {
			const response = await fetch("/api/imaging/dicom/viewer-tool-state", {
				method: "POST",
				signal: controller.signal,
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					target: "cornerstone3d",
					viewerKind: "cornerstone3d",
					series: cbctWorkbenchSeries,
					viewerState: currentImagingViewerSessionState,
					annotations: imagingViewerAnnotations,
					renderPlan: dicomWorkstationReadiness?.renderPlan ?? null,
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Состояние просмотра снимков не собрано",
					),
				);
			}
			setDicomViewerWorkbenchManifest(null);
			setDicomWorkbenchLocalSavedAt(null);
			setDicomViewerToolStateBundle(
				(await response.json()) as DicomViewerToolStateBundleResponse,
			);
		} catch (toolStateError) {
			showToast(
				actionFailureToast(
					"Состояние просмотра снимков не собрано",
					(toolStateError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isLocalDicomOperationAbortError(toolStateError)) return;
			setError(
				operatorWorkflowFailureMessage(
					"Состояние просмотра снимков не собрано",
					toolStateError,
				),
			);
		} finally {
			finishLocalDicomOperation(controller);
			setIsDicomToolStateBuilding(false);
		}
	}

	function downloadDicomViewerToolStateBundle() {
		if (!dicomViewerToolStateBundle) {
			setError(
				"Сначала соберите состояние просмотра снимков, затем скачайте файл состояния.",
			);
			return;
		}
		const safeBundle = redactedDicomViewerToolStateBundleForDownload(
			dicomViewerToolStateBundle,
		);
		const blob = new Blob([JSON.stringify(safeBundle, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		const seriesPart =
			safeBundle.seriesRef.seriesInstanceUid?.slice(-10) ?? "series";
		try {
			link.href = url;
			link.download = `dicom_tool_state_${seriesPart}.json`;
			document.body.append(link);
			link.click();
		} finally {
			link.remove();
			auth.revokeObjectUrlIfNeeded(url);
		}
		setError(null);
	}

	function downloadDicomWorkbenchManifest() {
		if (!dicomViewerWorkbenchManifest) {
			setError(
				"Сначала соберите рабочий набор КЛКТ/КТ-срезов, затем скачайте файл состояния.",
			);
			return;
		}
		const safeManifest = redactedDicomWorkbenchManifestForDownload(
			dicomViewerWorkbenchManifest,
		);
		const blob = new Blob([JSON.stringify(safeManifest, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		const seriesPart =
			dicomWorkbenchSeriesKey(safeManifest)
				.slice(-24)
				.replace(/[^a-zA-Z0-9._-]+/g, "-") || "series";
		try {
			link.href = url;
			link.download = `dicom_workbench_${seriesPart}.json`;
			document.body.append(link);
			link.click();
		} finally {
			link.remove();
			auth.revokeObjectUrlIfNeeded(url);
		}
		setError(null);
	}

	function clearDicomWorkbenchRecovery() {
		void removeLocalDicomWorkbenchDraft(activeOrganizationId);
		setDicomWorkbenchLocalSavedAt(null);
	}

	function applyDicomWorkbenchManifest(
		manifest: DicomViewerWorkbenchManifestResponse,
	) {
		setDicomViewerWorkbenchManifest(manifest);
		setDicomWorkstationReadiness(manifest.readiness);
		setDicomRenderCachePlan(manifest.renderCachePlan);
		setDicomViewerLaunchManifest(manifest.launchManifest);
		setDicomViewerToolStateBundle(manifest.toolStateBundle);
	}

	function restoreDicomWorkbenchServerBundle(bundle: DicomWorkbenchBundle) {
		applyDicomWorkbenchManifest(bundle.manifest);
		setDicomWorkbenchServerBundle(bundle);
	}

	async function loadDicomWorkbenchBundles(
		options: { silent?: boolean; restoreLatest?: boolean } = {},
	) {
		try {
			const response = await fetch(
				"/api/imaging/dicom/workbench-bundles?limit=6",
				{ headers: auth.denteClinicalReadHeaders() },
			);
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Список сохраненных наборов просмотра не загружен",
					),
				);
			}
			const result =
				(await response.json()) as DicomWorkbenchBundleListResponse;
			setDicomWorkbenchServerBundles(result.bundles);
			const latest = result.bundles?.[0] ?? null;
			if (latest && options.restoreLatest) {
				restoreDicomWorkbenchServerBundle(latest);
			}
		} catch (bundleError) {
			showToast(
				actionFailureToast(
					"Список сохраненных наборов просмотра не загружен",
					(bundleError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (!options.silent) {
				setError(
					operatorWorkflowFailureMessage(
						"Список сохраненных наборов просмотра не загружен",
						bundleError,
					),
				);
			}
		}
	}

	async function saveDicomWorkbenchBundleToServer(
		manifest: DicomViewerWorkbenchManifestResponse | null = dicomViewerWorkbenchManifest,
		clientSavedAt: string | null = dicomWorkbenchLocalSavedAt,
		options: { silent?: boolean; signal?: AbortSignal } = {},
	) {
		if (!manifest) return null;
		setIsDicomWorkbenchServerSaving(true);
		try {
			const response = await fetch("/api/imaging/dicom/workbench-bundles", {
				method: "POST",
				signal: options.signal ?? null,
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					manifest,
					clientSavedAt,
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Набор просмотра КЛКТ/КТ-срезов не сохранен",
					),
				);
			}
			const result = (await response.json()) as DicomWorkbenchBundleResponse;
			setDicomWorkbenchServerBundle(result.bundle);
			setDicomWorkbenchServerBundles((bundles) =>
				[
					result.bundle,
					...bundles.filter(
						(bundle) =>
							bundle.id !== result.bundle.id &&
							bundle.seriesKey !== result.bundle.seriesKey,
					),
				].slice(0, 6),
			);
			return result.bundle;
		} catch (saveError) {
			showToast(
				actionFailureToast(
					"Набор просмотра КЛКТ/КТ-срезов не сохранен",
					(saveError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isLocalDicomOperationAbortError(saveError)) return null;
			if (!options.silent) {
				setError(
					operatorWorkflowFailureMessage(
						"Набор просмотра КЛКТ/КТ-срезов не сохранен",
						saveError,
					),
				);
			}
			return null;
		} finally {
			setIsDicomWorkbenchServerSaving(false);
		}
	}

	async function reconnectDicomWorkbenchFromCurrentFolder() {
		if (!imagingFolderPath.trim()) {
			setError(
				"Укажите локальную папку со снимками перед переподключением просмотра.",
			);
			return;
		}
		const targetStudyUid =
			dicomViewerWorkbenchManifest?.toolStateBundle.seriesRef
				.studyInstanceUid ??
			dicomWorkbenchServerBundle?.studyInstanceUid ??
			latestDicomWorkbenchServerBundle?.studyInstanceUid ??
			null;
		const targetSeriesUid =
			dicomViewerWorkbenchManifest?.toolStateBundle.seriesRef
				.seriesInstanceUid ??
			dicomWorkbenchServerBundle?.seriesInstanceUid ??
			latestDicomWorkbenchServerBundle?.seriesInstanceUid ??
			null;
		const controller = startLocalDicomOperation();
		setIsDicomWorkbenchReconnecting(true);
		try {
			const client = await collectDicomWorkstationClientFacts();
			const workupResponse = await fetch(
				"/api/imaging/dicom/folder-workup-plan",
				{
					method: "POST",
					signal: controller.signal,
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						folderPath: imagingFolderPath,
						recursive: true,
						sourceName: "dicom_reconnected_folder",
						client,
						viewerState: currentImagingViewerSessionState,
					}),
				},
			);
			if (!workupResponse.ok) {
				throw new Error(
					await responseErrorMessage(
						workupResponse,
						"Источник снимков не переподключен",
					),
				);
			}
			const workup =
				(await workupResponse.json()) as DicomFolderWorkupPlanResponse;
			const matchedPlan =
				workup.plans?.find(
					(plan) =>
						(!targetStudyUid ||
							plan.series.studyInstanceUid === targetStudyUid) &&
						(!targetSeriesUid ||
							plan.series.seriesInstanceUid === targetSeriesUid),
				) ??
				workup.plans?.find(
					(plan) => plan.series.mprReadiness.volumeCandidate,
				) ??
				workup.plans?.[0] ??
				null;
			if (!matchedPlan) {
				throw new Error(
					"Переподключение снимков не нашло пригодную КТ-серию в текущей папке.",
				);
			}

			const manifestResponse = await fetch(
				"/api/imaging/dicom/viewer-workbench-manifest",
				{
					method: "POST",
					signal: controller.signal,
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						viewerKind: "cornerstone3d",
						target: "cornerstone3d",
						series: matchedPlan.series,
						client,
						connector: dicomWebCheck,
						viewerState: currentImagingViewerSessionState,
						annotations: imagingViewerAnnotations,
						dicomWebBaseUrl: dicomWebEndpointUrl.trim() || null,
						ohifBaseUrl: ohifBaseUrl.trim() || null,
						allowExternalHandoff: true,
					}),
				},
			);
			if (!manifestResponse.ok) {
				throw new Error(
					await responseErrorMessage(
						manifestResponse,
						"План переподключения снимков не создан",
					),
				);
			}
			const manifest =
				(await manifestResponse.json()) as DicomViewerWorkbenchManifestResponse;
			const clientSavedAt = new Date().toISOString();
			const savedLocally = await saveLocalDicomWorkbenchDraft(
				manifest,
				clientSavedAt,
				activeOrganizationId,
			);
			setDicomFolderWorkupPlan(workup);
			setDicomFolderSeriesScan(workup.folder);
			setDicomSeriesPreview(workup.folder.preview);
			applyDicomWorkbenchManifest(manifest);
			setDicomWorkbenchLocalSavedAt(savedLocally ? clientSavedAt : null);
			setDicomWorkbenchServerBundle(null);
			await saveDicomWorkbenchBundleToServer(manifest, clientSavedAt, {
				silent: true,
				signal: controller.signal,
			});
		} catch (reconnectError) {
			showToast(
				actionFailureToast(
					"Источник снимков не переподключен",
					(reconnectError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isLocalDicomOperationAbortError(reconnectError)) return;
			setError(
				operatorWorkflowFailureMessage(
					"Источник снимков не переподключен",
					reconnectError,
				),
			);
		} finally {
			finishLocalDicomOperation(controller);
			setIsDicomWorkbenchReconnecting(false);
		}
	}

	async function checkDicomWorkstationReadiness() {
		if (!cbctWorkbenchSeries) {
			setError(
				"Сначала проверьте серии снимков и выберите готовую КЛКТ/КТ-серию.",
			);
			return;
		}
		const controller = startLocalDicomOperation();
		setIsDicomWorkstationChecking(true);
		try {
			const client = await collectDicomWorkstationClientFacts();
			const response = await fetch("/api/imaging/dicom/workstation-readiness", {
				method: "POST",
				signal: controller.signal,
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					series: cbctWorkbenchSeries,
					client,
					connector: dicomWebCheck,
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Готовность станции просмотра не проверена",
					),
				);
			}
			setDicomWorkstationReadiness(
				(await response.json()) as DicomWorkstationReadinessResponse,
			);
			setDicomViewerWorkbenchManifest(null);
			setDicomWorkbenchLocalSavedAt(null);
			setDicomRenderCachePlan(null);
		} catch (readinessError) {
			showToast(
				actionFailureToast(
					"Готовность станции просмотра не проверена",
					(readinessError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isLocalDicomOperationAbortError(readinessError)) return;
			setError(
				operatorWorkflowFailureMessage(
					"Готовность станции просмотра не проверена",
					readinessError,
				),
			);
		} finally {
			finishLocalDicomOperation(controller);
			setIsDicomWorkstationChecking(false);
		}
	}

	async function buildDicomRenderCachePlan() {
		if (!cbctWorkbenchSeries || !dicomWorkstationReadiness) {
			const missingSteps = [
				!cbctWorkbenchSeries ? "выберите готовую КЛКТ/КТ-серию" : null,
				!dicomWorkstationReadiness ? "сначала проверьте этот ПК" : null,
			].filter((step): step is string => Boolean(step));
			setError(
				`Перед планом быстрой загрузки снимков: ${missingSteps.join(", ")}.`,
			);
			return;
		}
		const controller = startLocalDicomOperation();
		setIsDicomRenderCachePlanning(true);
		try {
			const response = await fetch("/api/imaging/dicom/render-cache-plan", {
				method: "POST",
				signal: controller.signal,
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					series: cbctWorkbenchSeries,
					renderPlan: dicomWorkstationReadiness.renderPlan,
					viewerState: currentImagingViewerSessionState,
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"План быстрой загрузки снимков не построен",
					),
				);
			}
			setDicomViewerWorkbenchManifest(null);
			setDicomWorkbenchLocalSavedAt(null);
			setDicomRenderCachePlan(
				(await response.json()) as DicomRenderCachePlanResponse,
			);
		} catch (cachePlanError) {
			showToast(
				actionFailureToast(
					"План быстрой загрузки снимков не построен",
					(cachePlanError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isLocalDicomOperationAbortError(cachePlanError)) return;
			setError(
				operatorWorkflowFailureMessage(
					"План быстрой загрузки снимков не построен",
					cachePlanError,
				),
			);
		} finally {
			finishLocalDicomOperation(controller);
			setIsDicomRenderCachePlanning(false);
		}
	}

	function cancelLocalDicomOperation() {
		localDicomOperationAbortRef.current?.abort();
	}

	// ===== Effects =====

	// Blob-URL preview lifecycle for imaging studies
	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (!imagingPreviewWorkset.length) {
			setImagingPreviewObjectUrls((current) => {
				auth.revokeObjectUrlMap(current);
				return {};
			});
			return undefined;
		}

		let cancelled = false;
		const abortController = new AbortController();
		const createdUrls: string[] = [];
		void Promise.all(
			imagingPreviewWorkset.map(
				async (study): Promise<[string, string] | null> => {
					if (!study.previewUrl.startsWith("/api/"))
						return [study.id, study.previewUrl];
					const response = await fetch(study.previewUrl, {
						cache: "no-store",
						headers: auth.denteClinicalReadHeaders(),
						signal: abortController.signal,
					});
					if (!response.ok) return null;
					const blobUrl = URL.createObjectURL(await response.blob());
					if (cancelled) {
						auth.revokeObjectUrlIfNeeded(blobUrl);
						return null;
					}
					createdUrls.push(blobUrl);
					return [study.id, blobUrl];
				},
			),
		)
			.then((entries) => {
				if (cancelled) {
					createdUrls.forEach(auth.revokeObjectUrlIfNeeded);
					return;
				}
				const next = Object.fromEntries(
					entries.filter((entry): entry is [string, string] => Boolean(entry)),
				);
				const nextUrls = new Set(Object.values(next));
				setImagingPreviewObjectUrls((current) => {
					Object.values(current).forEach((url) => {
						if (!nextUrls.has(url)) auth.revokeObjectUrlIfNeeded(url);
					});
					return next;
				});
			})
			.catch((err) => {
				createdUrls.forEach(auth.revokeObjectUrlIfNeeded);
				if (!cancelled) {
					showToast(
						actionFailureToast(
							"Предпросмотр снимка",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
					setImagingPreviewObjectUrls((current) => {
						auth.revokeObjectUrlMap(current);
						return {};
					});
				}
			});

		return () => {
			cancelled = true;
			abortController.abort();
			createdUrls.forEach(auth.revokeObjectUrlIfNeeded);
		};
	}, [
		imagingPreviewWorkset,
		auth.revokeObjectUrlMap,
		auth.revokeObjectUrlIfNeeded,
		auth.denteClinicalReadHeaders,
	]);

	// ===== Return =====
	return {
		// State
		imagingPreviewObjectUrls,
		dicomFirstFramePreviewRequest,

		// Computed
		selectedImagingStudy,
		selectedImagingViewerPlan,
		cbctWorkbenchSeries,
		latestDicomWorkbenchServerBundle,
		currentImagingViewerSessionState,
		mprSafeSliceIndex,
		mprSliceMaxIndex,
		imagingPreviewWorkset,
		latestImagingStudy,

		// Folder recovery
		stageLocalImagingFolderRecovery,
		rememberLocalImagingFolder,

		// Local operation helpers
		startLocalDicomOperation,
		finishLocalDicomOperation,
		cancelLocalDicomOperation,
		isLocalDicomOperationAbortError,

		// DICOM workbench functions
		previewDicomFirstFrame,
		previewDicomFirstFrameSlice,
		fetchDicomFolderWorkup,
		selectPreferredDicomWorkupPlan,
		applyDicomFolderWorkupResult,
		buildDicomFolderWorkupPlan,
		prepareDicomWorkbenchFromFolder,
		previewDicomSeries,
		checkDicomWebConnector,
		buildDicomViewerWorkbenchManifest,
		buildDicomViewerLaunchManifest,
		buildDicomViewerToolStateBundle,
		downloadDicomViewerToolStateBundle,
		downloadDicomWorkbenchManifest,
		clearDicomWorkbenchRecovery,
		applyDicomWorkbenchManifest,
		restoreDicomWorkbenchServerBundle,
		loadDicomWorkbenchBundles,
		saveDicomWorkbenchBundleToServer,
		reconnectDicomWorkbenchFromCurrentFolder,
		checkDicomWorkstationReadiness,
		buildDicomRenderCachePlan,
	};
}

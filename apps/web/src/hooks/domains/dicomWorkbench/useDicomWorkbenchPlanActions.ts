/**
 * useDicomWorkbenchPlanActions (Layer 3)
 *
 * Folder workup plans, first-frame preview, and series scan mutations.
 */

import type { DicomFolderWorkupPlanResponse } from "@dental/shared";
import {
	type DicomFirstFramePreviewMetadata,
	type DicomFirstFramePreviewOptions,
	type LocalImagingFolderDraft,
} from "../../../AppConstants";
import {
	operatorWorkflowFailureMessage,
	saveLocalDicomWorkbenchDraft,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { defaultDicomFirstFrameViewerState } from "../../../utils/draftDefaults";
import {
	checkDicomWebConnectorApi,
	fetchDicomFirstFramePreviewApi,
	fetchDicomFolderWorkupApi,
	fetchDicomSeriesPreviewApi,
	fetchDicomViewerWorkbenchManifestApi,
	saveDicomWorkbenchBundleApi,
	selectPreferredDicomWorkupPlan as selectPreferredDicomWorkupPlanService,
} from "./dicomStudyLoader";
import type { DicomAuthContext } from "./types";
import type { useDicomWorkbenchState } from "./useDicomWorkbenchState";

export interface UseDicomWorkbenchPlanActionsParams {
	auth: DicomAuthContext;
	state: ReturnType<typeof useDicomWorkbenchState>;
	setError: (error: string | null) => void;
	ohifBaseUrl: string;
	applyDicomWorkbenchManifest: (manifest: any) => void;
}

export function useDicomWorkbenchPlanActions({
	auth,
	state,
	setError,
	ohifBaseUrl,
	applyDicomWorkbenchManifest,
}: UseDicomWorkbenchPlanActionsParams) {
	const { imagingStore } = state;

	async function previewDicomFirstFrame(
		folderPath = imagingStore.imagingFolderPath.trim(),
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
		state.rememberLocalImagingFolder(cleanFolderPath, metadata);
		state.setDicomFirstFramePreviewRequest({
			folderPath: cleanFolderPath,
			metadata,
		});
		const controller = state.startLocalDicomOperation();
		imagingStore.setIsDicomFirstFramePreviewing(true);
		setError(null);
		if (options.resetViewer !== false) {
			imagingStore.setDicomFirstFrameViewerState(defaultDicomFirstFrameViewerState);
		}
		try {
			const data = await fetchDicomFirstFramePreviewApi(
				cleanFolderPath,
				auth,
				options,
				controller.signal,
			);
			imagingStore.setDicomFirstFramePreview(data);
		} catch (previewError) {
			if (state.isLocalDicomOperationAbortError(previewError)) return;
			showToast(
				actionFailureToast(
					"Первый срез снимков не показан",
					(previewError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Первый срез снимков не показан",
					previewError,
				),
			);
		} finally {
			state.finishLocalDicomOperation(controller);
			imagingStore.setIsDicomFirstFramePreviewing(false);
		}
	}

	async function previewDicomFirstFrameSlice(preferredFileIndex: number) {
		if (!state.dicomFirstFramePreviewRequest) return;
		const maxIndex = Math.max(
			0,
			(imagingStore.dicomFirstFramePreview?.selectableFileCount ?? 1) - 1,
		);
		const nextIndex = Math.min(
			maxIndex,
			Math.max(0, Math.round(preferredFileIndex)),
		);
		await previewDicomFirstFrame(
			state.dicomFirstFramePreviewRequest.folderPath,
			state.dicomFirstFramePreviewRequest.metadata,
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
	) {
		return fetchDicomFolderWorkupApi(
			folderPath,
			sourceName,
			state.currentImagingViewerSessionState,
			auth,
			options.signal ?? undefined,
		);
	}

	function selectPreferredDicomWorkupPlan(
		result: DicomFolderWorkupPlanResponse,
	) {
		return selectPreferredDicomWorkupPlanService(result);
	}

	function applyDicomFolderWorkupResult(result: DicomFolderWorkupPlanResponse) {
		const firstPlan = selectPreferredDicomWorkupPlan(result);
		imagingStore.setDicomFolderWorkupPlan(result);
		imagingStore.setDicomFolderSeriesScan(result.folder);
		imagingStore.setImagingImportSourceKind("dicom_file");
		imagingStore.setImagingImportText(result.folder.rawText || imagingStore.imagingImportText);
		imagingStore.setDicomSeriesPreview(result.folder.preview);
		imagingStore.setDicomViewerLaunchManifest(null);
		imagingStore.setDicomViewerToolStateBundle(null);
		imagingStore.setDicomViewerWorkbenchManifest(null);
		imagingStore.setDicomWorkbenchLocalSavedAt(null);
		imagingStore.setDicomWorkstationReadiness(firstPlan?.readiness ?? null);
		imagingStore.setDicomRenderCachePlan(firstPlan?.renderCachePlan ?? null);
		imagingStore.setDicomFirstFramePreview(null);
		imagingStore.setImagingImportPreview(null);
		imagingStore.setImagingImportCommit(null);
	}

	async function buildDicomFolderWorkupPlan() {
		const folderPath = imagingStore.imagingFolderPath.trim();
		if (!folderPath) {
			setError(
				"Укажите путь к локальной папке со снимками перед подготовкой плана.",
			);
			return;
		}
		state.rememberLocalImagingFolder(folderPath, { origin: "manual" });
		const controller = state.startLocalDicomOperation();
		imagingStore.setIsDicomFolderWorkupPlanning(true);
		try {
			const { result } = await fetchDicomFolderWorkup(
				folderPath,
				"dicom_folder_workup",
				{ signal: controller.signal },
			);
			applyDicomFolderWorkupResult(result);
		} catch (workupError) {
			if (state.isLocalDicomOperationAbortError(workupError)) return;
			showToast(
				actionFailureToast(
					"План папки снимков не подготовлен",
					(workupError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"План папки снимков не подготовлен",
					workupError,
				),
			);
		} finally {
			state.finishLocalDicomOperation(controller);
			imagingStore.setIsDicomFolderWorkupPlanning(false);
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
		const controller = state.startLocalDicomOperation();
		imagingStore.setIsDicomFolderWorkupPlanning(true);
		imagingStore.setIsDicomWorkbenchBuilding(true);
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

			const manifest = await fetchDicomViewerWorkbenchManifestApi(
				{
					series: selectedPlan.series,
					client,
					connector: imagingStore.dicomWebCheck,
					viewerState: state.currentImagingViewerSessionState,
					annotations: imagingStore.imagingViewerAnnotations,
					dicomWebBaseUrl: imagingStore.dicomWebEndpointUrl.trim() || null,
					ohifBaseUrl: ohifBaseUrl.trim() || null,
				},
				auth,
				controller.signal,
			);

			const clientSavedAt = new Date().toISOString();
			const savedLocally = await saveLocalDicomWorkbenchDraft(
				manifest,
				clientSavedAt,
				state.activeOrganizationId,
			);
			state.rememberLocalImagingFolder(cleanFolderPath, {
				...metadata,
				origin: metadata.origin ?? "workbench",
			});
			applyDicomFolderWorkupResult(result);
			applyDicomWorkbenchManifest(manifest);
			imagingStore.setDicomWorkbenchLocalSavedAt(savedLocally ? clientSavedAt : null);
			imagingStore.setDicomWorkbenchServerBundle(null);
			await saveDicomWorkbenchBundleApi(manifest, clientSavedAt, auth, controller.signal).catch(
				() => null,
			);
		} catch (workbenchError) {
			if (state.isLocalDicomOperationAbortError(workbenchError)) return;
			showToast(
				actionFailureToast(
					"Просмотр КЛКТ/КТ не подготовлен",
					(workbenchError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Просмотр КЛКТ/КТ не подготовлен",
					workbenchError,
				),
			);
		} finally {
			state.finishLocalDicomOperation(controller);
			imagingStore.setIsDicomFolderWorkupPlanning(false);
			imagingStore.setIsDicomWorkbenchBuilding(false);
		}
	}

	async function previewDicomSeries() {
		if (!imagingStore.imagingImportText.trim()) {
			setError(
				"Вставьте строки со снимками или выберите пример КТ/ОПТГ/ТРГ перед группировкой серий.",
			);
			return;
		}
		const controller = state.startLocalDicomOperation();
		imagingStore.setIsDicomSeriesPreviewLoading(true);
		try {
			const data = await fetchDicomSeriesPreviewApi(
				imagingStore.imagingImportSourceKind,
				imagingStore.imagingImportSourceKind,
				imagingImportText: imagingStore.imagingImportText,
				auth,
				controller.signal,
			);
			imagingStore.setDicomSeriesPreview(data);
			imagingStore.setDicomViewerLaunchManifest(null);
			imagingStore.setDicomViewerToolStateBundle(null);
			imagingStore.setDicomViewerWorkbenchManifest(null);
			imagingStore.setDicomWorkbenchLocalSavedAt(null);
			imagingStore.setDicomWorkstationReadiness(null);
			imagingStore.setDicomRenderCachePlan(null);
			imagingStore.setDicomFolderWorkupPlan(null);
		} catch (seriesError) {
			if (state.isLocalDicomOperationAbortError(seriesError)) return;
			showToast(
				actionFailureToast(
					"Серии снимков не разобраны",
					(seriesError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Серии снимков не разобраны",
					seriesError,
				),
			);
		} finally {
			state.finishLocalDicomOperation(controller);
			imagingStore.setIsDicomSeriesPreviewLoading(false);
		}
	}

	async function checkDicomWebConnector() {
		if (!imagingStore.dicomWebEndpointUrl.trim()) {
			setError("Укажите адрес архива снимков перед проверкой.");
			return;
		}
		const controller = state.startLocalDicomOperation();
		imagingStore.setIsDicomWebChecking(true);
		try {
			const data = await checkDicomWebConnectorApi(
				imagingStore.dicomWebEndpointUrl,
				auth,
				state.cbctWorkbenchSeries?.studyInstanceUid ?? null,
				state.cbctWorkbenchSeries?.seriesInstanceUid ?? null,
				controller.signal,
			);
			imagingStore.setDicomWebCheck(data);
			imagingStore.setDicomViewerWorkbenchManifest(null);
			imagingStore.setDicomWorkbenchLocalSavedAt(null);
			imagingStore.setDicomWorkstationReadiness(null);
		} catch (checkError) {
			if (state.isLocalDicomOperationAbortError(checkError)) return;
			showToast(
				actionFailureToast(
					"Проверка архива снимков не выполнена",
					(checkError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Проверка архива снимков не выполнена",
					checkError,
				),
			);
		} finally {
			state.finishLocalDicomOperation(controller);
			imagingStore.setIsDicomWebChecking(false);
		}
	}

	return {
		previewDicomFirstFrame,
		previewDicomFirstFrameSlice,
		fetchDicomFolderWorkup,
		selectPreferredDicomWorkupPlan,
		applyDicomFolderWorkupResult,
		buildDicomFolderWorkupPlan,
		prepareDicomWorkbenchFromFolder,
		previewDicomSeries,
		checkDicomWebConnector,
	};
}

/**
 * DICOM Study Loader & Network Service (Layer 1)
 *
 * Handles HTTP operations for DICOM series, workup plans, first-frame preview,
 * DICOMweb connector checks, manifests, and workstation readiness.
 */

import type {
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
import type {
	DicomFirstFramePreviewOptions,
	LocalImagingFolderDraft,
} from "../../../AppConstants";
import {
	collectDicomWorkstationClientFacts,
	dicomWorkbenchSeriesKey,
	localImagingFolderFingerprint,
	redactedDicomViewerToolStateBundleForDownload,
	redactedDicomWorkbenchManifestForDownload,
	removeLocalImagingFolderDraft,
	responseErrorMessage,
	saveLocalImagingFolderDraft,
} from "../../../AppHelpers";
import { fetchWithHandling } from "../../../utils/networkUtils";
import type { DicomAuthContext } from "./types";

/**
 * Stage local imaging folder draft and fingerprint in local storage.
 */
export function buildLocalImagingFolderRecoveryDraft(
	folderPath: string,
	metadata: Partial<
		Omit<LocalImagingFolderDraft, "version" | "folderPath" | "savedAt">
	> = {},
	activeOrganizationId: string | null = null,
): LocalImagingFolderDraft | null {
	const cleanFolderPath = folderPath.trim();
	if (!cleanFolderPath || cleanFolderPath === "C:\\Images") {
		removeLocalImagingFolderDraft(activeOrganizationId);
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
	return draft;
}

/**
 * Fetch first-frame preview for a given local folder path.
 */
export async function fetchDicomFirstFramePreviewApi(
	folderPath: string,
	auth: DicomAuthContext,
	options: DicomFirstFramePreviewOptions = {},
	signal?: AbortSignal,
): Promise<DicomFirstFramePreviewResponse> {
	const cleanFolderPath = folderPath.trim();
	const response = await fetchWithHandling(
		"/api/imaging/dicom/first-frame-preview",
		{
			method: "POST",
			signal: signal ?? null,
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
		},
	);
	if (!response.ok) {
		throw new Error(
			await responseErrorMessage(response, "Первый срез снимков не показан"),
		);
	}
	return (await response.json()) as DicomFirstFramePreviewResponse;
}

/**
 * Fetch folder workup plan and workstation client facts.
 */
export async function fetchDicomFolderWorkupApi(
	folderPath: string,
	sourceName: string,
	currentViewerState: ImagingViewerSessionState,
	auth: DicomAuthContext,
	signal?: AbortSignal,
): Promise<{
	client: DicomWorkstationClientFacts;
	result: DicomFolderWorkupPlanResponse;
}> {
	const client = await collectDicomWorkstationClientFacts();
	const response = await fetchWithHandling(
		"/api/imaging/dicom/folder-workup-plan",
		{
			method: "POST",
			signal: signal ?? null,
			headers: auth.denteClinicalReadHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				folderPath,
				recursive: true,
				sourceName,
				client,
				viewerState: currentViewerState,
			}),
		},
	);
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

/**
 * Select the preferred series plan from a folder workup result.
 */
export function selectPreferredDicomWorkupPlan(
	result: DicomFolderWorkupPlanResponse,
) {
	return (
		result.plans?.find((plan) => plan.recommendedPath === "open_mpr") ??
		result.plans?.find((plan) => plan.recommendedPath === "downsampled_mpr") ??
		result.plans?.find((plan) => plan.series.mprReadiness.volumeCandidate) ??
		result.plans?.find((plan) => plan.recommendedPath === "external_viewer") ??
		result.plans?.[0] ??
		null
	);
}

/**
 * Fetch series preview from raw text or folder watch.
 */
export async function fetchDicomSeriesPreviewApi(
	sourceName: string,
	sourceKind: string,
	rawText: string,
	auth: DicomAuthContext,
	signal?: AbortSignal,
): Promise<DicomSeriesPreviewResponse> {
	const response = await fetchWithHandling(
		"/api/imaging/dicom/series-preview",
		{
			method: "POST",
			signal: signal ?? null,
			headers: auth.denteClinicalReadHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				sourceName,
				sourceKind:
					sourceKind === "folder_watch" ? "dicom_file" : sourceKind,
				rawText,
			}),
		},
	);
	if (!response.ok) {
		throw new Error(
			await responseErrorMessage(response, "Серии снимков не разобраны"),
		);
	}
	return (await response.json()) as DicomSeriesPreviewResponse;
}

/**
 * Check DICOMweb archive connector status.
 */
export async function checkDicomWebConnectorApi(
	endpointUrl: string,
	auth: DicomAuthContext,
	studyInstanceUid?: string | null,
	seriesInstanceUid?: string | null,
	signal?: AbortSignal,
): Promise<DicomWebConnectorCheckResponse> {
	const response = await fetchWithHandling("/api/imaging/dicomweb/check", {
		method: "POST",
		signal: signal ?? null,
		headers: auth.settingsAccessHeaders({
			"Content-Type": "application/json",
		}),
		body: JSON.stringify({
			endpointUrl: endpointUrl.trim(),
			authMode: "reverse_proxy",
			studyInstanceUid: studyInstanceUid ?? null,
			seriesInstanceUid: seriesInstanceUid ?? null,
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
	return (await response.json()) as DicomWebConnectorCheckResponse;
}

/**
 * Build viewer workbench manifest.
 */
export async function fetchDicomViewerWorkbenchManifestApi(
	payload: {
		series: NonNullable<DicomSeriesPreviewResponse["series"]>[number];
		client: DicomWorkstationClientFacts;
		connector: DicomWebConnectorCheckResponse | null;
		viewerState: ImagingViewerSessionState;
		annotations: unknown;
		dicomWebBaseUrl: string | null;
		ohifBaseUrl: string | null;
	},
	auth: DicomAuthContext,
	signal?: AbortSignal,
): Promise<DicomViewerWorkbenchManifestResponse> {
	const response = await fetchWithHandling(
		"/api/imaging/dicom/viewer-workbench-manifest",
		{
			method: "POST",
			signal: signal ?? null,
			headers: auth.denteClinicalReadHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				viewerKind: "cornerstone3d",
				target: "cornerstone3d",
				series: payload.series,
				client: payload.client,
				connector: payload.connector,
				viewerState: payload.viewerState,
				annotations: payload.annotations,
				dicomWebBaseUrl: payload.dicomWebBaseUrl,
				ohifBaseUrl: payload.ohifBaseUrl,
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
	return (await response.json()) as DicomViewerWorkbenchManifestResponse;
}

/**
 * Build viewer launch manifest for external viewers (e.g. OHIF).
 */
export async function fetchDicomViewerLaunchManifestApi(
	payload: {
		series: NonNullable<DicomSeriesPreviewResponse["series"]>[number];
		viewerState: ImagingViewerSessionState;
		annotations: unknown;
		dicomWebBaseUrl: string | null;
		ohifBaseUrl: string | null;
	},
	auth: DicomAuthContext,
	signal?: AbortSignal,
): Promise<DicomViewerLaunchManifestResponse> {
	const response = await fetchWithHandling(
		"/api/imaging/dicom/viewer-launch-manifest",
		{
			method: "POST",
			signal: signal ?? null,
			headers: auth.denteClinicalReadHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				viewerKind: "ohif",
				series: payload.series,
				viewerState: payload.viewerState,
				annotations: payload.annotations,
				dicomWebBaseUrl: payload.dicomWebBaseUrl,
				ohifBaseUrl: payload.ohifBaseUrl,
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
	return (await response.json()) as DicomViewerLaunchManifestResponse;
}

/**
 * Build viewer tool-state bundle.
 */
export async function fetchDicomViewerToolStateBundleApi(
	payload: {
		series: NonNullable<DicomSeriesPreviewResponse["series"]>[number];
		viewerState: ImagingViewerSessionState;
		annotations: unknown;
		renderPlan: unknown;
	},
	auth: DicomAuthContext,
	signal?: AbortSignal,
): Promise<DicomViewerToolStateBundleResponse> {
	const response = await fetchWithHandling(
		"/api/imaging/dicom/viewer-tool-state",
		{
			method: "POST",
			signal: signal ?? null,
			headers: auth.denteClinicalReadHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				target: "cornerstone3d",
				viewerKind: "cornerstone3d",
				series: payload.series,
				viewerState: payload.viewerState,
				annotations: payload.annotations,
				renderPlan: payload.renderPlan,
			}),
		},
	);
	if (!response.ok) {
		throw new Error(
			await responseErrorMessage(
				response,
				"Состояние просмотра снимков не собрано",
			),
		);
	}
	return (await response.json()) as DicomViewerToolStateBundleResponse;
}

/**
 * Check workstation client readiness.
 */
export async function fetchDicomWorkstationReadinessApi(
	series: NonNullable<DicomSeriesPreviewResponse["series"]>[number],
	connector: DicomWebConnectorCheckResponse | null,
	auth: DicomAuthContext,
	signal?: AbortSignal,
): Promise<DicomWorkstationReadinessResponse> {
	const client = await collectDicomWorkstationClientFacts();
	const response = await fetchWithHandling(
		"/api/imaging/dicom/workstation-readiness",
		{
			method: "POST",
			signal: signal ?? null,
			headers: auth.denteClinicalReadHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				series,
				client,
				connector,
			}),
		},
	);
	if (!response.ok) {
		throw new Error(
			await responseErrorMessage(
				response,
				"Готовность станции просмотра не проверена",
			),
		);
	}
	return (await response.json()) as DicomWorkstationReadinessResponse;
}

/**
 * Build render cache plan.
 */
export async function fetchDicomRenderCachePlanApi(
	series: NonNullable<DicomSeriesPreviewResponse["series"]>[number],
	renderPlan: unknown,
	viewerState: ImagingViewerSessionState,
	auth: DicomAuthContext,
	signal?: AbortSignal,
): Promise<DicomRenderCachePlanResponse> {
	const response = await fetchWithHandling(
		"/api/imaging/dicom/render-cache-plan",
		{
			method: "POST",
			signal: signal ?? null,
			headers: auth.denteClinicalReadHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				series,
				renderPlan,
				viewerState,
			}),
		},
	);
	if (!response.ok) {
		throw new Error(
			await responseErrorMessage(
				response,
				"План быстрой загрузки снимков не построен",
			),
		);
	}
	return (await response.json()) as DicomRenderCachePlanResponse;
}

/**
 * Fetch list of saved workbench bundles from server.
 */
export async function fetchDicomWorkbenchBundlesApi(
	auth: DicomAuthContext,
	limit = 6,
): Promise<DicomWorkbenchBundleListResponse> {
	const response = await fetchWithHandling(
		`/api/imaging/dicom/workbench-bundles?limit=${limit}`,
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
	return (await response.json()) as DicomWorkbenchBundleListResponse;
}

/**
 * Save workbench bundle to server.
 */
export async function saveDicomWorkbenchBundleApi(
	manifest: DicomViewerWorkbenchManifestResponse,
	clientSavedAt: string | null,
	auth: DicomAuthContext,
	signal?: AbortSignal,
): Promise<DicomWorkbenchBundle> {
	const response = await fetchWithHandling(
		"/api/imaging/dicom/workbench-bundles",
		{
			method: "POST",
			signal: signal ?? null,
			headers: auth.denteClinicalMutationHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				manifest,
				clientSavedAt,
			}),
		},
	);
	if (!response.ok) {
		throw new Error(
			await responseErrorMessage(
				response,
				"Набор просмотра КЛКТ/КТ-срезов не сохранен",
			),
		);
	}
	const result = (await response.json()) as DicomWorkbenchBundleResponse;
	return result.bundle;
}

/**
 * Download tool state bundle as formatted JSON file.
 */
export function downloadToolStateBundleFile(
	bundle: DicomViewerToolStateBundleResponse,
	revokeUrlIfNeeded: (url: string) => void,
): void {
	const safeBundle = redactedDicomViewerToolStateBundleForDownload(bundle);
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
		revokeUrlIfNeeded(url);
	}
}

/**
 * Download workbench manifest as formatted JSON file.
 */
export function downloadWorkbenchManifestFile(
	manifest: DicomViewerWorkbenchManifestResponse,
	revokeUrlIfNeeded: (url: string) => void,
): void {
	const safeManifest = redactedDicomWorkbenchManifestForDownload(manifest);
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
		revokeUrlIfNeeded(url);
	}
}

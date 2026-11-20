import { fetchWithHandling } from "../../utils/networkUtils";
import { useImagingStore } from "../../store/imagingStore";
import { scanBrowserFileList } from "../../utils/browserImagingFolderScan";
import {
	createBrowserImagingScanRuntime,
	browserImagingScanProgressFromStats,
	isBrowserImagingScanAbortError,
} from "../../utils/browserScanUtils";

export interface ImagingAuthOptions {
	denteClinicalReadHeaders?: (extra?: Record<string, string>) => HeadersInit;
	denteClinicalMutationHeaders?: (extra?: Record<string, string>) => HeadersInit;
	[key: string]: unknown;
}

export interface UseImagingQueriesOptions {
	auth?: ImagingAuthOptions | null | undefined;
}

export function useImagingQueries(options?: UseImagingQueriesOptions) {
	const auth = options?.auth;

	const getReadHeaders = (extra?: Record<string, string>): HeadersInit => {
		if (auth && typeof auth.denteClinicalReadHeaders === "function") {
			return auth.denteClinicalReadHeaders(extra);
		}
		return extra ?? {};
	};

	const getMutationHeaders = (extra?: Record<string, string>): HeadersInit => {
		if (auth && typeof auth.denteClinicalMutationHeaders === "function") {
			return auth.denteClinicalMutationHeaders(extra);
		}
		return extra ?? {};
	};

	const getScans = async (patientId: string) => {
		return fetchWithHandling(`/api/xray/scans?patientId=${patientId}`, {
			headers: getReadHeaders(),
		});
	};

	const saveBatchToothStates = async (patientId: string, updates: unknown[]) => {
		return fetchWithHandling(`/api/patients/${patientId}/tooth-states/batch`, {
			method: "POST",
			headers: getMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify({ updates }),
		});
	};

	const analyzeVisiograph = async (payload: {
		patientId: string;
		imageBase64: string;
		focus?: "caries" | "perio" | "endo" | null;
	}) => {
		return fetchWithHandling("/api/imaging/visiograph-ai", {
			method: "POST",
			headers: getMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});
	};

	const saveScan = async (payload: unknown) => {
		return fetchWithHandling("/api/xray/scans", {
			method: "POST",
			headers: getMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});
	};

	const getScan = async (scanId: string) => {
		return fetchWithHandling(`/api/xray/scans/${encodeURIComponent(scanId)}`, {
			headers: getReadHeaders(),
		});
	};

	const deleteScan = async (scanId: string) => {
		return fetchWithHandling(`/api/xray/scans/${encodeURIComponent(scanId)}`, {
			method: "DELETE",
			headers: getMutationHeaders(),
		});
	};

	const pickBrowserImagingFolder = () => {
		const el = document.querySelector<HTMLInputElement>(
			'[data-testid="browser-local-imaging-folder-input"]',
		);
		if (el) el.click();
	};
	const pickBrowserImagingFiles = () => {
		const el = document.querySelector<HTMLInputElement>(
			'[data-testid="browser-local-imaging-files-input"]',
		);
		if (el) el.click();
	};
	const previewImagingImport = async (payload?: unknown) => {
		return fetchWithHandling("/api/imaging/imports/preview", {
			method: "POST",
			headers: getMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const restoreMprWorkbenchLocalDraft = async () => {};
	const runRecognitionJob = async (payload?: unknown) => {
		return fetchWithHandling("/api/ai/recognition-jobs", {
			method: "POST",
			headers: getMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const scanDicomFolderSeries = async (payload?: unknown) => {
		return fetchWithHandling("/api/imaging/dicom/folder-workup-plan", {
			method: "POST",
			headers: getReadHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const scanImagingFolder = async (payload?: unknown) => {
		return fetchWithHandling("/api/imaging/folders/scan-preview", {
			method: "POST",
			headers: getReadHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const commitImagingImport = async (payload?: unknown) => {
		return fetchWithHandling("/api/imaging/imports/commit", {
			method: "POST",
			headers: getMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const dicomFirstFrameImageStyle = {};
	const dicomWorkbenchSourceIsRedacted = false;
	const discoverDicomFolders = async () => {
		return fetchWithHandling("/api/imaging/dicom/local-folder-discovery", {
			method: "POST",
			headers: getReadHeaders({
				"content-type": "application/json",
			}),
		});
	};
	const handleBrowserDirectoryInputChange = async (
		fileList: FileList | null,
	) => {
		if (!fileList || fileList.length === 0) return;
		const store = useImagingStore.getState();
		const controller = new AbortController();
		const startedAt = new Date().toISOString();
		const runtime = createBrowserImagingScanRuntime(startedAt);
		store.setIsBrowserImagingFolderPicking(true);
		store.setBrowserImagingScanProgress(
			browserImagingScanProgressFromStats(
				{
					rootName: "Выбранные файлы браузера",
					sourceKind: "browser_file_input",
					scannedFiles: 0,
					scannedFolders: 0,
					dicomLikeFiles: 0,
					archiveFiles: 0,
					modelFiles: 0,
					imageFiles: 0,
					totalBytes: 0,
					warnings: [],
				},
				runtime,
				"scanning",
				"проверка выбранных файлов",
			),
		);
		try {
			const preview = await scanBrowserFileList(fileList, {
				signal: controller.signal,
				startedAt,
				onProgress: (progress) => store.setBrowserImagingScanProgress(progress),
			});
			if (!controller.signal.aborted) {
				store.setBrowserPickedImagingFolder(preview);
			}
		} catch (scanError) {
			if (!isBrowserImagingScanAbortError(scanError)) {
				console.error(
					"[handleBrowserDirectoryInputChange] scan error:",
					scanError,
				);
			}
		} finally {
			store.setIsBrowserImagingFolderPicking(false);
		}
	};
	const organizeLocalImagingSources = async () => {
		return fetchWithHandling("/api/imaging/local-organizer/scan-preview", {
			method: "POST",
			headers: getReadHeaders({
				"content-type": "application/json",
			}),
		});
	};
	const localBridgeStatusState = "disconnected";
	const localBridgeStatusValue = { status: "disconnected", port: null };
	const sendRecognitionResultToImport = () => {};
	const selectCtPlanningImplant = (_implant: unknown) => {};

	async function loadImagingViewerSession(studyId: string) {
		await fetch(`/api/imaging/studies/${studyId}/viewer-session`, {
			headers: getReadHeaders(),
		});
	}
	async function saveImagingViewerSession(
		studyId: string,
		payload: Record<string, unknown>,
	) {
		await fetch(`/api/imaging/studies/${studyId}/viewer-session`, {
			method: "PUT",
			headers: getMutationHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify(payload),
		});
	}
	async function scanImagingFolderSeriesPreview(
		folderPath: string,
		controller: AbortController,
	) {
		await fetch("/api/imaging/dicom/folder-series-preview", {
			method: "POST",
			signal: controller.signal,
			headers: getReadHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ folderPath }),
		});
	}
	return {
		loadImagingViewerSession,
		saveImagingViewerSession,
		scanImagingFolderSeriesPreview,
		getScans,
		saveBatchToothStates,
		analyzeVisiograph,
		saveScan,
		getScan,
		deleteScan,
		pickBrowserImagingFolder,
		pickBrowserImagingFiles,
		previewImagingImport,
		commitImagingImport,
		restoreMprWorkbenchLocalDraft,
		runRecognitionJob,
		scanDicomFolderSeries,
		scanImagingFolder,
		sendRecognitionResultToImport,
		selectCtPlanningImplant,
		dicomFirstFrameImageStyle,
		dicomWorkbenchSourceIsRedacted,
		discoverDicomFolders,
		handleBrowserDirectoryInputChange,
		organizeLocalImagingSources,
		localBridgeStatusState,
		localBridgeStatusValue,
	};
}

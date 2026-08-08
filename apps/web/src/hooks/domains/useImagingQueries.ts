import { fetchWithHandling } from "../../utils/networkUtils";
export function useImagingQueries(options?: { auth?: any }) {
	const auth = options?.auth;

	const getScans = async (patientId: string) => {
		return fetchWithHandling(`/api/xray/scans?patientId=${patientId}`, {
			headers: auth.denteClinicalReadHeaders(),
		});
	};

	const saveBatchToothStates = async (patientId: string, updates: any[]) => {
		return fetchWithHandling(`/api/patients/${patientId}/tooth-states/batch`, {
			method: "POST",
			headers: auth.denteClinicalMutationHeaders({
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
			headers: auth.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});
	};

	const saveScan = async (payload: any) => {
		return fetchWithHandling("/api/xray/scans", {
			method: "POST",
			headers: auth.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});
	};

	const getScan = async (scanId: string) => {
		return fetchWithHandling(`/api/xray/scans/${encodeURIComponent(scanId)}`, {
			headers: auth.denteClinicalReadHeaders(),
		});
	};

	const deleteScan = async (scanId: string) => {
		return fetchWithHandling(`/api/xray/scans/${encodeURIComponent(scanId)}`, {
			method: "DELETE",
			headers: auth.denteClinicalMutationHeaders(),
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
	const previewImagingImport = async (payload?: any) => {
		return fetchWithHandling("/api/imaging/imports/preview", {
			method: "POST",
			headers: auth.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const restoreMprWorkbenchLocalDraft = async () => {};
	const runRecognitionJob = async (payload?: any) => {
		return fetchWithHandling("/api/ai/recognition-jobs", {
			method: "POST",
			headers: auth.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const scanDicomFolderSeries = async (payload?: any) => {
		return fetchWithHandling("/api/imaging/dicom/folder-workup-plan", {
			method: "POST",
			headers: auth.denteClinicalReadHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const scanImagingFolder = async (payload?: any) => {
		return fetchWithHandling("/api/imaging/folders/scan-preview", {
			method: "POST",
			headers: auth.denteClinicalReadHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const commitImagingImport = async (payload?: any) => {
		return fetchWithHandling("/api/imaging/imports/commit", {
			method: "POST",
			headers: auth.denteClinicalMutationHeaders({
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
			headers: auth.denteClinicalReadHeaders({
				"content-type": "application/json",
			}),
		});
	};
	const handleBrowserDirectoryInputChange = async (_files: any) => {};
	const organizeLocalImagingSources = async () => {
		return fetchWithHandling("/api/imaging/local-organizer/scan-preview", {
			method: "POST",
			headers: auth.denteClinicalReadHeaders({
				"content-type": "application/json",
			}),
		});
	};
	const localBridgeStatusState = "disconnected";
	const localBridgeStatusValue = { status: "disconnected", port: null };
	const sendRecognitionResultToImport = () => {};
	const selectCtPlanningImplant = (_implant: any) => {};

	return {
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

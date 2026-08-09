import { fetchWithHandling } from "../../utils/networkUtils";
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export function useImagingQueries(options?: { auth?: any }) {
	const auth = options?.auth;

	const getScans = async (patientId: string) => {
		return fetchWithHandling(`/api/xray/scans?patientId=${patientId}`, {
			headers: auth.denteClinicalReadHeaders(),
		});
	};

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const runRecognitionJob = async (payload?: any) => {
		return fetchWithHandling("/api/ai/recognition-jobs", {
			method: "POST",
			headers: auth.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload ?? {}),
		});
	};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const scanDicomFolderSeries = async (payload?: any) => {
		return fetchWithHandling("/api/imaging/dicom/folder-workup-plan", {
			method: "POST",
			headers: auth.denteClinicalReadHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload ?? {}),
		});
	};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const scanImagingFolder = async (payload?: any) => {
		return fetchWithHandling("/api/imaging/folders/scan-preview", {
			method: "POST",
			headers: auth.denteClinicalReadHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload ?? {}),
		});
	};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const selectCtPlanningImplant = (_implant: any) => {};

	/*
	 * У КАЖДОЙ ИЗ ТРЁХ ФУНКЦИЙ НИЖЕ БЫЛО ПО ТРИ ДЕФЕКТА, и ни один не виден
	 * компилятору. Найдено гейтом check:guarded-headers 2026-08-09 — сразу после
	 * того, как в самом гейте закрыли слепое пятно на форму `await fetch`: до
	 * этого он оправдывал их «помощник уже в области видимости».
	 *
	 * 1. НЕ ПОСЫЛАЛСЯ ЗАГОЛОВОК ОХРАНЫ. Маршруты закрыты
	 *    requireClinicalReadAccess (imaging.ts:9187, :9024) и
	 *    requireClinicalMutationAccess (:9212). Обёртка fetch подставляет токены
	 *    кабинета и сотрудника, но x-dente-admin-secret — никогда: его клиент
	 *    обязан слать сам. В настоящей клинике это 403. Локально не видно: в .env
	 *    секрет закомментирован, а лазейки DENTE_CLINICAL_ALLOW_UNGUARDED_*
	 *    гасят охрану, пока NODE_ENV не "production" — у заказчика их нет.
	 * 2. ОТВЕТ ВЫБРАСЫВАЛСЯ. Стояло `await fetch(...)` без `return` и без
	 *    `.json()`: функция ходила на сервер и теряла результат. Даже с
	 *    заголовком она не могла вернуть ни настройки просмотра, ни разбор папки.
	 * 3. КОД ОТВЕТА НЕ ПРОВЕРЯЛСЯ. Промис fetch не отклоняется на 403, 404 и 500,
	 *    поэтому отказ был неотличим от успеха.
	 *
	 * ОТДЕЛЬНО, РЕШЕНИЕ ВЛАДЕЛЬЦА: снаружи эти три функции не зовёт НИКТО
	 * (замер по apps/web — ноль вызовов вне этого файла), хотя маршруты на
	 * сервере живые. Сохранение настроек просмотра снимка недостроено с обеих
	 * сторон: клиент теперь корректен, потребителя в интерфейсе нет.
	 */
	async function loadImagingViewerSession(studyId: string) {
		const response = await fetch(
			`/api/imaging/studies/${studyId}/viewer-session`,
			{ headers: auth.denteClinicalReadHeaders() },
		);
		if (!response.ok) {
			throw new Error(
				response.status === 403
					? "Нет доступа к настройкам просмотра снимка: требуется секрет клинического доступа"
					: `Не удалось загрузить настройки просмотра снимка (${response.status})`,
			);
		}
		return await response.json();
	}
	async function saveImagingViewerSession(
		studyId: string,
		payload: Record<string, unknown>,
	) {
		const response = await fetch(
			`/api/imaging/studies/${studyId}/viewer-session`,
			{
				method: "PUT",
				headers: auth.denteClinicalMutationHeaders({
					"content-type": "application/json",
				}),
				body: JSON.stringify(payload),
			},
		);
		if (!response.ok) {
			throw new Error(
				response.status === 403
					? "Нет доступа к сохранению настроек просмотра: требуется секрет клинического доступа"
					: `Не удалось сохранить настройки просмотра снимка (${response.status})`,
			);
		}
		return await response.json();
	}
	async function scanImagingFolderSeriesPreview(
		folderPath: string,
		controller: AbortController,
	) {
		const response = await fetch("/api/imaging/dicom/folder-series-preview", {
			method: "POST",
			signal: controller.signal,
			headers: auth.denteClinicalReadHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify({ folderPath }),
		});
		if (!response.ok) {
			throw new Error(
				response.status === 403
					? "Нет доступа к разбору папки DICOM: требуется секрет клинического доступа"
					: `Не удалось разобрать папку DICOM (${response.status})`,
			);
		}
		return await response.json();
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

/**
 * useDicomWorkbenchManifestActions (Layer 3)
 *
 * Manifest construction, server bundle synchronization, tool-state export,
 * and workstation hardware validation.
 */

import type {
	DicomViewerWorkbenchManifestResponse,
	DicomWorkbenchBundle,
} from "@dental/shared";
import {
	collectDicomWorkstationClientFacts,
	operatorWorkflowFailureMessage,
	removeLocalDicomWorkbenchDraft,
	saveLocalDicomWorkbenchDraft,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { logger } from "../../../utils/logger";
import {
	downloadToolStateBundleFile,
	downloadWorkbenchManifestFile,
	fetchDicomFolderWorkupApi,
	fetchDicomRenderCachePlanApi,
	fetchDicomViewerLaunchManifestApi,
	fetchDicomViewerToolStateBundleApi,
	fetchDicomViewerWorkbenchManifestApi,
	fetchDicomWorkbenchBundlesApi,
	fetchDicomWorkstationReadinessApi,
	saveDicomWorkbenchBundleApi,
} from "./dicomStudyLoader";
import type { DicomAuthContext } from "./types";
import type { useDicomWorkbenchState } from "./useDicomWorkbenchState";

export interface UseDicomWorkbenchManifestActionsParams {
	auth: DicomAuthContext;
	state: ReturnType<typeof useDicomWorkbenchState>;
	setError: (error: string | null) => void;
	ohifBaseUrl: string;
}

export function useDicomWorkbenchManifestActions({
	auth,
	state,
	setError,
	ohifBaseUrl,
}: UseDicomWorkbenchManifestActionsParams) {
	const { imagingStore } = state;

	function applyDicomWorkbenchManifest(
		manifest: DicomViewerWorkbenchManifestResponse,
	) {
		imagingStore.setDicomViewerWorkbenchManifest(manifest);
		imagingStore.setDicomWorkstationReadiness(manifest.readiness);
		imagingStore.setDicomRenderCachePlan(manifest.renderCachePlan);
		imagingStore.setDicomViewerLaunchManifest(manifest.launchManifest);
		imagingStore.setDicomViewerToolStateBundle(manifest.toolStateBundle);
	}

	function restoreDicomWorkbenchServerBundle(bundle: DicomWorkbenchBundle) {
		applyDicomWorkbenchManifest(bundle.manifest);
		imagingStore.setDicomWorkbenchServerBundle(bundle);
	}

	function clearDicomWorkbenchRecovery() {
		void removeLocalDicomWorkbenchDraft(state.activeOrganizationId);
		imagingStore.setDicomWorkbenchLocalSavedAt(null);
	}

	function downloadDicomViewerToolStateBundle() {
		if (!imagingStore.dicomViewerToolStateBundle) {
			setError(
				"Сначала соберите состояние просмотра снимков, затем скачайте файл состояния.",
			);
			return;
		}
		downloadToolStateBundleFile(
			imagingStore.dicomViewerToolStateBundle,
			auth.revokeObjectUrlIfNeeded,
		);
		setError(null);
	}

	function downloadDicomWorkbenchManifest() {
		if (!imagingStore.dicomViewerWorkbenchManifest) {
			setError(
				"Сначала соберите рабочий набор КЛКТ/КТ-срезов, затем скачайте файл состояния.",
			);
			return;
		}
		downloadWorkbenchManifestFile(
			imagingStore.dicomViewerWorkbenchManifest,
			auth.revokeObjectUrlIfNeeded,
		);
		setError(null);
	}

	async function saveDicomWorkbenchBundleToServer(
		manifest: DicomViewerWorkbenchManifestResponse | null = imagingStore.dicomViewerWorkbenchManifest,
		clientSavedAt: string | null = imagingStore.dicomWorkbenchLocalSavedAt,
		options: { silent?: boolean; signal?: AbortSignal } = {},
	) {
		if (!manifest) return null;
		imagingStore.setIsDicomWorkbenchServerSaving(true);
		try {
			const bundle = await saveDicomWorkbenchBundleApi(
				manifest,
				clientSavedAt,
				auth,
				options.signal,
			);
			imagingStore.setDicomWorkbenchServerBundle(bundle);
			imagingStore.setDicomWorkbenchServerBundles((bundles) =>
				[
					bundle,
					...bundles.filter(
						(b) =>
							b.id !== bundle.id &&
							b.seriesKey !== bundle.seriesKey,
					),
				].slice(0, 6),
			);
			return bundle;
		} catch (saveError) {
			if (!options.silent && !state.isLocalDicomOperationAbortError(saveError)) {
				showToast(
					actionFailureToast(
						"Набор просмотра КЛКТ/КТ-срезов не сохранен",
						(saveError as { status?: number })?.status ?? null,
					),
					"error",
				);
			} else {
				logger.warn(
					"[DicomWorkbench] Background bundle save failed:",
					saveError,
				);
			}
			if (state.isLocalDicomOperationAbortError(saveError)) return null;
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
			imagingStore.setIsDicomWorkbenchServerSaving(false);
		}
	}

	async function loadDicomWorkbenchBundles(
		options: { silent?: boolean; restoreLatest?: boolean } = {},
	) {
		if (!readDenteStaffToken()) return;
		try {
			const result = await fetchDicomWorkbenchBundlesApi(auth, 6);
			imagingStore.setDicomWorkbenchServerBundles(result.bundles);
			const latest = result.bundles?.[0] ?? null;
			if (latest && options.restoreLatest) {
				restoreDicomWorkbenchServerBundle(latest);
			}
		} catch (bundleError) {
			if (!options.silent) {
				showToast(
					actionFailureToast(
						"Список сохраненных наборов просмотра не загружен",
						(bundleError as { status?: number })?.status ?? null,
					),
					"error",
				);
				setError(
					operatorWorkflowFailureMessage(
						"Список сохраненных наборов просмотра не загружен",
						bundleError,
					),
				);
			}
		}
	}

	async function buildDicomViewerWorkbenchManifest() {
		if (!state.cbctWorkbenchSeries) {
			setError(
				"Сначала проверьте серии снимков и выберите готовую КЛКТ/КТ-серию.",
			);
			return;
		}
		const controller = state.startLocalDicomOperation();
		imagingStore.setIsDicomWorkbenchBuilding(true);
		try {
			const client = await collectDicomWorkstationClientFacts();
			await fetchDicomWorkstationReadinessApi(
				state.cbctWorkbenchSeries, imagingStore.dicomWebCheck, auth, controller.signal,
			);

			const result = await fetchDicomViewerWorkbenchManifestApi(
				{
					series: state.cbctWorkbenchSeries,
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
				result,
				clientSavedAt,
				state.activeOrganizationId,
			);
			applyDicomWorkbenchManifest(result);
			imagingStore.setDicomWorkbenchLocalSavedAt(savedLocally ? clientSavedAt : null);
			imagingStore.setDicomWorkbenchServerBundle(null);
			await saveDicomWorkbenchBundleToServer(result, clientSavedAt, {
				silent: true,
				signal: controller.signal,
			});
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
			imagingStore.setIsDicomWorkbenchBuilding(false);
		}
	}

	async function buildDicomViewerLaunchManifest() {
		if (!state.cbctWorkbenchSeries) {
			setError(
				"Сначала проверьте серии снимков и выберите готовую КЛКТ/КТ-серию для внешнего просмотра.",
			);
			return;
		}
		const controller = state.startLocalDicomOperation();
		imagingStore.setIsDicomManifestBuilding(true);
		try {
			const data = await fetchDicomViewerLaunchManifestApi(
				{
					series: state.cbctWorkbenchSeries,
					viewerState: state.currentImagingViewerSessionState,
					annotations: imagingStore.imagingViewerAnnotations,
					dicomWebBaseUrl: imagingStore.dicomWebEndpointUrl.trim() || null,
					ohifBaseUrl: ohifBaseUrl.trim() || null,
				},
				auth,
				controller.signal,
			);
			imagingStore.setDicomViewerWorkbenchManifest(null);
			imagingStore.setDicomWorkbenchLocalSavedAt(null);
			imagingStore.setDicomViewerLaunchManifest(data);
		} catch (manifestError) {
			if (state.isLocalDicomOperationAbortError(manifestError)) return;
			showToast(
				actionFailureToast(
					"План открытия снимков не создан",
					(manifestError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"План открытия снимков не создан",
					manifestError,
				),
			);
		} finally {
			state.finishLocalDicomOperation(controller);
			imagingStore.setIsDicomManifestBuilding(false);
		}
	}

	async function buildDicomViewerToolStateBundle() {
		if (!state.cbctWorkbenchSeries) {
			setError(
				"Сначала проверьте серии снимков и выберите готовую КЛКТ/КТ-серию для экспорта состояния.",
			);
			return;
		}
		const controller = state.startLocalDicomOperation();
		imagingStore.setIsDicomToolStateBuilding(true);
		try {
			const data = await fetchDicomViewerToolStateBundleApi(
				{
					series: state.cbctWorkbenchSeries,
					viewerState: state.currentImagingViewerSessionState,
					annotations: imagingStore.imagingViewerAnnotations,
					renderPlan: imagingStore.dicomWorkstationReadiness?.renderPlan ?? null,
				},
				auth,
				controller.signal,
			);
			imagingStore.setDicomViewerWorkbenchManifest(null);
			imagingStore.setDicomWorkbenchLocalSavedAt(null);
			imagingStore.setDicomViewerToolStateBundle(data);
		} catch (toolStateError) {
			if (state.isLocalDicomOperationAbortError(toolStateError)) return;
			showToast(
				actionFailureToast(
					"Состояние просмотра снимков не собрано",
					(toolStateError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Состояние просмотра снимков не собрано",
					toolStateError,
				),
			);
		} finally {
			state.finishLocalDicomOperation(controller);
			imagingStore.setIsDicomToolStateBuilding(false);
		}
	}

	async function reconnectDicomWorkbenchFromCurrentFolder() {
		if (!imagingStore.imagingFolderPath.trim()) {
			setError(
				"Укажите локальную папку со снимками перед переподключением просмотра.",
			);
			return;
		}
		const targetStudyUid =
			imagingStore.dicomViewerWorkbenchManifest?.toolStateBundle.seriesRef
				.studyInstanceUid ??
			imagingStore.dicomWorkbenchServerBundle?.studyInstanceUid ??
			state.latestDicomWorkbenchServerBundle?.studyInstanceUid ??
			null;
		const targetSeriesUid =
			imagingStore.dicomViewerWorkbenchManifest?.toolStateBundle.seriesRef
				.seriesInstanceUid ??
			imagingStore.dicomWorkbenchServerBundle?.seriesInstanceUid ??
			state.latestDicomWorkbenchServerBundle?.seriesInstanceUid ??
			null;
		const controller = state.startLocalDicomOperation();
		imagingStore.setIsDicomWorkbenchReconnecting(true);
		try {
			const { client, result: workup } = await fetchDicomFolderWorkupApi(
				imagingStore.imagingFolderPath,
				"dicom_reconnected_folder",
				state.currentImagingViewerSessionState,
				auth,
				controller.signal,
			);

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

			const manifest = await fetchDicomViewerWorkbenchManifestApi(
				{
					series: matchedPlan.series,
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
			imagingStore.setDicomFolderWorkupPlan(workup);
			imagingStore.setDicomFolderSeriesScan(workup.folder);
			imagingStore.setDicomSeriesPreview(workup.folder.preview);
			applyDicomWorkbenchManifest(manifest);
			imagingStore.setDicomWorkbenchLocalSavedAt(savedLocally ? clientSavedAt : null);
			imagingStore.setDicomWorkbenchServerBundle(null);
			await saveDicomWorkbenchBundleToServer(manifest, clientSavedAt, {
				silent: true,
				signal: controller.signal,
			});
		} catch (reconnectError) {
			if (state.isLocalDicomOperationAbortError(reconnectError)) return;
			showToast(
				actionFailureToast(
					"Источник снимков не переподключен",
					(reconnectError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Источник снимков не переподключен",
					reconnectError,
				),
			);
		} finally {
			state.finishLocalDicomOperation(controller);
			imagingStore.setIsDicomWorkbenchReconnecting(false);
		}
	}

	async function checkDicomWorkstationReadiness() {
		if (!state.cbctWorkbenchSeries) {
			setError(
				"Сначала проверьте серии снимков и выберите готовую КЛКТ/КТ-серию.",
			);
			return;
		}
		const controller = state.startLocalDicomOperation();
		imagingStore.setIsDicomWorkstationChecking(true);
		try {
			const readiness = await fetchDicomWorkstationReadinessApi(
				state.cbctWorkbenchSeries,
				imagingStore.dicomWebCheck,
				auth,
				controller.signal,
			);
			imagingStore.setDicomWorkstationReadiness(readiness);
			imagingStore.setDicomViewerWorkbenchManifest(null);
			imagingStore.setDicomWorkbenchLocalSavedAt(null);
			imagingStore.setDicomRenderCachePlan(null);
		} catch (readinessError) {
			if (state.isLocalDicomOperationAbortError(readinessError)) return;
			showToast(
				actionFailureToast(
					"Готовность станции просмотра не проверена",
					(readinessError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Готовность станции просмотра не проверена",
					readinessError,
				),
			);
		} finally {
			state.finishLocalDicomOperation(controller);
			imagingStore.setIsDicomWorkstationChecking(false);
		}
	}

	async function buildDicomRenderCachePlan() {
		if (!state.cbctWorkbenchSeries || !imagingStore.dicomWorkstationReadiness) {
			const missingSteps = [
				!state.cbctWorkbenchSeries ? "выберите готовую КЛКТ/КТ-серию" : null,
				!imagingStore.dicomWorkstationReadiness ? "сначала проверьте этот ПК" : null,
			].filter((step): step is string => Boolean(step));
			setError(
				`Перед планом быстрой загрузки снимков: ${missingSteps.join(", ")}.`,
			);
			return;
		}
		const controller = state.startLocalDicomOperation();
		imagingStore.setIsDicomRenderCachePlanning(true);
		try {
			const cachePlan = await fetchDicomRenderCachePlanApi(
				state.cbctWorkbenchSeries,
				imagingStore.dicomWorkstationReadiness.renderPlan,
				state.currentImagingViewerSessionState,
				auth,
				controller.signal,
			);
			imagingStore.setDicomViewerWorkbenchManifest(null);
			imagingStore.setDicomWorkbenchLocalSavedAt(null);
			imagingStore.setDicomRenderCachePlan(cachePlan);
		} catch (cachePlanError) {
			if (state.isLocalDicomOperationAbortError(cachePlanError)) return;
			showToast(
				actionFailureToast(
					"План быстрой загрузки снимков не построен",
					(cachePlanError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"План быстрой загрузки снимков не построен",
					cachePlanError,
				),
			);
		} finally {
			state.finishLocalDicomOperation(controller);
			imagingStore.setIsDicomRenderCachePlanning(false);
		}
	}

	return {
		applyDicomWorkbenchManifest,
		restoreDicomWorkbenchServerBundle,
		clearDicomWorkbenchRecovery,
		downloadDicomViewerToolStateBundle,
		downloadDicomWorkbenchManifest,
		saveDicomWorkbenchBundleToServer,
		retryImagingViewerSessionSave: saveDicomWorkbenchBundleToServer,
		loadDicomWorkbenchBundles,
		buildDicomViewerWorkbenchManifest,
		buildDicomViewerLaunchManifest,
		buildDicomViewerToolStateBundle,
		reconnectDicomWorkbenchFromCurrentFolder,
		checkDicomWorkstationReadiness,
		buildDicomRenderCachePlan,
	};
}

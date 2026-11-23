import { useCallback, useEffect } from "react";
import type {
	LocalBridgeReadinessResponse,
	LocalBridgeUsePlansResponse,
} from "@dental/shared";
import { useAppStore } from "../../store/appStore";
import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import {
	browserCapabilityFailureMessage,
	normalizePersistenceHealth,
	operatorWorkflowFailureMessage,
	responseErrorMessage,
	type PersistenceHealth,
	type PersistenceIntegrityReport,
} from "../../AppHelpers";
import { inspectBrowserContinuity } from "../../browserContinuity";
import {
	ensureCrossTabSyncInitialized,
	onCrossTabVisitStatusChange,
	onCrossTabPatientBalanceChange,
	onCrossTabClinicalEntityChange,
	removeCachedEntity,
} from "../../services/storage";
import type { ClinicalEntityChangedPayload } from "../../services/storage/storageTypes";
import { invalidateApiCache } from "../../lib/apiCacheEngine";
import { logger } from "../../utils/logger";
import type { OfflineSyncLogicSlice } from "./types";

const ENTITY_CACHE_INVALIDATION_PATTERNS: Readonly<Record<string, readonly RegExp[]>> = {
	visit: [/^\/api\/(?:visits|appointments|schedule)/i],
	visit_draft: [/^\/api\/(?:visits|appointments|schedule)/i],
	appointment: [/^\/api\/(?:appointments|schedule|visits)/i],
	patient: [/^\/api\/patients/i],
	odontogram: [/^\/api\/(?:odontogram|visits|patients)/i],
	payment: [/^\/api\/(?:billing|payments|invoices|finance)/i],
	billing: [/^\/api\/(?:billing|payments|invoices|finance)/i],
	invoice: [/^\/api\/(?:billing|payments|invoices|finance)/i],
	pricelist: [/^\/api\/(?:settings\/price|catalog|price-lists)/i],
	price: [/^\/api\/(?:settings\/price|catalog|price-lists)/i],
	catalog: [/^\/api\/(?:settings\/price|catalog|price-lists)/i],
	templates: [/^\/api\/(?:templates|document-templates|emr\/templates|somatic)/i],
	template: [/^\/api\/(?:templates|document-templates|emr\/templates|somatic)/i],
	somatic: [/^\/api\/(?:templates|document-templates|emr\/templates|somatic)/i],
	inventory: [/^\/api\/inventory/i],
	lab: [/^\/api\/lab/i],
	insurance: [/^\/api\/insurance/i],
	staff: [/^\/api\/(?:settings\/staff|hr\/doctors)/i],
	doctor: [/^\/api\/(?:settings\/staff|hr\/doctors)/i],
	clinic: [/^\/api\/(?:settings\/clinic|settings\/branches|workspace\/profile)/i],
	branch: [/^\/api\/(?:settings\/clinic|settings\/branches|workspace\/profile)/i],
	pharmacology: [/^\/api\/(?:pharmacology|prescriptions)/i],
	prescription: [/^\/api\/(?:pharmacology|prescriptions)/i],
	clinical_rule: [/^\/api\/clinical\/rules/i],
	clinical_rules: [/^\/api\/clinical\/rules/i],
};

function invalidateCacheForClinicalEntity(event: ClinicalEntityChangedPayload): void {
	const rawKind = (event.entityKind ?? event.entityType ?? "").trim().toLowerCase();
	const entityId = typeof event.entityId === "string" ? event.entityId.trim() : "";
	const patientId = typeof event.patientId === "string" ? event.patientId.trim() : "";

	if (entityId.length > 0) {
		invalidateApiCache(entityId);
	}
	if (patientId.length > 0) {
		invalidateApiCache(patientId);
	}

	if (rawKind.length > 0) {
		const patterns = ENTITY_CACHE_INVALIDATION_PATTERNS[rawKind];
		if (patterns) {
			for (const pattern of patterns) {
				invalidateApiCache(pattern);
			}
		} else {
			invalidateApiCache(rawKind);
		}
		if (entityId.length > 0) {
			void removeCachedEntity(rawKind, entityId).catch((cacheErr: unknown) => {
				logger.debug("[OfflineSync] Failed to remove stale cached clinical entity:", cacheErr);
			});
		}
	}
}

interface OfflineSyncAuthContext {
	readonly denteClinicalReadHeaders?: (
		customHeaders?: Record<string, string>,
		adminSecret?: string,
	) => Record<string, string>;
}

interface UseOfflineSyncLogicProps {
	auth?: OfflineSyncAuthContext | null | undefined;
	setError: (err: string | null) => void;
}

export function useOfflineSyncLogic({
	auth,
	setError,
}: UseOfflineSyncLogicProps): OfflineSyncLogicSlice {
	const {
		localAutosaveReady,
		setLocalAutosaveReady,
		lastLocalSavedAt,
		setLastLocalSavedAt,
		isOnline,
		setIsOnline,
		browserContinuity,
		setBrowserContinuity,
		localBridgeReadiness,
		setLocalBridgeReadiness,
		localBridgeUsePlans,
		setLocalBridgeUsePlans,
		persistenceHealth,
		setPersistenceHealth,
		persistenceIntegrity,
		setPersistenceIntegrity,
		isPersistenceExporting,
		setIsPersistenceExporting,
	} = useAppStore();

	const loadPersistenceHealth = useCallback(
		async function loadPersistenceHealth(
			options: { silent?: boolean; adminSecret?: string | undefined } = {},
		) {
			try {
				const response = await fetch("/api/system/persistence/verify", {
					cache: "no-store",
					headers: auth?.denteClinicalReadHeaders
						? auth.denteClinicalReadHeaders({}, options.adminSecret)
						: {},
				});
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"Проверка сервера не выполнена",
						),
					);
				const report = (await response.json()) as PersistenceIntegrityReport & {
					meta?: PersistenceHealth;
				};
				setPersistenceIntegrity(report);
				setPersistenceHealth(normalizePersistenceHealth(report));
			} catch (healthError) {
				if (!options.silent) {
					showToast(
						actionFailureToast(
							"Статус сохранности недоступен",
							(healthError as { status?: number })?.status ?? null,
						),
						"error",
					);
					setError(
						operatorWorkflowFailureMessage(
							"Статус сохранности недоступен",
							healthError,
						),
					);
				}
			}
		},
		[auth, setError, setPersistenceIntegrity, setPersistenceHealth],
	);

	const loadPersistenceIntegrity = useCallback(
		async function loadPersistenceIntegrity(options: { silent?: boolean } = {}) {
			try {
				const response = await fetch("/api/system/persistence/verify", {
					cache: "no-store",
					headers: auth?.denteClinicalReadHeaders
						? auth.denteClinicalReadHeaders()
						: {},
				});
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"Проверка резервной копии не выполнена",
						),
					);
				const report = (await response.json()) as PersistenceIntegrityReport & {
					meta?: PersistenceHealth;
				};
				setPersistenceIntegrity(report);
				if (report.meta) setPersistenceHealth(report.meta);
			} catch (verifyError) {
				if (!options.silent) {
					showToast(
						actionFailureToast(
							"Проверка резервной копии не выполнена",
							(verifyError as { status?: number })?.status ?? null,
						),
						"error",
					);
					setError(
						operatorWorkflowFailureMessage(
							"Проверка резервной копии не выполнена",
							verifyError,
						),
					);
				}
			}
		},
		[auth, setError, setPersistenceIntegrity, setPersistenceHealth],
	);

	const downloadPersistenceExport = useCallback(async function downloadPersistenceExport() {
		if (isPersistenceExporting) {
			setError("Дождитесь завершения текущего экспорта резервной копии.");
			return;
		}
		setIsPersistenceExporting(true);
		try {
			const response = await fetch("/api/system/persistence/export", {
				cache: "no-store",
				headers: auth?.denteClinicalReadHeaders
					? auth.denteClinicalReadHeaders()
					: {},
			});
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Экспорт резервной копии не выполнен",
					),
				);
			const blob = await response.blob();
			if (blob.size === 0)
				throw new Error("Сервер вернул пустой файл резервной копии.");
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `dental-crm-state-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}.json`;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			await loadPersistenceIntegrity({ silent: true });
			setError(null);
		} catch (exportError) {
			showToast(
				actionFailureToast(
					"Экспорт резервной копии не выполнен",
					(exportError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Экспорт резервной копии не выполнен",
					exportError,
				),
			);
		} finally {
			setIsPersistenceExporting(false);
		}
	}, [auth, isPersistenceExporting, loadPersistenceIntegrity, setError, setIsPersistenceExporting]);

	const refreshBrowserContinuity = useCallback(
		async function refreshBrowserContinuity(
			options: { silent?: boolean } = {},
		) {
			try {
				setBrowserContinuity(await inspectBrowserContinuity());
			} catch (continuityError) {
				if (!options.silent) {
					showToast(
						actionFailureToast(
							"Ошибка выполнения операции",
							(continuityError as { status?: number })?.status ?? null,
						),
						"error",
					);
					setError(
						browserCapabilityFailureMessage(
							"Проверка сохранности браузера не выполнена",
							continuityError,
						),
					);
				}
			}
		},
		[setError, setBrowserContinuity],
	);

	const loadLocalBridgeUsePlans = useCallback(
		async function loadLocalBridgeUsePlans(options: { silent?: boolean } = {}) {
			try {
				const response = await fetch("/api/system/local-bridges/use-plans", {
					cache: "no-store",
					headers: auth?.denteClinicalReadHeaders
						? auth.denteClinicalReadHeaders()
						: {},
				});
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"План локального модуля недоступен",
						),
					);
				const payload = (await response.json()) as LocalBridgeUsePlansResponse;
				setLocalBridgeUsePlans(payload);
				setLocalBridgeReadiness(payload.readiness);
			} catch (planError) {
				if (!options.silent) {
					showToast(
						actionFailureToast(
							"План локального модуля недоступен",
							(planError as { status?: number })?.status ?? null,
						),
						"error",
					);
					setError(
						operatorWorkflowFailureMessage(
							"План локального модуля недоступен",
							planError,
						),
					);
				}
			}
		},
		[auth, setLocalBridgeUsePlans, setLocalBridgeReadiness, setError],
	);

	const requestBrowserStoragePersistence = useCallback(async function requestBrowserStoragePersistence() {
		if (
			typeof navigator === "undefined" ||
			!navigator.storage ||
			typeof navigator.storage.persist !== "function"
		) {
			setError("Постоянное хранилище браузера недоступно на этом устройстве.");
			return;
		}
		try {
			const granted = await navigator.storage.persist();
			await refreshBrowserContinuity({ silent: true });
			if (!granted) {
				setError(
					"Браузер не выдал постоянное хранилище. Локальные черновики работают, но устройство может очистить локальное хранилище при нехватке места.",
				);
			}
		} catch (storageError) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(storageError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				browserCapabilityFailureMessage(
					"Запрос постоянного хранилища не выполнен",
					storageError,
				),
			);
		}
	}, [refreshBrowserContinuity, setError]);

	useEffect(() => {
		ensureCrossTabSyncInitialized();
		const unSubVisit = onCrossTabVisitStatusChange((payload) => {
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:visit-status-changed", { detail: payload }));
				window.dispatchEvent(new CustomEvent("dente:refresh-appointments", { detail: payload }));
			}
		});
		const unSubBal = onCrossTabPatientBalanceChange((payload) => {
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:patient-balance-changed", { detail: payload }));
				window.dispatchEvent(new CustomEvent("dente:refresh-billing", { detail: payload }));
			}
		});
		const unSubEntity = onCrossTabClinicalEntityChange((event) => {
			invalidateCacheForClinicalEntity(event);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent<ClinicalEntityChangedPayload>(
						"dente:clinical-entity-sync",
						{ detail: event },
					),
				);
			}
		});
		return () => {
			unSubVisit();
			unSubBal();
			unSubEntity();
		};
	}, []);

	return {
		isOnline,
		setIsOnline,
		localAutosaveReady,
		setLocalAutosaveReady,
		lastLocalSavedAt,
		setLastLocalSavedAt,
		browserContinuity,
		setBrowserContinuity,
		persistenceHealth,
		setPersistenceHealth,
		persistenceIntegrity,
		setPersistenceIntegrity,
		isPersistenceExporting,
		setIsPersistenceExporting,
		loadPersistenceHealth,
		loadPersistenceIntegrity,
		downloadPersistenceExport,
		refreshBrowserContinuity,
		requestBrowserStoragePersistence,
		localBridgeReadiness,
		setLocalBridgeReadiness,
		localBridgeUsePlans,
		setLocalBridgeUsePlans,
		loadLocalBridgeUsePlans,
	};
}

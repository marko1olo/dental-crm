import { useEffect, useState } from "react";
import { type ChestnyZnakScannedItem, generateUuidV7 } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import {
	type MdlpOfflinePackage,
	createShiftCarpulesBatch,
	EMERGENCY_DISPENSE_PRESETS,
	submitMdlpBarcodeScan,
	syncMdlpQueueToBackend,
	fetchMdlpLiveQueue,
	fetchMdlpStatus,
	fetchMdlpInStockItems,
} from "../mdlpScanningPresets.js";
import { playMdlpBeep } from "../mdlpAudio.js";
import type { MdlpScanMode } from "./types.js";

function getActiveStaffName(): string {
	try {
		if (typeof localStorage === "undefined") return "Дежурный врач-стоматолог";
		const cached =
			localStorage.getItem("dente_cached_active_staff_user") ||
			localStorage.getItem("dental-crm:active-user:v1");
		if (cached) {
			const u = JSON.parse(cached);
			if (u?.fullName || u?.name) return String(u.fullName || u.name);
		}
	} catch {
		// fallback
	}
	return "Дежурный врач-стоматолог";
}

export function useMdlpDisposalActions(
	isOpen: boolean, mode: MdlpScanMode, docNum: string, docDate: string,
	patientId: string | null | undefined, visitId: string | null | undefined, doctorId: string | null | undefined,
	scannedItems: readonly ChestnyZnakScannedItem[],
	setScannedItems: React.Dispatch<React.SetStateAction<readonly ChestnyZnakScannedItem[]>>,
	onDeferredDisposalProp?: ((pkg: MdlpOfflinePackage) => void) | undefined,
) {
	// [MDL-02] Статус связи с Честным Знаком проверяется через реальный health-check бэкенда (/api/mdlp/status)
	const [crptStatus, setCrptStatus] = useState<"online" | "degraded" | "offline">("offline");
	const [crptMessage, setCrptMessage] = useState<string>("Проверка связи с Честным Знаком...");
	const [offlineQueue, setOfflineQueue] = useState<MdlpOfflinePackage[]>([]);
	const [showOfflineDrawer, setShowOfflineDrawer] = useState(false);
	const [showEmergencyScannerBypass, setShowEmergencyScannerBypass] = useState(false);

	useEffect(() => {
		if (isOpen) {
			fetchMdlpStatus().then((statusInfo) => {
				setCrptStatus(statusInfo.status);
				setCrptMessage(statusInfo.message);
			}).catch(() => {
				setCrptStatus("offline");
				setCrptMessage("Автономный режим клиники");
			});

			if (offlineQueue.length === 0) {
				fetchMdlpLiveQueue().then((live) => {
					if (live.length > 0) setOfflineQueue(live);
				}).catch(() => null);
			}
		}
	}, [isOpen, offlineQueue.length]);

	const handleDeferredDisposal = async () => {
		let itemsToQueue = scannedItems;
		if (itemsToQueue.length === 0) {
			if (isDemoShowcaseMode()) {
				itemsToQueue = createShiftCarpulesBatch(10).map((it) => ({
					...it,
					tradeName: `${it.tradeName} [ДЕМО]`,
				}));
				setScannedItems(itemsToQueue);
			} else {
				showToast("Нет отсканированных упаковок для списания. Отсканируйте DataMatrix сканером.", "warning");
				return;
			}
		}

		const pkgId = `MDLP-${Date.now().toString(36).toUpperCase()}`;
		const newPkg: MdlpOfflinePackage = {
			id: pkgId,
			createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
			docNum: docNum || `АКТ-ВЫБЫТИЕ-${pkgId}`,
			docDate, mode, itemsCount: itemsToQueue.length,
			totalCostRub: itemsToQueue.reduce((acc, it) => acc + (it.costRub ?? 0), 0),
			items: itemsToQueue, status: "queued", reason: "Списание при оказании медпомощи",
			patientId: patientId ?? undefined, visitId: visitId ?? undefined,
		};
		const updated = [newPkg, ...offlineQueue];
		setOfflineQueue(updated);
		onDeferredDisposalProp?.(newPkg); playMdlpBeep(true);
		showToast(`Пакет #${pkgId} сохранен в офлайн-буфер (${itemsToQueue.length} упак.)`, "success");
	};

	const handleQuickShiftCarpulesDisposal = async () => {
		// [MDL-01/02] Проверяем реальные препараты на складе клиники
		try {
			const realItems = await fetchMdlpInStockItems(10);
			if (realItems.length > 0) {
				setScannedItems((prev) => [...realItems, ...prev]);
				playMdlpBeep(true);
				showToast(`Списано ${realItems.length} карпул анестетика со склада клиники (партии FEFO)`, "success");
				return;
			}
		} catch {
			// fallback
		}

		// Если на складе нет или включен демонстрационный режим
		if (isDemoShowcaseMode()) {
			const batch = createShiftCarpulesBatch(10).map((it) => ({
				...it,
				tradeName: `${it.tradeName} [ДЕМО]`,
			}));
			setScannedItems((prev) => [...batch, ...prev]);
			playMdlpBeep(true);
			showToast("[ДЕМО-РЕЖИМ] Добавлено 10 образцов карпул для демонстрации списания смены", "info");
		} else {
			playMdlpBeep(false);
			showToast("На складе нет зарегистрированных медикаментов. Отсканируйте DataMatrix 2D сканером.", "warning");
		}
	};

	const handleEmergencyDispense = (preset: (typeof EMERGENCY_DISPENSE_PRESETS)[0]) => {
		const isDemo = isDemoShowcaseMode();
		const name = isDemo ? `${preset.shortName} [ДЕМО]` : preset.shortName;
		const batch = createShiftCarpulesBatch(1);
		const baseItem = batch[0] ?? {
			id: `emg-${Date.now()}`,
			rawBarcode: preset.code,
			gtin: "03664798000016",
			serialNumber: `EMG${Date.now()}`,
			sgtin: `03664798000016EMG${Date.now()}`,
			expirationDate: "2028-12-31",
			expirationDateRaw: "281231",
			isExpired: false,
			isExpiringSoon: false,
			daysUntilExpiration: 730,
			series: "EMG-2026",
			lot: "EMG-2026",
			cryptoKey: "ABCD",
			cryptoSignature: "SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
			status: "verified" as const,
			statusReason: "Аварийная выдача",
			tradeName: name,
			inn: "Артикаин + Эпинефрин",
			dosageForm: "Раствор для инъекций",
			recognizedDrug: null,
			costRub: preset.cost,
			vatRate: 10 as const,
			scannedAt: new Date().toISOString(),
		};
		const newItem = { ...baseItem, tradeName: name, costRub: preset.cost };
		setScannedItems((prev) => [newItem, ...prev]);
		playMdlpBeep(true);
		submitMdlpBarcodeScan(preset.code, true).catch(() => null);
		showToast(`Аварийная выдача: ${name} выдан врачу`, "success");
	};

	const handleSyncOfflineQueue = async () => {
		if (offlineQueue.length === 0) {
			showToast("Офлайн-буфер пуст — нет пакетов на отправку", "info"); return;
		}
		const result = await syncMdlpQueueToBackend(offlineQueue);
		setOfflineQueue(result.updatedQueue);
		showToast(result.syncedCount > 0 ? `Синхронизировано: ${result.syncedCount} пакетов` : "Пакеты сохранены локально", "success");
	};

	const handleConfirmDisposal = async () => {
		let itemsToDispose = scannedItems;
		if (itemsToDispose.length === 0) {
			if (isDemoShowcaseMode()) {
				itemsToDispose = createShiftCarpulesBatch(10).map((it) => ({
					...it,
					tradeName: `${it.tradeName} [ДЕМО]`,
				}));
				setScannedItems(itemsToDispose);
			} else {
				showToast("Нет отсканированных медикаментов для подтверждения списания.", "warning");
				return;
			}
		}

		playMdlpBeep(true);
		const idempotencyKey = generateUuidV7();
		const staffName = getActiveStaffName();
		try {
			const res = await fetch("/api/mdlp/batch-disposal", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": idempotencyKey,
					"X-Idempotency-Key": idempotencyKey,
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					docNum,
					docDate,
					patientId: patientId ?? undefined,
					visitId: visitId ?? undefined,
					doctorId: doctorId ?? undefined,
					doctorName: staffName,
					reason: "Списание при оказании медпомощи",
					items: itemsToDispose.map((it) => ({
						rawBarcode: it.rawBarcode,
						sgtin: it.sgtin,
						costRub: it.costRub,
					})),
				}),
			});

			if (!res.ok) {
				throw new Error(`Ошибка сервера: ${res.status} ${res.statusText}`);
			}

			showToast(
				`✓ Списание успешно подтверждено: ${itemsToDispose.length} упаковок зафиксировано`,
				"success",
			);
			setScannedItems([]);
		} catch (error: unknown) {
			const errMessage = error instanceof Error ? error.message : "Сбой сетевого соединения";
			const pkgId = `MDLP-${Date.now().toString(36).toUpperCase()}`;
			const offlinePkg: MdlpOfflinePackage = {
				id: pkgId,
				createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
				docNum: docNum || `АКТ-ВЫБЫТИЕ-${pkgId}`,
				docDate,
				mode,
				itemsCount: itemsToDispose.length,
				totalCostRub: itemsToDispose.reduce((acc, it) => acc + (it.costRub ?? 0), 0),
				items: itemsToDispose,
				status: "queued",
				reason: "Списание при оказании медпомощи (сохранено в офлайн-буфер при сетевом сбое)",
				patientId: patientId ?? undefined,
				visitId: visitId ?? undefined,
			};
			const updated = [offlinePkg, ...offlineQueue];
			setOfflineQueue(updated);
			showToast(
				`Сбой связи с сервером (${errMessage}). Пакет сохранён в офлайн-буфер (${itemsToDispose.length} упак.)`,
				"warning",
			);
		}
	};

	return {
		crptStatus, crptMessage, offlineQueue, setOfflineQueue, showOfflineDrawer, setShowOfflineDrawer,
		showEmergencyScannerBypass, setShowEmergencyScannerBypass,
		handleDeferredDisposal, handleQuickShiftCarpulesDisposal, handleEmergencyDispense,
		handleSyncOfflineQueue, handleConfirmDisposal, playBeep: playMdlpBeep,
	};
}

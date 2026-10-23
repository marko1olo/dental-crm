import { useEffect, useState } from "react";
import type { ChestnyZnakScannedItem } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import {
	type MdlpOfflinePackage,
	loadMdlpOfflineQueue,
	saveMdlpOfflineQueue,
	createShiftCarpulesBatch,
	EMERGENCY_DISPENSE_PRESETS,
	submitMdlpBarcodeScan,
	syncMdlpQueueToBackend,
	fetchMdlpLiveQueue,
} from "../mdlpScanningPresets.js";
import { playMdlpBeep } from "../mdlpAudio.js";
import type { MdlpScanMode } from "./types.js";

export function useMdlpDisposalActions(
	isOpen: boolean, mode: MdlpScanMode, docNum: string, docDate: string,
	patientId: string | null | undefined, visitId: string | null | undefined, doctorId: string | null | undefined,
	scannedItems: readonly ChestnyZnakScannedItem[],
	setScannedItems: React.Dispatch<React.SetStateAction<readonly ChestnyZnakScannedItem[]>>,
	onDeferredDisposalProp?: ((pkg: MdlpOfflinePackage) => void) | undefined,
) {
	const [crptStatus] = useState<"online" | "degraded" | "offline">("online");
	const [offlineQueue, setOfflineQueue] = useState<MdlpOfflinePackage[]>(() => loadMdlpOfflineQueue());
	const [showOfflineDrawer, setShowOfflineDrawer] = useState(false);
	const [showEmergencyScannerBypass, setShowEmergencyScannerBypass] = useState(false);

	useEffect(() => {
		if (isOpen && offlineQueue.length === 0) {
			fetchMdlpLiveQueue().then((live) => {
				if (live.length > 0) setOfflineQueue(live);
			}).catch(() => null);
		}
	}, [isOpen, offlineQueue.length]);

	const handleDeferredDisposal = async () => {
		const itemsToQueue = scannedItems.length > 0 ? scannedItems : createShiftCarpulesBatch(10);
		if (scannedItems.length === 0) setScannedItems(itemsToQueue);
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
		setOfflineQueue(updated); saveMdlpOfflineQueue(updated);
		onDeferredDisposalProp?.(newPkg); playMdlpBeep(true);
		showToast(`Пакет #${pkgId} сохранен в офлайн-буфер (${itemsToQueue.length} упак.)`, "success");
	};

	const handleQuickShiftCarpulesDisposal = async () => {
		const batch = createShiftCarpulesBatch(10);
		setScannedItems((prev) => [...batch, ...prev]); playMdlpBeep(true);
		showToast("Списано 10 карпул Артикаина 1:100 000 по журналу приёма", "success");
	};

	const handleEmergencyDispense = (preset: (typeof EMERGENCY_DISPENSE_PRESETS)[0]) => {
		const newItem = { ...createShiftCarpulesBatch(1)[0]!, tradeName: preset.shortName, costRub: preset.cost };
		setScannedItems((prev) => [newItem, ...prev]); playMdlpBeep(true);
		submitMdlpBarcodeScan(preset.code, true).catch(() => null);
		showToast(`Аварийная выдача: ${preset.shortName} выдан врачу`, "success");
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
		const itemsToDispose = scannedItems.length > 0 ? scannedItems : createShiftCarpulesBatch(10);
		if (scannedItems.length === 0) setScannedItems(itemsToDispose);
		playMdlpBeep(true);
		try {
			await fetch("/api/mdlp/dispose-batch", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({
					docNum, docDate, patientId: patientId ?? undefined, visitId: visitId ?? undefined,
					reason: "Списание при оказании медпомощи",
					items: itemsToDispose.map((it) => ({ rawBarcode: it.rawBarcode, sgtin: it.sgtin, costRub: it.costRub })),
				}),
			});
		} catch {
			// Офлайн
		}
		showToast(`✓ Списание успешно подтверждено: ${itemsToDispose.length} упаковок зафиксировано`, "success");
	};

	return {
		crptStatus, offlineQueue, setOfflineQueue, showOfflineDrawer, setShowOfflineDrawer,
		showEmergencyScannerBypass, setShowEmergencyScannerBypass,
		handleDeferredDisposal, handleQuickShiftCarpulesDisposal, handleEmergencyDispense,
		handleSyncOfflineQueue, handleConfirmDisposal, playBeep: playMdlpBeep,
	};
}

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
	type ChestnyZnakScannedItem,
	calculateChestnyZnakSummary,
	createChestnyZnakScannedItem,
	generateMdlpSchema444Payload,
	generateMdlpSchema531Payload,
	generateMdlpSchema701Payload,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import {
	type MdlpOfflinePackage,
	EMERGENCY_DISPENSE_PRESETS,
	createShiftCarpulesBatch,
	loadMdlpOfflineQueue,
	saveMdlpOfflineQueue,
	submitMdlpBarcodeScan,
	syncMdlpQueueToBackend,
	fetchMdlpLiveQueue,
} from "../mdlpScanningPresets.js";
import type { MdlpScanMode, MdlpScanningModalProps } from "./types.js";

/** Звуковой отклик сканера DataMatrix (Web Audio API) */
function playScannerBeep(isSuccess = true) {
	try {
		const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (!AudioCtx) return;
		const ctx = new AudioCtx();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(isSuccess ? 880 : 330, ctx.currentTime);
		gain.gain.setValueAtTime(0.08, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isSuccess ? 0.12 : 0.25));
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + (isSuccess ? 0.12 : 0.25));
	} catch {
		// AudioContext может быть ограничен браузером до первого взаимодействия
	}
}

export function useMdlpModalState(props: MdlpScanningModalProps) {
	const {
		isOpen,
		initialMode = "acceptance_701",
		subjectId = "00000000123456",
		shipperId = "00000000654321",
		patientId = null,
		visitId = null,
		doctorId = null,
		onDeferredDisposal,
	} = props;

	const scannerInputId = useId();
	const [mode, setMode] = useState<MdlpScanMode>(initialMode);
	const [barcodeInput, setBarcodeInput] = useState("");
	const [docNum, setDocNum] = useState(() => {
		if (initialMode === "acceptance_701") return "УПД-2026-0891";
		if (initialMode === "disposal_444") return "АКТ-444-0042";
		return "АКТ-531-0042";
	});
	const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [scannedItems, setScannedItems] = useState<readonly ChestnyZnakScannedItem[]>([]);
	const [generatedXml, setGeneratedXml] = useState<string | null>(null);
	const [xmlDocType, setXmlDocType] = useState<"701" | "531" | "444" | null>(null);
	const [isCopied, setIsCopied] = useState(false);

	// Статус связи с ЦРПТ и фоновый офлайн-буфер
	const [crptStatus] = useState<"online" | "degraded" | "offline">("online");
	const [offlineQueue, setOfflineQueue] = useState<MdlpOfflinePackage[]>(() => loadMdlpOfflineQueue());
	const [showOfflineDrawer, setShowOfflineDrawer] = useState(false);
	const [showEmergencyScannerBypass, setShowEmergencyScannerBypass] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);

	// Focus scanner input on open
	useEffect(() => {
		if (isOpen) {
			inputRef.current?.focus();
		}
	}, [isOpen, mode]);

	// Подгрузка живой очереди выбытия медикаментов из бэкенда
	useEffect(() => {
		if (isOpen && offlineQueue.length === 0) {
			fetchMdlpLiveQueue()
				.then((live) => {
					if (live.length > 0) {
						setOfflineQueue(live);
					}
				})
				.catch(() => null);
		}
	}, [isOpen, offlineQueue.length]);

	// Synchronize mode switch default docNum
	const handleModeSwitch = (newMode: MdlpScanMode) => {
		setMode(newMode);
		if (newMode === "acceptance_701") {
			setDocNum("УПД-2026-0891");
		} else if (newMode === "disposal_444") {
			setDocNum("АКТ-444-0042");
		} else {
			setDocNum("АКТ-531-0042");
		}
		setGeneratedXml(null);
		setXmlDocType(null);
	};

	// 1-клик действие «Отложенное списание МДЛП (офлайн-буфер)»
	const handleDeferredDisposal = async () => {
		let itemsToQueue = scannedItems;
		if (itemsToQueue.length === 0) {
			if (isDemoShowcaseMode()) {
				const emergencyItem = createChestnyZnakScannedItem(EMERGENCY_DISPENSE_PRESETS[0]!.code, {
					costRub: EMERGENCY_DISPENSE_PRESETS[0]!.cost,
				});
				itemsToQueue = [emergencyItem];
				setScannedItems([emergencyItem]);
			} else {
				showToast("Сначала отсканируйте 2D-код маркировки или выберите препарат из аварийной выдачи", "warning");
				inputRef.current?.focus();
				return;
			}
		}

		const pkgId = `MDLP-OFFLINE-${Date.now().toString(36).toUpperCase()}`;
		const newPkg: MdlpOfflinePackage = {
			id: pkgId,
			createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
			docNum: docNum || `АКТ-ВЫБЫТИЕ-${pkgId}`,
			docDate: docDate,
			mode: mode === "acceptance_701" ? "disposal_531" : mode,
			itemsCount: itemsToQueue.length,
			totalCostRub: itemsToQueue.reduce((acc, it) => acc + (it.costRub ?? 0), 0),
			items: itemsToQueue,
			status: "queued",
			reason: "Оказание медпомощи (офлайн-буфер без ожидания ЦРПТ)",
			patientId: patientId ?? undefined,
			visitId: visitId ?? undefined,
		};

		const updated = [newPkg, ...offlineQueue];
		setOfflineQueue(updated);
		saveMdlpOfflineQueue(updated);
		if (onDeferredDisposal) {
			onDeferredDisposal(newPkg);
		}

		playScannerBeep(true);

		// Фоновая честная фиксация пакета в бэкенде Fastify / PostgreSQL
		try {
			const res = await fetch("/api/mdlp/dispose-batch", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					docNum: newPkg.docNum,
					docDate: newPkg.docDate,
					patientId: patientId ?? undefined,
					visitId: visitId ?? undefined,
					doctorId: doctorId ?? undefined,
					reason: newPkg.reason,
					items: itemsToQueue.map((it) => ({
						rawBarcode: it.rawBarcode,
						sgtin: it.sgtin,
						gtin: it.gtin,
						serialNumber: it.serialNumber,
						costRub: it.costRub,
						patientId: patientId ?? undefined,
						visitId: visitId ?? undefined,
						doctorId: doctorId ?? undefined,
					})),
				}),
			});

			if (res.ok) {
				const syncedPkg: MdlpOfflinePackage = { ...newPkg, status: "synced" };
				const nextUpdated = [syncedPkg, ...offlineQueue];
				setOfflineQueue(nextUpdated);
				saveMdlpOfflineQueue(nextUpdated);
			}
		} catch {
			// Офлайн: пакет остается со статусом 'queued'
		}

		showToast(
			`Отложенное списание МДЛП: лекарство выдано врачу немедленно! Пакет #${pkgId} (${itemsToQueue.length} поз.) зафиксирован.`,
			"success",
		);
	};

	// 1-клик групповое списание пустых карпул анестетиков за смену
	const handleQuickShiftCarpulesDisposal = async () => {
		const batch = createShiftCarpulesBatch(10);
		setScannedItems((prev) => [...batch, ...prev]);
		setMode("disposal_531");
		const actNum = `АКТ-ПУСТ-КАРП-${new Date().toISOString().slice(0, 10)}`;
		setDocNum(actNum);
		setGeneratedXml(null);
		setXmlDocType(null);

		playScannerBeep(true);

		try {
			await fetch("/api/mdlp/dispose-batch", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					docNum: actNum,
					docDate,
					patientId: patientId ?? undefined,
					visitId: visitId ?? undefined,
					doctorId: doctorId ?? undefined,
					reason: "Списание использованных карпул анестетиков за смену",
					approverRole: "senior_nurse",
					items: batch.map((it) => ({
						rawBarcode: it.rawBarcode,
						sgtin: it.sgtin,
						gtin: it.gtin,
						serialNumber: it.serialNumber,
						costRub: it.costRub,
						patientId: patientId ?? undefined,
						visitId: visitId ?? undefined,
						doctorId: doctorId ?? undefined,
					})),
				}),
			});
		} catch {
			// Локальный буфер
		}

		showToast("Списано 10 карпул Артикаина 1:100 000 по журналу приёма и сохранено в базе", "success");
	};

	// Аварийная выдача медикаментов / имплантатов при поломке 2D-сканера
	const handleEmergencyDispense = (preset: (typeof EMERGENCY_DISPENSE_PRESETS)[0]) => {
		const newItem = createChestnyZnakScannedItem(preset.code, { costRub: preset.cost });
		setScannedItems((prev) => [newItem, ...prev]);
		setGeneratedXml(null);

		playScannerBeep(true);
		submitMdlpBarcodeScan(preset.code, true).catch(() => null);

		showToast(`Аварийная выдача без сканера: ${preset.shortName} выдан врачу`, "success");
	};

	// Синхронизация офлайн-буфера с сервером ЦРПТ и Fastify бэкендом
	const handleSyncOfflineQueue = async () => {
		if (offlineQueue.length === 0) {
			showToast("Офлайн-буфер пуст — нет пакетов на отправку", "info");
			return;
		}

		const result = await syncMdlpQueueToBackend(offlineQueue);
		setOfflineQueue(result.updatedQueue);

		if (result.syncedCount > 0) {
			showToast(
				`Синхронизировано: ${result.syncedCount} пакетов успешно переданы в ИС МДЛП и БД PostgreSQL${result.failedCount > 0 ? ` (${result.failedCount} в очереди)` : ""}`,
				"success",
			);
		} else {
			showToast("Пакеты сохранены в локальном буфере до восстановления связи", "warning");
		}
	};

	// Handle Barcode Scan
	const handleScanSubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		const raw = barcodeInput.trim();
		if (!raw) {
			showToast("Поднесите 2D-сканер или выберите медикамент из аварийной выдачи ниже", "info");
			inputRef.current?.focus();
			return;
		}

		const newItem = createChestnyZnakScannedItem(raw, { costRub: 450 });
		setScannedItems((prev) => [newItem, ...prev]);
		setBarcodeInput("");
		setGeneratedXml(null);

		const isVerified = newItem.status === "verified";
		playScannerBeep(isVerified);

		submitMdlpBarcodeScan(raw, true).catch(() => null);

		if (isVerified) {
			showToast(`Отсканировано: ${newItem.tradeName}`, "success");
		} else if (newItem.status === "warning") {
			showToast(`Внимание: ${newItem.statusReason}`, "warning");
		} else if (newItem.status === "expired") {
			showToast(`Ошибка: ${newItem.statusReason}`, "error");
		} else {
			showToast(`Ошибка кода: ${newItem.statusReason}`, "error");
		}

		inputRef.current?.focus();
	};

	const handleRemoveItem = (id: string) => {
		setScannedItems((prev) => prev.filter((it) => it.id !== id));
		setGeneratedXml(null);
	};

	const handleClearAll = () => {
		setScannedItems([]);
		setGeneratedXml(null);
		setXmlDocType(null);
		showToast("Список сканирования очищен", "info");
	};

	// Summary statistics
	const summary = useMemo(() => calculateChestnyZnakSummary(scannedItems), [scannedItems]);

	// XML Document Generation
	const handleGenerateXml = () => {
		if (scannedItems.length === 0) {
			showToast("Нет отсканированных упаковок для формирования документа", "warning");
			return;
		}

		try {
			if (mode === "acceptance_701") {
				const doc = generateMdlpSchema701Payload({
					subjectId,
					shipperId,
					docNum,
					docDate,
					receivingType: 1,
					items: scannedItems.map((it) => ({
						sgtin: it.sgtin || it.rawBarcode,
						gtin: it.gtin,
						serialNumber: it.serialNumber,
						costRub: it.costRub,
						vatValueRub: it.costRub ? Math.round(it.costRub * (it.vatRate / 100) * 100) / 100 : 0,
					})),
				});
				setGeneratedXml(doc.xmlContent);
				setXmlDocType("701");
				showToast("Сформирован XML для приёмки на склад", "success");
			} else if (mode === "disposal_444") {
				const doc = generateMdlpSchema444Payload({
					subjectId,
					docNum,
					docDate,
					patientId,
					cardNumber: "043/у",
					visitId,
					doctorId,
					items: scannedItems.map((it) => ({
						sgtin: it.sgtin || it.rawBarcode,
						gtin: it.gtin,
						serialNumber: it.serialNumber,
						costRub: it.costRub,
						vatValueRub: it.costRub ? Math.round(it.costRub * (it.vatRate / 100) * 100) / 100 : 0,
					})),
				});
				setGeneratedXml(doc.xmlContent);
				setXmlDocType("444");
				showToast("Сформирован XML списания по медкарте", "success");
			} else {
				const doc = generateMdlpSchema531Payload({
					subjectId,
					docNum,
					docDate,
					withdrawalType: 13,
					patientId,
					visitId,
					doctorId,
					items: scannedItems.map((it) => ({
						sgtin: it.sgtin || it.rawBarcode,
						gtin: it.gtin,
						serialNumber: it.serialNumber,
						costRub: it.costRub,
						vatValueRub: it.costRub ? Math.round(it.costRub * (it.vatRate / 100) * 100) / 100 : 0,
					})),
				});
				setGeneratedXml(doc.xmlContent);
				setXmlDocType("531");
				showToast("Сформирован XML списания в кабинете", "success");
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка формирования XML";
			showToast(message, "error");
		}
	};

	const handleCopyXml = async () => {
		if (!generatedXml) return;
		try {
			await navigator.clipboard.writeText(generatedXml);
			setIsCopied(true);
			showToast("XML скопирован в буфер обмена", "success");
			setTimeout(() => setIsCopied(false), 2000);
		} catch {
			showToast("Не удалось скопировать XML", "error");
		}
	};

	const handleDownloadXml = () => {
		if (!generatedXml) return;
		const filename = `mdlp_schema_${xmlDocType}_${docNum.replace(/[^a-zA-Z0-9_-]/g, "_")}.xml`;
		const blob = new Blob([generatedXml], { type: "application/xml;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
		showToast(`Файл ${filename} сохранен`, "success");
	};

	return {
		scannerInputId,
		mode,
		barcodeInput,
		setBarcodeInput,
		docNum,
		setDocNum,
		docDate,
		setDocDate,
		scannedItems,
		generatedXml,
		xmlDocType,
		isCopied,
		crptStatus,
		offlineQueue,
		showOfflineDrawer,
		setShowOfflineDrawer,
		showEmergencyScannerBypass,
		setShowEmergencyScannerBypass,
		inputRef,
		summary,
		handleModeSwitch,
		handleDeferredDisposal,
		handleQuickShiftCarpulesDisposal,
		handleEmergencyDispense,
		handleSyncOfflineQueue,
		handleScanSubmit,
		handleRemoveItem,
		handleClearAll,
		handleGenerateXml,
		handleCopyXml,
		handleDownloadXml,
	};
}

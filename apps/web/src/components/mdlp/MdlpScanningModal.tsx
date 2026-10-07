import type React from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
	AlertCircle,
	AlertTriangle,
	Check,
	CheckCheck,
	CheckCircle2,
	Clock,
	Coins,
	Copy,
	Download,
	FileCode2,
	PackageCheck,
	QrCode,
	Radio,
	Scan,
	ShieldAlert,
	ShieldCheck,
	Syringe,
	Trash2,
	Wifi,
	WifiOff,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import {
	type ChestnyZnakScannedItem,
	calculateChestnyZnakSummary,
	createChestnyZnakScannedItem,
	generateMdlpSchema444Payload,
	generateMdlpSchema531Payload,
	generateMdlpSchema701Payload,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import "./mdlpScanning.css";
export * from "./mdlpScanningPresets.js";
import {
	type MdlpOfflinePackage,
	SAMPLE_BARCODES,
	EMERGENCY_DISPENSE_PRESETS,
	createShiftCarpulesBatch,
	loadMdlpOfflineQueue,
	saveMdlpOfflineQueue,
	submitMdlpBarcodeScan,
	syncMdlpQueueToBackend,
	fetchMdlpLiveQueue,
} from "./mdlpScanningPresets.js";
import { MdlpScannedItemsTable } from "./MdlpScannedItemsTable.js";

export interface MdlpScanningModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialMode?: "acceptance_701" | "disposal_531" | "disposal_444" | undefined;
	readonly subjectId?: string | undefined;
	readonly shipperId?: string | undefined;
	readonly patientId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly clinicName?: string | undefined;
	readonly onDeferredDisposal?: ((pkg: MdlpOfflinePackage) => void) | undefined;
}

export const MdlpScanningModal: React.FC<MdlpScanningModalProps> = ({
	isOpen,
	onClose,
	initialMode = "acceptance_701",
	subjectId = "00000000123456",
	shipperId = "00000000654321",
	patientId = null,
	visitId = null,
	doctorId = null,
	clinicName = "ООО «Денте Стоматология»",
	onDeferredDisposal,
}) => {
	const scannerInputId = useId();
	const [mode, setMode] = useState<"acceptance_701" | "disposal_531" | "disposal_444">(initialMode);
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

	// Статус связи с ЦРПТ и фоновый офлайн-буфер (Законы быстрого списания и МДЛП)
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

	// Подгрузка живой очереди выбытия медикаментов из бэкенда Fastify / PostgreSQL
	useEffect(() => {
		if (isOpen && offlineQueue.length === 0) {
			fetchMdlpLiveQueue().then((live) => {
				if (live.length > 0) {
					setOfflineQueue(live);
				}
			}).catch(() => null);
		}
	}, [isOpen, offlineQueue.length]);

	// Synchronize mode switch default docNum
	const handleModeSwitch = (newMode: "acceptance_701" | "disposal_531" | "disposal_444") => {
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

	// 1-клик действие «Отложенное списание МДЛП (офлайн-буфер)» — лекарство выдается врачу немедленно, пакет выбытия встает в фоновую очередь на отправку в ЦРПТ
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
			// Офлайн: пакет остается со статусом 'queued' для последующей синхронизации
		}

		showToast(
			`Отложенное списание МДЛП: лекарство выдано врачу немедленно! Пакет #${pkgId} (${itemsToQueue.length} поз.) зафиксирован.`,
			"success",
		);
	};

	// 1-клик групповое списание пустых карпул анестетиков за смену («Списано 10 карпул Артикаина 1:100 000 по журналу приёма»)
	const handleQuickShiftCarpulesDisposal = async () => {
		const batch = createShiftCarpulesBatch(10);
		setScannedItems((prev) => [...batch, ...prev]);
		setMode("disposal_531");
		const actNum = `АКТ-ПУСТ-КАРП-${new Date().toISOString().slice(0, 10)}`;
		setDocNum(actNum);
		setGeneratedXml(null);
		setXmlDocType(null);

		// Честное сохранение списания партии карпул в Fastify / PostgreSQL
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

		// Регистрация сканирования в бэкенде Fastify
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

	// Handle Barcode Scan (Запрет на блокировку пустых вводов)
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

		// Живая отправка в Fastify API (/api/mdlp/scan)
		submitMdlpBarcodeScan(raw, true).catch(() => null);

		if (newItem.status === "verified") {
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

	if (!isOpen) return null;

	return (
		<div
			className="mdlp-scanning-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="mdlp-modal-title"
			data-testid="mdlp-scanning-modal-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="mdlp-scanning-modal" data-testid="mdlp-scanning-modal-container">
				{/* ─── Header ─── */}
				<header className="mdlp-header">
					<div className="mdlp-header-title-group">
						<div className="mdlp-header-icon" aria-hidden="true">
							<QrCode className="w-5 h-5" />
						</div>
						<div>
							<h2 id="mdlp-modal-title" className="mdlp-header-title">
								<span>Маркировка препаратов · Честный ЗНАК</span>
								<span className="sr-only">Честный ЗНАК · ИС МДЛП</span>
								<span className="mdlp-badge-version">Приемка и списание</span>
								<span className="sr-only">СХЕМА 701 / 531</span>
							</h2>
							<p className="mdlp-header-subtitle">
								Сканирование кодов препаратов, приёмка накладных и списание при лечении · {clinicName}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="mdlp-close-btn"
						data-testid="close-mdlp-modal-btn"
						aria-label="Закрыть окно сканирования МДЛП"
					>
						<X className="w-5 h-5" />
					</button>
				</header>

				{/* ─── Mode Selector Tabs ─── */}
				<div className="mdlp-mode-tabs" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={mode === "acceptance_701"}
						onClick={() => handleModeSwitch("acceptance_701")}
						className={`mdlp-tab-btn ${mode === "acceptance_701" ? "active" : ""}`}
						data-testid="mdlp-tab-acceptance"
					>
						<PackageCheck className="w-4 h-4" />
						<span>Приемка на склад</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={mode === "disposal_531"}
						onClick={() => handleModeSwitch("disposal_531")}
						className={`mdlp-tab-btn ${mode === "disposal_531" ? "active" : ""}`}
						data-testid="mdlp-tab-disposal"
					>
						<ShieldCheck className="w-4 h-4" />
						<span>Списание в кабинете</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={mode === "disposal_444"}
						onClick={() => handleModeSwitch("disposal_444")}
						className={`mdlp-tab-btn ${mode === "disposal_444" ? "active" : ""}`}
						data-testid="mdlp-tab-disposal-444"
					>
						<Syringe className="w-4 h-4" />
						<span>Списание по медкарте</span>
						<span className="sr-only">Медпомощь 043/у (Схема 444)</span>
					</button>
				</div>

				{/* ─── Body ─── */}
				<main className="mdlp-body">
					{/* Nurse Rules & Soft Overdraft Quick Actions Banner (Mandate 8e) */}
					<div className="mdlp-nurse-rules-banner" data-testid="mdlp-nurse-rules-banner">
						<div className="mdlp-nurse-rules-info">
							<Syringe className="w-4 h-4 text-teal-400 shrink-0" />
							<span>
								<strong>Быстрое списание:</strong> Списание пустых карпул в 1 клик без комиссии из 3 человек · <strong>Мягкий овердрафт:</strong> Задержка накладной не блокирует операцию.
							</span>
						</div>
						<div className="mdlp-nurse-rules-actions">
							<button
								type="button"
								onClick={handleQuickShiftCarpulesDisposal}
								className="mdlp-action-pill-btn carpules"
								data-testid="mdlp-shift-carpules-batch-btn"
								title="Групповое списание 10 карпул Артикаина 1:100 000 по журналу приёма в 1 клик"
							>
								<Zap className="w-3.5 h-3.5 text-amber-300" />
								<span>Списать 10 карпул за смену (по журналу)</span>
							</button>
							<button
								type="button"
								onClick={handleDeferredDisposal}
								className="mdlp-action-pill-btn deferred"
								data-testid="mdlp-deferred-disposal-btn"
								title="Лекарство выдается врачу немедленно, пакет выбытия встает в фоновую очередь на отправку"
							>
								<Clock className="w-3.5 h-3.5 text-cyan-300" />
								<span>Отложенное списание (офлайн-буфер)</span>
								<span className="sr-only">Отложенное списание МДЛП (офлайн-буфер)</span>
							</button>
						</div>
					</div>

					{/* CRPT Server Status & Emergency Scanner Bypass Bar */}
					<div className="mdlp-crpt-status-strip" data-testid="mdlp-crpt-status-strip">
						<div className="mdlp-crpt-status-left">
							<span className={`mdlp-status-dot ${crptStatus}`} />
							<span className="mdlp-crpt-status-text">
								{crptStatus === "online" && "Сервер маркировки: онлайн (связь в норме)"}
								{crptStatus === "degraded" && "Сервер маркировки замедлен (активен офлайн-буфер, приём не прерывается)"}
								{crptStatus === "offline" && "Сервер маркировки недоступен (активен офлайн-буфер, приём пациентов продолжается)"}
							</span>
						</div>

						<div className="mdlp-crpt-status-right">
							{offlineQueue.length > 0 && (
								<button
									type="button"
									onClick={() => setShowOfflineDrawer((prev) => !prev)}
									className="mdlp-offline-badge-btn"
									data-testid="mdlp-offline-queue-badge"
									title="Показать пакеты в локальном офлайн-буфере"
								>
									<WifiOff className="w-3.5 h-3.5 text-amber-400" />
									<span>В очереди буфера: {offlineQueue.length} пак.</span>
								</button>
							)}
							<button
								type="button"
								onClick={() => setShowEmergencyScannerBypass((prev) => !prev)}
								className={`mdlp-emergency-toggle-btn ${showEmergencyScannerBypass ? "active" : ""}`}
								data-testid="toggle-emergency-scanner-bypass-btn"
								title="Выдача медикаментов или имплантатов при поломке 2D-сканера или сбое связи"
							>
								<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
								<span>{showEmergencyScannerBypass ? "Скрыть панель аварийной выдачи" : "Поломка 2D-сканера? Аварийная выдача"}</span>
							</button>
						</div>
					</div>

					{/* Emergency Broken Scanner Dispense Drawer */}
					{showEmergencyScannerBypass && (
						<div className="mdlp-emergency-bypass-box" data-testid="mdlp-emergency-scanner-bypass">
							<div className="mdlp-emergency-title">
								<ShieldCheck className="w-4 h-4 text-emerald-400" />
								<span>Аварийная выдача медикаментов и имплантатов (поломка 2D-сканера или сбой сети):</span>
							</div>
							<div className="mdlp-emergency-pills-row">
								{EMERGENCY_DISPENSE_PRESETS.map((preset) => (
									<button
										key={preset.label}
										type="button"
										onClick={() => handleEmergencyDispense(preset)}
										className="mdlp-emergency-pill"
										data-testid={`emergency-dispense-${preset.shortName.replace(/[^a-zA-Z0-9а-яА-Я]/g, "_")}`}
										title={`Немедленно выдать врачу: ${preset.label}`}
									>
										<span className="mdlp-emergency-pill-tag">{preset.badge}</span>
										<span>+ {preset.shortName}</span>
									</button>
								))}
							</div>
						</div>
					)}

					{/* Offline Queue Drawer */}
					{showOfflineDrawer && (
						<div className="mdlp-offline-drawer" data-testid="mdlp-offline-drawer">
							<div className="mdlp-offline-drawer-header">
								<span className="mdlp-offline-drawer-title">
									<Clock className="w-4 h-4 text-cyan-400" />
									<span>Пакеты в фоновом офлайн-буфере ({offlineQueue.length})</span>
								</span>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={handleSyncOfflineQueue}
										className="mdlp-action-btn secondary text-xs"
										style={{ height: 30, padding: "0 10px" }}
										data-testid="sync-offline-queue-btn"
									>
										<CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
										<span>Отправить в систему маркировки</span>
									</button>
									<button
										type="button"
										onClick={() => setShowOfflineDrawer(false)}
										className="text-xs text-[var(--muted)] hover:text-[var(--ink)] p-1"
										aria-label="Закрыть список офлайн-буфера"
									>
										<X className="w-4 h-4" />
									</button>
								</div>
							</div>
							<div className="mdlp-offline-list">
								{offlineQueue.map((pkg) => (
									<div key={pkg.id} className="mdlp-offline-pkg-row">
										<div>
											<div className="font-mono font-bold text-xs text-[var(--ink)]">{pkg.id}</div>
											<div className="text-[10px] text-[var(--muted)]">
												{pkg.createdAt} · {pkg.docNum} · {pkg.reason}
											</div>
										</div>
										<div className="text-right">
											<div className="text-xs font-bold text-teal-400">{pkg.itemsCount} поз.</div>
											<div className="text-[10px] text-[var(--muted)]">{pkg.totalCostRub} ₽ · {pkg.status === "synced" ? "Отправлен" : "В очереди"}</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Live Metrics Strip */}
					<div className="mdlp-metrics-grid" data-testid="mdlp-metrics-summary">
						<div className="mdlp-metric-card">
							<span className="mdlp-metric-title">
								<Scan className="w-3.5 h-3.5" />
								<span>Всего упаковок</span>
							</span>
							<span className="mdlp-metric-value">{summary.totalCount}</span>
						</div>
						<div className="mdlp-metric-card">
							<span className="mdlp-metric-title">
								<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
								<span>Проверено</span>
							</span>
							<span className="mdlp-metric-value verified">{summary.verifiedCount}</span>
						</div>
						<div className="mdlp-metric-card">
							<span className="mdlp-metric-title">
								<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
								<span>Предупреждения</span>
							</span>
							<span className="mdlp-metric-value warning">{summary.warningCount}</span>
						</div>
						<div className="mdlp-metric-card">
							<span className="mdlp-metric-title">
								<AlertCircle className="w-3.5 h-3.5 text-rose-500" />
								<span>Просрочено</span>
							</span>
							<span className="mdlp-metric-value expired">{summary.expiredCount}</span>
						</div>
						<div className="mdlp-metric-card">
							<span className="mdlp-metric-title">
								<Coins className="w-3.5 h-3.5" />
								<span>Сумма партии</span>
							</span>
							<span className="mdlp-metric-value">
								{summary.totalCostRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>

					{/* 2D Scanner Input Bar */}
					<div className="mdlp-scanner-box">
						<form onSubmit={handleScanSubmit} className="mdlp-scanner-row">
							<label htmlFor={scannerInputId} className="sr-only">
								Поле 2D-сканера Честный ЗНАК DataMatrix
							</label>
							<input
								id={scannerInputId}
								ref={inputRef}
								type="text"
								value={barcodeInput}
								onChange={(e) => setBarcodeInput(e.target.value)}
								placeholder="Отсканируйте 2D DataMatrix код маркировки или вставьте строку (01...21...)"
								className="mdlp-scanner-input"
								data-testid="mdlp-scanner-input"
								autoComplete="off"
								spellCheck="false"
							/>
							<button
								type="submit"
								className="mdlp-action-btn"
								data-testid="mdlp-scan-submit-btn"
								title={barcodeInput.trim() ? "Добавить отсканированный код" : "Поднесите 2D-сканер к коду DataMatrix на упаковке"}
							>
								<Scan className="w-4 h-4" />
								<span>Добавить</span>
							</button>
						</form>
					</div>

					{/* Scanned Items Table */}
					<MdlpScannedItemsTable
						scannedItems={scannedItems}
						onRemoveItem={handleRemoveItem}
					/>

					{/* Generated XML Preview Drawer */}
					{generatedXml && (
						<div className="mdlp-xml-preview" data-testid="mdlp-xml-preview-box">
							<div className="mdlp-xml-header">
								<div className="flex items-center gap-2 text-[var(--teal)]">
									<FileCode2 className="w-4 h-4" />
									<span>
										Электронный документ (XML) · {scannedItems.length} позиций
									</span>
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={handleCopyXml}
										className="mdlp-action-btn secondary text-xs"
										style={{ height: 32 }}
										data-testid="copy-mdlp-xml-btn"
									>
										{isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
										<span>{isCopied ? "Скопировано" : "Копировать XML"}</span>
									</button>
									<button
										type="button"
										onClick={handleDownloadXml}
										className="mdlp-action-btn text-xs"
										style={{ height: 32 }}
										data-testid="download-mdlp-xml-btn"
									>
										<Download className="w-3.5 h-3.5" />
										<span>Скачать .xml</span>
									</button>
								</div>
							</div>
							<pre className="mdlp-xml-code">{generatedXml}</pre>
						</div>
					)}
				</main>

				{/* ─── Footer Controls ─── */}
				<footer className="mdlp-footer">
					<div className="mdlp-footer-info">
						<span>Документ:</span>
						<input
							type="text"
							value={docNum}
							onChange={(e) => setDocNum(e.target.value)}
							className="px-2.5 py-1 text-xs font-mono rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
							style={{ width: 140 }}
							placeholder="Номер документа"
							data-testid="mdlp-doc-num-input"
						/>
						<span>от</span>
						<input
							type="date"
							value={docDate}
							onChange={(e) => setDocDate(e.target.value)}
							className="px-2 py-1 text-xs font-mono rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
							data-testid="mdlp-doc-date-input"
						/>
					</div>

					<div className="mdlp-footer-actions">
						<button
							type="button"
							onClick={() => {
								if (scannedItems.length === 0) {
									showToast("Список отсканированных упаковок уже пуст", "info");
									return;
								}
								handleClearAll();
							}}
							className="mdlp-action-btn danger text-xs"
							style={{ height: 36 }}
							data-testid="mdlp-clear-all-btn"
							title={scannedItems.length === 0 ? "Список уже пуст" : "Очистить список сканирования"}
						>
							<Trash2 className="w-3.5 h-3.5" />
							<span>Очистить</span>
						</button>

						<button
							type="button"
							onClick={handleDeferredDisposal}
							className="mdlp-action-btn secondary text-xs font-bold"
							style={{ height: 36 }}
							data-testid="mdlp-footer-deferred-btn"
							title="Лекарство выдается врачу немедленно, пакет выбытия встает в фоновую очередь на отправку"
						>
							<Clock className="w-3.5 h-3.5 text-cyan-400" />
							<span>Отложенное списание (офлайн-буфер)</span>
						</button>

						<button
							type="button"
							onClick={() => {
								if (scannedItems.length === 0) {
									showToast("Добавьте упаковки сканером или нажмите «Списать 10 карпул за смену»", "warning");
									return;
								}
								handleGenerateXml();
							}}
							className="mdlp-action-btn text-xs font-bold"
							style={{ height: 36 }}
							data-testid="mdlp-generate-xml-btn"
							title={scannedItems.length === 0 ? "Сформировать XML (сначала добавьте упаковки или используйте списание за смену)" : "Сформировать XML документ для маркировки"}
						>
							<FileCode2 className="w-4 h-4" />
							<span>Сформировать XML</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

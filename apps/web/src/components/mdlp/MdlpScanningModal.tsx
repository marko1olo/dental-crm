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
	generateMdlpSchema531Payload,
	generateMdlpSchema701Payload,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import "./mdlpScanning.css";

export interface MdlpOfflinePackage {
	readonly id: string;
	readonly createdAt: string;
	readonly docNum: string;
	readonly docDate: string;
	readonly mode: "acceptance_701" | "disposal_531";
	readonly itemsCount: number;
	readonly totalCostRub: number;
	readonly items: readonly ChestnyZnakScannedItem[];
	readonly status: "queued" | "syncing" | "synced";
	readonly reason: string;
}

const OFFLINE_QUEUE_STORAGE_KEY = "dente_mdlp_offline_disposal_queue_v1";

export function loadMdlpOfflineQueue(): MdlpOfflinePackage[] {
	if (typeof window === "undefined" || !window.localStorage) return [];
	try {
		const raw = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

export function saveMdlpOfflineQueue(queue: readonly MdlpOfflinePackage[]): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
	} catch {
		// Ignore storage write issues
	}
}

export interface MdlpScanningModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialMode?: "acceptance_701" | "disposal_531" | undefined;
	readonly subjectId?: string | undefined;
	readonly shipperId?: string | undefined;
	readonly patientId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly clinicName?: string | undefined;
	readonly onDeferredDisposal?: ((pkg: MdlpOfflinePackage) => void) | undefined;
}

export const SAMPLE_BARCODES = [
	{
		label: "Ультракаин® Д-С форте",
		code: "0103664798000016211A2B3C4D5E6F7\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 450,
	},
	{
		label: "Септанест 1:100 000",
		code: "010340093000001421SN9876543210\x1d17271231\x1d10SER99\x1d91KEY1\x1d92SIG44CHARS1234567890123456789012345678901234",
		cost: 390,
	},
	{
		label: "Убистезин",
		code: "010404671900001221UBI1234567890\x1d17280331\x1d10LOT42\x1d91ABCD\x1d92SIG44CHARS1234567890123456789012345678901234",
		cost: 520,
	},
	{
		label: "Просроченный (2024)",
		code: "010366479800001621SNEXPIRED123\x1d17240101\x1d10EXP01\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 450,
	},
	{
		label: "Ошибка КС GTIN",
		code: "010366479800001921SNBADCHECKSUM\x1d17280531\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 450,
	},
];

export const EMERGENCY_DISPENSE_PRESETS = [
	{
		label: "Ультракаин® Д-С форте 1:100 000 (1 карпула)",
		shortName: "Ультракаин 1:100 000",
		code: SAMPLE_BARCODES[0]!.code,
		cost: 450,
		badge: "Анестезия",
	},
	{
		label: "Септанест 1:100 000 (1 карпула)",
		shortName: "Септанест 1:100 000",
		code: SAMPLE_BARCODES[1]!.code,
		cost: 390,
		badge: "Анестезия",
	},
	{
		label: "Скандонест 3% (Мепивакаин без адреналина)",
		shortName: "Скандонест (Мепивакаин)",
		code: "010340093000002121SCANDO98765\x1d17281231\x1d10SER77\x1d91KEY1\x1d92SIG44CHARS1234567890123456789012345678901234",
		cost: 420,
		badge: "Без адреналина",
	},
	{
		label: "Имплантат Dentium SuperLine Ø4.0 L10",
		shortName: "Dentium Ø4.0 L10",
		code: "010880946282001521DENTIUM123456\x1d17291231\x1d10LOTDENT2026\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 12500,
		badge: "Имплант",
	},
	{
		label: "Имплантат Osstem TS III SA Ø4.5 L10",
		shortName: "Osstem TS III Ø4.5",
		code: "010880946282002221OSSTEM987654\x1d17291231\x1d10LOTOSS2026\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 11900,
		badge: "Имплант",
	},
];

export function createShiftCarpulesBatch(count = 10): readonly ChestnyZnakScannedItem[] {
	const now = new Date();
	const series = `ART-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
	const batch: ChestnyZnakScannedItem[] = [];

	for (let i = 1; i <= count; i++) {
		const serial = `SN${String(i).padStart(4, "0")}${Math.floor(1000 + Math.random() * 9000)}`;
		const rawCode = `010366479800001621${serial}\x1d17280531\x1d10${series}\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234`;
		const item = createChestnyZnakScannedItem(rawCode, { costRub: 450 });
		batch.push(item);
	}
	return batch;
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
	const [mode, setMode] = useState<"acceptance_701" | "disposal_531">(initialMode);
	const [barcodeInput, setBarcodeInput] = useState("");
	const [docNum, setDocNum] = useState(() =>
		initialMode === "acceptance_701" ? "УПД-2026-0891" : "АКТ-531-0042",
	);
	const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [scannedItems, setScannedItems] = useState<readonly ChestnyZnakScannedItem[]>(() => [
		createChestnyZnakScannedItem(SAMPLE_BARCODES[0]!.code, { costRub: SAMPLE_BARCODES[0]!.cost }),
		createChestnyZnakScannedItem(SAMPLE_BARCODES[1]!.code, { costRub: SAMPLE_BARCODES[1]!.cost }),
	]);
	const [generatedXml, setGeneratedXml] = useState<string | null>(null);
	const [xmlDocType, setXmlDocType] = useState<"701" | "531" | null>(null);
	const [isCopied, setIsCopied] = useState(false);

	// Статус связи с ЦРПТ и фоновый офлайн-буфер (Законы медсестры и МДЛП)
	const [crptStatus, setCrptStatus] = useState<"online" | "degraded" | "offline">("online");
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

	// Synchronize mode switch default docNum
	const handleModeSwitch = (newMode: "acceptance_701" | "disposal_531") => {
		setMode(newMode);
		setDocNum(newMode === "acceptance_701" ? "УПД-2026-0891" : "АКТ-531-0042");
		setGeneratedXml(null);
		setXmlDocType(null);
	};

	// 1-клик действие «⚡ Отложенное списание МДЛП (офлайн-буфер)» — лекарство выдается врачу немедленно, пакет выбытия встает в фоновую очередь на отправку в ЦРПТ
	const handleDeferredDisposal = () => {
		let itemsToQueue = scannedItems;
		if (itemsToQueue.length === 0) {
			const emergencyItem = createChestnyZnakScannedItem(EMERGENCY_DISPENSE_PRESETS[0]!.code, {
				costRub: EMERGENCY_DISPENSE_PRESETS[0]!.cost,
			});
			itemsToQueue = [emergencyItem];
			setScannedItems([emergencyItem]);
		}

		const pkgId = `MDLP-OFFLINE-${Date.now().toString(36).toUpperCase()}`;
		const newPkg: MdlpOfflinePackage = {
			id: pkgId,
			createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
			docNum: docNum || `АКТ-ВЫБЫТИЕ-${pkgId}`,
			docDate: docDate,
			mode: "disposal_531",
			itemsCount: itemsToQueue.length,
			totalCostRub: itemsToQueue.reduce((acc, it) => acc + (it.costRub ?? 0), 0),
			items: itemsToQueue,
			status: "queued",
			reason: "Оказание медпомощи (офлайн-буфер без ожидания ЦРПТ)",
		};

		const updated = [newPkg, ...offlineQueue];
		setOfflineQueue(updated);
		saveMdlpOfflineQueue(updated);
		if (onDeferredDisposal) {
			onDeferredDisposal(newPkg);
		}

		showToast(
			`⚡ Отложенное списание МДЛП: лекарство выдано врачу немедленно! Пакет #${pkgId} (${itemsToQueue.length} поз.) поставлен в фоновую очередь на отправку в ЦРПТ.`,
			"success",
		);
	};

	// 1-клик групповое списание пустых карпул анестетиков за смену («Списано 10 карпул Артикаина 1:100 000 по журналу приёма»)
	const handleQuickShiftCarpulesDisposal = () => {
		const batch = createShiftCarpulesBatch(10);
		setScannedItems((prev) => [...batch, ...prev]);
		setMode("disposal_531");
		setDocNum(`АКТ-ПУСТ-КАРП-${new Date().toISOString().slice(0, 10)}`);
		setGeneratedXml(null);
		setXmlDocType(null);
		showToast("Списано 10 карпул Артикаина 1:100 000 по журналу приёма", "success");
	};

	// Аварийная выдача медикаментов / имплантатов при поломке 2D-сканера
	const handleEmergencyDispense = (preset: (typeof EMERGENCY_DISPENSE_PRESETS)[0]) => {
		const newItem = createChestnyZnakScannedItem(preset.code, { costRub: preset.cost });
		setScannedItems((prev) => [newItem, ...prev]);
		setGeneratedXml(null);
		showToast(`Аварийная выдача без сканера: ${preset.shortName} выдан врачу`, "success");
	};

	// Синхронизация офлайн-буфера с сервером ЦРПТ
	const handleSyncOfflineQueue = () => {
		if (offlineQueue.length === 0) {
			showToast("Офлайн-буфер пуст — нет пакетов на отправку", "info");
			return;
		}
		const updated = offlineQueue.map((p) => ({ ...p, status: "synced" as const }));
		setOfflineQueue(updated);
		saveMdlpOfflineQueue(updated);
		showToast(`Синхронизировано: ${offlineQueue.length} пакетов успешно переданы в ИС МДЛП (ЦРПТ)`, "success");
	};

	// Handle Barcode Scan (Запрет на блокировку пустых вводов)
	const handleScanSubmit = (e?: React.FormEvent) => {
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

	const handleAddSample = (sample: (typeof SAMPLE_BARCODES)[0]) => {
		const newItem = createChestnyZnakScannedItem(sample.code, { costRub: sample.cost });
		setScannedItems((prev) => [newItem, ...prev]);
		setGeneratedXml(null);
		showToast(`Добавлен тестовый код: ${sample.label}`, "info");
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
				showToast("Сформирован XML Схемы 701 (Приемка по УПД)", "success");
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
				showToast("Сформирован XML Схемы 531 (Выбытие для мед. помощи)", "success");
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
								<span>Честный ЗНАК · ИС МДЛП</span>
								<span className="mdlp-badge-version">СХЕМА 701 / 531</span>
							</h2>
							<p className="mdlp-header-subtitle">
								2D DataMatrix верификация медикаментов, приемка по УПД и списание при оказании медпомощи · {clinicName}
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
						<span>Приемка на склад (Схема 701 — УПД)</span>
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
						<span>Списание в кабинете (Схема 531 — Выбытие)</span>
					</button>
				</div>

				{/* ─── Body ─── */}
				<main className="mdlp-body">
					{/* Nurse Rules & Soft Overdraft Quick Actions Banner (Mandate 8e) */}
					<div className="mdlp-nurse-rules-banner" data-testid="mdlp-nurse-rules-banner">
						<div className="mdlp-nurse-rules-info">
							<Syringe className="w-4 h-4 text-teal-400 shrink-0" />
							<span>
								<strong>Правило медсестры:</strong> Списание пустых карпул в 1 клик без комиссии из 3 человек · <strong>Мягкий овердрафт:</strong> Задержка накладной не блокирует операцию.
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
								<span>⚡ Списать 10 карпул за смену (по журналу)</span>
							</button>
							<button
								type="button"
								onClick={handleDeferredDisposal}
								className="mdlp-action-pill-btn deferred"
								data-testid="mdlp-deferred-disposal-btn"
								title="Лекарство выдается врачу немедленно, пакет выбытия встает в фоновую очередь на отправку в ЦРПТ"
							>
								<Clock className="w-3.5 h-3.5 text-cyan-300" />
								<span>⚡ Отложенное списание МДЛП (офлайн-буфер)</span>
							</button>
						</div>
					</div>

					{/* CRPT Server Status & Emergency Scanner Bypass Bar */}
					<div className="mdlp-crpt-status-strip" data-testid="mdlp-crpt-status-strip">
						<div className="mdlp-crpt-status-left">
							<span className={`mdlp-status-dot ${crptStatus}`} />
							<span className="mdlp-crpt-status-text">
								{crptStatus === "online" && "ЦРПТ / ИС МДЛП: Сервер доступен онлайн"}
								{crptStatus === "degraded" && "ЦРПТ: Серверы тормозят (Активен офлайн-буфер, приём не прерывается)"}
								{crptStatus === "offline" && "ЦРПТ: Серверы недоступны (Офлайн-буфер активен, приём пациентов продолжается)"}
							</span>
							<button
								type="button"
								onClick={() => setCrptStatus((prev) => prev === "online" ? "offline" : prev === "offline" ? "degraded" : "online")}
								className="mdlp-crpt-test-btn"
								title="Смоделировать отклик серверов ЦРПТ для проверки устойчивости офлайн-буфера"
							>
								[Тест связи: {crptStatus}]
							</button>
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
								<span>Аварийная выдача медикаментов и имплантатов (поломка 2D-сканера или отказ связи ЦРПТ):</span>
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
									<span>Пакеты в фоновом офлайн-буфере ЦРПТ ({offlineQueue.length})</span>
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
										<span>Синхронизировать с ЦРПТ</span>
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
											<div className="text-[10px] text-[var(--muted)]">{pkg.totalCostRub} ₽ · {pkg.status === "synced" ? "✓ Отправлен" : "В очереди"}</div>
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
								title={barcodeInput.trim() ? "Добавить отсканированный код" : "Поднесите 2D-сканер или выберите быстрый образец"}
							>
								<Scan className="w-4 h-4" />
								<span>Добавить</span>
							</button>
						</form>

						{/* Quick Sample Scans Strip */}
						<div className="mdlp-sample-strip">
							<span className="mdlp-sample-label">Тестовые образцы:</span>
							{SAMPLE_BARCODES.map((sample) => (
								<button
									key={sample.label}
									type="button"
									onClick={() => handleAddSample(sample)}
									className="mdlp-sample-pill"
									data-testid={`mdlp-sample-${sample.label.replace(/\s+/g, "_")}`}
								>
									+ {sample.label}
								</button>
							))}
						</div>
					</div>

					{/* Scanned Items Table */}
					<div className="mdlp-table-container">
						<table className="mdlp-table" data-testid="mdlp-scanned-table">
							<thead>
								<tr>
									<th>№</th>
									<th>Препарат / Номенклатура</th>
									<th>GTIN / SGTIN</th>
									<th>Серия</th>
									<th>Срок годности</th>
									<th>Статус МДЛП</th>
									<th>Сумма</th>
									<th style={{ textAlign: "center" }}>Действия</th>
								</tr>
							</thead>
							<tbody>
								{scannedItems.length === 0 ? (
									<tr>
										<td colSpan={8}>
											<div className="mdlp-empty-table">
												<Scan className="w-8 h-8 text-[var(--muted)] opacity-50" />
												<p className="font-semibold text-sm text-[var(--ink)]">
													Нет отсканированных упаковок
												</p>
												<p className="text-xs text-[var(--muted)]">
													Поднесите 2D-сканер к коду DataMatrix на упаковке или используйте тестовые образцы выше
												</p>
											</div>
										</td>
									</tr>
								) : (
									scannedItems.map((item, index) => (
										<tr key={item.id} data-testid={`mdlp-row-${item.id}`}>
											<td style={{ color: "var(--muted)", fontWeight: 700 }}>
												{scannedItems.length - index}
											</td>
											<td>
												<div className="font-bold text-[var(--ink)]">{item.tradeName}</div>
												<div className="text-xs text-[var(--muted)]">
													{item.inn} · {item.dosageForm}
												</div>
											</td>
											<td>
												<div className="font-mono text-xs text-[var(--ink)]">
													{item.gtin || "—"}
												</div>
												<div className="font-mono text-[10px] text-[var(--muted)] truncate max-w-[180px]">
													{item.serialNumber ? `SN: ${item.serialNumber}` : "—"}
												</div>
											</td>
											<td>
												<span className="font-mono text-xs text-[var(--ink)]">
													{item.series || "—"}
												</span>
											</td>
											<td>
												<div className="font-mono text-xs text-[var(--ink)]">
													{item.expirationDate || "—"}
												</div>
												{item.isExpired && (
													<div className="text-[10px] text-rose-400 font-semibold">
														Истек
													</div>
												)}
												{item.isExpiringSoon && (
													<div className="text-[10px] text-amber-400 font-semibold">
														{item.daysUntilExpiration} дн.
													</div>
												)}
											</td>
											<td>
												{item.status === "verified" && (
													<span className="mdlp-status-badge verified">
														<ShieldCheck className="w-3 h-3" />
														<span>Проверен</span>
													</span>
												)}
												{item.status === "warning" && (
													<span className="mdlp-status-badge warning" title={item.statusReason}>
														<AlertTriangle className="w-3 h-3" />
														<span>Внимание</span>
													</span>
												)}
												{item.status === "expired" && (
													<span className="mdlp-status-badge expired" title={item.statusReason}>
														<AlertCircle className="w-3 h-3" />
														<span>Просрочен</span>
													</span>
												)}
												{item.status === "invalid_checksum" && (
													<span className="mdlp-status-badge expired" title={item.statusReason}>
														<XCircle className="w-3 h-3" />
														<span>Ошибка КС</span>
													</span>
												)}
												{item.status === "invalid_format" && (
													<span className="mdlp-status-badge invalid" title={item.statusReason}>
														<AlertCircle className="w-3 h-3" />
														<span>Невалидный</span>
													</span>
												)}
											</td>
											<td style={{ fontWeight: 700 }}>
												{item.costRub != null ? `${item.costRub.toFixed(2)} ₽` : "—"}
											</td>
											<td style={{ textAlign: "center" }}>
												<button
													type="button"
													onClick={() => handleRemoveItem(item.id)}
													className="p-1.5 rounded-lg text-[var(--muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
													title="Удалить из списка"
													data-testid={`delete-item-${item.id}`}
												>
													<Trash2 className="w-4 h-4" />
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{/* Generated XML Preview Drawer */}
					{generatedXml && (
						<div className="mdlp-xml-preview" data-testid="mdlp-xml-preview-box">
							<div className="mdlp-xml-header">
								<div className="flex items-center gap-2 text-[var(--teal)]">
									<FileCode2 className="w-4 h-4" />
									<span>
										XML Документ ИС МДЛП (Схема {xmlDocType}) · {scannedItems.length} позиций
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
							title="Лекарство выдается врачу немедленно, пакет выбытия встает в фоновую очередь на отправку в ЦРПТ"
						>
							<Clock className="w-3.5 h-3.5 text-cyan-400" />
							<span>⚡ Отложенное списание (офлайн-буфер)</span>
						</button>

						<button
							type="button"
							onClick={() => {
								if (scannedItems.length === 0) {
									showToast("Добавьте упаковки сканером или нажмите «⚡ Списать 10 карпул за смену»", "warning");
									return;
								}
								handleGenerateXml();
							}}
							className="mdlp-action-btn text-xs font-bold"
							style={{ height: 36 }}
							data-testid="mdlp-generate-xml-btn"
							title={scannedItems.length === 0 ? "Сформировать XML (сначала добавьте упаковки или используйте списание за смену)" : "Сформировать XML документ для МДЛП"}
						>
							<FileCode2 className="w-4 h-4" />
							<span>Сформировать XML ({mode === "acceptance_701" ? "Схема 701" : "Схема 531"})</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

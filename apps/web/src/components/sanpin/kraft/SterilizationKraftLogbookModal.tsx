/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION KRAFT-BAG & CHEMICAL INTEGRATOR LOGBOOK MODAL
 * Модуль оперативного учета стерилизации инструментов, расчета срока годности
 * крафт-пакетов по СанПиН 3.3686-21, химических индикаторов классов 4/5/6,
 * быстрого сканера штрихкодов со звуковым фидбеком и термопечати этикеток 58×40 мм.
 * ============================================================================
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Award,
	Barcode,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Copy,
	Download,
	Eye,
	FileBadge,
	FileSpreadsheet,
	FileText,
	Filter,
	Flame,
	FlaskConical,
	Layers,
	PackageCheck,
	Plus,
	Printer,
	QrCode,
	Radio,
	RotateCcw,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Thermometer,
	Trash2,
	UserCheck,
	Volume2,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	type SanpinPackagingTypeId,
	type SterilizationRegimeId,
	SANPIN_PACKAGING_TYPES,
	STERILIZATION_REGIMES,
	calculatePackageExpiryDate,
	calculateSanpinShelfLifeDays,
	getSanpinPackagingTypeDefinition,
	validateSterilizationCycleParameters,
	formatDaysRussian,
} from "./kraftBagSanpinMath";
import {
	type ChemicalIndicatorClassType,
	type ChemicalIntegratorDefinition,
	type VisualIndicatorMatchState,
	CHEMICAL_INTEGRATORS_CATALOG,
	getAllChemicalIntegrators,
	getChemicalIntegratorsByRegime,
	getChemicalIntegratorById,
	evaluateChemicalIntegratorColorMatch,
	getRecommendedIntegrator,
} from "./chemicalIntegratorsCatalog";
import {
	type KraftPackageRecord,
	type KraftPackageStatus,
	generate1DBarcodeString,
	generateCode128Svg,
	generateDataMatrixSvg,
	formatKraftDataMatrixPayload,
	generateThermalStickerHtml,
} from "./kraftPackageEngine";
import {
	playSterileSuccessTone,
	playExpiredErrorTone,
} from "./seniorNurseKraftAudio";
import "./sterilizationKraftLogbook.css";

export type LogbookActiveTab = "register_batch" | "scan_verify" | "journal_table" | "print_stickers";

export interface SterilizationKraftLogbookModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialBatchId?: string | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly onPackageCreated?: ((pkg: KraftPackageRecord) => void) | undefined;
}

const AUTOCLAVE_DEVICES = [
	{ id: "АК-01", name: "АК-01 Melag Vacuklav 31B+ (B-класс, 18 л)" },
	{ id: "АК-02", name: "АК-02 Euronda E9 Next (B-класс, 24 л)" },
	{ id: "АК-03", name: "АК-03 Sirona DAC Universal (B-класс наконечники)" },
	{ id: "ГП-01", name: "ГП-01 ГП-20 СПУ (Воздушный стерилизатор / Сухожар)" },
] as const;

const DENTAL_TOOL_PRESETS = [
	{ id: "set_therapeutic", name: "Терапевтический лоток смотровой (базовый)", count: 6 },
	{ id: "set_surgical", name: "Хирургический набор (щипцы, элеватор, кюрета)", count: 5 },
	{ id: "set_endo", name: "Эндодонтический набор файлов и боров", count: 8 },
	{ id: "set_ortho", name: "Ортопедический набор (слепочные ложки, боры)", count: 4 },
	{ id: "set_handpieces", name: "Стоматологические наконечники KaVo/NSK", count: 2 },
	{ id: "set_implant", name: "Имплантологическая кассета (хирургия)", count: 12 },
] as const;

export function SterilizationKraftLogbookModal({
	isOpen,
	onClose,
	initialBatchId,
	onInsertToProtocol,
	onPackageCreated,
}: SterilizationKraftLogbookModalProps) {
	const [activeTab, setActiveTab] = useState<LogbookActiveTab>("register_batch");

	// ─────────────────────────────────────────────────────────────────────────
	// 1. SAMPLE / SEED LOGBOOK RECORDS
	// ─────────────────────────────────────────────────────────────────────────
	const [packages, setPackages] = useState<KraftPackageRecord[]>(() => {
		const now = new Date();
		const dateIso = now.toISOString().slice(0, 10);

		// Создаем реалистичные тестовые записи
		const p1Pack = new Date(now.getTime() - 5 * 86400000).toISOString().slice(0, 10);
		const p1Exp = new Date(now.getTime() + 45 * 86400000).toISOString().slice(0, 10);

		const p2Pack = new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10);
		const p2Exp = new Date(now.getTime() + 58 * 86400000).toISOString().slice(0, 10);

		const p3Pack = new Date(now.getTime() - 47 * 86400000).toISOString().slice(0, 10);
		const p3Exp = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10); // Истекает скоро (3 дня)

		const p4Pack = new Date(now.getTime() - 65 * 86400000).toISOString().slice(0, 10);
		const p4Exp = new Date(now.getTime() - 15 * 86400000).toISOString().slice(0, 10); // Просрочено на 15 дней

		return [
			{
				id: "pkg-init-1",
				batchId: "KB-20260826-01",
				serialNumber: 1,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_therapeutic",
				toolSetNameRu: "Терапевтический лоток смотровой (базовый)",
				itemsListRu: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет", "Штопфер-гладилка", "Экскаватор"],
				packDate: p1Pack,
				expDate: p1Exp,
				daysLifespan: 50,
				daysRemaining: 45,
				status: "sterile_valid",
				autoclaveId: "АК-01 Melag Vacuklav",
				cycleNumber: 1,
				operatorId: "NURSE-01",
				operatorName: "Смирнова А.В. (Медсестра ЦСО)",
				indicatorId: "vinar_steritest_4_134",
				indicatorVerified: true,
				barcode128: "KB2608260001",
				barcodeDataMatrixPayload: `KB-20260826-01#1|АК-01|CYC1|${p1Pack}|${p1Exp}|NURSE-01|set_therapeutic`,
				isBreached: false,
				notes: "Параметры цикла 134°C / 2.1 бар / 5 мин соблюдены",
				createdAt: new Date().toISOString(),
			},
			{
				id: "pkg-init-2",
				batchId: "KB-20260826-01",
				serialNumber: 2,
				packageType: "paper_plastic_pouch",
				packageSize: "size_150x250",
				toolSetId: "set_surgical",
				toolSetNameRu: "Хирургический набор (щипцы, элеватор, кюрета)",
				itemsListRu: ["Щипцы байонетные", "Элеватор прямой", "Кюрета Лукаса", "Распатор"],
				packDate: p2Pack,
				expDate: p2Exp,
				daysLifespan: 60,
				daysRemaining: 58,
				status: "sterile_valid",
				autoclaveId: "АК-01 Melag Vacuklav",
				cycleNumber: 2,
				operatorId: "NURSE-01",
				operatorName: "Смирнова А.В. (Медсестра ЦСО)",
				indicatorId: "vinar_intetest_5_134",
				indicatorVerified: true,
				barcode128: "KB2608260002",
				barcodeDataMatrixPayload: `KB-20260826-01#2|АК-01|CYC2|${p2Pack}|${p2Exp}|NURSE-01|set_surgical`,
				isBreached: false,
				notes: "Интегратор Класс 5 подтвердил гибель спор",
				createdAt: new Date().toISOString(),
			},
			{
				id: "pkg-init-3",
				batchId: "KB-20260710-03",
				serialNumber: 3,
				packageType: "paper_self_seal_single",
				packageSize: "size_75x150",
				toolSetId: "set_endo",
				toolSetNameRu: "Эндодонтический набор файлов и боров",
				itemsListRu: ["K-файлы #15-40", "H-файлы", "Эндо-линейка", "Спредер"],
				packDate: p3Pack,
				expDate: p3Exp,
				daysLifespan: 50,
				daysRemaining: 3,
				status: "expiring_soon_7d",
				autoclaveId: "АК-02 Euronda E9",
				cycleNumber: 4,
				operatorId: "NURSE-02",
				operatorName: "Иванова Е.Н. (Медсестра ЦСО)",
				indicatorId: "medtest_medis_4_134",
				indicatorVerified: true,
				barcode128: "KB2607100003",
				barcodeDataMatrixPayload: `KB-20260710-03#3|АК-02|CYC4|${p3Pack}|${p3Exp}|NURSE-02|set_endo`,
				isBreached: false,
				notes: "Истекает срок годности (осталось 3 дня)",
				createdAt: new Date().toISOString(),
			},
			{
				id: "pkg-init-4",
				batchId: "KB-20260620-02",
				serialNumber: 4,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_ortho",
				toolSetNameRu: "Ортопедический набор (слепочные ложки, боры)",
				itemsListRu: ["Ложки слепочные перфорированные", "Бородержатель"],
				packDate: p4Pack,
				expDate: p4Exp,
				daysLifespan: 50,
				daysRemaining: -15,
				status: "expired",
				autoclaveId: "АК-01 Melag Vacuklav",
				cycleNumber: 1,
				operatorId: "NURSE-01",
				operatorName: "Смирнова А.В.",
				indicatorId: "vinar_steritest_4_134",
				indicatorVerified: true,
				barcode128: "KB2606200004",
				barcodeDataMatrixPayload: `KB-20260620-02#4|АК-01|CYC1|${p4Pack}|${p4Exp}|NURSE-01|set_ortho`,
				isBreached: false,
				notes: "ПРОСРОЧЕН на 15 дней. Требуется повторная ПСО.",
				createdAt: new Date().toISOString(),
			},
		];
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. FORM STATE: 1-CLICK BATCH REGISTRATION
	// ─────────────────────────────────────────────────────────────────────────
	const [selectedAutoclave, setSelectedAutoclave] = useState<string>(AUTOCLAVE_DEVICES[0].id);
	const [cycleNumber, setCycleNumber] = useState<number>(3);
	const [operatorName, setOperatorName] = useState<string>("Смирнова А.В. (Медсестра ЦСО)");
	const [selectedRegime, setSelectedRegime] = useState<SterilizationRegimeId>("steam_134_5min");
	const [actualTemp, setActualTemp] = useState<number>(134.5);
	const [actualPressure, setActualPressure] = useState<number>(2.12);
	const [actualTimeMinutes, setActualTimeMinutes] = useState<number>(5.0);

	const [selectedPackagingType, setSelectedPackagingType] = useState<SanpinPackagingTypeId>("kraft_self_seal");
	const [selectedIntegratorId, setSelectedIntegratorId] = useState<string>("vinar_steritest_4_134");
	const [indicatorMatchState, setIndicatorMatchState] = useState<VisualIndicatorMatchState>("match_reference");
	const [selectedToolSetId, setSelectedToolSetId] = useState<string>(DENTAL_TOOL_PRESETS[0].id);
	const [batchQuantity, setBatchQuantity] = useState<number>(5);
	const [batchNotes, setBatchNotes] = useState<string>("");

	// Live cycle validation
	const cycleValidation = useMemo(() => {
		return validateSterilizationCycleParameters(selectedRegime, actualTemp, actualPressure, actualTimeMinutes);
	}, [selectedRegime, actualTemp, actualPressure, actualTimeMinutes]);

	// Live shelf life calculation
	const expiryEval = useMemo(() => {
		return calculatePackageExpiryDate(new Date(), selectedPackagingType);
	}, [selectedPackagingType]);

	// Active chemical indicator definition and evaluation
	const currentIntegrator = useMemo(() => {
		return getChemicalIntegratorById(selectedIntegratorId) || CHEMICAL_INTEGRATORS_CATALOG[0]!;
	}, [selectedIntegratorId]);

	const indicatorEval = useMemo(() => {
		return evaluateChemicalIntegratorColorMatch(selectedIntegratorId, indicatorMatchState);
	}, [selectedIntegratorId, indicatorMatchState]);

	// When regime changes, adapt recommended indicator and defaults
	const handleRegimeChange = (regimeId: SterilizationRegimeId) => {
		setSelectedRegime(regimeId);
		const def = STERILIZATION_REGIMES.find((r) => r.id === regimeId);
		if (def) {
			setActualTemp(def.targetTemperatureCelsius);
			setActualPressure(def.targetPressureBar);
			setActualTimeMinutes(def.targetExposureMinutes);
			const recommended = getRecommendedIntegrator(regimeId);
			setSelectedIntegratorId(recommended.id);
		}
	};

	// ─────────────────────────────────────────────────────────────────────────
	// 3. SCANNER STATE & LIVE HUD
	// ─────────────────────────────────────────────────────────────────────────
	const [scanInput, setScanInput] = useState<string>("");
	const [scannedPackage, setScannedPackage] = useState<KraftPackageRecord | null>(() => packages[0] || null);
	const [lastAudioTrigger, setLastAudioTrigger] = useState<"sterile" | "expired" | null>(null);

	const executeScan = (barcodeToFind: string) => {
		const clean = barcodeToFind.trim().toUpperCase();
		if (!clean) return;

		const found = packages.find(
			(p) =>
				p.barcode128.toUpperCase() === clean ||
				p.id.toUpperCase() === clean ||
				p.barcodeDataMatrixPayload.toUpperCase().includes(clean),
		);

		if (found) {
			setScannedPackage(found);
			if (found.status === "expired" || found.isBreached) {
				playExpiredErrorTone();
				setLastAudioTrigger("expired");
				showToast(`⚠️ ВНИМАНИЕ: Пакет ${found.barcode128} ПРОСРОЧЕН / БРАКОВАН!`, "error");
			} else {
				playSterileSuccessTone();
				setLastAudioTrigger("sterile");
				showToast(`✓ Пакет ${found.barcode128} СТЕРИЛЕН (Годен до ${found.expDate})`, "success");
			}
		} else {
			playExpiredErrorTone();
			setLastAudioTrigger("expired");
			showToast(`Штрихкод "${clean}" не найден в реестре клиники!`, "error");
		}
	};

	const handleScanSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		executeScan(scanInput);
		setScanInput("");
	};

	// ─────────────────────────────────────────────────────────────────────────
	// 4. BATCH REGISTRATION ACTION (1-CLICK)
	// ─────────────────────────────────────────────────────────────────────────
	const handleRegisterBatch = (e: React.FormEvent) => {
		e.preventDefault();

		if (!cycleValidation.isValid) {
			showToast("Невозможно зарегистрировать брак параметров стерилизации!", "error");
			return;
		}

		if (!indicatorEval.allowsClinicalUse) {
			showToast("Невозможно зарегистрировать партию с бракованным индикатором!", "error");
			return;
		}

		const now = new Date();
		const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
		const batchId = `KB-${dateStr}-${String(cycleNumber).padStart(2, "0")}`;
		const toolSet = DENTAL_TOOL_PRESETS.find((t) => t.id === selectedToolSetId) || DENTAL_TOOL_PRESETS[0]!;

		const newGeneratedPackages: KraftPackageRecord[] = [];
		const startSerial = packages.length + 1;

		for (let i = 0; i < batchQuantity; i++) {
			const serial = startSerial + i;
			const barcode128 = generate1DBarcodeString(batchId, serial);
			const dataMatrixPayload = formatKraftDataMatrixPayload({
				batchId,
				autoclaveId: selectedAutoclave,
				cycleNumber,
				packDate: expiryEval.packDateFormatted,
				expDate: expiryEval.expiryDateFormatted,
				operatorId: "NURSE-01",
				toolSetId: toolSet.id,
				serialNumber: serial,
			});

			const newPkg: KraftPackageRecord = {
				id: `pkg-${Date.now()}-${serial}`,
				batchId,
				serialNumber: serial,
				packageType: selectedPackagingType === "paper_plastic_heat_seal" ? "paper_plastic_pouch" : "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: toolSet.id,
				toolSetNameRu: toolSet.name,
				itemsListRu: [`${toolSet.name} (комплект ${toolSet.count} предм.)`],
				packDate: expiryEval.packDateFormatted,
				expDate: expiryEval.expiryDateFormatted,
				daysLifespan: expiryEval.shelfLifeDays,
				daysRemaining: expiryEval.daysRemaining,
				status: expiryEval.status === "expired" ? "expired" : expiryEval.status === "expiring_soon" ? "expiring_soon_7d" : "sterile_valid",
				autoclaveId: selectedAutoclave,
				cycleNumber,
				operatorId: "NURSE-01",
				operatorName,
				indicatorId: selectedIntegratorId,
				indicatorVerified: true,
				barcode128,
				barcodeDataMatrixPayload: dataMatrixPayload,
				isBreached: false,
				notes: batchNotes || `Режим ${selectedRegime}: ${actualTemp}°C / ${actualPressure} бар / ${actualTimeMinutes} мин. Индикатор: ${currentIntegrator.shortLabelRu}.`,
				createdAt: now.toISOString(),
			};

			newGeneratedPackages.push(newPkg);
			onPackageCreated?.(newPkg);
		}

		setPackages((prev) => [...newGeneratedPackages, ...prev]);
		setScannedPackage(newGeneratedPackages[0] || null);
		setCycleNumber((c) => c + 1);

		playSterileSuccessTone();
		showToast(
			`⚡ Партия ${batchId} успешно зарегистрирована! Сгенерировано ${batchQuantity} крафт-пакетов (Срок: ${expiryEval.shelfLifeDays} сут. до ${expiryEval.expiryDateFormatted}).`,
			"success",
		);

		// Switch to print or table tab
		setActiveTab("print_stickers");
	};

	// ─────────────────────────────────────────────────────────────────────────
	// 5. UNSEAL ON APPOINTMENT ACTION
	// ─────────────────────────────────────────────────────────────────────────
	const handleUnsealOnAppointment = (pkg: KraftPackageRecord) => {
		if (pkg.status === "expired" || pkg.isBreached) {
			playExpiredErrorTone();
			showToast("ОШИБКА! Вскрытие просроченного крафт-пакета на приеме строго запрещено СанПиН!", "error");
			return;
		}

		const protocolEntry = `[СТЕРИЛИЗАЦИЯ СанПиН 3.3686-21] Вскрыт стерильный крафт-пакет: №${pkg.barcode128} (Партия ${pkg.batchId}, Стерилизация: ${pkg.packDate}, Годен до: ${pkg.expDate}). Набор: ${pkg.toolSetNameRu}. Автоклав: ${pkg.autoclaveId} цикл №${pkg.cycleNumber}. Хим. индикатор ${pkg.indicatorId}: OK. Медсестра: ${pkg.operatorName}.`;

		onInsertToProtocol?.(protocolEntry);
		playSterileSuccessTone();
		showToast(`✓ Пакет ${pkg.barcode128} вскрыт. Запись внесена в протокол приема.`, "success");
	};

	// ─────────────────────────────────────────────────────────────────────────
	// 6. LOGBOOK FILTERING & STATISTICS
	// ─────────────────────────────────────────────────────────────────────────
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");

	const filteredPackages = useMemo(() => {
		return packages.filter((p) => {
			const matchesSearch =
				!searchQuery ||
				p.barcode128.toLowerCase().includes(searchQuery.toLowerCase()) ||
				p.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
				p.toolSetNameRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
				p.operatorName.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesStatus =
				statusFilter === "all" ||
				(statusFilter === "valid" && p.status === "sterile_valid") ||
				(statusFilter === "expiring" && p.status === "expiring_soon_7d") ||
				(statusFilter === "expired" && (p.status === "expired" || p.status === "recalled"));

			return matchesSearch && matchesStatus;
		});
	}, [packages, searchQuery, statusFilter]);

	const statistics = useMemo(() => {
		const total = packages.length;
		const valid = packages.filter((p) => p.status === "sterile_valid").length;
		const expiring = packages.filter((p) => p.status === "expiring_soon_7d").length;
		const expired = packages.filter((p) => p.status === "expired" || p.status === "recalled").length;
		return { total, valid, expiring, expired };
	}, [packages]);

	// ─────────────────────────────────────────────────────────────────────────
	// 7. THERMAL STICKER PRINT
	// ─────────────────────────────────────────────────────────────────────────
	const activeStickerPkg = scannedPackage || packages[0] || null;

	const handlePrintSingleThermalSticker = () => {
		window.print();
		showToast("Команда печати отправлена на термопринтер", "info");
	};

	const handleExportLogbookCsv = () => {
		const headers = [
			"ID Пакета",
			"Штрихкод 1D",
			"Партия",
			"Набор инструментов",
			"Тип упаковки",
			"Дата стерилизации",
			"Годен до",
			"Осталось дней",
			"Статус",
			"Автоклав",
			"Цикл №",
			"Оператор ЦСО",
			"Индикатор",
		];
		const rows = packages.map((p) => [
			p.id,
			p.barcode128,
			p.batchId,
			`"${p.toolSetNameRu}"`,
			p.packageType,
			p.packDate,
			p.expDate,
			p.daysRemaining,
			p.status,
			`"${p.autoclaveId}"`,
			p.cycleNumber,
			`"${p.operatorName}"`,
			p.indicatorId,
		]);

		const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `sanpin_sterilization_logbook_${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
		showToast("Журнал успешно экспортирован в CSV", "success");
	};

	if (!isOpen) return null;

	return createPortal(
		<div className="sk-logbook-overlay" onClick={onClose}>
			<div className="sk-logbook-modal" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<header className="sk-logbook-header">
					<div className="sk-header-title-wrap">
						<FileBadge size={28} className="text-teal-600" />
						<div>
							<h2>Журнал учета стерилизации и крафт-пакетов</h2>
							<div className="sk-header-sub">
								СанПиН 3.3686-21 • ГОСТ ISO 11140-1 (Классы 4 / 5 / 6) • ГОСТ Р ИСО 11607
							</div>
						</div>
					</div>

					<div className="sk-header-badges">
						<span className="sk-badge sk-badge-teal">
							<ShieldCheck size={14} /> СанПиН 3.3686-21
						</span>
						<span className="sk-badge sk-badge-blue">
							<QrCode size={14} /> Code128 / DataMatrix 2D
						</span>
						<span className="sk-badge sk-badge-purple">
							<UserCheck size={14} /> ЭЦП Медсестры ЦСО
						</span>
						<button
							type="button"
							className="sk-close-btn"
							onClick={onClose}
							aria-label="Закрыть модальное окно"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* Tabs Navigation */}
				<nav className="sk-nav-tabs">
					<button
						type="button"
						className={`sk-tab-btn ${activeTab === "register_batch" ? "active" : ""}`}
						onClick={() => setActiveTab("register_batch")}
					>
						<Zap size={16} /> ⚡ Регистрация закладки
					</button>
					<button
						type="button"
						className={`sk-tab-btn ${activeTab === "scan_verify" ? "active" : ""}`}
						onClick={() => setActiveTab("scan_verify")}
					>
						<Barcode size={16} /> 🔍 Быстрый сканер и годность
					</button>
					<button
						type="button"
						className={`sk-tab-btn ${activeTab === "journal_table" ? "active" : ""}`}
						onClick={() => setActiveTab("journal_table")}
					>
						<FileText size={16} /> 📋 Журнал стерилизации ({packages.length})
					</button>
					<button
						type="button"
						className={`sk-tab-btn ${activeTab === "print_stickers" ? "active" : ""}`}
						onClick={() => setActiveTab("print_stickers")}
					>
						<Printer size={16} /> 🏷️ Печать термоэтикеток 58×40
					</button>
				</nav>

				{/* Body Content */}
				<div className="sk-logbook-body">
					{/* ─────────────────────────────────────────────────────────────
					    TAB 1: 1-CLICK BATCH REGISTRATION
					    ───────────────────────────────────────────────────────────── */}
					{activeTab === "register_batch" && (
						<form onSubmit={handleRegisterBatch} className="sk-card" style={{ gap: "1.25rem" }}>
							<div className="sk-grid-2col">
								{/* Left Column: Equipment & Parameters */}
								<div className="sk-card" style={{ background: "transparent", padding: 0, border: "none" }}>
									<h3 className="sk-card-title">
										<Flame size={18} /> Параметры цикла стерилизатора
									</h3>

									<div className="sk-grid-2col">
										<div className="sk-form-group">
											<label className="sk-label">Стерилизатор</label>
											<select
												className="sk-select"
												value={selectedAutoclave}
												onChange={(e) => setSelectedAutoclave(e.target.value)}
											>
												{AUTOCLAVE_DEVICES.map((d) => (
													<option key={d.id} value={d.id}>
														{d.name}
													</option>
												))}
											</select>
										</div>

										<div className="sk-form-group">
											<label className="sk-label">№ Цикла за смену</label>
											<input
												type="number"
												min={1}
												max={99}
												className="sk-input"
												value={cycleNumber}
												onChange={(e) => setCycleNumber(parseInt(e.target.value, 10) || 1)}
											/>
										</div>
									</div>

									<div className="sk-form-group">
										<label className="sk-label">Режим стерилизации (СанПиН)</label>
										<select
											className="sk-select"
											value={selectedRegime}
											onChange={(e) => handleRegimeChange(e.target.value as SterilizationRegimeId)}
										>
											{STERILIZATION_REGIMES.map((r) => (
												<option key={r.id} value={r.id}>
													{r.nameRu}
												</option>
											))}
										</select>
									</div>

									<div className="sk-grid-3col">
										<div className="sk-form-group">
											<label className="sk-label">Температура (°C)</label>
											<input
												type="number"
												step="0.1"
												className="sk-input"
												value={actualTemp}
												onChange={(e) => setActualTemp(parseFloat(e.target.value) || 0)}
											/>
										</div>
										<div className="sk-form-group">
											<label className="sk-label">Давление (бар)</label>
											<input
												type="number"
												step="0.01"
												className="sk-input"
												value={actualPressure}
												onChange={(e) => setActualPressure(parseFloat(e.target.value) || 0)}
											/>
										</div>
										<div className="sk-form-group">
											<label className="sk-label">Выдержка (мин)</label>
											<input
												type="number"
												step="0.5"
												className="sk-input"
												value={actualTimeMinutes}
												onChange={(e) => setActualTimeMinutes(parseFloat(e.target.value) || 0)}
											/>
										</div>
									</div>

									{/* Cycle Validation Feedback */}
									{cycleValidation.isValid ? (
										<div className="sk-alert sk-alert-success">
											<CheckCircle2 size={18} />
											<div>
												<strong>Параметры в норме:</strong> {cycleValidation.complianceVerdictRu}
											</div>
										</div>
									) : (
										<div className="sk-alert sk-alert-danger">
											<AlertOctagon size={18} />
											<div>
												<strong>БРАК ПАРАМЕТРОВ:</strong> {cycleValidation.errors.join("; ")}
											</div>
										</div>
									)}

									<div className="sk-form-group">
										<label className="sk-label">Оператор ЦСО / Медсестра</label>
										<input
											type="text"
											className="sk-input"
											value={operatorName}
											onChange={(e) => setOperatorName(e.target.value)}
										/>
									</div>
								</div>

								{/* Right Column: Packaging, Chemical Integrator & Tool Sets */}
								<div className="sk-card" style={{ background: "transparent", padding: 0, border: "none" }}>
									<h3 className="sk-card-title">
										<PackageCheck size={18} /> Упаковка и химический интегратор
									</h3>

									<div className="sk-form-group">
										<label className="sk-label">Тип стерилизационной упаковки</label>
										<select
											className="sk-select"
											value={selectedPackagingType}
											onChange={(e) => setSelectedPackagingType(e.target.value as SanpinPackagingTypeId)}
										>
											{SANPIN_PACKAGING_TYPES.map((t) => (
												<option key={t.id} value={t.id}>
													{t.nameRu} ({t.defaultShelfLifeDays} сут.)
												</option>
											))}
										</select>
										<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
											Срок стерильности: <strong>{expiryEval.shelfLifeDays} суток</strong> (Годен до:{" "}
											<strong>{expiryEval.expiryDateFormatted}</strong>) • {expiryEval.sanpinClause}
										</span>
									</div>

									<div className="sk-form-group">
										<label className="sk-label">Химический индикатор (Класс 4/5/6)</label>
										<select
											className="sk-select"
											value={selectedIntegratorId}
											onChange={(e) => setSelectedIntegratorId(e.target.value)}
										>
											{getAllChemicalIntegrators().map((ind) => (
												<option key={ind.id} value={ind.id}>
													{ind.code} • {ind.nameRu} ({ind.classLabelRu})
												</option>
											))}
										</select>
									</div>

									{/* Color Swatch & Result Match */}
									<div className="sk-color-swatch-box">
										<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
											<div className="sk-swatch" style={{ background: currentIntegrator.initialColorHex }} />
											<span style={{ fontSize: "0.75rem" }}>До: {currentIntegrator.initialColorNameRu}</span>
										</div>
										<ChevronRight size={16} />
										<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
											<div className="sk-swatch" style={{ background: currentIntegrator.targetColorHex }} />
											<span style={{ fontSize: "0.75rem", fontWeight: 700 }}>
												После: {currentIntegrator.targetColorNameRu}
											</span>
										</div>
									</div>

									<div className="sk-form-group">
										<label className="sk-label">Результат химического контроля</label>
										<select
											className="sk-select"
											value={indicatorMatchState}
											onChange={(e) => setIndicatorMatchState(e.target.value as VisualIndicatorMatchState)}
										>
											<option value="match_reference">✓ Соответствует эталону (Стерильно OK)</option>
											<option value="darker_than_reference">✓ Темнее эталона (100%+ доза OK)</option>
											<option value="lighter_than_reference">✗ Светлее эталона (БРАК ВЫДЕРЖКИ)</option>
											<option value="unchanged_initial">✗ Не изменился (КРИТИЧЕСКИЙ СБОЙ)</option>
										</select>
									</div>

									<div className="sk-grid-2col">
										<div className="sk-form-group">
											<label className="sk-label">Набор инструментов</label>
											<select
												className="sk-select"
												value={selectedToolSetId}
												onChange={(e) => setSelectedToolSetId(e.target.value)}
											>
												{DENTAL_TOOL_PRESETS.map((t) => (
													<option key={t.id} value={t.id}>
														{t.name}
													</option>
												))}
											</select>
										</div>

										<div className="sk-form-group">
											<label className="sk-label">Количество пакетов</label>
											<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
												<button
													type="button"
													className="sk-btn sk-btn-secondary"
													style={{ minWidth: 44 }}
													onClick={() => setBatchQuantity((q) => Math.max(1, q - 1))}
												>
													-
												</button>
												<input
													type="number"
													min={1}
													max={50}
													className="sk-input"
													style={{ textAlign: "center", fontWeight: 700 }}
													value={batchQuantity}
													onChange={(e) => setBatchQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
												/>
												<button
													type="button"
													className="sk-btn sk-btn-secondary"
													style={{ minWidth: 44 }}
													onClick={() => setBatchQuantity((q) => Math.min(50, q + 1))}
												>
													+
												</button>
											</div>
										</div>
									</div>
								</div>
							</div>

							<div className="sk-form-group">
								<label className="sk-label">Примечания к партии / Назначение</label>
								<input
									type="text"
									className="sk-input"
									placeholder="Например: Для утренней смены хирургии, проверка тестом Helix"
									value={batchNotes}
									onChange={(e) => setBatchNotes(e.target.value)}
								/>
							</div>

							{/* 1-Click Action Button */}
							<div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "0.5rem" }}>
								<button
									type="submit"
									className="sk-btn sk-btn-primary"
									style={{ fontSize: "1rem", padding: "0.75rem 2rem", minHeight: 48 }}
								>
									<Zap size={20} /> ⚡ Зарегистрировать закладку и сгенерировать партию ({batchQuantity} шт.)
								</button>
							</div>
						</form>
					)}

					{/* ─────────────────────────────────────────────────────────────
					    TAB 2: FAST BARCODE SCANNER & EXPIRY HUD
					    ───────────────────────────────────────────────────────────── */}
					{activeTab === "scan_verify" && (
						<div className="sk-card" style={{ gap: "1.25rem" }}>
							<form onSubmit={handleScanSubmit} style={{ display: "flex", gap: "0.75rem" }}>
								<div style={{ flexGrow: 1, position: "relative" }}>
									<input
										type="text"
										className="sk-input"
										style={{ width: "100%", fontSize: "1.125rem", paddingLeft: "2.75rem" }}
										placeholder="Отсканируйте штрихкод пакета или введите вручную (например: KB2608260001)..."
										value={scanInput}
										onChange={(e) => setScanInput(e.target.value)}
										autoFocus
									/>
									<Barcode
										size={22}
										style={{
											position: "absolute",
											left: "0.875rem",
											top: "50%",
											transform: "translateY(-50%)",
											color: "var(--muted)",
										}}
									/>
								</div>
								<button type="submit" className="sk-btn sk-btn-primary">
									<Search size={18} /> Проверить
								</button>
							</form>

							{/* Quick Test Presets */}
							<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
								<span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)" }}>
									Тестовые сканы:
								</span>
								<div className="sk-preset-pills">
									{packages.map((pkg) => (
										<button
											key={pkg.id}
											type="button"
											className="sk-pill-btn"
											onClick={() => executeScan(pkg.barcode128)}
										>
											{pkg.status === "sterile_valid" && <CheckCircle2 size={14} className="text-emerald-500" />}
											{pkg.status === "expiring_soon_7d" && <Clock size={14} className="text-amber-500" />}
											{pkg.status === "expired" && <XCircle size={14} className="text-rose-500" />}
											{pkg.barcode128} ({pkg.toolSetNameRu.slice(0, 16)}...)
										</button>
									))}
								</div>
							</div>

							{/* Big HUD Status Display */}
							{scannedPackage ? (
								<div
									className={`sk-scanner-hud ${
										scannedPackage.status === "sterile_valid"
											? "sk-hud-valid"
											: scannedPackage.status === "expiring_soon_7d"
												? "sk-hud-expiring"
												: "sk-hud-expired"
									}`}
								>
									{scannedPackage.status === "sterile_valid" && (
										<h3 className="sk-hud-status-title" style={{ color: "#10b981" }}>
											<ShieldCheck size={32} /> СТЕРИЛЬНО • ГОДЕН К ПРИМЕНЕНИЮ
										</h3>
									)}
									{scannedPackage.status === "expiring_soon_7d" && (
										<h3 className="sk-hud-status-title" style={{ color: "#f59e0b" }}>
											<AlertTriangle size={32} /> ИСТЕКАЕТ СРОК ГОДНОСТИ (МЕНЕЕ 7 ДНЕЙ)
										</h3>
									)}
									{scannedPackage.status === "expired" && (
										<h3 className="sk-hud-status-title" style={{ color: "#ef4444" }}>
											<AlertOctagon size={32} /> ВНИМАНИЕ! СРОК СТЕРИЛЬНОСТИ ИСТЕК (ПРОСРОЧЕНО)
										</h3>
									)}

									<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
										<div className="sk-hud-date-hero">
											ГОДЕН ДО: {scannedPackage.expDate}
										</div>
										<span style={{ fontSize: "1rem", fontWeight: 700 }}>
											({scannedPackage.daysRemaining >= 0
												? `Осталось ${scannedPackage.daysRemaining} ${formatDaysRussian(scannedPackage.daysRemaining)}`
												: `Просрочено на ${Math.abs(scannedPackage.daysRemaining)} ${formatDaysRussian(Math.abs(scannedPackage.daysRemaining))}`})
										</span>
									</div>

									{/* Package Detailed Breakdown */}
									<div
										className="sk-card"
										style={{
											width: "100%",
											maxWidth: 800,
											background: "var(--paper)",
											textAlign: "left",
											marginTop: "0.5rem",
										}}
									>
										<div className="sk-grid-2col">
											<div>
												<div><strong>Штрихкод:</strong> {scannedPackage.barcode128}</div>
												<div><strong>Партия:</strong> {scannedPackage.batchId} (Серийный №{scannedPackage.serialNumber})</div>
												<div><strong>Набор:</strong> {scannedPackage.toolSetNameRu}</div>
												<div><strong>Стерилизация:</strong> {scannedPackage.packDate} (Срок: {scannedPackage.daysLifespan} сут.)</div>
											</div>
											<div>
												<div><strong>Стерилизатор:</strong> {scannedPackage.autoclaveId} (Цикл №{scannedPackage.cycleNumber})</div>
												<div><strong>Оператор ЦСО:</strong> {scannedPackage.operatorName}</div>
												<div><strong>Хим. Индикатор:</strong> {scannedPackage.indicatorId} (Проверен OK)</div>
												<div><strong>Герметичность:</strong> {scannedPackage.isBreached ? "✗ Нарушена" : "✓ Сохранена"}</div>
											</div>
										</div>

										{/* 1-Click Action Buttons */}
										<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem" }}>
											<button
												type="button"
												className="sk-btn sk-btn-secondary"
												onClick={() => {
													navigator.clipboard.writeText(scannedPackage.barcode128);
													showToast(`Штрихкод ${scannedPackage.barcode128} скопирован`, "success");
												}}
											>
												<Copy size={16} /> Копировать ШК
											</button>
											<button
												type="button"
												className="sk-btn sk-btn-primary"
												onClick={() => handleUnsealOnAppointment(scannedPackage)}
											>
												<PackageCheck size={18} /> Вскрыть пакет на приеме (в протокол)
											</button>
										</div>
									</div>
								</div>
							) : (
								<div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
									Отсканируйте крафт-пакет для проверки срока годности
								</div>
							)}
						</div>
					)}

					{/* ─────────────────────────────────────────────────────────────
					    TAB 3: LOGBOOK TABLE & BATCH REGISTRY
					    ───────────────────────────────────────────────────────────── */}
					{activeTab === "journal_table" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							{/* Statistics Bar */}
							<div className="sk-stats-bar">
								<div className="sk-stat-card">
									<span className="sk-stat-val">{statistics.total}</span>
									<span className="sk-stat-label">Всего крафт-пакетов</span>
								</div>
								<div className="sk-stat-card">
									<span className="sk-stat-val" style={{ color: "#10b981" }}>{statistics.valid}</span>
									<span className="sk-stat-label">Стерильно (Годен)</span>
								</div>
								<div className="sk-stat-card">
									<span className="sk-stat-val" style={{ color: "#f59e0b" }}>{statistics.expiring}</span>
									<span className="sk-stat-label">Истекает скоро (≤7 дн.)</span>
								</div>
								<div className="sk-stat-card">
									<span className="sk-stat-val" style={{ color: "#ef4444" }}>{statistics.expired}</span>
									<span className="sk-stat-label">Просрочено / Брак</span>
								</div>
							</div>

							{/* Search & Filter Bar */}
							<div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
								<div style={{ display: "flex", gap: "0.75rem", flexGrow: 1, maxWidth: 500 }}>
									<div style={{ position: "relative", flexGrow: 1 }}>
										<input
											type="text"
											className="sk-input"
											style={{ width: "100%", paddingLeft: "2.5rem" }}
											placeholder="Поиск по ШК, партии, набору, медсестре..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
										/>
										<Search
											size={18}
											style={{
												position: "absolute",
												left: "0.75rem",
												top: "50%",
												transform: "translateY(-50%)",
												color: "var(--muted)",
											}}
										/>
									</div>
									<select
										className="sk-select"
										value={statusFilter}
										onChange={(e) => setStatusFilter(e.target.value)}
									>
										<option value="all">Все статусы</option>
										<option value="valid">Только стерильные</option>
										<option value="expiring">Истекающие (≤7 дн.)</option>
										<option value="expired">Просроченные</option>
									</select>
								</div>

								<div style={{ display: "flex", gap: "0.75rem" }}>
									<button type="button" className="sk-btn sk-btn-secondary" onClick={handleExportLogbookCsv}>
										<Download size={16} /> Экспорт в CSV
									</button>
									<button type="button" className="sk-btn sk-btn-primary" onClick={() => window.print()}>
										<Printer size={16} /> Печать реестра A4
									</button>
								</div>
							</div>

							{/* Data Table */}
							<div className="sk-table-container">
								<table className="sk-table">
									<thead>
										<tr>
											<th>Штрихкод / ID</th>
											<th>Партия / Цикл</th>
											<th>Набор инструментов</th>
											<th>Стерилизация</th>
											<th>Годен до</th>
											<th>Статус</th>
											<th>Оператор ЦСО</th>
											<th style={{ textAlign: "right" }}>Действия</th>
										</tr>
									</thead>
									<tbody>
										{filteredPackages.map((pkg) => (
											<tr key={pkg.id}>
												<td>
													<div style={{ fontWeight: 700, fontFamily: "monospace" }}>{pkg.barcode128}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>№{pkg.serialNumber}</div>
												</td>
												<td>
													<div><strong>{pkg.batchId}</strong></div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														{pkg.autoclaveId} • Цикл №{pkg.cycleNumber}
													</div>
												</td>
												<td>
													<div style={{ fontWeight: 600 }}>{pkg.toolSetNameRu}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														{pkg.itemsListRu.join(", ").slice(0, 35)}...
													</div>
												</td>
												<td>{pkg.packDate}</td>
												<td>
													<span style={{ fontWeight: 700 }}>{pkg.expDate}</span>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														{pkg.daysRemaining >= 0
															? `Осталось ${pkg.daysRemaining} дн.`
															: `Просрочено на ${Math.abs(pkg.daysRemaining)} дн.`}
													</div>
												</td>
												<td>
													{pkg.status === "sterile_valid" && (
														<span className="sk-badge sk-badge-teal">
															<CheckCircle2 size={12} /> Годен
														</span>
													)}
													{pkg.status === "expiring_soon_7d" && (
														<span className="sk-badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
															<Clock size={12} /> Истекает
														</span>
													)}
													{(pkg.status === "expired" || pkg.status === "recalled") && (
														<span className="sk-badge" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
															<AlertOctagon size={12} /> Просрочен
														</span>
													)}
												</td>
												<td>{pkg.operatorName.split(" ")[0]}</td>
												<td style={{ textAlign: "right" }}>
													<div style={{ display: "inline-flex", gap: "0.5rem" }}>
														<button
															type="button"
															className="sk-btn sk-btn-secondary"
															style={{ minHeight: 36, padding: "0.25rem 0.5rem" }}
															onClick={() => {
																setScannedPackage(pkg);
																setActiveTab("scan_verify");
															}}
															title="Проверить в сканере"
														>
															<Eye size={14} />
														</button>
														<button
															type="button"
															className="sk-btn sk-btn-secondary"
															style={{ minHeight: 36, padding: "0.25rem 0.5rem" }}
															onClick={() => {
																setScannedPackage(pkg);
																setActiveTab("print_stickers");
															}}
															title="Печать этикетки"
														>
															<Printer size={14} />
														</button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* ─────────────────────────────────────────────────────────────
					    TAB 4: THERMAL STICKER 58x40 MM PRINT
					    ───────────────────────────────────────────────────────────── */}
					{activeTab === "print_stickers" && activeStickerPkg && (
						<div className="sk-card" style={{ gap: "1.25rem" }}>
							<div className="sk-grid-2col">
								{/* Left: Sticker Preview Stage */}
								<div>
									<h3 className="sk-card-title">
										<Printer size={18} /> Предпросмотр термоэтикетки 58 × 40 мм
									</h3>
									<div className="sk-sticker-stage">
										<div className="sk-sticker-card-58x40">
											{/* Header */}
											<div style={{ display: "flex", justifyContent: "space-between", borderBottom: "0.5pt solid #000", paddingBottom: "1mm", fontSize: "6pt" }}>
												<span style={{ fontWeight: 800 }}>ООО «ДЕНТЕ» • ЦСО</span>
												<span>СанПиН 3.3686-21</span>
											</div>

											{/* Middle: Data & Barcodes */}
											<div style={{ display: "flex", gap: "2mm", alignItems: "center", margin: "1mm 0" }}>
												<div
													style={{ width: "16mm", height: "16mm" }}
													dangerouslySetInnerHTML={{
														__html: generateDataMatrixSvg(activeStickerPkg.barcodeDataMatrixPayload, { size: 55 }),
													}}
												/>
												<div style={{ fontSize: "6.5pt", lineHeight: "1.25", flexGrow: 1 }}>
													<div style={{ fontWeight: 800, fontSize: "7pt" }}>{activeStickerPkg.toolSetNameRu}</div>
													<div>Штрихкод: <strong>{activeStickerPkg.barcode128}</strong></div>
													<div>Стерилизация: <strong>{activeStickerPkg.packDate}</strong></div>
													<div>
														ГОДЕН ДО:{" "}
														<span style={{ fontWeight: 900, background: "#000", color: "#fff", padding: "0.2mm 1mm", borderRadius: "0.5mm" }}>
															{activeStickerPkg.expDate}
														</span>
													</div>
												</div>
											</div>

											{/* Barcode 1D Code128 Vector */}
											<div
												style={{ height: "7mm", width: "100%" }}
												dangerouslySetInnerHTML={{
													__html: generateCode128Svg(activeStickerPkg.barcode128, { height: 22, showText: false }),
												}}
											/>

											{/* Footer */}
											<div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5pt dashed #000", paddingTop: "0.5mm", fontSize: "5.5pt" }}>
												<span>{activeStickerPkg.autoclaveId} / ЦИКЛ №{activeStickerPkg.cycleNumber}</span>
												<span>Опер: <strong>{activeStickerPkg.operatorName.split(" ")[0]}</strong> • ЭЦП OK</span>
											</div>
										</div>
									</div>
								</div>

								{/* Right: Print Actions & Hardware settings */}
								<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
									<h3 className="sk-card-title">
										<Award size={18} /> Параметры термопринтера (Xprinter / Zebra)
									</h3>

									<div className="sk-card" style={{ background: "var(--paper)" }}>
										<div><strong>Размер ленты:</strong> 58 × 40 мм (стандарт термоэтикеток)</div>
										<div><strong>Партия:</strong> {activeStickerPkg.batchId} (Пакет #{activeStickerPkg.serialNumber})</div>
										<div><strong>Срок стерильности:</strong> {activeStickerPkg.daysLifespan} суток по СанПиН</div>
										<div><strong>Хим. индикатор:</strong> Класс 4/5/6 эталон подтвержден</div>
									</div>

									<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "auto" }}>
										<button
											type="button"
											className="sk-btn sk-btn-primary"
											style={{ minHeight: 48, fontSize: "1rem" }}
											onClick={handlePrintSingleThermalSticker}
										>
											<Printer size={20} /> Печать этикетки на термопринтере (58×40 мм)
										</button>
										<button
											type="button"
											className="sk-btn sk-btn-secondary"
											onClick={() => {
												const win = window.open("", "_blank");
												if (win) {
													win.document.write(
														generateThermalStickerHtml(activeStickerPkg, { size: "58x40", clinicName: "ООО «ДЕНТЕ»" }),
													);
													win.document.close();
													win.focus();
													win.print();
												}
											}}
										>
											<FileText size={18} /> Открыть чистый HTML для печати
										</button>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}

export default SterilizationKraftLogbookModal;

/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION & PSO QUALITY JOURNAL MODAL
 * Форма № 257/у (Автоклавы), Форма № 366/у (ПСО), Контроль крафт-пакетов
 * ============================================================================
 */

import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Award,
	Barcode,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	Download,
	Droplets,
	FileSpreadsheet,
	FileText,
	Flame,
	FlaskConical,
	Layers,
	Plus,
	Printer,
	QrCode,
	RotateCcw,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Thermometer,
	Trash2,
	Wind,
	X,
	XCircle,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import "./sterilizationJournal.css";
import {
	calculateKraftSterilityExpiration,
	calculatePsoSampleRequirements,
	ChamberControlPoint,
	ClinicRequisites,
	createDefaultChamberPoints,
	DEFAULT_CLINIC_REQUISITES,
	evaluatePsoTrial,
	exportForm257ToCsv,
	exportKraftPackagesToCsv,
	exportPsoToCsv,
	Form257CycleRecord,
	generateDigitalStampHash,
	generateForm257PrintHtml,
	generateKraftBarcode,
	generatePso366PrintHtml,
	KraftPackageItem,
	KraftPackagingType,
	PsoTestRecord,
	SANPIN_REGULATORY_META,
	STATUTORY_CHEMICAL_INDICATORS,
	STATUTORY_PACKAGING_TYPES,
	STATUTORY_REGIMES,
	STATUTORY_STERILIZERS,
	SterilizationRegimeCode,
	validateSterilizationCycle,
} from "./sterilizationSanpinEngine";

export interface SterilizationJournalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: "form257" | "pso366" | "kraft_packages" | "print_blanks";
	readonly clinicRequisites?: ClinicRequisites;
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL REALISTIC CLINICAL SEED DATA
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_FORM257_RECORDS: readonly Form257CycleRecord[] = [
	{
		id: "cyc-001",
		date: "2026-08-28",
		time: "08:30",
		cycleNumber: 1,
		sterilizerId: "autoclave-melag-vacuklav-23b",
		sterilizerCode: "АК-01",
		sterilizerBrandModel: "Melag Vacuklav 23 B+ (Класс B)",
		regimeId: "steam_134_5min",
		regimeNameRu: "Паровой 134°C / 5 мин (2.05–2.20 бар) — Скоростной B-класс",
		itemsDescriptionRu:
			"Наконечники турбинные NSK Ti-Max (4 шт), угловые микромоторные (4 шт), смотровые лотки (зеркала, зонды, пинцеты - 12 шт)",
		packsCount: 16,
		packagingType: "kraft_heat_sealed",
		actualTemperatureCelsius: 134.6,
		actualPressureBar: 2.16,
		actualExposureMinutes: 5.2,
		indicatorClass: "class5_integrating",
		indicatorTradeNameRu: "Интетест-В-134/5 (Внутренний)",
		chamberPoints: createDefaultChamberPoints("Интетест-В-134/5", true),
		areAllIndicatorsPassed: true,
		cycleStatus: "passed",
		failureReasons: [],
		operatorFullName: "Смирнова Анна Викторовна",
		operatorPosition: "Медсестра ЦСО",
		electronicSignatureHash: "ЭЦП-ЦСО-8F1A3B49-20260828",
		notes: "Утренний цикл, тест Бови-Дика пройден перед сменой",
		createdAt: "2026-08-28T08:30:00Z",
	},
	{
		id: "cyc-002",
		date: "2026-08-28",
		time: "10:15",
		cycleNumber: 2,
		sterilizerId: "autoclave-melag-vacuklav-23b",
		sterilizerCode: "АК-01",
		sterilizerBrandModel: "Melag Vacuklav 23 B+ (Класс B)",
		regimeId: "steam_134_20min_prion",
		regimeNameRu: "Паровой 134°C / 20 мин (2.05–2.20 бар) — Хирургический / Прионный",
		itemsDescriptionRu:
			"Хирургический имплантологический набор: элеваторы Бейна, щипцы экстракционные, костные распаторы Лукаса, хирургический шовный набор",
		packsCount: 8,
		packagingType: "laminated_heat_sealed",
		actualTemperatureCelsius: 134.4,
		actualPressureBar: 2.14,
		actualExposureMinutes: 20.5,
		indicatorClass: "class5_integrating",
		indicatorTradeNameRu: "Интетест-В-134/5 (Внутренний)",
		chamberPoints: createDefaultChamberPoints("Интетест-В-134/5", true),
		areAllIndicatorsPassed: true,
		cycleStatus: "passed",
		failureReasons: [],
		operatorFullName: "Смирнова Анна Викторовна",
		operatorPosition: "Медсестра ЦСО",
		electronicSignatureHash: "ЭЦП-ЦСО-4E2C910D-20260828",
		notes: "Двойной барьерный шов, имплантологическая операция на 14:00",
		createdAt: "2026-08-28T10:15:00Z",
	},
	{
		id: "cyc-003",
		date: "2026-08-27",
		time: "14:40",
		cycleNumber: 3,
		sterilizerId: "autoclave-euronda-e9-med",
		sterilizerCode: "АК-02",
		sterilizerBrandModel: "Euronda E9 Next Med (Класс B)",
		regimeId: "steam_121_20min",
		regimeNameRu: "Паровой 121°C / 20 мин (1.10–1.25 бар) — Щадящий (термолабильные)",
		itemsDescriptionRu: "Ретракторы OptraGate (10 шт), слепочные ложки силиконовые, автоклавируемые слюноотсосы",
		packsCount: 14,
		packagingType: "kraft_self_adhesive",
		actualTemperatureCelsius: 121.5,
		actualPressureBar: 1.15,
		actualExposureMinutes: 20.0,
		indicatorClass: "class4_multivariable",
		indicatorTradeNameRu: "Стеритест-В-121/20 (Многопеременный)",
		chamberPoints: createDefaultChamberPoints("Стеритест-В-121/20", true),
		areAllIndicatorsPassed: true,
		cycleStatus: "passed",
		failureReasons: [],
		operatorFullName: "Петрова Елена Сергеевна",
		operatorPosition: "Медсестра стерилизационной",
		electronicSignatureHash: "ЭЦП-ЦСО-7A9B1134-20260827",
		notes: "Деликатный режим полимеров",
		createdAt: "2026-08-27T14:40:00Z",
	},
	{
		id: "cyc-004",
		date: "2026-08-27",
		time: "16:20",
		cycleNumber: 4,
		sterilizerId: "dryheat-gpk-gp20",
		sterilizerCode: "СХ-01",
		sterilizerBrandModel: "ГП-20 СПУ (Сухожаровой шкаф)",
		regimeId: "dry_heat_180_60min",
		regimeNameRu: "Воздушный 180°C / 60 мин (0 бар) — Сухожаровой шкаф",
		itemsDescriptionRu: "Цельнометаллические шпатели, гладилки-штопферы, стоматологические лотки без оптики",
		packsCount: 10,
		packagingType: "kraft_heat_sealed",
		actualTemperatureCelsius: 180.8,
		actualPressureBar: 0.0,
		actualExposureMinutes: 60.0,
		indicatorClass: "class4_multivariable",
		indicatorTradeNameRu: "МедИС-В-180/60 (Для сухожаровых шкафов)",
		chamberPoints: createDefaultChamberPoints("МедИС-В-180/60", true),
		areAllIndicatorsPassed: true,
		cycleStatus: "passed",
		failureReasons: [],
		operatorFullName: "Петрова Елена Сергеевна",
		operatorPosition: "Медсестра стерилизационной",
		electronicSignatureHash: "ЭЦП-ЦСО-3B8F6290-20260827",
		notes: "Воздушная стерилизация металлических изделий",
		createdAt: "2026-08-27T16:20:00Z",
	},
];

const INITIAL_PSO_RECORDS: readonly PsoTestRecord[] = [
	{
		id: "pso-001",
		date: "2026-08-28",
		time: "08:00",
		instrumentName: "Терапевтические смотровые наборы (зеркала, зонды, пинцеты)",
		batchItemCount: 120,
		testedSampleCount: 4,
		minSampleRequired: 3,
		isSamplingSufficient: true,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isSudanNegative: true,
		detergentBrand: "«Дезодент» (концентрат 1.5%) + УЗ-ванна",
		isBatchApproved: true,
		rejectionReason: null,
		operatorFullName: "Смирнова Анна Викторовна",
		operatorPosition: "Медсестра ЦСО",
		electronicSignatureHash: "ЭЦП-ПСО-9C4D1892-20260828",
		notes: "Утренний контроль перед автоклавированием. Обе пробы отрицательные.",
		createdAt: "2026-08-28T08:00:00Z",
	},
	{
		id: "pso-002",
		date: "2026-08-28",
		time: "09:45",
		instrumentName: "Хирургический инструментарий (элеваторы, щипцы, кюреты)",
		batchItemCount: 45,
		testedSampleCount: 5,
		minSampleRequired: 5,
		isSamplingSufficient: true,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isSudanNegative: true,
		detergentBrand: "«Ника-Экстра М» (энзимный комплекс)",
		isBatchApproved: true,
		rejectionReason: null,
		operatorFullName: "Смирнова Анна Викторовна",
		operatorPosition: "Медсестра ЦСО",
		electronicSignatureHash: "ЭЦП-ПСО-3A1B9940-20260828",
		notes: "Хирургия, повышена выборка до 5 шт. Качество ПСО 100%.",
		createdAt: "2026-08-28T09:45:00Z",
	},
	{
		id: "pso-003",
		date: "2026-08-27",
		time: "13:30",
		instrumentName: "Эндодонтические инструменты (К-файлы, расширители каналов)",
		batchItemCount: 80,
		testedSampleCount: 3,
		minSampleRequired: 3,
		isSamplingSufficient: true,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isSudanNegative: true,
		detergentBrand: "«Эстилодез» (щелочной состав с ингибитором коррозии)",
		isBatchApproved: true,
		rejectionReason: null,
		operatorFullName: "Петрова Елена Сергеевна",
		operatorPosition: "Медсестра стерилизационной",
		electronicSignatureHash: "ЭЦП-ПСО-5F2D8811-20260827",
		notes: "УЗ-обработка 15 мин, нейтрализация дистиллированной водой.",
		createdAt: "2026-08-27T13:30:00Z",
	},
];

const INITIAL_KRAFT_PACKAGES: readonly KraftPackageItem[] = [
	{
		id: "kp-001",
		barcode: "DNT-AK01-B01-S001-20261017",
		batchNumber: "B01",
		packageSerialNumber: 1,
		toolSetNameRu: "Набор смотровой терапевтический № 1",
		itemsIncluded: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет анатомический"],
		packagingType: "kraft_heat_sealed",
		packagingNameRu: "Крафт-пакет бумажный (термосварка)",
		sterilizerCode: "АК-01",
		cycleNumber: 1,
		packDate: "2026-08-28",
		expDate: "2026-10-17",
		daysLifespan: 50,
		daysRemaining: 50,
		status: "sterile_valid",
		operatorFullName: "Смирнова А.В.",
		indicatorVerified: true,
		notes: "Шов термосварки 10 мм",
		createdAt: "2026-08-28T08:35:00Z",
	},
	{
		id: "kp-002",
		barcode: "DNT-AK01-B01-S002-20261017",
		batchNumber: "B01",
		packageSerialNumber: 2,
		toolSetNameRu: "Турбинный наконечник NSK Ti-Max X600L",
		itemsIncluded: ["Наконечник турбинный", "Ключ для ротора", "Насадка для смазки"],
		packagingType: "kraft_heat_sealed",
		packagingNameRu: "Крафт-пакет бумажный (термосварка)",
		sterilizerCode: "АК-01",
		cycleNumber: 1,
		packDate: "2026-08-28",
		expDate: "2026-10-17",
		daysLifespan: 50,
		daysRemaining: 50,
		status: "sterile_valid",
		operatorFullName: "Смирнова А.В.",
		indicatorVerified: true,
		notes: "Смазка сервис-маслом перед автоклавированием",
		createdAt: "2026-08-28T08:35:00Z",
	},
	{
		id: "kp-003",
		barcode: "DNT-AK01-B02-S001-20270224",
		batchNumber: "B02",
		packageSerialNumber: 1,
		toolSetNameRu: "Хирургический имплантологический сет № 1",
		itemsIncluded: ["Элеватор прямой", "Элеватор штыковидный", "Распатор костный", "Ножницы хирургические"],
		packagingType: "laminated_heat_sealed",
		packagingNameRu: "Комбинированный пакет пленка/бумага (термосварка)",
		sterilizerCode: "АК-01",
		cycleNumber: 2,
		packDate: "2026-08-28",
		expDate: "2027-02-24",
		daysLifespan: 180,
		daysRemaining: 180,
		status: "sterile_valid",
		operatorFullName: "Смирнова А.В.",
		indicatorVerified: true,
		notes: "Прозрачная сторона для быстрой идентификации",
		createdAt: "2026-08-28T10:20:00Z",
	},
	{
		id: "kp-004",
		barcode: "DNT-AK02-B03-S001-20260926",
		batchNumber: "B03",
		packageSerialNumber: 1,
		toolSetNameRu: "Слепочные ложки и ретракторы OptraGate",
		itemsIncluded: ["OptraGate Regular (5 шт)", "Ложки металлические (2 шт)"],
		packagingType: "kraft_self_adhesive",
		packagingNameRu: "Крафт-пакет бумажный (самоклеящийся клапан)",
		sterilizerCode: "АК-02",
		cycleNumber: 3,
		packDate: "2026-08-27",
		expDate: "2026-09-26",
		daysLifespan: 30,
		daysRemaining: 29,
		status: "sterile_valid",
		operatorFullName: "Петрова Е.С.",
		indicatorVerified: true,
		notes: "Липкий клапан плотно прижат",
		createdAt: "2026-08-27T14:45:00Z",
	},
];

export function SterilizationJournalModal({
	isOpen,
	onClose,
	initialTab = "form257",
	clinicRequisites = DEFAULT_CLINIC_REQUISITES,
}: SterilizationJournalModalProps) {
	const [activeTab, setActiveTab] = useState<"form257" | "pso366" | "kraft_packages" | "print_blanks">(initialTab);

	// In-memory data states
	const [cycles, setCycles] = useState<readonly Form257CycleRecord[]>(INITIAL_FORM257_RECORDS);
	const [psoRecords, setPsoRecords] = useState<readonly PsoTestRecord[]>(INITIAL_PSO_RECORDS);
	const [kraftPackages, setKraftPackages] = useState<readonly KraftPackageItem[]>(INITIAL_KRAFT_PACKAGES);

	// Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedSterilizerFilter, setSelectedSterilizerFilter] = useState("all");
	const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

	// Barcode search / scanner box
	const [scannedBarcode, setScannedBarcode] = useState("");
	const [selectedPackageForSticker, setSelectedPackageForSticker] = useState<KraftPackageItem | null>(
		INITIAL_KRAFT_PACKAGES[0] ?? null,
	);

	// Submodals
	const [isAddCycleOpen, setIsAddCycleOpen] = useState(false);
	const [isAddPsoOpen, setIsAddPsoOpen] = useState(false);
	const [isAddKraftBatchOpen, setIsAddKraftBatchOpen] = useState(false);

	// Print Blank Type selector
	const [selectedPrintBlank, setSelectedPrintBlank] = useState<"257" | "366">("257");

	// ─── ADD CYCLE FORM STATE ──────────────────────────────────────────────────
	const [newCycleSterilizerId, setNewCycleSterilizerId] = useState(STATUTORY_STERILIZERS[0]!.id);
	const [newCycleRegimeId, setNewCycleRegimeId] = useState<SterilizationRegimeCode>(STATUTORY_REGIMES[0]!.id);
	const [newCycleItemsDesc, setNewCycleItemsDesc] = useState("Стоматологические лотки смотровые, наконечники турбинные");
	const [newCyclePackaging, setNewCyclePackaging] = useState<KraftPackagingType>("kraft_heat_sealed");
	const [newCyclePacksCount, setNewCyclePacksCount] = useState(12);
	const [newCycleTemp, setNewCycleTemp] = useState(134.5);
	const [newCyclePressure, setNewCyclePressure] = useState(2.15);
	const [newCycleTime, setNewCycleTime] = useState(5.0);
	const [newCycleIndicatorId, setNewCycleIndicatorId] = useState(STATUTORY_CHEMICAL_INDICATORS[0]!.id);
	const [newCycleChamberPoints, setNewCycleChamberPoints] = useState<ChamberControlPoint[]>(
		createDefaultChamberPoints("Интетест-В-134/5", true),
	);
	const [newCycleOperator, setNewCycleOperator] = useState("Смирнова Анна Викторовна");
	const [newCycleNotes, setNewCycleNotes] = useState("");

	// ─── ADD PSO FORM STATE ────────────────────────────────────────────────────
	const [newPsoInstrument, setNewPsoInstrument] = useState("Терапевтический инструментарий (зеркала, зонды, гладилки)");
	const [newPsoBatchCount, setNewPsoBatchCount] = useState(100);
	const [newPsoTestedCount, setNewPsoTestedCount] = useState(3);
	const [newPsoIsSurgical, setNewPsoIsSurgical] = useState(false);
	const [newPsoIsAzopyramNeg, setNewPsoIsAzopyramNeg] = useState(true);
	const [newPsoIsPhenolNeg, setNewPsoIsPhenolNeg] = useState(true);
	const [newPsoIsSudanNeg, setNewPsoIsSudanNeg] = useState(true);
	const [newPsoDetergent, setNewPsoDetergent] = useState("«Дезодент» (концентрат 1.5%) + УЗ-мойка");
	const [newPsoOperator, setNewPsoOperator] = useState("Смирнова Анна Викторовна");
	const [newPsoNotes, setNewPsoNotes] = useState("");

	// ─── ADD KRAFT BATCH FORM STATE ────────────────────────────────────────────
	const [newBatchToolName, setNewBatchToolName] = useState("Набор терапевтический стандартный");
	const [newBatchItemsText, setNewBatchItemsText] = useState("Зеркало стоматологическое, зонд угловой, пинцет, штопфер-гладилка");
	const [newBatchPkgType, setNewBatchPkgType] = useState<KraftPackagingType>("kraft_heat_sealed");
	const [newBatchSterilizerCode, setNewBatchSterilizerCode] = useState("АК-01");
	const [newBatchCycleNumber, setNewBatchCycleNumber] = useState(1);
	const [newBatchQuantity, setNewBatchQuantity] = useState(10);
	const [newBatchOperator, setNewBatchOperator] = useState("Смирнова А.В.");
	const [newBatchNotes, setNewBatchNotes] = useState("");

	if (!isOpen) return null;

	// ─── FILTERED LISTS ────────────────────────────────────────────────────────
	const filteredCycles = cycles.filter((c) => {
		const matchesSearch =
			c.itemsDescriptionRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.sterilizerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.operatorFullName.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesSterilizer =
			selectedSterilizerFilter === "all" || c.sterilizerId === selectedSterilizerFilter;
		const matchesStatus = selectedStatusFilter === "all" || c.cycleStatus === selectedStatusFilter;
		return matchesSearch && matchesSterilizer && matchesStatus;
	});

	const filteredPso = psoRecords.filter((p) => {
		const matchesSearch =
			p.instrumentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.operatorFullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.detergentBrand.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesStatus =
			selectedStatusFilter === "all" ||
			(selectedStatusFilter === "passed" && p.isBatchApproved) ||
			(selectedStatusFilter === "failed" && !p.isBatchApproved);
		return matchesSearch && matchesStatus;
	});

	const filteredKraftPackages = kraftPackages.filter((kp) => {
		const matchesSearch =
			kp.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
			kp.toolSetNameRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
			kp.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesBarcode = !scannedBarcode || kp.barcode.toUpperCase().includes(scannedBarcode.toUpperCase());
		return matchesSearch && matchesBarcode;
	});

	// ─── ACTION HANDLERS ───────────────────────────────────────────────────────
	const handleSaveNewCycle = (e: React.FormEvent) => {
		e.preventDefault();
		const sterilizer = STATUTORY_STERILIZERS.find((s) => s.id === newCycleSterilizerId) ?? STATUTORY_STERILIZERS[0]!;
		const regime = STATUTORY_REGIMES.find((r) => r.id === newCycleRegimeId) ?? STATUTORY_REGIMES[0]!;
		const indicator =
			STATUTORY_CHEMICAL_INDICATORS.find((i) => i.id === newCycleIndicatorId) ?? STATUTORY_CHEMICAL_INDICATORS[0]!;

		const validation = validateSterilizationCycle({
			regimeId: newCycleRegimeId,
			actualTemperatureCelsius: newCycleTemp,
			actualPressureBar: newCyclePressure,
			actualExposureMinutes: newCycleTime,
			chamberPoints: newCycleChamberPoints,
		});

		const now = new Date();
		const pad2 = (n: number) => String(n).padStart(2, "0");
		const dateStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
		const timeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
		const nextCycleNum =
			cycles.filter((c) => c.date === dateStr && c.sterilizerId === sterilizer.id).length + 1;

		const hash = generateDigitalStampHash({
			date: dateStr,
			cycleNumber: nextCycleNum,
			operatorFullName: newCycleOperator,
		});

		const newRecord: Form257CycleRecord = {
			id: `cyc-${Date.now()}`,
			date: dateStr,
			time: timeStr,
			cycleNumber: nextCycleNum,
			sterilizerId: sterilizer.id,
			sterilizerCode: sterilizer.code,
			sterilizerBrandModel: sterilizer.brandModel,
			regimeId: regime.id,
			regimeNameRu: regime.nameRu,
			itemsDescriptionRu: newCycleItemsDesc,
			packsCount: newCyclePacksCount,
			packagingType: newCyclePackaging,
			actualTemperatureCelsius: newCycleTemp,
			actualPressureBar: newCyclePressure,
			actualExposureMinutes: newCycleTime,
			indicatorClass: indicator.indicatorClass,
			indicatorTradeNameRu: indicator.tradeNameRu,
			chamberPoints: newCycleChamberPoints,
			areAllIndicatorsPassed: validation.areIndicatorsCompliant,
			cycleStatus: validation.isValid ? "passed" : "failed",
			failureReasons: validation.failureReasons,
			operatorFullName: newCycleOperator,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: hash,
			notes: newCycleNotes,
			createdAt: new Date().toISOString(),
		};

		setCycles([newRecord, ...cycles]);
		setIsAddCycleOpen(false);
		showToast(
			validation.isValid
				? `Цикл № ${nextCycleNum} (${sterilizer.code}) успешно зарегистрирован. Статус: СТЕРИЛЬНО.`
				: `Внимание: Цикл № ${nextCycleNum} зафиксирован со статусом БРАК (${validation.failureReasons.join(", ")})`,
			validation.isValid ? "success" : "warning",
		);
	};

	const handleSaveNewPso = (e: React.FormEvent) => {
		e.preventDefault();
		const psoEval = evaluatePsoTrial({
			batchCount: newPsoBatchCount,
			testedSampleCount: newPsoTestedCount,
			isAzopyramNegative: newPsoIsAzopyramNeg,
			isPhenolphthaleinNegative: newPsoIsPhenolNeg,
			isSudanNegative: newPsoIsSudanNeg,
			isSurgicalOrCritical: newPsoIsSurgical,
		});

		const now = new Date();
		const pad2 = (n: number) => String(n).padStart(2, "0");
		const dateStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
		const timeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

		const hash = generateDigitalStampHash({
			date: dateStr,
			cycleNumber: psoRecords.length + 1,
			operatorFullName: newPsoOperator,
			secretSalt: "SANPIN_PSO_SIG",
		});

		const newRecord: PsoTestRecord = {
			id: `pso-${Date.now()}`,
			date: dateStr,
			time: timeStr,
			instrumentName: newPsoInstrument,
			batchItemCount: newPsoBatchCount,
			testedSampleCount: newPsoTestedCount,
			minSampleRequired: psoEval.minSampleRequired,
			isSamplingSufficient: psoEval.isSamplingSufficient,
			isAzopyramNegative: newPsoIsAzopyramNeg,
			isPhenolphthaleinNegative: newPsoIsPhenolNeg,
			isSudanNegative: newPsoIsSudanNeg,
			detergentBrand: newPsoDetergent,
			isBatchApproved: psoEval.isBatchApproved,
			rejectionReason: psoEval.rejectionReason,
			operatorFullName: newPsoOperator,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: hash,
			notes: newPsoNotes,
			createdAt: new Date().toISOString(),
		};

		setPsoRecords([newRecord, ...psoRecords]);
		setIsAddPsoOpen(false);
		showToast(
			psoEval.isBatchApproved
				? "Проба ПСО успешно зарегистрирована (Азопирам и Фенолфталеин отр.). Партия допущена к стерилизации."
				: `Внимание: ПСО забракована! ${psoEval.rejectionReason}`,
			psoEval.isBatchApproved ? "success" : "warning",
		);
	};

	const handleGenerateKraftBatch = (e: React.FormEvent) => {
		e.preventDefault();
		const now = new Date();
		const pad2 = (n: number) => String(n).padStart(2, "0");
		const dateStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
		const batchNum = `B${pad2(kraftPackages.length + 1)}`;
		const itemsArr = newBatchItemsText.split(",").map((s) => s.trim()).filter(Boolean);

		const expiry = calculateKraftSterilityExpiration(dateStr, newBatchPkgType);

		const generatedList: KraftPackageItem[] = [];
		for (let i = 1; i <= newBatchQuantity; i++) {
			const barcode = generateKraftBarcode({
				batchNumber: batchNum,
				serialNumber: i,
				expDateIsoOrFormatted: expiry.expDateFormatted,
				sterilizerCode: newBatchSterilizerCode,
			});

			generatedList.push({
				id: `kp-${Date.now()}-${i}`,
				barcode,
				batchNumber: batchNum,
				packageSerialNumber: i,
				toolSetNameRu: newBatchToolName,
				itemsIncluded: itemsArr.length > 0 ? itemsArr : [newBatchToolName],
				packagingType: newBatchPkgType,
				packagingNameRu: STATUTORY_PACKAGING_TYPES[newBatchPkgType]?.nameRu ?? newBatchPkgType,
				sterilizerCode: newBatchSterilizerCode,
				cycleNumber: newBatchCycleNumber,
				packDate: dateStr,
				expDate: expiry.expDateFormatted,
				daysLifespan: expiry.daysLifespan,
				daysRemaining: expiry.daysRemaining,
				status: expiry.status,
				operatorFullName: newBatchOperator,
				indicatorVerified: true,
				notes: newBatchNotes,
				createdAt: new Date().toISOString(),
			});
		}

		setKraftPackages([...generatedList, ...kraftPackages]);
		if (generatedList[0]) setSelectedPackageForSticker(generatedList[0]);
		setIsAddKraftBatchOpen(false);
		showToast(
			`Сгенерирована партия из ${newBatchQuantity} крафт-пакетов (${batchNum}). Срок стерильности: ${expiry.expDateFormatted} (${expiry.daysLifespan} сут.).`,
			"success",
		);
	};

	const handleDownloadCsv = (type: "257" | "366" | "kraft") => {
		let csv = "";
		let filename = "";
		if (type === "257") {
			csv = exportForm257ToCsv(cycles);
			filename = `SanPiN_Form_257u_${new Date().toISOString().slice(0, 10)}.csv`;
		} else if (type === "366") {
			csv = exportPsoToCsv(psoRecords);
			filename = `SanPiN_Form_366u_PSO_${new Date().toISOString().slice(0, 10)}.csv`;
		} else {
			csv = exportKraftPackagesToCsv(kraftPackages);
			filename = `SanPiN_Kraft_Packages_${new Date().toISOString().slice(0, 10)}.csv`;
		}

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		showToast(`Файл ${filename} успешно экспортирован`, "success");
	};

	const handlePrintBlanks = () => {
		const html =
			selectedPrintBlank === "257"
				? generateForm257PrintHtml(cycles, clinicRequisites)
				: generatePso366PrintHtml(psoRecords, clinicRequisites);

		const printWin = window.open("", "_blank", "width=1100,height=800");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 350);
		} else {
			showToast("Не удалось открыть окно печати. Разрешите всплывающие окна.", "error");
		}
	};

	const printHtmlForPreview = useMemo(() => {
		return selectedPrintBlank === "257"
			? generateForm257PrintHtml(cycles, clinicRequisites)
			: generatePso366PrintHtml(psoRecords, clinicRequisites);
	}, [selectedPrintBlank, cycles, psoRecords, clinicRequisites]);

	// Auto-calculated PSO min sample for form
	const currentPsoMinRequirement = useMemo(() => {
		return calculatePsoSampleRequirements(newPsoBatchCount, newPsoIsSurgical);
	}, [newPsoBatchCount, newPsoIsSurgical]);

	return (
		<div className="steril-journal-overlay" role="dialog" aria-modal="true">
			<div className="steril-journal-container">
				{/* ─── MODAL HEADER ──────────────────────────────────────────────── */}
				<div className="steril-journal-header">
					<div className="steril-header-left">
						<div className="steril-header-icon">
							<ShieldCheck size={24} />
						</div>
						<div className="steril-header-title">
							<h2>Центр контроля стерилизации и качества ПСО</h2>
							<p>
								{SANPIN_REGULATORY_META.standardRu} (Раздел IV) • Форма № 257/у • Форма № 366/у • Крафт-трейсинг
							</p>
						</div>
					</div>
					<div className="steril-header-actions">
						<button
							type="button"
							className="steril-close-btn"
							onClick={onClose}
							title="Закрыть журнал (Esc)"
							aria-label="Закрыть"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				{/* ─── TABS NAVIGATION ───────────────────────────────────────────── */}
				<div className="steril-tabs-bar">
					<button
						type="button"
						className={`steril-tab-btn ${activeTab === "form257" ? "active" : ""}`}
						onClick={() => setActiveTab("form257")}
					>
						<Flame size={16} />
						<span>Журнал 257/у (Автоклавы)</span>
						<span className="steril-tab-badge">{cycles.length}</span>
					</button>

					<button
						type="button"
						className={`steril-tab-btn ${activeTab === "pso366" ? "active" : ""}`}
						onClick={() => setActiveTab("pso366")}
					>
						<FlaskConical size={16} />
						<span>Журнал ПСО (Форма 366/у)</span>
						<span className="steril-tab-badge">{psoRecords.length}</span>
					</button>

					<button
						type="button"
						className={`steril-tab-btn ${activeTab === "kraft_packages" ? "active" : ""}`}
						onClick={() => setActiveTab("kraft_packages")}
					>
						<Barcode size={16} />
						<span>Крафт-пакеты и Штрихкодирование</span>
						<span className="steril-tab-badge">{kraftPackages.length}</span>
					</button>

					<button
						type="button"
						className={`steril-tab-btn ${activeTab === "print_blanks" ? "active" : ""}`}
						onClick={() => setActiveTab("print_blanks")}
					>
						<Printer size={16} />
						<span>Печать официальных бланков</span>
					</button>
				</div>

				{/* ─── TAB 1: FORM 257/U (AUTOCLAVES & STERILIZERS) ─────────────── */}
				{activeTab === "form257" && (
					<div className="steril-body-content">
						{/* Stat Cards */}
						<div className="steril-stats-grid">
							<div className="steril-stat-card">
								<div className="steril-stat-icon teal">
									<Activity size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">{cycles.length}</span>
									<span className="steril-stat-label">Всего циклов за период</span>
								</div>
							</div>

							<div className="steril-stat-card">
								<div className="steril-stat-icon blue">
									<CheckCircle2 size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">
										{cycles.filter((c) => c.cycleStatus === "passed").length}
									</span>
									<span className="steril-stat-label">Стерильно (100% КТ)</span>
								</div>
							</div>

							<div className="steril-stat-card">
								<div className="steril-stat-icon amber">
									<Layers size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">
										{cycles.reduce((acc, c) => acc + c.packsCount, 0)} шт.
									</span>
									<span className="steril-stat-label">Стерилизовано упаковок</span>
								</div>
							</div>

							<div className="steril-stat-card">
								<div className="steril-stat-icon rose">
									<ShieldAlert size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">
										{cycles.filter((c) => c.cycleStatus === "failed").length}
									</span>
									<span className="steril-stat-label">Отклонено / Брак параметров</span>
								</div>
							</div>
						</div>

						{/* Controls Toolbar */}
						<div className="steril-toolbar">
							<div className="steril-toolbar-filters">
								<div className="steril-search-input">
									<Search size={16} />
									<input
										type="text"
										placeholder="Поиск по инструментам или оператору..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>

								<select
									className="steril-select"
									value={selectedSterilizerFilter}
									onChange={(e) => setSelectedSterilizerFilter(e.target.value)}
								>
									<option value="all">Все стерилизаторы</option>
									{STATUTORY_STERILIZERS.map((s) => (
										<option key={s.id} value={s.id}>
											{s.code}: {s.brandModel}
										</option>
									))}
								</select>

								<select
									className="steril-select"
									value={selectedStatusFilter}
									onChange={(e) => setSelectedStatusFilter(e.target.value)}
								>
									<option value="all">Все статусы</option>
									<option value="passed">Стерильно (Допущен)</option>
									<option value="failed">Брак (Отклонен)</option>
								</select>
							</div>

							<div className="steril-toolbar-actions">
								<button
									type="button"
									className="btn-steril-primary"
									onClick={() => setIsAddCycleOpen(true)}
								>
									<Plus size={16} />
									<span>Новый цикл (Форма 257/у)</span>
								</button>
								<button
									type="button"
									className="btn-steril-secondary"
									onClick={() => handleDownloadCsv("257")}
									title="Экспорт в CSV"
								>
									<Download size={16} />
									<span>Экспорт CSV</span>
								</button>
							</div>
						</div>

						{/* Cycles Table */}
						<div className="steril-table-wrap">
							<table className="steril-data-table">
								<thead>
									<tr>
										<th>Дата/Время</th>
										<th>Стерилизатор</th>
										<th>№ цикла</th>
										<th>Изделия и упаковка</th>
										<th>Режим (t°, P, время)</th>
										<th>Хим. Индикатор (КТ 1-5)</th>
										<th>Результат</th>
										<th>Медсестра ЦСО / ЭЦП</th>
									</tr>
								</thead>
								<tbody>
									{filteredCycles.length === 0 ? (
										<tr>
											<td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
												Записи работы стерилизаторов не найдены
											</td>
										</tr>
									) : (
										filteredCycles.map((c) => (
											<tr key={c.id}>
												<td>
													<div style={{ fontWeight: 600 }}>{c.date}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{c.time}</div>
												</td>
												<td>
													<div style={{ fontWeight: 700, color: "var(--teal)" }}>{c.sterilizerCode}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														{c.sterilizerBrandModel}
													</div>
												</td>
												<td style={{ textAlign: "center", fontWeight: 700 }}>{c.cycleNumber}</td>
												<td style={{ maxWidth: "260px" }}>
													<div style={{ fontWeight: 600 }}>{c.itemsDescriptionRu}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "2px" }}>
														Упаковка: {STATUTORY_PACKAGING_TYPES[c.packagingType]?.nameRu ?? c.packagingType}{" "}
														({c.packsCount} шт.)
													</div>
												</td>
												<td>
													<div style={{ fontWeight: 600 }}>
														{c.actualTemperatureCelsius}°C • {c.actualPressureBar} бар
													</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														Экспозиция: {c.actualExposureMinutes} мин
													</div>
												</td>
												<td>
													<div style={{ fontWeight: 600 }}>{c.indicatorTradeNameRu}</div>
													<div style={{ fontSize: "0.75rem" }}>
														{c.areAllIndicatorsPassed ? (
															<span style={{ color: "#059669" }}>✓ Все 5 точек КТ ОК</span>
														) : (
															<span style={{ color: "#dc2626" }}>✗ Отказ индикатора</span>
														)}
													</div>
												</td>
												<td>
													<span
														className={`badge-status ${c.cycleStatus === "passed" ? "success" : "danger"}`}
													>
														{c.cycleStatus === "passed" ? "СТЕРИЛЬНО" : "БРАК"}
													</span>
												</td>
												<td>
													<div style={{ fontWeight: 600 }}>{c.operatorFullName}</div>
													<div
														style={{
															fontSize: "0.7rem",
															fontFamily: "monospace",
															color: "var(--teal)",
															marginTop: "2px",
														}}
													>
														{c.electronicSignatureHash}
													</div>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* ─── TAB 2: PSO QUALITY CONTROL (FORM 366/U) ──────────────────── */}
				{activeTab === "pso366" && (
					<div className="steril-body-content">
						{/* Stat Cards */}
						<div className="steril-stats-grid">
							<div className="steril-stat-card">
								<div className="steril-stat-icon teal">
									<FlaskConical size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">{psoRecords.length}</span>
									<span className="steril-stat-label">Проведено серий проб ПСО</span>
								</div>
							</div>

							<div className="steril-stat-card">
								<div className="steril-stat-icon blue">
									<Droplets size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">
										{psoRecords.reduce((acc, p) => acc + p.testedSampleCount, 0)} шт.
									</span>
									<span className="steril-stat-label">Проверено контрольных образцов</span>
								</div>
							</div>

							<div className="steril-stat-card">
								<div className="steril-stat-icon amber">
									<ShieldCheck size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">100%</span>
									<span className="steril-stat-label">Азопирам (отсутствие крови)</span>
								</div>
							</div>

							<div className="steril-stat-card">
								<div className="steril-stat-icon rose">
									<ShieldCheck size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">100%</span>
									<span className="steril-stat-label">Фенолфталеин (отсутствие щелочи)</span>
								</div>
							</div>
						</div>

						{/* Controls Toolbar */}
						<div className="steril-toolbar">
							<div className="steril-toolbar-filters">
								<div className="steril-search-input">
									<Search size={16} />
									<input
										type="text"
										placeholder="Поиск по инструментам или средству..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>

								<select
									className="steril-select"
									value={selectedStatusFilter}
									onChange={(e) => setSelectedStatusFilter(e.target.value)}
								>
									<option value="all">Все результаты</option>
									<option value="passed">Годно (Отрицательные пробы)</option>
									<option value="failed">Брак (Положительная проба)</option>
								</select>
							</div>

							<div className="steril-toolbar-actions">
								<button
									type="button"
									className="btn-steril-primary"
									onClick={() => setIsAddPsoOpen(true)}
								>
									<Plus size={16} />
									<span>Новая проба ПСО (Форма 366/у)</span>
								</button>
								<button
									type="button"
									className="btn-steril-secondary"
									onClick={() => handleDownloadCsv("366")}
									title="Экспорт в CSV"
								>
									<Download size={16} />
									<span>Экспорт CSV</span>
								</button>
							</div>
						</div>

						{/* PSO Table */}
						<div className="steril-table-wrap">
							<table className="steril-data-table">
								<thead>
									<tr>
										<th>Дата/Время</th>
										<th>Наименование изделий</th>
										<th>Партия</th>
										<th>Выборка (Факт / Норма)</th>
										<th>Азопирамовая проба (Кровь)</th>
										<th>Фенолфталеиновая (Щелочь)</th>
										<th>Судан III (Масло)</th>
										<th>Заключение</th>
										<th>Медсестра ЦСО</th>
									</tr>
								</thead>
								<tbody>
									{filteredPso.length === 0 ? (
										<tr>
											<td colSpan={9} style={{ textAlign: "center", padding: "2rem" }}>
												Записи проб ПСО не найдены
											</td>
										</tr>
									) : (
										filteredPso.map((p) => (
											<tr key={p.id}>
												<td>
													<div style={{ fontWeight: 600 }}>{p.date}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{p.time}</div>
												</td>
												<td style={{ maxWidth: "260px" }}>
													<div style={{ fontWeight: 600 }}>{p.instrumentName}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														Моющее: {p.detergentBrand}
													</div>
												</td>
												<td style={{ textAlign: "center", fontWeight: 700 }}>{p.batchItemCount} шт.</td>
												<td style={{ textAlign: "center" }}>
													<span style={{ fontWeight: 600 }}>{p.testedSampleCount} шт.</span>
													<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														{" "}
														(мин. {p.minSampleRequired})
													</span>
												</td>
												<td>
													<span
														className={`badge-status ${p.isAzopyramNegative ? "success" : "danger"}`}
													>
														{p.isAzopyramNegative ? "Отрицательная (ОК)" : "ПОЛОЖИТЕЛЬНАЯ (Кровь)"}
													</span>
												</td>
												<td>
													<span
														className={`badge-status ${p.isPhenolphthaleinNegative ? "success" : "danger"}`}
													>
														{p.isPhenolphthaleinNegative
															? "Отрицательная (ОК)"
															: "ПОЛОЖИТЕЛЬНАЯ (Щелочь)"}
													</span>
												</td>
												<td>
													<span
														className={`badge-status ${p.isSudanNegative ? "success" : "danger"}`}
													>
														{p.isSudanNegative ? "Отрицательная" : "ПОЛОЖИТЕЛЬНАЯ"}
													</span>
												</td>
												<td>
													<span
														className={`badge-status ${p.isBatchApproved ? "success" : "danger"}`}
													>
														{p.isBatchApproved ? "ПСО ПРОЙДЕНА" : "БРАК / ВОЗВРАТ"}
													</span>
												</td>
												<td>
													<div style={{ fontWeight: 600 }}>{p.operatorFullName}</div>
													<div
														style={{
															fontSize: "0.7rem",
															fontFamily: "monospace",
															color: "var(--teal)",
															marginTop: "2px",
														}}
													>
														{p.electronicSignatureHash}
													</div>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* ─── TAB 3: KRAFT PACKAGES & BARCODING ─────────────────────────── */}
				{activeTab === "kraft_packages" && (
					<div className="steril-body-content">
						{/* Barcode Search Box & Stats */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 300px",
								gap: "1.25rem",
								alignItems: "start",
							}}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
								<div className="steril-stats-grid">
									<div className="steril-stat-card">
										<div className="steril-stat-icon teal">
											<Barcode size={20} />
										</div>
										<div className="steril-stat-info">
											<span className="steril-stat-value">{kraftPackages.length}</span>
											<span className="steril-stat-label">Активных упаковок в обороте</span>
										</div>
									</div>

									<div className="steril-stat-card">
										<div className="steril-stat-icon blue">
											<Clock size={20} />
										</div>
										<div className="steril-stat-info">
											<span className="steril-stat-value">
												{kraftPackages.filter((kp) => kp.status === "sterile_valid").length}
											</span>
											<span className="steril-stat-label">Стерильность подтверждена</span>
										</div>
									</div>

									<div className="steril-stat-card">
										<div className="steril-stat-icon amber">
											<AlertTriangle size={20} />
										</div>
										<div className="steril-stat-info">
											<span className="steril-stat-value">
												{kraftPackages.filter((kp) => kp.status === "expiring_soon_7d").length}
											</span>
											<span className="steril-stat-label">Истекает в теч. 7 дней</span>
										</div>
									</div>
								</div>

								{/* Toolbar */}
								<div className="steril-toolbar">
									<div className="steril-toolbar-filters">
										<div className="steril-search-input" style={{ minWidth: "300px" }}>
											<Barcode size={18} />
											<input
												type="text"
												placeholder="Сканировать или ввести штрихкод..."
												value={scannedBarcode}
												onChange={(e) => setScannedBarcode(e.target.value)}
											/>
											{scannedBarcode && (
												<button
													type="button"
													onClick={() => setScannedBarcode("")}
													style={{
														background: "none",
														border: "none",
														cursor: "pointer",
														color: "var(--muted)",
													}}
												>
													<X size={14} />
												</button>
											)}
										</div>
									</div>

									<div className="steril-toolbar-actions">
										<button
											type="button"
											className="btn-steril-primary"
											onClick={() => setIsAddKraftBatchOpen(true)}
										>
											<Plus size={16} />
											<span>Сформировать партию пакетов</span>
										</button>
										<button
											type="button"
											className="btn-steril-secondary"
											onClick={() => handleDownloadCsv("kraft")}
										>
											<Download size={16} />
											<span>Экспорт CSV</span>
										</button>
									</div>
								</div>

								{/* Kraft Table */}
								<div className="steril-table-wrap">
									<table className="steril-data-table">
										<thead>
											<tr>
												<th>Штрихкод</th>
												<th>Набор инструментов</th>
												<th>Упаковка</th>
												<th>Стерилизация</th>
												<th>Срок годности</th>
												<th>Статус</th>
												<th>Действие</th>
											</tr>
										</thead>
										<tbody>
											{filteredKraftPackages.length === 0 ? (
												<tr>
													<td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
														Крафт-пакеты не найдены
													</td>
												</tr>
											) : (
												filteredKraftPackages.map((kp) => (
													<tr
														key={kp.id}
														onClick={() => setSelectedPackageForSticker(kp)}
														style={{
															cursor: "pointer",
															background:
																selectedPackageForSticker?.id === kp.id
																	? "rgba(13, 148, 136, 0.08)"
																	: "transparent",
														}}
													>
														<td style={{ fontFamily: "monospace", fontWeight: 700 }}>
															{kp.barcode}
														</td>
														<td>
															<div style={{ fontWeight: 600 }}>{kp.toolSetNameRu}</div>
															<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
																Партия: {kp.batchNumber} • №{kp.packageSerialNumber}
															</div>
														</td>
														<td style={{ fontSize: "0.8rem" }}>{kp.packagingNameRu}</td>
														<td>
															<div>{kp.packDate}</div>
															<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
																{kp.sterilizerCode} (Цикл {kp.cycleNumber})
															</div>
														</td>
														<td>
															<div style={{ fontWeight: 600 }}>{kp.expDate}</div>
															<div style={{ fontSize: "0.75rem", color: "var(--teal)" }}>
																Осталось: {kp.daysRemaining} дн.
															</div>
														</td>
														<td>
															<span
																className={`badge-status ${
																	kp.status === "sterile_valid"
																		? "success"
																		: kp.status === "expiring_soon_7d"
																			? "warning"
																			: "danger"
																}`}
															>
																{kp.status === "sterile_valid"
																	? "Стерильно"
																	: kp.status === "expiring_soon_7d"
																		? "Истекает"
																		: "Просрочено"}
															</span>
														</td>
														<td>
															<button
																type="button"
																className="btn-steril-secondary"
																style={{ height: "28px", padding: "0 0.5rem", fontSize: "0.75rem" }}
																onClick={(e) => {
																	e.stopPropagation();
																	setSelectedPackageForSticker(kp);
																	showToast(
																		`Этикетка ${kp.barcode} подготовлена к термопечати`,
																		"info",
																	);
																}}
															>
																<Printer size={12} />
																<span>Стикер</span>
															</button>
														</td>
													</tr>
												))
											)}
										</tbody>
									</table>
								</div>
							</div>

							{/* Thermal Sticker Preview Box (58x40mm) */}
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "0.75rem",
									padding: "1rem",
									background: "var(--paper-soft)",
									border: "1px solid var(--line)",
									borderRadius: "14px",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<QrCode size={18} color="var(--teal)" />
									<span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Термостикер 58×40 мм</span>
								</div>

								{selectedPackageForSticker ? (
									<div className="steril-sticker-preview">
										<div className="steril-sticker-header">
											<span>{clinicRequisites.clinicName}</span>
											<span>{selectedPackageForSticker.sterilizerCode}</span>
										</div>

										<div style={{ fontSize: "10px", fontWeight: "bold", margin: "2px 0" }}>
											{selectedPackageForSticker.toolSetNameRu}
										</div>

										<div style={{ fontSize: "8.5px", color: "#333" }}>
											Дата стерил.: {selectedPackageForSticker.packDate} (Цикл{" "}
											{selectedPackageForSticker.cycleNumber})
										</div>

										<div className="steril-sticker-barcode-box">
											<div className="steril-barcode-bars">||||| | |||| ||| |||| |</div>
											<div style={{ fontSize: "8px", fontWeight: "bold" }}>
												{selectedPackageForSticker.barcode}
											</div>
										</div>

										<div className="steril-sticker-footer">
											<span>Годен до: {selectedPackageForSticker.expDate}</span>
											<span>Оператор: {selectedPackageForSticker.operatorFullName}</span>
										</div>
									</div>
								) : (
									<div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
										Выберите пакет для предпросмотра
									</div>
								)}

								<button
									type="button"
									className="btn-steril-primary"
									style={{ width: "100%", justifyContent: "center" }}
									onClick={() => {
										if (selectedPackageForSticker) {
											showToast(
												`Печать термоэтикетки 58x40 мм: ${selectedPackageForSticker.barcode}`,
												"success",
											);
										}
									}}
								>
									<Printer size={16} />
									<span>Печать термоэтикетки (58x40)</span>
								</button>
							</div>
						</div>
					</div>
				)}

				{/* ─── TAB 4: OFFICIAL PRINTABLE BLANKS ──────────────────────────── */}
				{activeTab === "print_blanks" && (
					<div className="steril-body-content">
						<div className="steril-toolbar">
							<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.4rem",
										cursor: "pointer",
										fontWeight: 600,
									}}
								>
									<input
										type="radio"
										name="printBlank"
										checked={selectedPrintBlank === "257"}
										onChange={() => setSelectedPrintBlank("257")}
									/>
									<span>Форма № 257/у (Журнал работы стерилизаторов)</span>
								</label>

								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.4rem",
										cursor: "pointer",
										fontWeight: 600,
									}}
								>
									<input
										type="radio"
										name="printBlank"
										checked={selectedPrintBlank === "366"}
										onChange={() => setSelectedPrintBlank("366")}
									/>
									<span>Форма № 366/у (Журнал контроля качества ПСО)</span>
								</label>
							</div>

							<div className="steril-toolbar-actions">
								<button type="button" className="btn-steril-primary" onClick={handlePrintBlanks}>
									<Printer size={16} />
									<span>Отправить на печать (A4 Альбомная)</span>
								</button>
							</div>
						</div>

						{/* Iframe Preview */}
						<iframe
							title="Официальный печатный бланк"
							className="steril-print-preview-frame"
							srcDoc={printHtmlForPreview}
						/>
					</div>
				)}
			</div>

			{/* ─── SUBMODAL: ADD NEW STERILIZER CYCLE (FORM 257/U) ──────────── */}
			{isAddCycleOpen && (
				<div className="steril-submodal-overlay">
					<div className="steril-submodal-card">
						<div className="steril-submodal-header">
							<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<Flame size={20} color="var(--teal)" />
								<span style={{ fontWeight: 700, fontSize: "1rem" }}>
									Регистрация цикла стерилизации (Форма № 257/у)
								</span>
							</div>
							<button
								type="button"
								className="steril-close-btn"
								onClick={() => setIsAddCycleOpen(false)}
								style={{ minWidth: "32px", minHeight: "32px", padding: "4px" }}
							>
								<X size={16} />
							</button>
						</div>

						<form onSubmit={handleSaveNewCycle}>
							<div className="steril-submodal-body">
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: "0.75rem",
									}}
								>
									<div className="steril-form-group">
										<label>Стерилизатор (Аппарат)</label>
										<select
											className="steril-select"
											value={newCycleSterilizerId}
											onChange={(e) => setNewCycleSterilizerId(e.target.value)}
										>
											{STATUTORY_STERILIZERS.map((s) => (
												<option key={s.id} value={s.id}>
													{s.code}: {s.brandModel}
												</option>
											))}
										</select>
									</div>

									<div className="steril-form-group">
										<label>Режим стерилизации</label>
										<select
											className="steril-select"
											value={newCycleRegimeId}
											onChange={(e) => {
												const regId = e.target.value as SterilizationRegimeCode;
												setNewCycleRegimeId(regId);
												const found = STATUTORY_REGIMES.find((r) => r.id === regId);
												if (found) {
													setNewCycleTemp(found.targetTemperatureCelsius);
													setNewCyclePressure(found.targetPressureBar);
													setNewCycleTime(found.exposureMinutes);
												}
											}}
										>
											{STATUTORY_REGIMES.map((r) => (
												<option key={r.id} value={r.id}>
													{r.nameRu}
												</option>
											))}
										</select>
									</div>
								</div>

								<div className="steril-form-group">
									<label>Наименование стерилизуемых изделий</label>
									<textarea
										rows={2}
										className="steril-form-textarea"
										value={newCycleItemsDesc}
										onChange={(e) => setNewCycleItemsDesc(e.target.value)}
										required
									/>
								</div>

								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1.5fr 1fr",
										gap: "0.75rem",
									}}
								>
									<div className="steril-form-group">
										<label>Тип упаковки (СанПиН 3.3686-21)</label>
										<select
											className="steril-select"
											value={newCyclePackaging}
											onChange={(e) => setNewCyclePackaging(e.target.value as KraftPackagingType)}
										>
											{Object.values(STATUTORY_PACKAGING_TYPES).map((p) => (
												<option key={p.id} value={p.id}>
													{p.nameRu} ({p.statutoryShelfLifeDays} дн.)
												</option>
											))}
										</select>
									</div>

									<div className="steril-form-group">
										<label>Количество упаковок (шт)</label>
										<input
											type="number"
											min={1}
											className="steril-form-input"
											value={newCyclePacksCount}
											onChange={(e) => setNewCyclePacksCount(parseInt(e.target.value, 10) || 1)}
											required
										/>
									</div>
								</div>

								{/* Physical Sensor Readouts */}
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr 1fr",
										gap: "0.75rem",
										padding: "0.75rem",
										background: "var(--paper-soft)",
										borderRadius: "10px",
									}}
								>
									<div className="steril-form-group">
										<label>Температура факт (°C)</label>
										<input
											type="number"
											step="0.1"
											className="steril-form-input"
											value={newCycleTemp}
											onChange={(e) => setNewCycleTemp(parseFloat(e.target.value) || 0)}
											required
										/>
									</div>

									<div className="steril-form-group">
										<label>Давление факт (бар)</label>
										<input
											type="number"
											step="0.01"
											className="steril-form-input"
											value={newCyclePressure}
											onChange={(e) => setNewCyclePressure(parseFloat(e.target.value) || 0)}
											required
										/>
									</div>

									<div className="steril-form-group">
										<label>Экспозиция факт (мин)</label>
										<input
											type="number"
											step="0.5"
											className="steril-form-input"
											value={newCycleTime}
											onChange={(e) => setNewCycleTime(parseFloat(e.target.value) || 0)}
											required
										/>
									</div>
								</div>

								{/* Chemical Indicators & 5 Chamber Control Points */}
								<div className="steril-form-group">
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
										}}
									>
										<label>Тест химических индикаторов (Контрольные точки камеры КТ 1-5)</label>
										<button
											type="button"
											style={{
												background: "none",
												border: "none",
												color: "var(--teal)",
												fontSize: "0.75rem",
												cursor: "pointer",
												fontWeight: 600,
											}}
											onClick={() =>
												setNewCycleChamberPoints(
													newCycleChamberPoints.map((p) => ({ ...p, indicatorPassed: true })),
												)
											}
										>
											✓ Отметить все как пройденные
										</button>
									</div>

									<div className="steril-chamber-points-grid">
										{newCycleChamberPoints.map((pt, idx) => (
											<div
												key={pt.code}
												className={`steril-point-card ${pt.indicatorPassed ? "passed" : "failed"}`}
												onClick={() => {
													const updated = [...newCycleChamberPoints];
													updated[idx] = {
														...pt,
														indicatorPassed: !pt.indicatorPassed,
														indicatorColorObservedRu: !pt.indicatorPassed
															? "Темно-коричневый (эталон)"
															: "Не изменился",
													};
													setNewCycleChamberPoints(updated);
												}}
											>
												<div>
													<div style={{ fontWeight: 700, fontSize: "0.8rem" }}>{pt.code}</div>
													<div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
														{pt.labelRu}
													</div>
												</div>
												<span
													style={{
														fontSize: "0.75rem",
														fontWeight: 700,
														color: pt.indicatorPassed ? "#059669" : "#dc2626",
													}}
												>
													{pt.indicatorPassed ? "Пройден" : "Отказ"}
												</span>
											</div>
										))}
									</div>
								</div>

								<div className="steril-form-group">
									<label>Оператор ЦСО (ФИО медсестры)</label>
									<input
										type="text"
										className="steril-form-input"
										value={newCycleOperator}
										onChange={(e) => setNewCycleOperator(e.target.value)}
										required
									/>
								</div>
							</div>

							<div className="steril-submodal-footer">
								<button
									type="button"
									className="btn-steril-secondary"
									onClick={() => setIsAddCycleOpen(false)}
								>
									Отмена
								</button>
								<button type="submit" className="btn-steril-primary">
									<Check size={16} />
									<span>Сохранить в Журнал 257/у</span>
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ─── SUBMODAL: ADD NEW PSO QUALITY CONTROL (FORM 366/U) ────────── */}
			{isAddPsoOpen && (
				<div className="steril-submodal-overlay">
					<div className="steril-submodal-card">
						<div className="steril-submodal-header">
							<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<FlaskConical size={20} color="var(--teal)" />
								<span style={{ fontWeight: 700, fontSize: "1rem" }}>
									Регистрация пробы ПСО (Форма № 366/у)
								</span>
							</div>
							<button
								type="button"
								className="steril-close-btn"
								onClick={() => setIsAddPsoOpen(false)}
								style={{ minWidth: "32px", minHeight: "32px", padding: "4px" }}
							>
								<X size={16} />
							</button>
						</div>

						<form onSubmit={handleSaveNewPso}>
							<div className="steril-submodal-body">
								<div className="steril-form-group">
									<label>Наименование инструментария / набора</label>
									<input
										type="text"
										className="steril-form-input"
										value={newPsoInstrument}
										onChange={(e) => setNewPsoInstrument(e.target.value)}
										required
									/>
								</div>

								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: "0.75rem",
									}}
								>
									<div className="steril-form-group">
										<label>Объем всей партии (шт)</label>
										<input
											type="number"
											min={1}
											className="steril-form-input"
											value={newPsoBatchCount}
											onChange={(e) => {
												const count = parseInt(e.target.value, 10) || 1;
												setNewPsoBatchCount(count);
												const req = calculatePsoSampleRequirements(count, newPsoIsSurgical);
												setNewPsoTestedCount(req.minSampleCount);
											}}
											required
										/>
									</div>

									<div className="steril-form-group">
										<label>
											Отобрано образцов (норма: мин. {currentPsoMinRequirement.minSampleCount} шт.)
										</label>
										<input
											type="number"
											min={1}
											className="steril-form-input"
											value={newPsoTestedCount}
											onChange={(e) => setNewPsoTestedCount(parseInt(e.target.value, 10) || 1)}
											required
										/>
									</div>
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<input
										type="checkbox"
										id="chkSurgical"
										checked={newPsoIsSurgical}
										onChange={(e) => {
											const isSurg = e.target.checked;
											setNewPsoIsSurgical(isSurg);
											const req = calculatePsoSampleRequirements(newPsoBatchCount, isSurg);
											setNewPsoTestedCount(req.minSampleCount);
										}}
									/>
									<label htmlFor="chkSurgical" style={{ fontSize: "0.85rem", cursor: "pointer" }}>
										Хирургический / критический инструмент (повышенная выборка мин. 5 шт.)
									</label>
								</div>

								{/* Chemical Probes Result Toggles */}
								<div
									style={{
										padding: "0.85rem",
										background: "var(--paper-soft)",
										borderRadius: "10px",
										display: "flex",
										flexDirection: "column",
										gap: "0.75rem",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
										}}
									>
										<div>
											<div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
												Азопирамовая проба (на скрытую кровь)
											</div>
											<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
												Норма: отрицательная (нет фиолетового окрашивания)
											</div>
										</div>
										<button
											type="button"
											className={`badge-status ${newPsoIsAzopyramNeg ? "success" : "danger"}`}
											style={{ cursor: "pointer", padding: "0.35rem 0.75rem" }}
											onClick={() => setNewPsoIsAzopyramNeg(!newPsoIsAzopyramNeg)}
										>
											{newPsoIsAzopyramNeg ? "✓ Отрицательная (Норма)" : "✗ ПОЛОЖИТЕЛЬНАЯ (Кровь)"}
										</button>
									</div>

									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
										}}
									>
										<div>
											<div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
												Фенолфталеиновая проба (на моющие средства)
											</div>
											<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
												Норма: отрицательная (нет розово-малинового окрашивания)
											</div>
										</div>
										<button
											type="button"
											className={`badge-status ${newPsoIsPhenolNeg ? "success" : "danger"}`}
											style={{ cursor: "pointer", padding: "0.35rem 0.75rem" }}
											onClick={() => setNewPsoIsPhenolNeg(!newPsoIsPhenolNeg)}
										>
											{newPsoIsPhenolNeg ? "✓ Отрицательная (Норма)" : "✗ ПОЛОЖИТЕЛЬНАЯ (Щелочь)"}
										</button>
									</div>

									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
										}}
									>
										<div>
											<div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
												Проба с Суданом III (на масляные загрязнения)
											</div>
											<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
												Норма: отрицательная (для стоматологических наконечников)
											</div>
										</div>
										<button
											type="button"
											className={`badge-status ${newPsoIsSudanNeg ? "success" : "danger"}`}
											style={{ cursor: "pointer", padding: "0.35rem 0.75rem" }}
											onClick={() => setNewPsoIsSudanNeg(!newPsoIsSudanNeg)}
										>
											{newPsoIsSudanNeg ? "✓ Отрицательная (Норма)" : "✗ ПОЛОЖИТЕЛЬНАЯ"}
										</button>
									</div>
								</div>

								<div className="steril-form-group">
									<label>Применяемое моющее/дезинфицирующее средство</label>
									<input
										type="text"
										className="steril-form-input"
										value={newPsoDetergent}
										onChange={(e) => setNewPsoDetergent(e.target.value)}
										required
									/>
								</div>

								<div className="steril-form-group">
									<label>Оператор ЦСО (ФИО медсестры)</label>
									<input
										type="text"
										className="steril-form-input"
										value={newPsoOperator}
										onChange={(e) => setNewPsoOperator(e.target.value)}
										required
									/>
								</div>
							</div>

							<div className="steril-submodal-footer">
								<button
									type="button"
									className="btn-steril-secondary"
									onClick={() => setIsAddPsoOpen(false)}
								>
									Отмена
								</button>
								<button type="submit" className="btn-steril-primary">
									<Check size={16} />
									<span>Зафиксировать пробу ПСО</span>
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ─── SUBMODAL: GENERATE KRAFT BATCH ────────────────────────────── */}
			{isAddKraftBatchOpen && (
				<div className="steril-submodal-overlay">
					<div className="steril-submodal-card">
						<div className="steril-submodal-header">
							<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<Barcode size={20} color="var(--teal)" />
								<span style={{ fontWeight: 700, fontSize: "1rem" }}>
									Генерация партии крафт-пакетов и штрихкодов
								</span>
							</div>
							<button
								type="button"
								className="steril-close-btn"
								onClick={() => setIsAddKraftBatchOpen(false)}
								style={{ minWidth: "32px", minHeight: "32px", padding: "4px" }}
							>
								<X size={16} />
							</button>
						</div>

						<form onSubmit={handleGenerateKraftBatch}>
							<div className="steril-submodal-body">
								<div className="steril-form-group">
									<label>Название набора инструментов</label>
									<input
										type="text"
										className="steril-form-input"
										value={newBatchToolName}
										onChange={(e) => setNewBatchToolName(e.target.value)}
										required
									/>
								</div>

								<div className="steril-form-group">
									<label>Состав набора (через запятую)</label>
									<input
										type="text"
										className="steril-form-input"
										value={newBatchItemsText}
										onChange={(e) => setNewBatchItemsText(e.target.value)}
									/>
								</div>

								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1.5fr 1fr",
										gap: "0.75rem",
									}}
								>
									<div className="steril-form-group">
										<label>Тип упаковки и срок сохранения стерильности</label>
										<select
											className="steril-select"
											value={newBatchPkgType}
											onChange={(e) => setNewBatchPkgType(e.target.value as KraftPackagingType)}
										>
											{Object.values(STATUTORY_PACKAGING_TYPES).map((p) => (
												<option key={p.id} value={p.id}>
													{p.nameRu} ({p.statutoryShelfLifeDays} дн.)
												</option>
											))}
										</select>
									</div>

									<div className="steril-form-group">
										<label>Количество пакетов (шт)</label>
										<input
											type="number"
											min={1}
											max={100}
											className="steril-form-input"
											value={newBatchQuantity}
											onChange={(e) => setNewBatchQuantity(parseInt(e.target.value, 10) || 1)}
											required
										/>
									</div>
								</div>

								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: "0.75rem",
									}}
								>
									<div className="steril-form-group">
										<label>Стерилизатор (Код)</label>
										<select
											className="steril-select"
											value={newBatchSterilizerCode}
											onChange={(e) => setNewBatchSterilizerCode(e.target.value)}
										>
											{STATUTORY_STERILIZERS.map((s) => (
												<option key={s.code} value={s.code}>
													{s.code}: {s.brandModel}
												</option>
											))}
										</select>
									</div>

									<div className="steril-form-group">
										<label>№ Цикла стерилизации</label>
										<input
											type="number"
											min={1}
											className="steril-form-input"
											value={newBatchCycleNumber}
											onChange={(e) => setNewBatchCycleNumber(parseInt(e.target.value, 10) || 1)}
											required
										/>
									</div>
								</div>

								<div className="steril-form-group">
									<label>Оператор ЦСО</label>
									<input
										type="text"
										className="steril-form-input"
										value={newBatchOperator}
										onChange={(e) => setNewBatchOperator(e.target.value)}
										required
									/>
								</div>
							</div>

							<div className="steril-submodal-footer">
								<button
									type="button"
									className="btn-steril-secondary"
									onClick={() => setIsAddKraftBatchOpen(false)}
								>
									Отмена
								</button>
								<button type="submit" className="btn-steril-primary">
									<Barcode size={16} />
									<span>Сгенерировать штрихкоды ({newBatchQuantity} шт.)</span>
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

export default SterilizationJournalModal;

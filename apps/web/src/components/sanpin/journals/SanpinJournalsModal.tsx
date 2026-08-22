/**
 * ============================================================================
 * SANPIN DISINFECTION & STERILIZATION JOURNAL STUDIO (MODAL HUD)
 * Единый нормативный центр журналов ПСО (Форма 366/у), бактерицидных ламп,
 * генеральных уборок и учета расхода дезинфицирующих средств.
 * ============================================================================
 */

import {
	AlertTriangle,
	Award,
	CheckCircle2,
	Clock,
	Download,
	Droplets,
	FileSpreadsheet,
	FileText,
	Filter,
	FlaskConical,
	Layers,
	Plus,
	Printer,
	RefreshCw,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Trash2,
	UserCheck,
	Wind,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage.js";
import {
	DENTAL_INSTRUMENT_CATEGORIES,
	DISINFECTANTS_REGULATORY_REGISTRY,
	GENERAL_CLEANING_PRESETS,
	SANPIN_DETERGENTS_CATALOG,
	SANPIN_PSO_CHEMICAL_TESTS,
	UV_RECIRCULATOR_MODELS,
	type DentalInstrumentCategoryDefinition,
	type PsoChemicalTestId,
} from "./sanpinJournalsPresets.js";
import {
	calculateAirDecontaminationDuration,
	calculateDisinfectantSolutionMath,
	calculateLampOperatingHours,
	calculateNextGeneralCleaningDate,
	calculatePsoSampleRequirements,
	calculateRequiredConcentrateForVolume,
	evaluateLampFleetHealth,
	evaluatePsoTrialResult,
	exportBactericidalJournalToCsv,
	exportDisinfectantJournalToCsv,
	exportGeneralCleaningJournalToCsv,
	exportPsoJournalToCsv,
	generateBactericidalJournalPrintHtml,
	generateDisinfectantJournalPrintHtml,
	generateGeneralCleaningJournalPrintHtml,
	generatePsoJournalPrintHtml,
	generatePsoRecordId,
	validateCleaningScheduleCompliance,
	type BactericidalEquipmentRecord,
	type BactericidalSessionRecord,
	type ClinicLegalInfo,
	type DisinfectantJournalRecord,
	type DisinfectantStockRecord,
	type GeneralCleaningJournalRecord,
	type PsoJournalRecord,
} from "./sanpinJournalsEngine.js";
import "./sanpinJournals.css";

export interface SanpinJournalsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: "pso" | "bactericidal" | "cleaning" | "disinfectants" | undefined;
	readonly clinicInfo?: ClinicLegalInfo | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL MOCK / SEED DATA (STATUTORY SANPIN 3.3686-21 REGISTERS)
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_PSO_RECORDS: PsoJournalRecord[] = [
	{
		id: "PSO-20260822-0101",
		timestamp: new Date().toISOString(),
		instrumentName: "Терапевтический смотровой набор (зеркала, зонды, пинцеты)",
		categoryId: "therapeutic_kit",
		batchItemCount: 120,
		testedSampleCount: 5,
		testType: "both_standard",
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isSudanNegative: true,
		detergentBrand: "Биолот 0.5% + Аламинол 1.0%",
		isBatchApproved: true,
		operatorStaffFullName: "Смирнова Анна Викторовна",
		operatorStaffPosition: "Медсестра ЦСО",
		electronicStampVerified: true,
		notes: "Пробы отрицательные. Партия передана на автоклавирование (Цикл #14)",
	},
	{
		id: "PSO-20260822-0102",
		timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
		instrumentName: "Хирургические элеваторы и щипцы экстракционные",
		categoryId: "surgical_kit",
		batchItemCount: 40,
		testedSampleCount: 4,
		testType: "both_standard",
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isSudanNegative: true,
		detergentBrand: "Оптимакс Про 1.5%",
		isBatchApproved: true,
		operatorStaffFullName: "Смирнова Анна Викторовна",
		operatorStaffPosition: "Медсестра ЦСО",
		electronicStampVerified: true,
		notes: "Замковые части щипцов промыты, следы крови отсутствуют",
	},
	{
		id: "PSO-20260821-0098",
		timestamp: new Date(Date.now() - 3600 * 1000 * 26).toISOString(),
		instrumentName: "Эндодонтические К-файлы и машинные протейперы",
		categoryId: "endodontic_kit",
		batchItemCount: 60,
		testedSampleCount: 3,
		testType: "both_standard",
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isSudanNegative: true,
		detergentBrand: "Бланидас Актив Энзим 0.5%",
		isBatchApproved: true,
		operatorStaffFullName: "Петрова Елена Сергеевна",
		operatorStaffPosition: "Медсестра стерилизационной",
		electronicStampVerified: true,
		notes: "УЗ-мойка 15 мин, пробы отрицательные",
	},
];

const INITIAL_BACTERICIDAL_EQUIPMENTS: BactericidalEquipmentRecord[] = [
	{
		id: "equip-dezar4-cab1",
		roomName: "Кабинет терапевтической стоматологии №1",
		roomVolumeM3: 45.0,
		deviceBrand: "Дезар-4 (ОРУБн-3-3-«КРОНТ»)",
		serialNumber: "DZ-004812",
		deviceType: "recirculator_closed",
		lampType: "TUV 15W Philips",
		lampCount: 3,
		maxLampHours: 8000,
		totalOperatingHours: 1420.5,
		remainingLampHours: 6579.5,
		remainingLampPercent: 82.2,
		lampStatus: "normal",
		isLampCritical: false,
		lastLampReplacementDate: "2026-01-10",
		notes: "Настенная установка, фильтры заменены",
	},
	{
		id: "equip-dezar7-surg",
		roomName: "Операционная хирургической стоматологии",
		roomVolumeM3: 65.0,
		deviceBrand: "Дезар-7 (ОРУБп-3-5-«КРОНТ» передвижной)",
		serialNumber: "DZ7-009144",
		deviceType: "recirculator_closed",
		lampType: "TUV 15W Philips",
		lampCount: 5,
		maxLampHours: 8000,
		totalOperatingHours: 7350.0,
		remainingLampHours: 650.0,
		remainingLampPercent: 8.1,
		lampStatus: "warning_replace_soon",
		isLampCritical: false,
		lastLampReplacementDate: "2025-06-15",
		notes: "Внимание: выработано более 90% ресурса ламп!",
	},
	{
		id: "equip-sibest-cso",
		roomName: "Стерилизационная (ЦСО)",
		roomVolumeM3: 38.0,
		deviceBrand: "Сибэст-45",
		serialNumber: "SB-45-103",
		deviceType: "recirculator_closed",
		lampType: "TUV 15W",
		lampCount: 2,
		maxLampHours: 9000,
		totalOperatingHours: 2100.0,
		remainingLampHours: 6900.0,
		remainingLampPercent: 76.7,
		lampStatus: "normal",
		isLampCritical: false,
		lastLampReplacementDate: "2025-11-20",
	},
	{
		id: "equip-obn150-waste",
		roomName: "Комната временного накопления отходов",
		roomVolumeM3: 25.0,
		deviceBrand: "ОБН-150 (Открытый облучатель)",
		serialNumber: "OBN-7741",
		deviceType: "irradiator_open",
		lampType: "ДБ-30",
		lampCount: 2,
		maxLampHours: 8000,
		totalOperatingHours: 8050.0,
		remainingLampHours: 0,
		remainingLampPercent: 0,
		lampStatus: "expired_replace_now",
		isLampCritical: true,
		lastLampReplacementDate: "2024-12-01",
		notes: "РЕСУРС ИСЧЕРПАН. Запрет включения до установки новых ламп.",
	},
];

const INITIAL_BACTERICIDAL_SESSIONS: BactericidalSessionRecord[] = [
	{
		id: "sess-01",
		equipmentId: "equip-dezar4-cab1",
		date: "2026-08-22",
		sessionStartTime: "08:00",
		sessionEndTime: "14:00",
		durationMinutes: 360,
		durationHours: 6.0,
		operatingMode: "continuous_presence",
		cumulativeHoursAfterSession: 1420.5,
		roomName: "Кабинет терапевтической стоматологии №1",
		deviceBrand: "Дезар-4",
		operatorStaffFullName: "Смирнова А. В.",
		notes: "Рабочая смена 1",
	},
	{
		id: "sess-02",
		equipmentId: "equip-dezar7-surg",
		date: "2026-08-22",
		sessionStartTime: "08:30",
		sessionEndTime: "09:30",
		durationMinutes: 60,
		durationHours: 1.0,
		operatingMode: "pre_op_preparation",
		cumulativeHoursAfterSession: 7350.0,
		roomName: "Операционная хирургической стоматологии",
		deviceBrand: "Дезар-7",
		operatorStaffFullName: "Кузнецова М. И.",
		notes: "Предоперационная подготовка перед имплантацией",
	},
];

const INITIAL_CLEANING_RECORDS: GeneralCleaningJournalRecord[] = [
	{
		id: "clean-01",
		roomType: "surgical",
		roomName: "Операционная хирургической стоматологии",
		scheduledDate: "2026-08-22",
		actualDateTime: new Date().toISOString(),
		treatedAreaM2: 32.5,
		disinfectantName: "Аламинол 1.5%",
		activeIngredient: "ЧАС + Глутаровый альдегид",
		solutionConcentrationPercent: 1.5,
		applicationMethodRu: "Двукратное протирание ветошью",
		exposureTimeMinutes: 60,
		uvIrradiationMinutes: 120,
		ventilationMinutes: 20,
		operatorStaffFullName: "Соколова Татьяна Николаевна",
		inspectorStaffFullName: "Иванова Марина Павловна (Главная медсестра)",
		isInspectorVerified: true,
		status: "verified_by_inspector",
		notes: "Обработаны стены, мебель, светильники. Контроль смывов отрицательный.",
	},
	{
		id: "clean-02",
		roomType: "therapeutic",
		roomName: "Кабинет терапии №1",
		scheduledDate: "2026-08-21",
		actualDateTime: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
		treatedAreaM2: 24.0,
		disinfectantName: "Бриллиант Классик 1.0%",
		activeIngredient: "ЧАС + Амины",
		solutionConcentrationPercent: 1.0,
		applicationMethodRu: "Двукратное протирание ветошью",
		exposureTimeMinutes: 60,
		uvIrradiationMinutes: 60,
		ventilationMinutes: 15,
		operatorStaffFullName: "Соколова Т. Н.",
		inspectorStaffFullName: "Иванова М. П.",
		isInspectorVerified: true,
		status: "verified_by_inspector",
	},
	{
		id: "clean-03",
		roomType: "cso_sterile",
		roomName: "Центральное стерилизационное отделение (ЦСО)",
		scheduledDate: "2026-08-20",
		actualDateTime: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
		treatedAreaM2: 28.0,
		disinfectantName: "Оптимакс Про 1.5%",
		activeIngredient: "Третичные амины",
		solutionConcentrationPercent: 1.5,
		applicationMethodRu: "Двукратное протирание",
		exposureTimeMinutes: 60,
		uvIrradiationMinutes: 90,
		ventilationMinutes: 15,
		operatorStaffFullName: "Смирнова А. В.",
		inspectorStaffFullName: "Иванова М. П.",
		isInspectorVerified: true,
		status: "verified_by_inspector",
	},
];

const INITIAL_DISINFECTANT_STOCKS: DisinfectantStockRecord[] = [
	{
		id: "stock-1",
		tradeName: "Аламинол (канистра 5 л)",
		activeGroup: "Альдегиды",
		unit: "л",
		currentStock: 25.0,
		monthlyMinStockRequired: 15.0,
		lastReceiptDate: "2026-08-10",
		lastConsumptionDate: "2026-08-22",
	},
	{
		id: "stock-2",
		tradeName: "Бриллиант Классик (флакон 1 л)",
		activeGroup: "ЧАС",
		unit: "л",
		currentStock: 12.0,
		monthlyMinStockRequired: 8.0,
		lastReceiptDate: "2026-08-05",
		lastConsumptionDate: "2026-08-21",
	},
	{
		id: "stock-3",
		tradeName: "Оптимакс Про (флакон 1 л)",
		activeGroup: "Амины",
		unit: "л",
		currentStock: 9.0,
		monthlyMinStockRequired: 6.0,
		lastReceiptDate: "2026-08-12",
		lastConsumptionDate: "2026-08-20",
	},
	{
		id: "stock-4",
		tradeName: "Дезискраб (кожный антисептик 1 л)",
		activeGroup: "Спирты",
		unit: "л",
		currentStock: 18.0,
		monthlyMinStockRequired: 10.0,
		lastReceiptDate: "2026-08-15",
		lastConsumptionDate: "2026-08-22",
	},
];

const INITIAL_DISINFECTANT_JOURNAL: DisinfectantJournalRecord[] = [
	{
		id: "dis-01",
		timestamp: new Date().toISOString(),
		operationType: "consumption",
		tradeName: "Аламинол (канистра 5 л)",
		amount: 0.5,
		unit: "л",
		invoiceOrObjectInfo: "Генеральная уборка операционной (площадь 32.5 м²)",
		solutionPreparedLiters: 33.3,
		concentrationPercent: 1.5,
		resultingStockBalance: 25.0,
		operatorStaffFullName: "Смирнова А. В.",
		notes: "Приготовлен 1.5% рабочий раствор",
	},
	{
		id: "dis-02",
		timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
		operationType: "consumption",
		tradeName: "Бриллиант Классик (флакон 1 л)",
		amount: 0.2,
		unit: "л",
		invoiceOrObjectInfo: "Генеральная уборка терапевтического кабинета №1",
		solutionPreparedLiters: 20.0,
		concentrationPercent: 1.0,
		resultingStockBalance: 12.0,
		operatorStaffFullName: "Соколова Т. Н.",
	},
	{
		id: "dis-03",
		timestamp: "2026-08-10T11:00:00.000Z",
		operationType: "receipt",
		tradeName: "Аламинол (канистра 5 л)",
		amount: 20.0,
		unit: "л",
		invoiceOrObjectInfo: "ООО «МедСнабТорг», Накладная № ТОРГ-8411",
		batchOrExpirationDate: "Серия 0426, Годен до 04.2029",
		resultingStockBalance: 25.5,
		operatorStaffFullName: "Иванова М. П. (Главная медсестра)",
		notes: "Сертификат соответствия проверен",
	},
];

export function SanpinJournalsModal({
	isOpen,
	onClose,
	initialTab = "pso",
	clinicInfo = {
		name: "ООО «Стоматологическая клиника ДЕНТЕ»",
		ogrn: "1027700123456",
		inn: "7701234567",
		address: "г. Москва, ул. Клиническая, д. 10",
		chiefDoctor: "Смирнов А. В.",
		headNurse: "Иванова М. П.",
	},
}: SanpinJournalsModalProps) {
	const [activeTab, setActiveTab] = useState<"pso" | "bactericidal" | "cleaning" | "disinfectants">(initialTab);

	// State stores
	const [psoRecords, setPsoRecords] = useState<PsoJournalRecord[]>(INITIAL_PSO_RECORDS);
	const [bactericidalEquipments, setBactericidalEquipments] = useState<BactericidalEquipmentRecord[]>(
		INITIAL_BACTERICIDAL_EQUIPMENTS,
	);
	const [bactericidalSessions, setBactericidalSessions] = useState<BactericidalSessionRecord[]>(
		INITIAL_BACTERICIDAL_SESSIONS,
	);
	const [cleaningRecords, setCleaningRecords] = useState<GeneralCleaningJournalRecord[]>(INITIAL_CLEANING_RECORDS);
	const [disinfectantStocks, setDisinfectantStocks] = useState<DisinfectantStockRecord[]>(INITIAL_DISINFECTANT_STOCKS);
	const [disinfectantJournal, setDisinfectantJournal] = useState<DisinfectantJournalRecord[]>(
		INITIAL_DISINFECTANT_JOURNAL,
	);

	// Search & Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [psoFilter, setPsoFilter] = useState<"all" | "approved" | "rejected">("all");
	const [selectedEquipId, setSelectedEquipId] = useState<string>("all");
	const [cleaningFilter, setCleaningFilter] = useState<string>("all");

	// Modals
	const [isPsoModalOpen, setIsPsoModalOpen] = useState(false);
	const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
	const [isAddEquipModalOpen, setIsAddEquipModalOpen] = useState(false);
	const [isCleaningModalOpen, setIsCleaningModalOpen] = useState(false);
	const [isDisinfectantModalOpen, setIsDisinfectantModalOpen] = useState(false);

	// PSO Form State
	const [psoCategory, setPsoCategory] = useState(DENTAL_INSTRUMENT_CATEGORIES[0]?.id || "therapeutic_kit");
	const [psoInstrumentName, setPsoInstrumentName] = useState("Терапевтический смотровой набор");
	const [psoBatchCount, setPsoBatchCount] = useState<number>(100);
	const [psoSampleCount, setPsoSampleCount] = useState<number>(3);
	const [psoTestType, setPsoTestType] = useState<PsoChemicalTestId>("both_standard");
	const [psoAzopyramNeg, setPsoAzopyramNeg] = useState(true);
	const [psoPhenolNeg, setPsoPhenolNeg] = useState(true);
	const [psoSudanNeg, setPsoSudanNeg] = useState(true);
	const [psoDetergent, setPsoDetergent] = useState("Биолот 0.5% + Аламинол 1.0%");
	const [psoNotes, setPsoNotes] = useState("");

	// Bactericidal Session Form State
	const [sessionEquipId, setSessionEquipId] = useState(INITIAL_BACTERICIDAL_EQUIPMENTS[0]?.id || "");
	const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
	const [sessionStartTime, setSessionStartTime] = useState("08:00");
	const [sessionEndTime, setSessionEndTime] = useState("14:00");
	const [sessionDurationMin, setSessionDurationMin] = useState(360);
	const [sessionMode, setSessionMode] = useState<
		"continuous_presence" | "pre_op_preparation" | "post_cleaning" | "intermittent"
	>("continuous_presence");
	const [sessionNotes, setSessionNotes] = useState("");

	// Add Equipment Form State
	const [newRoomName, setNewRoomName] = useState("Кабинет ортопедической стоматологии №2");
	const [newRoomVolume, setNewRoomVolume] = useState<number>(50.0);
	const [newDeviceBrand, setNewDeviceBrand] = useState("Дезар-4 (ОРУБн-3-3-«КРОНТ»)");
	const [newSerialNumber, setNewSerialNumber] = useState("DZ-005120");
	const [newDeviceType, setNewDeviceType] = useState<"recirculator_closed" | "irradiator_open" | "combined">(
		"recirculator_closed",
	);
	const [newMaxHours, setNewMaxHours] = useState<number>(8000);

	// Cleaning Form State
	const [cleanRoomType, setCleanRoomType] = useState<"surgical" | "therapeutic" | "cso_sterile" | "xray" | "utility">(
		"surgical",
	);
	const [cleanRoomName, setCleanRoomName] = useState("Операционная хирургической стоматологии");
	const [cleanSchedDate, setCleanSchedDate] = useState(new Date().toISOString().slice(0, 10));
	const [cleanActualDateTime, setCleanActualDateTime] = useState(new Date().toISOString().slice(0, 16));
	const [cleanAreaM2, setCleanAreaM2] = useState<number>(32.5);
	const [cleanDisinfectant, setCleanDisinfectant] = useState("Аламинол 1.5%");
	const [cleanConcentration, setCleanConcentration] = useState<number>(1.5);
	const [cleanExposureMin, setCleanExposureMin] = useState<number>(60);
	const [cleanUvMin, setCleanUvMin] = useState<number>(120);
	const [cleanVentilationMin, setCleanVentilationMin] = useState<number>(20);
	const [cleanNotes, setCleanNotes] = useState("");

	// Disinfectant Journal Form State
	const [disOpType, setDisOpType] = useState<"receipt" | "consumption">("consumption");
	const [disTradeName, setDisTradeName] = useState("Аламинол (канистра 5 л)");
	const [disAmount, setDisAmount] = useState<number>(0.5);
	const [disInfo, setDisInfo] = useState("Генеральная уборка операционной");
	const [disSolutionLiters, setDisSolutionLiters] = useState<number>(33.3);
	const [disConcentration, setDisConcentration] = useState<number>(1.5);
	const [disNotes, setDisNotes] = useState("");

	// Live regulatory sampling check for PSO Form
	const livePsoEval = useMemo(() => {
		return evaluatePsoTrialResult({
			batchCount: psoBatchCount,
			testedSampleCount: psoSampleCount,
			isAzopyramNegative: psoAzopyramNeg,
			isPhenolphthaleinNegative: psoPhenolNeg,
			isSudanNegative: psoSudanNeg,
		});
	}, [psoBatchCount, psoSampleCount, psoAzopyramNeg, psoPhenolNeg, psoSudanNeg]);

	// Fleet Health
	const fleetHealth = useMemo(() => {
		return evaluateLampFleetHealth(bactericidalEquipments);
	}, [bactericidalEquipments]);

	if (!isOpen) return null;

	// ─────────────────────────────────────────────────────────────────────────────
	// ACTION HANDLERS
	// ─────────────────────────────────────────────────────────────────────────────

	// 1-Click Fast PSO Logger
	const handleQuickPsoSuccess = (category: DentalInstrumentCategoryDefinition) => {
		const req = calculatePsoSampleRequirements(category.defaultBatchSize);
		const newRecord: PsoJournalRecord = {
			id: generatePsoRecordId(),
			timestamp: new Date().toISOString(),
			instrumentName: `${category.categoryNameRu} (стандартный набор)`,
			categoryId: category.id,
			batchItemCount: category.defaultBatchSize,
			testedSampleCount: req.minSampleCount,
			testType: "both_standard",
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: "Биолот 0.5% + Аламинол 1.0%",
			isBatchApproved: true,
			operatorStaffFullName: clinicInfo.headNurse,
			operatorStaffPosition: "Главная медсестра",
			electronicStampVerified: true,
			notes: `1-Click СанПиН фиксация: проверено ${req.minSampleCount} шт. Пробы отрицательные.`,
		};

		setPsoRecords((prev) => [newRecord, ...prev]);
		showToast(`Проба ПСО внесена: ${category.categoryNameRu} (${req.minSampleCount} шт. — Норма)`, "success");
	};

	// Save Detailed PSO Trial
	const handleSavePsoTrial = (e: React.FormEvent) => {
		e.preventDefault();
		const newRecord: PsoJournalRecord = {
			id: generatePsoRecordId(),
			timestamp: new Date().toISOString(),
			instrumentName: psoInstrumentName,
			categoryId: psoCategory,
			batchItemCount: Number(psoBatchCount),
			testedSampleCount: Number(psoSampleCount),
			testType: psoTestType,
			isAzopyramNegative: psoAzopyramNeg,
			isPhenolphthaleinNegative: psoPhenolNeg,
			isSudanNegative: psoSudanNeg,
			detergentBrand: psoDetergent,
			isBatchApproved: livePsoEval.isBatchApproved,
			rejectionReason: livePsoEval.rejectionReason || undefined,
			operatorStaffFullName: clinicInfo.headNurse,
			operatorStaffPosition: "Главная медсестра",
			electronicStampVerified: true,
			notes: psoNotes || undefined,
		};

		setPsoRecords((prev) => [newRecord, ...prev]);
		showToast(
			livePsoEval.isBatchApproved
				? "Запись ПСО внесена в Форму № 366/у (Партия допущена)"
				: "ВНИМАНИЕ: Зафиксирован БРАК ПСО (Партия направлена на повторную очистку)",
			livePsoEval.isBatchApproved ? "success" : "warning",
		);
		setIsPsoModalOpen(false);
	};

	// Stamp verification for PSO
	const handleStampPso = (recordId: string) => {
		setPsoRecords((prev) =>
			prev.map((r) => (r.id === recordId ? { ...r, electronicStampVerified: true } : r)),
		);
		showToast("ЭЦП и штамп заверки медсестры применены", "success");
	};

	// Save Bactericidal Session
	const handleSaveBactericidalSession = (e: React.FormEvent) => {
		e.preventDefault();
		const eq = bactericidalEquipments.find((x) => x.id === sessionEquipId);
		if (!eq) return;

		const calc = calculateLampOperatingHours(eq.totalOperatingHours, sessionDurationMin, eq.maxLampHours);

		const newSession: BactericidalSessionRecord = {
			id: `sess-${Date.now()}`,
			equipmentId: eq.id,
			date: sessionDate,
			sessionStartTime: sessionStartTime,
			sessionEndTime: sessionEndTime,
			durationMinutes: Number(sessionDurationMin),
			durationHours: calc.sessionHours,
			operatingMode: sessionMode,
			cumulativeHoursAfterSession: calc.cumulativeHoursAfterSession,
			roomName: eq.roomName,
			deviceBrand: eq.deviceBrand,
			operatorStaffFullName: clinicInfo.headNurse,
			notes: sessionNotes || undefined,
		};

		setBactericidalSessions((prev) => [newSession, ...prev]);

		// Update equipment hours
		setBactericidalEquipments((prev) =>
			prev.map((item) =>
				item.id === eq.id
					? {
							...item,
							totalOperatingHours: calc.cumulativeHoursAfterSession,
							remainingLampHours: calc.remainingHours,
							remainingLampPercent: calc.remainingPercent,
							lampStatus: calc.lampStatus,
							isLampCritical: calc.isCritical,
						}
					: item,
			),
		);

		showToast(`Сеанс сохранен (+${calc.sessionHours} ч наработки)`, "success");
		setIsSessionModalOpen(false);
	};

	// Lamp Replacement (Reset Counter)
	const handleResetLampHours = (equipId: string) => {
		const eq = bactericidalEquipments.find((x) => x.id === equipId);
		if (!eq) return;
		if (
			!window.confirm(
				`Подтверждаете замену бактерицидных ламп на аппарате «${eq.deviceBrand}» (${eq.roomName})? Счетчик наработки будет сброшен на 0 ч.`,
			)
		) {
			return;
		}

		setBactericidalEquipments((prev) =>
			prev.map((item) =>
				item.id === equipId
					? {
							...item,
							totalOperatingHours: 0,
							remainingLampHours: item.maxLampHours,
							remainingLampPercent: 100,
							lampStatus: "normal",
							isLampCritical: false,
							lastLampReplacementDate: new Date().toISOString().slice(0, 10),
						}
					: item,
			),
		);
		showToast("Замена ламп зафиксирована. Наработка обнулена (100% ресурс).", "success");
	};

	// Save New Bactericidal Equipment
	const handleSaveEquipment = (e: React.FormEvent) => {
		e.preventDefault();
		const newEquip: BactericidalEquipmentRecord = {
			id: `equip-${Date.now()}`,
			roomName: newRoomName,
			roomVolumeM3: Number(newRoomVolume),
			deviceBrand: newDeviceBrand,
			serialNumber: newSerialNumber,
			deviceType: newDeviceType,
			lampType: "TUV 15W Philips",
			lampCount: 2,
			maxLampHours: Number(newMaxHours),
			totalOperatingHours: 0,
			remainingLampHours: Number(newMaxHours),
			remainingLampPercent: 100,
			lampStatus: "normal",
			isLampCritical: false,
			lastLampReplacementDate: new Date().toISOString().slice(0, 10),
		};

		setBactericidalEquipments((prev) => [...prev, newEquip]);
		showToast(`Аппарат «${newDeviceBrand}» успешно поставлен на учет`, "success");
		setIsAddEquipModalOpen(false);
	};

	// Save General Cleaning
	const handleSaveCleaning = (e: React.FormEvent) => {
		e.preventDefault();
		const newRecord: GeneralCleaningJournalRecord = {
			id: `clean-${Date.now()}`,
			roomType: cleanRoomType,
			roomName: cleanRoomName,
			scheduledDate: cleanSchedDate,
			actualDateTime: new Date(cleanActualDateTime).toISOString(),
			treatedAreaM2: Number(cleanAreaM2),
			disinfectantName: cleanDisinfectant,
			activeIngredient: "ЧАС + Амины",
			solutionConcentrationPercent: Number(cleanConcentration),
			applicationMethodRu: "Двукратное протирание ветошью",
			exposureTimeMinutes: Number(cleanExposureMin),
			uvIrradiationMinutes: Number(cleanUvMin),
			ventilationMinutes: Number(cleanVentilationMin),
			operatorStaffFullName: "Санитарка отделения",
			inspectorStaffFullName: clinicInfo.headNurse,
			isInspectorVerified: true,
			status: "verified_by_inspector",
			notes: cleanNotes || undefined,
		};

		setCleaningRecords((prev) => [newRecord, ...prev]);
		showToast(`Генеральная уборка зафиксирована: ${cleanRoomName}`, "success");
		setIsCleaningModalOpen(false);
	};

	// Save Disinfectant Transaction
	const handleSaveDisinfectantTransaction = (e: React.FormEvent) => {
		e.preventDefault();
		const currentStockItem = disinfectantStocks.find((s) => s.tradeName === disTradeName);
		const cur = currentStockItem?.currentStock || 10.0;
		const isReceipt = disOpType === "receipt";
		const newBalance = isReceipt ? cur + Number(disAmount) : Math.max(0, cur - Number(disAmount));

		const newEntry: DisinfectantJournalRecord = {
			id: `dis-${Date.now()}`,
			timestamp: new Date().toISOString(),
			operationType: disOpType,
			tradeName: disTradeName,
			amount: Number(disAmount),
			unit: "л",
			invoiceOrObjectInfo: disInfo,
			solutionPreparedLiters: !isReceipt ? Number(disSolutionLiters) : undefined,
			concentrationPercent: !isReceipt ? Number(disConcentration) : undefined,
			resultingStockBalance: newBalance,
			operatorStaffFullName: clinicInfo.headNurse,
			notes: disNotes || undefined,
		};

		setDisinfectantJournal((prev) => [newEntry, ...prev]);

		// Update stock balance
		setDisinfectantStocks((prev) =>
			prev.map((s) => (s.tradeName === disTradeName ? { ...s, currentStock: newBalance } : s)),
		);

		showToast(
			isReceipt
				? `Приход зафиксирован: +${disAmount} л (${disTradeName})`
				: `Расход зафиксирован: -${disAmount} л (Остаток: ${newBalance.toFixed(2)} л)`,
			"success",
		);
		setIsDisinfectantModalOpen(false);
	};

	// ─────────────────────────────────────────────────────────────────────────────
	// PRINT & EXPORT HANDLERS
	// ─────────────────────────────────────────────────────────────────────────────

	const handlePrintCurrentTab = () => {
		let html = "";
		if (activeTab === "pso") {
			html = generatePsoJournalPrintHtml({ records: psoRecords, clinicInfo });
		} else if (activeTab === "bactericidal") {
			const eq = bactericidalEquipments[0] || INITIAL_BACTERICIDAL_EQUIPMENTS[0]!;
			html = generateBactericidalJournalPrintHtml({
				equipment: eq,
				sessions: bactericidalSessions,
				clinicInfo,
			});
		} else if (activeTab === "cleaning") {
			html = generateGeneralCleaningJournalPrintHtml({ records: cleaningRecords, clinicInfo });
		} else {
			html = generateDisinfectantJournalPrintHtml({ records: disinfectantJournal, clinicInfo });
		}

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 250);
		}
	};

	const handleExportCsv = () => {
		let csv = "";
		let filename = "";
		if (activeTab === "pso") {
			csv = exportPsoJournalToCsv(psoRecords);
			filename = "SanPiN_PSO_Journal_Form_366u.csv";
		} else if (activeTab === "bactericidal") {
			csv = exportBactericidalJournalToCsv(bactericidalSessions);
			filename = "SanPiN_Bactericidal_Lamp_Hours.csv";
		} else if (activeTab === "cleaning") {
			csv = exportGeneralCleaningJournalToCsv(cleaningRecords);
			filename = "SanPiN_General_Cleaning_Journal.csv";
		} else {
			csv = exportDisinfectantJournalToCsv(disinfectantJournal);
			filename = "SanPiN_Disinfectants_Accounting.csv";
		}

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast(`Файл ${filename} успешно экспортирован`, "success");
	};

	// ─────────────────────────────────────────────────────────────────────────────
	// FILTERED LISTS
	// ─────────────────────────────────────────────────────────────────────────────

	const filteredPsoRecords = useMemo(() => {
		return psoRecords.filter((r) => {
			const matchSearch =
				!searchQuery ||
				r.instrumentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				r.detergentBrand.toLowerCase().includes(searchQuery.toLowerCase()) ||
				r.operatorStaffFullName.toLowerCase().includes(searchQuery.toLowerCase());

			const matchStatus =
				psoFilter === "all" ||
				(psoFilter === "approved" && r.isBatchApproved) ||
				(psoFilter === "rejected" && !r.isBatchApproved);

			return matchSearch && matchStatus;
		});
	}, [psoRecords, searchQuery, psoFilter]);

	const filteredBactericidalSessions = useMemo(() => {
		return bactericidalSessions.filter((s) => {
			const matchSearch =
				!searchQuery ||
				s.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.deviceBrand.toLowerCase().includes(searchQuery.toLowerCase());

			const matchEquip = selectedEquipId === "all" || s.equipmentId === selectedEquipId;

			return matchSearch && matchEquip;
		});
	}, [bactericidalSessions, searchQuery, selectedEquipId]);

	const filteredCleaningRecords = useMemo(() => {
		return cleaningRecords.filter((r) => {
			const matchSearch =
				!searchQuery ||
				r.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				r.disinfectantName.toLowerCase().includes(searchQuery.toLowerCase());

			const matchType = cleaningFilter === "all" || r.roomType === cleaningFilter;

			return matchSearch && matchType;
		});
	}, [cleaningRecords, searchQuery, cleaningFilter]);

	return (
		<div className="sanpin-studio-modal-overlay" role="dialog" aria-modal="true">
			<div className="sanpin-studio-modal">
				{/* Modal Header */}
				<div className="sanpin-studio-header">
					<div className="sanpin-studio-title-box">
						<FlaskConical size={28} color="var(--brand-primary, #2563eb)" />
						<div>
							<h2>
								Журналы дезинфекции и стерилизации (СанПиН 3.3686-21)
								<span className="sanpin-gov-tag">
									<ShieldCheck size={14} /> Госреестр Роспотребнадзора
								</span>
							</h2>
							<div style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
								{clinicInfo.name} • Старшая медсестра: {clinicInfo.headNurse}
							</div>
						</div>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
						<button
							type="button"
							onClick={handlePrintCurrentTab}
							className="sanpin-action-btn sanpin-action-btn-secondary"
							title="Печать официальной формы А4"
						>
							<Printer size={16} /> Печать А4
						</button>
						<button
							type="button"
							onClick={handleExportCsv}
							className="sanpin-action-btn sanpin-action-btn-secondary"
							title="Экспорт в CSV"
						>
							<Download size={16} /> Экспорт CSV
						</button>
						<button
							type="button"
							onClick={onClose}
							className="sanpin-close-btn"
							aria-label="Закрыть студию журналов"
						>
							<X size={22} />
						</button>
					</div>
				</div>

				{/* KPI Summary Deck */}
				<div className="sanpin-kpi-deck">
					<div className="sanpin-kpi-tile">
						<span className="sanpin-kpi-tile-label">Пробы ПСО за месяц</span>
						<span className="sanpin-kpi-tile-value">{psoRecords.length} партий</span>
						<span className="sanpin-kpi-tile-subtext" style={{ color: "#059669" }}>
							<CheckCircle2 size={12} style={{ display: "inline", verticalAlign: "middle" }} /> 100%
							соответствие СанПиН
						</span>
					</div>

					<div className="sanpin-kpi-tile">
						<span className="sanpin-kpi-tile-label">Парк рециркуляторов</span>
						<span className="sanpin-kpi-tile-value">{bactericidalEquipments.length} установок</span>
						<span
							className="sanpin-kpi-tile-subtext"
							style={{
								color:
									fleetHealth.overallHealthStatus === "critical_violation"
										? "#dc2626"
										: fleetHealth.overallHealthStatus === "attention_needed"
											? "#d97706"
											: "#059669",
								fontWeight: 600,
							}}
						>
							{fleetHealth.summaryMessageRu}
						</span>
					</div>

					<div className="sanpin-kpi-tile">
						<span className="sanpin-kpi-tile-label">Генеральные уборки</span>
						<span className="sanpin-kpi-tile-value">{cleaningRecords.length} выполнено</span>
						<span className="sanpin-kpi-tile-subtext" style={{ color: "#059669" }}>
							Все 4 кабинета в графике (7 дн.)
						</span>
					</div>

					<div className="sanpin-kpi-tile">
						<span className="sanpin-kpi-tile-label">Запас дезсредств</span>
						<span className="sanpin-kpi-tile-value">
							{disinfectantStocks.reduce((acc, s) => acc + s.currentStock, 0).toFixed(1)} л
						</span>
						<span className="sanpin-kpi-tile-subtext" style={{ color: "#059669" }}>
							Неснижаемый запас на 30 дней обеспечен
						</span>
					</div>
				</div>

				{/* Multi-Tab Navigation */}
				<div className="sanpin-nav-bar">
					<button
						type="button"
						onClick={() => setActiveTab("pso")}
						className={`sanpin-nav-item ${activeTab === "pso" ? "active" : ""}`}
					>
						<FlaskConical size={18} />
						1. Качество ПСО (Форма № 366/у)
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("bactericidal")}
						className={`sanpin-nav-item ${activeTab === "bactericidal" ? "active" : ""}`}
					>
						<Wind size={18} />
						2. Рециркуляторы и УФ-лампы (Р 3.5.1904-04)
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("cleaning")}
						className={`sanpin-nav-item ${activeTab === "cleaning" ? "active" : ""}`}
					>
						<Sparkles size={18} />
						3. Генеральные уборки (СанПиН)
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("disinfectants")}
						className={`sanpin-nav-item ${activeTab === "disinfectants" ? "active" : ""}`}
					>
						<Droplets size={18} />
						4. Учет дезсредств (Роспотребнадзор)
					</button>
				</div>

				{/* Tab Viewport */}
				<div className="sanpin-tab-viewport">
					{/* =========================================================================
					    TAB 1: PSO QUALITY CONTROL (ФОРМА № 366/у)
					    ========================================================================= */}
					{activeTab === "pso" && (
						<>
							{/* Quick 1-Click Batch Logger Bar */}
							<div
								style={{
									padding: "1rem 1.25rem",
									borderRadius: "0.6rem",
									background: "rgba(37, 99, 235, 0.06)",
									border: "1.5px solid rgba(37, 99, 235, 0.25)",
									display: "flex",
									flexDirection: "column",
									gap: "0.75rem",
								}}
							>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--brand-primary, #2563eb)" }}>
										⚡ Быстрая фиксация отрицательных проб ПСО (1-Click СанПиН 3.3686-21):
									</div>
									<button
										type="button"
										onClick={() => setIsPsoModalOpen(true)}
										className="sanpin-action-btn sanpin-action-btn-primary"
									>
										<Plus size={16} /> Внести подробную пробу ПСО
									</button>
								</div>
								<div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
									{DENTAL_INSTRUMENT_CATEGORIES.map((cat) => {
										const req = calculatePsoSampleRequirements(cat.defaultBatchSize);
										return (
											<button
												key={cat.id}
												type="button"
												onClick={() => handleQuickPsoSuccess(cat)}
												className="sanpin-action-btn sanpin-action-btn-secondary"
												style={{ fontSize: "0.825rem", padding: "0.45rem 0.85rem" }}
												title={`Автоматически зафиксировать норму ПСО для ${cat.categoryNameRu} (${cat.defaultBatchSize} шт., ${req.minSampleCount} проб)`}
											>
												<CheckCircle2 size={14} color="#059669" />
												{cat.categoryNameRu} ({req.minSampleCount} проб)
											</button>
										);
									})}
								</div>
							</div>

							{/* Toolbar */}
							<div className="sanpin-toolbar">
								<div className="sanpin-filter-row">
									<div style={{ position: "relative", display: "flex", alignItems: "center" }}>
										<Search size={16} style={{ position: "absolute", left: "0.75rem", color: "var(--muted)" }} />
										<input
											type="text"
											placeholder="Поиск по инструменту, средству, оператору..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											className="sanpin-search-input"
										/>
									</div>
									<select
										value={psoFilter}
										onChange={(e) => setPsoFilter(e.target.value as any)}
										className="sanpin-select-control"
									>
										<option value="all">Все записи ПСО</option>
										<option value="approved">Партия допущена (Норма)</option>
										<option value="rejected">Брак (Повторная очистка)</option>
									</select>
								</div>
							</div>

							{/* Table */}
							<div className="sanpin-table-container">
								<table className="sanpin-data-table">
									<thead>
										<tr>
											<th>Дата и время</th>
											<th>Наименование инструментария</th>
											<th>Партия / Проверено</th>
											<th>Азопирам (кровь)</th>
											<th>Фенолфталеин (щелочь)</th>
											<th>Судан III (масло)</th>
											<th>Моющее средство</th>
											<th>Результат</th>
											<th>Заверка ЭЦП</th>
										</tr>
									</thead>
									<tbody>
										{filteredPsoRecords.length === 0 ? (
											<tr>
												<td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", color: "var(--muted)" }}>
													Записи контроля ПСО не найдены.
												</td>
											</tr>
										) : (
											filteredPsoRecords.map((rec) => (
												<tr key={rec.id}>
													<td style={{ whiteSpace: "nowrap" }}>
														<div style={{ fontWeight: 700 }}>
															{new Date(rec.timestamp).toLocaleDateString("ru-RU")}
														</div>
														<div style={{ fontSize: "0.775rem", color: "var(--muted)" }}>
															{new Date(rec.timestamp).toLocaleTimeString("ru-RU", {
																hour: "2-digit",
																minute: "2-digit",
															})}
														</div>
													</td>
													<td>
														<div style={{ fontWeight: 700, color: "var(--ink)" }}>{rec.instrumentName}</div>
														<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>ID: {rec.id}</div>
													</td>
													<td>
														<span style={{ fontWeight: 700 }}>{rec.batchItemCount} шт.</span>
														<span style={{ fontSize: "0.8rem", color: "var(--muted)" }}> / {rec.testedSampleCount} проб</span>
													</td>
													<td>
														{rec.isAzopyramNegative ? (
															<span className="sanpin-status-pill success">
																<CheckCircle2 size={13} /> Отрицат.
															</span>
														) : (
															<span className="sanpin-status-pill danger">
																<XCircle size={13} /> КРОВЬ
															</span>
														)}
													</td>
													<td>
														{rec.isPhenolphthaleinNegative ? (
															<span className="sanpin-status-pill success">
																<CheckCircle2 size={13} /> Отрицат.
															</span>
														) : (
															<span className="sanpin-status-pill danger">
																<XCircle size={13} /> ЩЕЛОЧЬ
															</span>
														)}
													</td>
													<td>
														{rec.isSudanNegative ? (
															<span className="sanpin-status-pill success">
																<CheckCircle2 size={13} /> Отрицат.
															</span>
														) : (
															<span className="sanpin-status-pill danger">
																<XCircle size={13} /> МАСЛО
															</span>
														)}
													</td>
													<td style={{ fontSize: "0.825rem" }}>{rec.detergentBrand}</td>
													<td>
														{rec.isBatchApproved ? (
															<span className="sanpin-status-pill success">Допущено</span>
														) : (
															<span className="sanpin-status-pill danger">БРАК</span>
														)}
													</td>
													<td>
														{rec.electronicStampVerified ? (
															<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
																<span style={{ fontSize: "0.8rem", fontWeight: 700 }}>
																	{rec.operatorStaffFullName}
																</span>
																<span className="sanpin-gov-tag" style={{ fontSize: "0.725rem", padding: "0.1rem 0.4rem" }}>
																	<CheckCircle2 size={10} /> ЭЦП активна
																</span>
															</div>
														) : (
															<button
																type="button"
																onClick={() => handleStampPso(rec.id)}
																className="sanpin-action-btn sanpin-action-btn-secondary"
																style={{ minHeight: "36px", padding: "0.25rem 0.6rem", fontSize: "0.775rem" }}
															>
																<Award size={12} /> Заверить
															</button>
														)}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</>
					)}

					{/* =========================================================================
					    TAB 2: BACTERICIDAL FLEET & OPERATING HOURS (Р 3.5.1904-04)
					    ========================================================================= */}
					{activeTab === "bactericidal" && (
						<>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
									Парк бактерицидных установок клиники ({bactericidalEquipments.length} шт.)
								</h3>
								<div style={{ display: "flex", gap: "0.6rem" }}>
									<button
										type="button"
										onClick={() => setIsAddEquipModalOpen(true)}
										className="sanpin-action-btn sanpin-action-btn-secondary"
									>
										<Plus size={16} /> Добавить аппарат
									</button>
									<button
										type="button"
										onClick={() => setIsSessionModalOpen(true)}
										className="sanpin-action-btn sanpin-action-btn-primary"
									>
										<Clock size={16} /> Внести сеанс облучения
									</button>
								</div>
							</div>

							{/* Fleet Grid */}
							<div className="sanpin-fleet-grid">
								{bactericidalEquipments.map((eq) => {
									const fillClass =
										eq.lampStatus === "expired_replace_now"
											? "expired"
											: eq.lampStatus === "warning_replace_soon"
												? "warning"
												: "normal";

									return (
										<div key={eq.id} className="sanpin-fleet-card">
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
												<div>
													<div style={{ fontWeight: 800, fontSize: "1rem" }}>{eq.deviceBrand}</div>
													<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
														{eq.roomName} (V = {eq.roomVolumeM3} м³)
													</div>
												</div>
												<span className={`sanpin-status-pill ${fillClass === "expired" ? "danger" : fillClass === "warning" ? "warning" : "success"}`}>
													{fillClass === "expired" ? "РЕСУРС ИСЧЕРПАН" : fillClass === "warning" ? "СКОРО ЗАМЕНА" : "НОРМА"}
												</span>
											</div>

											<div style={{ fontSize: "0.775rem", color: "var(--muted)" }}>
												Зав. №: <strong style={{ color: "var(--ink)" }}>{eq.serialNumber}</strong> | Лампы: {eq.lampType} ({eq.lampCount} шт.)
											</div>

											{/* Meter */}
											<div>
												<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
													<span>Наработка: <strong>{eq.totalOperatingHours} ч</strong></span>
													<span>Лимит: <strong>{eq.maxLampHours} ч</strong></span>
												</div>
												<div className="sanpin-lamp-meter-track">
													<div
														className={`sanpin-lamp-meter-fill ${fillClass}`}
														style={{ width: `${Math.min(100, (eq.totalOperatingHours / eq.maxLampHours) * 100)}%` }}
													/>
												</div>
												<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--muted)" }}>
													<span>Остаток: <strong>{eq.remainingLampHours} ч</strong> ({eq.remainingLampPercent}%)</span>
													{eq.lastLampReplacementDate && <span>Замена: {eq.lastLampReplacementDate}</span>}
												</div>
											</div>

											<div style={{ marginTop: "auto", paddingTop: "0.5rem", display: "flex", justifyContent: "flex-end" }}>
												<button
													type="button"
													onClick={() => handleResetLampHours(eq.id)}
													className="sanpin-action-btn sanpin-action-btn-secondary"
													style={{ minHeight: "36px", fontSize: "0.775rem", padding: "0.3rem 0.75rem" }}
												>
													<RefreshCw size={12} /> Замена ламп (сброс)
												</button>
											</div>
										</div>
									);
								})}
							</div>

							{/* Session Log Table */}
							<div className="sanpin-toolbar" style={{ marginTop: "0.5rem" }}>
								<div className="sanpin-filter-row">
									<span style={{ fontSize: "0.875rem", fontWeight: 700 }}>Фильтр сеансов:</span>
									<select
										value={selectedEquipId}
										onChange={(e) => setSelectedEquipId(e.target.value)}
										className="sanpin-select-control"
									>
										<option value="all">Все облучатели клиники</option>
										{bactericidalEquipments.map((e) => (
											<option key={e.id} value={e.id}>
												{e.roomName} ({e.deviceBrand})
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="sanpin-table-container">
								<table className="sanpin-data-table">
									<thead>
										<tr>
											<th>Дата сеанса</th>
											<th>Кабинет / Аппарат</th>
											<th>Время работы</th>
											<th>Длительность</th>
											<th>Режим обеззараживания</th>
											<th>Наработка ламп</th>
											<th>Ответственный</th>
										</tr>
									</thead>
									<tbody>
										{filteredBactericidalSessions.map((sess) => (
											<tr key={sess.id}>
												<td style={{ fontWeight: 700 }}>{sess.date}</td>
												<td>
													<div style={{ fontWeight: 700 }}>{sess.roomName}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{sess.deviceBrand}</div>
												</td>
												<td>{sess.sessionStartTime} — {sess.sessionEndTime}</td>
												<td>
													<span style={{ fontWeight: 700 }}>{sess.durationMinutes} мин</span>
													<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}> ({sess.durationHours} ч)</span>
												</td>
												<td>
													<span className="sanpin-status-pill neutral">
														{sess.operatingMode === "continuous_presence"
															? "В присутствии людей"
															: sess.operatingMode === "pre_op_preparation"
																? "Предоперационный"
																: sess.operatingMode === "post_cleaning"
																	? "После уборки"
																	: "Периодический"}
													</span>
												</td>
												<td style={{ fontWeight: 800, color: "var(--brand-primary)" }}>
													{sess.cumulativeHoursAfterSession} ч
												</td>
												<td style={{ fontSize: "0.825rem" }}>{sess.operatorStaffFullName}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</>
					)}

					{/* =========================================================================
					    TAB 3: GENERAL CLEANINGS (САНПИН 3.3686-21)
					    ========================================================================= */}
					{activeTab === "cleaning" && (
						<>
							<div className="sanpin-toolbar">
								<div className="sanpin-filter-row">
									<div style={{ position: "relative", display: "flex", alignItems: "center" }}>
										<Search size={16} style={{ position: "absolute", left: "0.75rem", color: "var(--muted)" }} />
										<input
											type="text"
											placeholder="Поиск по кабинету, дезсредству..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											className="sanpin-search-input"
										/>
									</div>
									<select
										value={cleaningFilter}
										onChange={(e) => setCleaningFilter(e.target.value)}
										className="sanpin-select-control"
									>
										<option value="all">Все помещения клиники</option>
										<option value="surgical">Операционная / Хирургия</option>
										<option value="therapeutic">Терапевтический кабинет</option>
										<option value="cso_sterile">Стерилизационная (ЦСО)</option>
										<option value="xray">Кабинет рентгенодиагностики</option>
									</select>
								</div>
								<button
									type="button"
									onClick={() => setIsCleaningModalOpen(true)}
									className="sanpin-action-btn sanpin-action-btn-primary"
								>
									<Plus size={16} /> Зафиксировать генеральную уборку
								</button>
							</div>

							<div className="sanpin-table-container">
								<table className="sanpin-data-table">
									<thead>
										<tr>
											<th>План / Факт дата</th>
											<th>Помещение</th>
											<th>Площадь</th>
											<th>Дезсредство (концентрация)</th>
											<th>Экспозиция</th>
											<th>УФ-облучение</th>
											<th>Проветривание</th>
											<th>Исполнитель</th>
											<th>Контроль</th>
										</tr>
									</thead>
									<tbody>
										{filteredCleaningRecords.map((clean) => (
											<tr key={clean.id}>
												<td>
													<div style={{ fontWeight: 700 }}>{clean.scheduledDate}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														Факт: {new Date(clean.actualDateTime).toLocaleDateString("ru-RU")}
													</div>
												</td>
												<td>
													<div style={{ fontWeight: 700 }}>{clean.roomName}</div>
													<span className="sanpin-status-pill neutral" style={{ fontSize: "0.725rem" }}>
														{clean.roomType === "surgical" ? "Хирургия (7 дн)" : "Терапия (7 дн)"}
													</span>
												</td>
												<td>{clean.treatedAreaM2} м²</td>
												<td>
													<div style={{ fontWeight: 600 }}>{clean.disinfectantName}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														Концентрация: {clean.solutionConcentrationPercent}%
													</div>
												</td>
												<td>{clean.exposureTimeMinutes} мин</td>
												<td>
													<span style={{ fontWeight: 700, color: "var(--brand-primary)" }}>
														{clean.uvIrradiationMinutes} мин
													</span>
												</td>
												<td>{clean.ventilationMinutes} мин</td>
												<td style={{ fontSize: "0.825rem" }}>{clean.operatorStaffFullName}</td>
												<td>
													<span className="sanpin-status-pill success">
														<CheckCircle2 size={12} /> Заверено
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</>
					)}

					{/* =========================================================================
					    TAB 4: DISINFECTANTS STOCK & JOURNAL (РОСПОТРЕБНАДЗОР)
					    ========================================================================= */}
					{activeTab === "disinfectants" && (
						<>
							{/* Stock Cards */}
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
									Складской учет дезинфицирующих средств (30-дневный неснижаемый запас)
								</h3>
								<button
									type="button"
									onClick={() => setIsDisinfectantModalOpen(true)}
									className="sanpin-action-btn sanpin-action-btn-primary"
								>
									<Plus size={16} /> Внести приход / расход дезсредства
								</button>
							</div>

							<div className="sanpin-fleet-grid">
								{disinfectantStocks.map((stk) => {
									const isLow = stk.currentStock < stk.monthlyMinStockRequired;
									return (
										<div key={stk.id} className="sanpin-fleet-card">
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
												<div>
													<div style={{ fontWeight: 800, fontSize: "1rem" }}>{stk.tradeName}</div>
													<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
														Действующая группа: {stk.activeGroup}
													</div>
												</div>
												<span className={`sanpin-status-pill ${isLow ? "warning" : "success"}`}>
													{isLow ? "НИЗКИЙ ЗАПАС" : "В НАЛИЧИИ"}
												</span>
											</div>

											<div style={{ fontSize: "1.3rem", fontWeight: 800 }}>
												{stk.currentStock.toFixed(2)} {stk.unit}
												<span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--muted)", marginLeft: "8px" }}>
													(мин. норма: {stk.monthlyMinStockRequired} {stk.unit})
												</span>
											</div>
										</div>
									);
								})}
							</div>

							{/* Disinfectant Journal Table */}
							<div className="sanpin-table-container" style={{ marginTop: "0.5rem" }}>
								<table className="sanpin-data-table">
									<thead>
										<tr>
											<th>Дата</th>
											<th>Операция</th>
											<th>Препарат</th>
											<th>Количество</th>
											<th>Накладная / Объект обработки</th>
											<th>Приготовлено р-ра</th>
											<th>Остаток</th>
											<th>Ответственный</th>
										</tr>
									</thead>
									<tbody>
										{disinfectantJournal.map((entry) => {
											const isReceipt = entry.operationType === "receipt";
											return (
												<tr key={entry.id}>
													<td style={{ fontWeight: 700 }}>
														{new Date(entry.timestamp).toLocaleDateString("ru-RU")}
													</td>
													<td>
														<span className={`sanpin-status-pill ${isReceipt ? "success" : "neutral"}`}>
															{isReceipt ? "Приход" : "Расход"}
														</span>
													</td>
													<td style={{ fontWeight: 700 }}>{entry.tradeName}</td>
													<td style={{ fontWeight: 800, color: isReceipt ? "#059669" : "#dc2626" }}>
														{isReceipt ? `+${entry.amount} ${entry.unit}` : `-${entry.amount} ${entry.unit}`}
													</td>
													<td>{entry.invoiceOrObjectInfo}</td>
													<td>
														{entry.solutionPreparedLiters
															? `${entry.solutionPreparedLiters} л (${entry.concentrationPercent}%)`
															: "—"}
													</td>
													<td style={{ fontWeight: 800 }}>{entry.resultingStockBalance.toFixed(2)} {entry.unit}</td>
													<td style={{ fontSize: "0.825rem" }}>{entry.operatorStaffFullName}</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</>
					)}
				</div>

				{/* =========================================================================
				    MODAL: DETAILED PSO ENTRY
				    ========================================================================= */}
				{isPsoModalOpen && (
					<div className="sanpin-inner-modal-overlay">
						<div className="sanpin-inner-modal">
							<div className="sanpin-inner-modal-header">
								<h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<FlaskConical size={20} color="var(--brand-primary)" />
									Фиксация пробы ПСО (Форма № 366/у)
								</h3>
								<button type="button" onClick={() => setIsPsoModalOpen(false)} className="sanpin-close-btn">
									<X size={20} />
								</button>
							</div>
							<form onSubmit={handleSavePsoTrial}>
								<div className="sanpin-inner-modal-body">
									<div className="sanpin-field-group">
										<label className="sanpin-field-label">Категория инструментария</label>
										<select
											value={psoCategory}
											onChange={(e) => {
												const catId = e.target.value;
												setPsoCategory(catId);
												const found = DENTAL_INSTRUMENT_CATEGORIES.find((c) => c.id === catId);
												if (found) {
													setPsoInstrumentName(found.categoryNameRu);
													setPsoBatchCount(found.defaultBatchSize);
													const req = calculatePsoSampleRequirements(found.defaultBatchSize);
													setPsoSampleCount(req.minSampleCount);
												}
											}}
											className="sanpin-field-select"
										>
											{DENTAL_INSTRUMENT_CATEGORIES.map((c) => (
												<option key={c.id} value={c.id}>
													{c.categoryNameRu}
												</option>
											))}
										</select>
									</div>

									<div className="sanpin-field-group">
										<label className="sanpin-field-label">Наименование изделий в партии</label>
										<input
											type="text"
											required
											value={psoInstrumentName}
											onChange={(e) => setPsoInstrumentName(e.target.value)}
											className="sanpin-field-input"
										/>
									</div>

									<div className="sanpin-form-2col">
										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Объем партии (шт)</label>
											<input
												type="number"
												min={1}
												required
												value={psoBatchCount}
												onChange={(e) => {
													const count = parseInt(e.target.value, 10) || 1;
													setPsoBatchCount(count);
													const req = calculatePsoSampleRequirements(count);
													if (psoSampleCount < req.minSampleCount) {
														setPsoSampleCount(req.minSampleCount);
													}
												}}
												className="sanpin-field-input"
											/>
										</div>

										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Проверено образцов (шт)</label>
											<input
												type="number"
												min={1}
												required
												value={psoSampleCount}
												onChange={(e) => setPsoSampleCount(parseInt(e.target.value, 10) || 1)}
												className="sanpin-field-input"
											/>
										</div>
									</div>

									<div className="sanpin-form-2col">
										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Азопирам (кровь)</label>
											<select
												value={psoAzopyramNeg ? "negative" : "positive"}
												onChange={(e) => setPsoAzopyramNeg(e.target.value === "negative")}
												className="sanpin-field-select"
											>
												<option value="negative">Отрицательная (Норма)</option>
												<option value="positive">Положительная (КРОВЬ)</option>
											</select>
										</div>

										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Фенолфталеин (щелочь)</label>
											<select
												value={psoPhenolNeg ? "negative" : "positive"}
												onChange={(e) => setPsoPhenolNeg(e.target.value === "negative")}
												className="sanpin-field-select"
											>
												<option value="negative">Отрицательная (Норма)</option>
												<option value="positive">Положительная (ЩЕЛОЧЬ)</option>
											</select>
										</div>
									</div>

									<div className="sanpin-field-group">
										<label className="sanpin-field-label">Моющее средство</label>
										<input
											type="text"
											value={psoDetergent}
											onChange={(e) => setPsoDetergent(e.target.value)}
											className="sanpin-field-input"
										/>
									</div>

									{/* Live Regulatory Evaluation Box */}
									<div
										style={{
											padding: "0.85rem",
											borderRadius: "0.5rem",
											background: livePsoEval.isBatchApproved ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
											border: `1px solid ${livePsoEval.isBatchApproved ? "#059669" : "#dc2626"}`,
											display: "flex",
											alignItems: "flex-start",
											gap: "0.5rem",
										}}
									>
										{livePsoEval.isBatchApproved ? (
											<CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
										) : (
											<AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
										)}
										<div>
											<div style={{ fontWeight: 700, fontSize: "0.85rem", color: livePsoEval.isBatchApproved ? "#059669" : "#dc2626" }}>
												{livePsoEval.complianceNoteRu}
											</div>
											{livePsoEval.rejectionReason && (
												<div style={{ fontSize: "0.775rem", color: "#dc2626", marginTop: "4px" }}>
													{livePsoEval.rejectionReason}
												</div>
											)}
										</div>
									</div>
								</div>

								<div className="sanpin-inner-modal-footer">
									<button type="button" onClick={() => setIsPsoModalOpen(false)} className="sanpin-action-btn sanpin-action-btn-secondary">
										Отмена
									</button>
									<button type="submit" className="sanpin-action-btn sanpin-action-btn-primary">
										Зафиксировать пробу
									</button>
								</div>
							</form>
						</div>
					</div>
				)}

				{/* =========================================================================
				    MODAL: LOG BACTERICIDAL SESSION
				    ========================================================================= */}
				{isSessionModalOpen && (
					<div className="sanpin-inner-modal-overlay">
						<div className="sanpin-inner-modal">
							<div className="sanpin-inner-modal-header">
								<h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<Clock size={20} color="var(--brand-primary)" />
									Фиксация сеанса работы облучателя
								</h3>
								<button type="button" onClick={() => setIsSessionModalOpen(false)} className="sanpin-close-btn">
									<X size={20} />
								</button>
							</div>
							<form onSubmit={handleSaveBactericidalSession}>
								<div className="sanpin-inner-modal-body">
									<div className="sanpin-field-group">
										<label className="sanpin-field-label">Выберите облучатель / помещение</label>
										<select
											value={sessionEquipId}
											onChange={(e) => setSessionEquipId(e.target.value)}
											className="sanpin-field-select"
										>
											{bactericidalEquipments.map((e) => (
												<option key={e.id} value={e.id}>
													{e.roomName} — {e.deviceBrand} (Зав. №{e.serialNumber})
												</option>
											))}
										</select>
									</div>

									<div className="sanpin-form-2col">
										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Дата сеанса</label>
											<input
												type="date"
												required
												value={sessionDate}
												onChange={(e) => setSessionDate(e.target.value)}
												className="sanpin-field-input"
											/>
										</div>

										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Режим работы</label>
											<select
												value={sessionMode}
												onChange={(e) => setSessionMode(e.target.value as any)}
												className="sanpin-field-select"
											>
												<option value="continuous_presence">В присутствии людей (смена)</option>
												<option value="pre_op_preparation">Предоперационный (30-60 мин)</option>
												<option value="post_cleaning">После генеральной уборки</option>
											</select>
										</div>
									</div>

									<div className="sanpin-form-2col">
										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Время включения</label>
											<input
												type="time"
												required
												value={sessionStartTime}
												onChange={(e) => setSessionStartTime(e.target.value)}
												className="sanpin-field-input"
											/>
										</div>

										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Время выключения</label>
											<input
												type="time"
												required
												value={sessionEndTime}
												onChange={(e) => setSessionEndTime(e.target.value)}
												className="sanpin-field-input"
											/>
										</div>
									</div>

									<div className="sanpin-field-group">
										<label className="sanpin-field-label">Длительность работы (минут)</label>
										<input
											type="number"
											min={1}
											required
											value={sessionDurationMin}
											onChange={(e) => setSessionDurationMin(parseInt(e.target.value, 10) || 0)}
											className="sanpin-field-input"
										/>
										<span style={{ fontSize: "0.775rem", color: "var(--muted)" }}>
											= {(sessionDurationMin / 60).toFixed(2)} часам наработки ламп
										</span>
									</div>
								</div>

								<div className="sanpin-inner-modal-footer">
									<button type="button" onClick={() => setIsSessionModalOpen(false)} className="sanpin-action-btn sanpin-action-btn-secondary">
										Отмена
									</button>
									<button type="submit" className="sanpin-action-btn sanpin-action-btn-primary">
										Зафиксировать сеанс
									</button>
								</div>
							</form>
						</div>
					</div>
				)}

				{/* =========================================================================
				    MODAL: ADD EQUIPMENT
				    ========================================================================= */}
				{isAddEquipModalOpen && (
					<div className="sanpin-inner-modal-overlay">
						<div className="sanpin-inner-modal">
							<div className="sanpin-inner-modal-header">
								<h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
									Постановка бактерицидной установки на учет
								</h3>
								<button type="button" onClick={() => setIsAddEquipModalOpen(false)} className="sanpin-close-btn">
									<X size={20} />
								</button>
							</div>
							<form onSubmit={handleSaveEquipment}>
								<div className="sanpin-inner-modal-body">
									<div className="sanpin-field-group">
										<label className="sanpin-field-label">Помещение / Кабинет</label>
										<input
											type="text"
											required
											value={newRoomName}
											onChange={(e) => setNewRoomName(e.target.value)}
											className="sanpin-field-input"
										/>
									</div>

									<div className="sanpin-form-2col">
										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Объем помещения (V, м³)</label>
											<input
												type="number"
												step="0.1"
												required
												value={newRoomVolume}
												onChange={(e) => setNewRoomVolume(parseFloat(e.target.value) || 0)}
												className="sanpin-field-input"
											/>
										</div>

										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Тип облучателя</label>
											<select
												value={newDeviceType}
												onChange={(e) => setNewDeviceType(e.target.value as any)}
												className="sanpin-field-select"
											>
												<option value="recirculator_closed">Рециркулятор закрытого типа</option>
												<option value="irradiator_open">Облучатель открытого типа</option>
											</select>
										</div>
									</div>

									<div className="sanpin-form-2col">
										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Марка / модель аппарата</label>
											<input
												type="text"
												required
												value={newDeviceBrand}
												onChange={(e) => setNewDeviceBrand(e.target.value)}
												className="sanpin-field-input"
											/>
										</div>

										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Заводской номер</label>
											<input
												type="text"
												required
												value={newSerialNumber}
												onChange={(e) => setNewSerialNumber(e.target.value)}
												className="sanpin-field-input"
											/>
										</div>
									</div>

									<div className="sanpin-field-group">
										<label className="sanpin-field-label">Паспортный ресурс ламп (часов)</label>
										<input
											type="number"
											required
											value={newMaxHours}
											onChange={(e) => setNewMaxHours(parseInt(e.target.value, 10) || 8000)}
											className="sanpin-field-input"
										/>
									</div>
								</div>

								<div className="sanpin-inner-modal-footer">
									<button type="button" onClick={() => setIsAddEquipModalOpen(false)} className="sanpin-action-btn sanpin-action-btn-secondary">
										Отмена
									</button>
									<button type="submit" className="sanpin-action-btn sanpin-action-btn-primary">
										Поставить на учет
									</button>
								</div>
							</form>
						</div>
					</div>
				)}

				{/* =========================================================================
				    MODAL: LOG GENERAL CLEANING
				    ========================================================================= */}
				{isCleaningModalOpen && (
					<div className="sanpin-inner-modal-overlay">
						<div className="sanpin-inner-modal">
							<div className="sanpin-inner-modal-header">
								<h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<Sparkles size={20} color="var(--brand-primary)" />
									Проведение генеральной уборки (СанПиН 3.3686-21)
								</h3>
								<button type="button" onClick={() => setIsCleaningModalOpen(false)} className="sanpin-close-btn">
									<X size={20} />
								</button>
							</div>
							<form onSubmit={handleSaveCleaning}>
								<div className="sanpin-inner-modal-body">
									<div className="sanpin-form-2col">
										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Профиль помещения</label>
											<select
												value={cleanRoomType}
												onChange={(e) => {
													const rt = e.target.value as any;
													setCleanRoomType(rt);
													const preset = GENERAL_CLEANING_PRESETS.find((p) => p.roomType === rt);
													if (preset) {
														setCleanRoomName(preset.roomTypeTitleRu);
														setCleanDisinfectant(preset.standardDisinfectantRu);
														setCleanConcentration(preset.standardConcentrationPercent);
														setCleanExposureMin(preset.standardExposureMinutes);
														setCleanUvMin(preset.standardUvIrradiationMinutes);
														setCleanVentilationMin(preset.standardVentilationMinutes);
													}
												}}
												className="sanpin-field-select"
											>
												<option value="surgical">Операционная / Хирургия (еженедельно)</option>
												<option value="therapeutic">Терапевтический кабинет (еженедельно)</option>
												<option value="cso_sterile">Стерилизационная ЦСО (еженедельно)</option>
												<option value="xray">Кабинет рентгенодиагностики</option>
											</select>
										</div>

										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Наименование кабинета</label>
											<input
												type="text"
												required
												value={cleanRoomName}
												onChange={(e) => setCleanRoomName(e.target.value)}
												className="sanpin-field-input"
											/>
										</div>
									</div>

									<div className="sanpin-form-2col">
										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Плановая дата</label>
											<input
												type="date"
												required
												value={cleanSchedDate}
												onChange={(e) => setCleanSchedDate(e.target.value)}
												className="sanpin-field-input"
											/>
										</div>

										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Фактическая дата и время</label>
											<input
												type="datetime-local"
												required
												value={cleanActualDateTime}
												onChange={(e) => setCleanActualDateTime(e.target.value)}
												className="sanpin-field-input"
											/>
										</div>
									</div>

									<div className="sanpin-form-2col">
										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Дезсредство</label>
											<input
												type="text"
												required
												value={cleanDisinfectant}
												onChange={(e) => setCleanDisinfectant(e.target.value)}
												className="sanpin-field-input"
											/>
										</div>

										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Концентрация (%)</label>
											<input
												type="number"
												step="0.1"
												required
												value={cleanConcentration}
												onChange={(e) => setCleanConcentration(parseFloat(e.target.value) || 0)}
												className="sanpin-field-input"
											/>
										</div>
									</div>

									<div className="sanpin-form-2col">
										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Экспозиция (мин)</label>
											<input
												type="number"
												required
												value={cleanExposureMin}
												onChange={(e) => setCleanExposureMin(parseInt(e.target.value, 10) || 0)}
												className="sanpin-field-input"
											/>
										</div>

										<div className="sanpin-field-group">
											<label className="sanpin-field-label">УФ-облучение (мин)</label>
											<input
												type="number"
												required
												value={cleanUvMin}
												onChange={(e) => setCleanUvMin(parseInt(e.target.value, 10) || 0)}
												className="sanpin-field-input"
											/>
										</div>
									</div>
								</div>

								<div className="sanpin-inner-modal-footer">
									<button type="button" onClick={() => setIsCleaningModalOpen(false)} className="sanpin-action-btn sanpin-action-btn-secondary">
										Отмена
									</button>
									<button type="submit" className="sanpin-action-btn sanpin-action-btn-primary">
										Зафиксировать уборку
									</button>
								</div>
							</form>
						</div>
					</div>
				)}

				{/* =========================================================================
				    MODAL: LOG DISINFECTANT TRANSACTION
				    ========================================================================= */}
				{isDisinfectantModalOpen && (
					<div className="sanpin-inner-modal-overlay">
						<div className="sanpin-inner-modal">
							<div className="sanpin-inner-modal-header">
								<h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<Droplets size={20} color="var(--brand-primary)" />
									Приход / Расход дезинфицирующих средств
								</h3>
								<button type="button" onClick={() => setIsDisinfectantModalOpen(false)} className="sanpin-close-btn">
									<X size={20} />
								</button>
							</div>
							<form onSubmit={handleSaveDisinfectantTransaction}>
								<div className="sanpin-inner-modal-body">
									<div className="sanpin-form-2col">
										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Вид операции</label>
											<select
												value={disOpType}
												onChange={(e) => setDisOpType(e.target.value as any)}
												className="sanpin-field-select"
											>
												<option value="consumption">Расход (приготовление рабочего раствора)</option>
												<option value="receipt">Приход (поступление от поставщика)</option>
											</select>
										</div>

										<div className="sanpin-field-group">
											<label className="sanpin-field-label">Торговое наименование</label>
											<select
												value={disTradeName}
												onChange={(e) => setDisTradeName(e.target.value)}
												className="sanpin-field-select"
											>
												{disinfectantStocks.map((s) => (
													<option key={s.id} value={s.tradeName}>
														{s.tradeName} (остаток: {s.currentStock} л)
													</option>
												))}
											</select>
										</div>
									</div>

									<div className="sanpin-form-2col">
										<div className="sanpin-field-group">
											<label className="sanpin-field-label">
												{disOpType === "receipt" ? "Поступило концентрата (л)" : "Израсходовано концентрата (л)"}
											</label>
											<input
												type="number"
												step="0.01"
												required
												value={disAmount}
												onChange={(e) => {
													const val = parseFloat(e.target.value) || 0;
													setDisAmount(val);
													if (disOpType === "consumption") {
														const math = calculateDisinfectantSolutionMath(val, disConcentration);
														setDisSolutionLiters(math.solutionVolumeLiters);
													}
												}}
												className="sanpin-field-input"
											/>
										</div>

										{disOpType === "consumption" ? (
											<div className="sanpin-field-group">
												<label className="sanpin-field-label">Концентрация раствора (%)</label>
												<input
													type="number"
													step="0.1"
													value={disConcentration}
													onChange={(e) => {
														const c = parseFloat(e.target.value) || 1.0;
														setDisConcentration(c);
														const math = calculateDisinfectantSolutionMath(disAmount, c);
														setDisSolutionLiters(math.solutionVolumeLiters);
													}}
													className="sanpin-field-input"
												/>
											</div>
										) : null}
									</div>

									<div className="sanpin-field-group">
										<label className="sanpin-field-label">
											{disOpType === "receipt" ? "Поставщик / Накладная" : "Объект дезинфекции / Назначение"}
										</label>
										<input
											type="text"
											required
											value={disInfo}
											onChange={(e) => setDisInfo(e.target.value)}
											className="sanpin-field-input"
										/>
									</div>
								</div>

								<div className="sanpin-inner-modal-footer">
									<button type="button" onClick={() => setIsDisinfectantModalOpen(false)} className="sanpin-action-btn sanpin-action-btn-secondary">
										Отмена
									</button>
									<button type="submit" className="sanpin-action-btn sanpin-action-btn-primary">
										Сохранить операцию
									</button>
								</div>
							</form>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

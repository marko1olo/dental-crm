import type React from "react";
import { useEffect, useState } from "react";
import {
	Activity,
	Boxes,
	Calculator,
	Calendar,
	Camera,
	CheckCircle2,
	Award,
	Clock,
	Coins,
	Compass,
	CreditCard,
	Crown,
	Database,
	Eye,
	FileBadge,
	FileCheck2,
	FileSpreadsheet,
	FileText,
	Flame,
	FlaskConical,
	Gauge,
	HeartPulse,
	Layers,
	Moon,
	PackageCheck,
	Palette,
	Phone,
	PhoneCall,
	Pill,
	Printer,
	QrCode,
	Receipt,
	Scan,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sliders,
	Sparkles,
	Spline,
	Sun,
	Tablet,
	Syringe,
	TrendingUp,
	Truck,
	UploadCloud,
	User,
	X,
} from "lucide-react";
import type { Kopecks } from "@dental/shared";
import { AppLogicProvider, type AppLogicContextType } from "../contexts/AppLogicContext";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../lib/safeLocalStorage";
import { useThemeStore } from "../store/themeStore";
import { showToast } from "../components/GlobalToast";
import { ToothAnesthesiaCalculator } from "../components/diagnostic/ToothAnesthesiaCalculator";
import { PrescriptionModal } from "../components/visit/PrescriptionModal";
import { ChairsideTabletConsentModal } from "../components/chairside/ChairsideTabletConsentModal";
import { CashShiftClosingModal } from "../components/billing/CashShiftClosingModal";
import { InformedConsentModal } from "../components/documents/InformedConsentModal";
import {
	RadiologyModule,
	RadiologyReferralModal,
	RadiologyViewerModal,
	CbctMprImplantStudioModal,
	CbctMpr3DStudioModal,
	ImplantCrossSectionPlanner,
	SAMPLE_PATIENT_RVG_URL,
	type RadiologyStudy,
} from "../components/radiology";
import { TreatmentPlanCompletedActPrint } from "../components/treatment-plans/TreatmentPlanCompletedActPrint";
import { FiscalReceipt54FzModal } from "../components/finance/FiscalReceipt54FzModal";
import { Billing1CExportModal } from "../components/finance/Billing1CExportModal";
import { OneCCommerceMlModal } from "../components/finance/one-c/OneCCommerceMlModal";
import { PatientBillingModal } from "../components/finance/PatientBillingModal";
import { PatientCabinetModal } from "../components/portal/patientCabinet/PatientCabinetModal";
import { SanpinRegisters } from "../components/sanpin/SanpinRegisters";
import { PediatricMixedDentitionModal } from "../components/odontogram/PediatricMixedDentitionModal";
import { DoctorPayrollModal } from "../components/finance/payroll/DoctorPayrollModal";
import { StaffPayrollLedgerModal } from "../components/payroll/StaffPayrollLedgerModal";
import { FastCheckoutModal } from "../components/payments/checkout/FastCheckoutModal";
import { MedicalPrescriptionModal } from "../components/prescriptions/generator/MedicalPrescriptionModal";
import { CashShiftWidget } from "../components/finance/CashShiftWidget";
import { CephalometricAnalysisModal } from "../components/orthodontics/CephalometricAnalysisModal";
import { SAMPLE_TRG_CEPHALOGRAM_URL } from "../components/orthodontics/CephalometricCanvas";
import { ImplantIsqProtocolModal } from "../components/implant/isq/ImplantIsqProtocolModal";
import { DentalLabOrderModal } from "../components/lab/DentalLabOrderModal";
import { DentalLabOrdersHubModal } from "../components/lab/DentalLabOrdersHubModal";
import { LabTrackingDrawer } from "../components/lab/LabTrackingDrawer";
import { ClinicalPhotoProtocolModal } from "../components/photography/ClinicalPhotoProtocolModal";
import { PatientRecallManagerModal } from "../components/recalls/PatientRecallManagerModal";
import { PatientRecallsHubModal } from "../components/recalls/PatientRecallsHubModal";
import { AutoclaveCycleModal } from "../components/sanpin/autoclave/AutoclaveCycleModal";
import { InsurancePreAuthModal } from "../components/insurance/InsurancePreAuthModal";
import { TreatmentPlanComparatorModal } from "../components/treatment-plans/comparator/TreatmentPlanComparatorModal";
import { TreatmentPlan3TierComparison } from "../components/treatment-plans/TreatmentPlan3TierComparison";
import { TreatmentPlanPhased4StageView } from "../components/treatment-plans/TreatmentPlanPhased4StageView";
import { generate3TierPlanComparison, generateTreatmentPlanStages } from "../components/treatment-plans/treatmentPlanStagesEngine";
import type { ToothData } from "../components/odontogram/ToothChart";
import { WarehouseTransferModal } from "../components/inventory/transfers/WarehouseTransferModal";
import { PatientPortalTimelineModal } from "../components/portal/timeline/PatientPortalTimelineModal";
import { VoiceDictationAssistantModal } from "../components/voice/VoiceDictationAssistantModal";
import { InformedConsentModal as InformedConsent323FzModal } from "../components/consents/InformedConsentModal";
import { AnesthesiaProtocolModal } from "../components/anesthesia/AnesthesiaProtocolModal";
import { AnesthesiaSafetyHubModal } from "../components/anesthesia/AnesthesiaSafetyHubModal";
import { SterilizationJournalModal } from "../components/sanpin/SterilizationJournalModal";
import { MedicalWasteJournalModal } from "../components/sanpin/waste/MedicalWasteJournalModal";
import { EmergencyRescueModal } from "../components/emergency/EmergencyRescueModal";
import { WarrantyPassportModal } from "../components/warranty/WarrantyPassportModal";
import { CmoEmrAuditModal } from "../components/emr/audit/CmoEmrAuditModal";
import { FnsNdflXmlModal } from "../components/documents/ndflXml/index";
import { FnsTaxDeductionModal } from "../components/billing/tax/FnsTaxDeductionModal";
import { TreatmentPlanPriceValidatorModal } from "../components/treatment-plans/validation/TreatmentPlanPriceValidatorModal";
import { SberPosTerminalModal } from "../components/payments/sberPos/SberPosTerminalModal";
import { PatientPortalModal } from "../components/portal/PatientPortalModal";
import { PatientWebappPortalModal } from "../components/patient-portal/PatientWebappPortalModal";
import { EgiszRemdHubModal } from "../components/egisz/EgiszRemdHubModal";
import { LabWorkOrderModal } from "../components/lab/orders/LabWorkOrderModal";
import { ClinicalWriteoffModal } from "../components/inventory/writeoff/ClinicalWriteoffModal";
import { DmsInsuranceManagerModal } from "../components/insurance/dmsManager/DmsInsuranceManagerModal";
import { KraftPackageBarcodeModal } from "../components/sanpin/kraft/KraftPackageBarcodeModal";
import { ServicePricelistManagerModal } from "../components/catalog/pricelist/ServicePricelistManagerModal";
import { LoyaltyProgramModal } from "../components/loyalty/program/LoyaltyProgramModal";
import { SickLeaveElnModal } from "../components/documents/sickLeave/SickLeaveElnModal";
import { AutoclaveLog257Modal } from "../components/sanpin/autoclaveLog/AutoclaveLog257Modal";
import { SterilizationStudioModal } from "../components/sterilization/SterilizationStudioModal";
import { DoctorShiftRosterModal } from "../components/schedule/roster/DoctorShiftRosterModal";
import { AnesthesiaQuickBar } from "../components/anesthesia/AnesthesiaQuickBar";
import { BeforeAfterComparisonView } from "../components/photography/BeforeAfterComparisonView";
import { PatientMemoPrintModal } from "../components/visit/PatientMemoPrintModal";
import { ProcedureMaterialDeductionModal } from "../components/inventory/ProcedureMaterialDeductionModal";
import { IncomingCallPopup } from "../components/telephony/IncomingCallPopup";
import { TelephonyFloatingWidget } from "../components/telephony/TelephonyFloatingWidget";
import { useTelephonyStore } from "../store/telephonyStore";
import { SettingsAccessTab } from "../components/settings/SettingsAccessTab";
import { StaffCommissionsPanel } from "../components/settings/StaffCommissionsPanel";
import { CmoComplianceHub } from "../components/emr/audit/CmoComplianceHub";
import { Form043PrintModal } from "../components/emr/Form043PrintModal";
import { OfflineBackupVaultPanel } from "../components/settings/OfflineBackupVaultPanel";
import { ClinicalPnlHubModal } from "../components/finance/pnl/ClinicalPnlHubModal";
import { AuditTrailHubModal } from "../components/security/AuditTrailHubModal";
import { CmoQualityAuditModal } from "../components/cmo/CmoQualityAuditModal";
import { OfflineSyncGuardModal } from "../components/sync/OfflineSyncGuardModal";
import {
	STANDARD_12_SLOT_PROTOCOL,
	type PhotoSlotRecord,
} from "../components/photography/photoGridPresets";
import type { CompletedWorksActAndWriteOffData, TreatmentPlanItem } from "../components/treatment-plans/types";
import type { DiaryState } from "../components/useVisitDiaryLogic";

const THEMES = [
	{ id: "light", label: "Светлая" },
	{ id: "dark", label: "Тёмная" },
	{ id: "night", label: "Ночная" },
	{ id: "calm_teal", label: "Мягкий тил" },
	{ id: "contrast", label: "Контрастная" },
	{ id: "sakura", label: "Сакура" },
	{ id: "ocean", label: "Океан" },
	{ id: "emerald", label: "Изумруд" },
	{ id: "cyber_xray", label: "Рентген / Неон" },
	{ id: "warm_sand", label: "Тёплый песок" },
];

const SAMPLE_PATIENT = {
	fullName: "Смирнова Екатерина Васильевна",
	birthDate: "1988-06-14",
	phone: "+7 (926) 555-12-34",
	cardNumber: "043/у-2026/891",
	medicalCardNumber: "043/у-2026/891",
};

const SAMPLE_DIARY: DiaryState = {
	anamnesis: "Боли в области зуба 16 при накусывании, реакция на холодное/горячее. Зуб 16 ранее лечен 2 года назад.",
	statusLocalis: "Зуб 16: глубокая кариозная полость на жевательной поверхности, зондирование болезненно по дну, перкуссия слабо болезненна.",
	diagnosisTooth: "16",
	diagnosisIcd10: "K04.0",
	treatmentDescription: "Под инфильтрационной анестезией Sol. Ultracaini DS Forte 1.7 ml проведено препарирование, экстирпация пульпы, механическая обработка каналов.",
	complications: "Без осложнений",
	comorbidities: "Соматически здорова",
};

const SAMPLE_TREATMENT_ITEMS: readonly TreatmentPlanItem[] = [
	{
		id: "proc_1",
		code804n: "A16.07.002.001",
		toothNumber: 16,
		name: "Наложение временной пломбы (Septo-pack / Cavit)",
		category: "Терапия",
		quantity: 1,
		unitPriceRub: 1200,
		discountRub: 0,
		priceRub: 1200,
		phase: 1,
		stageKind: "stage_1_therapy",
	},
	{
		id: "proc_2",
		code804n: "A16.07.030.002",
		toothNumber: 16,
		name: "Инструментальная и медикаментозная обработка 3 корневых каналов (Reciproc Blue)",
		category: "Эндодонтия",
		quantity: 3,
		unitPriceRub: 3500,
		discountRub: 500,
		priceRub: 10000,
		phase: 1,
		stageKind: "stage_1_therapy",
	},
	{
		id: "proc_3",
		code804n: "A16.07.008",
		toothNumber: 16,
		name: "Пломбирование корневого канала термопластифицированной гуттаперчей (GuttaCore)",
		category: "Эндодонтия",
		quantity: 3,
		unitPriceRub: 2800,
		discountRub: 0,
		priceRub: 8400,
		phase: 1,
		stageKind: "stage_1_therapy",
	},
];

const SAMPLE_COMPLETED_ACT: CompletedWorksActAndWriteOffData = {
	actNumber: "АВР-2026-0042",
	actDate: "21.08.2026",
	contractNumber: "ДОГ-2026-0891",
	stageNumber: 1,
	stageTitle: "Терапевтическое и эндодонтическое лечение зуба 1.6",
	clinicName: "Стоматологическая клиника «ДЕНТЕ СТОМАТОЛОГИЯ»",
	doctorFullName: "Д-р Смирнов Алексей Петрович",
	patientName: "Смирнова Екатерина Васильевна",
	patientId: "PAT-2026-0891",
	status: "signed",
	createdAtIso: "2026-08-21T10:00:00.000Z",
	completedProcedures: SAMPLE_TREATMENT_ITEMS,
	writtenOffMaterials: [
		{
			id: "mat_1",
			materialName: "Набор машинных файлов Reciproc Blue R25 (25 мм)",
			order804nCode: "A16.07.030.002",
			procedureName: "Обработка каналов",
			toothNumber: 16,
			unitOfMeasure: "упак.",
			quantityRequired: 1,
			unitCostRub: 2450,
			unitCostKopecks: 245000 as Kopecks,
			totalCostRub: 2450,
			totalCostKopecks: 245000 as Kopecks,
			inStockQuantity: 14,
			isDeficit: false,
			deficitQuantity: 0,
		},
		{
			id: "mat_2",
			materialName: "Обтураторы GuttaCore для зуба 16",
			order804nCode: "A16.07.008",
			procedureName: "Пломбирование каналов",
			toothNumber: 16,
			unitOfMeasure: "шт.",
			quantityRequired: 3,
			unitCostRub: 380,
			unitCostKopecks: 38000 as Kopecks,
			totalCostRub: 1140,
			totalCostKopecks: 114000 as Kopecks,
			inStockQuantity: 42,
			isDeficit: false,
			deficitQuantity: 0,
		},
		{
			id: "mat_3",
			materialName: "Карпулы Ультракаин Д-С форте 1.7 мл",
			order804nCode: "A16.07.002.001",
			procedureName: "Анестезия",
			toothNumber: 16,
			unitOfMeasure: "карп.",
			quantityRequired: 2,
			unitCostRub: 190,
			unitCostKopecks: 19000 as Kopecks,
			totalCostRub: 380,
			totalCostKopecks: 38000 as Kopecks,
			inStockQuantity: 120,
			isDeficit: false,
			deficitQuantity: 0,
		},
	],
	totalServiceRub: 19600,
	totalServiceKopecks: 1960000 as Kopecks,
	totalMaterialCostRub: 3970,
	totalMaterialCostKopecks: 397000 as Kopecks,
	marginRub: 15630,
	marginPercent: 80,
};

const SAMPLE_STUDY: RadiologyStudy = {
	id: "sample-visio-16",
	patientName: "Смирнова Екатерина Васильевна",
	studyDate: "2026-08-21 11:30",
	studyType: "intraoral_radiovisiography",
	modality: "intraoral_rvg",
	modalityLabel: "Прицельная радиовизиография",
	anatomicalArea: "Зуб 16 (Верхний правый моляр)",
	teethFdi: ["16"],
	effectiveDoseMicrosv: 3.0,
	effectiveDoseMsv: 0.003,
	imageUrl: SAMPLE_PATIENT_RVG_URL,
	doctorName: "Д-р Смирнов Алексей Петрович",
	doctorSpecialty: "Врач-стоматолог терапевт-эндодонтист",
	clinicName: "ООО «Денте Стоматология»",
	status: "completed",
	diagnosisIcd10: "K04.0",
	diagnosticNotes: "Контрольная радиовизиография зуба 16 после инструментальной обработки каналов и обтурации гуттаперчей. Плотное заполнение 3 корневых каналов (MB, DB, Palatal), верхушечный периодонт без деструктивных изменений.",
	metadata: {
		kv: 65,
		ma: 7.0,
		exposureSec: 0.08,
		pixelSpacingMm: 0.05,
		apparatusModel: "Vatech EzSensor Classic",
	},
	landmarks: [
		{
			id: "lm-sample-1",
			x: 51.5,
			y: 28.5,
			toothFdi: "16",
			label: "Апекс небного корня 16",
			type: "apex",
		},
	],
};

const SAMPLE_LAB_TRACKING_ORDER = {
	id: "lab-sample-01",
	patientId: "pat-1",
	patientName: "Барабаш Сергей Владимирович",
	doctorId: "doc-1",
	doctorName: "Д-р Смирнов Алексей Петрович",
	secureToken: "A942F1",
	toothFdi: "21, 22",
	selectedTeeth: [21, 22],
	constructionType: "Диоксид циркония Prettau (Multi-layer)",
	material: "Диоксид циркония Katana / Prettau (Multi-layer)",
	colorVita: "A2",
	shadeStump: "ND2",
	status: "in_progress",
	currentStage: "framework_wax_milling" as const,
	dueDate: "2026-09-02",
	frameworkTrialDate: "2026-08-28",
	ceramicTrialDate: "2026-08-30",
	priceRub: 36000,
	clinicSharePct: 50,
	doctorSharePct: 50,
	doctorDeductionRub: 18000,
	clinicalNotes: "Коронки 21, 22 под цвет соседних зубов. Умеренная прозрачность HT.",
};

const SAMPLE_PHOTO_SLOTS: Record<string, PhotoSlotRecord> = {
	portrait_smile: {
		slotId: "portrait_smile",
		imageUrl: "",
		detectedVitaShade: "A3",
		stage: "before",
		uploadedAt: "2026-08-20T10:15:00.000Z",
	},
	intraoral_frontal_occlusion: {
		slotId: "intraoral_frontal_occlusion",
		imageUrl: "",
		detectedVitaShade: "BL2",
		stage: "after",
		uploadedAt: "2026-08-26T14:30:00.000Z",
	},
};

const mockStudioAppLogicValue: AppLogicContextType = {
	dashboard: {
		todayIso: "2026-08-28",
		clinicSettings: {
			name: "Стоматологическая клиника «ДЕНТЕ СТОМАТОЛОГИЯ»",
			profile: {
				mode: "solo_practice",
			},
			staff: [
				{ id: "doc-1", fullName: "Д-р Смирнов Алексей Петрович", role: "doctor", specialty: "Терапевт-ортопед", active: true },
				{ id: "doc-2", fullName: "Д-р Барабаш Сергей Владимирович", role: "doctor", specialty: "Хирург-имплантолог", active: true },
				{ id: "asst-1", fullName: "Петрова Елена Сергеевна", role: "assistant", active: true },
				{ id: "admin-1", fullName: "Иванова Мария Сергеевна", role: "administrator", active: true },
			],
			chairs: [
				{ id: "chair-1", name: "Кресло 1 (Терапия)" },
				{ id: "chair-2", name: "Кресло 2 (Хирургия)" },
			],
			workspaceProfiles: [
				{ id: "wp-1", title: "Терапевтический прием", mode: "solo_practice", scope: "clinical", defaultSection: "visit", primaryRoles: ["doctor"], visibleSections: ["visit", "imaging", "documents"], automations: ["Автопротокол 804н", "Печать ИДС"] },
			],
			roleAccessPolicies: [
				{ role: "doctor", title: "Врач-стоматолог", scope: "clinical", defaultSection: "visit", canWrite: ["visit", "imaging", "documents"], restricted: ["finance_reports", "settings"], requiresApprovalFor: ["Списание дорогостоящих ТМЦ"], auditEvents: ["auth.login", "emr.sign"] },
			],
		},
		patients: [
			{
				id: "PAT-001",
				fullName: "Смирнова Екатерина Васильевна",
				birthDate: "1988-06-14",
				phone: "+7 (926) 555-12-34",
				cardNumber: "043/у-2026/891",
				medicalCardNumber: "043/у-2026/891",
			},
			{
				id: "PAT-002",
				fullName: "Барабаш Сергей Владимирович",
				birthDate: "1985-03-22",
				phone: "+7 (916) 123-45-67",
				cardNumber: "043/у-2026/042",
				medicalCardNumber: "043/у-2026/042",
			},
		],
		appointments: [
			{
				id: "apt-1",
				patientId: "PAT-001",
				patientName: "Смирнова Екатерина Васильевна",
				doctorId: "doc-1",
				doctorUserId: "doc-1",
				doctorName: "Д-р Смирнов Алексей Петрович",
				startsAt: "2026-08-28T10:00:00.000Z",
				endsAt: "2026-08-28T11:00:00.000Z",
				startIso: "2026-08-28T10:00:00.000Z",
				endIso: "2026-08-28T11:00:00.000Z",
				status: "completed",
				chairId: "chair-1",
			},
			{
				id: "apt-2",
				patientId: "PAT-001",
				patientName: "Смирнова Екатерина Васильевна",
				doctorId: "doc-1",
				doctorUserId: "doc-1",
				doctorName: "Д-р Смирнов Алексей Петрович",
				startsAt: "2026-08-30T14:00:00.000Z",
				endsAt: "2026-08-30T15:00:00.000Z",
				startIso: "2026-08-30T14:00:00.000Z",
				endIso: "2026-08-30T15:00:00.000Z",
				status: "confirmed",
				chairId: "chair-1",
			},
		],
		insuranceContracts: [],
	} as unknown as AppLogicContextType["dashboard"],
	auth: {
		denteClinicalReadHeaders: () => ({}),
		denteClinicalMutationHeaders: () => ({}),
		denteAdminMutationHeaders: () => ({}),
		settingsAccessHeaders: () => ({}),
	} as unknown as AppLogicContextType["auth"],
	patientId: "PAT-001",
	selectedPatient: {
		id: "PAT-001",
		fullName: "Смирнова Екатерина Васильевна",
		phone: "+7 (926) 555-12-34",
	} as unknown as AppLogicContextType["selectedPatient"],
	activePatient: {
		id: "PAT-001",
		fullName: "Смирнова Екатерина Васильевна",
		birthDate: "1988-06-14",
		phone: "+7 (926) 555-12-34",
		cardNumber: "043/у-2026/891",
	} as unknown as AppLogicContextType["activePatient"],
	activeDoctor: {
		id: "doc-1",
		fullName: "Д-р Смирнов Алексей Петрович",
		role: "doctor",
	} as unknown as AppLogicContextType["activeDoctor"],
	denteClinicalReadHeaders: () => ({}),
	denteClinicalMutationHeaders: () => ({}),
} as AppLogicContextType;

export const ClinicalModalsStudioStandalone: React.FC = () => {
	const [activeTheme, setActiveTheme] = useState<string>("dark");
	const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
	const [isRadiologyOpen, setIsRadiologyOpen] = useState(false);
	const [isCbct3DStudioOpen, setIsCbct3DStudioOpen] = useState(false);
	const [isCbctMpr3DStudioOpen, setIsCbctMpr3DStudioOpen] = useState(false);
	const [isImplantPlannerOpen, setIsImplantPlannerOpen] = useState(false);
	const [isActPrintOpen, setIsActPrintOpen] = useState(false);
	const [isFiscalOpen, setIsFiscalOpen] = useState(false);
	const [isBilling1cExportOpen, setIsBilling1cExportOpen] = useState(false);
	const [isPatientBillingOpen, setIsPatientBillingOpen] = useState(false);
	const [isPediatricOpen, setIsPediatricOpen] = useState(false);
	const [isConsentOpen, setIsConsentOpen] = useState(false);
	const [isViewerOpen, setIsViewerOpen] = useState(false);
	const [activeStudy, setActiveStudy] = useState<RadiologyStudy>(SAMPLE_STUDY);
	const [isPayrollOpen, setIsPayrollOpen] = useState(false);
	const [isFastCheckoutOpen, setIsFastCheckoutOpen] = useState(false);
	const [isMedicalPrescriptionOpen, setIsMedicalPrescriptionOpen] = useState(false);
	const [isCephOpen, setIsCephOpen] = useState(false);
	const [cephInitialImageUrl, setCephInitialImageUrl] = useState<string | undefined>(SAMPLE_TRG_CEPHALOGRAM_URL);
	const [isIsqOpen, setIsIsqOpen] = useState(false);
	const [isLabOrderOpen, setIsLabOrderOpen] = useState(false);
	const [isPhotoProtocolOpen, setIsPhotoProtocolOpen] = useState(false);
	const [isRecallOpen, setIsRecallOpen] = useState(false);
	const [isRecallsHubOpen, setIsRecallsHubOpen] = useState(false);
	const [isAutoclaveOpen, setIsAutoclaveOpen] = useState(false);
	const [isInsuranceOpen, setIsInsuranceOpen] = useState(false);
	const [isPlanComparatorOpen, setIsPlanComparatorOpen] = useState(false);
	const [is3TierPreviewOpen, setIs3TierPreviewOpen] = useState(false);
	const [isPhased4PreviewOpen, setIsPhased4PreviewOpen] = useState(false);
	const [isTransferOpen, setIsTransferOpen] = useState(false);
	const [isPortalOpen, setIsPortalOpen] = useState(false);
	const [isBeforeAfterOpen, setIsBeforeAfterOpen] = useState(false);
	const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
	const [isChairsideConsentOpen, setIsChairsideConsentOpen] = useState(false);
	const [isConsent323Open, setIsConsent323Open] = useState(false);
	const [isAnesthesiaProtocolOpen, setIsAnesthesiaProtocolOpen] = useState(false);
	const [isAnesthesiaHubOpen, setIsAnesthesiaHubOpen] = useState(false);
	const [isSterilizationJournalOpen, setIsSterilizationJournalOpen] = useState(false);
	const [isMedicalWasteOpen, setIsMedicalWasteOpen] = useState(false);
	const [isEmergencyRescueOpen, setIsEmergencyRescueOpen] = useState(false);
	const [isWarrantyPassportOpen, setIsWarrantyPassportOpen] = useState(false);
	const [isCmoEmrAuditOpen, setIsCmoEmrAuditOpen] = useState(false);
	const [isFnsNdflXmlOpen, setIsFnsNdflXmlOpen] = useState(false);
	const [isPlanPriceValidatorOpen, setIsPlanPriceValidatorOpen] = useState(false);
	const [isSberPosOpen, setIsSberPosOpen] = useState(false);
	const [isPatientCabinetOpen, setIsPatientCabinetOpen] = useState(false);
	const [isPatientWebappOpen, setIsPatientWebappOpen] = useState(false);
	const [isEgiszRemdOpen, setIsEgiszRemdOpen] = useState(false);
	const [isLabWorkOrderOpen, setIsLabWorkOrderOpen] = useState(false);
	const [isLabTrackingOpen, setIsLabTrackingOpen] = useState(false);
	const [isLabHubOpen, setIsLabHubOpen] = useState(false);
	const [isClinicalWriteoffOpen, setIsClinicalWriteoffOpen] = useState(false);
	const [isDmsManagerOpen, setIsDmsManagerOpen] = useState(false);
	const [isKraftBarcodeOpen, setIsKraftBarcodeOpen] = useState(false);
	const [isServicePricelistOpen, setIsServicePricelistOpen] = useState(false);
	const [isLoyaltyProgramOpen, setIsLoyaltyProgramOpen] = useState(false);
	const [isSickLeaveElnOpen, setIsSickLeaveElnOpen] = useState(false);
	const [isAutoclaveLog257Open, setIsAutoclaveLog257Open] = useState(false);
	const [isSterilizationStudioOpen, setIsSterilizationStudioOpen] = useState(false);
	const [isDoctorShiftRosterOpen, setIsDoctorShiftRosterOpen] = useState(false);
	const [isPatientMemoOpen, setIsPatientMemoOpen] = useState(false);
	const [isProcedureDeductionOpen, setIsProcedureDeductionOpen] = useState(false);
	const [isIncomingCallOpen, setIsIncomingCallOpen] = useState(false);
	const [isTelephonyWidgetOpen, setIsTelephonyWidgetOpen] = useState(false);
	const [isSettingsAccessOpen, setIsSettingsAccessOpen] = useState(false);
	const [isStaffCommissionsOpen, setIsStaffCommissionsOpen] = useState(false);
	const [isCmoHubOpen, setIsCmoHubOpen] = useState(false);
	const [isForm043PrintOpen, setIsForm043PrintOpen] = useState(false);
	const [isOfflineVaultOpen, setIsOfflineVaultOpen] = useState(false);
	const [isStaffPayrollLedgerOpen, setIsStaffPayrollLedgerOpen] = useState(false);
	const [isSterilizationJournalModalOpen, setIsSterilizationJournalModalOpen] = useState(false);
	const [isAnesthesiaSafetyHubOpen, setIsAnesthesiaSafetyHubOpen] = useState(false);
	const [isCashShiftClosingOpen, setIsCashShiftClosingOpen] = useState(false);
	const [isClinicalPnlOpen, setIsClinicalPnlOpen] = useState(false);
	const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
	const [isCmoQualityAuditOpen, setIsCmoQualityAuditOpen] = useState(false);
	const [isFnsTaxDeductionOpen, setIsFnsTaxDeductionOpen] = useState(false);
	const [isOfflineSyncGuardOpen, setIsOfflineSyncGuardOpen] = useState(false);
	const [isOneCCommerceMlOpen, setIsOneCCommerceMlOpen] = useState(false);
		
	const handleThemeChange = (themeId: string) => {
		setActiveTheme(themeId);
		safeLocalStorageSetItem("dente_theme_mode", themeId);
		useThemeStore.getState().setThemeMode(themeId as any);
		document.documentElement.setAttribute("data-theme", themeId);
		const isDark =
			themeId === "dark" ||
			themeId === "night" ||
			themeId === "ocean" ||
			themeId === "emerald" ||
			themeId === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		if (document.body) {
			document.body.className = isDark ? "dark" : "light";
		}
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
	};

	// Ensure reliable default localStorage and session state on mount
	useEffect(() => {
		if (typeof window !== "undefined") {
			if (!safeLocalStorageGetItem("dente_organization_id")) {
				safeLocalStorageSetItem("dente_organization_id", "c-1");
			}
			if (!safeLocalStorageGetItem("dente_clinic_token")) {
				safeLocalStorageSetItem("dente_clinic_token", "dev_token_sample_clinic");
			}
			if (!safeLocalStorageGetItem("dente_staff_token")) {
				safeLocalStorageSetItem("dente_staff_token", "dev_token_sample_staff");
			}
			if (!safeLocalStorageGetItem("dente_active_session_token")) {
				safeLocalStorageSetItem("dente_active_session_token", "mock-session-token");
			}
			if (!safeLocalStorageGetItem("dente_user_role")) {
				safeLocalStorageSetItem("dente_user_role", "doctor");
			}
			if (!safeLocalStorageGetItem("dente_user_name")) {
				safeLocalStorageSetItem("dente_user_name", "Д-р Смирнов Алексей Петрович");
			}
			if (!safeLocalStorageGetItem("dente_offline_mode")) {
				safeLocalStorageSetItem("dente_offline_mode", "true");
			}
			if (!safeLocalStorageGetItem("dente_onboarding_completed")) {
				safeLocalStorageSetItem("dente_onboarding_completed", "true");
			}
			if (!safeLocalStorageGetItem("dental-crm:onboarding:v1")) {
				safeLocalStorageSetItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			}
			if (!safeLocalStorageGetItem("dente_active_user")) {
				safeLocalStorageSetItem("dente_active_user", JSON.stringify({
					id: "usr-doc-1",
					name: "Д-р Смирнов Алексей Петрович",
					role: "doctor",
					organizationId: "c-1",
				}));
			}
			if (!safeLocalStorageGetItem("dente_offline_readiness_banner_dismissed_v1")) {
				safeLocalStorageSetItem("dente_offline_readiness_banner_dismissed_v1", "true");
			}
		}
	}, []);

	useEffect(() => {
		const handleHashOrSearch = () => {
			const searchParams = new URLSearchParams(window.location.search);
			const hashQuery = window.location.hash.includes("?") ? window.location.hash.split("?")[1] : "";
			const hashParams = new URLSearchParams(hashQuery);
			const getParam = (key: string) => searchParams.get(key) || hashParams.get(key);

			const requestedTheme = getParam("theme");
			if (requestedTheme && THEMES.some((t) => t.id === requestedTheme)) {
				handleThemeChange(requestedTheme);
			}
			const requestedModal = getParam("modal");
				if (requestedModal) {
					// Reset all modals first
					setIsBeforeAfterOpen(false);
					setIsFiscalOpen(false);
					setIsBilling1cExportOpen(false);
					setIsPatientBillingOpen(false);
					setIsCephOpen(false);
					setIsViewerOpen(false);
					setIsCbct3DStudioOpen(false);
					setIsCbctMpr3DStudioOpen(false);
					setIsPediatricOpen(false);
					setIsActPrintOpen(false);
					setIsConsentOpen(false);
					setIsPrescriptionOpen(false);
					setIsRadiologyOpen(false);
					setIsDoctorShiftRosterOpen(false);
					setIsLabWorkOrderOpen(false);
					setIsLabOrderOpen(false);
					setIsLabTrackingOpen(false);
					setIsClinicalWriteoffOpen(false);
					setIsProcedureDeductionOpen(false);
					setIsPatientCabinetOpen(false);
					setIsPatientMemoOpen(false);
					setIsRecallOpen(false);
					setIsRecallsHubOpen(false);
					setIsIncomingCallOpen(false);
					setIsTelephonyWidgetOpen(false);
					setIsSettingsAccessOpen(false);
					setIsStaffCommissionsOpen(false);
					setIsCmoHubOpen(false);
					setIsForm043PrintOpen(false);
					setIsOfflineVaultOpen(false);
					setIsCashShiftClosingOpen(false);
					setIsLabHubOpen(false);
					setIsChairsideConsentOpen(false);
					setIsClinicalPnlOpen(false);
					setIsAuditTrailOpen(false);
					setIsCmoQualityAuditOpen(false);
					setIsFnsTaxDeductionOpen(false);
					setIsOfflineSyncGuardOpen(false);

					if (requestedModal === "before_after" || requestedModal === "before_after_slider" || requestedModal === "photo_comparison" || requestedModal === "photography") {
						setIsBeforeAfterOpen(true);
					}
					if (requestedModal === "fiscal" || requestedModal === "54fz" || requestedModal === "fiscal_receipt") {
						setIsFiscalOpen(true);
					}
					if (requestedModal === "billing_1c" || requestedModal === "1c" || requestedModal === "1c_export" || requestedModal === "commerceml" || requestedModal === "billing_1c_export" || requestedModal === "billing_1c_export_modal") {
						setIsBilling1cExportOpen(true);
					}
					if (requestedModal === "patient_billing" || requestedModal === "billing" || requestedModal === "friendly_billing" || requestedModal === "warranty_act" || requestedModal === "patient_billing_modal") {
						setIsPatientBillingOpen(true);
					}
					if (requestedModal === "cephalometry" || requestedModal === "ceph" || requestedModal === "trg" || requestedModal === "cephalometric_analysis_modal") {
						const isLoaded = getParam("loaded") !== "false" && getParam("state") !== "empty";
						setCephInitialImageUrl(isLoaded ? SAMPLE_TRG_CEPHALOGRAM_URL : undefined);
						setIsCephOpen(true);
					}
					if (requestedModal === "dropzone" || requestedModal === "radiology_dropzone") {
						setActiveStudy({
							...SAMPLE_STUDY,
							id: "sample-empty-dropzone",
							imageUrl: undefined,
						});
						setIsViewerOpen(true);
					}
					if (requestedModal === "radiology_viewer" || requestedModal === "viewer" || requestedModal === "radiology" || requestedModal === "xray" || requestedModal === "radiology_viewer_modal") {
						setActiveStudy(SAMPLE_STUDY);
						setIsViewerOpen(true);
					}
					if (requestedModal === "cbct" || requestedModal === "cbct_mpr" || requestedModal === "cbct_studio" || requestedModal === "mpr") {
						setIsCbctMpr3DStudioOpen(true);
					}
					if (requestedModal === "pediatric" || requestedModal === "pediatric_mixed_dentition" || requestedModal === "mixed_dentition") {
						setIsPediatricOpen(true);
					}
					if (requestedModal === "act" || requestedModal === "act_completed_804n" || requestedModal === "act_print") {
						setIsActPrintOpen(true);
					}
					if (requestedModal === "consent" || requestedModal === "informed_consent" || requestedModal === "consent_1051n" || requestedModal === "informed_consent_1051n") {
						setIsConsentOpen(true);
					}
					if (requestedModal === "prescription" || requestedModal === "prescription_107_1y") {
						setIsPrescriptionOpen(true);
					}
					if (requestedModal === "radiology_referral" || requestedModal === "referral" || requestedModal === "radiology_referral_modal") {
						setIsRadiologyOpen(true);
					}
					if (requestedModal === "schedule_roster" || requestedModal === "roster") {
						setIsDoctorShiftRosterOpen(true);
					}
					if (requestedModal === "lab_work_order" || requestedModal === "laboratory" || requestedModal === "lab") {
						setIsLabWorkOrderOpen(true);
					}
					if (requestedModal === "lab_order" || requestedModal === "dental_lab_order") {
						setIsLabOrderOpen(true);
					}
					if (requestedModal === "lab_tracking" || requestedModal === "tracking" || requestedModal === "lab_drawer") {
						setIsLabTrackingOpen(true);
					}
					if (requestedModal === "clinical_writeoff" || requestedModal === "writeoff") {
						setIsClinicalWriteoffOpen(true);
					}
					if (requestedModal === "procedure_deduction" || requestedModal === "material_deduction" || requestedModal === "bom" || requestedModal === "bom_deduction" || requestedModal === "procedure_material_deduction") {
						setIsProcedureDeductionOpen(true);
					}
					if (requestedModal === "patient_cabinet" || requestedModal === "cabinet" || requestedModal === "patient_portal") {
						setIsPatientCabinetOpen(true);
					}
					if (requestedModal === "patient_memo" || requestedModal === "post_op" || requestedModal === "care_memo" || requestedModal === "memo" || requestedModal === "post_op_patient_memo") {
						setIsPatientMemoOpen(true);
					}
					if (requestedModal === "retention" || requestedModal === "recall" || requestedModal === "recalls" || requestedModal === "patient_retention_recalls") {
						setIsRecallOpen(true);
					}
					if (requestedModal === "recalls_hub" || requestedModal === "patient_recalls_hub" || requestedModal === "recalls_hub_modal") {
						setIsRecallsHubOpen(true);
					}
					if (requestedModal === "incoming_call" || requestedModal === "incoming_call_popup" || requestedModal === "telephony_popup") {
						useTelephonyStore.getState().triggerIncomingCall({
							phone: "+7 (926) 555-12-34",
							patientName: "Смирнова Екатерина Васильевна",
							patientId: "PAT-001",
							provider: "mango",
							status: "ringing",
							timestamp: new Date().toISOString(),
						});
						setIsIncomingCallOpen(true);
					}
					if (requestedModal === "telephony_widget" || requestedModal === "telephony_softphone" || requestedModal === "softphone") {
						setIsTelephonyWidgetOpen(true);
					}
					if (requestedModal === "settings_access" || requestedModal === "access_matrix" || requestedModal === "role_matrix" || requestedModal === "settings_access_matrix") {
						setIsSettingsAccessOpen(true);
					}
					if (requestedModal === "staff_commissions" || requestedModal === "commissions_panel" || requestedModal === "doctor_commissions" || requestedModal === "staff_commissions_panel") {
						setIsStaffCommissionsOpen(true);
					}
					if (requestedModal === "cmo_hub" || requestedModal === "cmo_compliance" || requestedModal === "cmo_compliance_hub") {
						setIsCmoHubOpen(true);
					}
					if (requestedModal === "form043_print" || requestedModal === "form043" || requestedModal === "form043_modal" || requestedModal === "form043_print_modal") {
						setIsForm043PrintOpen(true);
					}
					if (requestedModal === "offline_vault" || requestedModal === "backup_vault" || requestedModal === "offline_backup" || requestedModal === "offline_backup_vault") {
						setIsOfflineVaultOpen(true);
					}
					if (requestedModal === "staff_payroll" || requestedModal === "payroll_ledger" || requestedModal === "payroll_t51_staff") {
						setIsStaffPayrollLedgerOpen(true);
					}
					if (requestedModal === "cash_shift_closing" || requestedModal === "cash_shift" || requestedModal === "closing_shift" || requestedModal === "z_report" || requestedModal === "cash_shift_closing_modal") {
						setIsCashShiftClosingOpen(true);
					}
					if (requestedModal === "lab_hub" || requestedModal === "dental_lab_orders_hub" || requestedModal === "lab_orders_hub" || requestedModal === "dental_lab_orders_hub_modal") {
						setIsLabHubOpen(true);
					}
					if (requestedModal === "chairside_consent" || requestedModal === "chairside_tablet_consent" || requestedModal === "chairside_tablet_consent_modal") {
						setIsChairsideConsentOpen(true);
					}
					if (requestedModal === "pnl" || requestedModal === "clinical_pnl" || requestedModal === "clinical_pnl_hub" || requestedModal === "clinical_pnl_hub_modal") {
						setIsClinicalPnlOpen(true);
					}
					if (requestedModal === "audit_trail" || requestedModal === "audit" || requestedModal === "security_audit" || requestedModal === "audit_trail_hub" || requestedModal === "audit_trail_hub_modal") {
						setIsAuditTrailOpen(true);
					}
					if (requestedModal === "cmo_quality" || requestedModal === "quality_audit" || requestedModal === "cmo_quality_audit" || requestedModal === "cmo_quality_audit_modal" || requestedModal === "ekmp") {
						setIsCmoQualityAuditOpen(true);
					}
					if (requestedModal === "egisz" || requestedModal === "egisz_remd" || requestedModal === "semd" || requestedModal === "cda" || requestedModal === "egisz_hub" || requestedModal === "egisz_remd_hub") {
						setIsEgiszRemdOpen(true);
					}
					if (requestedModal === "fns_tax" || requestedModal === "fns_knd_1151156" || requestedModal === "fns_tax_deduction" || requestedModal === "tax_deduction" || requestedModal === "knd_1151156" || requestedModal === "fns_knd") {
						setIsFnsTaxDeductionOpen(true);
					}
					if (requestedModal === "offline_sync" || requestedModal === "sync_guard" || requestedModal === "crdt_sync" || requestedModal === "offline_sync_guard") {
						setIsOfflineSyncGuardOpen(true);
					}
				}
		};
		handleHashOrSearch();
		window.addEventListener("hashchange", handleHashOrSearch);
		return () => window.removeEventListener("hashchange", handleHashOrSearch);
	}, []);

	return (
		<AppLogicProvider value={mockStudioAppLogicValue}>
			<div
				className="min-h-screen bg-[var(--paper-soft,var(--paper,#0f172a))] text-[var(--ink,#f8fafc)] flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200"
				data-testid="clinical-modals-studio-container"
			>
			{/* Top Bar */}
			<header className="sticky top-0 z-40 bg-[var(--paper,#1e293b)] border-b border-[var(--line,rgba(204,251,241,0.15))] px-4 sm:px-6 py-3.5 shadow-sm backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
						<Activity className="w-5 h-5" />
					</div>
					<div>
						<h1 className="text-base sm:text-lg font-black tracking-tight text-[var(--ink)] flex items-center gap-2">
							<span>CLINICAL MODALS STUDIO</span>
							<span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--line)]">
								STANDALONE V2.8
							</span>
						</h1>
						<p className="text-xs text-[var(--muted)]">
							Pediatric · Fiscal 54-FZ · Prescription 107-1/у · Radiology Referral · Completed Act 804н · Anesthesia Calculator
						</p>
					</div>
				</div>

				{/* Theme Selector Strip */}
				<div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
					{THEMES.map((th) => {
						const isSelected = activeTheme === th.id;
						return (
							<button
								key={th.id}
								type="button"
								onClick={() => handleThemeChange(th.id)}
								className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shrink-0 ${
									isSelected
										? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] border-[var(--teal)] shadow-sm font-bold"
										: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)]"
								}`}
								data-testid={`theme-btn-${th.id}`}
							>
								{th.label}
							</button>
						);
					})}
				</div>
			</header>

			{/* Main Content Showcase */}
			<main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
				{/* Modal Launch Control Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{/* 1. Pediatric Mixed Dentition Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Sparkles className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Сменный прикус & Cariogram
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Сроки смены (6–12 лет), кариограмма Браттхолла (ВОЗ), 5 стадий физиологической резорбции корней (0–100%).
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsPediatricOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-pediatric-modal-btn"
						>
							<Sparkles size={15} />
							<span>Открыть сменный прикус</span>
						</button>
					</div>

					{/* 2. 54-FZ Fiscal Receipt Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Receipt className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Фискализация 54-ФЗ & СБП QR
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Раздельная оплата (Наличные / Терминал / СБП / Аванс), динамический QR НСПК, чек 54-ФЗ (ФФД 1.2).
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsFiscalOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-fiscal-modal-btn"
						>
							<Receipt size={15} />
							<span>Открыть фискализацию</span>
						</button>
					</div>

					{/* 2b. Billing & 1C:Enterprise XML Export Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Coins className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									1C:Предприятие & Экспорт CommerceML
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Выгрузка счетов и актов 804н в 1С:Бухгалтерия 8.3 / УТ (CommerceML 2.09), налоговые льготы 149 НК РФ и 1-клик экспорт XML.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsBilling1cExportOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-billing-1c-export-modal-btn"
						>
							<Coins size={15} />
							<span>Открыть 1С:Экспорт XML</span>
						</button>
					</div>

					{/* 2b-2. 1C CommerceML 2.09 & EnterpriseData 1.13 Package Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<FileSpreadsheet className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									1С:CommerceML 2.09 & Пакет выгрузки
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Полный пакет выгрузки: смены, ОРП, списания материалов и ведомости зарплаты в целых копейках.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsOneCCommerceMlOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-onec-commerceml-modal-btn"
						>
							<FileSpreadsheet size={15} />
							<span>Открыть CommerceML 2.09</span>
						</button>
					</div>

					{/* 2c. Patient Billing & Friendly A4 Act Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<FileCheck2 className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Понятный счет & Акт А4 (804н)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Понятная расшифровка для пациента (без латыни), Акт сдачи-приемки 804н, гарантийный талон и 1-клик отправка в WhatsApp.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsPatientBillingOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-patient-billing-modal-btn"
						>
							<FileCheck2 size={15} />
							<span>Открыть понятный счет А4</span>
						</button>
					</div>

					{/* 3. Prescription Modal Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Pill className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Рецепт (Форма 107-1/у)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Автоматический подбор антибиотиков и НПВС по МКБ-10, генерация сигнатуры на латыни (Rp / D.t.d / S) и печать бланка.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsPrescriptionOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-prescription-modal-btn"
						>
							<FileText size={15} />
							<span>Открыть рецептурный бланк</span>
						</button>
					</div>

					{/* 4. Radiology Referral Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Scan className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Направление на КЛКТ / ОПТГ
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Выбор зоны томографии (8x8, 5x5, 15x15), клинических целей, номеров зубов (FDI) и генерация направления по СанПиН.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsRadiologyOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-radiology-modal-btn"
						>
							<Scan size={15} />
							<span>Открыть направление на КЛКТ</span>
						</button>
					</div>

					{/* 5. Completed Act & BOM Write-off Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Printer className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Акт выполненных работ (804н)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Юридический акт сдачи-приемки услуг, накладная на списание ТМЦ со склада, расчет себестоимости и маржинальности.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsActPrintOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-act-print-modal-btn"
						>
							<Printer size={15} />
							<span>Открыть печатную форму Акта</span>
						</button>
					</div>

					{/* 6. Informed Consent Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<FileText className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Информированное согласие (ИДС 1051н)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								9 клинических шаблонов ИДС (1051н / 323-ФЗ), риски, альтернативы, электронный штамп проверки и печать A4.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsConsentOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-consent-modal-btn"
						>
							<FileText size={15} />
							<span>Открыть ИДС 1051н</span>
						</button>
					</div>

					{/* 7. Radiology Viewer Modal Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Scan className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Визиограф & DICOM Viewer
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Инструменты визиографа (WW/WL, зум, панорамирование, калиброванная линейка мм, пины зубов FDI).
							</p>
						</div>
						<div className="flex flex-col gap-2 w-full">
							<button
								type="button"
								onClick={() => {
									setActiveStudy(SAMPLE_STUDY);
									setIsViewerOpen(true);
								}}
								className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
								data-testid="open-viewer-modal-btn"
							>
								<Scan size={15} />
								<span>Открыть снимок пациента</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setActiveStudy({
										...SAMPLE_STUDY,
										id: "sample-empty-dropzone",
										imageUrl: undefined,
									});
									setIsViewerOpen(true);
								}}
								className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:text-[var(--teal)] hover:border-[var(--teal)] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
								data-testid="open-dropzone-viewer-btn"
							>
								<UploadCloud size={15} className="text-[var(--teal)]" />
								<span>Медицинская дропзона (без снимка)</span>
							</button>
						</div>
					</div>

					{/* 8. Doctor & Staff Piece-Rate Payroll Trigger (Wave 11 / Task 35) */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Calculator className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Сдельная зарплата (Т-51)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Автоматический расчет процентов врачей, вычет лаборатории/материалов, KPI бонусы и удержание НДФЛ 13%.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsPayrollOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-payroll-modal-btn"
						>
							<Calculator size={15} />
							<span>Открыть расчет зарплаты</span>
						</button>
					</div>

					{/* 9. 1-Click Fast Checkout & SBP QR Trigger (Wave 11 / Task 36) */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<QrCode className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									1-Клик Оплата & СБП QR
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Мгновенный терминал оплаты, динамический QR НСПК, сплит-платежи и фискализация 54-ФЗ (ФФД 1.2).
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsFastCheckoutOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-fast-checkout-modal-btn"
						>
							<QrCode size={15} />
							<span>Открыть 1-Клик Оплату</span>
						</button>
					</div>

					{/* 10. Form 107-1/u Prescription Studio Trigger (Wave 11 / Task 37) */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Pill className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Рецептурный бланк (№ 107-1/у)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Каталог стоматологической фармакопеи РФ, латинская сигнатура (Rp / D.t.d), приказ № 1094н и печать А5.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsMedicalPrescriptionOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-med-prescription-modal-btn"
						>
							<Pill size={15} />
							<span>Открыть студию рецептов</span>
						</button>
					</div>

					{/* 11. Cephalometric TRG Analysis Trigger (Wave 12 / Task 38) */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Compass className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									ТРГ боковая & Cephalometry
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Расчет углов Steiner (SNA, SNB, ANB), Tweed (FMA, IMPA), Wits appraisal и экспорт в форму 043/у.
							</p>
						</div>
						<div className="flex flex-col gap-2">
							<button
								type="button"
								onClick={() => {
									setCephInitialImageUrl(SAMPLE_TRG_CEPHALOGRAM_URL);
									setIsCephOpen(true);
								}}
								className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
								data-testid="open-ceph-modal-btn"
							>
								<Compass size={15} />
								<span>Открыть анализ ТРГ (со снимком)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setCephInitialImageUrl(undefined);
									setIsCephOpen(true);
								}}
								className="w-full min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#cbd5e1)] hover:bg-[var(--line,#334155)] border border-[var(--line,#334155)] transition-all flex items-center justify-center gap-2"
								data-testid="open-ceph-empty-btn"
							>
								<span>Дропзона ТРГ (без снимка)</span>
							</button>
						</div>
					</div>

					{/* 12. Implant ISQ & RFA Osstell Stability Trigger (Wave 12 / Task 39) */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Gauge className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Стабильность имплантата (ISQ / RFA)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Протокол Osstell (ISQ 1–100), оценка первичной стабильности, 4-точечный замер и сроки нагрузки.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsIsqOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-isq-modal-btn"
						>
							<Gauge size={15} />
							<span>Открыть протокол ISQ</span>
						</button>
					</div>

					{/* 13. Dental Lab CAD/CAM Order & Shade Studio Trigger (Wave 12 / Task 40) */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<FlaskConical className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Заказ в лабораторию CAD/CAM
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Заказ-наряд на коронки/виниры, подбор оттенков VITA 3D-Master / культи (ND), окклюзия и трекинг.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsLabOrderOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-lab-order-modal-btn"
						>
							<FlaskConical size={15} />
							<span>Открыть заказ-наряд CAD/CAM</span>
						</button>
					</div>

					{/* 14. Clinical Photo Protocol 12-shot Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Camera className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Фотопротокол (12 кадров) & До/После
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Внеротовые/внутриротовые ракурсы, сплит-слайдер До/После, VITA колориметрия и PDF-коллаж.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsPhotoProtocolOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-photo-protocol-modal-btn"
						>
							<Camera size={15} />
							<span>Открыть фотопротокол</span>
						</button>
					</div>

					{/* 15. Patient Recall & Clinical Prophylaxis Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<PhoneCall className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Диспансерный учет & Реколлы
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								6 риск-стратифицированных циклов, омниканальные шаблоны (WhatsApp / SMS) и скрипты обзвона.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsRecallOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-recall-modal-btn"
						>
							<PhoneCall size={15} />
							<span>Открыть реколл-менеджер</span>
						</button>
					</div>

					{/* Patient Recalls Hub Trigger (Wave 8) */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<ShieldCheck className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Диспансерный учет & Recalls Hub (Wave 8)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Профгигиена 6 мес, импланты 3/6/12 мес, ортодонтия, когортный Retention & LTV, 1-Click WhatsApp/SMS.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsRecallsHubOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-recalls-hub-modal-btn"
						>
							<PhoneCall size={15} />
							<span>Открыть Recalls Hub</span>
						</button>
					</div>

					{/* 16. SanPiN Autoclave Class B & Form 257/u Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Flame className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Автоклав Class B & СанПиН 257/у
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Телеметрия давления/температуры, штрихкоды крафт-пакетов и журнал стерилизации 257/у.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsAutoclaveOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-autoclave-modal-btn"
						>
							<Flame size={15} />
							<span>Открыть журнал автоклава</span>
						</button>
					</div>

					{/* 17. DMS Insurance PreAuth & Co-Pay Split Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<ShieldCheck className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									ДМС Авторизация & Сооплата
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Проверка гарантийных писем, расчет сплита страховая/пациент и экспорт реестра оказанных услуг.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsInsuranceOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-insurance-modal-btn"
						>
							<ShieldCheck size={15} />
							<span>Открыть ДМС-авторизацию</span>
						</button>
					</div>

					{/* 18. 3D STL Prep Margin Line & Undercuts Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Eye className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									3D STL & Уступ препарирования
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								3D-просмотрщик STL коронок/культей, Margin Line, тепловая карта поднутрений и согласование ЗТЛ.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsLabOrderOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-lab-stl-modal-btn"
						>
							<Eye size={15} />
							<span>Открыть заказ-наряд ЗТЛ</span>
						</button>
					</div>

					{/* 19. 3-Tier Treatment Plan Comparator Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Layers className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Сравнение планов (3 уровня)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								VIP Straumann vs Оптимум Osstem vs Эконом, график платежей 30/40/30, рассрочка и буклет пациенту.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsPlanComparatorOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-plan-comparator-modal-btn"
						>
							<Layers size={15} />
							<span>Открыть сравнение планов</span>
						</button>
					</div>

					{/* 19b. 3-Tier Side-by-Side Comparison Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Layers className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									3-Tier Сравнение планов (In-View)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Эконом vs Стандарт vs Оптимум, плавающий подвал сметы, 32px кнопки выбора, 804н номенклатура.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIs3TierPreviewOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-plan-3tier-preview-btn"
						>
							<Layers size={15} />
							<span>Открыть 3-Tier Сравнение</span>
						</button>
					</div>

					{/* 19c. 4-Stage Phased View Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Activity className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									4 Клинических этапа (Смета)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Неотложная, Санация, Реконструкция, Поддержка. Зафиксированный подвал сметы и 804н номенклатура.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsPhased4PreviewOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-plan-phased4-preview-btn"
						>
							<Activity size={15} />
							<span>Открыть 4 Клинических этапа</span>
						</button>
					</div>

					{/* 20. Inter-branch Warehouse Transfers Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Truck className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Перемещение ТМЦ (ТОРГ-13)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Межфилиальная логистика медикаментов и расходников, накладная ТОРГ-13 и акт расхождений ТОРГ-2.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsTransferOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-warehouse-transfer-modal-btn"
						>
							<Truck size={15} />
							<span>Открыть перемещения ТМЦ</span>
						</button>
					</div>

					{/* 20b. Clinical Auto-Writeoff & Order 804n Norms Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<PackageCheck className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Автосписание материалов (804н)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Нормы Минздрава 804н, партионный учет FEFO, фиксация отклонений и печать актов 0504230 / М-11 / ТОРГ-16.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsClinicalWriteoffOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-clinical-writeoff-modal-btn"
						>
							<PackageCheck size={15} />
							<span>Открыть автосписание 804н</span>
						</button>
					</div>

					{/* 21. Patient Mobile Portal Timeline Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<User className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Портал пациента & Вычет 13%
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Понятная карта зубов, таймлайн визитов с фото До/После и запрос справки для налогового вычета 13%.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsPortalOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-patient-portal-modal-btn"
						>
							<User size={15} />
							<span>Открыть портал пациента</span>
						</button>
					</div>

					{/* 22. 3D Implant Planning Modal Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Compass className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									3D-Планировщик имплантации
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Каталог Straumann, Nobel, Osstem, Dentium, аудит безопасности (IAN, пазуха, корни) и расчет торка.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsRadiologyOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-implant-planning-modal-btn"
						>
							<Compass size={15} />
							<span>Открыть 3D-планировщик</span>
						</button>
					</div>

					{/* 22b. Implant Abutment & Emergence Profile Studio Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Crown className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Студия профиля прорезывания & Абатментов
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Расчет угла α (&lt; 30°), Platform Switching, моменты затяжки (25-35 N·cm), ASC и заказ-наряд ЗТЛ.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsRadiologyOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-implant-abutment-studio-modal-btn"
						>
							<Crown size={15} />
							<span>Открыть планирование имплантации</span>
						</button>
					</div>

					{/* 22e. Clinical Photo Protocol & Before/After Slider Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Camera className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Фотопротокол & Слайдер До/После
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Сплит-вайпер До/После, VITA 3D-Master расцветка, лицевые эстетические направляющие и экспорт буклета.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsBeforeAfterOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-before-after-modal-btn"
						>
							<Camera size={15} />
							<span>Открыть слайдер До/После</span>
						</button>
					</div>


					{/* 23. Voice Dictation Assistant Modal Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Activity className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Голосовой ассистент врача
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Распознавание русской стоматологической терминологии, формулы FDI, диагнозов МКБ-10 и VU-метр.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsVoiceAssistantOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-voice-assistant-modal-btn"
						>
							<Activity size={15} />
							<span>Открыть голосовой ассистент</span>
						</button>
					</div>

					{/* 24. Informed Consents 323-FZ Modal Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<FileText className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Электронные ИДС (323-ФЗ)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Юридические согласия по всем направлениям стоматологии, сенсорная Безье-подпись и SHA-256 хэш.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsConsent323Open(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-consent-323-modal-btn"
						>
							<FileText size={15} />
							<span>Открыть конструктор ИДС</span>
						</button>
					</div>

					{/* 25. Anesthesia Protocol & Max Dose Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Syringe className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Протокол анестезии & МДД
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Клинический калькулятор токсичности по СтАР/Минздрав РФ, кардиориски ASA I-IV и аспирационная проба.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsAnesthesiaProtocolOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-anesthesia-protocol-modal-btn"
						>
							<Syringe size={15} />
							<span>Открыть протокол анестезии</span>
						</button>
					</div>

					{/* 25b. Dental Anesthesia MRD Caliper Trigger (Wave 5) */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Activity className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Калипер безопасной дозы (MRD) & Кардио-шлюз
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Спидометр токсичности, кардио-шлюз адреналина ≤ 0.04 мг, правила Кларка и Янга для детей, выбор карпул 1.7/1.8/2.0 мл.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsAnesthesiaProtocolOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-anesthesia-mrd-caliper-modal-btn"
						>
							<Activity size={15} />
							<span>Открыть калипер дозы (MRD)</span>
						</button>
					</div>
					{/* 25c. Anesthesia Safety Hub & Resuscitation Guide Trigger (Orders 786n / 1144n) */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<ShieldAlert className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Хаб безопасности анестезии & Реанимация
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Калькулятор карпул, МРД (Артикаин/Мепивакаин), кардиолимит 0.04 мг, скрининг ИМАО/ТЦА и гид реанимации (786н/1144н).
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsAnesthesiaHubOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-anesthesia-safety-hub-modal-btn"
						>
							<ShieldAlert size={15} />
							<span>Открыть Хаб анестезии</span>
						</button>
					</div>

					{/* 25d. SanPiN 3.3686-21 Sterilization & PSO Journal Trigger (Forms 257/u & 366/u) */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Flame className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Журнал стерилизации & ПСО (257/у, 366/у)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Электронные журналы автоклавов, контроль азопирамовой пробы ПСО, термоиндикаторы и крафт-пакеты.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsSterilizationJournalOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-sterilization-journal-modal-btn"
						>
							<Flame size={15} />
							<span>Открыть Журнал стерилизации</span>
						</button>
					</div>


					{/* 26. Medical Waste SanPiN 2.1.3684-21 Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Flame className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Журнал медотходов СанПиН
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Учет накопления и обеззараживания отходов классов А, Б и Г, весовой контроль и акты передачи.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsMedicalWasteOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-medical-waste-modal-btn"
						>
							<Flame size={15} />
							<span>Открыть журнал медотходов</span>
						</button>
					</div>

					{/* 27. Emergency Clinical Protocols & Anaphylaxis HUD Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--bad-fg,#ef4444)]">
								<Activity className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Неотложная помощь & Анафилаксия (HUD)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Приказы МЗ РФ № 1079н/1144н/138н & ФАР: шок, LAST, таймер адреналина, метроном СЛР 30:2, расчет дозировок, акт 043/у.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsEmergencyRescueOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--bad-fg,#ef4444)] text-white hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-emergency-rescue-modal-btn"
						>
							<Activity size={15} />
							<span>Открыть экстренный HUD</span>
						</button>
					</div>

					{/* 28. Dental Warranty Certificate & Guarantee Passport Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<ShieldCheck className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Гарантийный паспорт (2300-1 & СтАР)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Сертификат качества лечения, расчет сроков гарантии с учетом OHI-S и соматики, QR-верификация, печать А4/А5.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsWarrantyPassportOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-warranty-passport-modal-btn"
						>
							<ShieldCheck size={15} />
							<span>Открыть гарантийный паспорт</span>
						</button>
					</div>

					{/* 29. Chief Medical Officer EMR Audit Modal Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<ShieldCheck className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Контроль качества ЭМК Главврачом
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Приказы МЗ РФ № 203н/834н & Росздравнадзор: экспертиза карты 043/у, дефекты ИДС, рейтинг врачей и протокол.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsCmoEmrAuditOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-cmo-emr-audit-modal-btn"
						>
							<ShieldCheck size={15} />
							<span>Открыть аудит главврача</span>
						</button>
					</div>

					{/* 30. FNS NDFL Tax Deduction XML Exporter Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Receipt className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Справка НДФЛ в XML (Приказ ФНС № ЕД-7-11/755@)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Официальный формат ФНС КНД 1184043 ВерсФорм 5.01, коды услуг 1 и 2, валидация ИНН/СНИЛС и печать КНД 1151156.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsFnsNdflXmlOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-fns-ndfl-xml-modal-btn"
						>
							<Receipt size={15} />
							<span>Открыть выгрузку ФНС XML</span>
						</button>
					</div>

					{/* 31. Treatment Plan Price Lock & Catalog Validator Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Calculator className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Валидатор цен и прайса плана лечения
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Защита от устаревших цен при переносе в наряд/акт, выявление архивных услуг, Price Lock и согласование скидок.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsPlanPriceValidatorOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-plan-price-validator-modal-btn"
						>
							<Calculator size={15} />
							<span>Открыть валидатор цен</span>
						</button>
					</div>

					{/* 32. Sberbank POS Terminal Integration Modal Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<CreditCard className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									POS-Терминал СберБанка (Pilot-NT / QR)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Прямой эквайринг (Оплата, SberPay QR, биометрия, возврат, сверка итогов Z-отчет) с печатью банковского слипа.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsSberPosOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-sber-pos-modal-btn"
						>
							<CreditCard size={15} />
							<span>Открыть POS-терминал Сбера</span>
						</button>
					</div>

					{/* 33. Patient Personal Portal & Mobile Cabinet Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<User className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Личный кабинет пациента (СБП / ИДС / Запись)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Мобильный кабинет: онлайн-оплата счетов через СБП, планы лечения, гарантии и SMS/OTP подписание ИДС.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsPatientCabinetOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-patient-cabinet-modal-btn"
						>
							<User size={15} />
							<span>Открыть кабинет пациента</span>
						</button>
					</div>

					{/* 33b. Patient Webapp Mobile PWA Simulator Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Phone className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Мобильный веб-кабинет PWA (Симулятор смартфона)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Симулятор экрана смартфона (390x844): шторка До/После, динамический СБП QR с диплинками банков и 63-ФЗ ПЭП.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsPatientWebappOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-patient-webapp-modal-btn"
						>
							<Phone size={15} />
							<span>Запустить симулятор смартфона</span>
						</button>
					</div>

					{/* 34. EGISZ REMD CDA R2 Outpatient Card 043/u XML Generator Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Shield className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									ЕГИСЗ РЭМД (СЭМД 043/у CDA R2 XML)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Федеральный реестр Минздрава РФ: валидация OID, ЭЦП УКЭП (63-ФЗ XMLDSig), выгрузка CDA R2 XML и протокол 043/у.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsEgiszRemdOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-egisz-remd-modal-btn"
						>
							<Shield size={15} />
							<span>Открыть ЕГИСЗ РЭМД СЭМД</span>
						</button>
					</div>

					{/* 35. Statutory Dental Laboratory Work Order & Tracking Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<FlaskConical className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Зуботехнический наряд-заказ и трекинг
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Наряд в лабораторию: 7 конструкций (ZrO2 Katana, E.max), расцветка VITA/ND, 7 этапов с примеркой, расчет маржи и бланк А4.
							</p>
						</div>
						<div className="flex gap-2 flex-wrap">
							<button
								type="button"
								onClick={() => setIsLabWorkOrderOpen(true)}
								className="flex-1 min-w-[130px] min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
								data-testid="open-lab-work-order-modal-btn"
							>
								<FlaskConical size={15} />
								<span>Наряд-заказ</span>
							</button>
							<button
								type="button"
								onClick={() => setIsLabTrackingOpen(true)}
								className="flex-1 min-w-[130px] min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-bold bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--teal-surface)] shadow-sm transition-all flex items-center justify-center gap-2"
								data-testid="open-lab-tracking-drawer-btn"
							>
								<Clock size={15} />
								<span>Трекинг ЗТЛ</span>
							</button>
							<button
								type="button"
								onClick={() => setIsLabHubOpen(true)}
								className="flex-1 min-w-[130px] min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-bold bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--teal-surface)] shadow-sm transition-all flex items-center justify-center gap-2"
								data-testid="open-lab-hub-modal-btn"
							>
								<Layers size={15} />
								<span>Хаб ЗТЛ (4 статуса)</span>
							</button>
						</div>
					</div>

					{/* 37. Clinical Material Auto-Writeoff Order 804n Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Boxes className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Автосписание материалов по № 804н (FEFO)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Нормы расхода на приеме: Filtek, AH Plus, Osstem, списание партий FEFO, детекция расхождений и акт ТОРГ-16 / М-11.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsClinicalWriteoffOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-clinical-writeoff-modal-btn"
						>
							<Boxes size={15} />
							<span>Открыть списание материалов</span>
						</button>
					</div>

					{/* 38. DMS Insurance Case Manager & Pre-Auth Studio Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<ShieldCheck className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Согласование ДМС и реестры страховых
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								ДМС-2026: СОГАЗ, Ингосстрах, РЕСО, гарантийные письма, Pre-Auth, сплит-оплата и реестры услуг по № 804н.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsDmsManagerOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-dms-manager-modal-btn"
						>
							<ShieldCheck size={15} />
							<span>Открыть ДМС-согласование</span>
						</button>
					</div>

					{/* 39. SanPiN Kraft Package Barcode & Expiry Studio Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<QrCode className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Крафт-пакеты ЦСО и DataMatrix СанПиН
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Сроки стерильности (50/60/180 сут.), индикаторы 4-5 кл. Медтест/Винар, 2D DataMatrix и печать термоэтикеток 58x40.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsKraftBarcodeOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-kraft-barcode-modal-btn"
						>
							<QrCode size={15} />
							<span>Открыть крафт-пакеты ЦСО</span>
						</button>
					</div>

					
					{/* Chairside Consent & SMS-PEP Trigger (63-FZ / 1051n) */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Tablet className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Планшет согласий у кресла (ПЭП 63-ФЗ / 1051н)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Подписание ИДС (1051н), согласия 152-ФЗ и сметы (804н) простой электронной подписью по СМС-коду (63-ФЗ) с фиксацией SHA-256.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsChairsideConsentOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-chairside-consent-modal-btn"
						>
							<Tablet size={15} />
							<span>Открыть планшет согласий (ПЭП)</span>
						</button>
					</div>

					{/* 40. Order 804n Service Catalog & Pricelist Matrix Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<FileText className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Номенклатура услуг № 804н и прайс-лист
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Номенклатурный справочник Минздрава 804н, ценовые категории (VIP/ДМС/Акция), маржинальность и экспорт CSV/A4.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsServicePricelistOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-service-pricelist-modal-btn"
						>
							<FileText size={15} />
							<span>Открыть прайс-лист клиники</span>
						</button>
					</div>

					{/* 41. Dental Loyalty, Bonus & Gift Certificate Studio Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Award className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Программа лояльности и сертификаты
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Кэшбэк (3-7%), семейные счета, подарочные сертификаты с кодом Luhn-16 и сплит-оплата на кассе 54-ФЗ.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsLoyaltyProgramOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-loyalty-program-modal-btn"
						>
							<Award size={15} />
							<span>Открыть программу лояльности</span>
						</button>
					</div>

					{/* 43. Statutory Electronic Sick Leave (ЭЛН) & Medical Commission Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<FileCheck2 className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Больничные листы (ЭЛН) & ВК 1089н
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Приказ Минздрава № 1089н: лимит 15 дней единолично, протоколы ВК, журнал 036/у, XML для СФР и памятка пациенту.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsSickLeaveElnOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-sick-leave-eln-modal-btn"
						>
							<FileCheck2 size={15} />
							<span>Открыть больничные листы (ЭЛН)</span>
						</button>
					</div>

					{/* 44. Statutory Form 257/u Autoclave Log Studio Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Flame className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Журнал работы стерилизаторов (Форма 257/у)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								СанПиН 3.3686-21: контроль 5 точек камеры (термо/баро), индикаторы 4-5 кл., биоконтроль бацилл и печать журнала 257/у.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsAutoclaveLog257Open(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-autoclave-log-257-modal-btn"
						>
							<Flame size={15} />
							<span>Открыть журнал 257/у</span>
						</button>
					</div>

					{/* 45. Statutory Doctor Shift Roster Studio Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Calendar className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									График смен врачей & Табель Т-13
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Статья 350 ТК РФ (33 ч/нед медработников), шахматка кресел, конфликты наложений, тепловая карта и табель Т-13.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsDoctorShiftRosterOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-doctor-shift-roster-modal-btn"
						>
							<Calendar size={15} />
							<span>Открыть график смен</span>
						</button>
					</div>

					{/* 46. Anesthesia QuickBar 1-Click Presets */}
					{/* 46. Anesthesia QuickBar 1-Click Presets */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4 md:col-span-2 lg:col-span-3">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Syringe className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Быстрая анестезия в 1 клик (Touch-Bar для работы в перчатках)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Мгновенный выбор ходовых карпул без блокирующих окон: Ультракаин Д-С 1.7 мл, Форте, Скандонест без адреналина.
							</p>
						</div>
						<AnesthesiaQuickBar
							onApplyAnesthesia={(diaryText) => {
								console.log("[QuickBar Anesthesia Applied]:", diaryText);
							}}
						/>
					</div>

					{/* 47. 3D CBCT MPR & Dental Arch Spline Studio Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Boxes className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									3D КЛКТ MPR & Сплайн зубной дуги
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								4-квадрантный синхронный 3D MPR просмотрщик (Axial, Coronal, Sagittal, Cross-Sections), пресеты Хаунсфилда и развертка ОПТГ.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsCbct3DStudioOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-cbct-mpr-3d-studio-modal-btn"
						>
							<Boxes size={15} />
							<span>Открыть 3D КЛКТ Студию</span>
						</button>
					</div>

					{/* 48. 2D Implant Cross-Section Planner Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Compass className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									2D Кросс-секционный планировщик имплантации
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Примерка имплантатов (Straumann/Nobel/Osstem/Dentium), контроль канала IAN 2.0 мм, плотность кости по Misch и протокол сверления.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsImplantPlannerOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-implant-cross-section-planner-modal-btn"
						>
							<Compass size={15} />
							<span>Открыть кросс-секционный планировщик</span>
						</button>
					</div>

					{/* 49. Post-Op Patient Care Memo Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<FileText className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Памятка пациенту (Post-Op Care) & Форма 043/у
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Клинические рекомендации по уходу после удаления/эндодонтии/имплантации, копирование в WhatsApp и печать А4/А5.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsPatientMemoOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-patient-memo-modal-btn"
						>
							<FileText size={15} />
							<span>Открыть памятку пациенту</span>
						</button>
					</div>

					{/* 50. Procedure Material Deduction (BOM) Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Boxes className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Списание материалов (BOM) & Техкарты 804н
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Интерактивное списание расходников по технологическим картам, степперы ≥48px, себестоимость и контроль дефицита FEFO.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsProcedureDeductionOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-procedure-deduction-modal-btn"
						>
							<Boxes size={15} />
							<span>Открыть списание по техкартам (BOM)</span>
						</button>
					</div>

					{/* 51. Wave 5: Domain 1 — Incoming Call Popup Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<PhoneCall className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Входящий звонок & AI STT Плеер
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Всплывающая карточка звонка, таймер разговора, 1-клик запись на прием, история посещений и расшифровка речи.
							</p>
						</div>
						<button
							type="button"
							onClick={() => {
								useTelephonyStore.getState().triggerIncomingCall({
									phone: "+7 (926) 555-12-34",
									patientName: "Смирнова Екатерина Васильевна",
									patientId: "PAT-001",
									provider: "mango",
									status: "ringing",
									timestamp: new Date().toISOString(),
								});
								setIsIncomingCallOpen(true);
							}}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-incoming-call-modal-btn"
						>
							<PhoneCall size={15} />
							<span>Открыть входящий звонок</span>
						</button>
					</div>

					{/* 52. Wave 5: Domain 1 — Telephony Floating Widget / Softphone Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Phone className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Софтфон & Плавающий виджет звонков
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Интерактивный софтфон, крупные кнопки набора (≥48px), переадресация вызова и журнал звонков.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsTelephonyWidgetOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-telephony-widget-btn"
						>
							<Phone size={15} />
							<span>Открыть софтфон телефонии</span>
						</button>
					</div>

					{/* 53. Wave 5: Domain 2 — Settings Access Matrix Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<ShieldCheck className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Ролевая матрица доступа сотрудников
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Матрица прав ролей (Врач, Ассистент, Администратор, Управляющий) и генерация инвайт-ссылок.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsSettingsAccessOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-settings-access-modal-btn"
						>
							<ShieldCheck size={15} />
							<span>Открыть матрицу доступа</span>
						</button>
					</div>

					{/* 54. Wave 5: Domain 2 — Staff Commissions Panel Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Calculator className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Ставки и комиссии врачей (804н)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Индивидуальные ставки врачей, процент удержания лаборатории/материалов и даты вступления в силу.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsStaffCommissionsOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-staff-commissions-modal-btn"
						>
							<Calculator size={15} />
							<span>Открыть ставки врачей</span>
						</button>
					</div>

					{/* 55. Wave 5: Domain 3 — CMO Compliance Hub Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<ShieldCheck className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Центр аудита начмеда & ЕГИСЗ (РЭМД)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Пакетное подписание карт УКЭП (КриптоПро), валидация по Приказу 203н и экспорт в РЭМД ЕГИСЗ.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsCmoHubOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-cmo-compliance-modal-btn"
						>
							<ShieldCheck size={15} />
							<span>Открыть центр начмеда</span>
						</button>
					</div>

					{/* 56. Wave 5: Domain 3 — Form 043/u Print Form Modal Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<FileText className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Медкарта Форма 043/у (Приказ 834н)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Официальный медицинский бланк 043/у Минздрава России: зубная формула FDI, КПУ/CPITN и 1-клик печать А4.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsForm043PrintOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-form043-print-modal-btn"
						>
							<FileText size={15} />
							<span>Открыть форму 043/у</span>
						</button>
					</div>

					{/* 57. Wave 5: Domain 4 — Offline Backup Vault Panel Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Database className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Офлайн-хранилище & Бэкап базы
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Резервные копии клиники AES-GCM 256, расписание авто-бэкапов, проверка целостности локального кэша.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsOfflineVaultOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-offline-vault-modal-btn"
						>
							<Database size={15} />
							<span>Открыть офлайн-хранилище</span>
						</button>
					</div>

					{/* 58. Wave 8: 54-FZ Cash Shift Closing & Statutory Reconciliation Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Receipt className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Закрытие кассовой смены (54-ФЗ / Z-отчет)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								3-кнопочный регламент 54-ФЗ (ФФД 1.2): внесение размена, X-отчет, Z-отчет, сверка наличных и инкассация по 3210-У.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsCashShiftClosingOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-cash-shift-closing-modal-btn"
						>
							<Receipt size={15} />
							<span>Открыть закрытие смены (Z)</span>
						</button>
					</div>

					{/* 59. Wave 9: Domain 1 — Clinical P&L Hub & Unit Economics Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<TrendingUp className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Финансовый P&L и юнит-экономика клиники
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Выручка, прямая себестоимость ТМЦ (804н), наряды ЗТЛ, сдельный ФОТ врачей и расчет EBITDA на кресло-час.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsClinicalPnlOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-clinical-pnl-hub-modal-btn"
						>
							<TrendingUp size={15} />
							<span>Открыть P&L клиники</span>
						</button>
					</div>

					{/* 60. Wave 9: Domain 2 — Audit Trail & Security Event Log Hub Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<ShieldCheck className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Центр аудита безопасности (152-ФЗ)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Неизменяемый реестр обращений к ПДн, подписи УКЭП, кассовые события 54-ФЗ и валидация SHA-256 HMAC.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsAuditTrailOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-audit-trail-hub-modal-btn"
						>
							<ShieldCheck size={15} />
							<span>Открыть журнал аудита</span>
						</button>
					</div>

					{/* 61. Wave 9: Domain 3 — CMO Quality & Clinical Audit Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Award className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Экспертиза качества медпомощи (ЭКМП 203н)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Контроль ведения карт 043/у, клинические дефекты, чек-лист Приказа 203н и протокол врачебной комиссии ВК.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsCmoQualityAuditOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-cmo-quality-audit-modal-btn"
						>
							<Award size={15} />
							<span>Открыть экспертизу ЭКМП</span>
						</button>
					</div>

					{/* 62. Wave 10: FNS Tax Deduction & KND 1151156 Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<FileText className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Справка для налогового вычета (ФНС КНД 1151156)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Приказ ФНС № ЕА-7-11/824@: Код 01 (лимит 150 000 ₽), Код 02 (дорогостоящее без лимита по ПП РФ № 458), QR-код и XML 5.01 для ТКС.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsFnsTaxDeductionOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-fns-tax-deduction-modal-btn"
						>
							<FileText size={15} />
							<span>Открыть справку ФНС</span>
						</button>
					</div>

					{/* 63. Offline Sync & CRDT Storage Guard Trigger */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col justify-between gap-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-[var(--teal)]">
								<Database className="w-5 h-5" />
								<span className="font-bold text-sm text-[var(--ink)]">
									Автономная синхронизация (CRDT LWW)
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed">
								Мониторинг IndexedDB, буферизация приемов и зубных формул (FDI 11–48), статус очереди Outbox и выгрузка аварийного слепка .dente.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsOfflineSyncGuardOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-offline-sync-guard-modal-btn"
						>
							<Database size={15} />
							<span>Открыть монитор синхронизации</span>
						</button>
					</div>
				</div>

				{/* 8. Interactive Live Anesthesia Calculator Component */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Syringe className="w-5 h-5 text-[var(--teal)]" />
							<h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)]">
								Интерактивный калькулятор анестезии (Встроенный компонент)
							</h2>
						</div>
						<span className="text-xs text-[var(--muted)]">
							Автоматический контроль токсической дозы по СтАР
						</span>
					</div>

					<ToothAnesthesiaCalculator
						toothNumber={16}
						initialWeightKg={70}
						onInsertToProtocol={(text) => {
							console.log("[Anesthesia Applied]:", text);
						}}
					/>
				</div>

				{/* 9. Interactive Radiology & Imaging Workspace Module */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Scan className="w-5 h-5 text-[var(--teal)]" />
							<h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)]">
								Модуль лучевой диагностики (3D КЛКТ, ОПТГ, RVG, ТРГ)
							</h2>
						</div>
						<span className="text-xs text-[var(--muted)]">
							Контроль дозовых нагрузок по СанПиН и кибер-просмотрщик
						</span>
					</div>

					<RadiologyModule
						patient={SAMPLE_PATIENT}
						doctorName="Д-р Смирнов Алексей Петрович"
						doctorSpecialty="Врач-стоматолог терапевт-эндодонтист"
						clinicName="ООО «Денте Стоматология»"
					/>
				</div>

				{/* 10. SanPiN 3.3686-21 Sterilization Registers & Nurse Stamp */}
				<div className="space-y-3">
					<h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink,#111827)]">
						Журналы СанПиН и стерилизационные режимы ЦСО
					</h2>
					<SanpinRegisters />
				</div>

				{/* 11. 54-FZ Cash Shift Manager Widget */}
				<div className="space-y-3">
					<h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink,#111827)]">
						Кассовая смена ККТ 54-ФЗ (X/Z-отчеты и сверка)
					</h2>
					<CashShiftWidget />
				</div>
			</main>

			{/* Render Modals */}
			{isPediatricOpen && (
				<PediatricMixedDentitionModal
					isOpen={isPediatricOpen}
					onClose={() => setIsPediatricOpen(false)}
					initialAge={7.5}
				/>
			)}

			{isFiscalOpen && (
				<FiscalReceipt54FzModal
					isOpen={isFiscalOpen}
					onClose={() => setIsFiscalOpen(false)}
					items={SAMPLE_TREATMENT_ITEMS}
					patientId="PAT-2026-0891"
					patientName="Смирнова Екатерина Васильевна"
					patientDepositRub={5000}
				/>
			)}

			{isBilling1cExportOpen && (
				<Billing1CExportModal
					isOpen={isBilling1cExportOpen}
					onClose={() => setIsBilling1cExportOpen(false)}
					items={SAMPLE_TREATMENT_ITEMS.map((item) => ({
						id: item.id,
						code804n: item.code804n,
						name: item.name,
						toothNumber: item.toothNumber,
						quantity: item.quantity,
						priceRub: item.priceRub,
						discountRub: item.discountRub,
					}))}
					patientId="PAT-2026-0891"
					patientName="Смирнова Екатерина Васильевна"
					patientPhone="+7 (999) 123-45-67"
					doctorName="Д-р Ковалев С. П."
				/>
			)}

			{isOneCCommerceMlOpen && (
				<OneCCommerceMlModal
					isOpen={isOneCCommerceMlOpen}
					onClose={() => setIsOneCCommerceMlOpen(false)}
				/>
			)}

			{isPatientBillingOpen && (
				<PatientBillingModal
					isOpen={isPatientBillingOpen}
					onClose={() => setIsPatientBillingOpen(false)}
					patient={{
						id: "PAT-2026-0891",
						fullName: SAMPLE_PATIENT.fullName,
						phone: SAMPLE_PATIENT.phone,
						medicalCardNumber: SAMPLE_PATIENT.cardNumber,
					}}
					doctor={{
						fullName: "Д-р Смирнов Алексей Петрович",
						specialty: "Врач-стоматолог терапевт-эндодонтист",
					}}
				/>
			)}

			{isPrescriptionOpen && (
				<PrescriptionModal
					isOpen={isPrescriptionOpen}
					onClose={() => setIsPrescriptionOpen(false)}
					patient={SAMPLE_PATIENT}
					diary={SAMPLE_DIARY}
					doctorName="Д-р Смирнов Алексей Петрович"
					doctorSpecialty="Врач-стоматолог терапевт-эндодонтист"
					clinicName="ООО «Денте Стоматология»"
				/>
			)}

			{isCbct3DStudioOpen && (
				<CbctMprImplantStudioModal
					isOpen={isCbct3DStudioOpen}
					onClose={() => setIsCbct3DStudioOpen(false)}
				/>
			)}

			{isCbctMpr3DStudioOpen && (
				<CbctMpr3DStudioModal
					isOpen={isCbctMpr3DStudioOpen}
					onClose={() => setIsCbctMpr3DStudioOpen(false)}
				/>
			)}

			{isImplantPlannerOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
					<div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4">
						<ImplantCrossSectionPlanner
							onClose={() => setIsImplantPlannerOpen(false)}
						/>
					</div>
				</div>
			)}
  
			{isRadiologyOpen && (
				<RadiologyReferralModal
					isOpen={isRadiologyOpen}
					onClose={() => setIsRadiologyOpen(false)}
					patient={SAMPLE_PATIENT}
					doctorName="Д-р Смирнов Алексей Петрович"
					doctorSpecialty="Врач-стоматолог терапевт-эндодонтист"
					clinicName="ООО «Денте Стоматология»"
				/>
			)}

			{isActPrintOpen && (
				<TreatmentPlanCompletedActPrint
					isOpen={isActPrintOpen}
					onClose={() => setIsActPrintOpen(false)}
					actData={SAMPLE_COMPLETED_ACT}
					patientGender="female"
				/>
			)}

			{isConsentOpen && (
				<InformedConsentModal
					isOpen={isConsentOpen}
					onClose={() => setIsConsentOpen(false)}
					patient={SAMPLE_PATIENT}
					diary={SAMPLE_DIARY}
					doctorName="Д-р Смирнов Алексей Петрович"
					doctorSpecialty="Врач-стоматолог терапевт-эндодонтист"
					clinicName="ООО «Денте Стоматология»"
				/>
			)}

			{isViewerOpen && (
				<RadiologyViewerModal
					isOpen={isViewerOpen}
					onClose={() => setIsViewerOpen(false)}
					study={activeStudy}
					onSaveStudy={(updated) => setActiveStudy(updated)}
				/>
			)}

			{isPayrollOpen && (
				<DoctorPayrollModal
					isOpen={isPayrollOpen}
					onClose={() => setIsPayrollOpen(false)}
					clinicName="ООО «Денте Стоматология»"
				/>
			)}

			{isFastCheckoutOpen && (
				<FastCheckoutModal
					isOpen={isFastCheckoutOpen}
					onClose={() => setIsFastCheckoutOpen(false)}
					totalBillKop={1960000}
					patientName="Смирнова Екатерина Васильевна"
				/>
			)}

			{isMedicalPrescriptionOpen && (
				<MedicalPrescriptionModal
					isOpen={isMedicalPrescriptionOpen}
					onClose={() => setIsMedicalPrescriptionOpen(false)}
					patientName="Смирнова Екатерина Васильевна"
				/>
			)}

			{isCephOpen && (
				<CephalometricAnalysisModal
					isOpen={isCephOpen}
					onClose={() => setIsCephOpen(false)}
					patientName="Смирнова Екатерина Васильевна"
					initialImageUrl={cephInitialImageUrl}
				/>
			)}

			{isIsqOpen && (
				<ImplantIsqProtocolModal
					isOpen={isIsqOpen}
					onClose={() => setIsIsqOpen(false)}
					initialToothNumber={36}
					initialImplantSystem="Straumann BLX Roxolid SLActive"
					surgeonName="Д-р Ковалев С. П. (Хирург-имплантолог)"
				/>
			)}

			{isLabOrderOpen && (
				<DentalLabOrderModal
					isOpen={isLabOrderOpen}
					onClose={() => setIsLabOrderOpen(false)}
					patientName="Смирнова Екатерина Васильевна"
					doctorName="Д-р Смирнов Алексей Петрович"
					initialToothFdi="16"
				/>
			)}

			{isPhotoProtocolOpen && (
				<ClinicalPhotoProtocolModal
					isOpen={isPhotoProtocolOpen}
					onClose={() => setIsPhotoProtocolOpen(false)}
					patientName="Смирнова Екатерина Васильевна"
					doctorName="Д-р Смирнов Алексей Петрович"
					clinicName="ООО «Денте Стоматология»"
				/>
			)}

			{isRecallOpen && (
				<PatientRecallManagerModal
					isOpen={isRecallOpen}
					onClose={() => setIsRecallOpen(false)}
					clinicName="ООО «Денте Стоматология»"
				/>
			)}

			{isRecallsHubOpen && (
				<PatientRecallsHubModal
					isOpen={isRecallsHubOpen}
					onClose={() => setIsRecallsHubOpen(false)}
					clinicName="ООО «Денте Стоматология»"
				/>
			)}

			{isAutoclaveOpen && (
				<AutoclaveCycleModal
					isOpen={isAutoclaveOpen}
					onClose={() => setIsAutoclaveOpen(false)}
					operatorName="Смирнова О. И. (Медицинская сестра ЦСО)"
				/>
			)}

			{isInsuranceOpen && (
				<InsurancePreAuthModal
					isOpen={isInsuranceOpen}
					onClose={() => setIsInsuranceOpen(false)}
					patient={{
						fullName: "Смирнова Екатерина Васильевна",
						birthDate: "1988-06-14",
						policyNumber: "7700-482910-2026",
						insurerId: "sogaz",
					}}
				/>
			)}

			{isPlanComparatorOpen && (
				<TreatmentPlanComparatorModal
					isOpen={isPlanComparatorOpen}
					onClose={() => setIsPlanComparatorOpen(false)}
					patientName="Смирнова Екатерина Васильевна"
					doctorName="Д-р Смирнов Алексей Петрович"
					clinicName="ООО «Денте Стоматология»"
				/>
			)}

			{is3TierPreviewOpen && (
				<div
					className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
					data-testid="plan-3tier-preview-modal"
				>
					<div className="bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl p-4 sm:p-6">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)] mb-3">
							<h3 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)]">
								3-Tier Сравнение планов лечения: Смирнова Е. В.
							</h3>
							<button
								type="button"
								onClick={() => setIs3TierPreviewOpen(false)}
								className="p-1.5 rounded-xl hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								data-testid="close-3tier-preview-btn"
							>
								✕
							</button>
						</div>
						<div className="flex-1 overflow-y-auto min-h-0">
							<TreatmentPlan3TierComparison
								tiers={generate3TierPlanComparison([
									{ toothNumber: 16, state: "Caries", systemicNotes: "Глубокий кариес" } as any,
									{ toothNumber: 36, state: "Missing", systemicNotes: "Отсутствует зуб, показана имплантация" } as any,
									{ toothNumber: 46, state: "Pulpitis", systemicNotes: "Острый пульпит" } as any,
								])}
								selectedTierId="optimum"
								onSelectTier={() => {}}
								onApproveAndSign={() => showToast("План утвержден и отправлен на подписание", "success")}
								onOpenInstallment={() => showToast("Переход в модуль рассрочки 0%", "info")}
								onPrintContract={() => showToast("Печать договора и брошюры", "info")}
							/>
						</div>
					</div>
				</div>
			)}

			{isPhased4PreviewOpen && (
				<div
					className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
					data-testid="plan-phased4-preview-modal"
				>
					<div className="bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl p-4 sm:p-6">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)] mb-3">
							<h3 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)]">
								4 Клинических этапа (Поэтапная смета): Смирнова Е. В.
							</h3>
							<button
								type="button"
								onClick={() => setIsPhased4PreviewOpen(false)}
								className="p-1.5 rounded-xl hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								data-testid="close-phased4-preview-btn"
							>
								✕
							</button>
						</div>
						<div className="flex-1 overflow-y-auto min-h-0">
							<TreatmentPlanPhased4StageView
								stages={generateTreatmentPlanStages([
									{ toothNumber: 16, state: "Caries", systemicNotes: "Глубокий кариес" } as any,
									{ toothNumber: 36, state: "Missing", systemicNotes: "Отсутствует зуб, показана имплантация" } as any,
									{ toothNumber: 46, state: "Pulpitis", systemicNotes: "Острый пульпит" } as any,
								])}
								planTierTitle="Оптимальный комплексный план"
								patientName="Смирнова Екатерина Васильевна"
								onExecuteStage={(cat) => showToast(`Выполнение этапа «${cat}»`, "info")}
								onOpenStagePayment={() => showToast("Открытие графика платежей и эскроу", "info")}
								onOpenInstallment={() => showToast("Переход в модуль рассрочки 0%", "info")}
								onApproveAndSign={() => showToast("План утвержден и отправлен на подписание", "success")}
								onPrintContract={() => showToast("Печать договора", "info")}
							/>
						</div>
					</div>
				</div>
			)}

			{isTransferOpen && (
				<WarehouseTransferModal
					isOpen={isTransferOpen}
					onClose={() => setIsTransferOpen(false)}
				/>
			)}

			{isClinicalWriteoffOpen && (
				<ClinicalWriteoffModal
					isOpen={isClinicalWriteoffOpen}
					onClose={() => setIsClinicalWriteoffOpen(false)}
					patientName={SAMPLE_PATIENT.fullName}
					doctorFullName="Д-р Смирнов Алексей Петрович"
					assistantFullName="Медсестра Петрова Е. С."
				/>
			)}

			{isPortalOpen && (
				<PatientPortalTimelineModal
					isOpen={isPortalOpen}
					onClose={() => setIsPortalOpen(false)}
				/>
			)}

			{isVoiceAssistantOpen && (
				<VoiceDictationAssistantModal
					isOpen={isVoiceAssistantOpen}
					onClose={() => setIsVoiceAssistantOpen(false)}
					activeToothNumber={46}
				/>
			)}

			{isConsent323Open && (
				<InformedConsent323FzModal
					isOpen={isConsent323Open}
					onClose={() => setIsConsent323Open(false)}
					initialTemplateKey="CONSENT_THERAPY"
					patient={{
						fullName: "Смирнова Екатерина Васильевна",
						birthDate: "1988-06-14",
						passport: "4512 789456",
						phone: "+7 (999) 123-45-67",
						cardNumber: "К-8492",
					}}
					doctorName="Д-р Смирнов Алексей Петрович"
					clinicName="ООО «Денте Стоматология»"
				/>
			)}

			{isAnesthesiaProtocolOpen && (
				<AnesthesiaProtocolModal
					isOpen={isAnesthesiaProtocolOpen}
					onClose={() => setIsAnesthesiaProtocolOpen(false)}
					initialToothNumber={46}
					initialPatientWeightKg={70}
					initialPatientAgeYears={35}
				/>
			)}

			{isAnesthesiaHubOpen && (
				<AnesthesiaSafetyHubModal
					isOpen={isAnesthesiaHubOpen}
					onClose={() => setIsAnesthesiaHubOpen(false)}
					initialPatientName={SAMPLE_PATIENT.fullName}
					initialPatientWeightKg={70}
					initialPatientAgeYears={35}
					initialToothFdi="16"
					doctorFullName="Д-р Смирнов Алексей Петрович"
					clinicName="ООО «ДЕНТЕ»"
				/>
			)}

			{isSterilizationJournalOpen && (
				<SterilizationJournalModal
					isOpen={isSterilizationJournalOpen}
					onClose={() => setIsSterilizationJournalOpen(false)}
				/>
			)}

			{isMedicalWasteOpen && (
				<MedicalWasteJournalModal
					isOpen={isMedicalWasteOpen}
					onClose={() => setIsMedicalWasteOpen(false)}
				/>
			)}

			{isEmergencyRescueOpen && (
				<EmergencyRescueModal
					isOpen={isEmergencyRescueOpen}
					onClose={() => setIsEmergencyRescueOpen(false)}
					initialPatientName={SAMPLE_PATIENT.fullName}
					initialPatientAgeYears={38}
					initialPatientWeightKg={70}
					clinicName="Стоматологическая клиника «ДЕНТЕ»"
					clinicAddress="г. Москва, ул. Клиническая, д. 10, стр. 2"
					cabinetNumber="1"
					doctorFullName="Д-р Смирнов Алексей Петрович"
					assistantFullName="Медсестра Петрова Е. С."
				/>
			)}

			{isWarrantyPassportOpen && (
				<WarrantyPassportModal
					isOpen={isWarrantyPassportOpen}
					onClose={() => setIsWarrantyPassportOpen(false)}
					patient={{
						fullName: SAMPLE_PATIENT.fullName,
						birthDate: SAMPLE_PATIENT.birthDate,
						cardNumber: SAMPLE_PATIENT.cardNumber,
						phone: SAMPLE_PATIENT.phone,
					}}
					doctorName="Д-р Смирнов Алексей Петрович"
					doctorSpecialty="Врач-стоматолог терапевт-ортопед"
					clinicName="ООО «Стоматологическая клиника ДЕНТЕ»"
					clinicAddress="г. Москва, ул. Клиническая, д. 10, стр. 2"
					clinicPhone="+7 (495) 777-88-99"
					clinicLicenseNumber="ЛО-77-01-019842"
				/>
			)}

			{isCmoEmrAuditOpen && (
				<CmoEmrAuditModal
					isOpen={isCmoEmrAuditOpen}
					onClose={() => setIsCmoEmrAuditOpen(false)}
				/>
			)}

			{isFnsNdflXmlOpen && (
				<FnsNdflXmlModal
					onClose={() => setIsFnsNdflXmlOpen(false)}
				/>
			)}

			{isPlanPriceValidatorOpen && (
				<TreatmentPlanPriceValidatorModal
					isOpen={isPlanPriceValidatorOpen}
					onClose={() => setIsPlanPriceValidatorOpen(false)}
				/>
			)}

			{isSberPosOpen && (
				<SberPosTerminalModal
					isOpen={isSberPosOpen}
					onClose={() => setIsSberPosOpen(false)}
				/>
			)}

			{isPatientCabinetOpen && (
				<PatientPortalModal
					isOpen={isPatientCabinetOpen}
					onClose={() => setIsPatientCabinetOpen(false)}
				/>
			)}

			{isPatientWebappOpen && (
				<PatientWebappPortalModal
					isOpen={isPatientWebappOpen}
					onClose={() => setIsPatientWebappOpen(false)}
				/>
			)}

			{isEgiszRemdOpen && (
				<EgiszRemdHubModal
					isOpen={isEgiszRemdOpen}
					onClose={() => setIsEgiszRemdOpen(false)}
				/>
			)}

			{isLabWorkOrderOpen && (
				<LabWorkOrderModal
					isOpen={isLabWorkOrderOpen}
					onClose={() => setIsLabWorkOrderOpen(false)}
					patientName={SAMPLE_PATIENT.fullName}
					patientChartNumber={SAMPLE_PATIENT.cardNumber}
				/>
			)}

			{isLabTrackingOpen && (
				<LabTrackingDrawer
					isOpen={isLabTrackingOpen}
					onClose={() => setIsLabTrackingOpen(false)}
					order={SAMPLE_LAB_TRACKING_ORDER}
				/>
			)}

			{isLabHubOpen && (
				<DentalLabOrdersHubModal
					isOpen={isLabHubOpen}
					onClose={() => setIsLabHubOpen(false)}
				/>
			)}

			{isDmsManagerOpen && (
				<DmsInsuranceManagerModal
					isOpen={isDmsManagerOpen}
					onClose={() => setIsDmsManagerOpen(false)}
				/>
			)}

			{isKraftBarcodeOpen && (
				<KraftPackageBarcodeModal
					isOpen={isKraftBarcodeOpen}
					onClose={() => setIsKraftBarcodeOpen(false)}
				/>
			)}

			{isServicePricelistOpen && (
				<ServicePricelistManagerModal
					isOpen={isServicePricelistOpen}
					onClose={() => setIsServicePricelistOpen(false)}
				/>
			)}

			{isLoyaltyProgramOpen && (
				<LoyaltyProgramModal
					isOpen={isLoyaltyProgramOpen}
					onClose={() => setIsLoyaltyProgramOpen(false)}
					patientName={SAMPLE_PATIENT.fullName}
					medicalCardNumber={SAMPLE_PATIENT.cardNumber}
				/>
			)}

			{isSickLeaveElnOpen && (
				<SickLeaveElnModal
					isOpen={isSickLeaveElnOpen}
					onClose={() => setIsSickLeaveElnOpen(false)}
					initialPatientName={SAMPLE_PATIENT.fullName}
					initialPatientBirthDate={SAMPLE_PATIENT.birthDate}
				/>
			)}

			{isAutoclaveLog257Open && (
				<AutoclaveLog257Modal
					isOpen={isAutoclaveLog257Open}
					onClose={() => setIsAutoclaveLog257Open(false)}
				/>
			)}

			{isDoctorShiftRosterOpen && (
				<DoctorShiftRosterModal
					isOpen={isDoctorShiftRosterOpen}
					onClose={() => setIsDoctorShiftRosterOpen(false)}
				/>
			)}

			{isSterilizationStudioOpen && (
				<SterilizationStudioModal
					isOpen={isSterilizationStudioOpen}
					onClose={() => setIsSterilizationStudioOpen(false)}
				/>
			)}

			{isBeforeAfterOpen && (
				<div
					className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
					role="dialog"
					aria-modal="true"
					data-testid="before-after-modal-container"
				>
					<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden max-h-[94vh] flex flex-col">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)] mb-4 shrink-0">
							<div className="flex items-center gap-2.5">
								<div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
									<Camera className="w-5 h-5" />
								</div>
								<div>
									<h3 className="text-base font-bold text-[var(--ink)]">
										Фотопротокол — Сравнение До/После & VITA Shade
									</h3>
									<p className="text-xs text-[var(--muted)]">
										Интерактивный сплит-вайпер, VITA 3D-Master расцветка и эстетические направляющие
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsBeforeAfterOpen(false)}
								className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all flex items-center justify-center"
								data-testid="close-before-after-modal-btn"
								aria-label="Закрыть модальное окно"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto">
							<BeforeAfterComparisonView
								preset={STANDARD_12_SLOT_PROTOCOL}
								slotsData={SAMPLE_PHOTO_SLOTS}
								beforeSlotId="portrait_smile"
								afterSlotId="intraoral_frontal_occlusion"
								clinicName="Стоматология ДЕНТЕ ПРЕМИУМ"
								patientName={SAMPLE_PATIENT.fullName}
								patientCardNumber={SAMPLE_PATIENT.cardNumber}
								doctorName="Д-р Смирнов Алексей Петрович"
								onBeforeSlotChange={() => {}}
								onAfterSlotChange={() => {}}
							/>
						</div>
					</div>
				</div>
			)}

			{isPatientMemoOpen && (
				<PatientMemoPrintModal
					isOpen={isPatientMemoOpen}
					onClose={() => setIsPatientMemoOpen(false)}
					patient={SAMPLE_PATIENT}
					doctorName="Д-р Смирнов Алексей Петрович"
					doctorSpecialty="Врач-стоматолог терапевт-хирург"
					clinicName="ООО «Денте Стоматология»"
					clinicPhone="+7 (495) 777-88-99"
					toothNumber="16"
				/>
			)}

			{isProcedureDeductionOpen && (
				<ProcedureMaterialDeductionModal
					isOpen={isProcedureDeductionOpen}
					onClose={() => setIsProcedureDeductionOpen(false)}
					serviceName="Лечение кариеса и реставрация зуба 1.6"
					patientName={SAMPLE_PATIENT.fullName}
					toothNumber="16"
					initialTechMapCodes={["SANPIN_PPE", "CARIES_RESTO_DIRECT"]}
				/>
			)}

			{isIncomingCallOpen && (
				<div
					className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
					role="dialog"
					aria-modal="true"
					data-testid="incoming-call-modal-container"
				>
					<div className="relative w-full max-w-2xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden max-h-[94vh] flex flex-col">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)] mb-4 shrink-0">
							<div className="flex items-center gap-2.5">
								<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
									<PhoneCall className="w-5 h-5" />
								</div>
								<div>
									<h3 className="text-base font-bold text-[var(--ink)]">
										Входящий звонок пациента & Интерактивный плеер
									</h3>
									<p className="text-xs text-[var(--muted)]">
										Карточка звонящего, быстрая запись, история визитов и расшифровка AI STT
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => {
									setIsIncomingCallOpen(false);
									useTelephonyStore.getState().dismissCall();
								}}
								className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all flex items-center justify-center"
								data-testid="close-incoming-call-modal-btn"
								aria-label="Закрыть модальное окно"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto">
							<IncomingCallPopup />
						</div>
					</div>
				</div>
			)}

			{isTelephonyWidgetOpen && (
				<div
					className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
					role="dialog"
					aria-modal="true"
					data-testid="telephony-widget-modal-container"
				>
					<div className="relative w-full max-w-md bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden max-h-[94vh] flex flex-col">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)] mb-4 shrink-0">
							<div className="flex items-center gap-2.5">
								<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
									<Phone className="w-5 h-5" />
								</div>
								<div>
									<h3 className="text-base font-bold text-[var(--ink)]">
										Софтфон & Плавающий виджет телефонии
									</h3>
									<p className="text-xs text-[var(--muted)]">
										Номеронабиратель ≥48px, быстрый набор, журнал вызовов
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsTelephonyWidgetOpen(false)}
								className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all flex items-center justify-center"
								data-testid="close-telephony-widget-modal-btn"
								aria-label="Закрыть софтфон"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto">
							<TelephonyFloatingWidget defaultExpanded={true} showDialerDefault={true} />
						</div>
					</div>
				</div>
			)}

			{isSettingsAccessOpen && (
				<div
					className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
					role="dialog"
					aria-modal="true"
					data-testid="settings-access-modal-container"
				>
					<div className="relative w-full max-w-4xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden max-h-[94vh] flex flex-col">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)] mb-4 shrink-0">
							<div className="flex items-center gap-2.5">
								<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
									<ShieldCheck className="w-5 h-5" />
								</div>
								<div>
									<h3 className="text-base font-bold text-[var(--ink)]">
										Ролевая матрица доступа сотрудников
									</h3>
									<p className="text-xs text-[var(--muted)]">
										Настройка прав ролей (Врач, Ассистент, Администратор, Управляющий), генерация инвайт-ссылок
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsSettingsAccessOpen(false)}
								className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all flex items-center justify-center"
								data-testid="close-settings-access-modal-btn"
								aria-label="Закрыть матрицу доступа"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto">
							<SettingsAccessTab settingsTab="access" props={{}} />
						</div>
					</div>
				</div>
			)}

			{isStaffCommissionsOpen && (
				<div
					className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
					role="dialog"
					aria-modal="true"
					data-testid="staff-commissions-modal-container"
				>
					<div className="relative w-full max-w-4xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden max-h-[94vh] flex flex-col">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)] mb-4 shrink-0">
							<div className="flex items-center gap-2.5">
								<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
									<Calculator className="w-5 h-5" />
								</div>
								<div>
									<h3 className="text-base font-bold text-[var(--ink)]">
										Ставки и комиссии врачей (Номенклатура 804н)
									</h3>
									<p className="text-xs text-[var(--muted)]">
										Индивидуальные ставки врачей, вычет лаборатории и материалов, даты вступления в силу
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsStaffCommissionsOpen(false)}
								className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all flex items-center justify-center"
								data-testid="close-staff-commissions-modal-btn"
								aria-label="Закрыть панель комиссий"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto">
							<StaffCommissionsPanel />
						</div>
					</div>
				</div>
			)}

			{isCmoHubOpen && (
				<div
					className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
					role="dialog"
					aria-modal="true"
					data-testid="cmo-compliance-modal-container"
				>
					<div className="relative w-full max-w-6xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden max-h-[94vh] flex flex-col">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)] mb-4 shrink-0">
							<div className="flex items-center gap-2.5">
								<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
									<ShieldCheck className="w-5 h-5" />
								</div>
								<div>
									<h3 className="text-base font-bold text-[var(--ink)]">
										Центр аудита ЭМК начмеда & Реестр РЭМД ЕГИСЗ
									</h3>
									<p className="text-xs text-[var(--muted)]">
										Пакетное подписание УКЭП (КриптоПро), валидация по Приказу 203н, экспорт реестров в РЭМД
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsCmoHubOpen(false)}
								className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all flex items-center justify-center"
								data-testid="close-cmo-compliance-modal-btn"
								aria-label="Закрыть центр начмеда"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto">
							<CmoComplianceHub />
						</div>
					</div>
				</div>
			)}

			{isForm043PrintOpen && (
				<Form043PrintModal
					isOpen={isForm043PrintOpen}
					onClose={() => setIsForm043PrintOpen(false)}
				/>
			)}

			{isOfflineVaultOpen && (
				<div
					className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
					role="dialog"
					aria-modal="true"
					data-testid="offline-vault-modal-container"
				>
					<div
						className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden flex flex-col"
						style={{
							maxHeight: "calc(100dvh - 24px)",
							display: "flex",
							flexDirection: "column",
							boxSizing: "border-box",
						}}
					>
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)] mb-4 shrink-0">
							<div className="flex items-center gap-2.5">
								<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
									<Database className="w-5 h-5" />
								</div>
								<div>
									<h3 className="text-base font-bold text-[var(--ink)]">
										Офлайн-хранилище и бэкап базы (AES-GCM 256)
									</h3>
									<p className="text-xs text-[var(--muted)]">
										Резервное копирование клиники, проверка целостности кэша, зашифрованные снапшоты
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsOfflineVaultOpen(false)}
								className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all flex items-center justify-center"
								data-testid="close-offline-vault-modal-btn"
								aria-label="Закрыть офлайн-хранилище"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div
							className="flex-1 overflow-y-auto overscroll-contain"
							style={{
								paddingBottom: "48px",
								maxHeight: "calc(100dvh - 32px)",
								overflowY: "auto",
								overscrollBehavior: "contain",
							}}
						>
							<OfflineBackupVaultPanel
								organizationId="c-1"
								clinicName="ООО «Денте Стоматология»"
							/>
						</div>
					</div>
				</div>
			)}
			
			{isChairsideConsentOpen && (
				<ChairsideTabletConsentModal
					isOpen={isChairsideConsentOpen}
					onClose={() => setIsChairsideConsentOpen(false)}
				/>
			)}

			{isStaffPayrollLedgerOpen && (
				<StaffPayrollLedgerModal
					isOpen={isStaffPayrollLedgerOpen}
					onClose={() => setIsStaffPayrollLedgerOpen(false)}
					clinicName="ООО «Денте Стоматология»"
				/>
			)}

			{isSterilizationJournalModalOpen && (
				<SterilizationJournalModal
					isOpen={isSterilizationJournalModalOpen}
					onClose={() => setIsSterilizationJournalModalOpen(false)}
				/>
			)}

			{isAnesthesiaSafetyHubOpen && (
				<AnesthesiaSafetyHubModal
					isOpen={isAnesthesiaSafetyHubOpen}
					onClose={() => setIsAnesthesiaSafetyHubOpen(false)}
				/>
			)}

			{isCashShiftClosingOpen && (
				<CashShiftClosingModal
					isOpen={isCashShiftClosingOpen}
					onClose={() => setIsCashShiftClosingOpen(false)}
				/>
			)}

			{isClinicalPnlOpen && (
				<ClinicalPnlHubModal
					isOpen={isClinicalPnlOpen}
					onClose={() => setIsClinicalPnlOpen(false)}
				/>
			)}

			{isAuditTrailOpen && (
				<AuditTrailHubModal
					isOpen={isAuditTrailOpen}
					onClose={() => setIsAuditTrailOpen(false)}
				/>
			)}

			{isCmoQualityAuditOpen && (
				<CmoQualityAuditModal
					isOpen={isCmoQualityAuditOpen}
					onClose={() => setIsCmoQualityAuditOpen(false)}
				/>
			)}

			{isFnsTaxDeductionOpen && (
				<FnsTaxDeductionModal
					isOpen={isFnsTaxDeductionOpen}
					onClose={() => setIsFnsTaxDeductionOpen(false)}
					patientName={SAMPLE_PATIENT.fullName}
					patientBirthDate={SAMPLE_PATIENT.birthDate}
					clinicName="ООО «Денте Стоматология»"
				/>
			)}

			{isOfflineSyncGuardOpen && (
				<OfflineSyncGuardModal
					isOpen={isOfflineSyncGuardOpen}
					onClose={() => setIsOfflineSyncGuardOpen(false)}
				/>
			)}

			</div>
		</AppLogicProvider>
	);
};

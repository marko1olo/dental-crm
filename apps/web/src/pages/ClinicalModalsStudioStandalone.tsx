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
	Coins,
	Compass,
	CreditCard,
	Crown,
	Eye,
	FileBadge,
	FileCheck2,
	FileText,
	Flame,
	FlaskConical,
	Gauge,
	HeartPulse,
	Layers,
	Moon,
	PackageCheck,
	Palette,
	PhoneCall,
	Pill,
	Printer,
	QrCode,
	Receipt,
	Scan,
	Shield,
	ShieldCheck,
	Sliders,
	Sparkles,
	Spline,
	Sun,
	Syringe,

	Truck,
	User,
	X,
} from "lucide-react";
import type { Kopecks } from "@dental/shared";
import { showToast } from "../components/GlobalToast";
import { ToothAnesthesiaCalculator } from "../components/diagnostic/ToothAnesthesiaCalculator";
import { PrescriptionModal } from "../components/visit/PrescriptionModal";
import { InformedConsentModal } from "../components/documents/InformedConsentModal";
import {
	RadiologyModule,
	RadiologyReferralModal,
	RadiologyViewerModal,
	CbctMprImplantStudioModal,
	CbctMpr3DStudioModal,
	ImplantCrossSectionPlanner,
	TOOTH_16_DIAGNOSTIC_RADIOGRAPH_DATA_URI,
	type RadiologyStudy,
} from "../components/radiology";
import { TreatmentPlanCompletedActPrint } from "../components/treatment-plans/TreatmentPlanCompletedActPrint";
import { FiscalReceipt54FzModal } from "../components/finance/FiscalReceipt54FzModal";
import { PatientBillingModal } from "../components/finance/PatientBillingModal";
import { SanpinRegisters } from "../components/sanpin/SanpinRegisters";
import { PediatricMixedDentitionModal } from "../components/odontogram/PediatricMixedDentitionModal";
import { DoctorPayrollModal } from "../components/finance/payroll/DoctorPayrollModal";
import { FastCheckoutModal } from "../components/payments/checkout/FastCheckoutModal";
import { MedicalPrescriptionModal } from "../components/prescriptions/generator/MedicalPrescriptionModal";
import { CashShiftWidget } from "../components/finance/CashShiftWidget";
import { CephalometricAnalysisModal } from "../components/orthodontics/CephalometricAnalysisModal";
import { ImplantIsqProtocolModal } from "../components/implant/isq/ImplantIsqProtocolModal";
import { DentalLabOrderModal } from "../components/lab/DentalLabOrderModal";
import { ClinicalPhotoProtocolModal } from "../components/photography/ClinicalPhotoProtocolModal";
import { PatientRecallManagerModal } from "../components/recalls/PatientRecallManagerModal";
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
import { MedicalWasteJournalModal } from "../components/sanpin/waste/MedicalWasteJournalModal";
import { EmergencyRescueModal } from "../components/emergency/EmergencyRescueModal";
import { WarrantyPassportModal } from "../components/warranty/WarrantyPassportModal";
import { CmoEmrAuditModal } from "../components/emr/audit/CmoEmrAuditModal";
import { FnsNdflXmlModal } from "../components/documents/ndflXml/index";
import { TreatmentPlanPriceValidatorModal } from "../components/treatment-plans/validation/TreatmentPlanPriceValidatorModal";
import { SberPosTerminalModal } from "../components/payments/sberPos/SberPosTerminalModal";
import { PatientPortalModal } from "../components/portal/PatientPortalModal";
import { EgiszRemdXmlModal } from "../components/egisz/remdXml/EgiszRemdXmlModal";
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
	stageTitle: "Этап 1: Терапевтическое и эндодонтическое лечение зуба 1.6",
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
	imageUrl: TOOTH_16_DIAGNOSTIC_RADIOGRAPH_DATA_URI,
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
	const [isPayrollOpen, setIsPayrollOpen] = useState(false);
	const [isFastCheckoutOpen, setIsFastCheckoutOpen] = useState(false);
	const [isMedicalPrescriptionOpen, setIsMedicalPrescriptionOpen] = useState(false);
	const [isCephOpen, setIsCephOpen] = useState(false);
	const [isIsqOpen, setIsIsqOpen] = useState(false);
	const [isLabOrderOpen, setIsLabOrderOpen] = useState(false);
	const [isPhotoProtocolOpen, setIsPhotoProtocolOpen] = useState(false);
	const [isRecallOpen, setIsRecallOpen] = useState(false);
	const [isAutoclaveOpen, setIsAutoclaveOpen] = useState(false);
	const [isInsuranceOpen, setIsInsuranceOpen] = useState(false);
	const [isPlanComparatorOpen, setIsPlanComparatorOpen] = useState(false);
	const [is3TierPreviewOpen, setIs3TierPreviewOpen] = useState(false);
	const [isPhased4PreviewOpen, setIsPhased4PreviewOpen] = useState(false);
	const [isTransferOpen, setIsTransferOpen] = useState(false);
	const [isPortalOpen, setIsPortalOpen] = useState(false);
	const [isBeforeAfterOpen, setIsBeforeAfterOpen] = useState(false);
	const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
	const [isConsent323Open, setIsConsent323Open] = useState(false);
	const [isAnesthesiaProtocolOpen, setIsAnesthesiaProtocolOpen] = useState(false);
	const [isMedicalWasteOpen, setIsMedicalWasteOpen] = useState(false);
	const [isEmergencyRescueOpen, setIsEmergencyRescueOpen] = useState(false);
	const [isWarrantyPassportOpen, setIsWarrantyPassportOpen] = useState(false);
	const [isCmoEmrAuditOpen, setIsCmoEmrAuditOpen] = useState(false);
	const [isFnsNdflXmlOpen, setIsFnsNdflXmlOpen] = useState(false);
	const [isPlanPriceValidatorOpen, setIsPlanPriceValidatorOpen] = useState(false);
	const [isSberPosOpen, setIsSberPosOpen] = useState(false);
	const [isPatientCabinetOpen, setIsPatientCabinetOpen] = useState(false);
	const [isEgiszRemdOpen, setIsEgiszRemdOpen] = useState(false);
	const [isLabWorkOrderOpen, setIsLabWorkOrderOpen] = useState(false);
	const [isClinicalWriteoffOpen, setIsClinicalWriteoffOpen] = useState(false);
	const [isDmsManagerOpen, setIsDmsManagerOpen] = useState(false);
	const [isKraftBarcodeOpen, setIsKraftBarcodeOpen] = useState(false);
	const [isServicePricelistOpen, setIsServicePricelistOpen] = useState(false);
	const [isLoyaltyProgramOpen, setIsLoyaltyProgramOpen] = useState(false);
	const [isSickLeaveElnOpen, setIsSickLeaveElnOpen] = useState(false);
	const [isAutoclaveLog257Open, setIsAutoclaveLog257Open] = useState(false);
	const [isSterilizationStudioOpen, setIsSterilizationStudioOpen] = useState(false);
	const [isDoctorShiftRosterOpen, setIsDoctorShiftRosterOpen] = useState(false);
		
	const handleThemeChange = (themeId: string) => {
		setActiveTheme(themeId);
		document.documentElement.setAttribute("data-theme", themeId);
		const isDark =
			themeId === "dark" ||
			themeId === "night" ||
			themeId === "ocean" ||
			themeId === "emerald" ||
			themeId === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
	};

	useEffect(() => {
		const handleHashOrSearch = () => {
			const raw = window.location.hash || window.location.search;
			const queryPart = raw.includes("?") ? raw.split("?")[1] : "";
			if (queryPart) {
				const params = new URLSearchParams(queryPart);
				const requestedTheme = params.get("theme");
				if (requestedTheme && THEMES.some((t) => t.id === requestedTheme)) {
					handleThemeChange(requestedTheme);
				}
				const requestedModal = params.get("modal");
				if (requestedModal) {
					setIsBeforeAfterOpen(requestedModal === "before_after" || requestedModal === "photo_comparison" || requestedModal === "photography");
					if (requestedModal === "fiscal" || requestedModal === "54fz") setIsFiscalOpen(true);
					if (requestedModal === "billing_1c" || requestedModal === "1c" || requestedModal === "1c_export" || requestedModal === "commerceml") {
						setIsBilling1cExportOpen(true);
					}
					if (requestedModal === "patient_billing" || requestedModal === "billing" || requestedModal === "friendly_billing" || requestedModal === "warranty_act") {
						setIsPatientBillingOpen(true);
					}
					if (requestedModal === "cephalometry" || requestedModal === "ceph" || requestedModal === "trg") {
						setIsCephOpen(true);
					}
					if (requestedModal === "radiology_viewer" || requestedModal === "viewer" || requestedModal === "radiology" || requestedModal === "xray") {
						setIsViewerOpen(true);
					}
					if (requestedModal === "schedule_roster" || requestedModal === "roster") {
						setIsDoctorShiftRosterOpen(true);
					}
				}
			}
		};
		handleHashOrSearch();
		window.addEventListener("hashchange", handleHashOrSearch);
		return () => window.removeEventListener("hashchange", handleHashOrSearch);
	}, []);

	return (
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
						<button
							type="button"
							onClick={() => setIsViewerOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-viewer-modal-btn"
						>
							<Scan size={15} />
							<span>Открыть визиограф</span>
						</button>
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
						<button
							type="button"
							onClick={() => setIsCephOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-ceph-modal-btn"
						>
							<Compass size={15} />
							<span>Открыть анализ ТРГ</span>
						</button>
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
							<span>Открыть протокол анестезии</span>
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
						<button
							type="button"
							onClick={() => setIsLabWorkOrderOpen(true)}
							className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
							data-testid="open-lab-work-order-modal-btn"
						>
							<FlaskConical size={15} />
							<span>Открыть наряд-заказ лаборатории</span>
						</button>
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
				<FiscalReceipt54FzModal
					isOpen={isBilling1cExportOpen}
					onClose={() => setIsBilling1cExportOpen(false)}
					items={SAMPLE_TREATMENT_ITEMS}
					patientId="PAT-2026-0891"
					patientName="Смирнова Екатерина Васильевна"
					patientDepositRub={5000}
					initialTab="oneC"
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
					study={SAMPLE_STUDY}
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

			{isEgiszRemdOpen && (
				<EgiszRemdXmlModal
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

			

			
		</div>
	);
};

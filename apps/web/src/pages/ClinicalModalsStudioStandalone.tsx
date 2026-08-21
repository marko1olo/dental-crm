import type React from "react";
import { useState } from "react";
import {
	Activity,
	Calendar,
	CheckCircle2,
	Coins,
	FileText,
	Moon,
	Pill,
	Printer,
	Receipt,
	Scan,
	Sparkles,
	Sun,
	Syringe,
} from "lucide-react";
import type { Kopecks } from "@dental/shared";
import { AnesthesiaCalculator } from "../components/visit/AnesthesiaCalculator";
import { PrescriptionModal } from "../components/visit/PrescriptionModal";
import { InformedConsentModal } from "../components/documents/InformedConsentModal";
import {
	RadiologyModule,
	RadiologyReferralModal,
	RadiologyViewerModal,
	type RadiologyStudy,
} from "../components/radiology";
import { WhatsAppChatPanel } from "../components/chat/WhatsAppChatPanel";
import { PatientNotificationCenter } from "../components/notifications/PatientNotificationCenter";
import { TelephonyFloatingWidget } from "../components/telephony/TelephonyFloatingWidget";
import { TreatmentPlanCompletedActPrint } from "../components/treatment-plans/TreatmentPlanCompletedActPrint";
import { FiscalReceipt54FzModal } from "../components/finance/FiscalReceipt54FzModal";
import { CashShiftWidget } from "../components/finance/CashShiftWidget";
import { SanpinRegisters } from "../components/sanpin/SanpinRegisters";
import { PediatricMixedDentitionModal } from "../components/odontogram/PediatricMixedDentitionModal";
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
	imageUrl:
		"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000'><rect width='800' height='1000' fill='%23050811'/><polygon points='300,200 500,200 550,500 450,900 350,900 250,500' fill='none' stroke='%2306b6d4' stroke-width='3'/><text x='400' y='480' fill='%2338bdf8' font-size='24' font-family='sans-serif' font-weight='bold' text-anchor='middle'>ПРИЦЕЛЬНЫЙ ВИЗИОГРАФ</text><text x='400' y='520' fill='%2394a3b8' font-size='16' font-family='sans-serif' text-anchor='middle'>Зуб 16 · Эндодонтический контроль</text></svg>",
	doctorName: "Д-р Смирнов Алексей Петрович",
	doctorSpecialty: "Врач-стоматолог терапевт-эндодонтист",
	clinicName: "ООО «Денте Стоматология»",
	status: "completed",
	diagnosisIcd10: "K04.0",
	diagnosticNotes: "Контрольная радиовизиография зуба 16 после инструментальной обработки каналов. Рабочая длина соблюдена.",
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
			x: 50,
			y: 85,
			toothFdi: "16",
			label: "Апекс небного корня 16",
			type: "apex",
		},
	],
};

export const ClinicalModalsStudioStandalone: React.FC = () => {
	const [activeTheme, setActiveTheme] = useState<string>("dark");
	const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
	const [isRadiologyOpen, setIsRadiologyOpen] = useState(false);
	const [isActPrintOpen, setIsActPrintOpen] = useState(false);
	const [isFiscalOpen, setIsFiscalOpen] = useState(false);
	const [isPediatricOpen, setIsPediatricOpen] = useState(false);
	const [isConsentOpen, setIsConsentOpen] = useState(false);
	const [isViewerOpen, setIsViewerOpen] = useState(false);

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

	return (
		<div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
			{/* Top Bar */}
			<header className="sticky top-0 z-40 bg-[var(--paper)] border-b border-[var(--line)] px-4 sm:px-6 py-3.5 shadow-sm backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
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

					<AnesthesiaCalculator
						defaultToothNumber={16}
						defaultWeightKg={70}
						onApplyToDiary={(text) => {
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

				{/* 10. Interactive Communications & Notifications Suite */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div className="space-y-3">
						<h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)]">
							Чат WhatsApp и шаблоны визитов
						</h2>
						<WhatsAppChatPanel
							patientId="PAT-2026-0891"
							patientName="Смирнова Екатерина Васильевна"
							patientPhone="+7 (926) 555-12-34"
							onClose={() => {}}
						/>
					</div>

					<div className="space-y-3">
						<h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)]">
							Центр уведомлений клиники
						</h2>
						<PatientNotificationCenter />
					</div>
				</div>

				{/* 11. 54-FZ Cash Shift Management & Accounting Widget */}
				<div className="space-y-3">
					<h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)]">
						Управление кассовой сменой ККТ 54-ФЗ
					</h2>
					<CashShiftWidget />
				</div>

				{/* 12. SanPiN 3.3686-21 Sterilization Registers & Nurse Stamp */}
				<div className="space-y-3">
					<h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)]">
						Журналы СанПиН и стерилизационные режимы ЦСО
					</h2>
					<SanpinRegisters />
				</div>

				{/* 13. Softphone Floating Widget */}
				<TelephonyFloatingWidget />
			</main>

			{/* Render Modals */}
			<PediatricMixedDentitionModal
				isOpen={isPediatricOpen}
				onClose={() => setIsPediatricOpen(false)}
				initialAge={7.5}
			/>

			<FiscalReceipt54FzModal
				isOpen={isFiscalOpen}
				onClose={() => setIsFiscalOpen(false)}
				items={SAMPLE_TREATMENT_ITEMS}
				patientId="PAT-2026-0891"
				patientName="Смирнова Екатерина Васильевна"
				patientDepositRub={5000}
			/>

			<PrescriptionModal
				isOpen={isPrescriptionOpen}
				onClose={() => setIsPrescriptionOpen(false)}
				patient={SAMPLE_PATIENT}
				diary={SAMPLE_DIARY}
				doctorName="Д-р Смирнов Алексей Петрович"
				doctorSpecialty="Врач-стоматолог терапевт-эндодонтист"
				clinicName="ООО «Денте Стоматология»"
			/>

			<RadiologyReferralModal
				isOpen={isRadiologyOpen}
				onClose={() => setIsRadiologyOpen(false)}
				patient={SAMPLE_PATIENT}
				doctorName="Д-р Смирнов Алексей Петрович"
				doctorSpecialty="Врач-стоматолог терапевт-эндодонтист"
				clinicName="ООО «Денте Стоматология»"
			/>

			<TreatmentPlanCompletedActPrint
				isOpen={isActPrintOpen}
				onClose={() => setIsActPrintOpen(false)}
				actData={SAMPLE_COMPLETED_ACT}
			/>

			<InformedConsentModal
				isOpen={isConsentOpen}
				onClose={() => setIsConsentOpen(false)}
				patient={SAMPLE_PATIENT}
				diary={SAMPLE_DIARY}
				doctorName="Д-р Смирнов Алексей Петрович"
				doctorSpecialty="Врач-стоматолог терапевт-эндодонтист"
				clinicName="ООО «Денте Стоматология»"
			/>

			<RadiologyViewerModal
				isOpen={isViewerOpen}
				onClose={() => setIsViewerOpen(false)}
				study={SAMPLE_STUDY}
			/>
		</div>
	);
};

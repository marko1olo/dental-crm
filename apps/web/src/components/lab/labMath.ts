/**
 * labMath.ts — Types, Constants, VITA Shades, and Kopeck-Exact Financial Math
 * for Dental Lab Orders & Prosthetics Work Orders.
 */

// ─── TRANSPARENT RE-EXPORTS (PHASE 1 DECOMPOSITION CONTRACT) ───────────────────
export * from "./labShadesData";
export * from "./labBarcodeQr";
export * from "./labClinicalStages";
export * from "./labExpressPresets";

import type { LabOrderStageKey } from "./labClinicalStages";

// ─── TYPES & INTERFACES ────────────────────────────────────────────────────────

export type JawScope = "upper" | "lower" | "both";

export interface DentalLabOrderData {
	id?: string;
	orderNumber?: string;
	patientId: string;
	patientName?: string;
	doctorId?: string | null;
	doctorName?: string | null;
	secureToken?: string;
	toothFdi?: string | null;
	selectedTeeth?: number[];
	jawScope?: JawScope | null;
	constructionType?: string;
	material?: string | null;
	impressionType?: string | null;
	colorVita?: string | null;
	shadeSystem?: "classical" | "3d_master" | "bleach";
	shadeCervical?: string;
	shadeBody?: string;
	shadeIncisal?: string;
	shadeStump?: string | null;
	translucency?: string;
	mamelons?: boolean;
	opalescence?: boolean;
	calcifications?: boolean;
	occlusalScheme?: string;
	contactTightness?: string;
	surfaceTexture?: string;
	cementGapMicrons?: number;
	status?: string;
	scheduledVisitDate?: string | null;
	fittingDate?: string | null;
	fittingCollisionWarning?: string;
	currentStage?: LabOrderStageKey;
	stageHistory?: Array<{ stage: LabOrderStageKey; timestamp: string; note?: string }>;
	dueDate?: string | null;
	frameworkTrialDate?: string | null;
	ceramicTrialDate?: string | null;
	deliveryDate?: string | null;
	treatmentPlanId?: string | null;
	stageId?: string | null;
	stageNumber?: number | null;
	stageTitle?: string | null;
	includeImpressionBilling?: boolean;
	clinicalNotes?: string | null;
	labComments?: string | null;
	attachedImageUrl?: string | null;
	priceRub?: number | null;
	clinicSharePct?: number;
	doctorSharePct?: number;
	doctorDeductionRub?: number | null;
	paidFromCashOperationId?: string | null;
	isLockedInstalled?: boolean;
	isWarrantyRework?: boolean;
	reworkReason?: string;
	originalOrderId?: string;
	originalOrderNumber?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface DentalLabOrderModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialOrder?: DentalLabOrderData | null | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly initialToothFdi?: string | number | undefined;
	readonly initialTeeth?: readonly (number | string)[] | undefined;
	readonly patientChartNumber?: string | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly stageId?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly stageTitle?: string | undefined;
	readonly includeImpressionBilling?: boolean | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly stageTotalRub?: number | undefined;
	readonly stagePaidRub?: number | undefined;
	readonly chiefDoctorName?: string | undefined;
	readonly skipFinancialGate?: boolean | undefined;
	readonly treatmentPlanAgeDays?: number | undefined;
	readonly isPlanExpired?: boolean | undefined;
	readonly initialTab?: "main" | "shades" | "stages" | "print" | undefined;
	readonly scheduledVisitDate?: string | undefined;
	readonly fittingDate?: string | undefined;
	readonly onOrderSaved?: ((order: DentalLabOrderData) => void) | undefined;
	readonly onSaveOrder?: ((order: DentalLabOrderData) => void) | undefined;
	readonly onRescheduleAppointment?: ((orderId: string, newDate: string) => void) | undefined;
	readonly onPartialDelivery?: ((result: any) => void) | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicName?: string | undefined;
}

export interface LabTrackingDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly order: DentalLabOrderData | null;
	readonly patientDepositRub?: number | undefined;
	readonly stageTotalRub?: number | undefined;
	readonly stagePaidRub?: number | undefined;
	readonly chiefDoctorName?: string | undefined;
	readonly onStageUpdate?: ((orderId: string, newStage: LabOrderStageKey, note?: string) => Promise<void> | void) | undefined;
	readonly onFittingDateUpdate?: ((orderId: string, dates: { frameworkTrialDate?: string; ceramicTrialDate?: string; deliveryDate?: string }) => Promise<void> | void) | undefined;
}

// ─── CONSTANTS & DICTIONARIES ──────────────────────────────────────────────────

export const CONSTRUCTION_TYPES = [
	{
		id: "single_crown",
		name: "Одиночная коронка",
		desc: "Анатомическая коронка (полная или с редукцией)",
		icon: "crown",
		category: "Несъемное",
	},
	{
		id: "bridge",
		name: "Мостовидный протез",
		desc: "Конструкция с опорными коронками и промежутком",
		icon: "bridge",
		category: "Несъемное",
	},
	{
		id: "veneer",
		name: "Керамический винир",
		desc: "Ультратонкая эстетическая накладка E.max / Feldspar",
		icon: "veneer",
		category: "Эстетика",
	},
	{
		id: "inlay_onlay",
		name: "Вкладка / Накладка (Inlay/Onlay/Overlay)",
		desc: "Керамическая или композитная микропротезная реставрация",
		icon: "inlay",
		category: "Микропротезирование",
	},
	{
		id: "all_on_4_6",
		name: "Тотальный протез All-on-4 / All-on-6",
		desc: "Балочный или винтовой условно-съемный протез на имплантатах",
		icon: "implant",
		category: "Имплантология",
	},
	{
		id: "all_on_arch",
		name: "Тотальный протез на всю челюсть",
		desc: "Условно-съемный балочный/винтовой протез челюсти",
		icon: "arch",
		category: "Имплантология",
	},
	{
		id: "implant_abutment",
		name: "Индивидуальный абатмент + коронка",
		desc: "Титановый / циркониевый абатмент на винтовой фиксации",
		icon: "abutment",
		category: "Имплантология",
	},
	{
		id: "clasp_denture",
		name: "Бюгельный / Частично-съемный протез",
		desc: "Протез на замках (аттачменах) или кламмерах",
		icon: "denture",
		category: "Съемное",
	},
	{
		id: "aligner_nightguard",
		name: "Элайнер / Окклюзионная сплинт-каппа",
		desc: "Ортодонтический или миорелаксирующий прозрачный сплинт",
		icon: "aligner",
		category: "Каппы",
	},
	{
		id: "aligners_nightguard",
		name: "Элайнеры / Сплинт-шина",
		desc: "Окклюзионная защитная капа / ортодонтические элайнеры",
		icon: "guard",
		category: "Каппы",
	},
	{
		id: "endocrown",
		name: "Эндокоронка",
		desc: "Монолитная коронка с фиксацией в пульповой камере",
		icon: "endocrown",
		category: "Микропротезирование",
	},
	{
		id: "core_buildup_post",
		name: "Культевая вкладка (Штифтовая)",
		desc: "Разборная или неразборная культевая штифтовая вкладка (КХС / оксид циркония)",
		icon: "post",
		category: "Несъемное",
	},
	{
		id: "nightguard_bruxism",
		name: "Ночная каппа от бруксизма",
		desc: "Термоформованная каппа против патологической стираемости (на челюсть целиком)",
		icon: "guard",
		category: "Каппы",
	},
	{
		id: "occlusal_splint",
		name: "Разгрузочный окклюзионный сплинт",
		desc: "Миорелаксационный сплинт при дисфункции ВНЧС и мышечном гипертонусе (на челюсть)",
		icon: "aligner",
		category: "Каппы",
	},
	{
		id: "sports_mouthguard",
		name: "Спортивная защитная каппа",
		desc: "Двухслойная защитная индивидуальная каппа для контактных видов спорта (на челюсть)",
		icon: "guard",
		category: "Каппы",
	},
	{
		id: "bleaching_tray",
		name: "Каппы для домашнего отбеливания",
		desc: "Индивидуальные каппы с резервуарами для отбеливающего геля (на челюсть)",
		icon: "guard",
		category: "Каппы",
	},
	{
		id: "full_denture",
		name: "Полный съемный пластиночный протез (ПСПП)",
		desc: "Акриловый пластиночный протез при полной адентии челюсти (на челюсть целиком)",
		icon: "denture",
		category: "Съемное",
	},
	{
		id: "custom_impression_tray",
		name: "Индивидуальная ложка / прикусной шаблон",
		desc: "Акриловая индивидуальная ложка с восковыми валиками для прецизионного оттиска (на челюсть)",
		icon: "denture",
		category: "Съемное",
	},
] as const;

export function isJawWideConstruction(constructionId?: string | null): boolean {
	if (!constructionId) return false;
	return (
		constructionId === "aligner_nightguard" ||
		constructionId === "aligners_nightguard" ||
		constructionId === "all_on_4_6" ||
		constructionId === "all_on_arch" ||
		constructionId === "clasp_denture" ||
		constructionId === "nightguard_bruxism" ||
		constructionId === "occlusal_splint" ||
		constructionId === "sports_mouthguard" ||
		constructionId === "bleaching_tray" ||
		constructionId === "full_denture" ||
		constructionId === "custom_impression_tray"
	);
}

export function formatJawScopeLabel(
	jawScope?: JawScope | string | null,
	short = false,
): string {
	if (!jawScope) return "";
	if (jawScope === "upper") return short ? "В/Ч целиком" : "Верхняя челюсть (В/Ч)";
	if (jawScope === "lower") return short ? "Н/Ч целиком" : "Нижняя челюсть (Н/Ч)";
	if (jawScope === "both") return short ? "Обе челюсти" : "Обе челюсти (В/Ч + Н/Ч)";
	return String(jawScope);
}

export function formatLabOrderTeethOrJaw(order?: {
	toothFdi?: string | null;
	selectedTeeth?: number[];
	jawScope?: JawScope | string | null;
	constructionType?: string;
} | null): string {
	if (!order) return "—";

	// 1. Explicit jawScope
	if (order.jawScope === "upper") return "В/Ч целиком";
	if (order.jawScope === "lower") return "Н/Ч целиком";
	if (order.jawScope === "both") return "Обе челюсти";

	// 2. Parse from toothFdi string if contains jaw indicators
	const toothStr = (order.toothFdi || "").trim();
	if (toothStr.includes("Обе челюсти") || toothStr.includes("В/Ч + Н/Ч")) return "Обе челюсти";
	if (toothStr.includes("В/Ч") || toothStr.includes("Верхняя челюсть")) return "В/Ч целиком";
	if (toothStr.includes("Н/Ч") || toothStr.includes("Нижняя челюсть")) return "Н/Ч целиком";

	// 3. Fallback for jaw-wide construction without selected teeth
	if (isJawWideConstruction(order.constructionType) && (!order.selectedTeeth || order.selectedTeeth.length === 0)) {
		return "Челюсть целиком";
	}

	// 4. Selected teeth FDI
	if (order.selectedTeeth && order.selectedTeeth.length > 0) {
		return order.selectedTeeth.length === 1
			? `Зуб ${order.selectedTeeth[0]}`
			: `Зубы: ${order.selectedTeeth.join(", ")}`;
	}

	return toothStr || "Общий наряд";
}

export const MATERIALS = [
	{
		id: "zirconia_multilayer",
		name: "Диоксид циркония ZrO₂ Katana / Prettau (Multi-layer)",
		desc: "Градиентная транслюцентность ZrO₂, прочность 1100 МПа",
		category: "Цирконий",
		tag: "Премиум",
		costTier: "Премиум",
		baseCostKopecks: 650000,
		unitCostRub: 6500,
	},
	{
		id: "emax_lithium_disilicate",
		name: "Прессованная керамика IPS e.max Press / CAD (Дисиликат лития)",
		desc: "Максимальная флюоресценция и адгезивная фиксация (500 МПа)",
		category: "Стеклокерамика",
		tag: "Эстетика",
		costTier: "Эстетик",
		baseCostKopecks: 750000,
		unitCostRub: 7500,
	},
	{
		id: "pfm_cocr",
		name: "Металлокерамика CoCr (фрезерованная / литая)",
		desc: "Классическая металлокерамическая конструкция CoCr",
		category: "Металл",
		tag: "Стандарт",
		costTier: "Стандарт",
		baseCostKopecks: 400000,
		unitCostRub: 4000,
	},
	{
		id: "pmma_temporary",
		name: "Временная пластмасса PMMA CAD/CAM",
		desc: "Высокоточный фрезерованный полимер для провизорного ношения",
		category: "Временные",
		tag: "Временная",
		costTier: "Эконом",
		baseCostKopecks: 150000,
		unitCostRub: 1500,
	},
	{
		id: "titanium_custom_abutment",
		name: "Индивидуальный абатмент Ti-Base Grade 5 (Ti-6Al-4V ELI)",
		desc: "Биосовместимый титановый сплав с шахтой винта для имплантатов",
		category: "Титан",
		tag: "Импланты",
		costTier: "Премиум",
		baseCostKopecks: 550000,
		unitCostRub: 5500,
	},
	{
		id: "peek_biohpp",
		name: "Биополимер PEEK / BioHPP",
		desc: "Безметалловый амортизирующий каркас с модулем кости",
		category: "Полимер",
		tag: "Инновация",
		costTier: "Премиум",
		baseCostKopecks: 800000,
		unitCostRub: 8000,
	},
	{
		id: "biocompatible_3d_resin",
		name: "Биосовместимый 3D-фотополимер",
		desc: "Высокоточная печать капп, сплинтов и шаблонов",
		category: "3D-печать",
		tag: "3D-печать",
		costTier: "Стандарт",
		baseCostKopecks: 300000,
		unitCostRub: 3000,
	},
	{
		id: "cobalt_chrome_cocr",
		name: "Кобальт-хромовый сплав CoCr (КХС литой / фрезерованный)",
		desc: "Высокопрочный литейный сплав CoCr для штифтовых культевых вкладок и каркасов",
		category: "Металл",
		tag: "Стандарт",
		costTier: "Стандарт",
		baseCostKopecks: 250000,
		unitCostRub: 2500,
	},
	{
		id: "acry_free_nylon",
		name: "Безакриловый термопласт Acry-Free / Quattro Ti (нейлон)",
		desc: "Гипоаллергенный полугибкий термопласт для съемных протезов без свободного мономера",
		category: "Съемное",
		tag: "Гипоаллергенный",
		costTier: "Премиум",
		baseCostKopecks: 1600000,
		unitCostRub: 16000,
	},
	{
		id: "buegel_cocr_clasp",
		name: "Бюгельный протез CoCr (литой кламмерный / замковый)",
		desc: "Высокоточный дуговой каркас из кобальт-хрома с литыми кламмерами или замками (Bredent/MK1)",
		category: "Съемное",
		tag: "Бюгель",
		costTier: "Стандарт",
		baseCostKopecks: 1400000,
		unitCostRub: 14000,
	},
] as const;

export const LAB_MATERIALS = MATERIALS;

// ─── KOPECK-EXACT FINANCIAL CALCULATIONS ───────────────────────────────────────

export interface LabFinancialSplitResult {
	clinicAmountRub: number;
	doctorAmountRub: number;
	clinicKopecks: number;
	doctorKopecks: number;
	totalKopecks: number;
	isBalanced: boolean;
}

/**
 * Calculates kopeck-exact split between clinic and doctor with strict penny-drift protection.
 */
export function calculateLabFinancialSplit(
	totalPriceRub: number,
	doctorSharePct: number,
): LabFinancialSplitResult {
	const safeTotalRub = Number.isFinite(totalPriceRub) && totalPriceRub >= 0 ? totalPriceRub : 0;
	const safeDoctorPct = Math.min(100, Math.max(0, Number.isFinite(doctorSharePct) ? doctorSharePct : 50));

	const totalKopecks = Math.round(safeTotalRub * 100);
	const doctorKopecks = Math.round((totalKopecks * safeDoctorPct) / 100);
	const clinicKopecks = totalKopecks - doctorKopecks;

	const clinicAmountRub = Number((clinicKopecks / 100).toFixed(2));
	const doctorAmountRub = Number((doctorKopecks / 100).toFixed(2));

	return {
		clinicAmountRub,
		doctorAmountRub,
		clinicKopecks,
		doctorKopecks,
		totalKopecks,
		isBalanced: clinicKopecks + doctorKopecks === totalKopecks,
	};
}

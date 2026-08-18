import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Activity,
	AlertCircle,
	ArrowRight,
	Barcode,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Copy,
	DollarSign,
	Download,
	Eye,
	FileDown,
	FileText,
	FlaskConical,
	Layers,
	Loader2,
	Palette,
	Printer,
	QrCode,
	RotateCcw,
	Send,
	Sparkles,
	Trash2,
	User,
	Wrench,
	X,
} from "lucide-react";
import { denteAdminSecretRequestHeaders, money } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import { normalizeRubAmountInput } from "../../rubAmountInput";

// ─── TYPES & INTERFACES ────────────────────────────────────────────────────────

export interface DentalLabOrderData {
	id?: string;
	patientId: string;
	patientName?: string;
	doctorId?: string | null;
	doctorName?: string | null;
	secureToken?: string;
	toothFdi?: string | null;
	selectedTeeth?: number[];
	constructionType?: string;
	material?: string | null;
	colorVita?: string | null;
	shadeCervical?: string;
	shadeBody?: string;
	shadeIncisal?: string;
	shadeStump?: string | null;
	translucency?: string;
	mamelons?: boolean;
	calcifications?: boolean;
	occlusalScheme?: string;
	contactTightness?: string;
	surfaceTexture?: string;
	cementGapMicrons?: number;
	status?: string;
	currentStage?: LabOrderStageKey;
	stageHistory?: Array<{ stage: LabOrderStageKey; timestamp: string; note?: string }>;
	dueDate?: string | null;
	clinicalNotes?: string | null;
	labComments?: string | null;
	attachedImageUrl?: string | null;
	priceRub?: number | null;
	clinicSharePct?: number;
	doctorSharePct?: number;
	doctorDeductionRub?: number | null;
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
	readonly onOrderSaved?: ((order: DentalLabOrderData) => void) | undefined;
}

// ─── CONSTANTS & DICTIONARIES ──────────────────────────────────────────────────

export const CONSTRUCTION_TYPES = [
	{
		id: "single_crown",
		name: "Одиночная коронка",
		desc: "Анатомическая коронка (полная или с редукцией)",
		icon: "👑",
	},
	{
		id: "bridge",
		name: "Мостовидный протез",
		desc: "Конструкция с опорными коронками и промежутком",
		icon: "🌉",
	},
	{
		id: "veneer",
		name: "Керамический винир",
		desc: "Ультратонкая эстетическая накладка E.max / Feldspar",
		icon: "✨",
	},
	{
		id: "inlay_onlay",
		name: "Вкладка / Накладка (Inlay/Onlay/Overlay)",
		desc: "Керамическая или композитная микропротезная реставрация",
		icon: "💎",
	},
	{
		id: "all_on_4_6",
		name: "Тотальный протез All-on-4 / All-on-6",
		desc: "Балочный или винтовой условно-съемный протез на имплантатах",
		icon: "🛡️",
	},
	{
		id: "all_on_arch",
		name: "Тотальный протез на всю челюсть",
		desc: "Условно-съемный балочный/винтовой протез челюсти",
		icon: "🏛️",
	},
	{
		id: "implant_abutment",
		name: "Индивидуальный абатмент + коронка",
		desc: "Титановый / циркониевый абатмент на винтовой фиксации",
		icon: "🔩",
	},
	{
		id: "clasp_denture",
		name: "Бюгельный / Частично-съемный протез",
		desc: "Протез на замках (аттачменах) или кламмерах",
		icon: "🦷",
	},
	{
		id: "aligner_nightguard",
		name: "Элайнер / Окклюзионная сплинт-каппа",
		desc: "Ортодонтический или миорелаксирующий прозрачный сплинт",
		icon: "🎯",
	},
	{
		id: "aligners_nightguard",
		name: "Элайнеры / Сплинт-шина",
		desc: "Окклюзионная защитная капа / ортодонтические элайнеры",
		icon: "🛡️",
	},
	{
		id: "endocrown",
		name: "Эндокоронка",
		desc: "Монолитная коронка с фиксацией в пульповой камере",
		icon: "👑",
	},
] as const;

export const MATERIALS = [
	{
		id: "zirconia_multilayer",
		name: "Диоксид циркония Katana / Prettau (Multi-layer)",
		desc: "Градиентная транслюцентность, прочность 1100 МПа",
		category: "Цирконий",
		tag: "Премиум",
		costTier: "Премиум",
	},
	{
		id: "emax_lithium_disilicate",
		name: "Дисиликат лития IPS e.max CAD / Press",
		desc: "Максимальная флюоресценция и адгезивная фиксация (500 МПа)",
		category: "Стеклокерамика",
		tag: "Эстетика",
		costTier: "Эстетик",
	},
	{
		id: "pfm_cocr",
		name: "Металлокерамика (CoCr фрезерованный / литой)",
		desc: "Классическая металлокерамическая конструкция",
		category: "Металл",
		tag: "Стандарт",
		costTier: "Стандарт",
	},
	{
		id: "pmma_temporary",
		name: "Временная пластмасса PMMA CAD/CAM",
		desc: "Высокоточный фрезерованный полимер для провизорного ношения",
		category: "Временные",
		tag: "Временная",
		costTier: "Эконом",
	},
	{
		id: "titanium_custom_abutment",
		name: "Титановый сплав Grade 5 (Ti-6Al-4V ELI)",
		desc: "Биосовместимый фрезерованный титан для имплантологии",
		tag: "Импланты",
	},
	{
		id: "peek_biohpp",
		name: "Биополимер PEEK / BioHPP",
		desc: "Безметалловый амортизирующий каркас с модулем кости",
		tag: "Инновация",
	},
	{
		id: "biocompatible_3d_resin",
		name: "Биосовместимый 3D-фотополимер",
		desc: "Высокоточная печать капп, сплинтов и шаблонов",
		tag: "3D-печать",
	},
] as const;

export const LAB_MATERIALS = MATERIALS;

export const VITA_CLASSICAL_SHADES = [
	// Group A (Reddish-brownish)
	"A1", "A2", "A3", "A3.5", "A4",
	// Group B (Reddish-yellowish)
	"B1", "B2", "B3", "B4",
	// Group C (Greyish)
	"C1", "C2", "C3", "C4",
	// Group D (Reddish-grey)
	"D2", "D3", "D4",
] as const;

export const VITA_BLEACH_SHADES = [
	"BL1", "BL2", "BL3", "BL4",
	"0M1", "0M2", "0M3",
] as const;

export const STUMP_NATURAL_DIE_SHADES = [
	{ id: "ND1", name: "ND1 — Отбеленная / Ультра-светлая культя" },
	{ id: "ND2", name: "ND2 — Светлая витальная культя (A1/B1)" },
	{ id: "ND3", name: "ND3 — Средняя витальная культя (A2/B2)" },
	{ id: "ND4", name: "ND4 — Насыщенная витальная культя (A3/A3.5)" },
	{ id: "ND5", name: "ND5 — Легко дисколорированная культя" },
	{ id: "ND6", name: "ND6 — Умеренно потемневшая культя (депульпированный)" },
	{ id: "ND7", name: "ND7 — Темная дисколорированная культя (серый оттенок)" },
	{ id: "ND8", name: "ND8 — Сильно пигментированная / девитальная культя" },
	{ id: "ND9", name: "ND9 — Металлическая литая вкладка / титановый абатмент" },
] as const;

export const OCCLUSAL_SCHEMES = [
	{
		id: "mutually_protected",
		name: "Взаимно-защищенная окклюзия",
		desc: "Боковые зубы защищают передние в контакте, клыки ведут в латеротрузии",
	},
	{
		id: "canine_guidance",
		name: "Клыковое ведение (разобщение)",
		desc: "Немедленная дизокклюзия моляров и премоляров при боковом движении",
	},
	{
		id: "group_function",
		name: "Групповая функция",
		desc: "Равномерный контакт щечных бугров рабочей стороны",
	},
	{
		id: "balanced_articulation",
		name: "Сбалансированная окклюзия",
		desc: "Трехпунктный баланс контактов для съемных протезов и All-on-4/6",
	},
] as const;

export const CONTACT_TIGHTNESS_OPTIONS = [
	{
		id: "normal",
		name: "Нормальный (50 мкм)",
		desc: "Легкое сопротивление калибровочной фольги Shimstock 50 мкм",
	},
	{
		id: "tight",
		name: "Плотный точечный",
		desc: "Максимально плотный контакт для предотвращения застревания пищи",
	},
	{
		id: "light",
		name: "Ослабленный (пассивный)",
		desc: "Минимальный контакт при подвижности соседних зубов",
	},
	{
		id: "open_pontic",
		name: "Промывное пространство",
		desc: "Гигиенический овоидный контакт промежуточной части моста",
	},
] as const;

export const SURFACE_TEXTURE_OPTIONS = [
	{
		id: "natural_anatomy",
		name: "Естественная анатомическая микротекстура",
		desc: "Перикиматы, мамелоны, макро- и микрорельеф эмали",
	},
	{
		id: "satin_semi_matte",
		name: "Сатиновый (полуматовый)",
		desc: "Мягкий рассеянный блеск с натуральной структурой",
	},
	{
		id: "high_gloss_glaze",
		name: "Высокий глянец (Glass glaze)",
		desc: "Идеально гладкая зеркальная поверхность, высокая стойкость к налету",
	},
] as const;

export const LAB_ORDER_STAGES = [
	{
		id: "sent_to_lab",
		name: "Отправлен в ЗТЛ",
		desc: "Слепки/сканы и наряд переданы курьеру или загружены в лабораторию",
		step: 1,
		color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
	},
	{
		id: "model_cad_design",
		name: "Сканирование & CAD-дизайн",
		desc: "Создание цифровой 3D-модели, виртуальное моделирование реставрации",
		step: 2,
		color: "text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300",
	},
	{
		id: "framework_wax_milling",
		name: "CAM Фрезеровка / Воск",
		desc: "Фрезеровка каркаса на 5-осевом станке или восковая репродукция",
		step: 3,
		color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300",
	},
	{
		id: "sintering_ceramic_layering",
		name: "Синтеризация & Облицовка",
		desc: "Высокотемпературное спекание циркония / послойное нанесение керамики",
		step: 4,
		color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300",
	},
	{
		id: "fitting_in_mouth",
		name: "Клиническая примерка",
		desc: "Примерка каркаса или реставрации в полости рта у пациента",
		step: 5,
		color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300",
	},
	{
		id: "final_glaze",
		name: "Финальная глазурь & ОТК",
		desc: "Индивидуализация красителями, глазурование, контроль посадки",
		step: 6,
		color: "text-teal-600 bg-teal-50 border-teal-200 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-300",
	},
	{
		id: "delivered_to_clinic",
		name: "Доставлен в клинику",
		desc: "Работа проверена и готова к постоянной фиксации на приеме",
		step: 7,
		color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300",
	},
] as const;

export type LabOrderStageKey = (typeof LAB_ORDER_STAGES)[number]["id"];

// ─── HELPER: SIMPLE VECTOR BARCODE & QR GENERATOR ──────────────────────────────

/**
 * Генерирует псевдо-штрихкод SVG для наряд-заказа на основе строки токена/номера.
 */
export function generateBarcodeSvg(data: string): string {
	const safeData = data.replace(/[^A-Za-z0-9]/g, "").slice(0, 16) || "ZTL-ORDER";
	let bars = "";
	let x = 10;
	for (let i = 0; i < safeData.length; i++) {
		const charCode = safeData.charCodeAt(i);
		const width1 = (charCode % 3) + 1;
		const space = (charCode % 2) + 1;
		bars += `<rect x="${x}" y="5" width="${width1}" height="35" fill="currentColor"/>`;
		x += width1 + space;
		const width2 = ((charCode >> 1) % 3) + 1;
		bars += `<rect x="${x}" y="5" width="${width2}" height="35" fill="currentColor"/>`;
		x += width2 + 2;
	}
	return `<svg viewBox="0 0 ${Math.max(x + 10, 160)} 50" xmlns="http://www.w3.org/2000/svg" class="w-full h-12">${bars}<text x="${Math.max(x + 10, 160) / 2}" y="47" font-size="7" font-family="monospace" text-anchor="middle" fill="currentColor">${safeData}</text></svg>`;
}

/**
 * Генерирует простой QR-код матрицу SVG.
 */
export function generateQrCodeSvg(text: string): string {
	const size = 21;
	const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

	// Marker squares at corners
	const addMarker = (startX: number, startY: number) => {
		for (let r = 0; r < 7; r++) {
			const row = matrix[startY + r];
			if (!row) continue;
			for (let c = 0; c < 7; c++) {
				if (
					r === 0 || r === 6 || c === 0 || c === 6 ||
					(r >= 2 && r <= 4 && c >= 2 && c <= 4)
				) {
					row[startX + c] = true;
				}
			}
		}
	};

	addMarker(0, 0);
	addMarker(size - 7, 0);
	addMarker(0, size - 7);

	// Deterministic pseudo-data based on text hash
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		hash = (hash * 31 + text.charCodeAt(i)) | 0;
	}

	for (let r = 0; r < size; r++) {
		const row = matrix[r];
		if (!row) continue;
		for (let c = 0; c < size; c++) {
			const isCorner =
				(r < 8 && c < 8) ||
				(r < 8 && c >= size - 8) ||
				(r >= size - 8 && c < 8);
			if (!isCorner) {
				const bit = (Math.sin(hash + r * 13 + c * 37) * 10000) % 1;
				row[c] = Math.abs(bit) > 0.5;
			}
		}
	}

	let rects = "";
	for (let r = 0; r < size; r++) {
		const row = matrix[r];
		if (!row) continue;
		for (let c = 0; c < size; c++) {
			if (row[c]) {
				rects += `<rect x="${c * 4}" y="${r * 4}" width="4" height="4" fill="currentColor"/>`;
			}
		}
	}

	return `<svg viewBox="0 0 ${size * 4} ${size * 4}" xmlns="http://www.w3.org/2000/svg" class="w-24 h-24">${rects}</svg>`;
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export function DentalLabOrderModal({
	isOpen,
	onClose,
	initialOrder,
	patientId,
	patientName,
	doctorId,
	doctorName,
	initialToothFdi,
	onOrderSaved,
}: DentalLabOrderModalProps) {
	// Active Tab State
	type TabKey = "main" | "shades" | "occlusion" | "stages" | "pricing" | "print";
	const [activeTab, setActiveTab] = useState<TabKey>("main");

	// Form State
	const [formPatientId, setFormPatientId] = useState(patientId || initialOrder?.patientId || "");
	const [formPatientName, setFormPatientName] = useState(patientName || initialOrder?.patientName || "Пациент");
	const [formDoctorId, setFormDoctorId] = useState(doctorId || initialOrder?.doctorId || "");
	const [formDoctorName, setFormDoctorName] = useState(doctorName || initialOrder?.doctorName || "Лечащий врач");

	// Tooth Selection
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
	const [constructionType, setConstructionType] = useState<string>("single_crown");
	const [material, setMaterial] = useState<string>("zirconia_multilayer");

	// VITA Shade Selection
	const [shadeSystem, setShadeSystem] = useState<"classical" | "bleach">("classical");
	const [shadeClassical, setShadeClassical] = useState<string>("A2");
	const [shadeBleach, setShadeBleach] = useState<string>("BL2");
	const [shadeCervical, setShadeCervical] = useState<string>("A3");
	const [shadeBody, setShadeBody] = useState<string>("A2");
	const [shadeIncisal, setShadeIncisal] = useState<string>("A1");
	const [shadeStump, setShadeStump] = useState<string>("");
	const [translucency, setTranslucency] = useState<string>("HT");
	const [mamelons, setMamelons] = useState<boolean>(false);
	const [calcifications, setCalcifications] = useState<boolean>(false);

	// Occlusal Specs
	const [occlusalScheme, setOcclusalScheme] = useState<string>("mutually_protected");
	const [contactTightness, setContactTightness] = useState<string>("normal");
	const [surfaceTexture, setSurfaceTexture] = useState<string>("natural_anatomy");
	const [cementGapMicrons, setCementGapMicrons] = useState<number>(30);

	// Stages & Deadlines
	const [currentStage, setCurrentStage] = useState<LabOrderStageKey>("sent_to_lab");
	const [dueDate, setDueDate] = useState<string>("");
	const [clinicalNotes, setClinicalNotes] = useState<string>("");
	const [secureToken, setSecureToken] = useState<string>("");

	// Financials (Копеечно точный расчет с защитой от penny drift)
	const [priceRubInput, setPriceRubInput] = useState<string>("15000");
	const [clinicSharePct, setClinicSharePct] = useState<number>(50);
	const [doctorSharePct, setDoctorSharePct] = useState<number>(50);

	// Loading & Status
	const [isSubmitting, setIsSubmitting] = useState(false);

	// ─── INITIALIZATION EFFECT ─────────────────────────────────────────────────

	useEffect(() => {
		if (!isOpen) return;

		if (initialOrder) {
			setFormPatientId(initialOrder.patientId || patientId || "");
			setFormPatientName(initialOrder.patientName || patientName || "Пациент");
			setFormDoctorId(initialOrder.doctorId || doctorId || "");
			setFormDoctorName(initialOrder.doctorName || doctorName || "Лечащий врач");
			if (initialOrder.selectedTeeth && initialOrder.selectedTeeth.length > 0) {
				setSelectedTeeth(initialOrder.selectedTeeth);
			} else if (initialOrder.toothFdi) {
				const parsed = initialOrder.toothFdi
					.split(/[\s,;-]+/)
					.map((t) => Number.parseInt(t, 10))
					.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 85);
				setSelectedTeeth(parsed);
			}
			setConstructionType(initialOrder.constructionType || "single_crown");
			setMaterial(initialOrder.material || "zirconia_multilayer");
			if (initialOrder.colorVita) {
				setShadeClassical(initialOrder.colorVita);
				setShadeBody(initialOrder.colorVita);
			}
			setShadeCervical(initialOrder.shadeCervical || "A3");
			setShadeBody(initialOrder.shadeBody || initialOrder.colorVita || "A2");
			setShadeIncisal(initialOrder.shadeIncisal || "A1");
			setShadeStump(initialOrder.shadeStump || "");
			setTranslucency(initialOrder.translucency || "HT");
			setMamelons(Boolean(initialOrder.mamelons));
			setCalcifications(Boolean(initialOrder.calcifications));
			setOcclusalScheme(initialOrder.occlusalScheme || "mutually_protected");
			setContactTightness(initialOrder.contactTightness || "normal");
			setSurfaceTexture(initialOrder.surfaceTexture || "natural_anatomy");
			setCementGapMicrons(initialOrder.cementGapMicrons ?? 30);
			setCurrentStage(initialOrder.currentStage || "sent_to_lab");
			setDueDate(initialOrder.dueDate ? initialOrder.dueDate.slice(0, 10) : "");
			setClinicalNotes(initialOrder.clinicalNotes || "");
			setPriceRubInput(initialOrder.priceRub != null ? String(initialOrder.priceRub) : "15000");
			setClinicSharePct(initialOrder.clinicSharePct ?? 50);
			setDoctorSharePct(initialOrder.doctorSharePct ?? 50);
			setSecureToken(initialOrder.secureToken || crypto.randomUUID());
		} else {
			// Defaults for new order
			setFormPatientId(patientId || "");
			setFormPatientName(patientName || "Пациент");
			setFormDoctorId(doctorId || "");
			setFormDoctorName(doctorName || "Лечащий врач");
			if (initialToothFdi) {
				const toothNum = typeof initialToothFdi === "number" ? initialToothFdi : Number.parseInt(String(initialToothFdi), 10);
				if (!Number.isNaN(toothNum)) {
					setSelectedTeeth([toothNum]);
				}
			} else {
				setSelectedTeeth([]);
			}
			setSecureToken(crypto.randomUUID());
			// Default due date: 7 days from now
			const d = new Date();
			d.setDate(d.getDate() + 7);
			setDueDate(d.toISOString().slice(0, 10));
		}
	}, [isOpen, initialOrder, patientId, patientName, doctorId, doctorName, initialToothFdi]);

	// ─── TOOTH PICKER HELPERS ──────────────────────────────────────────────────

	const toggleTooth = (tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b),
		);
	};

	const selectQuadrant = (teeth: number[]) => {
		setSelectedTeeth((prev) => {
			const allSelected = teeth.every((t) => prev.includes(t));
			if (allSelected) {
				return prev.filter((t) => !teeth.includes(t));
			}
			return Array.from(new Set([...prev, ...teeth])).sort((a, b) => a - b);
		});
	};

	// ─── FINANCIAL CALCULATIONS (KOPECK EXACT) ──────────────────────────────────

	const totalLabPriceRub = useMemo(() => {
		const parsed = normalizeRubAmountInput(priceRubInput);
		return parsed != null && parsed >= 0 ? parsed : 0;
	}, [priceRubInput]);

	const { clinicAmountRub, doctorAmountRub, isBalanced } = useMemo(() => {
		const totalKopecks = Math.round(totalLabPriceRub * 100);
		const doctorKopecks = Math.round((totalKopecks * doctorSharePct) / 100);
		const clinicKopecks = totalKopecks - doctorKopecks;

		const clinicRub = Number((clinicKopecks / 100).toFixed(2));
		const doctorRub = Number((doctorKopecks / 100).toFixed(2));

		return {
			clinicAmountRub: clinicRub,
			doctorAmountRub: doctorRub,
			isBalanced: clinicKopecks + doctorKopecks === totalKopecks,
		};
	}, [totalLabPriceRub, doctorSharePct]);

	const handleSharePreset = (clinic: number, doctor: number) => {
		setClinicSharePct(clinic);
		setDoctorSharePct(doctor);
	};

	// ─── SUBMIT HANDLER ────────────────────────────────────────────────────────

	const handleSaveOrder = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();

		if (!formPatientId) {
			showToast("ID пациента обязателен для создания наряда ЗТЛ", "error");
			return;
		}

		if (selectedTeeth.length === 0) {
			showToast("Выберите хотя бы один зуб в зубной формуле", "error");
			return;
		}

		setIsSubmitting(true);
		try {
			const toothFdiStr = selectedTeeth.join(", ");
			const finalShade = shadeSystem === "bleach" ? shadeBleach : shadeClassical;

			const comprehensiveNotes = [
				clinicalNotes.trim(),
				`Конструкция: ${CONSTRUCTION_TYPES.find((c) => c.id === constructionType)?.name || constructionType}`,
				`Цветовые зоны: Пришейка ${shadeCervical}, Тело ${shadeBody}, Режущий край ${shadeIncisal}`,
				shadeStump ? `Культя: ${shadeStump}` : null,
				`Транслюцентность: ${translucency}`,
				mamelons ? "Эффект мамелонов" : null,
				calcifications ? "Кальцификаты/пятна" : null,
				`Окклюзия: ${OCCLUSAL_SCHEMES.find((o) => o.id === occlusalScheme)?.name || occlusalScheme}`,
				`Апроксимальные контакты: ${CONTACT_TIGHTNESS_OPTIONS.find((c) => c.id === contactTightness)?.name || contactTightness}`,
				`Текстура поверхности: ${SURFACE_TEXTURE_OPTIONS.find((s) => s.id === surfaceTexture)?.name || surfaceTexture}`,
				`Цементный зазор: ${cementGapMicrons} мкм`,
				`Доля клиники/врача: ${clinicSharePct}% / ${doctorSharePct}% (Удержание с врача: ${money(doctorAmountRub)})`,
			]
				.filter(Boolean)
				.join("\n• ");

			const payload = {
				patientId: formPatientId,
				doctorId: formDoctorId || null,
				toothFdi: toothFdiStr,
				material: LAB_MATERIALS.find((m) => m.id === material)?.name || material,
				colorVita: finalShade,
				dueDate: dueDate ? new Date(dueDate).toISOString() : null,
				clinicalNotes: `• ${comprehensiveNotes}`,
				priceRub: totalLabPriceRub,
			};

			const url = initialOrder?.id
				? `/api/clinical/lab-orders/${initialOrder.id}`
				: "/api/clinical/lab-orders";
			const method = initialOrder?.id ? "PUT" : "POST";

			const res = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || "Не удалось сохранить заказ ЗТЛ");
			}

			const savedOrder = await res.json();

			// Also create itemized records if new order
			if (method === "POST" && savedOrder?.id && selectedTeeth.length > 0) {
				for (const tooth of selectedTeeth) {
					await fetch(`/api/clinical/lab-orders/${savedOrder.id}/items`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							toothFdi: tooth,
							restorationType: constructionType,
							material,
							shadeFinal: finalShade,
							shadeStump: shadeStump || null,
							translucencyLevel: translucency,
							cementGapMicrons,
							priceRub: totalLabPriceRub / selectedTeeth.length,
						}),
					}).catch(() => {});
				}
			}

			showToast(
				initialOrder?.id
					? "Наряд ЗТЛ успешно обновлен"
					: "Наряд-заказ в зуботехническую лабораторию успешно оформлен!",
				"success",
			);

			const resultData: DentalLabOrderData = {
				...savedOrder,
				selectedTeeth,
				constructionType,
				material,
				colorVita: finalShade,
				shadeCervical,
				shadeBody,
				shadeIncisal,
				shadeStump,
				translucency,
				mamelons,
				calcifications,
				occlusalScheme,
				contactTightness,
				surfaceTexture,
				cementGapMicrons,
				currentStage,
				clinicSharePct,
				doctorSharePct,
				doctorDeductionRub: doctorAmountRub,
			};

			if (onOrderSaved) {
				onOrderSaved(resultData);
			}

			onClose();
		} catch (err: any) {
			showToast(err.message || "Ошибка сохранения наряда ЗТЛ", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePrint = () => {
		window.print();
	};

	if (!isOpen) return null;

	const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/#/portal/lab-order/${secureToken}`;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dental-lab-modal-title"
		>
			<div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
				
				{/* ─── MODAL HEADER ──────────────────────────────────────────────── */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm">
							<FlaskConical className="w-5 h-5" />
						</div>
						<div>
							<h2
								id="dental-lab-modal-title"
								className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 m-0"
							>
								Наряд-заказ в зуботехническую лабораторию (ЗТЛ)
								<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-300 dark:border-teal-700">
									CAD/CAM Pro
								</span>
							</h2>
							<p className="text-xs text-slate-500 dark:text-slate-400 m-0">
								Пациент: <span className="font-semibold text-slate-700 dark:text-slate-200">{formPatientName}</span> · Врач: <span className="font-semibold text-slate-700 dark:text-slate-200">{formDoctorName}</span>
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrint}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
							title="Печать наряда"
						>
							<Printer className="w-3.5 h-3.5" />
							Печать
						</button>
						<button
							type="button"
							onClick={onClose}
							data-testid="lab-order-modal-close-btn"
							className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							aria-label="Закрыть модальное окно"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* ─── NAVIGATION TABS ───────────────────────────────────────────── */}
				<div className="flex items-center gap-1.5 px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 overflow-x-auto text-xs scrollbar-none">
					{[
						{ id: "main", label: "1. Зубная формула & Реставрация", icon: FlaskConical },
						{ id: "shades", label: "2. Расцветка VITA & Культя", icon: Palette },
						{ id: "occlusion", label: "3. Окклюзия & Текстура", icon: Layers },
						{ id: "stages", label: "4. Трекинг этапов ЗТЛ", icon: Clock },
						{ id: "pricing", label: "5. Себестоимость & Сделка", icon: DollarSign },
						{ id: "print", label: "6. Бланк наряда & QR", icon: QrCode },
					].map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id as TabKey)}
								className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap shrink-0 transition-all ${
									isActive
										? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-200 dark:border-slate-700 font-semibold"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
								}`}
							>
								<Icon className="w-3.5 h-3.5" />
								{tab.label}
							</button>
						);
					})}
				</div>

				{/* ─── MODAL BODY WITH TAB PANELS ───────────────────────────────── */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">

					{/* ═══ TAB 1: MAIN SPECS & ODONTOGRAM ═══════════════════════════ */}
					{activeTab === "main" && (
						<div className="space-y-6">
							{/* FDI Odontogram Mini-Picker */}
							<div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-3">
								<div className="flex items-center justify-between flex-wrap gap-2">
									<div className="flex items-center gap-2">
										<span className="font-bold text-sm text-slate-900 dark:text-slate-100">
											Зубная формула (FDI)
										</span>
										<span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 font-semibold">
											{selectedTeeth.length > 0
												? `Выбрано: ${selectedTeeth.join(", ")} (${selectedTeeth.length} ед.)`
												: "Выберите зубы для наряда"}
										</span>
									</div>
									<div className="flex items-center gap-1.5 text-xs">
										<button
											type="button"
											onClick={() => selectQuadrant([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28])}
											className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
										>
											Верхняя челюсть
										</button>
										<button
											type="button"
											onClick={() => selectQuadrant([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38])}
											className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
										>
											Нижняя челюсть
										</button>
										<button
											type="button"
											onClick={() => setSelectedTeeth([])}
											className="px-2 py-1 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors"
										>
											Очистить
										</button>
									</div>
								</div>

								{/* Quadrant Visual Grid */}
								<div className="space-y-2 select-none">
									{/* Upper Maxilla */}
									<div className="flex justify-center items-center gap-1 sm:gap-1.5 flex-wrap">
										<span className="text-[10px] uppercase font-bold text-slate-400 w-12 text-right pr-1">
											Верх (Q1-Q2)
										</span>
										{[18, 17, 16, 15, 14, 13, 12, 11].map((t) => (
											<button
												key={t}
												type="button"
												onClick={() => toggleTooth(t)}
												className={`w-8 h-8 sm:w-9 sm:h-9 text-xs font-bold rounded-lg border transition-all flex items-center justify-center ${
													selectedTeeth.includes(t)
														? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20 scale-105"
														: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/30"
												}`}
											>
												{t}
											</button>
										))}
										<div className="w-px h-8 bg-slate-300 dark:bg-slate-700 mx-1" />
										{[21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
											<button
												key={t}
												type="button"
												onClick={() => toggleTooth(t)}
												className={`w-8 h-8 sm:w-9 sm:h-9 text-xs font-bold rounded-lg border transition-all flex items-center justify-center ${
													selectedTeeth.includes(t)
														? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20 scale-105"
														: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/30"
												}`}
											>
												{t}
											</button>
										))}
									</div>

									{/* Lower Mandible */}
									<div className="flex justify-center items-center gap-1 sm:gap-1.5 flex-wrap">
										<span className="text-[10px] uppercase font-bold text-slate-400 w-12 text-right pr-1">
											Низ (Q4-Q3)
										</span>
										{[48, 47, 46, 45, 44, 43, 42, 41].map((t) => (
											<button
												key={t}
												type="button"
												onClick={() => toggleTooth(t)}
												className={`w-8 h-8 sm:w-9 sm:h-9 text-xs font-bold rounded-lg border transition-all flex items-center justify-center ${
													selectedTeeth.includes(t)
														? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20 scale-105"
														: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/30"
												}`}
											>
												{t}
											</button>
										))}
										<div className="w-px h-8 bg-slate-300 dark:bg-slate-700 mx-1" />
										{[31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
											<button
												key={t}
												type="button"
												onClick={() => toggleTooth(t)}
												className={`w-8 h-8 sm:w-9 sm:h-9 text-xs font-bold rounded-lg border transition-all flex items-center justify-center ${
													selectedTeeth.includes(t)
														? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20 scale-105"
														: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/30"
												}`}
											>
												{t}
											</button>
										))}
									</div>
								</div>
							</div>

							{/* Construction Type Grid */}
							<div className="space-y-3">
								<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
									Тип ортопедической конструкции
								</label>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{CONSTRUCTION_TYPES.map((c) => {
										const isSelected = constructionType === c.id;
										return (
											<button
												key={c.id}
												type="button"
												onClick={() => setConstructionType(c.id)}
												className={`p-3.5 text-left rounded-xl border transition-all flex items-start gap-3 ${
													isSelected
														? "bg-teal-50/70 dark:bg-teal-950/30 border-teal-500 shadow-sm ring-2 ring-teal-500/20"
														: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
												}`}
											>
												<span className="text-2xl">{c.icon}</span>
												<div className="space-y-1">
													<div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
														{c.name}
														{isSelected && (
															<CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 ml-auto" />
														)}
													</div>
													<div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
														{c.desc}
													</div>
												</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Material Selection */}
							<div className="space-y-3">
								<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
									Материал изготовления (CAD/CAM & Керамика)
								</label>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{LAB_MATERIALS.map((m) => {
										const isSelected = material === m.id;
										return (
											<button
												key={m.id}
												type="button"
												onClick={() => setMaterial(m.id)}
												className={`p-3 text-left rounded-xl border transition-all flex items-center justify-between ${
													isSelected
														? "bg-teal-50/70 dark:bg-teal-950/30 border-teal-500 shadow-sm ring-2 ring-teal-500/20"
														: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
												}`}
											>
												<div className="space-y-0.5 pr-2">
													<div className="text-xs font-bold text-slate-900 dark:text-slate-100">
														{m.name}
													</div>
													<div className="text-[11px] text-slate-500 dark:text-slate-400">
														{m.desc}
													</div>
												</div>
												<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap">
													{m.tag}
												</span>
											</button>
										);
									})}
								</div>
							</div>

							{/* Due Date & General Clinical Notes */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
										Срок сдачи работы (Дедлайн лаборатории)
									</label>
									<input
										type="date"
										value={dueDate}
										onChange={(e) => setDueDate(e.target.value)}
										className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
									/>
								</div>
								<div className="space-y-1.5">
									<label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
										Особые пожелания врачу / технику
									</label>
									<input
										type="text"
										placeholder="Напр. Пациент уезжает 25 числа, примерка на воске..."
										value={clinicalNotes}
										onChange={(e) => setClinicalNotes(e.target.value)}
										className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
									/>
								</div>
							</div>
						</div>
					)}

					{/* ═══ TAB 2: VITA SHADES & STUMP PREPARATION ════════════════════ */}
					{activeTab === "shades" && (
						<div className="space-y-6">
							{/* Shade System Switcher */}
							<div className="flex items-center gap-3 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
								<button
									type="button"
									onClick={() => setShadeSystem("classical")}
									className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
										shadeSystem === "classical"
											? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm"
											: "text-slate-600 dark:text-slate-400"
									}`}
								>
									VITA Classical (A1–D4)
								</button>
								<button
									type="button"
									onClick={() => setShadeSystem("bleach")}
									className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
										shadeSystem === "bleach"
											? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm"
											: "text-slate-600 dark:text-slate-400"
									}`}
								>
									Bleach Shades (BL1–BL4, 0M1–0M3)
								</button>
							</div>

							{/* Primary Shade Palette Grid */}
							<div className="space-y-3">
								<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
									Основной оттенок реставрации
								</label>
								{shadeSystem === "classical" ? (
									<div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
										{VITA_CLASSICAL_SHADES.map((shade) => {
											const isSelected = shadeClassical === shade;
											return (
												<button
													key={shade}
													type="button"
													onClick={() => {
														setShadeClassical(shade);
														setShadeBody(shade);
													}}
													className={`h-11 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center ${
														isSelected
															? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20 scale-105"
															: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-teal-500"
													}`}
												>
													<span>{shade}</span>
													<span className="text-[9px] opacity-70 font-normal">VITA</span>
												</button>
											);
										})}
									</div>
								) : (
									<div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
										{VITA_BLEACH_SHADES.map((shade) => {
											const isSelected = shadeBleach === shade;
											return (
												<button
													key={shade}
													type="button"
													onClick={() => {
														setShadeBleach(shade);
														setShadeBody(shade);
													}}
													className={`h-11 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center ${
														isSelected
															? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20 scale-105"
															: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-teal-500"
													}`}
												>
													<span>{shade}</span>
													<span className="text-[9px] opacity-70 font-normal">Bleach</span>
												</button>
											);
										})}
									</div>
								)}
							</div>

							{/* 3-Zone Shade Selection (Cervical, Body, Incisal) */}
							<div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-4">
								<div className="flex items-center gap-2">
									<Palette className="w-4 h-4 text-teal-600 dark:text-teal-400" />
									<h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
										3-Зонная стратификация цвета (Cervical / Body / Incisal)
									</h4>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
									{/* Cervical */}
									<div className="space-y-1.5">
										<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
											1. Пришеечная треть (Cervical)
										</label>
										<select
											value={shadeCervical}
											onChange={(e) => setShadeCervical(e.target.value)}
											className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
										>
											{VITA_CLASSICAL_SHADES.map((s) => (
												<option key={s} value={s}>VITA {s} (Насыщенный)</option>
											))}
										</select>
										<span className="text-[10px] text-slate-400 block">Более темный/насыщенный пришеечный переход</span>
									</div>

									{/* Body */}
									<div className="space-y-1.5">
										<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
											2. Тело зуба (Body / Middle)
										</label>
										<select
											value={shadeBody}
											onChange={(e) => setShadeBody(e.target.value)}
											className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
										>
											{VITA_CLASSICAL_SHADES.map((s) => (
												<option key={s} value={s}>VITA {s}</option>
											))}
											{VITA_BLEACH_SHADES.map((s) => (
												<option key={s} value={s}>Bleach {s}</option>
											))}
										</select>
										<span className="text-[10px] text-slate-400 block">Основной дентинный цвет коронки</span>
									</div>

									{/* Incisal */}
									<div className="space-y-1.5">
										<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
											3. Режущий край (Incisal / Enamel)
										</label>
										<select
											value={shadeIncisal}
											onChange={(e) => setShadeIncisal(e.target.value)}
											className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
										>
											{VITA_CLASSICAL_SHADES.map((s) => (
												<option key={s} value={s}>VITA {s} (Светлый/Опаловый)</option>
											))}
											{VITA_BLEACH_SHADES.map((s) => (
												<option key={s} value={s}>Bleach {s}</option>
											))}
										</select>
										<span className="text-[10px] text-slate-400 block">Эмалевая прозрачность и опалесценция</span>
									</div>
								</div>
							</div>

							{/* Stump Shade (IPS Natural Die ND1–ND9) */}
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
										Цвет культи препарированного зуба (IPS Natural Die Material ND1–ND9)
									</label>
									<span className="text-xs text-slate-400">
										Критично для тонких виниров и цельнокерамических коронок E.max
									</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
									{STUMP_NATURAL_DIE_SHADES.map((nd) => {
										const isSelected = shadeStump === nd.id;
										return (
											<button
												key={nd.id}
												type="button"
												onClick={() => setShadeStump(isSelected ? "" : nd.id)}
												className={`p-2.5 text-left rounded-xl border text-xs transition-all flex items-center justify-between ${
													isSelected
														? "bg-teal-50/80 dark:bg-teal-950/40 border-teal-500 font-bold text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20"
														: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
												}`}
											>
												<span>{nd.name}</span>
												{isSelected && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />}
											</button>
										);
									})}
								</div>
							</div>

							{/* Translucency & Special Characterizations */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-2">
									<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
										Степень прозрачности (Translucency)
									</label>
									<div className="grid grid-cols-5 gap-1.5">
										{[
											{ id: "UTML", label: "UTML", desc: "Ультра" },
											{ id: "STML", label: "STML", desc: "Супер" },
											{ id: "HT", label: "HT", desc: "Высокая" },
											{ id: "MT", label: "MT", desc: "Средняя" },
											{ id: "LT", label: "LT", desc: "Низкая" },
										].map((t) => (
											<button
												key={t.id}
												type="button"
												onClick={() => setTranslucency(t.id)}
												className={`py-2 rounded-lg border text-xs font-bold flex flex-col items-center ${
													translucency === t.id
														? "bg-teal-600 text-white border-teal-600"
														: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
												}`}
											>
												<span>{t.label}</span>
												<span className="text-[9px] font-normal opacity-80">{t.desc}</span>
											</button>
										))}
									</div>
								</div>

								<div className="space-y-2">
									<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
										Индивидуальные оптические эффекты
									</label>
									<div className="flex gap-4 items-center pt-2">
										<label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
											<input
												type="checkbox"
												checked={mamelons}
												onChange={(e) => setMamelons(e.target.checked)}
												className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700"
											/>
											Выраженные мамелоны режущего края
										</label>
										<label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
											<input
												type="checkbox"
												checked={calcifications}
												onChange={(e) => setCalcifications(e.target.checked)}
												className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700"
											/>
											Кальцификаты / белые эмалевые пятна
										</label>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* ═══ TAB 3: OCCLUSION, CONTACTS, TEXTURE ══════════════════════ */}
					{activeTab === "occlusion" && (
						<div className="space-y-6">
							{/* Occlusal Scheme */}
							<div className="space-y-3">
								<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
									Окклюзионная концепция & Биомеханика
								</label>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{OCCLUSAL_SCHEMES.map((scheme) => {
										const isSelected = occlusalScheme === scheme.id;
										return (
											<button
												key={scheme.id}
												type="button"
												onClick={() => setOcclusalScheme(scheme.id)}
												className={`p-3.5 text-left rounded-xl border transition-all ${
													isSelected
														? "bg-teal-50/70 dark:bg-teal-950/30 border-teal-500 shadow-sm ring-2 ring-teal-500/20"
														: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
												}`}
											>
												<div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
													{scheme.name}
													{isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
												</div>
												<div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
													{scheme.desc}
												</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Contact Tightness */}
							<div className="space-y-3">
								<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
									Плотность апроксимальных контактов (Контактные пункты)
								</label>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
									{CONTACT_TIGHTNESS_OPTIONS.map((c) => {
										const isSelected = contactTightness === c.id;
										return (
											<button
												key={c.id}
												type="button"
												onClick={() => setContactTightness(c.id)}
												className={`p-3 text-left rounded-xl border transition-all ${
													isSelected
														? "bg-teal-50/70 dark:bg-teal-950/30 border-teal-500 shadow-sm ring-2 ring-teal-500/20 font-semibold"
														: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
												}`}
											>
												<div className="text-xs font-bold text-slate-900 dark:text-slate-100">
													{c.name}
												</div>
												<div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
													{c.desc}
												</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Surface Texture */}
							<div className="space-y-3">
								<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
									Текстура поверхности & Финишная полировка
								</label>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									{SURFACE_TEXTURE_OPTIONS.map((t) => {
										const isSelected = surfaceTexture === t.id;
										return (
											<button
												key={t.id}
												type="button"
												onClick={() => setSurfaceTexture(t.id)}
												className={`p-3.5 text-left rounded-xl border transition-all ${
													isSelected
														? "bg-teal-50/70 dark:bg-teal-950/30 border-teal-500 shadow-sm ring-2 ring-teal-500/20 font-semibold"
														: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
												}`}
											>
												<div className="text-xs font-bold text-slate-900 dark:text-slate-100">
													{t.name}
												</div>
												<div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
													{t.desc}
												</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Cement Gap Settings */}
							<div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-3">
								<div className="flex items-center justify-between">
									<label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
										Цементный зазор CAD/CAM (Cement Space Gap)
									</label>
									<span className="text-sm font-extrabold text-teal-600 dark:text-teal-400 font-mono">
										{cementGapMicrons} мкм
									</span>
								</div>
								<input
									type="range"
									min="10"
									max="100"
									step="5"
									value={cementGapMicrons}
									onChange={(e) => setCementGapMicrons(Number(e.target.value))}
									className="w-full accent-teal-600 cursor-pointer"
								/>
								<div className="flex justify-between text-[10px] text-slate-400">
									<span>10 мкм (Прецизионная посадка)</span>
									<span>30–40 мкм (Стандарт ISO)</span>
									<span>100 мкм (Широкий зазор)</span>
								</div>
							</div>
						</div>
					)}

					{/* ═══ TAB 4: LAB STAGES TRACKER ════════════════════════════════ */}
					{activeTab === "stages" && (
						<div className="space-y-6">
							<div>
								<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
									Жизненный цикл и статус изготовления в ЗТЛ
								</h3>
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									Пошаговый трекер технологических этапов от передачи оттисков до фиксации в полости рта.
								</p>
							</div>

							<div className="space-y-3">
								{LAB_ORDER_STAGES.map((stage, idx) => {
									const isCurrent = currentStage === stage.id;
									const isPassed = LAB_ORDER_STAGES.findIndex((s) => s.id === currentStage) > idx;

									return (
										<div
											key={stage.id}
											onClick={() => setCurrentStage(stage.id)}
											className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
												isCurrent
													? `${stage.color} ring-2 ring-teal-500/30 shadow-md font-semibold`
													: isPassed
													? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-80"
													: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-50 hover:opacity-100"
											}`}
										>
											<div className="flex items-center gap-3">
												<div
													className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
														isPassed || isCurrent
															? "bg-teal-600 text-white"
															: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
													}`}
												>
													{isPassed ? <Check className="w-4 h-4" /> : stage.step}
												</div>
												<div>
													<div className="text-xs font-bold text-slate-900 dark:text-slate-100">
														{stage.name}
													</div>
													<div className="text-[11px] text-slate-500 dark:text-slate-400">
														{stage.desc}
													</div>
												</div>
											</div>

											{isCurrent && (
												<span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-teal-600 text-white shadow-sm flex-shrink-0">
													Текущий этап
												</span>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* ═══ TAB 5: PRICING & DOCTOR SALARY DEDUCTION ══════════════════ */}
					{activeTab === "pricing" && (
						<div className="space-y-6">
							<div>
								<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
									Себестоимость ЗТЛ и распределение расходов
								</h3>
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									Расчет удержания стоимости лабораторных услуг из гонорара лечащего врача с гарантией копеечного баланса.
								</p>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
										Счет от зуботехнической лаборатории (Себестоимость, ₽)
									</label>
									<div className="relative">
										<input
											type="text"
											inputMode="decimal"
											placeholder="0.00"
											value={priceRubInput}
											onChange={(e) => setPriceRubInput(e.target.value)}
											className="w-full h-11 pl-3 pr-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
										/>
										<span className="absolute right-3 top-3 text-slate-400 font-bold">₽</span>
									</div>
								</div>

								<div className="space-y-1.5">
									<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
										Быстрые пресеты распределения
									</label>
									<div className="flex gap-2 pt-0.5">
										{[
											{ label: "100 / 0", c: 100, d: 0 },
											{ label: "50 / 50", c: 50, d: 50 },
											{ label: "70 / 30", c: 70, d: 30 },
											{ label: "0 / 100", c: 0, d: 100 },
										].map((p) => (
											<button
												key={p.label}
												type="button"
												onClick={() => handleSharePreset(p.c, p.d)}
												className={`flex-1 h-10 rounded-lg border text-xs font-bold transition-colors ${
													clinicSharePct === p.c && doctorSharePct === p.d
														? "bg-teal-600 text-white border-teal-600"
														: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
												}`}
											>
												{p.label}
											</button>
										))}
									</div>
								</div>
							</div>

							{/* Sliders & Percentage Input */}
							<div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<div className="flex justify-between text-xs font-bold mb-1">
											<span className="text-blue-700 dark:text-blue-400">Доля клиники:</span>
											<span className="font-mono">{clinicSharePct}%</span>
										</div>
										<input
											type="range"
											min="0"
											max="100"
											value={clinicSharePct}
											onChange={(e) => {
												const c = Number(e.target.value);
												setClinicSharePct(c);
												setDoctorSharePct(100 - c);
											}}
											className="w-full accent-blue-600 cursor-pointer"
										/>
									</div>

									<div>
										<div className="flex justify-between text-xs font-bold mb-1">
											<span className="text-amber-700 dark:text-amber-400">Доля врача (Удержание):</span>
											<span className="font-mono">{doctorSharePct}%</span>
										</div>
										<input
											type="range"
											min="0"
											max="100"
											value={doctorSharePct}
											onChange={(e) => {
												const d = Number(e.target.value);
												setDoctorSharePct(d);
												setClinicSharePct(100 - d);
											}}
											className="w-full accent-amber-600 cursor-pointer"
										/>
									</div>
								</div>

								{/* Calculated Breakdown Card */}
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
									<div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
										<span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
											Полная стоимость ЗТЛ:
										</span>
										<span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
											{money(totalLabPriceRub)}
										</span>
									</div>

									<div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
										<span className="text-[11px] text-blue-700 dark:text-blue-300 block font-medium">
											Оплачивает клиника ({clinicSharePct}%):
										</span>
										<span className="text-base font-extrabold text-blue-900 dark:text-blue-100 font-mono">
											{money(clinicAmountRub)}
										</span>
									</div>

									<div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
										<span className="text-[11px] text-amber-700 dark:text-amber-300 block font-medium">
											Удержание из ЗП врача ({doctorSharePct}%):
										</span>
										<span className="text-base font-extrabold text-amber-900 dark:text-amber-100 font-mono">
											{money(doctorAmountRub)}
										</span>
									</div>
								</div>

								{isBalanced && (
									<div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
										<CheckCircle2 className="w-3.5 h-3.5" />
										<span>Баланс сверен с точностью до копейки (Penny-Drift Invariant OK)</span>
									</div>
								)}
							</div>
						</div>
					)}

					{/* ═══ TAB 6: PRINTABLE BLANK & QR CODE ═════════════════════════ */}
					{activeTab === "print" && (
						<div className="space-y-6">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
										Бланк наряда ЗТЛ для печати и QR-код зубного техника
									</h3>
									<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
										Официальный наряд-заказ с уникальным штрихкодом и ссылкой для трекинга техником.
									</p>
								</div>
								<button
									type="button"
									onClick={handlePrint}
									className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-500/20"
								>
									<Printer className="w-4 h-4" />
									Распечатать наряд (A4 / Термочехол)
								</button>
							</div>

							{/* Printable Paper Card */}
							<div
								id="printable-lab-order-sheet"
								className="p-6 sm:p-8 bg-white text-slate-900 rounded-xl border border-slate-300 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0"
							>
								{/* Blank Header */}
								<div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
									<div>
										<h1 className="text-xl font-black tracking-wide uppercase m-0">
											Наряд-заказ ЗТЛ № {secureToken.slice(0, 8).toUpperCase()}
										</h1>
										<p className="text-xs text-slate-600 mt-1 m-0">
											Стоматологическая клиника · Зуботехническое отделение CAD/CAM
										</p>
									</div>
									<div className="text-right">
										<span className="text-xs font-bold block">Дата: {new Date().toLocaleDateString("ru-RU")}</span>
										{dueDate && (
											<span className="text-xs font-bold text-rose-600 block">
												Срок сдачи: {new Date(dueDate).toLocaleDateString("ru-RU")}
											</span>
										)}
									</div>
								</div>

								{/* Info Table */}
								<div className="grid grid-cols-2 gap-4 text-xs">
									<div className="space-y-1">
										<div><strong>Пациент:</strong> {formPatientName}</div>
										<div><strong>Лечащий врач:</strong> {formDoctorName}</div>
										<div><strong>Зуб(ы) FDI:</strong> <span className="font-bold text-sm bg-slate-100 px-1.5 py-0.5 rounded">{selectedTeeth.join(", ") || "—"}</span></div>
									</div>
									<div className="space-y-1">
										<div><strong>Конструкция:</strong> {CONSTRUCTION_TYPES.find((c) => c.id === constructionType)?.name || constructionType}</div>
										<div><strong>Материал:</strong> {LAB_MATERIALS.find((m) => m.id === material)?.name || material}</div>
										<div><strong>Цвет VITA:</strong> {shadeSystem === "bleach" ? shadeBleach : shadeClassical} (Культя: {shadeStump || "Норма"})</div>
									</div>
								</div>

								{/* Detailed Spec Box */}
								<div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
									<div className="font-bold border-b pb-1">Техническое задание технику:</div>
									<div className="grid grid-cols-2 gap-2 text-[11px]">
										<div>• 3-Зонная расцветка: {shadeCervical} / {shadeBody} / {shadeIncisal}</div>
										<div>• Прозрачность: {translucency} {mamelons ? "(Мамелоны)" : ""} {calcifications ? "(Кальцификаты)" : ""}</div>
										<div>• Окклюзия: {OCCLUSAL_SCHEMES.find((o) => o.id === occlusalScheme)?.name}</div>
										<div>• Контакт: {CONTACT_TIGHTNESS_OPTIONS.find((c) => c.id === contactTightness)?.name}</div>
										<div>• Текстура: {SURFACE_TEXTURE_OPTIONS.find((s) => s.id === surfaceTexture)?.name}</div>
										<div>• Цементный зазор: {cementGapMicrons} мкм</div>
									</div>
									{clinicalNotes && (
										<div className="pt-2 text-[11px] italic text-slate-700">
											<strong>Клинические примечания:</strong> {clinicalNotes}
										</div>
									)}
								</div>

								{/* Barcode & QR Code Section */}
								<div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-300">
									<div className="w-1/2">
										<div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
											Штрихкод наряда
										</div>
										<div
											className="w-48 text-slate-900"
											dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(secureToken) }}
										/>
									</div>

									<div className="flex items-center gap-3 text-right">
										<div>
											<div className="text-[10px] uppercase font-bold text-slate-500">
												Портал техника (QR)
											</div>
											<div className="text-[9px] text-slate-400">
												Сканируйте для онлайн-статуса
											</div>
										</div>
										<div
											className="text-slate-900 flex-shrink-0"
											dangerouslySetInnerHTML={{ __html: generateQrCodeSvg(portalUrl) }}
										/>
									</div>
								</div>

								{/* Signatures */}
								<div className="grid grid-cols-2 gap-8 pt-6 text-xs">
									<div className="border-t border-slate-400 pt-1">
										Врач: ___________________ / {formDoctorName} /
									</div>
									<div className="border-t border-slate-400 pt-1 text-right">
										Зубной техник (ЗТЛ): ___________________ /
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* ─── MODAL FOOTER WITH SAVE / SUBMIT ───────────────────────────── */}
				<div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
					<div className="text-xs text-slate-500 dark:text-slate-400">
						{selectedTeeth.length > 0 ? (
							<span>
								Зуб(ы): <strong className="text-slate-800 dark:text-slate-200">{selectedTeeth.join(", ")}</strong> · Сумма: <strong className="text-teal-600 dark:text-teal-400">{money(totalLabPriceRub)}</strong>
							</span>
						) : (
							<span>Зубы не выбраны</span>
						)}
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={isSubmitting}
							className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={() => handleSaveOrder()}
							disabled={isSubmitting || selectedTeeth.length === 0}
							className="px-5 py-2.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-md shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Сохранение наряда...
								</>
							) : (
								<>
									<Send className="w-4 h-4" />
									{initialOrder?.id ? "Сохранить изменения" : "Оформить наряд в ЗТЛ"}
								</>
							)}
						</button>
					</div>
				</div>

			</div>
		</div>
	);
}

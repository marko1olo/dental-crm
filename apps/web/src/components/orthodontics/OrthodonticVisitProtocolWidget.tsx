import {
	Activity,
	Check,
	CheckCircle2,
	Clipboard,
	Copy,
	FileText,
	Layers,
	Plus,
	Receipt,
	RotateCcw,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import {
	ANGLE_CLASS_OPTIONS,
	type AngleClass,
	type AngleClassOption,
	WORKHORSE_ARCHWIRES,
	type WorkhorseArchwireOption,
} from "@dental/shared";

export { ANGLE_CLASS_OPTIONS, WORKHORSE_ARCHWIRES };
export type { AngleClass, AngleClassOption, WorkhorseArchwireOption };

export type BracketSlot = "0.018" | "0.022";
export type ArchwireMaterial = "NiTi" | "CuNiTi" | "SS" | "TMA";
export type ArchwireSection =
	| ".012"
	| ".014"
	| ".016"
	| ".018"
	| ".020"
	| ".014x.025"
	| ".016x.022"
	| ".016x.025"
	| ".017x.025"
	| ".018x.025"
	| ".019x.025"
	| ".021x.025";

export type TargetArch = "upper" | "lower" | "both";

export interface OrthodonticService804n {
	code: string;
	nameRu: string;
	priceRub: number;
	stageKind: "stage_ortho";
	toothNumber?: number | undefined;
}

export const ORTHO_804N_ACTIONS_MAP: Record<string, Array<Omit<OrthodonticService804n, "stageKind">>> = {
	wire_change: [
		{
			code: "A16.07.048.002",
			nameRu: "Смена ортодонтической дуги",
			priceRub: 2500,
		},
		{
			code: "A16.07.048",
			nameRu: "Коррекция прикуса с использованием брекет-системы",
			priceRub: 1500,
		},
	],
	ligature_change: [
		{
			code: "A16.07.048",
			nameRu: "Активация элементов брекет-системы / смена лигатур",
			priceRub: 1500,
		},
	],
	rebracket: [
		{
			code: "A16.07.048.001",
			nameRu: "Фиксация одного брекета / замка",
			priceRub: 1200,
		},
	],
	ipr: [
		{
			code: "A16.07.048.003",
			nameRu: "Сепарация зубов",
			priceRub: 800,
		},
	],
	plate_activation: [
		{
			code: "A16.07.047",
			nameRu: "Коррекция съемного ортодонтического аппарата",
			priceRub: 1000,
		},
	],
	expansion_screw_activation: [
		{
			code: "A16.07.047.001",
			nameRu: "Активация расширяющего винта пластинки",
			priceRub: 800,
		},
	],
	debonding: [
		{
			code: "A16.07.049",
			nameRu: "Снятие несъемного ортодонтического аппарата",
			priceRub: 5000,
		},
		{
			code: "A16.07.050",
			nameRu: "Фиксация несъемного ретейнера",
			priceRub: 4000,
		},
	],
};

export const ALIGNER_804N_SERVICES: Array<Omit<OrthodonticService804n, "stageKind">> = [
	{
		code: "A16.07.046",
		nameRu: "Ортодонтическая коррекция с применением элайнеров",
		priceRub: 3000,
	},
	{
		code: "A16.07.046.001",
		nameRu: "Фиксация композитных аттачментов элайнеров",
		priceRub: 2000,
	},
];

export interface CalculateOrthoServicesParams {
	selectedActions?: string[] | undefined;
	bracketSystem?: string | undefined;
	activeAttachmentPreset?: string | null | undefined;
	selectedTooth?: number | null | undefined;
	isAttachmentsOnly?: boolean | undefined;
}

export function calculateOrthodonticServices804n(
	params: CalculateOrthoServicesParams,
): OrthodonticService804n[] {
	if (params.isAttachmentsOnly) {
		return ALIGNER_804N_SERVICES.map((s) => ({
			...s,
			stageKind: "stage_ortho",
			toothNumber: params.selectedTooth ?? undefined,
		}));
	}

	const rawServices: OrthodonticService804n[] = [];

	const isAligners = params.bracketSystem === "aligners" || Boolean(params.activeAttachmentPreset);
	if (isAligners) {
		for (const s of ALIGNER_804N_SERVICES) {
			rawServices.push({
				...s,
				stageKind: "stage_ortho",
				toothNumber: params.selectedTooth ?? undefined,
			});
		}
	}

	const actions = params.selectedActions || [];
	for (const actionId of actions) {
		const mapped = ORTHO_804N_ACTIONS_MAP[actionId];
		if (mapped) {
			for (const item of mapped) {
				rawServices.push({
					...item,
					stageKind: "stage_ortho",
					toothNumber:
						actionId === "rebracket" && params.selectedTooth
							? params.selectedTooth
							: undefined,
				});
			}
		}
	}

	// Deduplicate by code so patient is not double-billed for identical 804n code in same visit
	const servicesMap = new Map<string, OrthodonticService804n>();
	for (const s of rawServices) {
		if (!servicesMap.has(s.code)) {
			servicesMap.set(s.code, s);
		}
	}

	return Array.from(servicesMap.values());
}

export interface OrthodonticVisitProtocolWidgetProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string | undefined;
	patientName?: string | undefined;
	selectedTooth?: number | null;
	onSelectTooth?: (toothNumber: number) => void;
	currentAligner?: number | undefined;
	totalAligners?: number | undefined;
	onIssueAlignerSet?: ((count: number, days: number) => void) | undefined;
	onAddToInvoice?: ((services: OrthodonticService804n[]) => void) | undefined;
}

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const ANTERIOR_TEETH = [13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33];

export const BRACKET_SYSTEMS = [
	{ id: "damon_q2", label: "Damon Q2", desc: "Металл · Пассивное самолигирование" },
	{ id: "damon_clear", label: "Damon Clear", desc: "Сапфир / керамика · Эстетические" },
	{ id: "empower", label: "Empower", desc: "Интерактивное самолигирование" },
	{ id: "mini_diamond", label: "Mini Diamond", desc: "Лигатурные классические" },
	{ id: "pitts21", label: "Pitts 21", desc: "Квадратный паз .021" },
	{ id: "aligners", label: "Элайнеры", desc: "Прозрачные каппы с аттачментами" },
	{ id: "removable_plate", label: "Пластинка с винтом", desc: "Съемный пластиночный аппарат с расширяющим винтом" },
];

export const ARCHWIRE_MATERIALS: Array<{ id: ArchwireMaterial; label: string; desc: string; badge: string }> = [
	{ id: "NiTi", label: "NiTi SuperElastic", desc: "Никель-титан · Первичное нивелирование", badge: "NiTi" },
	{ id: "CuNiTi", label: "CuNiTi 27°C / 35°C", desc: "Медь-никель-титан · Термоактивная", badge: "CuNiTi" },
	{ id: "SS", label: "SS (Stainless Steel)", desc: "Медицинская сталь · Закрытие промежутков", badge: "SS" },
	{ id: "TMA", label: "TMA (Beta-Titanium)", desc: "Бета-титан · Юстировка и финишные торки", badge: "TMA" },
];

export const ROUND_SECTIONS: ArchwireSection[] = [".012", ".014", ".016", ".018", ".020"];
export const RECT_SECTIONS: ArchwireSection[] = [
	".014x.025",
	".016x.022",
	".016x.025",
	".017x.025",
	".018x.025",
	".019x.025",
	".021x.025",
];

export const ELASTIC_SCHEMES = [
	{ id: "none", label: "Без эластиков", desc: "Межчелюстная тяга не назначена" },
	{ id: "class_ii", label: "II класс (дистализирующая)", desc: "Клык ВЧ — 6 зуб НЧ" },
	{ id: "class_iii", label: "III класс (мезиализирующая)", desc: "6 зуб ВЧ — клык НЧ" },
	{ id: "vertical_box", label: "Вертикальные (коробчатые)", desc: "Устранение открытого прикуса" },
	{ id: "cross", label: "Перекрестные (Cross-bite)", desc: "Устранение перекрестной окклюзии" },
	{ id: "asymmetric", label: "Асимметричные", desc: "Коррекция косметического центра" },
];

export const ELASTIC_SIZES = [
	{ id: "fox_3_16", label: "3/16\" 3.5 oz (Лиса)", strength: "Light" },
	{ id: "rabbit_3_16", label: "3/16\" 4.5 oz (Кролик)", strength: "Medium" },
	{ id: "kangaroo_1_4", label: "1/4\" 4.5 oz (Кенгуру)", strength: "Medium" },
	{ id: "buffalo_1_4", label: "1/4\" 6.0 oz (Буйвол)", strength: "Heavy" },
	{ id: "bear_5_16", label: "5/16\" 6.0 oz (Медведь)", strength: "Heavy" },
	{ id: "monkey_3_8", label: "3/8\" 4.5 oz (Обезьяна)", strength: "Medium" },
];

export const CLINICAL_ACTIONS = [
	{ id: "wire_change", label: "Смена дуги + активация замков" },
	{ id: "ligature_change", label: "Смена эластических лигатур" },
	{ id: "power_chain", label: "Установка цепочки Power Chain" },
	{ id: "rebracket", label: "Переклейка отклеившегося брекета" },
	{ id: "ipr", label: "Сепарация эмали (IPR)" },
	{ id: "plate_activation", label: "Активация дуги и кламмеров пластинки" },
	{ id: "expansion_screw_activation", label: "Раскрутка расширяющего винта (1/4 об. = 0.25 мм)" },
	{ id: "debonding", label: "Снятие аппаратуры + ретейнер" },
];

export interface AlignerAttachmentPreset {
	id: string;
	label: string;
	shortLabel: string;
	teeth: number[];
	description: string;
}

export const ALIGNER_ATTACHMENT_PRESETS: AlignerAttachmentPreset[] = [
	{
		id: "standard",
		label: "Стандартные аттачменты: клыки и премоляры (15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45)",
		shortLabel: "Стандартные (клыки и премоляры)",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description:
			"Фиксация композитных аттачментов по переносному шаблону на зубы 15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45. Подготовка эмали: механическая очистка пастой без фтора, протравливание 37% гелем ортофосфорной кислоты 30 сек, смывание, высушивание. Внесение адгезивной системы, фотополимеризация. Заполнение шаблона микрогибридным композитом, позиционирование на зубной ряд, фотополимеризация каждого зуба по 20 сек. Шаблон снят, удаление излишков композита твердосплавными финирами, финишная полировка. Припасован сет элайнеров №1: адаптация плотная, ретенция надежная.",
	},
	{
		id: "intact",
		label: "Аттачменты интактны, сколов нет",
		shortLabel: "Аттачменты интактны, сколов нет",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description:
			"Контрольный осмотр элайнеров. Композитные аттачменты на верхней и нижней челюстях визуально и инструментально интактны: сколов, дефектов фиксации и отклеек не выявлено. Элайнеры прилегают плотно по всему периметру, ретенция оптимальная, щелей между краем каппы и режущими краями зубов нет. Трекинг перемещения зубов полностью соответствует утвержденному виртуальному 3D-сетапу.",
	},
	{
		id: "refixation",
		label: "Повторная фиксация аттачмента (замена)",
		shortLabel: "Повторная фиксация аттачмента (замена)",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description:
			"Обнаружен скол / отклейка композитного аттачмента. Проведено механическое удаление остатков старого композита, очистка поверхности эмали. Протравливание 37% ортофосфорной кислотой, адгезивный протокол, повторная фиксация аттачмента по шаблону из композитного материала, фотополимеризация. Проверка посадки элайнера: фиксация и ретенция восстановлены.",
	},
	{
		id: "debonding",
		label: "Снятие аттачментов и полировка (финиш)",
		shortLabel: "Снятие аттачментов и полировка (финиш)",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description:
			"Завершение элайнер-терапии. Атравматичное сошлифовывание композитных аттачментов специальными твердосплавными финирами на пониженных оборотах с водяным охлаждением без повреждения эмали. Финишная полировка пастами и дисками до зеркального блеска, глубокое фторирование эмали. Выданы ретенционные каппы / сняты оттиски для ретейнеров.",
	},
];

export function OrthodonticVisitProtocolWidget({
	isOpen,
	onClose,
	patientId,
	patientName = "Пациент",
	selectedTooth = null,
	onSelectTooth,
	currentAligner,
	totalAligners,
	onIssueAlignerSet,
	onAddToInvoice,
}: OrthodonticVisitProtocolWidgetProps) {
	if (!isOpen) return null;

	// State
	const [bracketSlot, setBracketSlot] = useState<BracketSlot>("0.022");
	const [bracketSystem, setBracketSystem] = useState<string>("damon_q2");
	const [archwireMaterial, setArchwireMaterial] = useState<ArchwireMaterial>("CuNiTi");
	const [archwireSection, setArchwireSection] = useState<ArchwireSection>(".016");
	const [targetArch, setTargetArch] = useState<TargetArch>("both");
	const [elasticScheme, setElasticScheme] = useState<string>("class_ii");
	const [elasticSize, setElasticSize] = useState<string>("kangaroo_1_4");
	const [elasticWear, setElasticWear] = useState<string>("22 часа/сутки");
	const [selectedActions, setSelectedActions] = useState<string[]>(["wire_change"]);
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([
		16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26,
		46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36,
	]);
	const [powerChainSpan, setPowerChainSpan] = useState<string>("13-23");
	const [powerChainType, setPowerChainType] = useState<string>("short");
	const [notes, setNotes] = useState<string>("Пациент жалоб не предъявляет. Гигиена удовлетворительная.");

	// 1-Click Autonomous Clinical Presets State
	const [activePreset, setActivePreset] = useState<
		"activation" | "wire_change" | "bonding" | "debonding" | null
	>(null);

	// Aligner & Attachments Express State
	const [activeAttachmentPreset, setActiveAttachmentPreset] = useState<string | null>(null);
	const [alignerSetIssued, setAlignerSetIssued] = useState<{ count: number; days: number } | null>(null);

	// Angle Classification State & Plate Activation
	const [angleClass, setAngleClass] = useState<AngleClass>("class_1");
	const [plateActivationTurns, setPlateActivationTurns] = useState<number>(1);

	// Canonical 804n services calculation
	const calculatedServices804n = useMemo(() => {
		return calculateOrthodonticServices804n({
			selectedActions,
			bracketSystem,
			activeAttachmentPreset,
			selectedTooth,
		});
	}, [selectedActions, bracketSystem, activeAttachmentPreset, selectedTooth]);

	// 1-Click explicit add to invoice/estimate
	const handleAddServicesToInvoice = useCallback(() => {
		if (calculatedServices804n.length === 0) {
			showToast("Нет выбранных ортодонтических манипуляций для начисления", "info");
			return;
		}

		onAddToInvoice?.(calculatedServices804n);

		try {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							services: calculatedServices804n,
							toothNumber: selectedTooth ?? undefined,
							stageKind: "stage_ortho",
						},
					}),
				);
			}
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch error:", err);
		}

		const totalRub = calculatedServices804n.reduce((acc, s) => acc + s.priceRub, 0);
		const codesStr = calculatedServices804n.map((s) => s.code).join(", ");
		showToast(
			`Начислено ${calculatedServices804n.length} услуг 804н (${codesStr}) на сумму ${totalRub} ₽`,
			"success",
			3500,
		);
	}, [calculatedServices804n, selectedTooth, onAddToInvoice]);

	// 1-Click Fast Workhorse Archwire Handler
	const handleSelectWorkhorseArchwire = (wire: WorkhorseArchwireOption) => {
		setActivePreset(null);
		setArchwireMaterial(wire.material);
		setArchwireSection(wire.section);
		if (!selectedActions.includes("wire_change")) {
			setSelectedActions((prev) => [...prev, "wire_change"]);
		}
		showToast(`Установлена рабочая дуга ${wire.label}`, "info");
	};

	// 1-Click Elastic Size Handler (Mandate 8e: zero dead disabled buttons)
	const handleElasticSizeInteraction = useCallback(() => {
		if (elasticScheme === "none") {
			setElasticScheme("class_ii");
			showToast("Схема эластиков: установлен «Класс II (по умолчанию)»", "info");
		}
	}, [elasticScheme]);

	// Fast 1-Click Preset Handlers
	const handlePresetActivation = () => {
		setActivePreset("activation");
		setTargetArch("both");
		setSelectedTeeth([
			17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
			47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
		]);
		setBracketSlot("0.022");
		setBracketSystem("damon_q2");
		setArchwireMaterial("CuNiTi");
		setArchwireSection(".016");
		setSelectedActions(["ligature_change"]);
		setElasticScheme("class_ii");
		setElasticSize("kangaroo_1_4");
		setElasticWear("22 часа/сутки");
		setNotes(
			"Плановый визит по графику ортодонтического лечения. Дуги сохранены без деформаций. Выполнена замена эластических лигатур, активация замков брекетов. Межчелюстная тяга скорректирована. Жалоб на острую боль и отклейку брекетов нет. Гигиена полости рта удовлетворительная.",
		);
		showToast("Пресет: Плановая активация применен", "info");
	};

	const handlePresetWireChange = () => {
		setActivePreset("wire_change");
		setTargetArch("both");
		setSelectedTeeth([
			17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
			47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
		]);
		setBracketSlot("0.022");
		setBracketSystem("damon_q2");
		setArchwireMaterial("NiTi");
		setArchwireSection(".016");
		setSelectedActions(["wire_change", "ligature_change"]);
		setElasticScheme("none");
		setNotes(
			"Плановая смена дуг на этапе нивелирования и юстировки. Установлены новые круглые никель-титановые дуги NiTi: верхняя челюсть .016\", нижняя челюсть .014\". Концы дуг подогнуты и зашлифованы, травма слизистой оболочки исключена. Замки закрыты со щелчком. Аппаратура стабильна.",
		);
		showToast("Пресет: Смена дуг (NiTi верх .016 / низ .014) применен", "info");
	};

	const handlePresetBonding = () => {
		setActivePreset("bonding");
		setTargetArch("upper");
		setSelectedTeeth([17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27]);
		setBracketSlot("0.022");
		setBracketSystem("damon_q2");
		setArchwireMaterial("NiTi");
		setArchwireSection(".014");
		setSelectedActions(["wire_change"]);
		setElasticScheme("none");
		setNotes(
			"Первичная прямая фиксация несъемной вестибулярной брекет-системы на верхнюю челюсть (сегменты 17-27). Протравливание эмали 37% ортофосфорной кислотой (30 сек), тщательное смывание, высушивание. Нанесение праймера, позиционирование брекетов по индивидуальной высоте, фотополимеризация. Введена первичная нивелирующая дуга NiTi .014\". Концы дуг отожжены и подогнуты. Проведен подробный инструктаж по уходу за брекетами и гигиене полости рта, выдан защитный воск.",
		);
		showToast("Пресет: Фиксация брекет-системы (ВЧ) применен", "info");
	};

	const handlePresetDebonding = () => {
		setActivePreset("debonding");
		setTargetArch("both");
		setSelectedTeeth(ANTERIOR_TEETH);
		setBracketSlot("0.022");
		setBracketSystem("damon_q2");
		setSelectedActions(["debonding"]);
		setElasticScheme("none");
		setNotes(
			"Окончание активного периода ортодонтического лечения. Атравматичное снятие брекет-системы специальными щипцами. Механическое удаление остатков композита твердосплавными финирами без повреждения эмали, полировка вестибулярных поверхностей. Фиксация несъемного проволочного ретейнера (флекс-дуга 0.0175\") на текучий композит в сегментах 13-23 и 33-43. Сняты оттиски/сканы для изготовления ретенционных капп. Окклюзия стабильна.",
		);
		showToast("Пресет: Снятие брекетов + ретейнер применен", "info");
	};

	const handlePresetAlignerLabOrder = () => {
		setActivePreset(null);
		setNotes(
			"Сняты высокоточные оптические оттиски (3D интраоральное сканирование) для изготовления комплекта ортодонтических элайнеров / ретенционных капп в ЗТЛ. Наряд сформирован (срок 5 рабочих дней). План лечения активен без бюрократических согласований (Мандат 8e)."
		);
		showToast("1-клик: Наряд на каппы/элайнеры в ЗТЛ сформирован", "success");
	};

	// Aligner Attachments 1-Click Handlers (Mandates 8e, 8k, 8n)
	const handleSelectAttachmentPreset = (presetId: string) => {
		const preset = ALIGNER_ATTACHMENT_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;
		setActiveAttachmentPreset(presetId);
		setActivePreset(null);
		setBracketSystem("aligners");
		setTargetArch("both");
		if (preset.teeth && preset.teeth.length > 0) {
			setSelectedTeeth(preset.teeth);
		}
		setNotes(preset.description);
		showToast(`${preset.shortLabel} выбран`, "info");
	};

	const handleIssueAlignerSetFromWidget = (count: number, days: number) => {
		setAlignerSetIssued({ count, days });
		onIssueAlignerSet?.(count, days);
		const issueSummary = `Сдан сет элайнеров (${count} каппы на ${days} дн., режим 22 ч/сутки)`;
		showToast(`${issueSummary}`, "success");
	};

	const handleApplyAttachmentsProtocol = useCallback(() => {
		const currentPreset =
			ALIGNER_ATTACHMENT_PRESETS.find((p) => p.id === activeAttachmentPreset) ||
			ALIGNER_ATTACHMENT_PRESETS[0];
		const textToAppend =
			currentPreset?.description ||
			"Композитные аттачменты элайнеров зафиксированы/проверены по протоколу.";

		const alignerServices = calculateOrthodonticServices804n({
			bracketSystem: "aligners",
			activeAttachmentPreset: activeAttachmentPreset || "standard",
			isAttachmentsOnly: true,
			selectedTooth: selectedTooth ?? undefined,
		});

		try {
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				setVisitNoteForm((prev) => {
					const prevObjective = prev.objectiveStatus || "";
					const newObjective = prevObjective
						? `${prevObjective}\n\n[Аттачменты элайнеров]\n${textToAppend}`
						: `[Аттачменты элайнеров]\n${textToAppend}`;

					const prevPlan = prev.treatmentPlan || "";
					const newPlan = prevPlan
						? `${prevPlan}\n\n[Ортодонтия] Элайнеры: ${currentPreset?.shortLabel || "контроль аттачментов"}`
						: `[Ортодонтия] Элайнеры: ${currentPreset?.shortLabel || "контроль аттачментов"}.`;

					return {
						...prev,
						objectiveStatus: newObjective,
						treatmentPlan: newPlan,
					};
				});
			}

			// Reactive event for SOAP note editors
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							protocolText: `[Аттачменты элайнеров]\n${textToAppend}`,
							title: "Аттачменты элайнеров",
							soap: {
								objective: textToAppend,
								plan: `Элайнеры: ${currentPreset?.shortLabel || "контроль аттачментов"}`,
							},
							mode: "smart_append",
							immediate: true,
						},
					}),
				);

				// Auto-dispatch services to invoice
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							services: alignerServices,
							toothNumber: selectedTooth ?? undefined,
							stageKind: "stage_ortho",
						},
					}),
				);
			}

			onAddToInvoice?.(alignerServices);

			if (navigator?.clipboard?.writeText) {
				navigator.clipboard.writeText(textToAppend).catch(() => {});
			}

			const codesList = alignerServices.map((s) => s.code).join(", ");
			showToast(
				`Аттачменты внесены в дневник 043/у и услуги 804н (${codesList}) начислены в смету!`,
				"success",
			);
		} catch (_err) {
			showToast("Протокол скопирован в буфер обмена", "info");
			if (navigator?.clipboard?.writeText) {
				navigator.clipboard.writeText(textToAppend).catch(() => {});
			}
		}
	}, [activeAttachmentPreset, selectedTooth, onAddToInvoice]);

	const handleAppendAttachmentsToSoapNote = handleApplyAttachmentsProtocol;

	// Quick Arch Selectors
	const handleSelectArch = (arch: TargetArch) => {
		setActivePreset(null);
		setTargetArch(arch);
		if (arch === "upper") {
			setSelectedTeeth([17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27]);
		} else if (arch === "lower") {
			setSelectedTeeth([47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37]);
		} else {
			setSelectedTeeth([
				17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
				47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
			]);
		}
	};

	const handleToggleTooth = (tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b),
		);
		onSelectTooth?.(tooth);
	};

	const handleToggleAction = (actionId: string) => {
		setSelectedActions((prev) =>
			prev.includes(actionId) ? prev.filter((a) => a !== actionId) : [...prev, actionId],
		);
	};

	// Protocol Text Synthesis (SOAP Form 043/u)
	const generatedProtocol = useMemo(() => {
		const dateStr = new Date().toLocaleDateString("ru-RU");
		const systemObj = BRACKET_SYSTEMS.find((b) => b.id === bracketSystem);
		const materialObj = ARCHWIRE_MATERIALS.find((m) => m.id === archwireMaterial);
		const elasticObj = ELASTIC_SCHEMES.find((e) => e.id === elasticScheme);
		const elasticSizeObj = ELASTIC_SIZES.find((s) => s.id === elasticSize);

		const archLabel =
			targetArch === "upper"
				? "Верхняя челюсть (ВЧ)"
				: targetArch === "lower"
					? "Нижняя челюсть (НЧ)"
					: "Верхняя и нижняя челюсти (ВЧ + НЧ)";

		const teethListStr =
			selectedTeeth.length > 0
				? selectedTeeth.join(", ")
				: "аппаратура не активирована";

		const actionsListStr = selectedActions
			.map((aId) => CLINICAL_ACTIONS.find((a) => a.id === aId)?.label)
			.filter(Boolean)
			.join("; ");

		const angleObj = ANGLE_CLASS_OPTIONS.find((a) => a.id === angleClass);
		const angleText = angleObj
			? `• Прикус (классификация Энгля): ${angleObj.label}.\n`
			: "• Прикус (классификация Энгля): I класс по Энглю (нейтральный прикус).\n";

		let elasticsText = "Межчелюстная тяга не назначена.";
		if (elasticScheme !== "none") {
			elasticsText = `Межчелюстные эластики: ${elasticObj?.label || ""} (${elasticSizeObj?.label || ""}, ${elasticSizeObj?.strength || ""}). Режим ношения: ${elasticWear}.`;
		}

		let powerChainText = "";
		if (selectedActions.includes("power_chain")) {
			powerChainText = `\nУстановлена эластическая цепочка Power Chain (${powerChainType === "short" ? "короткий шаг" : powerChainType === "long" ? "длинный шаг" : "сплошная"}) в сегменте ${powerChainSpan}.`;
		}

		let attachmentText = "";
		const currentAttachmentObj = ALIGNER_ATTACHMENT_PRESETS.find((p) => p.id === activeAttachmentPreset);
		if (currentAttachmentObj) {
			attachmentText = `• Аттачменты элайнеров: ${currentAttachmentObj.description}`;
		}

		let alignerSetText = "";
		if (alignerSetIssued) {
			alignerSetText = `• Выдача элайнеров: выдан следующий сет капп (+${alignerSetIssued.days} дн., ${alignerSetIssued.count} каппы). Режим ношения: 22 ч/сутки.`;
		}

		let plateText = "";
		if (bracketSystem === "removable_plate") {
			plateText = `• Состояние аппарата: съемная пластинка с расширяющим винтом на ${archLabel}. Фиксация стабильна, кламмеры и вестибулярная дуга адаптированы. Раскрутка винта: ${plateActivationTurns}/4 оборота (${(plateActivationTurns * 0.25).toFixed(2)} мм).`;
		}

		let archwireText = `• Текущая дуга: ${archLabel} — ${materialObj?.badge || ""} сечением ${archwireSection}".`;
		if (bracketSystem === "aligners" || activeAttachmentPreset) {
			archwireText = "• Состояние аппаратуры: прозрачные каппы (элайнеры), фиксация на аттачментах плотная, окклюзионных помех нет.";
		} else if (bracketSystem === "removable_plate") {
			archwireText = plateText;
		} else if (selectedActions.includes("debonding")) {
			archwireText = "• Состояние аппаратуры: брекет-система снята. Зафиксирован несъемный проволочный ретейнер в сегментах 13-23 и 33-43.";
		} else if (activePreset === "wire_change" || notes.includes("верхняя челюсть .016\", нижняя челюсть .014\"")) {
			archwireText = "• Установленные дуги: ВЧ — NiTi .016\", НЧ — NiTi .014\" (круглые нивелирующие, норма).";
		} else if (activePreset === "activation") {
			archwireText = `• Текущие дуги: ${archLabel} — ${materialObj?.badge || ""} сечением ${archwireSection}" (дуги сохранены без деформаций, активация замков).`;
		}

		return `ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА (ФОРМА 043/у)
Дата приёма: ${dateStr}
Пациент: ${patientName}

1. ЖАЛОБЫ:
${notes || "Плановый визит по графику ортодонтического лечения. Жалоб на острую боль и отклейку аппаратуры нет."}

2. ОБЪЕКТИВНЫЙ СТАТУС:
${angleText}• Аппаратура: ${
	bracketSystem === "aligners"
		? "Ортодонтические элайнеры (каппы с аттачментами)"
		: bracketSystem === "removable_plate"
			? "Съемный пластиночный аппарат с расширяющим винтом"
			: `${systemObj?.label || "Брекет-система"} (паз ${bracketSlot}")`
}.
• Зона фиксации/активации (зубы): ${teethListStr}.
${attachmentText ? `${attachmentText}\n` : ""}${alignerSetText ? `${alignerSetText}\n` : ""}${archwireText}
• Фиксация аппаратуры стабильна, окклюзионных контактов с замками/каппами не выявлено.

3. ПРОВЕДЁННОЕ ЛЕЧЕНИЕ:
• Выполненные манипуляции: ${actionsListStr || (activeAttachmentPreset ? currentAttachmentObj?.shortLabel : "Активация аппаратуры")}.${powerChainText}
${currentAttachmentObj ? `• ${currentAttachmentObj.description}\n` : ""}${alignerSetIssued ? `• Сдан сет элайнеров на ${alignerSetIssued.days} дн. (смена капп каждые ${Math.round(alignerSetIssued.days / alignerSetIssued.count)} дней).\n` : ""}• ${elasticsText}
• Антисептическая обработка полости рта (0.05% раствор хлоргексидина).
• Коррекция дистальных концов дуг / проверка комфорта краёв капп и мягких тканей.

4. РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ:
${bracketSystem === "aligners" || activeAttachmentPreset
	? `• Ношение элайнеров строго не менее 20–22 часов в сутки (снимать только во время приёма пищи и чистки зубов).
• Использование чувисов (жевательных валиков) для плотной посадки капп на зубах.
• Хранение элайнеров в специальном вентилируемом боксе, промывание прохладной водой.
• Следующий плановый приём: через ${alignerSetIssued ? `${Math.round(alignerSetIssued.days / 7)} недель` : "4–6 недель"}.`
	: bracketSystem === "removable_plate"
		? `• Ношение пластинки строго 20–22 часа в сутки (снимать во время еды и контактного спорта).
• Активация расширяющего винта ключом строго по схеме (1 раз в 7 дней на 1/4 оборота по стрелке).
• Хранение в сухом вентилируемом контейнере, ежедневная механическая чистка зубной щеткой и мылом.
• Следующий контрольный приём: через 4 недели.`
		: `• Строгое соблюдение гигиены (ортодонтическая щетка, монопучок, ершики, ирригатор).
• Использование ортодонтического защитного воска при натирании.
• Исключить из рациона твердую, волокнистую и липкую пищу.
• Следующий плановый приём: через 4–6 недель.`}`;
	}, [
		bracketSlot,
		bracketSystem,
		archwireMaterial,
		archwireSection,
		targetArch,
		elasticScheme,
		elasticSize,
		elasticWear,
		selectedActions,
		selectedTeeth,
		powerChainSpan,
		powerChainType,
		notes,
		patientName,
		activePreset,
		activeAttachmentPreset,
		alignerSetIssued,
		angleClass,
		plateActivationTurns,
	]);

	// Apply to Form 043/u and auto-dispatch to invoice
	const handleApplyToVisitNote = useCallback(() => {
		const currentAttachmentObj = ALIGNER_ATTACHMENT_PRESETS.find((p) => p.id === activeAttachmentPreset);
		const servicesToDispatch = calculatedServices804n;

		try {
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				setVisitNoteForm((prev) => ({
					...prev,
					complaint: prev.complaint
						? `${prev.complaint}\n\n[Ортодонтия] ${notes}`
						: `Плановый ортодонтический приём. ${notes}`,
					objectiveStatus: prev.objectiveStatus
						? `${prev.objectiveStatus}\n\n${generatedProtocol}`
						: generatedProtocol,
					treatmentPlan: prev.treatmentPlan
						? `${prev.treatmentPlan}\n\n[Ортодонтия] ${activeAttachmentPreset ? `Элайнеры: ${currentAttachmentObj?.shortLabel || "аттачменты"}` : bracketSystem === "removable_plate" ? `Пластинка с винтом (активация ${plateActivationTurns}/4 об.)` : `Дуга ${archwireMaterial} ${archwireSection}", ${elasticScheme !== "none" ? "эластики" : "активация"}`}`
						: `Ортодонтическое лечение: ${activeAttachmentPreset ? `Элайнеры (${currentAttachmentObj?.shortLabel || "аттачменты"})` : bracketSystem === "removable_plate" ? `пластинка с расширяющим винтом (${plateActivationTurns}/4 об.)` : `дуга ${archwireMaterial} ${archwireSection}", ${elasticScheme !== "none" ? "межчелюстная тяга" : "плановая активация"}`}.`,
				}));
			}

			// Reactive event for SOAP note editors
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							protocolText: generatedProtocol,
							title: "Ортодонтический протокол (брекеты & дуги)",
							angleClass,
						},
					}),
				);

				// Auto-dispatch services to invoice
				if (servicesToDispatch.length > 0) {
					window.dispatchEvent(
						new CustomEvent("dente-add-services-to-invoice", {
							detail: {
								services: servicesToDispatch,
								toothNumber: selectedTooth ?? undefined,
								stageKind: "stage_ortho",
							},
						}),
					);
				}
			}

			if (servicesToDispatch.length > 0) {
				onAddToInvoice?.(servicesToDispatch);
			}

			// Copy to clipboard silently
			if (navigator?.clipboard?.writeText) {
				navigator.clipboard.writeText(generatedProtocol).catch(() => {});
			}

			const codesStr = servicesToDispatch.map((s) => s.code).join(", ");
			showToast(
				servicesToDispatch.length > 0
					? `Протокол сохранен в карту 043/у и ${servicesToDispatch.length} услуг 804н (${codesStr}) добавлены в смету!`
					: "Ортодонтический протокол сохранен в карту 043/у!",
				"success",
			);
			onClose();
		} catch (_err) {
			showToast("Протокол скопирован в буфер обмена", "info");
			if (navigator?.clipboard?.writeText) {
				navigator.clipboard.writeText(generatedProtocol).catch(() => {});
			}
		}
	}, [
		calculatedServices804n,
		activeAttachmentPreset,
		notes,
		generatedProtocol,
		bracketSystem,
		plateActivationTurns,
		archwireMaterial,
		archwireSection,
		elasticScheme,
		angleClass,
		selectedTooth,
		onAddToInvoice,
		onClose,
	]);

	const handleCopyClipboard = () => {
		if (navigator?.clipboard?.writeText) {
			navigator.clipboard.writeText(generatedProtocol).then(() => {
				showToast("Протокол 043/у скопирован в буфер обмена", "success");
			}).catch(() => {
				showToast("Не удалось скопировать", "error");
			});
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="ortho-protocol-title"
			data-testid="orthodontic-visit-protocol-widget"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-4 py-3 bg-[var(--surface,#f8fafc)] dark:bg-slate-800/80 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 shrink-0">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
							<Sparkles size={18} />
						</div>
						<div>
							<h2 id="ortho-protocol-title" className="text-base font-black text-[var(--ink,#0f172a)] dark:text-white m-0">
								Ортодонтический протокол приёма
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0">
								1-клик выбор брекетов, дуг, сечений и эластиков · {patientName}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleAddServicesToInvoice}
							className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
							data-testid="add-ortho-services-to-invoice-btn"
							title="Начислить услуги Номенклатуры 804н в чек/смету визита (1 клик)"
						>
							<Receipt size={16} />
							<span>Начислить услуги 804н в чек/смету</span>
							<span
								className="px-1.5 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white min-w-[20px] text-center"
								data-testid="ortho-services-count-badge"
							>
								{calculatedServices804n.length}
							</span>
						</button>

						<button
							type="button"
							onClick={handleApplyToVisitNote}
							className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
							data-testid="apply-to-form-043-btn"
							title="Вставить протокол в карту 043/у и начислить услуги 804н"
						>
							<CheckCircle2 size={16} />
							<span>В карту 043/у</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white transition-colors cursor-pointer"
							aria-label="Закрыть"
							data-testid="close-ortho-protocol-btn"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Modal Body: 2 Columns (Controls + Live Protocol Preview) */}
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto">
					{/* Left Column: 1-Click Fast Ortho Controls */}
					<div className="lg:col-span-7 p-4 sm:p-5 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-[var(--line,#e2e8f0)] dark:border-slate-800 overflow-y-auto">
						{/* 0. Autonomous 1-Click Clinical Presets Panel */}
						<div
							data-testid="ortho-quick-presets-panel"
							className="bg-amber-500/10 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-500/30 flex flex-col gap-2.5"
						>
							<div className="flex items-center justify-between flex-wrap gap-1">
								<span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
									<Zap size={14} className="text-amber-600 dark:text-amber-400 fill-amber-500" />
									Быстрые клинические пресеты (1 клик)
								</span>
								<span className="text-[11px] font-bold text-amber-700/80 dark:text-amber-400/80">
									Мгновенное заполнение параметров и дневника 043/у
								</span>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<button
									type="button"
									onClick={handlePresetActivation}
									data-testid="ortho-preset-routine-activation"
									className={`min-h-[44px] p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
										activePreset === "activation"
											? "bg-amber-500 text-white border-amber-600 shadow-sm font-black ring-2 ring-amber-400"
											: "bg-white dark:bg-slate-900 border-amber-500/30 hover:border-amber-500 text-slate-800 dark:text-slate-100"
									}`}
								>
									<div
										className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
											activePreset === "activation"
												? "bg-white/20 text-white"
												: "bg-amber-500/15 text-amber-600 dark:text-amber-400"
										}`}
									>
										<RotateCcw size={14} />
									</div>
									<div className="min-w-0 flex-1">
										<div className="text-xs font-bold leading-tight">
											1-клик: Плановая активация
										</div>
										<div
											className={`text-[10px] truncate ${
												activePreset === "activation"
													? "text-amber-100"
													: "text-slate-500 dark:text-slate-400"
											}`}
										>
											(смена лигатур / эластиков, дуги сохранены)
										</div>
									</div>
								</button>

								<button
									type="button"
									onClick={handlePresetWireChange}
									data-testid="ortho-preset-wire-change"
									className={`min-h-[44px] p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
										activePreset === "wire_change"
											? "bg-amber-500 text-white border-amber-600 shadow-sm font-black ring-2 ring-amber-400"
											: "bg-white dark:bg-slate-900 border-amber-500/30 hover:border-amber-500 text-slate-800 dark:text-slate-100"
									}`}
								>
									<div
										className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
											activePreset === "wire_change"
												? "bg-white/20 text-white"
												: "bg-amber-500/15 text-amber-600 dark:text-amber-400"
										}`}
									>
										<Zap size={14} />
									</div>
									<div className="min-w-0 flex-1">
										<div className="text-xs font-bold leading-tight">
											1-клик: Смена дуг
										</div>
										<div
											className={`text-[10px] truncate ${
												activePreset === "wire_change"
													? "text-amber-100"
													: "text-slate-500 dark:text-slate-400"
											}`}
										>
											(NiTi верх 0.016 / низ 0.014, норма)
										</div>
									</div>
								</button>

								<button
									type="button"
									onClick={handlePresetBonding}
									data-testid="ortho-preset-bracket-bonding"
									className={`min-h-[44px] p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
										activePreset === "bonding"
											? "bg-amber-500 text-white border-amber-600 shadow-sm font-black ring-2 ring-amber-400"
											: "bg-white dark:bg-slate-900 border-amber-500/30 hover:border-amber-500 text-slate-800 dark:text-slate-100"
									}`}
								>
									<div
										className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
											activePreset === "bonding"
												? "bg-white/20 text-white"
												: "bg-amber-500/15 text-amber-600 dark:text-amber-400"
										}`}
									>
										<Sparkles size={14} />
									</div>
									<div className="min-w-0 flex-1">
										<div className="text-xs font-bold leading-tight">
											1-клик: Фиксация брекет-системы
										</div>
										<div
											className={`text-[10px] truncate ${
												activePreset === "bonding"
													? "text-amber-100"
													: "text-slate-500 dark:text-slate-400"
											}`}
										>
											(1 челюсть)
										</div>
									</div>
								</button>

								<button
									type="button"
									onClick={handlePresetDebonding}
									data-testid="ortho-preset-debonding-retainer"
									className={`min-h-[44px] p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
										activePreset === "debonding"
											? "bg-amber-500 text-white border-amber-600 shadow-sm font-black ring-2 ring-amber-400"
											: "bg-white dark:bg-slate-900 border-amber-500/30 hover:border-amber-500 text-slate-800 dark:text-slate-100"
									}`}
								>
									<div
										className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
											activePreset === "debonding"
												? "bg-white/20 text-white"
												: "bg-amber-500/15 text-amber-600 dark:text-amber-400"
										}`}
									>
										<CheckCircle2 size={14} />
									</div>
									<div className="min-w-0 flex-1">
										<div className="text-xs font-bold leading-tight">
											1-клик: Снятие брекет-системы
										</div>
										<div
											className={`text-[10px] truncate ${
												activePreset === "debonding"
													? "text-amber-100"
													: "text-slate-500 dark:text-slate-400"
											}`}
										>
											(+ установка несъемного ретейнера)
										</div>
									</div>
								</button>

								<button
									type="button"
									onClick={handlePresetAlignerLabOrder}
									data-testid="ortho-preset-aligner-lab-order"
									className="min-h-[44px] p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer bg-white dark:bg-slate-900 border-teal-500/40 hover:border-teal-500 text-slate-800 dark:text-slate-100"
								>
									<div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-teal-500/15 text-teal-600 dark:text-teal-400">
										<Zap size={14} />
									</div>
									<div className="min-w-0 flex-1">
										<div className="text-xs font-bold leading-tight text-teal-700 dark:text-teal-300">
											1-клик: Наряд ЗТЛ (Элайнеры / Каппа)
										</div>
										<div className="text-[10px] truncate text-slate-500 dark:text-slate-400">
											(срок 5 раб. дней, без согласований начмеда)
										</div>
									</div>
								</button>
							</div>

							<div className="flex items-center gap-2 p-2.5 rounded-lg bg-teal-500/10 dark:bg-teal-950/30 border border-teal-500/20 text-xs">
								<CheckCircle2 size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span className="text-[11px] font-bold text-teal-900 dark:text-teal-200">
									Мандат 8e: Истечение 30 дней плана НЕ БЛОКИРУЕТ ортодонтические манипуляции, заказ капп/элайнеров в ЗТЛ или оплату.
								</span>
							</div>
						</div>

						{/* 0.5 Express-Block: Aligner Attachments & Delivery (Mandates 8e, 8k, 8n) */}
						<div
							data-testid="aligner-attachments-express-block"
							className="bg-indigo-50/70 dark:bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/50 flex flex-col gap-2.5"
						>
							<div className="flex items-center justify-between flex-wrap gap-1">
								<span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
									<Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
									Аттачменты элайнеров
								</span>
								<span className="text-[11px] font-bold text-indigo-700/80 dark:text-indigo-400/80">
									Экспресс-фиксация & контроль (1 клик)
								</span>
							</div>

							{/* 4 Quick Presets */}
							<div className="grid grid-cols-1 gap-1.5">
								{ALIGNER_ATTACHMENT_PRESETS.map((preset) => {
									const isSelected = activeAttachmentPreset === preset.id;
									return (
										<button
											key={preset.id}
											type="button"
											onClick={() => handleSelectAttachmentPreset(preset.id)}
											data-testid={`preset-${preset.id}-attachments`}
											className={`min-h-[44px] p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
												isSelected
													? "bg-indigo-600 text-white border-indigo-700 shadow-sm font-black ring-2 ring-indigo-400"
													: "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900 hover:border-indigo-400 text-slate-800 dark:text-slate-100"
											}`}
										>
											<div
												className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
													isSelected
														? "bg-white/20 text-white"
														: "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300"
												}`}
											>
												<Zap size={13} />
											</div>
											<div className="min-w-0 flex-1">
												<div className="text-xs font-bold leading-tight">
													{preset.label}
												</div>
												<div
													className={`text-[10px] line-clamp-1 mt-0.5 ${
														isSelected
															? "text-indigo-100"
															: "text-slate-500 dark:text-slate-400"
													}`}
												>
													{preset.description}
												</div>
											</div>
										</button>
									);
								})}
							</div>

							{/* Quick Set Delivery & Append Button */}
							<div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-indigo-200/50 dark:border-indigo-800/40">
								<div className="flex items-center gap-1.5 flex-wrap">
									<button
										type="button"
										onClick={() => handleIssueAlignerSetFromWidget(2, 14)}
										data-testid="widget-issue-set-2-aligners-btn"
										className={`min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
											alignerSetIssued?.count === 2
												? "bg-teal-600 text-white border-teal-700"
												: "bg-white dark:bg-slate-900 border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50"
										}`}
										title="Выдать следующий сет из 2 капп на 14 дней"
									>
										<Zap size={13} />
										<span>Сет 2 каппы (+14 дн.)</span>
									</button>

									<button
										type="button"
										onClick={() => handleIssueAlignerSetFromWidget(4, 28)}
										data-testid="widget-issue-set-4-aligners-btn"
										className={`min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
											alignerSetIssued?.count === 4
												? "bg-teal-600 text-white border-teal-700"
												: "bg-white dark:bg-slate-900 border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50"
										}`}
										title="Выдать следующий сет из 4 капп на 28 дней"
									>
										<Zap size={13} />
										<span>Сет 4 каппы (+28 дн.)</span>
									</button>
								</div>

								<button
									type="button"
									onClick={handleAppendAttachmentsToSoapNote}
									data-testid="append-attachments-to-soap-btn"
									className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
									title="Добавить протокол в дневник визита без стирания ранее набранного текста"
								>
									<Plus size={15} />
									<span>Внести в дневник 043/у</span>
								</button>
							</div>
						</div>

						{/* 0.8 1-Click Angle Malocclusion Classification Bar (I, II/1, II/2, III) */}
						<div
							data-testid="ortho-angle-class-selector"
							className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2"
						>
							<div className="flex items-center justify-between">
								<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
									<Activity size={14} className="text-blue-500" />
									Прикус по Энглю (1-клик фиксация)
								</span>
								<span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
									{ANGLE_CLASS_OPTIONS.find((a) => a.id === angleClass)?.shortLabel}
								</span>
							</div>

							<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
								{ANGLE_CLASS_OPTIONS.map((opt) => {
									const isSelected = angleClass === opt.id;
									return (
										<button
											key={opt.id}
											type="button"
											onClick={() => setAngleClass(opt.id)}
											data-testid={`angle-class-${opt.id}-btn`}
											className={`min-h-[44px] px-2 py-1.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
												isSelected
													? "bg-blue-600 text-white border-blue-700 font-black shadow-xs ring-1 ring-blue-400"
													: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
											}`}
											title={opt.desc}
										>
											<span className="text-xs font-bold leading-tight">{opt.shortLabel}</span>
											<span className={`text-[10px] truncate w-full ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
												{opt.id === "class_1" ? "Нейтральный" : opt.id === "class_2_div_1" ? "Протрузия" : opt.id === "class_2_div_2" ? "Ретрузия" : "Мезиальный"}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* 1. Dental Arch Quick Presets & Formula */}
						<div className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/50 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
									<Layers size={14} />
									Зубная формула (активация)
								</span>
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={() => handleSelectArch("upper")}
										className={`px-2 py-1 text-[11px] font-bold rounded-md border transition-all cursor-pointer ${
											targetArch === "upper"
												? "bg-blue-500 text-white border-blue-600"
												: "bg-white dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-slate-300 dark:border-slate-700"
										}`}
									>
										Вся ВЧ
									</button>
									<button
										type="button"
										onClick={() => handleSelectArch("lower")}
										className={`px-2 py-1 text-[11px] font-bold rounded-md border transition-all cursor-pointer ${
											targetArch === "lower"
												? "bg-blue-500 text-white border-blue-600"
												: "bg-white dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-slate-300 dark:border-slate-700"
										}`}
									>
										Вся НЧ
									</button>
									<button
										type="button"
										onClick={() => handleSelectArch("both")}
										className={`px-2 py-1 text-[11px] font-bold rounded-md border transition-all cursor-pointer ${
											targetArch === "both"
												? "bg-blue-500 text-white border-blue-600"
												: "bg-white dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-slate-300 dark:border-slate-700"
										}`}
									>
										Обе челюсти
									</button>
									<button
										type="button"
										onClick={() => setSelectedTeeth(ANTERIOR_TEETH)}
										className="px-2 py-1 text-[11px] font-bold rounded-md border bg-white dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
									>
										Фронт
									</button>
									<button
										type="button"
										onClick={() => setSelectedTeeth([])}
										className="p-1 rounded-md text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
										title="Сбросить выбор"
									>
										<RotateCcw size={14} />
									</button>
								</div>
							</div>

							{/* FDI Formula Buttons */}
							<div className="flex flex-col gap-1">
								{/* Upper Arch (18-11 | 21-28) */}
								<div className="flex items-center justify-center gap-0.5 overflow-x-auto py-1">
									{UPPER_TEETH.map((tooth, idx) => {
										const isSelected = selectedTeeth.includes(tooth);
										const isMidline = idx === 7;
										return (
											<React.Fragment key={tooth}>
												<button
													type="button"
													onClick={() => handleToggleTooth(tooth)}
													className={`min-w-[40px] min-h-[40px] p-1 text-xs font-bold rounded flex items-center justify-center transition-all cursor-pointer ${
														isSelected
															? "bg-blue-600 text-white shadow-xs font-black"
															: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400"
													}`}
													title={`Зуб ${tooth}`}
												>
													{tooth}
												</button>
												{isMidline && <div className="w-1.5 h-7 bg-slate-300 dark:bg-slate-700 mx-0.5" />}
											</React.Fragment>
										);
									})}
								</div>

								{/* Lower Arch (48-41 | 31-38) */}
								<div className="flex items-center justify-center gap-0.5 overflow-x-auto py-1">
									{LOWER_TEETH.map((tooth, idx) => {
										const isSelected = selectedTeeth.includes(tooth);
										const isMidline = idx === 7;
										return (
											<React.Fragment key={tooth}>
												<button
													type="button"
													onClick={() => handleToggleTooth(tooth)}
													className={`min-w-[40px] min-h-[40px] p-1 text-xs font-bold rounded flex items-center justify-center transition-all cursor-pointer ${
														isSelected
															? "bg-blue-600 text-white shadow-xs font-black"
															: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400"
													}`}
													title={`Зуб ${tooth}`}
												>
													{tooth}
												</button>
												{isMidline && <div className="w-1.5 h-7 bg-slate-300 dark:bg-slate-700 mx-0.5" />}
											</React.Fragment>
										);
									})}
								</div>
							</div>
						</div>

						{/* 2. Brackets Slot & System */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{/* Slot Selection */}
							<div>
								<span className="block text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-1.5">
									Паз брекетов (Slot)
								</span>
								<div className="grid grid-cols-2 gap-2">
									<button
										type="button"
										onClick={() => setBracketSlot("0.018")}
										className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center transition-all cursor-pointer ${
											bracketSlot === "0.018"
												? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-black shadow-xs"
												: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
										}`}
									>
										<span className="text-sm">0.018"</span>
										<span className="text-[10px] text-slate-500">Низкое трение</span>
									</button>
									<button
										type="button"
										onClick={() => setBracketSlot("0.022")}
										className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center transition-all cursor-pointer ${
											bracketSlot === "0.022"
												? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-black shadow-xs"
												: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
										}`}
									>
										<span className="text-sm">0.022"</span>
										<span className="text-[10px] text-slate-500">Стандарт (MBT/Damon)</span>
									</button>
								</div>
							</div>

							{/* Bracket System */}
							<div>
								<span className="block text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-1.5">
									Брекет-система
								</span>
								<select
									aria-label="Выбор брекет-системы"
									value={bracketSystem}
									onChange={(e) => setBracketSystem(e.target.value)}
									className="w-full min-h-[44px] px-3 py-2 bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-amber-500 cursor-pointer"
								>
									{BRACKET_SYSTEMS.map((s) => (
										<option key={s.id} value={s.id}>
											{s.label} ({s.desc})
										</option>
									))}
								</select>
							</div>
						</div>

						{/* 2.5 Removable Plate Expansion Screw Controls */}
						{bracketSystem === "removable_plate" && (
							<div
								data-testid="ortho-screw-activation-controls"
								className="p-3 rounded-xl bg-orange-500/10 dark:bg-orange-950/30 border border-orange-500/30 flex flex-col gap-2"
							>
								<div className="flex items-center justify-between">
									<span className="text-xs font-black uppercase tracking-wider text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
										<RotateCcw size={14} className="text-orange-600 dark:text-orange-400" />
										Расширяющий винт пластинки
									</span>
									<span className="text-[11px] font-bold text-orange-700 dark:text-orange-300">
										{plateActivationTurns}/4 об. ({(plateActivationTurns * 0.25).toFixed(2)} мм)
									</span>
								</div>
								<div className="flex items-center gap-2">
									{[1, 2, 3, 4].map((turns) => (
										<button
											key={turns}
											type="button"
											onClick={() => {
												setPlateActivationTurns(turns);
												if (!selectedActions.includes("expansion_screw_activation")) {
													setSelectedActions((prev) => [...prev, "expansion_screw_activation"]);
												}
											}}
											data-testid={`screw-turns-${turns}-btn`}
											className={`min-h-[44px] flex-1 px-2 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
												plateActivationTurns === turns
													? "bg-orange-500 text-white border-orange-600 font-black shadow-xs"
													: "bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-800 text-slate-700 dark:text-slate-300 hover:bg-orange-50"
											}`}
										>
											{turns}/4 об. ({(turns * 0.25).toFixed(2)} мм)
										</button>
									))}
								</div>
							</div>
						)}

						{/* 3. Archwire Material (NiTi / CuNiTi / SS / TMA) */}
						<div>
							<span className="block text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-1.5">
								Материал дуги
							</span>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
								{ARCHWIRE_MATERIALS.map((mat) => {
									const isSelected = archwireMaterial === mat.id;
									return (
										<button
											key={mat.id}
											type="button"
											onClick={() => setArchwireMaterial(mat.id)}
											className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center transition-all cursor-pointer ${
												isSelected
													? "bg-teal-500/20 border-teal-500 text-teal-800 dark:text-teal-300 font-black shadow-xs"
													: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
											}`}
										>
											<span className="text-sm">{mat.badge}</span>
											<span className="text-[10px] text-slate-500 truncate w-full text-center">
												{mat.id === "NiTi" ? "Нивелирование" : mat.id === "CuNiTi" ? "Термо" : mat.id === "SS" ? "Сталь" : "Бета-титан"}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* 4. Archwire Section (Round / Rectangular) */}
						<div>
							<div className="flex items-center justify-between mb-1.5">
								<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400">
									Сечение дуги
								</span>
								<span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
									Выбрано: {archwireSection}"
								</span>
							</div>

							<div className="flex flex-col gap-2">
								{/* Round sections */}
								<div className="flex items-center gap-1.5 flex-wrap">
									<span className="text-[11px] font-bold text-slate-400 w-16 shrink-0">Круглые:</span>
									{ROUND_SECTIONS.map((sec) => {
										const isSelected = archwireSection === sec;
										return (
											<button
												key={sec}
												type="button"
												onClick={() => setArchwireSection(sec)}
												className={`min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
													isSelected
														? "bg-amber-500 text-white border-amber-600 font-black shadow-xs"
														: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
												}`}
											>
												{sec}"
											</button>
										);
									})}
								</div>

								{/* Rectangular sections */}
								<div className="flex items-center gap-1.5 flex-wrap">
									<span className="text-[11px] font-bold text-slate-400 w-16 shrink-0">Прямоуг.:</span>
									{RECT_SECTIONS.map((sec) => {
										const isSelected = archwireSection === sec;
										return (
											<button
												key={sec}
												type="button"
												onClick={() => setArchwireSection(sec)}
												className={`min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
													isSelected
														? "bg-amber-500 text-white border-amber-600 font-black shadow-xs"
														: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
												}`}
											>
												{sec}"
											</button>
										);
									})}
								</div>

								{/* Canonical Workhorse Archwires Strip (1-click fast wires) */}
								<div
									data-testid="ortho-workhorse-wires-strip"
									className="mt-2 p-2.5 rounded-xl bg-teal-500/10 dark:bg-teal-950/30 border border-teal-500/30 flex flex-col gap-1.5"
								>
									<div className="flex items-center justify-between">
										<span className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1">
											<Zap size={13} className="text-teal-600 dark:text-teal-400" />
											Рабочие дуги ортодонта (1 клик)
										</span>
										<span className="text-[10px] text-teal-700/80 dark:text-teal-400/80 font-bold">
											Мгновенный выбор материала и сечения
										</span>
									</div>

									<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
										{WORKHORSE_ARCHWIRES.map((wire) => {
											const isSelected = archwireMaterial === wire.material && archwireSection === wire.section;
											return (
												<button
													key={wire.id}
													type="button"
													onClick={() => handleSelectWorkhorseArchwire(wire)}
													data-testid={`quick-wire-${wire.id}-btn`}
													className={`min-h-[44px] px-2 py-1 rounded-lg border text-left flex flex-col justify-center transition-all cursor-pointer ${
														isSelected
															? "bg-teal-600 text-white border-teal-700 font-black shadow-xs ring-1 ring-teal-400"
															: "bg-white dark:bg-slate-900 border-teal-300/60 dark:border-teal-800 hover:border-teal-500 text-slate-800 dark:text-slate-100"
													}`}
													title={wire.desc}
												>
													<span className="text-xs font-bold leading-tight">{wire.label}</span>
													<span className={`text-[10px] truncate ${isSelected ? "text-teal-100" : "text-slate-500 dark:text-slate-400"}`}>
														{wire.material === "SS" ? "Рабочая сталь" : "Нивелирование"}
													</span>
												</button>
											);
										})}
									</div>
								</div>
							</div>
						</div>

						{/* 5. Intermaxillary Elastics */}
						<div className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2.5">
							<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
								<Zap size={14} className="text-purple-500" />
								Межчелюстные эластики (тяга)
							</span>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<div>
									<label className="block text-[11px] font-bold text-slate-500 mb-1">
										Схема фиксации
									</label>
									<select
										aria-label="Схема эластиков"
										value={elasticScheme}
										onChange={(e) => setElasticScheme(e.target.value)}
										className="w-full min-h-[38px] px-2.5 py-1 bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none"
									>
										{ELASTIC_SCHEMES.map((e) => (
											<option key={e.id} value={e.id}>
												{e.label}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="block text-[11px] font-bold text-slate-500 mb-1">
										Размер и сила (калибр)
									</label>
									<select
										aria-label="Размер эластиков"
										disabled={false}
										value={elasticSize}
										onClick={handleElasticSizeInteraction}
										onFocus={handleElasticSizeInteraction}
										onChange={(e) => {
											handleElasticSizeInteraction();
											setElasticSize(e.target.value);
										}}
										className="w-full min-h-[38px] px-2.5 py-1 bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none"
									>
										{ELASTIC_SIZES.map((s) => (
											<option key={s.id} value={s.id}>
												{s.label} ({s.strength})
											</option>
										))}
									</select>
								</div>
							</div>
						</div>

						{/* 6. Clinical Actions Checklist */}
						<div>
							<span className="block text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-1.5">
								Манипуляции приёма
							</span>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{CLINICAL_ACTIONS.map((action) => {
									const isChecked = selectedActions.includes(action.id);
									return (
										<label
											key={action.id}
											className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
												isChecked
													? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-900 dark:text-blue-300"
													: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
											}`}
										>
											<input
												type="checkbox"
												checked={isChecked}
												onChange={() => handleToggleAction(action.id)}
												className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
											/>
											<span>{action.label}</span>
										</label>
									);
								})}
							</div>
						</div>
					</div>

					{/* Right Column: Live Form 043/u Protocol Preview & Quick Copy */}
					<div className="lg:col-span-5 p-4 sm:p-5 flex flex-col gap-3 bg-[var(--surface,#f8fafc)]/60 dark:bg-slate-900/60 overflow-y-auto">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<FileText size={16} className="text-amber-500" />
								<span className="text-xs font-black uppercase tracking-wider text-[var(--ink,#0f172a)] dark:text-slate-200">
									Дневник приёма (Форма 043/у)
								</span>
							</div>

							<button
								type="button"
								onClick={handleCopyClipboard}
								className="min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
								title="Скопировать протокол в буфер"
							>
								<Copy size={13} />
								<span>Копировать</span>
							</button>
						</div>

						{/* Preformatted Protocol Text Box */}
						<div className="flex-1 min-h-[300px] max-h-[460px] p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text shadow-inner">
							{generatedProtocol}
						</div>

						{/* 1-Click Action Bar */}
						<div className="flex items-center gap-2 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<button
								type="button"
								onClick={handleAddServicesToInvoice}
								className="min-h-[48px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
								data-testid="bottom-add-services-to-invoice-btn"
								title="Начислить услуги 804н в чек/смету"
							>
								<Receipt size={16} />
								<span>Начислить услуги 804н ({calculatedServices804n.length})</span>
							</button>

							<button
								type="button"
								onClick={handleApplyToVisitNote}
								className="flex-1 min-h-[48px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
								data-testid="bottom-apply-protocol-btn"
							>
								<Check size={18} />
								<span>Вставить в карту 043/у (1 клик)</span>
							</button>

							<button
								type="button"
								onClick={onClose}
								className="min-h-[48px] px-4 py-2 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
							>
								Отмена
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

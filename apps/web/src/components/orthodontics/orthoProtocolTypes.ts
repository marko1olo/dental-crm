import {
	ELASTIC_SCHEMES,
	ELASTIC_SIZES,
} from "./OrthoArchwireSelector";
import { BRACKET_SYSTEMS } from "./OrthoBracketProtocolSection";

export type OrthodonticStageFilter =
	| "all"
	| "leveling"
	| "working"
	| "finishing"
	| "aligners"
	| "retention";

export const ORTHODONTIC_STAGE_TABS: Array<{
	id: OrthodonticStageFilter;
	label: string;
	shortLabel: string;
	desc: string;
}> = [
	{ id: "all", label: "Все этапы", shortLabel: "Все", desc: "Полный клинический арсенал" },
	{ id: "leveling", label: "1. Нивелирование", shortLabel: "Нивелирование", desc: "NiTi .012–.016, фиксация аппаратуры" },
	{ id: "working", label: "2. Рабочий / Юстировка", shortLabel: "Рабочий", desc: "Сталь SS, чейн, эластики, закрытие промежутков" },
	{ id: "finishing", label: "3. Детализация & Торк", shortLabel: "Торк & Детализация", desc: "ТМА, расчет торка резцов и ангуляции" },
	{ id: "aligners", label: "4. Элайнеры & Каппы", shortLabel: "Элайнеры", desc: "Трекер капп 1..N, аттачменты, выдача сетов" },
	{ id: "retention", label: "5. Снятие & Ретенция", shortLabel: "Ретенция", desc: "Снятие брекетов, ретейнеры, ретенционные каппы" },
];

export type TargetArch = "upper" | "lower" | "both";

export interface OrthodonticService804n {
	code: string;
	nameRu: string;
	priceRub: number;
	stageKind: "stage_ortho";
	toothNumber?: number | undefined;
	arch?: TargetArch | undefined;
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
	separation: [
		{
			code: "A16.07.048.003",
			nameRu: "Установка сепарационных эластиков / сепарация",
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
	targetArch?: TargetArch | undefined;
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
				if (actionId === "wire_change" && item.code === "A16.07.048.002") {
					if (params.targetArch === "both") {
						rawServices.push({
							...item,
							nameRu: "Смена ортодонтической дуги (ВЧ)",
							stageKind: "stage_ortho",
							arch: "upper",
						});
						rawServices.push({
							...item,
							nameRu: "Смена ортодонтической дуги (НЧ)",
							stageKind: "stage_ortho",
							arch: "lower",
						});
					} else if (params.targetArch === "upper" || params.targetArch === "lower") {
						const label = params.targetArch === "upper" ? " (ВЧ)" : " (НЧ)";
						rawServices.push({
							...item,
							nameRu: `${item.nameRu}${label}`,
							stageKind: "stage_ortho",
							arch: params.targetArch,
						});
					} else {
						rawServices.push({
							...item,
							stageKind: "stage_ortho",
						});
					}
				} else {
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
	}

	const servicesMap = new Map<string, OrthodonticService804n>();
	for (const s of rawServices) {
		const key = `${s.code}_${s.arch || ""}_${s.toothNumber || ""}`;
		if (!servicesMap.has(key)) {
			servicesMap.set(key, s);
		}
	}

	return Array.from(servicesMap.values());
}

export interface OrthodonticVisitProtocolWidgetProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string | undefined;
	patientName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	selectedTooth?: number | null;
	onSelectTooth?: (toothNumber: number) => void;
	currentAligner?: number | undefined;
	totalAligners?: number | undefined;
	currentAlignerUpper?: number | undefined;
	currentAlignerLower?: number | undefined;
	totalAlignersUpper?: number | undefined;
	totalAlignersLower?: number | undefined;
	onIssueAlignerSet?: ((count: number, days: number) => void) | undefined;
	onAddToInvoice?: ((services: OrthodonticService804n[]) => void) | undefined;
}

export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const ANTERIOR_TEETH = [13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33];

export const CLINICAL_ACTIONS = [
	{ id: "wire_change", label: "Смена дуги + активация замков" },
	{ id: "ligature_change", label: "Смена эластических лигатур" },
	{ id: "power_chain", label: "Установка цепочки Power Chain" },
	{ id: "rebracket", label: "Переклейка отклеившегося брекета" },
	{ id: "ipr", label: "Сепарация эмали (IPR)" },
	{ id: "separation", label: "Сепарационные эластики (сепараторы)" },
	{ id: "plate_activation", label: "Активация дуги и кламмеров пластинки" },
	{ id: "expansion_screw_activation", label: "Раскрутка расширяющего винта (1/4 об. = 0.25 мм)" },
	{ id: "debonding", label: "Снятие аппаратуры + ретейнер" },
];

export interface OrthodonticPatientMemoParams {
	clinicName: string;
	clinicPhone?: string | undefined;
	doctorName: string;
	patientName: string;
	visitDate?: string | undefined;
	bracketSystem: string;
	archwireMaterial?: string | undefined;
	archwireSection?: string | undefined;
	targetArch?: string | undefined;
	elasticScheme?: string | undefined;
	elasticSize?: string | undefined;
	elasticWear?: string | undefined;
	isAligners?: boolean | undefined;
	currentAligner?: number | undefined;
	totalAligners?: number | undefined;
	currentAlignerUpper?: number | undefined;
	currentAlignerLower?: number | undefined;
	totalAlignersUpper?: number | undefined;
	totalAlignersLower?: number | undefined;
	notes?: string | undefined;
}

export function getRuDateString(d: Date = new Date()): string {
	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	return `${day}.${month}.${year}`;
}

export function formatOrthodonticPatientMemo(
	params: OrthodonticPatientMemoParams,
): string {
	const clinicName = params.clinicName || "Стоматологическая клиника DENTE";
	const clinicPhone = params.clinicPhone || "";
	const doctorName = params.doctorName || "Лечащий врач-ортодонт";
	const patientName = params.patientName || "Пациент";
	const visitDate = params.visitDate || getRuDateString();

	const isAligners = Boolean(
		params.isAligners || params.bracketSystem === "aligners",
	);

	const systems = BRACKET_SYSTEMS;
	const systemObj = systems.find((b) => b.id === params.bracketSystem);
	let systemName = isAligners
		? "Элайнеры"
		: (systemObj ? systemObj.label : params.bracketSystem || "Damon Q2");
	if (!systemName) {
		systemName = "Damon Q2";
	}

	let apparatusDetails = "";
	if (isAligners) {
		if (params.currentAlignerUpper && params.currentAlignerLower) {
			const curU = params.currentAlignerUpper;
			const totalU = params.totalAlignersUpper || params.totalAligners || "—";
			const curL = params.currentAlignerLower;
			const totalL = params.totalAlignersLower || params.totalAligners || "—";
			apparatusDetails = `Текущий этап: ВЧ Каппа №${curU} из ${totalU}, НЧ Каппа №${curL} из ${totalL}\nРежим: ношение 22 часа/сутки, смена через 10-14 дней.\n`;
		} else {
			const cur = params.currentAligner || 1;
			const total = params.totalAligners || "—";
			apparatusDetails = `Текущий этап: Каппа №${cur} из ${total}\nРежим: ношение 22 часа/сутки, смена через 10-14 дней.\n`;
		}
	} else {
		const arch =
			params.targetArch === "upper"
				? "верхняя челюсть"
				: params.targetArch === "lower"
					? "нижняя челюсть"
					: "обе челюсти";
		const mat = params.archwireMaterial || "CuNiTi";
		const sec = params.archwireSection || ".016";
		apparatusDetails = `Установленная дуга: ${mat} ${sec} (${arch})\n`;
	}

	let elasticsBlock = "";
	if (params.elasticScheme && params.elasticScheme !== "none") {
		const schemeObj = ELASTIC_SCHEMES.find((e) => e.id === params.elasticScheme);
		const schemeLabel = schemeObj ? schemeObj.label : params.elasticScheme;

		const sizeObj = ELASTIC_SIZES.find((s) => s.id === params.elasticSize);
		const sizeLabel = sizeObj
			? `${sizeObj.label} (${sizeObj.strength})`
			: (params.elasticSize || "3/16\" Medium");

		const wearMode = params.elasticWear || "22 часа/сутки";

		elasticsBlock = `Схема межчелюстных эластиков (тяг):\n- Направление: ${schemeLabel}\n- Размер/сила: ${sizeLabel}\n- Режим ношения: ${wearMode} (смена на свежие 2 раза в день)\n`;
	}

	return `Ортодонтические рекомендации после приёма (клиника «${clinicName}»):
Пациент: ${patientName}
Лечащий врач: ${doctorName}
Дата приёма: ${visitDate}
Аппаратура: ${systemName}
${apparatusDetails}${elasticsBlock}Памятка пациенту:
1. Первые 2-3 дня возможна умеренная чувствительность зубов при накусывании (физиологическая норма перемещения зубов).
2. Эластики снимаются только во время еды и чистки зубов. При обрыве эластика надеть новый из упаковки.
3. При натирании щеки или губы нанесите защитный ортодонтический воск на выступающий элемент.
4. При отклейке брекета, утере кнопки или дискомфорте от дуги немедленно свяжитесь с клиникой${clinicPhone ? `: ${clinicPhone}` : ""}.
Следующий контрольный визит: через 4–6 недель.`;
}

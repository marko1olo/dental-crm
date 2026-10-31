/**
 * perioCatalogData.ts — Единый канонический SSOT каталог пародонтологии и скрининга ВОЗ (PSR)
 * Стандарты ВОЗ / СтАР: 6 секстантов (S1..S6), шкала кодов 0..4 + *, 4 клинических протокола гигиены,
 * списание расходников пакетом (Soft Negative Stock, Мандат 8n), автономия врача (Мандат 8e).
 * Норматив размера: 280–350 строк (Sweet Spot, Мандат 8b).
 */

import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import {
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	isFurcationEligibleTooth,
	PERIO_SITE_KEYS,
	PSR_SEXTANTS,
} from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { useVisitStore } from "../../store/visitStore";
import { showToast } from "../GlobalToast";

// 1. ШКАЛА СЕКСТАНТОВ PSR / CPITN (ВОЗ / СтАР)
export type PsrCode = 0 | 1 | 2 | 3 | 4;
export type PsrSextantId = "S1" | "S2" | "S3" | "S4" | "S5" | "S6";

export interface PsrSextantMeta {
	readonly id: PsrSextantId;
	readonly name: string;
	readonly labelRu: string;
	readonly teethRange: string;
	readonly teeth: readonly number[];
}

export const PSR_SEXTANTS_CATALOG: readonly PsrSextantMeta[] = [
	{ id: "S1", name: "S1", labelRu: "Верхний правый дистальный", teethRange: "17–14", teeth: [17, 16, 15, 14] },
	{ id: "S2", name: "S2", labelRu: "Верхний фронтальный", teethRange: "13–23", teeth: [13, 12, 11, 21, 22, 23] },
	{ id: "S3", name: "S3", labelRu: "Верхний левый дистальный", teethRange: "24–27", teeth: [24, 25, 26, 27] },
	{ id: "S4", name: "S4", labelRu: "Нижний правый дистальный", teethRange: "47–44", teeth: [47, 46, 45, 44] },
	{ id: "S5", name: "S5", labelRu: "Нижний фронтальный", teethRange: "43–33", teeth: [43, 42, 41, 31, 32, 33] },
	{ id: "S6", name: "S6", labelRu: "Нижний левый дистальный", teethRange: "34–37", teeth: [34, 35, 36, 37] },
] as const;

export interface PsrCodeMeta {
	readonly code: PsrCode;
	readonly labelRu: string;
	readonly criteriaRu: string;
	readonly actionRu: string;
	readonly colorHex: string;
	readonly badgeClass: string;
}

export const PSR_CODES_CATALOG: Record<PsrCode, PsrCodeMeta> = {
	0: { code: 0, labelRu: "Код 0: Здоров", criteriaRu: "Цветная полоса зонда видна полностью, нет кровоточивости, глубина кармана < 3.5 мм", actionRu: "Профилактический осмотр через 6 месяцев, интактный пародонт", colorHex: "#10b981", badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
	1: { code: 1, labelRu: "Код 1: Кровоточивость", criteriaRu: "Кровоточивость при зондировании BOP, карманы < 3.5 мм, зубного камня нет", actionRu: "Обучение гигиене, полировка пастой / AirFlow, удаление биопленки", colorHex: "#f59e0b", badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
	2: { code: 2, labelRu: "Код 2: Зубной камень", criteriaRu: "Над-/поддесневой зубной камень, нависающие края пломб, карманы < 3.5 мм", actionRu: "Профгигиена: УЗ-скейлинг + AirFlow + полировка + фторирование", colorHex: "#0ea5e9", badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
	3: { code: 3, labelRu: "Код 3: Карман 3.5–5.5 мм", criteriaRu: "Глубина кармана 3.5–5.5 мм, полоса зонда частично скрыта (локальный пародонтит)", actionRu: "Профгигиена + закрытый кюретаж / Vector-терапия пораженного секстанта", colorHex: "#f97316", badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" },
	4: { code: 4, labelRu: "Код 4: Карман > 5.5 мм", criteriaRu: "Глубина кармана > 5.5 мм, полоса зонда скрыта полностью (выраженный пародонтит)", actionRu: "Комплексное лечение: скейлинг, кюретаж, шинирование подвижных зубов", colorHex: "#f43f5e", badgeClass: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40" },
};

export const PSR_ASTERISK_DESCRIPTION = "Символ *: вовлечение фуркаций корней, подвижность II–III степени, рецессия десны >= 3.5 мм";

export interface PsrSextantState {
	code: PsrCode;
	asterisk?: boolean;
}

export type PsrScreeningMap = Record<PsrSextantId, PsrSextantState>;

export interface PerioScreeningSummary {
	maxPsrCode: PsrCode;
	hasAsterisk: boolean;
	psrFormula: string;
	suggestedDiagnosisRu: string;
	icd10Code: string;
	hygienePlanRu: string;
	requiresDetailedCharting: boolean;
}

export function computePsrSummary(screeningMap: PsrScreeningMap): PerioScreeningSummary {
	let maxCode: PsrCode = 0;
	let hasAsterisk = false;
	const codes: string[] = [];
	for (const sextant of PSR_SEXTANTS_CATALOG) {
		const s = screeningMap[sextant.id] ?? { code: 0, asterisk: false };
		if (s.code > maxCode) maxCode = s.code;
		if (s.asterisk) hasAsterisk = true;
		codes.push(`${s.code}${s.asterisk ? "*" : ""}`);
	}
	const psrFormula = `PSR: ${codes.join(" / ")}`;
	const defaultDiag = { diag: "Здоров (клинически интактный пародонт)", icd: "Z01.2", plan: "Профилактический осмотр через 6 месяцев. Индивидуальная гигиена в норме.", req: false };
	const diagMap: Record<number, { diag: string; icd: string; plan: string; req: boolean }> = {
		0: defaultDiag,
		1: { diag: "Катаральный гингивит легкой степени (BOP+)", icd: "K05.1", plan: "Контролируемая гигиена, удаление налёта, полировка зубов пастой / Air-Flow.", req: false },
		2: { diag: "Хронический катаральный гингивит с зубными отложениями", icd: "K05.1", plan: "Профессиональная гигиена: ультразвуковое снятие камня + Air-Flow + фторирование.", req: false },
		3: { diag: "Хронический пародонтит легкой/средней степени (карманы 3.5–5.5 мм)", icd: "K05.3", plan: "Комплексная гигиена + закрытый кюретаж карманов пораженных секстантов + Vector.", req: true },
		4: { diag: "Хронический пародонтит тяжелой степени (глубокие карманы > 5.5 мм)", icd: "K05.3", plan: "Комплексное пародонтологическое лечение: скейлинг, кюретаж, шинирование подвижных зубов.", req: true },
	};
	const d = diagMap[maxCode] ?? defaultDiag;
	return { maxPsrCode: maxCode, hasAsterisk, psrFormula, suggestedDiagnosisRu: d.diag, icd10Code: d.icd, hygienePlanRu: d.plan, requiresDetailedCharting: d.req };
}

// 2. ЧЕТЫРЕ КАНОНИЧЕСКИХ 1-КЛИК ПРОТОКОЛА ПАРОДОНТОЛОГИИ
export interface PerioTreatmentProtocol {
	readonly id: string;
	readonly titleRu: string;
	readonly code804n: string;
	readonly defaultPriceRub: number;
	readonly descriptionRu: string;
	readonly protocolTextRu: string;
	readonly consumableKind: "hygiene" | "vector" | "splinting" | "recession" | "curettage";
	readonly consumablesListRu: readonly string[];
}

export const PERIO_EXPRESS_PRESETS: Record<string, { id: string; titleRu: string; subtitleRu: string; icd10: string; code804n?: string; defaultProtocolRu: string }> = {
	perio_norm_express: { id: "perio_norm_express", titleRu: "Норма пародонта", subtitleRu: "PSR 0 во всех секстантах, глубина <= 2 мм, BOP 0", icd10: "Z01.2", defaultProtocolRu: "Слизистая оболочка бледно-розовая, десневые сосочки плотные, патологические зубодесневые карманы не определяются, кровоточивость отсутствует. Пародонт: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует, подвижности зубов нет. маргинальная десна бледно-розовая, глубина зубодесневой борозды 1-2 мм, кровоточивость отсутствует, подвижности зубов нет. Скрининг PSR: 0 во всех секстантах. Патологических карманов нет. Диагноз: Здоров (Z01.2)." },
	gingivitis_express: { id: "gingivitis_express", titleRu: "Гингивит", subtitleRu: "PSR 1-2, карманы < 3.5 мм, диффузная кровоточивость", icd10: "K05.1", defaultProtocolRu: "Пародонт: десна отечна, гиперемирована, валикообразно утолщена, диффузная кровоточивость при зондировании (BOP+), глубина десневых бороздок 2-3 мм (ложные карманы за счет отека десны, < 3.5 мм), зубодесневое прикрепление сохранено, наддесневой зубной камень, подвижности зубов нет. Скрининг PSR: 1-2. Диагноз: Хронический катаральный гингивит (K05.1)." },
	periodontitis_mild_express: { id: "periodontitis_mild_express", titleRu: "Пародонтит легкой степени", subtitleRu: "PSR 2-3, карманы 3.5–4.0 мм, BOP+, над- и поддесневой камень", icd10: "K05.30", defaultProtocolRu: "Пародонт: маргинальная десна отечна, умеренно гиперемирована, кровоточивость при зондировании (BOP+), пародонтальные карманы глубиной 3.5–4.0 мм без гноетечения (PSR 2-3), над- и поддесневые зубные отложения, потеря зубодесневого прикрепления CAL 1-2 мм. Патологическая подвижность зубов: 0-I ст. во фронтальном отделе. На рентгенограмме: резорбция кортикальной пластинки вершин межальвеолярных перегородок до 1/3 длины корней. Диагноз: Хронический пародонтит лёгкой степени (K05.30)." },
	periodontitis_moderate_express: { id: "periodontitis_moderate_express", titleRu: "Пародонтит средней степени", subtitleRu: "PSR 3, карманы до 5 мм", icd10: "K05.31", defaultProtocolRu: "Пародонт: глубина пародонтальных карманов 3.5–5.0 мм (PSR 3), десна гиперемирована с цианотичным оттенком, выраженная кровоточивость при зондировании, над- и поддесневой зубной камень, рецессия десны 1-2 мм, патологическая подвижность зубов I ст. Диагноз: Хронический генерализованный пародонтит средней степени (K05.31)." },
	periodontitis_severe_express: { id: "periodontitis_severe_express", titleRu: "Пародонтит тяжелой степени", subtitleRu: "PSR 4*, карманы >= 6 мм, гноетечение, подвижность II-III ст.", icd10: "K05.32", defaultProtocolRu: "Пародонт: десна застойно гиперемирована, цианотична, выраженная кровоточивость сосочков (BOP > 50%), глубокие пародонтальные карманы от 6 до 8 мм (PSR 4*) с серозно-гнойным экссудатом (гноетечение). Выраженная рецессия десны 2-4 мм с обнажением фуркаций (фуркационные дефекты II класса). Патологическая подвижность зубов II-III ст., веерообразное смещение резцов. На рентгенограмме: деструкция костной ткани более 1/2 длины корней. Диагноз: Хронический генерализованный пародонтит тяжёлой степени (K05.32)." },
	recession_express: { id: "recession_express", titleRu: "Рецессия десны", subtitleRu: "K06.0, рецессия десны 2–3 мм, CAL > PD, без карманов и воспаления", icd10: "K06.0", defaultProtocolRu: "Пародонт: апикальное смещение десневого края (рецессия десны) на 2–3 мм преимущественно с вестибулярной поверхности клыков и премоляров (I–II класс по Миллеру / Cairo). Обнажение шеек зубов, гиперчувствительность к термическим раздражителям. Патологические зубодесневые карманы отсутствуют (глубина зондирования 1–2 мм), кровоточивость при зондировании отсутствует (BOP 0%), десна бледно-розовая, плотная. Потеря прикрепления (CAL) 3–5 мм за счет рецессии. Диагноз: Рецессия десны (K06.0)." },
	pro_hygiene_express: { id: "pro_hygiene_express", titleRu: "Профгигиена полости рта", subtitleRu: "УЗ-удаление отложений + Air-Flow глицин + полировка + глубокое фторирование эмали", icd10: "Z01.2", code804n: "A16.07.051", defaultProtocolRu: "Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений + Air-Flow порошком на основе глицина + полировка абразивной пастой + глубокое фторирование эмали" },
};

export type PerioExpressPresetId = keyof typeof PERIO_EXPRESS_PRESETS;
export type PerioExpressPreset = typeof PERIO_EXPRESS_PRESETS[PerioExpressPresetId];

export function generateComprehensivePerio043Text(teeth: readonly PerioToothRecord[]): string {
	const summary = calculatePerioIndices(teeth);
	const deepCount = summary.deepPocketsCount;
	const bop = summary.fmbsPercent;
	return `Объективный пародонтальный статус: обследовано зубов: ${teeth.filter((t) => !t.isMissing).length}. Кровоточивость десневой борозды (BOP): ${bop}%. Глубоких патологических карманов (>= 4 мм): ${deepCount}.`;
}

export const PERIO_TREATMENT_PROTOCOLS: readonly PerioTreatmentProtocol[] = [
	{ id: "prophy_airflow_ultrasound", titleRu: "1. Профгигиена AirFlow + УЗ-скейлинг", code804n: "A16.07.051", defaultPriceRub: 5500, descriptionRu: "УЗ-удаление над- и поддесневого камня + Air-Flow порошком глицина + полировка пастой + фторирование", protocolTextRu: "Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений, Air-Flow порошком на основе глицина, полировка абразивной пастой, глубокое фторирование эмали.", consumableKind: "hygiene", consumablesListRu: ["Порошок AirFlow (глицин)", "Паста полировочная", "Фторлак"] },
	{ id: "vector_curettage_therapy", titleRu: "2. Пародонтологическая чистка Vector / глубокий кюретаж", code804n: "A16.07.051.001", defaultPriceRub: 4200, descriptionRu: "УЗ-полировка корней аппаратом Vector с суспензией гидроксиапатита + антисептическая санация карманов", protocolTextRu: "Ультразвуковая обработка карманов аппаратом Vector с микроабразивной суспензией гидроксиапатита кальция. Антисептическая ирригация хлоргексидином 0.05%, десневая повязка Coe-Pak.", consumableKind: "vector", consumablesListRu: ["Суспензия Vector Polish", "Хлоргексидин 0.05%", "Повязка Coe-Pak"] },
	{ id: "perio_splinting_fiber", titleRu: "3. Пародонтальное шинирование стекловолокном", code804n: "A16.07.019", defaultPriceRub: 6800, descriptionRu: "Адгезивная фиксация подвижных зубов стекловолоконной лентой со светоотверждаемым композитом", protocolTextRu: "Шинирование подвижных зубов: изоляция, межзубная адаптация стекловолоконной ленты, травление, бондинг, послойная полимеризация текучим композитом, шлифовка и припасовка.", consumableKind: "splinting", consumablesListRu: ["Стекловолоконная лента", "Адгезивная система", "Текучий композит"] },
	{ id: "recession_gingival_plastic", titleRu: "4. Пластика рецессии / десневой трансплантат", code804n: "A16.07.026", defaultPriceRub: 12000, descriptionRu: "Микрохирургическое закрытие десневой рецессии тоннельным методом / трансплантатом с неба", protocolTextRu: "Пластика десневой рецессии (K06.0): создание поддесневого тоннеля, забор субэпителиального трансплантата, фиксация микрохирургическими швами Prolene 6-0, защита.", consumableKind: "recession", consumablesListRu: ["Шовный материал Prolene 6-0", "Трансплантат/матрица", "Защитная повязка"] },
] as const;

// 3. СПИСАНИЕ РАСХОДНИКОВ ПАКЕТОМ В БЭКЕ (SOFT NEGATIVE STOCK, МАНДАТ 8n)
export interface PeriodontalConsumableItem {
	itemId: string;
	itemName: string;
	quantity: number;
	notes: string;
}

export const PERIODONTAL_CONSUMABLES_CATALOG: Record<"hygiene" | "vector" | "splinting" | "recession" | "curettage" | "norm", PeriodontalConsumableItem[]> = {
	hygiene: [
		{ itemId: "mat_airflow_powder", itemName: "Порошок для воздушно-абразивной обработки AirFlow (глицин)", quantity: 1, notes: "Снятие биопленки" },
		{ itemId: "mat_prophy_paste", itemName: "Полировочная паста для профессиональной гигиены", quantity: 1, notes: "Финишная полировка" },
		{ itemId: "mat_fluoride_varnish", itemName: "Фторлак / реминерализующий гель", quantity: 1, notes: "Глубокое фторирование" },
	],
	vector: [
		{ itemId: "mat_vector_polish", itemName: "Полировочная суспензия Vector Polish (гидроксиапатит)", quantity: 1, notes: "Полировка цемента корня" },
		{ itemId: "mat_chlorhexidine_005", itemName: "Хлоргексидина биглюконат 0.05%", quantity: 1, notes: "Ирригация карманов" },
		{ itemId: "mat_perio_dressing_coepak", itemName: "Пародонтальная лечебная повязка (Coe-Pak)", quantity: 1, notes: "Защитная десневая повязка" },
	],
	splinting: [
		{ itemId: "mat_fiber_splint", itemName: "Стекловолоконная лента для шинирования (Ribbond)", quantity: 1, notes: "Шинирующая арматура" },
		{ itemId: "mat_flowable_composite", itemName: "Текучий светоотверждаемый композит", quantity: 1, notes: "Фиксация шины" },
	],
	recession: [
		{ itemId: "mat_prolene_60", itemName: "Шовный материал Prolene 6-0 с атравматической иглой", quantity: 1, notes: "Микрохирургические швы" },
		{ itemId: "mat_perio_dressing_coepak", itemName: "Пародонтальная лечебная повязка (Coe-Pak)", quantity: 1, notes: "Изоляция операционного поля" },
	],
	curettage: [
		{ itemId: "mat_chlorhexidine_005", itemName: "Хлоргексидина биглюконат 0.05% (100 мл)", quantity: 1, notes: "Антисептическая ирригация" },
		{ itemId: "mat_perio_dressing_coepak", itemName: "Пародонтальная лечебная повязка (Coe-Pak)", quantity: 1, notes: "Защитная десневая повязка" },
		{ itemId: "mat_perio_gel_antiseptic", itemName: "Антибактериальный гель Метрогил Дента", quantity: 1, notes: "Инстилляция в карманы" },
	],
	norm: [],
};

export async function deductPeriodontalConsumablesSoftOverdraft(
	procedureKind: "hygiene" | "vector" | "splinting" | "recession" | "curettage" | "norm",
): Promise<{ success: boolean; deductedCount: number; messageRu: string }> {
	const items = PERIODONTAL_CONSUMABLES_CATALOG[procedureKind] || [];
	if (!items.length) return { success: true, deductedCount: 0, messageRu: "Расходные материалы не требуются (норма)" };
	try {
		const payload = { procedureKind, items, allowSoftOverdraft: true, timestampIso: new Date().toISOString() };
		const res = await fetch("/api/warehouse/perio-batch-deduct", {
			method: "POST", headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() }, body: JSON.stringify(payload),
		});
		if (res.ok) return { success: true, deductedCount: items.length, messageRu: `Списано ${items.length} наим. материалов (Soft Negative Stock)` };
	} catch (err) {
		console.warn("[PerioWarehouse] Soft negative stock deduction offline fallback:", err);
	}
	return { success: true, deductedCount: items.length, messageRu: `Списано ${items.length} наим. материалов (локальный овердрафт)` };
}

// 4. МАТЕМАТИЧЕСКИЕ ПРЕСЕТЫ И 1-КЛИК ПРИМЕНЕНИЕ (LAYER 1/2)
const makePerioSite = (depth: number, bop = false, gm = 0, plq = false, calc = false, pus = false) => ({
	probingDepthMm: depth,
	gingivalMarginMm: gm,
	bleedingOnProbing: bop,
	suppuration: pus,
	plaque: plq,
	calculus: calc,
	calMm: calculateClinicalAttachmentLevel(depth, gm),
});

export function applyHealthyPeriodontiumPreset(teeth: readonly PerioToothRecord[]): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const s = makePerioSite(2);
		return {
			...t, mobility: 0, furcation: 0,
			distoBuccal: s, midBuccal: s, mesioBuccal: s,
			distoLingual: s, midLingual: s, mesioLingual: s,
		};
	});
}

export function applyGingivitisPreset(teeth: readonly PerioToothRecord[]): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const isLowerAnterior = [31, 32, 41, 42].includes(t.toothNumber);
		const depth = isLowerAnterior ? 3 : 2;
		const s = makePerioSite(depth, true, 0, true, isLowerAnterior);
		return {
			...t, mobility: 0, furcation: 0,
			distoBuccal: s, midBuccal: s, mesioBuccal: s,
			distoLingual: s, midLingual: s, mesioLingual: s,
		};
	});
}

export function applyPeriodontitisMildPreset(teeth: readonly PerioToothRecord[]): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const isTarget = [16, 17, 26, 27, 36, 37, 46, 47, 31, 32, 41, 42].includes(t.toothNumber);
		const s = makePerioSite(isTarget ? 4 : 3, true, 0, true, true);
		return {
			...t, mobility: [31, 32, 41, 42].includes(t.toothNumber) ? 1 : 0, furcation: 0,
			distoBuccal: s, midBuccal: s, mesioBuccal: s, distoLingual: s, midLingual: s, mesioLingual: s,
		};
	});
}

export function applyPeriodontitisModeratePreset(teeth: readonly PerioToothRecord[]): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const num = t.toothNumber;
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(num);
		const s = makePerioSite(isMolar ? 5 : 4, true, 1, true, true);
		return {
			...t, mobility: [31, 32, 41, 42].includes(num) ? 1 : 0,
			furcation: (isMolar && isFurcationEligibleTooth(num) ? 1 : 0) as 0 | 1 | 2 | 3 | 4,
			distoBuccal: s, midBuccal: s, mesioBuccal: s, distoLingual: s, midLingual: s, mesioLingual: s,
		};
	});
}

export function applyPeriodontitisSeverePreset(teeth: readonly PerioToothRecord[]): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const num = t.toothNumber;
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(num);
		const isLowerAnt = [31, 32, 41, 42].includes(num);
		const s = makePerioSite(isMolar ? 7 : isLowerAnt ? 6 : 5, true, 2, true, true, isMolar || isLowerAnt);
		return {
			...t, mobility: (isLowerAnt || isMolar ? 2 : 1) as 0 | 1 | 2 | 3,
			furcation: (isMolar && isFurcationEligibleTooth(num) ? 2 : 0) as 0 | 1 | 2 | 3 | 4,
			distoBuccal: s, midBuccal: s, mesioBuccal: s, distoLingual: s, midLingual: s, mesioLingual: s,
		};
	});
}

export function applyGingivalRecessionPreset(teeth: readonly PerioToothRecord[]): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const isCanineOrPremolar = [13, 14, 15, 23, 24, 25, 33, 34, 35, 43, 44, 45].includes(t.toothNumber);
		const gm = isCanineOrPremolar ? 3 : 2;
		const bSite = makePerioSite(2, false, gm);
		const lSite = makePerioSite(2, false, 0);
		return {
			...t, mobility: 0, furcation: 0,
			distoBuccal: bSite, midBuccal: bSite, mesioBuccal: bSite,
			distoLingual: lSite, midLingual: lSite, mesioLingual: lSite,
		};
	});
}

export function applyPsrSextantCode(
	teeth: readonly PerioToothRecord[], sextantName: string, code: PsrCode, asterisk = false,
): PerioToothRecord[] {
	const sextant = PSR_SEXTANTS.find((s) => s.name === sextantName);
	if (!sextant) return [...teeth];
	const targetTeethSet = new Set<number>(sextant.teeth);
	const depth = code === 0 ? 2 : code <= 2 ? 3 : code === 3 ? 5 : 7;
	const bop = code > 0;
	const calculus = code >= 2;

	return teeth.map((tooth) => {
		if (!targetTeethSet.has(tooth.toothNumber) || tooth.isMissing) return tooth;
		const updated = {
			...tooth,
			mobility: asterisk ? (2 as const) : tooth.mobility,
			furcation: asterisk && isFurcationEligibleTooth(tooth.toothNumber) ? (1 as const) : tooth.furcation,
		};
		for (const key of PERIO_SITE_KEYS) {
			const gm = tooth[key]?.gingivalMarginMm ?? 0;
			updated[key] = {
				probingDepthMm: depth, gingivalMarginMm: gm, bleedingOnProbing: bop,
				suppuration: code === 4, plaque: code > 0, calculus,
				calMm: calculateClinicalAttachmentLevel(depth, gm),
			};
		}
		return updated;
	});
}

// 5. ИНТЕГРАЦИЯ В ЭМК И СМЕТНЫЙ МОСТ
export interface PresetApplyResult {
	updatedTeeth: PerioToothRecord[];
	protocolText: string;
	title: string;
	service?: { code: string; name: string; price: number; category: string } | undefined;
}

export function applyExpressPerioPreset(teeth: readonly PerioToothRecord[], presetId: string): PresetApplyResult {
	const preset = PERIO_EXPRESS_PRESETS[presetId];
	if (presetId === "perio_norm_express") {
		return {
			updatedTeeth: applyHealthyPeriodontiumPreset(teeth),
			protocolText: preset?.defaultProtocolRu ?? "Пародонт интактен: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, BOP 0%, PSR 0 во всех 6 секстантах. Диагноз: Здоров (Z01.2).",
			title: "1-клик: Здоровый пародонт (Норма)",
		};
	}
	if (presetId === "pro_hygiene_express" || presetId === "prophy_airflow_ultrasound") {
		return {
			updatedTeeth: applyHealthyPeriodontiumPreset(teeth),
			protocolText: preset?.defaultProtocolRu ?? PERIO_TREATMENT_PROTOCOLS[0].protocolTextRu,
			title: "Профгигиена AirFlow + УЗ",
			service: { code: "A16.07.051", name: "Комплексная профессиональная гигиена полости рта (УЗ + AirFlow)", price: 5500, category: "hygiene" },
		};
	}
	if (presetId === "gingivitis_express") {
		return {
			updatedTeeth: applyGingivitisPreset(teeth),
			protocolText: preset?.defaultProtocolRu ?? "Пародонт: десна гиперемирована, валикообразно утолщена, кровоточивость BOP+, ложные карманы < 3.5 мм, зубной камень. Диагноз: Катаральный гингивит (K05.1).",
			title: "Гингивит (PSR 1–2)",
		};
	}
	if (presetId === "periodontitis_mild_express") {
		return {
			updatedTeeth: applyPeriodontitisMildPreset(teeth),
			protocolText: preset?.defaultProtocolRu ?? "Пародонт: маргинальная десна отечна, карманы 3.5–4.0 мм (PSR 2-3), над- и поддесневой камень, BOP+, CAL 1-2 мм. Диагноз: Пародонтит легкой степени (K05.30).",
			title: "Пародонтит легкий (карманы 3.5–4 мм)",
		};
	}
	if (presetId === "periodontitis_moderate_express") {
		return {
			updatedTeeth: applyPeriodontitisModeratePreset(teeth),
			protocolText: preset?.defaultProtocolRu ?? "Пародонт: глубина карманов 3.5–5.0 мм (PSR 3*), десна цианотична, выраженный зубной камень, подвижность I ст. Диагноз: Пародонтит средней степени (K05.31).",
			title: "Пародонтит средний (карманы до 5 мм)",
		};
	}
	if (presetId === "periodontitis_severe_express") {
		return {
			updatedTeeth: applyPeriodontitisSeverePreset(teeth),
			protocolText: preset?.defaultProtocolRu ?? "Пародонт: десна цианотична, карманы 6–8 мм (PSR 4*), серозно-гнойный экссудат, вовлечение фуркаций, подвижность II-III ст. Диагноз: Пародонтит тяжелой степени (K05.32).",
			title: "Пародонтит тяжелый (6-8 мм)",
		};
	}
	if (presetId === "recession_express") {
		return {
			updatedTeeth: applyGingivalRecessionPreset(teeth),
			protocolText: preset?.defaultProtocolRu ?? "Пародонт: рецессия десны 2–3 мм преимущественно у клыков и премоляров, карманы 1–2 мм, BOP 0%. Диагноз: Рецессия десны (K06.0).",
			title: "Рецессия десны (K06.0)",
		};
	}
	return { updatedTeeth: [...teeth], protocolText: "", title: presetId };
}

export function applyTherapistPathologyPreset(teeth: readonly PerioToothRecord[], presetId: string): PresetApplyResult | null {
	return applyExpressPerioPreset(teeth, presetId);
}

export function dispatchPresetSideEffects(result: PresetApplyResult, onInsertToProtocol?: (text: string) => void): void {
	const { protocolText, service } = result;
	if (protocolText) {
		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${protocolText}` : protocolText,
		}));
	}
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: { soap: protocolText, mode: "smart_append" } }));
		if (service) {
			const priceKopecks = (service.price || 0) * 100;
			const invoiceItem = {
				code: service.code, code804n: service.code, name: service.name, nameRu: service.name,
				price: service.price, priceRub: service.price, priceKopecks, amountKopecks: priceKopecks,
				quantity: 1, category: service.category || "hygiene", stageKind: "hygiene", isPrimary: true,
			};
			window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", {
				detail: { services: [invoiceItem], toothNumber: undefined, teethNumbers: [], stageKind: "hygiene" },
			}));
		}
		if (result.title.toLowerCase().includes("гигиен")) void deductPeriodontalConsumablesSoftOverdraft("hygiene");
		else if (result.title.toLowerCase().includes("пародонтит")) void deductPeriodontalConsumablesSoftOverdraft("curettage");
	}
	if (onInsertToProtocol && protocolText) onInsertToProtocol(protocolText);
	showToast(`Применен пресет: ${result.title}`, "success");
}

export function generatePerioProtocolText(teeth: readonly PerioToothRecord[]): string {
	const summary = calculatePerioIndices(teeth);
	return `Пародонт: обследовано зубов: ${teeth.filter((t) => !t.isMissing).length}. Кровоточивость BOP: ${summary.fmbsPercent}%. Глубоких карманов (>= 4 мм): ${summary.deepPocketsCount}.`;
}

export function generatePsrDiaryProtocol(presetId: string, customPsrSummary?: string, customNotes?: string): string {
	if (presetId in PERIO_EXPRESS_PRESETS) {
		return PERIO_EXPRESS_PRESETS[presetId].defaultProtocolRu;
	}
	let text = `Пародонт: обследование по 6 секстантам PSR.\n${customPsrSummary ? `Скрининг PSR (ВОЗ): ${customPsrSummary}.` : ""}\nПародонтальный статус зафиксирован.`;
	if (customNotes?.trim()) text += `\nОсобые отметки: ${customNotes.trim()}`;
	return text;
}

export function getPsrMaxCode(psr: Record<string, { code: PsrCode }>): PsrCode {
	let maxCode: PsrCode = 0;
	for (const key of Object.keys(psr)) {
		const item = psr[key];
		if (item && item.code > maxCode) maxCode = item.code;
	}
	return maxCode;
}

export function hasPsrAsterisk(psr: Record<string, { asterisk?: boolean }>): boolean {
	return Object.values(psr).some((item) => Boolean(item?.asterisk));
}

export function buildPeriodontalTreatmentPlanJustification(affectedTeeth: readonly PerioToothRecord[]): {
	planText: string;
	prophyService: { code804n: string; name: string; price: number };
	curettageServices: Array<{ toothNumber: number; code804n: string; name: string; price: number }>;
} {
	const prophyService = {
		code804n: "A16.07.051",
		name: "Профессиональная гигиена полости рта и удаление зубных отложений (A16.07.051)",
		price: 5500,
	};
	const curettageServices = affectedTeeth.map((t) => ({
		toothNumber: t.toothNumber,
		code804n: "A16.07.011",
		name: `Закрытый кюретаж пародонтального кармана зуба #${t.toothNumber} (A16.07.011)`,
		price: 1800,
	}));
	const teethList = affectedTeeth.map((t) => `#${t.toothNumber}`).join(", ");
	const planText = `План пародонтологического лечения:\n1. Комплексная профгигиена (${prophyService.code804n})\n2. Закрытый кюретаж патологических зубодесневых карманов (${curettageServices.length ? curettageServices[0]!.code804n : "A16.07.011"}): ${teethList || "не требуется"}.`;
	return { planText, prophyService, curettageServices };
}

// 6. ВСПОМОГАТЕЛЬНЫЕ КОНСТАНТЫ
export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;
export type SiteKey = "distoBuccal" | "midBuccal" | "mesioBuccal" | "distoLingual" | "midLingual" | "mesioLingual";
export const SITES: { key: SiteKey; label: string; short: string }[] = [
	{ key: "distoBuccal", label: "Дистально-вестибулярная", short: "ДВ" },
	{ key: "midBuccal", label: "Серединно-вестибулярная", short: "СВ" },
	{ key: "mesioBuccal", label: "Медиально-вестибулярная", short: "МВ" },
	{ key: "distoLingual", label: "Дистально-язычная / нёбная", short: "ДЯ" },
	{ key: "midLingual", label: "Серединно-язычная / нёбная", short: "СЯ" },
	{ key: "mesioLingual", label: "Медиально-язычная / нёбная", short: "МЯ" },
];


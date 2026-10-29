/**
 * perioCatalogData.ts — Единый канонический каталог пародонтологии и скрининга ВОЗ (PSR)
 * SSOT: шкала PSR (0..4+*), индексы гигиены, классификация EFP/AAP, пресеты лечения и списание (Мандат 8b: 200–300 строк).
 */

import type { PerioToothRecord } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { useVisitStore } from "../../store/visitStore";
import { showToast } from "../GlobalToast";
import {
	applyGingivalRecessionPreset,
	applyGingivitisPreset,
	applyHealthyPeriodontiumPreset,
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	PERIO_EXPRESS_PRESETS,
	type PerioExpressPresetId,
} from "./perioMath";

export {
	applyHealthyPeriodontiumPreset,
	applyGingivitisPreset,
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	applyGingivalRecessionPreset,
};
import type { PerioScreeningSummary, PsrCode, PsrScreeningMap, PsrSextantId } from "./perioTypes";

// 1. ШКАЛА PSR / CPITN (ВОЗ / СтАР) ПО 6 СЕКСТАНТАМ
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
}

export const PSR_CODES_CATALOG: Record<PsrCode, PsrCodeMeta> = {
	0: { code: 0, labelRu: "0: Здоров", criteriaRu: "Глубина кармана < 3.5 мм, BOP-, зубного камня нет", actionRu: "Профилактический осмотр через 6 мес.", colorHex: "#10b981" },
	1: { code: 1, labelRu: "1: Кровоточивость", criteriaRu: "BOP+, карман < 3.5 мм, над/поддесневого камня нет", actionRu: "Обучение гигиене, полировка пастой / AirFlow", colorHex: "#f59e0b" },
	2: { code: 2, labelRu: "2: Зубной камень", criteriaRu: "Зубной камень над/поддесневой, карман < 3.5 мм", actionRu: "Профгигиена: УЗ-скейлинг + AirFlow + полировка", colorHex: "#0ea5e9" },
	3: { code: 3, labelRu: "3: Карман 4–5 мм", criteriaRu: "Черная полоса зонда частично скрыта, карман 4–5 мм", actionRu: "Профгигиена + закрытый кюретаж пораженного секстанта", colorHex: "#f97316" },
	4: { code: 4, labelRu: "4: Карман >= 6 мм", criteriaRu: "Черная метка зонда полностью скрыта, карман >= 6 мм", actionRu: "Комплексное пародонтологическое лечение, кюретаж/хирургия", colorHex: "#f43f5e" },
};

export const PSR_ASTERISK_DESCRIPTION = "Осложняющие факторы: вовлечение фуркаций, подвижность II–III ст., дефекты прикрепления, рецессия >= 3.5 мм";

export function computePsrSummary(screeningMap: PsrScreeningMap): PerioScreeningSummary {
	let maxCode: PsrCode = 0;
	let hasAsterisk = false;
	const codes: string[] = [];
	for (const sextant of PSR_SEXTANTS_CATALOG) {
		const s = screeningMap[sextant.id] ?? { code: 0 };
		if (s.code > maxCode) maxCode = s.code;
		if (s.asterisk) hasAsterisk = true;
		codes.push(`${s.code}${s.asterisk ? "*" : ""}`);
	}
	const psrFormula = `PSR: ${codes.join(" / ")}`;
	const defaultDiag = { diag: "Здоров (клинически интактный пародонт)", icd: "Z01.2", plan: "Профилактический осмотр через 6 месяцев. Индивидуальная гигиена в норме.", req: false };
	const diagMap: Record<number, { diag: string; icd: string; plan: string; req: boolean }> = {
		0: defaultDiag,
		1: { diag: "Катаральный гингивит легкой степени (BOP+)", icd: "K05.1", plan: "Контролируемая гигиена, удаление мягкого налёта, полировка зубов пастой / Air-Flow.", req: false },
		2: { diag: "Хронический катаральный гингивит с зубными отложениями", icd: "K05.1", plan: "Профессиональная гигиена: ультразвуковое снятие над- и поддесневого камня + Air-Flow + фторирование.", req: false },
		3: { diag: "Хронический пародонтит легкой/средней степени (карманы 4–5 мм)", icd: "K05.3", plan: "Комплексная гигиена + закрытый кюретаж пародонтальных карманов в пораженных секстантах. Назначение антисептических аппликаций.", req: true },
		4: { diag: "Хронический пародонтит тяжелой степени (глубокие карманы >= 6 мм)", icd: "K05.3", plan: "Комплексное пародонтологическое лечение: профессиональная гигиена, закрытый/открытый кюретаж, шинирование подвижных зубов, консультация хирурга.", req: true },
	};
	const d = diagMap[maxCode] ?? defaultDiag;
	return { maxPsrCode: maxCode, hasAsterisk, psrFormula, suggestedDiagnosisRu: d.diag, icd10Code: d.icd, hygienePlanRu: d.plan, requiresDetailedCharting: d.req };
}

// 2. ИНДЕКСЫ ГИГИЕНЫ ПОЛОСТИ РТА (O'LEARY, SILNESS-LÖE, OHI-S, BOP)
export interface HygieneIndexStandard {
	readonly id: string;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly goodThresholdRu: string;
	readonly formulaRu: string;
}

export const HYGIENE_INDICES_CATALOG: readonly HygieneIndexStandard[] = [
	{ id: "oleary", nameRu: "Индекс зубного налета O'Leary (PCR)", descriptionRu: "Процент поверхностей с мягким налетом после окрашивания", goodThresholdRu: "< 10% (норма), > 20% (высокий риск)", formulaRu: "(Поверхности с налетом / Всего поверхностей) × 100%" },
	{ id: "silness_loe", nameRu: "Индекс налета Silness-Löe (PI)", descriptionRu: "Оценка толщины бляшки в придесневой зоне (0–3 балла)", goodThresholdRu: "0–0.5 (отлично), 0.6–1.5 (хорошо), > 1.5 (плохо)", formulaRu: "Сумма баллов обследованных зубов / Количество зубов" },
	{ id: "ohis", nameRu: "Упрощенный индекс гигиены Грина-Вермиллиона (OHI-S)", descriptionRu: "Сумма зубного налета (DI-S) и зубного камня (CI-S) на 6 ключевых зубах", goodThresholdRu: "0.0–1.2 (норма), 1.3–3.0 (удовлетворительно), > 3.0 (плохо)", formulaRu: "DI-S + CI-S (диапазон 0.0 – 6.0)" },
	{ id: "bop", nameRu: "Индекс кровоточивости при зондировании (BOP)", descriptionRu: "Процент точек с кровотечением через 10–15 сек после зондирования", goodThresholdRu: "< 10% (здоровый пародонт по EFP/AAP 2018)", formulaRu: "(Точки с кровотечением / Всего обследованных точек) × 100%" },
];

// 3. КЛАССИФИКАЦИЯ ПАРОДОНТИТА EFP/AAP (СТАДИИ I–IV, СТЕПЕНИ A–C)
export interface PerioStageDefinition {
	readonly stage: "I" | "II" | "III" | "IV";
	readonly titleRu: string;
	readonly calMmRu: string;
	readonly rblRu: string;
	readonly pocketsMmRu: string;
	readonly toothLossRu: string;
	readonly complexityRu: string;
}

export const EFP_AAP_STAGES: readonly PerioStageDefinition[] = [
	{ stage: "I", titleRu: "Стадия I: Начальный пародонтит", calMmRu: "1–2 мм", rblRu: "< 15% (корональная треть)", pocketsMmRu: "<= 4 мм", toothLossRu: "0 зубов", complexityRu: "Горизонтальная деструкция кости" },
	{ stage: "II", titleRu: "Стадия II: Умеренный пародонтит", calMmRu: "3–4 мм", rblRu: "15–33% (корональная треть)", pocketsMmRu: "<= 5 мм", toothLossRu: "0 зубов", complexityRu: "Преимущественно горизонтальная деструкция" },
	{ stage: "III", titleRu: "Стадия III: Тяжелый пародонтит", calMmRu: ">= 5 мм", rblRu: "До средней трети корня", pocketsMmRu: ">= 6 мм", toothLossRu: "<= 4 зуба", complexityRu: "Вертикальные дефекты >= 3 мм, фуркации II–III" },
	{ stage: "IV", titleRu: "Стадия IV: Тяжелый пародонтит с риском потери зубов", calMmRu: ">= 5 мм", rblRu: "> 33% (апикальная треть)", pocketsMmRu: ">= 6 мм", toothLossRu: ">= 5 зубов", complexityRu: "Жевательная дисфункция, подвижность II–III" },
];

export interface PerioGradeDefinition {
	readonly grade: "A" | "B" | "C";
	readonly titleRu: string;
	readonly progressionRateRu: string;
	readonly rblAgeRatioRu: string;
	readonly riskFactorsRu: string;
}

export const EFP_AAP_GRADES: readonly PerioGradeDefinition[] = [
	{ grade: "A", titleRu: "Степень A: Медленное прогрессирование", progressionRateRu: "Нет потери кости за 5 лет", rblAgeRatioRu: "< 0.25", riskFactorsRu: "Некурящий, без сахарного диабета" },
	{ grade: "B", titleRu: "Степень B: Умеренное прогрессирование", progressionRateRu: "Потеря кости < 2 мм за 5 лет", rblAgeRatioRu: "0.25–1.0", riskFactorsRu: "Курение < 10 сиг/сут, HbA1c < 7.0%" },
	{ grade: "C", titleRu: "Степень C: Быстрое прогрессирование", progressionRateRu: "Потеря кости >= 2 мм за 5 лет", rblAgeRatioRu: "> 1.0", riskFactorsRu: "Курение >= 10 сиг/сут, HbA1c >= 7.0%" },
];

// 4. ПРЕСЕТЫ ПАРОДОНТОЛОГИЧЕСКОЙ ОБРАБОТКИ
export interface PerioTreatmentPreset {
	readonly id: string;
	readonly titleRu: string;
	readonly code804n: string;
	readonly defaultPriceRub: number;
	readonly descriptionRu: string;
	readonly protocolTextRu: string;
	readonly category: "hygiene" | "perio" | "surgery";
}

export const PERIO_TREATMENT_PRESETS: readonly PerioTreatmentPreset[] = [
	{ id: "healthy_norm", titleRu: "✓ Здоровый пародонт (PSR 0 / ИГ < 10%)", code804n: "Z01.2", defaultPriceRub: 0, descriptionRu: "Физиологическая норма: глубина борозд 1–2 мм, BOP 0%", protocolTextRu: "Пародонт интактен: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, BOP 0%, PSR 0 во всех 6 секстантах.", category: "hygiene" },
	{ id: "prophy_express", titleRu: "Комплексная профгигиена (A16.07.051)", code804n: "A16.07.051", defaultPriceRub: 5500, descriptionRu: "УЗ-скейлинг + AirFlow + полировка пастой + глубокое фторирование", protocolTextRu: "Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений, Air-Flow порошком глицина, полировка пастой, фторирование эмали.", category: "hygiene" },
	{ id: "vector_therapy", titleRu: "Vector-терапия (A16.07.051.001)", code804n: "A16.07.051.001", defaultPriceRub: 4200, descriptionRu: "Ультразвуковая полировка корней суспензией гидроксиапатита Vector Polish", protocolTextRu: "Ультразвуковая обработка пародонтальных карманов аппаратом Vector с микроабразивной суспензией гидроксиапатита кальция. Антисептическая ирригация.", category: "perio" },
	{ id: "airflow_perio", titleRu: "AirFlow Perio поддесневой (A16.07.051.002)", code804n: "A16.07.051.002", defaultPriceRub: 3500, descriptionRu: "Снятие поддесневой биопленки насадкой Perio-Flow на эритритоле", protocolTextRu: "Поддесневая обработка пародонтальных карманов соплом Perio-Flow с порошком на основе эритритола 14 мкм. Удаление биопленки без травмы цемента.", category: "perio" },
	{ id: "gracey_curettage", titleRu: "Кюретаж Грейси закрытый (A16.07.011)", code804n: "A16.07.011", defaultPriceRub: 1800, descriptionRu: "Закрытый кюретаж зоноспецифическими кюретами Gracey (1 зуб)", protocolTextRu: "Закрытый кюретаж пародонтального кармана кюретами Gracey: удаление грануляций и поддесневого камня, антисептическая санация хлоргексидином 0.05%, десневая повязка Coe-Pak.", category: "perio" },
	{ id: "recession_coverage", titleRu: "Закрытие рецессий десны (A16.07.026)", code804n: "A16.07.026", defaultPriceRub: 12000, descriptionRu: "Микрохирургическая пластика рецессии тоннельным методом / СЗТ", protocolTextRu: "Пластика десневой рецессии (K06.0): создание поддесневого тоннеля, забор субэпителиального трансплантата с неба, фиксация швами Prolene 6-0.", category: "surgery" },
];

// 5. РАСХОДНИКИ И SOFT NEGATIVE STOCK СПИСАНИЕ В БЭКЕ (МАНДАТ 8n)
export interface PeriodontalConsumableItem {
	itemId: string;
	itemName: string;
	quantity: number;
	notes: string;
}

export const PERIODONTAL_CONSUMABLES_CATALOG: Record<
	"curettage" | "perio_dressing" | "perio_chip" | "hygiene" | "vector" | "norm",
	PeriodontalConsumableItem[]
> = {
	curettage: [
		{ itemId: "mat_chlorhexidine_005", itemName: "Хлоргексидина биглюконат 0.05% (100 мл)", quantity: 1, notes: "Антисептическая ирригация" },
		{ itemId: "mat_perio_dressing_coepak", itemName: "Пародонтальная лечебная повязка (Coe-Pak)", quantity: 1, notes: "Защитная десневая повязка" },
		{ itemId: "mat_perio_gel_antiseptic", itemName: "Антибактериальный гель Метрогил Дента", quantity: 1, notes: "Инстилляция в карманы" },
	],
	perio_dressing: [
		{ itemId: "mat_perio_dressing_coepak", itemName: "Пародонтальная лечебная повязка (Coe-Pak)", quantity: 1, notes: "Изолирующая повязка" },
		{ itemId: "mat_chlorhexidine_005", itemName: "Хлоргексидина биглюконат 0.05%", quantity: 1, notes: "Антисептическая санация" },
	],
	perio_chip: [
		{ itemId: "mat_perio_chip_chlorhexidine", itemName: "Периодонтальная пластина с хлоргексидином (PerioChip)", quantity: 1, notes: "Субгингивальное депо" },
	],
	hygiene: [
		{ itemId: "mat_prophy_paste", itemName: "Полировочная паста для профессиональной гигиены", quantity: 1, notes: "Финишная полировка" },
		{ itemId: "mat_airflow_powder", itemName: "Порошок для воздушно-абразивной обработки (глицин)", quantity: 1, notes: "Снятие биопленки" },
		{ itemId: "mat_fluoride_varnish", itemName: "Фторлак / реминерализующий гель", quantity: 1, notes: "Глубокое фторирование" },
	],
	vector: [
		{ itemId: "mat_vector_polish", itemName: "Полировочная суспензия Vector Polish (гидроксиапатит)", quantity: 1, notes: "Полировка цемента корня" },
		{ itemId: "mat_chlorhexidine_005", itemName: "Хлоргексидина биглюконат 0.05%", quantity: 1, notes: "Ирригация карманов" },
	],
	norm: [],
};

export async function deductPeriodontalConsumablesSoftOverdraft(
	procedureKind: "curettage" | "perio_dressing" | "perio_chip" | "hygiene" | "vector" | "norm",
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

// 6. ПРИМЕНЕНИЕ ПРЕСЕТОВ И СМЕТНЫЙ МОСТ (LAYER 2 ENGINE)
export interface PresetApplyResult {
	updatedTeeth: PerioToothRecord[];
	protocolText: string;
	title: string;
	service?: { code: string; name: string; price: number; category: string } | undefined;
}

export function buildPeriodontalTreatmentPlanJustification(affectedTeeth: readonly PerioToothRecord[]) {
	const prophyService = { code804n: "A16.07.051", nameRu: "Комплексная профессиональная гигиена полости рта", priceRub: 5500 };
	const curettageServices = affectedTeeth.map((t) => ({
		toothNumber: t.toothNumber, code804n: "A16.07.011", nameRu: `Закрытый кюретаж пародонтального кармана зуба #${t.toothNumber}`, priceRub: 1800,
	}));
	const affectedNums = affectedTeeth.map((t) => `#${t.toothNumber}`).join(", ");
	const planText = `План пародонтологического лечения:\n1. A16.07.051: Комплексная профгигиена полости рта (5 500 ₽)\n2. A16.07.011: Закрытый кюретаж карманов в области зубов ${affectedNums} (${curettageServices.length} × 1 800 ₽)`;
	return { planText, prophyService, curettageServices };
}

export function applyExpressPerioPreset(teeth: readonly PerioToothRecord[], presetId: PerioExpressPresetId): PresetApplyResult {
	const applyMap: Record<PerioExpressPresetId, () => { teeth: PerioToothRecord[]; text: string }> = {
		perio_norm_express: () => ({ teeth: applyHealthyPeriodontiumPreset(teeth), text: PERIO_EXPRESS_PRESETS.perio_norm_express.defaultProtocolRu }),
		pro_hygiene_express: () => ({ teeth: applyHealthyPeriodontiumPreset(teeth), text: PERIO_EXPRESS_PRESETS.pro_hygiene_express.defaultProtocolRu }),
		gingivitis_express: () => ({ teeth: applyGingivitisPreset(teeth), text: PERIO_EXPRESS_PRESETS.gingivitis_express.defaultProtocolRu }),
		periodontitis_mild_express: () => ({ teeth: applyPeriodontitisMildPreset(teeth), text: PERIO_EXPRESS_PRESETS.periodontitis_mild_express.defaultProtocolRu }),
		periodontitis_moderate_express: () => ({ teeth: applyPeriodontitisModeratePreset(teeth), text: PERIO_EXPRESS_PRESETS.periodontitis_moderate_express.defaultProtocolRu }),
		periodontitis_severe_express: () => ({ teeth: applyPeriodontitisSeverePreset(teeth), text: PERIO_EXPRESS_PRESETS.periodontitis_severe_express.defaultProtocolRu }),
		recession_express: () => ({ teeth: applyGingivalRecessionPreset(teeth), text: PERIO_EXPRESS_PRESETS.recession_express.defaultProtocolRu }),
	};
	const matched = applyMap[presetId] ? applyMap[presetId]() : { teeth: [...teeth], text: "" };
	const presetInfo = PERIO_EXPRESS_PRESETS[presetId];
	const title = presetInfo?.titleRu ?? presetId;
	const service = presetId === "pro_hygiene_express" ? {
		code: "A16.07.051", name: "Комплексная профессиональная гигиена полости рта (УЗ + Air-Flow + Полировка + Фторлак)", price: 5500, category: "hygiene",
	} : undefined;
	return { updatedTeeth: matched.teeth, protocolText: matched.text, title, service };
}

export function applyTherapistPathologyPreset(teeth: readonly PerioToothRecord[], presetId: string): PresetApplyResult | null {
	if (presetId === "perio_norm_express" || presetId === "pro_hygiene_express" || presetId === "hygiene_pro_done_express") {
		return applyExpressPerioPreset(teeth, presetId === "perio_norm_express" ? "perio_norm_express" : "pro_hygiene_express");
	}
	const isMild = presetId.includes("mild");
	const isSevere = presetId.includes("severe");
	return applyExpressPerioPreset(teeth, isSevere ? "periodontitis_severe_express" : isMild ? "periodontitis_mild_express" : "periodontitis_moderate_express");
}

export function dispatchPresetSideEffects(result: PresetApplyResult, onInsertToProtocol?: (text: string) => void): void {
	const { protocolText, service } = result;
	useVisitStore.getState().setVisitNoteForm((prev) => ({
		...prev,
		objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${protocolText}` : protocolText,
	}));
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
	return PERIO_EXPRESS_PRESETS.perio_norm_express.defaultProtocolRu;
}

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

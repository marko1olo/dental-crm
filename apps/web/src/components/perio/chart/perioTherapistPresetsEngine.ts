/**
 * perioTherapistPresetsEngine.ts — Пресеты терапевтических диагнозов и протоколов 043/у.
 * Архитектурный слой Layer 2: Pure Engine (Мандат 8b, <= 120 строк).
 */

import {
	calculateClinicalAttachmentLevel,
	isFurcationEligibleTooth,
	PERIO_SITE_KEYS,
	type PerioToothRecord,
} from "@dental/shared";
import {
	PERIO_PATHOLOGY_PRESETS,
	type PerioPathologyPreset,
} from "../../../lib/clinicalProtocols";
import type { PresetApplyResult } from "./perioPresetTypes";

function getFallbackPreset(presetId: string): PerioPathologyPreset | undefined {
	if (presetId === "gingivitis_catarrhal") {
		return {
			id: "gingivitis_catarrhal", label: "Катаральный гингивит (K05.1)", badge: "K05.1", defaultIcd10: "K05.1",
			statusLocalis: "Десна отечна, гиперемирована, выраженная кровоточивость при зондировании (BOP+). Зубодесневое прикрепление сохранено. Мягкий налет, наддесневой камень.",
			treatmentDescription: "Профгигиена (УЗ + AirFlow). Антисептическая обработка полости рта (хлоргексидин 0.05%). Местная терапия.",
		};
	}
	if (presetId === "perio_norm_express") {
		return {
			id: "perio_norm_express", label: "Норма пародонта (физиологическая норма)", badge: "Z01.2", defaultIcd10: "Z01.2",
			statusLocalis: "Пародонт: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует, подвижности зубов нет. Соматически здоров / глубина карманов 1-2 мм / BOP 0% / PSR 0.",
			treatmentDescription: "Профилактический осмотр через 6 месяцев, стандартная индивидуальная гигиена.",
		};
	}
	if (presetId === "hygiene_pro_done_express" || presetId === "pro_hygiene_express") {
		return {
			id: "hygiene_pro_done_express", label: "Профгигиена полости рта (A16.07.051)", badge: "A16.07.051", defaultIcd10: "Z01.2",
			statusLocalis: "Профгигиена полости рта: УЗ-удаление зубных отложений + Air-Flow глицин + полировка + глубокое фторирование эмали. Зубные отложения удалены полностью.",
			treatmentDescription: "УЗ-скейлинг + снятие биопленки Air-Flow + полировка пастой + фторирование.",
		};
	}
	return undefined;
}

export function applyTherapistPathologyPreset(teeth: readonly PerioToothRecord[], presetId: string): PresetApplyResult | null {
	const targetPreset = PERIO_PATHOLOGY_PRESETS.find((p) => p.id === presetId) ?? getFallbackPreset(presetId);
	if (!targetPreset) return null;

	const updatedTeeth = teeth.map((tooth) => {
		if (tooth.isMissing) return tooth;
		const num = tooth.toothNumber;
		const isLowerAnt = [31, 32, 41, 42].includes(num);
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(num);
		let depth = 2; let hasBop = false; let hasCalc = false; let hasPlq = false;
		let mobility: 0 | 1 | 2 | 3 = 0; let furcation: 0 | 1 | 2 | 3 | 4 = 0;

		if (presetId === "gingivitis_catarrhal") {
			depth = isLowerAnt || isMolar ? 3 : 2; hasBop = true; hasCalc = isLowerAnt; hasPlq = true;
		} else if (presetId === "gingivitis_localized") {
			depth = isLowerAnt ? 3 : 2; hasBop = isLowerAnt; hasCalc = isLowerAnt; hasPlq = isLowerAnt;
		} else if (presetId === "gingivitis_generalized" || presetId === "dental_calculus") {
			depth = 3; hasBop = true; hasCalc = isLowerAnt || isMolar; hasPlq = true;
		} else if (presetId === "periodontitis_mild") {
			depth = isMolar || isLowerAnt ? 4 : 3; hasBop = isMolar || isLowerAnt; hasCalc = true; hasPlq = true; mobility = isLowerAnt ? 1 : 0;
		} else if (presetId === "periodontitis_moderate") {
			depth = isMolar ? 5 : 4; hasBop = true; hasCalc = true; hasPlq = true; mobility = isLowerAnt ? 1 : 0;
			furcation = isMolar && isFurcationEligibleTooth(num) ? 1 : 0;
		} else if (presetId === "periodontitis_severe") {
			depth = isMolar ? 7 : isLowerAnt ? 6 : 5; hasBop = true; hasCalc = true; hasPlq = true; mobility = isLowerAnt ? 2 : isMolar ? 1 : 0;
			furcation = isMolar && isFurcationEligibleTooth(num) ? 2 : 0;
		}

		const updated = { ...tooth, mobility, furcation };
		for (const key of PERIO_SITE_KEYS) {
			const site = tooth[key] ?? { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false };
			const gm = presetId === "periodontitis_moderate" ? 1 : site.gingivalMarginMm || 0;
			updated[key] = {
				...site, probingDepthMm: depth, gingivalMarginMm: gm,
				bleedingOnProbing: hasBop, calculus: hasCalc, plaque: hasPlq,
				calMm: calculateClinicalAttachmentLevel(depth, gm),
			};
		}
		return updated;
	});

	const isProphy = presetId === "hygiene_pro_done_express" || presetId === "hygiene_airflow_ultrasound" || presetId === "pro_hygiene_express";
	const protocolText = `• Пародонтологический осмотр: ${targetPreset.label}\n• Status localis: ${targetPreset.statusLocalis}\n• Рекомендованное лечение: ${targetPreset.treatmentDescription}`;
	const service = isProphy ? {
		code: "A16.07.051", name: "Профессиональная гигиена полости рта и зубов (ультразвуковое удаление отложений, Air-Flow, полировка, фторирование)",
		price: 5500, category: "hygiene",
	} : undefined;

	return { updatedTeeth, protocolText, title: targetPreset.label, service };
}

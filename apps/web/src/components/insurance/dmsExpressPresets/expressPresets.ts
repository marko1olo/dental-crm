/**
 * expressPresets.ts — 1-клик шаблоны экспресс-прикрепления гарантийного письма ДМС
 */

import type { ExpressDmsGuaranteePreset } from "./types.js";

export const EXPRESS_GUARANTEE_LETTER_PRESETS: readonly ExpressDmsGuaranteePreset[] = [
	{
		id: "express_sogaz_therapy",
		labelRu: "СОГАЗ • Терапия и анестезия (50 000 ₽)",
		insurerKey: "sogaz",
		insurerNameRu: "АО «СОГАЗ»",
		maxCoverageRub: 50000,
		franchisePct: 0,
		approvedServiceCodes804n: [
			"A16.07.002.001",
			"A16.07.030.001",
			"A16.07.008.001",
			"A11.07.010",
			"A06.07.004",
		],
		approvedDiagnosisMkb10: ["K02.1", "K04.0"],
		noteRu: "Экспресс-прикрепление: Базовое терапевтическое лечение кариеса и пульпита по согласованию СОГАЗ.",
	},
	{
		id: "express_ingos_surgery",
		labelRu: "Ингосстрах • Хирургия и острая боль (35 000 ₽)",
		insurerKey: "ingosstrakh",
		insurerNameRu: "СПАО «Ингосстрах»",
		maxCoverageRub: 35000,
		franchisePct: 15,
		approvedServiceCodes804n: [
			"A16.07.001.002",
			"A11.07.010",
			"A06.07.004",
		],
		approvedDiagnosisMkb10: ["K01.1", "K04.4"],
		noteRu: "Экспресс-прикрепление: Хирургическое лечение по острой боли (сооплата франшизы 15%).",
	},
	{
		id: "express_alfa_hygiene_therapy",
		labelRu: "АльфаСтрахование • Комплекс + Гигиена (60 000 ₽)",
		insurerKey: "alfastrakhovanie",
		insurerNameRu: "АО «АльфаСтрахование»",
		maxCoverageRub: 60000,
		franchisePct: 10,
		approvedServiceCodes804n: [
			"A16.07.002.001",
			"A16.07.051",
			"A11.07.010",
			"B01.003.004.001",
		],
		approvedDiagnosisMkb10: ["K02.1", "K05.1"],
		noteRu: "Экспресс-прикрепление: Терапевтический осмотр, лечение кариеса и гигиена полости рта.",
	},
	{
		id: "express_reso_emergency",
		labelRu: "РЕСО-Гарантия • Неотложная помощь (25 000 ₽)",
		insurerKey: "reso_garantiya",
		insurerNameRu: "СПАО «РЕСО-Гарантия»",
		maxCoverageRub: 25000,
		franchisePct: 0,
		approvedServiceCodes804n: [
			"A11.07.010",
			"A16.07.001.001",
			"A16.07.030.001",
			"A06.07.004",
		],
		approvedDiagnosisMkb10: ["K04.0", "K04.4"],
		noteRu: "Экспресс-прикрепление: Купирование болевого синдрома и острая стоматологическая помощь.",
	},
];

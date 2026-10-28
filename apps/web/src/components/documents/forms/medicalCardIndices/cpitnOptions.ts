import type { CpitnIndex, CpitnSextantCode } from "@dental/shared";

export const CPITN_SEXTANT_OPTIONS: Array<{ value: CpitnSextantCode; label: string; hint: string }> = [
	{ value: "0_healthy", label: "0 — Здорова (Норма)", hint: "Десна здорова, кровоточивости и карманов нет" },
	{ value: "1_bleeding", label: "1 — Кровоточивость", hint: "Кровоточивость десны при мягком зондировании" },
	{ value: "2_calculus", label: "2 — Зубной камень", hint: "Над- или поддесневой зубной камень" },
	{ value: "3_pocket_4_5mm", label: "3 — Карман 4–5 мм", hint: "Пародонтальный карман 4–5 мм" },
	{ value: "4_pocket_6mm_plus", label: "4 — Карман ≥ 6 мм", hint: "Глубокий пародонтальный карман ≥ 6 мм" },
	{ value: "x_excluded", label: "X — Секстант исключен", hint: "Менее 2 зубов в секстанте" },
];

export const CPITN_TN_OPTIONS: Array<{ value: CpitnIndex["treatmentNeedCategory"]; label: string }> = [
	{ value: "0_none", label: "TN 0: Лечение не требуется (здоровый пародонт)" },
	{ value: "1_hygiene_instructions", label: "TN 1: Индивидуальная гигиена полости рта и обучение чистке" },
	{ value: "2_scaling_root_planing", label: "TN 2: Профессиональная гигиена (снятие зубных отложений) + гигиена" },
	{ value: "3_complex_periodontal", label: "TN 3: Комплексное пародонтологическое лечение (SRP / кюретаж / хирургия)" },
];

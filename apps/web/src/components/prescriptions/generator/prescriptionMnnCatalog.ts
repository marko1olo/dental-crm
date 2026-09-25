/**
 * DENTE Dental CRM — Statutory MNN Catalog & Latin Rx Signa Validation (Order 1094n)
 */

export interface DentalMnnDefinition {
	readonly id: string;
	readonly key?: string;
	readonly mnnRu: string;
	readonly mnnLatin: string;
	readonly aliasesRu: readonly string[];
	readonly category: "antibiotic" | "nsaid" | "antiseptic" | "anesthetic" | "antihistamine" | "dental_gel" | "other";
	readonly categoryLabelRu: string;
	readonly standardDosages: readonly string[];
	readonly maxSingleDoseRu: string;
	readonly maxDailyDoseRu: string;
	readonly pediatricNotesRu?: string | undefined;
	readonly standardSignaLatinPrefix: string;
	readonly standardSignaRussianTemplate: string;
}

const DENTAL_STATUTORY_MNN_ARRAY: readonly DentalMnnDefinition[] = [
	{
		id: "amoxicillin",
		mnnRu: "Амоксициллин",
		mnnLatin: "Amoxicillinum",
		aliasesRu: ["амоксициллин", "флемоксин", "amoxicillin", "flemoxin"],
		category: "antibiotic",
		categoryLabelRu: "Антибиотик пенициллинового ряда",
		standardDosages: ["250 мг", "500 мг", "875 мг", "1000 мг"],
		maxSingleDoseRu: "1000 мг",
		maxDailyDoseRu: "1500–2000 мг (до 3000 мг при тяжелых инфекциях)",
		pediatricNotesRu: "Детям: 25–45 мг/кг/сут в 2–3 приёма.",
		standardSignaLatinPrefix: "Rp.: Amoxicillini",
		standardSignaRussianTemplate: "Внутрь по 1 таблетке (500 мг) 3 раза в день через 8 ч, курс 5–7 дней.",
	},
	{
		id: "amoxicillin_clavulanate",
		mnnRu: "Амоксициллин + Клавулановая кислота",
		mnnLatin: "Amoxicillinum et Acidum clavulanicum",
		aliasesRu: ["амоксиклав", "аугментин", "панклав", "amoxicillin clavulanate", "клавуланат"],
		category: "antibiotic",
		categoryLabelRu: "Антибиотик пенициллиновый защищенный",
		standardDosages: ["500/125 мг", "875/125 мг"],
		maxSingleDoseRu: "875/125 мг (1 таблетка)",
		maxDailyDoseRu: "1750/250 мг (2 таблетки в сутки)",
		pediatricNotesRu: "Детям суспензия: 25–45 мг/кг/сут по амоксициллину в 2 приёма.",
		standardSignaLatinPrefix: "Rp.: Tab. Amoxicillini et Acidi clavulanici",
		standardSignaRussianTemplate: "Внутрь по 1 таб. (875/125 мг) 2 раза в день во время еды, курс 7 дней.",
	},
	{
		id: "ibuprofen",
		mnnRu: "Ибупрофен",
		mnnLatin: "Ibuprofenum",
		aliasesRu: ["ибупрофен", "нурофен", "миг", "фаспик", "ibuprofen", "nurofen"],
		category: "nsaid",
		categoryLabelRu: "НПВП / Анальгетик-антипиретик",
		standardDosages: ["200 мг", "400 мг"],
		maxSingleDoseRu: "400 мг (до 800 мг при выраженной боли)",
		maxDailyDoseRu: "1200 мг (максимально до 2400 мг под контролем врача)",
		pediatricNotesRu: "Детям: 10 мг/кг разовая доза, не более 30 мг/кг/сут.",
		standardSignaLatinPrefix: "Rp.: Ibuprofeni",
		standardSignaRussianTemplate: "Внутрь по 1 таблетке (400 мг) 2–3 раза в день после еды, при болях (3–5 дней).",
	},
	{
		id: "chlorhexidine",
		mnnRu: "Хлоргексидин",
		mnnLatin: "Chlorhexidinum",
		aliasesRu: ["хлоргексидин", "хлоргексидина биглюконат", "chlorhexidine"],
		category: "antiseptic",
		categoryLabelRu: "Антисептик катионный местный",
		standardDosages: ["0.05%", "0.12%", "0.2%"],
		maxSingleDoseRu: "10–15 мл (1 столовая ложка)",
		maxDailyDoseRu: "Местно, до 3–4 раз в день (курс не более 10–14 дней)",
		pediatricNotesRu: "Детям старше 6 лет под присмотром взрослых (не глотать).",
		standardSignaLatinPrefix: "Rp.: Sol. Chlorhexidini bigluconatis 0.05%",
		standardSignaRussianTemplate: "Ротовые ванночки по 1 минуте 3 раза в день после еды, 7 дней (не полоскать активно!).",
	},
	{
		id: "articaine",
		mnnRu: "Артикаин + Эпинефрин",
		mnnLatin: "Articainum et Epinephrinum",
		aliasesRu: ["артикаин", "ультракаин", "септонест", "септанест", "убистезин", "брилокаин", "articaine", "ultracain"],
		category: "anesthetic",
		categoryLabelRu: "Местный анестетик амидного ряда с вазоконстриктором",
		standardDosages: ["4% + 1:100 000", "4% + 1:200 000"],
		maxSingleDoseRu: "7 мг/кг массы тела (у взрослых до 500 мг / ~7 карпул по 1.7 мл)",
		maxDailyDoseRu: "7 мг/кг (взрослые), 5 мг/кг (дети от 4 лет)",
		pediatricNotesRu: "Противопоказан детям до 4 лет. Детям от 4 лет (от 20 кг) макс. 5 мг/кг.",
		standardSignaLatinPrefix: "Rp.: Sol. Articaini 4% cum Epinephrino",
		standardSignaRussianTemplate: "Для инфильтрационной или проводниковой анестезии в стоматологии (1.7–3.4 мл).",
	},
	{
		id: "nimesulide",
		mnnRu: "Нимесулид",
		mnnLatin: "Nimesulidum",
		aliasesRu: ["нимесулид", "нимесил", "найз", "nimesulide", "nimesil"],
		category: "nsaid",
		categoryLabelRu: "НПВП (селективный ингибитор ЦОГ-2)",
		standardDosages: ["100 мг"],
		maxSingleDoseRu: "100 мг (1 пакетик/таблетка)",
		maxDailyDoseRu: "200 мг (2 пакетика в сутки)",
		pediatricNotesRu: "Противопоказан детям до 12 лет (риск гепатотоксичности).",
		standardSignaLatinPrefix: "Rp.: Nimesulidi 100 mg",
		standardSignaRussianTemplate: "Внутрь по 1 пакетику (100 мг) 2 раза в день после еды, растворив в 100 мл воды, курс до 5 дней.",
	},
	{
		id: "ketorolac",
		mnnRu: "Кеторолак",
		mnnLatin: "Ketorolacum",
		aliasesRu: ["кеторолак", "кетанов", "кеторол", "ketorolac", "ketanov"],
		category: "nsaid",
		categoryLabelRu: "НПВП с выраженным анальгетическим действием",
		standardDosages: ["10 мг"],
		maxSingleDoseRu: "10 мг (1 таблетка)",
		maxDailyDoseRu: "40 мг (4 таблетки в сутки)",
		pediatricNotesRu: "Противопоказан детям и подросткам до 16 лет.",
		standardSignaLatinPrefix: "Rp.: Tab. Ketorolaci 10 mg",
		standardSignaRussianTemplate: "Внутрь по 1 таблетке (10 мг) при острой боли с интервалом не менее 4–6 часов (курс до 5 дней).",
	},
	{
		id: "chloropyramine",
		mnnRu: "Хлоропирамин",
		mnnLatin: "Chloropyraminum",
		aliasesRu: ["хлоропирамин", "супрастин", "suprastin", "chloropyramine"],
		category: "antihistamine",
		categoryLabelRu: "Антигистаминное средство 1-го поколения",
		standardDosages: ["25 мг"],
		maxSingleDoseRu: "25 мг (1 таблетка)",
		maxDailyDoseRu: "75–100 мг (3–4 таблетки в сутки)",
		pediatricNotesRu: "Детям: от 1 до 6 лет по 1/4 таб. 2-3 р/д; от 6 до 14 лет по 1/2 таб. 2-3 р/д.",
		standardSignaLatinPrefix: "Rp.: Tab. Chloropyramini 25 mg",
		standardSignaRussianTemplate: "Внутрь по 1 таблетке (25 мг) 2–3 раза в день во время еды, курс 3–5 дней.",
	},
	{
		id: "ciprofloxacin",
		mnnRu: "Ципрофлоксацин",
		mnnLatin: "Ciprofloxacinum",
		aliasesRu: ["ципрофлоксацин", "ципролет", "цифран", "ципромед", "ciprofloxacin", "ciprolet"],
		category: "antibiotic",
		categoryLabelRu: "Антибиотик фторхинолонового ряда",
		standardDosages: ["250 мг", "500 мг"],
		maxSingleDoseRu: "500 мг (1 таблетка)",
		maxDailyDoseRu: "1000 мг (2 таблетки в сутки)",
		pediatricNotesRu: "Противопоказан детям и подросткам до 18 лет.",
		standardSignaLatinPrefix: "Rp.: Tab. Ciprofloxacini 500 mg",
		standardSignaRussianTemplate: "Внутрь по 1 таблетке (500 мг) 2 раза в день за 30 мин до еды, курс 5–7 дней.",
	},
	{
		id: "cholisal",
		mnnRu: "Холина салицилат + Цеталкония хлорид",
		mnnLatin: "Cholini salicylas + Cetalkonii chloridum",
		aliasesRu: ["холисал", "холина салицилат", "cholisal", "холисал гель"],
		category: "dental_gel",
		categoryLabelRu: "Стоматологический гель противовоспалительный/анальгезирующий",
		standardDosages: ["10 г", "15 г"],
		maxSingleDoseRu: "Полоска 1 см геля",
		maxDailyDoseRu: "Местно 2–3 раза в сутки",
		pediatricNotesRu: "Детям старше 1 года с осторожностью (полоска 0.5 см).",
		standardSignaLatinPrefix: "Rp.: Gel. 'Cholisal' 10.0",
		standardSignaRussianTemplate: "Наносить на десну чистым пальцем полоской 1 см 2–3 раза в день за 15 минут до еды.",
	},
	{
		id: "solcoseryl",
		mnnRu: "Депротеинизированный диализат из крови телят + Полидоканол",
		mnnLatin: "Solcoseryl pasta dentalis adhesiva",
		aliasesRu: ["солкосерил", "солкосерил дентальная", "солкосерил паста", "solcoseryl"],
		category: "dental_gel",
		categoryLabelRu: "Стоматологическая адгезивная регенерирующая паста",
		standardDosages: ["5 г"],
		maxSingleDoseRu: "Полоска пасты около 0.5 см",
		maxDailyDoseRu: "Местно 3–5 раз в сутки после еды",
		pediatricNotesRu: "Применять по назначению врача без строгих возрастных ограничений.",
		standardSignaLatinPrefix: "Rp.: Pastae Solcoseryl dentalis adhesivae 5.0",
		standardSignaRussianTemplate: "Наносить на высушенный дефект слизистой оболочки рта тонким слоем 3–5 раз в сутки после еды и перед сном.",
	},
];

export const DENTAL_STATUTORY_MNN_CATALOG: readonly DentalMnnDefinition[] & Record<string, DentalMnnDefinition> = Object.assign(
	DENTAL_STATUTORY_MNN_ARRAY.map((item) => ({ ...item, key: item.id })),
	Object.fromEntries(DENTAL_STATUTORY_MNN_ARRAY.map((item) => [item.id, { ...item, key: item.id }])),
);

export interface DentalMnnValidationResult {
	readonly isValid: boolean;
	readonly matchedMnn?: DentalMnnDefinition | undefined;
	readonly normalizedQuery: string;
	readonly messageRu: string;
	readonly isTradeName?: boolean | undefined;
	readonly warning?: string | undefined;
}

/**
 * Валидация Международного Непатентованного Наименования (МНН) препарата
 * согласно требованиям Приказа Минздрава России № 1094н и ГРЛС РФ.
 */
export function validateDentalMnn(query: string): DentalMnnValidationResult {
	const cleaned = query.trim().toLowerCase();
	if (!cleaned) {
		return {
			isValid: false,
			normalizedQuery: "",
			messageRu: "Наименование МНН препарата не может быть пустым.",
			warning: "Наименование МНН препарата не может быть пустым.",
		};
	}

	const found = DENTAL_STATUTORY_MNN_CATALOG.find((item) => {
		if (item.mnnRu.toLowerCase() === cleaned) return true;
		if (item.mnnLatin.toLowerCase() === cleaned) return true;
		if (item.aliasesRu.some((a) => cleaned.includes(a.toLowerCase()) || a.toLowerCase().includes(cleaned))) return true;
		return false;
	});

	if (found) {
		const isDirectMnn =
			found.mnnRu.toLowerCase() === cleaned ||
			found.mnnLatin.toLowerCase() === cleaned;
		const isTradeName = !isDirectMnn;

		return {
			isValid: true,
			matchedMnn: { ...found, key: found.id },
			normalizedQuery: cleaned,
			isTradeName,
			messageRu: `Препарат верифицирован по МНН Минздрава РФ: ${found.mnnRu} (${found.mnnLatin}). Группа: ${found.categoryLabelRu}.`,
			warning: isTradeName
				? `Внимание (Приказ 1094н): указано торговое наименование «${query}». В официальном рецептурном бланке препарат будет выписан по МНН: «${found.mnnRu}».`
				: undefined,
		};
	}

	return {
		isValid: false,
		normalizedQuery: cleaned,
		messageRu: `Препарат «${query}» не найден в каноническом стоматологическом справочнике МНН (Приказ 1094н). Рекомендуется сверить с Государственным реестром лекарственных средств (ГРЛС).`,
		warning: `По Приказу Минздрава РФ № 1094н выписка рецептов осуществляется строго по МНН. Торговое или незарегистрированное название «${query}» требует уточнения МНН.`,
	};
}

export interface LatinRxSignaValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
	readonly parsedComponents: {
		readonly hasRpPrefix: boolean;
		readonly hasDispenseDtd: boolean;
		readonly hasSignaPrefix: boolean;
		readonly cleanedSignaRu: string;
	};
}

/**
 * Валидация способа применения и латинской прописи по Приказу 1094н (Rp, Dtd, Signa).
 */
export function validateLatinRxSigna(params: {
	latinRp?: string;
	latinName?: string;
	dispenseLatin?: string;
	dispenseFormula?: string;
	signaRu?: string;
}): LatinRxSignaValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	const rp = (params.latinRp || params.latinName || "").trim();
	const dtd = (params.dispenseLatin || params.dispenseFormula || "").trim();
	const signa = (params.signaRu || "").trim();

	const hasRpPrefix = /^Rp\s*[.:]/i.test(rp);
	if (!hasRpPrefix) {
		errors.push("Латинская часть прописи обязана начинаться с 'Rp.:' (Recipe — Возьми).");
	}

	const hasDispenseDtd = /^D\.?\s*t\.?\s*d\.?/i.test(dtd);
	if (!hasDispenseDtd) {
		errors.push("Указание отпуска препарата обязано содержать формулу 'D.t.d.' (Da tales doses — Выдай такие дозы).");
	}

	const hasSignaPrefix = /^(?:D\.?\s*)?S[.:]?\s*/i.test(signa);
	const cleanedSignaRu = signa.replace(/^(?:D\.?\s*)?S[.:]?\s*/i, "").trim();

	if (!cleanedSignaRu) {
		errors.push("Сигнатура (способ применения) не может быть пустой (Приказ Минздрава РФ № 1094н).");
	}

	if (
		/^(?:известно|внутреннее|наружное|по указанию|по назначению|как обычно|по схеме|по назначению врача|употреблять по указанию|внутрь как обычно)$/i.test(cleanedSignaRu) ||
		/по назначению врача/i.test(cleanedSignaRu) ||
		/употреблять по указанию/i.test(cleanedSignaRu) ||
		/по схеме/i.test(cleanedSignaRu) ||
		/^известно$/i.test(cleanedSignaRu) ||
		/^внутреннее$/i.test(cleanedSignaRu) ||
		/^наружное$/i.test(cleanedSignaRu)
	) {
		errors.push("По Приказу № 1094н запрещается ограничиваться неопределенными общими указаниями: «Внутреннее», «Известно», «По схеме», «По назначению врача». Укажите точную дозу, кратность и курс.");
	}

	const hasFrequency = /(?:раз[а-я]*\s+в\s+(?:день|сутки)|каждые|утром|вечером|после еды|до еды|во время еды|при болях|ванночки|полоска|анестези)/i.test(cleanedSignaRu);
	if (!hasFrequency && cleanedSignaRu.length > 0) {
		warnings.push("В сигнатуре рекомендуется указать кратность приёма или взаимосвязь с приёмом пищи/манипуляцией.");
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		parsedComponents: {
			hasRpPrefix,
			hasDispenseDtd,
			hasSignaPrefix,
			cleanedSignaRu,
		},
	};
}

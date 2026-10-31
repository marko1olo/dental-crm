/**
 * PEDIATRIC DENTISTRY CATALOG & CLINICAL EBM SSOT
 * Canonical data structures, Frankl behavior scale, weight calculation,
 * FDI 51-85 milk dentition, anesthesia safety limits & printable documents.
 * Mandates: 8e (Doctor Autonomy), 8y (Zero-Paranoia EBM), 8x (Clean Russian), 8b (280-350 lines).
 */

export type FranklRating = 1 | 2 | 3 | 4;

export interface FranklBehaviorItem {
	readonly rating: FranklRating;
	readonly symbol: "--" | "-" | "+" | "++";
	readonly labelRu: string;
	readonly descriptionRu: string;
	readonly clinicalTacticRu: string;
	readonly badgeColor: string;
}

export const FRANKL_BEHAVIOR_PRESETS: readonly FranklBehaviorItem[] = [
	{
		rating: 1,
		symbol: "--",
		labelRu: "Резко отрицательное",
		descriptionRu: "Отказ от контакта, плач, активное физическое сопротивление.",
		clinicalTacticRu: "Адаптационный визит, знакомство с зеркалом, седация закисью азота (ЗАКС).",
		badgeColor: "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800",
	},
	{
		rating: 2,
		symbol: "-",
		labelRu: "Отрицательное",
		descriptionRu: "Неохотное сотрудничество, скованность, периодический плач.",
		clinicalTacticRu: "Техника «Скажи-Покажи-Сделай» (Tell-Show-Do), тактильное привыкание.",
		badgeColor: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800",
	},
	{
		rating: 3,
		symbol: "+",
		labelRu: "Положительное",
		descriptionRu: "Осторожное сотрудничество, выполнение инструкций врача, контактность.",
		clinicalTacticRu: "Позитивное подкрепление, похвала за смелость, награждение дипломом.",
		badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
	},
	{
		rating: 4,
		symbol: "++",
		labelRu: "Абсолютно положительное",
		descriptionRu: "Полное доверие, искренний интерес к инструментам, радость и смех.",
		clinicalTacticRu: "Быстрое полноценное лечение, активное вовлечение в процесс.",
		badgeColor: "bg-teal-500/10 text-teal-600 border-teal-200 dark:border-teal-800",
	},
];

export const PEDIATRIC_WEIGHT_CHIPS: readonly number[] = [12, 16, 20, 25, 30];

export function estimatePediatricWeightKg(ageYears: number): number {
	if (ageYears <= 1) return 10;
	if (ageYears <= 3) return 14;
	if (ageYears <= 5) return 18;
	if (ageYears <= 7) return 23;
	if (ageYears <= 9) return 28;
	if (ageYears <= 12) return 36;
	return 45;
}

export type PediatricAnestheticId = "articaine_4" | "mepivacaine_3";

export interface PediatricAnestheticInfo {
	readonly id: PediatricAnestheticId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly tradeNamesRu: string;
	readonly maxMgPerKg: number;
	readonly mgPerCarpule: number;
	readonly carpuleVolumeMl: number;
	readonly minAgeYears: number;
	readonly vasoconstrictorRu: string;
	readonly indicationsRu: string;
}

export const PEDIATRIC_ANESTHETICS: Record<PediatricAnestheticId, PediatricAnestheticInfo> = {
	articaine_4: {
		id: "articaine_4",
		nameRu: "Артикаин 4% с эпинефрином 1:200 000",
		shortLabelRu: "Артикаин 4% (до 5 мг/кг)",
		tradeNamesRu: "Ультракаин Д-С / Септанест / Убистезин",
		maxMgPerKg: 5.0,
		mgPerCarpule: 68.0,
		carpuleVolumeMl: 1.7,
		minAgeYears: 4,
		vasoconstrictorRu: "Эпинефрин 1:200 000 (низкая доза)",
		indicationsRu: "Препарат выбора для детей от 4 лет при лечении пульпита и удалении зубов.",
	},
	mepivacaine_3: {
		id: "mepivacaine_3",
		nameRu: "Мепивакаин 3% без вазоконстриктора",
		shortLabelRu: "Мепивакаин 3% (до 4 мг/кг)",
		tradeNamesRu: "Скандонест 3% / Мепивастезин",
		maxMgPerKg: 4.0,
		mgPerCarpule: 51.0,
		carpuleVolumeMl: 1.7,
		minAgeYears: 3,
		vasoconstrictorRu: "Без вазоконстриктора (Адреналин-free)",
		indicationsRu: "Рекомендован детям с аллергией на сульфиты, астмой и до 4 лет.",
	},
};

export interface PediatricAnesthesiaSafetyResult {
	readonly drug: PediatricAnestheticInfo;
	readonly weightKg: number;
	readonly carpules: number;
	readonly totalVolumeMl: number;
	readonly administeredMg: number;
	readonly maxAllowedMg: number;
	readonly maxSafeCarpules: number;
	readonly percentUsed: number;
	readonly isSafe: boolean;
	readonly isOverdose: boolean;
	readonly isUnderAge: boolean;
	readonly statusMessageRu: string;
}

export function calculatePediatricAnesthesiaSafety(params: {
	readonly drugId: PediatricAnestheticId;
	readonly weightKg: number;
	readonly carpules: number;
	readonly ageYears: number;
}): PediatricAnesthesiaSafetyResult {
	const drug = PEDIATRIC_ANESTHETICS[params.drugId] || PEDIATRIC_ANESTHETICS.articaine_4;
	const safeWeight = Math.max(5, Math.min(100, params.weightKg));
	const maxAllowedMg = Number((safeWeight * drug.maxMgPerKg).toFixed(1));
	const administeredMg = Number((params.carpules * drug.mgPerCarpule).toFixed(1));
	const totalVolumeMl = Number((params.carpules * drug.carpuleVolumeMl).toFixed(2));
	const maxSafeCarpules = Number((maxAllowedMg / drug.mgPerCarpule).toFixed(2));
	const percentUsed = Number(((administeredMg / (maxAllowedMg || 1)) * 100).toFixed(0));

	const isOverdose = administeredMg > maxAllowedMg;
	const isUnderAge = params.ageYears < drug.minAgeYears;
	const isSafe = !isOverdose && !isUnderAge;

	let statusMessageRu = `Доза безопасна (${percentUsed}% от МРД, максимум ${maxSafeCarpules} карп.)`;
	if (isOverdose) {
		statusMessageRu = `Внимание: превышение расчетного предела (${administeredMg} мг > ${maxAllowedMg} мг). Решение врача.`;
	} else if (isUnderAge) {
		statusMessageRu = `Внимание: возраст ${params.ageYears} лет меньше стандартного порога ${drug.minAgeYears} года.`;
	}

	return {
		drug,
		weightKg: safeWeight,
		carpules: params.carpules,
		totalVolumeMl,
		administeredMg,
		maxAllowedMg,
		maxSafeCarpules,
		percentUsed,
		isSafe,
		isOverdose,
		isUnderAge,
		statusMessageRu,
	};
}

export interface PrimaryToothMeta {
	readonly toothNumber: number;
	readonly nameRu: string;
	readonly quadrant: 5 | 6 | 7 | 8;
	readonly position: 1 | 2 | 3 | 4 | 5;
}

export const PRIMARY_TEETH_FDI: readonly PrimaryToothMeta[] = [
	{ toothNumber: 55, nameRu: "Второй верхний правый моляр", quadrant: 5, position: 5 },
	{ toothNumber: 54, nameRu: "Первый верхний правый моляр", quadrant: 5, position: 4 },
	{ toothNumber: 53, nameRu: "Верхний правый клык", quadrant: 5, position: 3 },
	{ toothNumber: 52, nameRu: "Боковой верхний правый резец", quadrant: 5, position: 2 },
	{ toothNumber: 51, nameRu: "Центральный верхний правый резец", quadrant: 5, position: 1 },
	{ toothNumber: 61, nameRu: "Центральный верхний левый резец", quadrant: 6, position: 1 },
	{ toothNumber: 62, nameRu: "Боковой верхний левый резец", quadrant: 6, position: 2 },
	{ toothNumber: 63, nameRu: "Верхний левый клык", quadrant: 6, position: 3 },
	{ toothNumber: 64, nameRu: "Первый верхний левый моляр", quadrant: 6, position: 4 },
	{ toothNumber: 65, nameRu: "Второй верхний левый моляр", quadrant: 6, position: 5 },
	{ toothNumber: 75, nameRu: "Второй нижний левый моляр", quadrant: 7, position: 5 },
	{ toothNumber: 74, nameRu: "Первый нижний левый моляр", quadrant: 7, position: 4 },
	{ toothNumber: 73, nameRu: "Нижний левый клык", quadrant: 7, position: 3 },
	{ toothNumber: 72, nameRu: "Боковой нижний левый резец", quadrant: 7, position: 2 },
	{ toothNumber: 71, nameRu: "Центральный нижний левый резец", quadrant: 7, position: 1 },
	{ toothNumber: 81, nameRu: "Центральный нижний правый резец", quadrant: 8, position: 1 },
	{ toothNumber: 82, nameRu: "Боковой нижний правый резец", quadrant: 8, position: 2 },
	{ toothNumber: 83, nameRu: "Нижний правый клык", quadrant: 8, position: 3 },
	{ toothNumber: 84, nameRu: "Первый нижний правый моляр", quadrant: 8, position: 4 },
	{ toothNumber: 85, nameRu: "Второй нижний правый моляр", quadrant: 8, position: 5 },
];

export type PrimaryToothCondition = "healthy" | "caries" | "pulpotomy" | "sealed" | "resorption" | "extracted";

export interface PrimaryToothConditionInfo {
	readonly id: PrimaryToothCondition;
	readonly labelRu: string;
	readonly shortTag: string;
	readonly badgeClass: string;
	readonly toothVisualColor: string;
}

export const PRIMARY_TOOTH_CONDITIONS: Record<PrimaryToothCondition, PrimaryToothConditionInfo> = {
	healthy: {
		id: "healthy",
		labelRu: "Интактный / Здоров",
		shortTag: "Здоров",
		badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-300",
		toothVisualColor: "var(--teal,#0d9488)",
	},
	caries: {
		id: "caries",
		labelRu: "Кариес молочного зуба",
		shortTag: "Кариес",
		badgeClass: "bg-amber-500/10 text-amber-600 border-amber-300",
		toothVisualColor: "var(--amber,#f59e0b)",
	},
	pulpotomy: {
		id: "pulpotomy",
		labelRu: "Пульпотомия / Ампутация",
		shortTag: "Пульпотомия",
		badgeClass: "bg-rose-500/10 text-rose-600 border-rose-300",
		toothVisualColor: "var(--rose,#f43f5e)",
	},
	sealed: {
		id: "sealed",
		labelRu: "Герметизация фиссур",
		shortTag: "Герметизация",
		badgeClass: "bg-sky-500/10 text-sky-600 border-sky-300",
		toothVisualColor: "var(--sky,#0284c7)",
	},
	resorption: {
		id: "resorption",
		labelRu: "Физиологическая смена",
		shortTag: "Резорбция",
		badgeClass: "bg-purple-500/10 text-purple-600 border-purple-300",
		toothVisualColor: "var(--purple,#a855f7)",
	},
	extracted: {
		id: "extracted",
		labelRu: "Удален по смене",
		shortTag: "Удален",
		badgeClass: "bg-slate-500/10 text-slate-500 border-slate-300",
		toothVisualColor: "var(--line,#94a3b8)",
	},
};

export interface PediatricAgePreset {
	readonly id: string;
	readonly labelRu: string;
	readonly ageRangeYears: string;
	readonly defaultWeightKg: number;
	readonly dentitionRu: string;
	readonly primaryFocusRu: string;
}

export const PEDIATRIC_AGE_PRESETS: readonly PediatricAgePreset[] = [
	{
		id: "toddlers",
		labelRu: "3–6 лет",
		ageRangeYears: "3–6 лет",
		defaultWeightKg: 16,
		dentitionRu: "Молочный прикус (51–85)",
		primaryFocusRu: "Адаптация, серебрение, герметизация фиссур, лечение кариеса",
	},
	{
		id: "mixed",
		labelRu: "7–11 лет",
		ageRangeYears: "7–11 лет",
		defaultWeightKg: 25,
		dentitionRu: "Сменный прикус",
		primaryFocusRu: "Контроль смены зубов, резорбция корней, первые постоянные моляры",
	},
	{
		id: "teens",
		labelRu: "12–17 лет",
		ageRangeYears: "12–17 лет",
		defaultWeightKg: 45,
		dentitionRu: "Постоянный прикус",
		primaryFocusRu: "Ортодонтия, гигиена, профилактика контактного кариеса",
	},
];

export function buildHeroDiplomaSummary(params: {
	readonly heroName: string;
	readonly doctorName: string;
	readonly clinicName: string;
	readonly visitDateRu: string;
	readonly diplomaNumber: string;
}): string {
	return [
		`🏆 ДИПЛОМ МАЛЕНЬКОГО ГЕРОЯ № ${params.diplomaNumber}`,
		`Награждается: ${params.heroName}`,
		"За невероятную храбрость, ослепительную улыбку и дружбу с Зубной Феей на стоматологическом приёме!",
		`Лечащий врач: ${params.doctorName}`,
		`Клиника: ${params.clinicName} • ${params.visitDateRu}`,
	].join("\n");
}

export function buildParentMemoSummary(params: {
	readonly patientName: string;
	readonly doctorName: string;
	readonly clinicName: string;
	readonly hadAnesthesia: boolean;
	readonly treatedTeeth: string;
	readonly recommendationsRu?: string;
}): string {
	const anesthesiaAlert = params.hadAnesthesia
		? "• ВНИМАНИЕ: Проведена анестезия. Не разрешайте ребенку прикусывать губу и щёку до отхода заморозки (1.5–2 часа)!"
		: "• Лечение проведено комфортно без анестезии.";

	const custom = params.recommendationsRu ? `\n• Индивидуальные советы: ${params.recommendationsRu}` : "";

	return [
		`📋 ПАМЯТКА РОДИТЕЛЯМ ПО УХОДУ — ${params.patientName}`,
		`Лечащий врач: ${params.doctorName} (${params.clinicName})`,
		`Вылеченные зубы: ${params.treatedTeeth || "Профилактический осмотр"}`,
		anesthesiaAlert,
		"• Приём пищи: мягкая не горячая еда после окончания действия анестезии.",
		"• Чистка зубов: мягкой детской щеткой 2 раза в день круговыми движениями.",
		custom,
	].filter(Boolean).join("\n");
}

export function printPediatricDocument(html: string): void {
	if (typeof window === "undefined") return;
	const iframe = document.createElement("iframe");
	iframe.style.position = "fixed";
	iframe.style.right = "0";
	iframe.style.bottom = "0";
	iframe.style.width = "0";
	iframe.style.height = "0";
	iframe.style.border = "0";
	document.body.appendChild(iframe);
	const doc = iframe.contentWindow?.document;
	if (doc) {
		doc.open();
		doc.write(html);
		doc.close();
		iframe.contentWindow?.focus();
		iframe.contentWindow?.print();
	}
	setTimeout(() => {
		try {
			document.body.removeChild(iframe);
		} catch {}
	}, 1000);
}

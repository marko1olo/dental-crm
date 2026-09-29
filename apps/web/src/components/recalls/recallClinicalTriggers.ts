import type {
	ClinicalRecallTriggerInfo,
	ClinicalRecallTriggerType,
	PatientRecallRecord,
} from "./recallCycleCatalog";
import {
	addCalendarMonthsSafe,
	addWeeksSafe,
	formatIsoDateOnly,
} from "./recallDateMath";

/**
 * Триггер 1: Профгигиена — 6 месяцев после последней чистки.
 * Золотой стандарт профилактики и сохранения гарантийных обязательств клиники.
 */
export function calculateHygieneRecallTrigger(
	lastCleaningDate: Date | string,
	customMonths = 6,
): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 6;
	const nextDueDate = addCalendarMonthsSafe(lastCleaningDate, months);
	return {
		triggerType: "hygiene_6m",
		title: "Плановый осмотр и профессиональная гигиена полости рта",
		shortTitle: "Профгигиена 6 мес.",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale:
			"Золотой стандарт стоматологической профилактики. Снятие зубных отложений (Air-Flow + УЗ), " +
			"онкоскрининг слизистой и сохранение гарантийных обязательств через 6 месяцев после последней чистки.",
		mappedCycleType: "standard_prophylaxis",
	};
}

/**
 * Триггер 2: Осмотр после имплантации / протезирования — 12 месяцев.
 * Годовой рентген-контроль остеоинтеграции и краевого прилегания ортопедии.
 */
export function calculateImplantProstheticRecallTrigger(
	lastProcedureDate: Date | string,
	customMonths = 12,
): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 12;
	const nextDueDate = addCalendarMonthsSafe(lastProcedureDate, months);
	return {
		triggerType: "implant_prosthetic_12m",
		title: "Контрольный осмотр после имплантации и протезирования",
		shortTitle: "Импланты/Ортопедия 12 мес.",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale:
			"Годовой рентген-контроль остеоинтеграции имплантатов по протоколу СтАР/ITI, ревизия окклюзионного баланса " +
			"и краевого прилегания ортопедических конструкций для сохранения гарантий.",
		mappedCycleType: "implant_monitoring",
	};
}

/**
 * Триггер 3: Ортодонтическая активация — 1 месяц (строго 4 недели / 28 дней).
 * Плановая смена и активация дуг, замена лигатур и эластиков.
 */
export function calculateOrthoActivationRecallTrigger(
	lastActivationDate: Date | string,
	customWeeks = 4,
): ClinicalRecallTriggerInfo {
	const weeks = customWeeks > 0 ? customWeeks : 4;
	const nextDueDate = addWeeksSafe(lastActivationDate, weeks);
	return {
		triggerType: "ortho_activation_1m",
		title: "Ортодонтический контроль: плановая активация и замена дуг",
		shortTitle: "Орто-активация 1 мес.",
		intervalMonths: 1,
		intervalWeeks: weeks,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale:
			"Плановая замена и активация ортодонтических дуг (NiTi / TMA / SS), смена лигатур и эластиков " +
			"строго каждые 4 недели (28 дней) для непрерывного и прогнозируемого перемещения зубов.",
		mappedCycleType: "orthodontic_braces",
	};
}

/**
 * Триггер 4: Детский осмотр — 3–4 месяца.
 * Контроль формирующегося прикуса, ремотерапия незрелой эмали и герметизация фиссур.
 */
export function calculatePediatricRecallTrigger(
	lastVisitDate: Date | string,
	intervalMonths: 3 | 4 = 3,
): ClinicalRecallTriggerInfo {
	const months = intervalMonths === 4 ? 4 : 3;
	const nextDueDate = addCalendarMonthsSafe(lastVisitDate, months);
	return {
		triggerType: "pediatric_3_4m",
		title: `Детский профилактический осмотр и минерализация эмали (${months} мес.)`,
		shortTitle: `Детский осмотр ${months} мес.`,
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale:
			"Высокая скорость деминерализации незрелой эмали временных и сменных зубов у детей требует " +
			"контрольного осмотра гигиены, фторирования и герметизации фиссур каждые 3–4 месяца.",
		mappedCycleType: "pediatric_fluoridation",
	};
}

/**
 * Единый автоматический классификатор клинического триггера возврата.
 */
export function evaluateClinicalRecallTrigger(clinicalData: {
	readonly lastVisitDate?: (Date | string) | undefined;
	readonly isChildUnder14?: boolean | undefined;
	readonly hasBraces?: boolean | undefined;
	readonly hasOrthodonticAppliance?: boolean | undefined;
	readonly hasImplants?: boolean | undefined;
	readonly hasCrownsOrVeneers?: boolean | undefined;
	readonly hasProsthetics?: boolean | undefined;
	readonly maxPocketDepthMm?: number | undefined;
	readonly hasBleedingOnProbing?: boolean | undefined;
	readonly customIntervalMonths?: number | undefined;
}): ClinicalRecallTriggerInfo {
	const lastDate = clinicalData.lastVisitDate ?? new Date();

	if (clinicalData.isChildUnder14) {
		const interval = clinicalData.customIntervalMonths === 4 ? 4 : 3;
		return calculatePediatricRecallTrigger(lastDate, interval);
	}

	if (clinicalData.hasBraces || clinicalData.hasOrthodonticAppliance) {
		return calculateOrthoActivationRecallTrigger(lastDate, 4);
	}

	if (
		clinicalData.hasImplants ||
		clinicalData.hasCrownsOrVeneers ||
		clinicalData.hasProsthetics
	) {
		return calculateImplantProstheticRecallTrigger(
			lastDate,
			clinicalData.customIntervalMonths ?? 12,
		);
	}

	return calculateHygieneRecallTrigger(
		lastDate,
		clinicalData.customIntervalMonths ?? 6,
	);
}

/**
 * Автоматическое сопоставление карточки кандидата с клиническим триггером.
 */
export function resolveCandidateTriggerType(candidate: PatientRecallRecord): ClinicalRecallTriggerType {
	if (candidate.clinicalTriggerType) {
		return candidate.clinicalTriggerType;
	}

	const lowerPlan = (candidate.treatmentPlanTitle ?? "").toLowerCase();
	const lowerProcs = (candidate.lastProcedures ?? []).join(" ").toLowerCase();
	const notes = (candidate.clinicalNotes ?? "").toLowerCase();
	const combined = `${lowerPlan} ${lowerProcs} ${notes}`;

	if (
		candidate.isChildUnder14 ||
		candidate.age !== undefined && candidate.age < 14 ||
		combined.includes("детск") ||
		combined.includes("молочн")
	) {
		return "pediatric_3_4m";
	}

	if (
		candidate.hasBraces ||
		candidate.cycleType === "orthodontic_braces" ||
		candidate.cycleType === "orthodontic_aligners" ||
		combined.includes("брекет") ||
		combined.includes("элайнер") ||
		combined.includes("дуг")
	) {
		return "ortho_activation_1m";
	}

	if (
		(candidate.implantsCount && candidate.implantsCount > 0) ||
		candidate.cycleType === "implant_monitoring" ||
		candidate.cycleType === "prosthetic_check" ||
		combined.includes("имплант") ||
		combined.includes("коронк") ||
		combined.includes("протез")
	) {
		return "implant_prosthetic_12m";
	}

	return "hygiene_6m";
}

/**
 * Идентификаторы независимых клинических каналов диспансерного контроля (Мандат Multi-Recall Separation).
 * Разные клинические поводы не должны затирать друг друга в один общий таймер.
 */
export type ClinicalRecallChannelId =
	| "hygiene_periodontal"
	| "implant_monitoring"
	| "orthodontic_activation"
	| "pediatric_prophylaxis";

/**
 * Триггер: Пародонтологический контроль (SPT) — 3-4 месяца.
 * Применяется при пародонтите, глубоких карманах >= 4мм или кровоточивости BOP.
 */
export function calculatePeriodontalRecallTrigger(
	lastProcedureDate: Date | string,
	customMonths = 3,
): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 3;
	const nextDueDate = addCalendarMonthsSafe(lastProcedureDate, months);
	return {
		triggerType: "hygiene_6m",
		title: `Поддерживающая пародонтальная терапия (SPT) и контроль карманов (${months} мес.)`,
		shortTitle: `Пародонтология ${months} мес.`,
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale:
			"Хронический пародонтит, глубина ПК >= 4 мм, кровоточивость при зондировании BOP. " +
			"Профилактика деструкции альвеолярной кости и рецидива воспаления каждые 3–4 месяца.",
		mappedCycleType: "periodontal_maintenance",
	};
}

export interface PatientClinicalStatusInput {
	readonly lastVisitDate?: (Date | string) | undefined;
	readonly lastCleaningDate?: (Date | string) | undefined;
	readonly implantSurgeryDate?: (Date | string) | undefined;
	readonly lastOrthoAdjustmentDate?: (Date | string) | undefined;
	readonly lastPediatricVisitDate?: (Date | string) | undefined;
	readonly isChildUnder14?: boolean | undefined;
	readonly age?: number | undefined;
	readonly hasBraces?: boolean | undefined;
	readonly hasAligners?: boolean | undefined;
	readonly hasOrthodonticAppliance?: boolean | undefined;
	readonly hasImplants?: boolean | undefined;
	readonly implantsCount?: number | undefined;
	readonly hasCrownsOrVeneers?: boolean | undefined;
	readonly hasProsthetics?: boolean | undefined;
	readonly maxPocketDepthMm?: number | undefined;
	readonly hasBleedingOnProbing?: boolean | undefined;
	readonly customHygieneMonths?: number | undefined;
	readonly customOrthoWeeks?: number | undefined;
	readonly customPediatricMonths?: number | undefined;
	readonly customImplantMonths?: number | undefined;
	readonly referenceDate?: (Date | string) | undefined;
}

export interface MultiRecallEvaluationResult {
	readonly triggers: readonly (ClinicalRecallTriggerInfo & { readonly channelId: ClinicalRecallChannelId })[];
	readonly activeChannels: readonly ClinicalRecallChannelId[];
	readonly hasMultipleRecalls: boolean;
	readonly primaryTrigger: ClinicalRecallTriggerInfo;
}

/**
 * Изоляция и точность клинических каналов (Multi-Recall Separation).
 * Вычисляет ВСЕ активные клинические каналы для пациента независимо:
 * 1. Профгигиена / пародонтология (3 или 6 месяцев).
 * 2. Контроль остеоинтеграции имплантатов (3-6 месяцев после установки / 12 мес).
 * 3. Ортодонтическая активация (4-6 недель).
 * 4. Детский профосмотр / реминерализация (3 месяца).
 */
export function evaluateMultiRecallChannels(
	clinicalData: PatientClinicalStatusInput,
): MultiRecallEvaluationResult {
	const lastDate = clinicalData.lastVisitDate ?? new Date();
	const triggers: (ClinicalRecallTriggerInfo & { channelId: ClinicalRecallChannelId })[] = [];
	const activeChannels: ClinicalRecallChannelId[] = [];

	// 1. Канал: Профгигиена / пародонтология (всегда оценивается для каждого пациента)
	const isPeriodontal =
		(clinicalData.maxPocketDepthMm !== undefined && clinicalData.maxPocketDepthMm >= 4) ||
		clinicalData.hasBleedingOnProbing === true;
	const cleaningDate = clinicalData.lastCleaningDate ?? lastDate;

	if (isPeriodontal) {
		const perioInterval = clinicalData.customHygieneMonths ?? 3;
		const trig = calculatePeriodontalRecallTrigger(cleaningDate, perioInterval);
		triggers.push({ ...trig, channelId: "hygiene_periodontal" });
		activeChannels.push("hygiene_periodontal");
	} else {
		const hygieneInterval = clinicalData.customHygieneMonths ?? 6;
		const trig = calculateHygieneRecallTrigger(cleaningDate, hygieneInterval);
		triggers.push({ ...trig, channelId: "hygiene_periodontal" });
		activeChannels.push("hygiene_periodontal");
	}

	// 2. Канал: Контроль приживления имплантата / ортопедия (3-6 месяцев / этапы 1, 3, 6, 12)
	const hasImplants =
		clinicalData.hasImplants ||
		(clinicalData.implantsCount !== undefined && clinicalData.implantsCount > 0) ||
		clinicalData.implantSurgeryDate !== undefined;
	const hasProsthetics = clinicalData.hasCrownsOrVeneers || clinicalData.hasProsthetics;

	if (hasImplants || hasProsthetics) {
		const implantDate = clinicalData.implantSurgeryDate ?? lastDate;
		const interval = clinicalData.customImplantMonths ?? (hasImplants ? 6 : 12);
		const trig = calculateImplantProstheticRecallTrigger(implantDate, interval);
		triggers.push({ ...trig, channelId: "implant_monitoring" });
		activeChannels.push("implant_monitoring");
	}

	// 3. Канал: Ортодонтическая активация (4-6 недель / 28-42 дня)
	const hasOrtho =
		clinicalData.hasBraces ||
		clinicalData.hasAligners ||
		clinicalData.hasOrthodonticAppliance;

	if (hasOrtho) {
		const orthoDate = clinicalData.lastOrthoAdjustmentDate ?? lastDate;
		const weeks = clinicalData.customOrthoWeeks ?? (clinicalData.hasAligners ? 6 : 4);
		const trig = calculateOrthoActivationRecallTrigger(orthoDate, weeks);
		triggers.push({ ...trig, channelId: "orthodontic_activation" });
		activeChannels.push("orthodontic_activation");
	}

	// 4. Канал: Детский профосмотр / реминерализация (3 месяца)
	const isChild =
		clinicalData.isChildUnder14 === true ||
		(clinicalData.age !== undefined && clinicalData.age < 14);

	if (isChild) {
		const pedDate = clinicalData.lastPediatricVisitDate ?? lastDate;
		const pedInterval = (clinicalData.customPediatricMonths === 4 ? 4 : 3) as 3 | 4;
		const trig = calculatePediatricRecallTrigger(pedDate, pedInterval);
		triggers.push({ ...trig, channelId: "pediatric_prophylaxis" });
		activeChannels.push("pediatric_prophylaxis");
	}

	// Primary trigger: приоритет по клинической срочности
	let primaryTrigger = triggers[0]!;
	if (isChild && triggers.some((t) => t.channelId === "pediatric_prophylaxis")) {
		primaryTrigger = triggers.find((t) => t.channelId === "pediatric_prophylaxis")!;
	} else if (hasOrtho && triggers.some((t) => t.channelId === "orthodontic_activation")) {
		primaryTrigger = triggers.find((t) => t.channelId === "orthodontic_activation")!;
	} else if (hasImplants && triggers.some((t) => t.channelId === "implant_monitoring")) {
		primaryTrigger = triggers.find((t) => t.channelId === "implant_monitoring")!;
	}

	return {
		triggers,
		activeChannels,
		hasMultipleRecalls: triggers.length > 1,
		primaryTrigger,
	};
}

export interface ClinicalProcedureIdentifier {
	readonly code?: string | undefined;
	readonly code804n?: string | undefined;
	readonly name?: string | undefined;
	readonly serviceName?: string | undefined;
}

/**
 * Проверка принадлежности услуги к профессиональной гигиене полости рта.
 * Номенклатура МЗ РФ 804н:
 * - A16.07.051 ("Профессиональная гигиена полости рта и зубов", Air-Flow + УЗ)
 * - A16.07.020 ("Удаление наддесневых и поддесневых зубных отложений")
 * - A16.07.039 ("Контролируемая чистка зубов с обучением гигиене")
 * - A22.07.001 ("Ультразвуковое удаление зубных отложений")
 * - A22.07.002 ("Ультразвуковая обработка пародонтального кармана")
 */
export function isProfessionalHygieneProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const rawCode = (proc.code804n || proc.code || "").trim();
	const cleanCode = rawCode.replace(/\s+/g, "").toUpperCase();

	if (
		cleanCode.startsWith("A16.07.051") ||
		cleanCode.startsWith("A16.07.020") ||
		cleanCode.startsWith("A16.07.039") ||
		cleanCode.startsWith("A22.07.001") ||
		cleanCode.startsWith("A22.07.002")
	) {
		return true;
	}

	const rawName = (proc.serviceName || proc.name || "").toLowerCase();
	if (!rawName) return false;

	const hygieneKeywords = [
		"профессиональная гигиена",
		"профессиональной гигиены",
		"профгигиен",
		"air-flow",
		"air flow",
		"airflow",
		"снятие зубных отложений",
		"удаление зубных отложений",
		"ультразвуковой скейлинг",
		"поддесневой скейлинг",
		"чистка air",
		"чистка зубов ультразвук",
		"кюретаж пародонтальных карманов",
		"vector-терапия",
		"вектор-терапия",
	];

	return hygieneKeywords.some((kw) => rawName.includes(kw));
}

/**
 * Проверка принадлежности услуги к ортодонтической активации/коррекции (дуги, лигатуры, элайнеры).
 */
export function isOrthodonticAdjustmentProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const rawCode = (proc.code804n || proc.code || "").trim().toUpperCase();
	if (
		rawCode.startsWith("A16.07.048") ||
		rawCode.startsWith("A16.07.047") ||
		rawCode.startsWith("A16.07.046")
	) {
		return true;
	}
	const rawName = (proc.serviceName || proc.name || "").toLowerCase();
	return (
		rawName.includes("активация дуг") ||
		rawName.includes("смена дуг") ||
		rawName.includes("замена дуг") ||
		rawName.includes("замена лигатур") ||
		rawName.includes("коррекция элайнер") ||
		rawName.includes("выдача элайнер") ||
		rawName.includes("ортодонтическая активация")
	);
}

/**
 * Проверка принадлежности услуги к контролю остеоинтеграции имплантатов / рентген-контролю.
 */
export function isImplantMonitoringProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const rawCode = (proc.code804n || proc.code || "").trim().toUpperCase();
	if (rawCode.startsWith("A16.07.054") || rawCode.startsWith("A06.07")) {
		const rawName = (proc.serviceName || proc.name || "").toLowerCase();
		if (rawName.includes("имплант") || rawName.includes("остеоинтеграц")) {
			return true;
		}
	}
	const rawName = (proc.serviceName || proc.name || "").toLowerCase();
	return (
		rawName.includes("контроль остеоинтеграции") ||
		rawName.includes("осмотр имплант") ||
		rawName.includes("рентген-контроль имплант") ||
		rawName.includes("ревизия имплант")
	);
}

/**
 * Проверка принадлежности услуги к детской профилактике / минерализации / герметизации.
 */
export function isPediatricProphylaxisProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const rawCode = (proc.code804n || proc.code || "").trim().toUpperCase();
	if (
		rawCode.startsWith("A16.07.057") || // Герметизация фиссур
		rawCode.startsWith("A11.07.012") || // Глубокое фторирование эмали
		rawCode.startsWith("A11.07.024")
	) {
		return true;
	}
	const rawName = (proc.serviceName || proc.name || "").toLowerCase();
	return (
		rawName.includes("фторирование") ||
		rawName.includes("герметизация фиссур") ||
		rawName.includes("ремотерапия") ||
		rawName.includes("детская гигиена")
	);
}

/**
 * Недопустимость ложного сброса Recall-таймера (False Recall Reset Prevention):
 *
 * Если пациент приходит на обычный терапевтический визит (лечение кариеса A16.07.002, пломба, пульпит A16.07.030),
 * recall на профгигиену НЕ ДОЛЖЕН сбрасываться!
 * Recall на профгигиену пересчитывается ТОЛЬКО в том случае, если в визите была реально проведена
 * и закрыта процедура профессиональной гигиены (код A16.07.051 или признак профгигиены).
 */
export function shouldResetRecallTimer(
	recall: {
		readonly cycleType: string;
		readonly clinicalTriggerType?: string | undefined;
	},
	visitProcedures: readonly ClinicalProcedureIdentifier[],
): boolean {
	if (!visitProcedures || visitProcedures.length === 0) {
		return false;
	}

	// 1. Профгигиена и пародонтология: сбрасывается ТОЛЬКО при наличии профгигиены A16.07.051
	if (
		recall.cycleType === "standard_prophylaxis" ||
		recall.cycleType === "periodontal_maintenance" ||
		recall.clinicalTriggerType === "hygiene_6m"
	) {
		return visitProcedures.some(isProfessionalHygieneProcedure);
	}

	// 2. Ортодонтическая активация: сбрасывается ТОЛЬКО при орто-процедурах
	if (
		recall.cycleType === "orthodontic_braces" ||
		recall.cycleType === "orthodontic_aligners" ||
		recall.clinicalTriggerType === "ortho_activation_1m"
	) {
		return visitProcedures.some(isOrthodonticAdjustmentProcedure);
	}

	// 3. Контроль имплантатов: сбрасывается ТОЛЬКО при контроле имплантата
	if (
		recall.cycleType === "implant_monitoring" ||
		recall.clinicalTriggerType === "implant_prosthetic_12m"
	) {
		return visitProcedures.some(isImplantMonitoringProcedure);
	}

	// 4. Детская профилактика: сбрасывается при детской профилактике или гигиене
	if (
		recall.cycleType === "pediatric_fluoridation" ||
		recall.clinicalTriggerType === "pediatric_3_4m"
	) {
		return visitProcedures.some(
			(p) => isPediatricProphylaxisProcedure(p) || isProfessionalHygieneProcedure(p),
		);
	}

	return false;
}

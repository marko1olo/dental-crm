import type { ClinicalRecallTriggerInfo, ClinicalRecallTriggerType } from "./recallCycleTypes";
import type { PatientRecallRecord } from "./recallRecordTypes";
import { addCalendarMonthsSafe, addWeeksSafe, formatIsoDateOnly } from "./recallDateMath";

/* -------------------------------------------------------------------------- */
/* Clinical Procedure Identifiers & Checks                                     */
/* -------------------------------------------------------------------------- */

export interface ClinicalProcedureIdentifier {
	readonly code?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly nomenclatureCode?: string | undefined;
	readonly code804n?: string | undefined;
	readonly name?: string | undefined;
	readonly serviceName?: string | undefined;
}

export function isProfessionalHygieneProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const rawCode = (proc.serviceCode || proc.nomenclatureCode || proc.code804n || proc.code || "").trim().replace(/\s+/g, "").toUpperCase();
	if (
		rawCode.startsWith("A16.07.051") ||
		rawCode.startsWith("A16.07.020") ||
		rawCode.startsWith("A16.07.039") ||
		rawCode.startsWith("A22.07.001") ||
		rawCode.startsWith("A22.07.002")
	) {
		return true;
	}
	const rawName = (proc.serviceName || proc.name || "").toLowerCase();
	if (!rawName) return false;
	const keywords = [
		"профессиональная гигиена", "профессиональной гигиены", "профгигиен",
		"air-flow", "air flow", "airflow", "снятие зубных отложений",
		"удаление зубных отложений", "ультразвуковой скейлинг", "поддесневой скейлинг",
		"чистка air", "чистка зубов ультразвук", "кюретаж пародонтальных карманов",
		"vector-терапия", "вектор-терапия",
	];
	return keywords.some((kw) => rawName.includes(kw));
}

export function isOrthodonticAdjustmentProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const rawCode = (proc.serviceCode || proc.nomenclatureCode || proc.code804n || proc.code || "").trim().toUpperCase();
	if (rawCode.startsWith("A16.07.048") || rawCode.startsWith("A16.07.047") || rawCode.startsWith("A16.07.046")) {
		return true;
	}
	const rawName = (proc.serviceName || proc.name || "").toLowerCase();
	return (
		rawName.includes("активация дуг") || rawName.includes("смена дуг") ||
		rawName.includes("замена дуг") || rawName.includes("замена лигатур") ||
		rawName.includes("коррекция элайнер") || rawName.includes("выдача элайнер") ||
		rawName.includes("ортодонтическая активация")
	);
}

export function isImplantMonitoringProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const rawCode = (proc.serviceCode || proc.nomenclatureCode || proc.code804n || proc.code || "").trim().toUpperCase();
	if (rawCode.startsWith("A16.07.054") || rawCode.startsWith("A06.07")) {
		const rawName = (proc.serviceName || proc.name || "").toLowerCase();
		if (rawName.includes("имплант") || rawName.includes("остеоинтеграц")) return true;
	}
	const rawName = (proc.serviceName || proc.name || "").toLowerCase();
	return (
		rawName.includes("контроль остеоинтеграции") || rawName.includes("осмотр имплант") ||
		rawName.includes("рентген-контроль имплант") || rawName.includes("ревизия имплант")
	);
}

export function isPediatricProphylaxisProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const rawCode = (proc.serviceCode || proc.nomenclatureCode || proc.code804n || proc.code || "").trim().toUpperCase();
	if (rawCode.startsWith("A16.07.057") || rawCode.startsWith("A11.07.012") || rawCode.startsWith("A11.07.024")) {
		return true;
	}
	const rawName = (proc.serviceName || proc.name || "").toLowerCase();
	return rawName.includes("фторирование") || rawName.includes("герметизация фиссур") || rawName.includes("ремотерапия") || rawName.includes("детская гигиена");
}

export function isEndodonticCheckProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const rawCode = (proc.serviceCode || proc.nomenclatureCode || proc.code804n || proc.code || "").trim().toUpperCase();
	if (rawCode.startsWith("A06.07.003") || rawCode.startsWith("A06.07.004") || rawCode.startsWith("A06.07.012")) {
		return true;
	}
	const rawName = (proc.serviceName || proc.name || "").toLowerCase();
	return rawName.includes("контрольный снимок") || rawName.includes("визиография") || rawName.includes("рентген") || rawName.includes("эндо");
}

export function shouldResetRecallTimer(
	recall: { readonly cycleType: string; readonly clinicalTriggerType?: string | undefined },
	visitProcedures: readonly ClinicalProcedureIdentifier[],
): boolean {
	if (!visitProcedures || visitProcedures.length === 0) return false;
	if (recall.cycleType === "standard_prophylaxis" || recall.cycleType === "periodontal_maintenance" || recall.clinicalTriggerType === "hygiene_6m") {
		return visitProcedures.some(isProfessionalHygieneProcedure);
	}
	if (recall.cycleType === "orthodontic_braces" || recall.cycleType === "orthodontic_aligners" || recall.clinicalTriggerType === "ortho_activation_1m") {
		return visitProcedures.some(isOrthodonticAdjustmentProcedure);
	}
	if (recall.cycleType === "implant_monitoring" || recall.clinicalTriggerType === "implant_prosthetic_12m" || recall.clinicalTriggerType === "implant_monitoring_6m") {
		return visitProcedures.some(isImplantMonitoringProcedure);
	}
	if (recall.cycleType === "pediatric_fluoridation" || recall.clinicalTriggerType === "pediatric_3_4m") {
		return visitProcedures.some((p) => isPediatricProphylaxisProcedure(p) || isProfessionalHygieneProcedure(p));
	}
	if (recall.cycleType === "endodontic_check" || recall.clinicalTriggerType === "endodontic_1m") {
		return visitProcedures.some(isEndodonticCheckProcedure);
	}
	return false;
}

/* -------------------------------------------------------------------------- */
/* Clinical Trigger Calculators                                               */
/* -------------------------------------------------------------------------- */

export function calculateHygieneRecallTrigger(lastCleaningDate: Date | string, customMonths = 6): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 6;
	const nextDueDate = addCalendarMonthsSafe(lastCleaningDate, months);
	return {
		triggerType: "hygiene_6m",
		title: "Плановый осмотр и профессиональная гигиена полости рта",
		shortTitle: "Профгигиена 6 мес.",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale: "Снятие зубных отложений (Air-Flow + УЗ), онкоскрининг слизистой и сохранение гарантийных обязательств через 6 месяцев после последней чистки.",
		mappedCycleType: "standard_prophylaxis",
	};
}

export function calculateImplantMonitoringRecallTrigger(lastSurgeryDate: Date | string, customMonths = 6): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 6;
	const nextDueDate = addCalendarMonthsSafe(lastSurgeryDate, months);
	return {
		triggerType: "implant_monitoring_6m",
		title: "Контрольный осмотр и приживление имплантатов",
		shortTitle: "Контроль имплантации 6 мес.",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale: "Рентген-контроль остеоинтеграции имплантатов, стабильности десневой манжетки и состояния абатментов через 6 месяцев после операции.",
		mappedCycleType: "implant_monitoring",
	};
}

export function calculateImplantProstheticRecallTrigger(lastProcedureDate: Date | string, customMonths = 12): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 12;
	const nextDueDate = addCalendarMonthsSafe(lastProcedureDate, months);
	return {
		triggerType: "implant_prosthetic_12m",
		title: "Годовой контрольный осмотр после имплантации и протезирования",
		shortTitle: "Импланты/Ортопедия 12 мес.",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale: "Годовой рентген-контроль остеоинтеграции имплантатов по клиническому протоколу СтАР/ITI, ревизия окклюзионного баланса и краевого прилегания ортопедии.",
		mappedCycleType: "implant_monitoring",
	};
}

export const calculateProstheticRecallTrigger = calculateImplantProstheticRecallTrigger;

export function calculateOrthoActivationRecallTrigger(lastActivationDate: Date | string, customWeeks = 4): ClinicalRecallTriggerInfo {
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
		clinicalRationale: "Плановая смена и активация ортодонтических дуг каждые 4 недели (28 дней) для непрерывного перемещения зубов.",
		mappedCycleType: "orthodontic_braces",
	};
}

export function calculatePediatricRecallTrigger(lastVisitDate: Date | string, intervalMonths: 3 | 4 = 3): ClinicalRecallTriggerInfo {
	const months = intervalMonths === 4 ? 4 : 3;
	const nextDueDate = addCalendarMonthsSafe(lastVisitDate, months);
	return {
		triggerType: "pediatric_3_4m",
		title: `Детский профилактический осмотр и минерализация эмали (${months} мес.)`,
		shortTitle: `Детский осмотр ${months} мес.`,
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale: "Высокая скорость деминерализации незрелой эмали временных и сменных зубов у детей требует контрольного осмотра гигиены, фторирования и герметизации фиссур каждые 3–4 месяца.",
		mappedCycleType: "pediatric_fluoridation",
	};
}

export function calculateEndodonticRecallTrigger(lastProcedureDate: Date | string, customMonths = 1): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 1;
	const nextDueDate = addCalendarMonthsSafe(lastProcedureDate, months);
	return {
		triggerType: "endodontic_1m",
		title: "Контрольный осмотр и визиография после эндодонтии (1 мес.)",
		shortTitle: "Эндодонтия 1 мес.",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale: "Прицельный рентген-контроль через 1 месяц после пломбирования корневых каналов для оценки репарации костной ткани.",
		mappedCycleType: "endodontic_check",
	};
}

export function calculatePeriodontalRecallTrigger(lastProcedureDate: Date | string, customMonths = 3): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 3;
	const nextDueDate = addCalendarMonthsSafe(lastProcedureDate, months);
	return {
		triggerType: "periodontal_3m",
		title: `Поддерживающая пародонтальная терапия (SPT) и контроль карманов (${months} мес.)`,
		shortTitle: `Пародонтология ${months} мес.`,
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale: "Хронический пародонтит, глубина карманов >= 4 мм, кровоточивость BOP. Поддерживающая терапия каждые 3–4 месяца.",
		mappedCycleType: "periodontal_maintenance",
	};
}

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
	if (clinicalData.hasImplants || clinicalData.hasCrownsOrVeneers || clinicalData.hasProsthetics) {
		return calculateImplantProstheticRecallTrigger(lastDate, clinicalData.customIntervalMonths ?? 12);
	}
	return calculateHygieneRecallTrigger(lastDate, clinicalData.customIntervalMonths ?? 6);
}

/* -------------------------------------------------------------------------- */
/* Clinical Trigger Evaluators & Multi-Channel Routing                        */
/* -------------------------------------------------------------------------- */

export type ClinicalRecallChannelId =
	| "hygiene_periodontal"
	| "implant_monitoring"
	| "orthodontic_activation"
	| "pediatric_prophylaxis";

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

export function evaluateMultiRecallChannels(clinicalData: PatientClinicalStatusInput): MultiRecallEvaluationResult {
	const lastDate = clinicalData.lastVisitDate ?? new Date();
	const triggers: (ClinicalRecallTriggerInfo & { channelId: ClinicalRecallChannelId })[] = [];
	const activeChannels: ClinicalRecallChannelId[] = [];

	const isPeriodontal = (clinicalData.maxPocketDepthMm !== undefined && clinicalData.maxPocketDepthMm >= 4) || clinicalData.hasBleedingOnProbing === true;
	const cleaningDate = clinicalData.lastCleaningDate ?? lastDate;

	if (isPeriodontal) {
		const trig = calculatePeriodontalRecallTrigger(cleaningDate, clinicalData.customHygieneMonths ?? 3);
		triggers.push({ ...trig, channelId: "hygiene_periodontal" });
	} else {
		const trig = calculateHygieneRecallTrigger(cleaningDate, clinicalData.customHygieneMonths ?? 6);
		triggers.push({ ...trig, channelId: "hygiene_periodontal" });
	}
	activeChannels.push("hygiene_periodontal");

	const hasImplants = clinicalData.hasImplants || (clinicalData.implantsCount !== undefined && clinicalData.implantsCount > 0) || clinicalData.implantSurgeryDate !== undefined;
	if (hasImplants || clinicalData.hasCrownsOrVeneers || clinicalData.hasProsthetics) {
		const trig = calculateImplantProstheticRecallTrigger(clinicalData.implantSurgeryDate ?? lastDate, clinicalData.customImplantMonths ?? (hasImplants ? 6 : 12));
		triggers.push({ ...trig, channelId: "implant_monitoring" });
		activeChannels.push("implant_monitoring");
	}

	const hasOrtho = clinicalData.hasBraces || clinicalData.hasAligners || clinicalData.hasOrthodonticAppliance;
	if (hasOrtho) {
		const trig = calculateOrthoActivationRecallTrigger(clinicalData.lastOrthoAdjustmentDate ?? lastDate, clinicalData.customOrthoWeeks ?? (clinicalData.hasAligners ? 6 : 4));
		triggers.push({ ...trig, channelId: "orthodontic_activation" });
		activeChannels.push("orthodontic_activation");
	}

	const isChild = clinicalData.isChildUnder14 === true || (clinicalData.age !== undefined && clinicalData.age < 14);
	if (isChild) {
		const trig = calculatePediatricRecallTrigger(clinicalData.lastPediatricVisitDate ?? lastDate, (clinicalData.customPediatricMonths === 4 ? 4 : 3) as 3 | 4);
		triggers.push({ ...trig, channelId: "pediatric_prophylaxis" });
		activeChannels.push("pediatric_prophylaxis");
	}

	let primaryTrigger = triggers[0]!;
	if (isChild && triggers.some((t) => t.channelId === "pediatric_prophylaxis")) {
		primaryTrigger = triggers.find((t) => t.channelId === "pediatric_prophylaxis")!;
	} else if (hasOrtho && triggers.some((t) => t.channelId === "orthodontic_activation")) {
		primaryTrigger = triggers.find((t) => t.channelId === "orthodontic_activation")!;
	} else if (hasImplants && triggers.some((t) => t.channelId === "implant_monitoring")) {
		primaryTrigger = triggers.find((t) => t.channelId === "implant_monitoring")!;
	}

	return { triggers, activeChannels, hasMultipleRecalls: triggers.length > 1, primaryTrigger };
}

export function resolveCandidateTriggerType(candidate: PatientRecallRecord): ClinicalRecallTriggerType {
	if (candidate.clinicalTriggerType) return candidate.clinicalTriggerType;
	const plan = (candidate.treatmentPlanTitle ?? "").toLowerCase();
	const procs = (candidate.lastProcedures ?? []).join(" ").toLowerCase();
	const notes = (candidate.clinicalNotes ?? "").toLowerCase();
	const combined = `${plan} ${procs} ${notes}`;

	if (candidate.isChildUnder14 || (candidate.age !== undefined && candidate.age < 14) || combined.includes("детск") || combined.includes("молочн")) {
		return "pediatric_3_4m";
	}
	if (candidate.hasBraces || candidate.cycleType === "orthodontic_braces" || candidate.cycleType === "orthodontic_aligners" || combined.includes("брекет") || combined.includes("элайнер") || combined.includes("дуг")) {
		return "ortho_activation_1m";
	}
	if ((candidate.implantsCount && candidate.implantsCount > 0) || candidate.cycleType === "implant_monitoring" || candidate.cycleType === "prosthetic_check" || combined.includes("имплант") || combined.includes("коронк") || combined.includes("протез")) {
		return "implant_prosthetic_12m";
	}
	if (candidate.cycleType === "endodontic_check" || combined.includes("эндо") || combined.includes("пульпит") || combined.includes("периодонтит") || combined.includes("канал")) {
		return "endodontic_1m";
	}
	if (candidate.cycleType === "periodontal_maintenance" || combined.includes("пародонт") || combined.includes("вектор") || combined.includes("гингив") || (candidate.periodontalPocketMaxMm !== undefined && candidate.periodontalPocketMaxMm >= 4)) {
		return "periodontal_3m";
	}
	return "hygiene_6m";
}

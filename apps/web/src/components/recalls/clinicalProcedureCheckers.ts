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

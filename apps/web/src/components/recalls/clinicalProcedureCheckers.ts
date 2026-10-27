/* Clinical Procedure Identifiers & Checks (SSOT Domain Logic) */

export interface ClinicalProcedureIdentifier {
	readonly code?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly nomenclatureCode?: string | undefined;
	readonly category?: string | undefined;
	readonly name?: string | undefined;
	readonly serviceName?: string | undefined;
}

function normalizeCode(proc: ClinicalProcedureIdentifier): string {
	return (proc.serviceCode || proc.nomenclatureCode || proc.code || "").trim().replace(/\s+/g, "").toUpperCase();
}

function normalizeName(proc: ClinicalProcedureIdentifier): string {
	return (proc.serviceName || proc.name || "").toLowerCase();
}

export function isProfessionalHygieneProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const cat = (proc.category || "").toLowerCase();
	if (cat === "hygiene" || cat === "prophylaxis" || cat === "periodontics") return true;

	const code = normalizeCode(proc);
	if (code.startsWith("A16.07.051") || code.startsWith("A16.07.020") || code.startsWith("A16.07.039") || code.startsWith("A22.07.001") || code.startsWith("A22.07.002")) {
		return true;
	}
	const name = normalizeName(proc);
	if (!name) return false;
	const keywords = ["профессиональная гигиена", "профгигиен", "снятие зубных отложений", "удаление зубных отложений", "ультразвуковой скейлинг", "поддесневой скейлинг", "кюретаж пародонтальных карманов"];
	return keywords.some((kw) => name.includes(kw));
}

export function isOrthodonticAdjustmentProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const cat = (proc.category || "").toLowerCase();
	if (cat === "orthodontics" || cat === "orthodontic") return true;

	const code = normalizeCode(proc);
	if (code.startsWith("A16.07.048") || code.startsWith("A16.07.047") || code.startsWith("A16.07.046")) return true;
	const name = normalizeName(proc);
	return name.includes("ортодонтическая коррекция") || name.includes("контрольный осмотр ортодонт") || name.includes("коррекция элайнер") || name.includes("активация ортодонтического аппарата");
}

export function isImplantMonitoringProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const cat = (proc.category || "").toLowerCase();
	if (cat === "implantology" || cat === "implants") return true;

	const code = normalizeCode(proc);
	if (code.startsWith("A16.07.054") || code.startsWith("A06.07")) {
		const name = normalizeName(proc);
		if (name.includes("имплант") || name.includes("остеоинтеграц")) return true;
	}
	const name = normalizeName(proc);
	return name.includes("контроль остеоинтеграции") || name.includes("осмотр имплант") || name.includes("рентген-контроль имплант") || name.includes("ревизия имплант");
}

export function isPediatricProphylaxisProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const cat = (proc.category || "").toLowerCase();
	if (cat === "pediatric" || cat === "children") return true;

	const code = normalizeCode(proc);
	if (code.startsWith("A16.07.057") || code.startsWith("A11.07.012") || code.startsWith("A11.07.024")) return true;
	const name = normalizeName(proc);
	return name.includes("фторирование") || name.includes("герметизация фиссур") || name.includes("ремотерапия") || name.includes("детская гигиена");
}

export function isEndodonticCheckProcedure(proc: ClinicalProcedureIdentifier): boolean {
	const cat = (proc.category || "").toLowerCase();
	if (cat === "endodontics" || cat === "radiology") return true;

	const code = normalizeCode(proc);
	if (code.startsWith("A06.07.003") || code.startsWith("A06.07.004") || code.startsWith("A06.07.012")) return true;
	const name = normalizeName(proc);
	return name.includes("контрольный снимок") || name.includes("визиография") || name.includes("рентген") || name.includes("эндо");
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

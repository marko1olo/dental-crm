export function buildEffectiveDraft(
	rawDraft: Record<string, unknown>,
	existingVisit: Record<string, unknown>,
) {
	const rawComplaint =
		typeof rawDraft.complaint === "string" ? rawDraft.complaint.trim() : "";
	const existingComplaint =
		typeof existingVisit.complaint === "string"
			? existingVisit.complaint.trim()
			: "";

	const rawAnamnesis =
		typeof rawDraft.anamnesis === "string" ? rawDraft.anamnesis.trim() : "";
	const existingAnamnesis =
		typeof existingVisit.anamnesis === "string"
			? existingVisit.anamnesis.trim()
			: "";

	const rawObjective =
		typeof rawDraft.objectiveStatus === "string"
			? rawDraft.objectiveStatus.trim()
			: typeof rawDraft.statusLocalis === "string"
				? rawDraft.statusLocalis.trim()
				: "";
	const existingObjective =
		typeof existingVisit.objectiveStatus === "string"
			? existingVisit.objectiveStatus.trim()
			: "";

	const rawDiagnosis =
		typeof rawDraft.diagnosis === "string"
			? rawDraft.diagnosis.trim()
			: typeof rawDraft.diagnosisIcd10 === "string"
				? rawDraft.diagnosisIcd10.trim()
				: "";
	const existingDiagnosis =
		typeof existingVisit.diagnosis === "string"
			? existingVisit.diagnosis.trim()
			: "";

	const rawPlan =
		typeof rawDraft.treatmentPlan === "string"
			? rawDraft.treatmentPlan.trim()
			: typeof rawDraft.treatmentDescription === "string"
				? rawDraft.treatmentDescription.trim()
				: "";
	const existingPlan =
		typeof existingVisit.treatmentPlan === "string"
			? existingVisit.treatmentPlan.trim()
			: "";

	return {
		complaint:
			rawComplaint ||
			existingComplaint ||
			"Жалоб на момент осмотра активно не предъявляет",
		anamnesis:
			rawAnamnesis ||
			existingAnamnesis ||
			"Соматически здоров. Аллергоанамнез не отягощен",
		objectiveStatus:
			rawObjective ||
			existingObjective ||
			"Слизистая оболочка полости рта бледно-розовая, влажная",
		diagnosis:
			rawDiagnosis ||
			existingDiagnosis ||
			"Z01.2",
		treatmentPlan:
			rawPlan ||
			existingPlan ||
			"Проведен осмотр и санация",
		warnings: Array.isArray(rawDraft.warnings) ? rawDraft.warnings : [],
	};
}

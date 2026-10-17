export function buildEffectiveDraft(
	rawDraft: Record<string, any>,
	existingVisit: Record<string, any>,
) {
	return {
		complaint:
			rawDraft.complaint ||
			rawDraft.anamnesis ||
			existingVisit.complaint ||
			"Осмотр и санация полости рта",
		anamnesis:
			rawDraft.anamnesis ||
			existingVisit.anamnesis ||
			"Жалоб на момент осмотра активно не предъявляет",
		objectiveStatus:
			rawDraft.objectiveStatus ||
			rawDraft.statusLocalis ||
			existingVisit.objectiveStatus ||
			"Слизистая оболочка полости рта бледно-розовая, влажная",
		diagnosis:
			rawDraft.diagnosis ||
			rawDraft.diagnosisIcd10 ||
			existingVisit.diagnosis ||
			"Z01.2",
		treatmentPlan:
			rawDraft.treatmentPlan ||
			rawDraft.treatmentDescription ||
			existingVisit.treatmentPlan ||
			"Проведен осмотр и санация",
		warnings: Array.isArray(rawDraft.warnings) ? rawDraft.warnings : [],
	};
}

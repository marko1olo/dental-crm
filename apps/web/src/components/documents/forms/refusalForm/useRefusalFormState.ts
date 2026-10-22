import { useEffect, useState } from "react";
import { generateMedicalInterventionRefusal1051nHtml } from "@dental/shared";
import { useDocumentStore } from "../../../../store/documentStore";
import { usePatientStore } from "../../../../store/patientStore";
import { showToast } from "../../../GlobalToast";
import { printHtmlViaWindowOrIframe } from "../../../consents/consentTemplates.js";
import type { DocumentVisitHints } from "../documentFormTypes";

export function useRefusalFormState({
	activeDoctorFullName,
	activeVisitComplaint,
	inferredTreatmentArea,
}: DocumentVisitHints) {
	const refusalAlternatives = useDocumentStore((s) => s.refusalAlternatives);
	const setRefusalAlternatives = useDocumentStore((s) => s.setRefusalAlternatives);
	const refusalClinicalIndication = useDocumentStore((s) => s.refusalClinicalIndication);
	const setRefusalClinicalIndication = useDocumentStore((s) => s.setRefusalClinicalIndication);
	const refusalConfirmedAt = useDocumentStore((s) => s.refusalConfirmedAt);
	const setRefusalConfirmedAt = useDocumentStore((s) => s.setRefusalConfirmedAt);
	const refusalConsequencesUnderstood = useDocumentStore((s) => s.refusalConsequencesUnderstood);
	const setRefusalConsequencesUnderstood = useDocumentStore((s) => s.setRefusalConsequencesUnderstood);
	const refusalDoctorFullName = useDocumentStore((s) => s.refusalDoctorFullName);
	const setRefusalDoctorFullName = useDocumentStore((s) => s.setRefusalDoctorFullName);
	const refusalEmergencyCareExplained = useDocumentStore((s) => s.refusalEmergencyCareExplained);
	const setRefusalEmergencyCareExplained = useDocumentStore((s) => s.setRefusalEmergencyCareExplained);
	const refusalExplainedRisks = useDocumentStore((s) => s.refusalExplainedRisks);
	const setRefusalExplainedRisks = useDocumentStore((s) => s.setRefusalExplainedRisks);
	const refusalIntervention = useDocumentStore((s) => s.refusalIntervention);
	const setRefusalIntervention = useDocumentStore((s) => s.setRefusalIntervention);
	const refusalPatientReason = useDocumentStore((s) => s.refusalPatientReason);
	const setRefusalPatientReason = useDocumentStore((s) => s.setRefusalPatientReason);
	const refusalSecondOpinionOffered = useDocumentStore((s) => s.refusalSecondOpinionOffered);
	const setRefusalSecondOpinionOffered = useDocumentStore((s) => s.setRefusalSecondOpinionOffered);
	const refusalUrgentWarningSigns = useDocumentStore((s) => s.refusalUrgentWarningSigns);
	const setRefusalUrgentWarningSigns = useDocumentStore((s) => s.setRefusalUrgentWarningSigns);

	const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);
	const patientAdministrativeProfileDraft = usePatientStore((s) => s.patientAdministrativeProfileDraft);
	const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);

	useEffect(() => {
		if (!refusalDoctorFullName && activeDoctorFullName) setRefusalDoctorFullName(activeDoctorFullName);
		if (!refusalConfirmedAt) setRefusalConfirmedAt(new Date().toLocaleDateString("ru-RU"));
	}, [activeDoctorFullName, refusalDoctorFullName, refusalConfirmedAt, setRefusalDoctorFullName, setRefusalConfirmedAt]);

	const handlePrintRefusal = () => {
		const html = generateMedicalInterventionRefusal1051nHtml({
			patientFullName: patientCoreDraft.fullName?.trim() || "________________________________________",
			patientBirthDate: patientCoreDraft.birthDate?.trim() || "____.____.________",
			patientPassport: patientAdministrativeProfileDraft.identityDocument?.trim() || "Паспорт гражданина РФ: _________________________",
			patientAddress: patientAdministrativeProfileDraft.registrationAddress?.trim() || "__________________________________________________",
			patientPhone: patientCoreDraft.phone?.trim() || "+7 (___) ___-__-__",
			patientSnils: patientAdministrativeProfileDraft.snils?.trim() || null,
			doctorFullName: refusalDoctorFullName?.trim() || activeDoctorFullName?.trim() || "Врач-стоматолог",
			refusedIntervention: refusalIntervention?.trim() || "Стоматологическое медицинское вмешательство",
			clinicalIndication: refusalClinicalIndication?.trim() || activeVisitComplaint?.trim() || "Клинические показания",
			patientReason: refusalPatientReason?.trim() || "Не указана",
			explainedRisks: refusalExplainedRisks ? refusalExplainedRisks.split("\n").filter(Boolean) : undefined,
			alternativesOffered: refusalAlternatives ? refusalAlternatives.split("\n").filter(Boolean) : undefined,
			urgentWarningSigns: refusalUrgentWarningSigns ? refusalUrgentWarningSigns.split("\n").filter(Boolean) : undefined,
			refusalDate: refusalConfirmedAt?.trim() || new Date().toLocaleDateString("ru-RU"),
			toothNumbers: inferredTreatmentArea || undefined,
			isSigned: Boolean(refusalConsequencesUnderstood),
			watermarkText: refusalConsequencesUnderstood ? "ПОДПИСАНО ВРАЧОМ / ПАЦИЕНТОМ" : "ЧЕРНОВИК",
		});
		printHtmlViaWindowOrIframe(html);
		showToast("Официальный бланк отказа от вмешательства (А4) отправлен на печать", "info", 3000);
	};

	const handlePrintBlankRefusal = () => {
		const html = generateMedicalInterventionRefusal1051nHtml({
			refusalDate: "«___» _________ 20___ г.",
			watermarkText: "ЧЕРНОВИК",
		});
		printHtmlViaWindowOrIframe(html);
		showToast("Чистый бланк Отказа со строками «________» отправлен на печать", "info", 3000);
	};

	const handleCopySummary = () => {
		const summary = [
			"Отказ от медицинского вмешательства (ИДС):",
			`Пациент: ${patientCoreDraft.fullName?.trim() || "Пациент"}`,
			`Вмешательство: ${refusalIntervention?.trim() || "Стоматологическое лечение"}`,
			`Показания: ${refusalClinicalIndication?.trim() || "По клиническим показаниям"}`,
			`Врач: ${refusalDoctorFullName?.trim() || activeDoctorFullName?.trim() || "Лечащий врач"}`,
			`Причина отказа: ${refusalPatientReason?.trim() || "Не указана"}`,
			"Последствия: пациенту разъяснен риск прогрессирования процесса, одонтогенных осложнений и потери зуба.",
		].join("\n");
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(summary).catch((err) => console.warn("Clipboard failed:", err));
		}
		showToast("Выжимка отказа скопирована в буфер обмена", "success", 3000);
	};

	return {
		refusalAlternatives, setRefusalAlternatives, refusalClinicalIndication, setRefusalClinicalIndication,
		refusalConfirmedAt, setRefusalConfirmedAt, refusalConsequencesUnderstood, setRefusalConsequencesUnderstood,
		refusalDoctorFullName, setRefusalDoctorFullName, refusalEmergencyCareExplained, setRefusalEmergencyCareExplained,
		refusalExplainedRisks, setRefusalExplainedRisks, refusalIntervention, setRefusalIntervention,
		refusalPatientReason, setRefusalPatientReason, refusalSecondOpinionOffered, setRefusalSecondOpinionOffered,
		refusalUrgentWarningSigns, setRefusalUrgentWarningSigns, patientCoreDraft, patientAdministrativeProfileDraft,
		isConsentModalOpen, setIsConsentModalOpen, handlePrintRefusal, handlePrintBlankRefusal, handleCopySummary,
	};
}

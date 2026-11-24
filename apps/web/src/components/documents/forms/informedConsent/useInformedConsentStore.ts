import { useMemo } from "react";
import { BASE_INFORMED_CONSENT_PRESET } from "@dental/shared";
import { useDocumentStore } from "../../../../store/documentStore";
import { usePatientStore } from "../../../../store/patientStore";
import { informedConsentGuidanceReview } from "../../informedConsentGuiding";
import { generateSingleConsentTemplatePrintHtml, printHtmlViaWindowOrIframe } from "../../../consents/consentTemplates";
import { showToast } from "../../../GlobalToast";
import { clientLogger } from "../../../../services/logging/clientLogger";
import type { InformedConsentFormProps } from "../InformedConsentForm";

export function useInformedConsentStore({
	activeDoctorFullName, activeVisitComplaint, inferredTreatmentArea,
	isVisitClosed, visitStatus,
}: InformedConsentFormProps) {
	const docStore = useDocumentStore();
	const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);
	const patientAdministrativeProfileDraft = usePatientStore((s) => s.patientAdministrativeProfileDraft);

	const isClosedOrSigned = Boolean(
		isVisitClosed || visitStatus === "completed" || visitStatus === "closed" || visitStatus === "signed" ||
		(docStore.informedConsentConfirmedAt && docStore.informedConsentConfirmedAt.trim() !== ""),
	);
	const effectiveWatermark = isClosedOrSigned ? "ПОДПИСАНО ВРАЧОМ / ПАЦИЕНТОМ" : "ЧЕРНОВИК";

	const patientModalData = useMemo(() => ({
		fullName: patientCoreDraft.fullName || undefined,
		birthDate: patientCoreDraft.birthDate || undefined,
		passport: patientAdministrativeProfileDraft.identityDocument || undefined,
		phone: patientCoreDraft.phone || undefined,
		snils: patientAdministrativeProfileDraft.snils || undefined,
		address: patientAdministrativeProfileDraft.registrationAddress || undefined,
		cardNumber: undefined,
	}), [patientCoreDraft, patientAdministrativeProfileDraft]);

	const handlePrintConsent = () => {
		const html = generateSingleConsentTemplatePrintHtml("CONSENT_THERAPY", {
			context: {
				patientName: patientCoreDraft.fullName?.trim() || "________________________________________",
				birthDate: patientCoreDraft.birthDate?.trim() || "«___» _________ _____ г.",
				passport: patientAdministrativeProfileDraft.identityDocument?.trim() || "серия ______ № ________ выдан ____________________",
				phone: patientCoreDraft.phone?.trim() || "+7 (___) ___-__-__",
				doctorName: docStore.informedConsentDoctorFullName?.trim() || activeDoctorFullName?.trim() || "Врач-стоматолог клиники",
				toothNumbers: docStore.informedConsentToothOrArea?.trim() || inferredTreatmentArea?.trim() || "Полость рта (все квадранты)",
				diagnosisIcd: docStore.informedConsentDiagnosisOrIndication?.trim() || activeVisitComplaint?.trim() || "Санация полости рта",
				date: docStore.informedConsentConfirmedAt?.trim() || new Date().toLocaleDateString("ru-RU"),
			},
		});
		printHtmlViaWindowOrIframe(html);
		showToast(isClosedOrSigned ? "Бланк ИДС отправлен на печать (ПОДПИСАНО)" : "Бланк ИДС отправлен на печать (ЧЕРНОВИК)", "info", 3000);
	};

	const handleCopyPatientSummary = () => {
		const lines = [
			"Информированное добровольное согласие (клиника «ООО «Стоматологическая клиника ДЕНТЕ»»):",
			`Пациент: ${patientCoreDraft.fullName?.trim() || "Пациент"}`,
			`Вмешательство: ${docStore.informedConsentIntervention?.trim() || "Стоматологический осмотр / лечение"}`,
			`Врач: ${docStore.informedConsentDoctorFullName?.trim() || activeDoctorFullName?.trim() || "Лечащий врач"}`,
			`Область: ${docStore.informedConsentToothOrArea?.trim() || inferredTreatmentArea?.trim() || "По плану лечения"}`,
			`Диагноз: ${docStore.informedConsentDiagnosisOrIndication?.trim() || activeVisitComplaint?.trim() || "По клиническим показаниям"}`,
			"Памятка: после вмешательства возможно появление локальной чувствительности (1-3 дня). Строго соблюдайте рекомендации врача.",
		];
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(lines.join("\n")).catch((err) => {
				clientLogger.warn("[useInformedConsentStore] Clipboard failed:", err);
			});
		}
		showToast("Выжимка ИДС скопирована в буфер обмена", "success", 3000);
	};

	const handleFillNorm = () => {
		docStore.setInformedConsentIntervention(BASE_INFORMED_CONSENT_PRESET.intervention);
		docStore.setInformedConsentDiagnosisOrIndication(BASE_INFORMED_CONSENT_PRESET.diagnosisOrIndication);
		docStore.setInformedConsentExpectedBenefit(BASE_INFORMED_CONSENT_PRESET.expectedBenefit);
		docStore.setInformedConsentAnesthesia(BASE_INFORMED_CONSENT_PRESET.plannedAnesthesia ?? "");
		docStore.setInformedConsentMaterialNotes(BASE_INFORMED_CONSENT_PRESET.materialOrMedicationNotes ?? "");
		docStore.setInformedConsentRisks(BASE_INFORMED_CONSENT_PRESET.explainedRisks.join("\n"));
		docStore.setInformedConsentAlternatives(BASE_INFORMED_CONSENT_PRESET.alternatives.join("\n"));
		docStore.setInformedConsentAftercare(BASE_INFORMED_CONSENT_PRESET.aftercareRequirements.join("\n"));
		if (!docStore.informedConsentToothOrArea.trim()) docStore.setInformedConsentToothOrArea(inferredTreatmentArea || "Полость рта (все квадранты)");
		if (!docStore.informedConsentDoctorFullName.trim()) docStore.setInformedConsentDoctorFullName(activeDoctorFullName || "Врач-стоматолог клиники");
		docStore.setInformedConsentQuestionsAnswered(true); docStore.setInformedConsentRisksUnderstood(true);
		docStore.setInformedConsentWithdrawUnderstood(true);
		showToast("Согласие заполнено нормой", "success", 3000);
	};

	const review = useMemo(() => informedConsentGuidanceReview({
		intervention: docStore.informedConsentIntervention, toothOrArea: docStore.informedConsentToothOrArea,
		inferredTreatmentArea: inferredTreatmentArea ?? "", diagnosisOrIndication: docStore.informedConsentDiagnosisOrIndication,
		activeVisitComplaint: activeVisitComplaint ?? "", expectedBenefit: docStore.informedConsentExpectedBenefit,
		risks: docStore.informedConsentRisks, alternatives: docStore.informedConsentAlternatives,
		aftercare: docStore.informedConsentAftercare, doctorFullName: docStore.informedConsentDoctorFullName,
		activeDoctorFullName: activeDoctorFullName ?? "", questionsAnswered: docStore.informedConsentQuestionsAnswered,
		risksUnderstood: docStore.informedConsentRisksUnderstood, withdrawUnderstood: docStore.informedConsentWithdrawUnderstood,
	}, { allowBlankForPrint: true }), [docStore, inferredTreatmentArea, activeVisitComplaint, activeDoctorFullName]);

	return {
		docStore, isClosedOrSigned, effectiveWatermark, patientModalData,
		handlePrintConsent,
		handlePrintBlankConsent: () => {
			printHtmlViaWindowOrIframe(generateSingleConsentTemplatePrintHtml("CONSENT_THERAPY", {
				context: {
					patientName: "________________________________________",
					date: "«___» _________ 20___ г.",
				},
			}));
			showToast("Чистый бланк ИДС со строками «________» отправлен на печать", "info", 3000);
		},
		handleCopyPatientSummary, handleFillNorm, review,
	};
}

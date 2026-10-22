import React from "react";
import { FileEdit } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { InformedConsentModal } from "../../consents/InformedConsentModal.js";
import type { DocumentVisitHints } from "./documentFormTypes";
import {
	useRefusalFormState,
	RefusalHeaderBanner,
	RefusalPresetsBar,
	RefusalFieldsSection,
	RefusalSignFooter,
} from "./refusalForm";

export const MedicalInterventionRefusalForm = React.memo(
	function MedicalInterventionRefusalForm(hints: DocumentVisitHints) {
		const s = useRefusalFormState(hints);

		return (
			<article className="document-payload-card">
				<RefusalHeaderBanner
					onPrintRefusal={s.handlePrintRefusal}
					onPrintBlankRefusal={s.handlePrintBlankRefusal}
					onOpenTablet={() => s.setIsConsentModalOpen(true)}
					onCopySummary={s.handleCopySummary}
				/>

				<details className="document-manual-override bg-[var(--surface-100,#f8fafc)] p-3 rounded-lg border border-[var(--line,#e2e8f0)] mt-2">
					<summary className="cursor-pointer font-semibold text-[var(--brand-700,#0f766e)] select-none hover:opacity-80 transition-opacity inline-flex items-center gap-1.5">
						<FileEdit size={14} className="text-slate-500 shrink-0" aria-hidden="true" />
						<span>Ручная корректировка полей (развернуть)</span>
					</summary>
					<div className="document-payload-collapsed-content mt-4 flex flex-col gap-4">
						<RefusalPresetsBar
							onSelectPreset={(p) => {
								s.setRefusalIntervention(p.refusedIntervention);
								s.setRefusalClinicalIndication(p.clinicalIndication);
								s.setRefusalExplainedRisks(p.explainedRisks.join("\n"));
								s.setRefusalAlternatives(p.alternativesOffered.join("\n"));
								s.setRefusalUrgentWarningSigns(p.urgentWarningSigns.join("\n"));
							}}
						/>
						<RefusalFieldsSection
							refusalIntervention={s.refusalIntervention}
							setRefusalIntervention={s.setRefusalIntervention}
							inferredTreatmentArea={hints.inferredTreatmentArea}
							refusalClinicalIndication={s.refusalClinicalIndication}
							setRefusalClinicalIndication={s.setRefusalClinicalIndication}
							activeVisitComplaint={hints.activeVisitComplaint}
							refusalPatientReason={s.refusalPatientReason}
							setRefusalPatientReason={s.setRefusalPatientReason}
							refusalExplainedRisks={s.refusalExplainedRisks}
							setRefusalExplainedRisks={s.setRefusalExplainedRisks}
							refusalAlternatives={s.refusalAlternatives}
							setRefusalAlternatives={s.setRefusalAlternatives}
							refusalUrgentWarningSigns={s.refusalUrgentWarningSigns}
							setRefusalUrgentWarningSigns={s.setRefusalUrgentWarningSigns}
						/>
						<RefusalSignFooter
							refusalDoctorFullName={s.refusalDoctorFullName}
							setRefusalDoctorFullName={s.setRefusalDoctorFullName}
							activeDoctorFullName={hints.activeDoctorFullName}
							refusalConfirmedAt={s.refusalConfirmedAt}
							setRefusalConfirmedAt={s.setRefusalConfirmedAt}
							refusalConsequencesUnderstood={s.refusalConsequencesUnderstood}
							setRefusalConsequencesUnderstood={s.setRefusalConsequencesUnderstood}
							refusalSecondOpinionOffered={s.refusalSecondOpinionOffered}
							setRefusalSecondOpinionOffered={s.setRefusalSecondOpinionOffered}
							refusalEmergencyCareExplained={s.refusalEmergencyCareExplained}
							setRefusalEmergencyCareExplained={s.setRefusalEmergencyCareExplained}
						/>
					</div>
				</details>

				{s.isConsentModalOpen && (
					<InformedConsentModal
						isOpen={s.isConsentModalOpen}
						onClose={() => s.setIsConsentModalOpen(false)}
						initialMode="single"
						initialTemplateKey="CONSENT_TREATMENT_REFUSAL"
						initialVerificationMethod="tablet_stylus"
						patient={{
							fullName: s.patientCoreDraft.fullName || null,
							birthDate: s.patientCoreDraft.birthDate || null,
							passport: s.patientAdministrativeProfileDraft.identityDocument || null,
							phone: s.patientCoreDraft.phone || null,
							snils: s.patientAdministrativeProfileDraft.snils || null,
							address: s.patientAdministrativeProfileDraft.registrationAddress || null,
						}}
						doctorName={s.refusalDoctorFullName || hints.activeDoctorFullName || "Врач-стоматолог"}
						toothNumbers={hints.inferredTreatmentArea || null}
						diagnosisIcd={s.refusalClinicalIndication || hints.activeVisitComplaint || null}
						onConsentSigned={() => {
							s.setRefusalConsequencesUnderstood(true);
							s.setRefusalConfirmedAt(new Date().toLocaleDateString("ru-RU"));
							showToast("Отказ от вмешательства успешно подписан пациентом на планшете", "success", 3000);
						}}
					/>
				)}
			</article>
		);
	},
);

MedicalInterventionRefusalForm.displayName = "MedicalInterventionRefusalForm";

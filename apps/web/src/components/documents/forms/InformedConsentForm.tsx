import React, { useState } from "react";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import type { DocumentVisitHints } from "./documentFormTypes";
import { InformedConsentModal } from "../../consents/InformedConsentModal.js";
import { useInformedConsentStore } from "./informedConsent/useInformedConsentStore";
import { InformedConsentToolbar } from "./informedConsent/InformedConsentToolbar";
import { InformedConsentInterventionSection } from "./informedConsent/InformedConsentInterventionSection";
import { InformedConsentDetailsSection } from "./informedConsent/InformedConsentDetailsSection";

export interface InformedConsentFormProps extends DocumentVisitHints {
	isVisitClosed?: boolean;
	visitStatus?: string;
}

export const InformedConsentForm = React.memo(function InformedConsentForm(props: InformedConsentFormProps) {
	const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);
	const {
		docStore, isClosedOrSigned, effectiveWatermark, patientModalData,
		handlePrintConsent, handlePrintBlankConsent, handleCopyPatientSummary, handleFillNorm, review,
	} = useInformedConsentStore(props);

	const notice = review.blockers.length > 0 ? (
		<div className="schedule-create-missing document-informed-consent-blockers mt-3" role="status" aria-live="polite">
			<strong>Согласие не создастся: осталось {review.blockers.length} условий из {review.requiredCount}:</strong>
			<ul>{review.blockers.map((b) => <li key={b.field}>{b.label} — {b.hint}</li>)}</ul>
			<small>Заполните обязательные поля ниже. Дату программа зафиксирует автоматически.</small>
		</div>
	) : null;

	return (
		<DocumentPayloadCard title="Информированное согласие" description="Конкретное вмешательство, область, показание, риски и рекомендации" notice={notice}>
			<InformedConsentToolbar
				isClosedOrSigned={isClosedOrSigned}
				onPrintConsent={handlePrintConsent}
				onOpenModal={() => setIsConsentModalOpen(true)}
				onFillNorm={handleFillNorm}
				onPrintBlank={handlePrintBlankConsent}
				onCopySummary={handleCopyPatientSummary}
			/>
			<InformedConsentInterventionSection
				docStore={docStore}
				inferredTreatmentArea={props.inferredTreatmentArea}
				activeDoctorFullName={props.activeDoctorFullName}
				activeVisitComplaint={props.activeVisitComplaint}
			/>
			<InformedConsentDetailsSection docStore={docStore} />
			{isConsentModalOpen && (
				<InformedConsentModal
					isOpen={isConsentModalOpen}
					onClose={() => setIsConsentModalOpen(false)}
					patient={patientModalData}
					doctorName={docStore.informedConsentDoctorFullName?.trim() || props.activeDoctorFullName?.trim() || "Врач-стоматолог клиники"}
					diagnosisIcd={docStore.informedConsentDiagnosisOrIndication?.trim() || props.activeVisitComplaint?.trim() || "Санация полости рта"}
					toothNumbers={docStore.informedConsentToothOrArea?.trim() || props.inferredTreatmentArea?.trim() || "Полость рта"}
					isSigned={isClosedOrSigned}
					status={props.visitStatus}
					watermarkText={effectiveWatermark}
				/>
			)}
		</DocumentPayloadCard>
	);
});

InformedConsentForm.displayName = "InformedConsentForm";

import React, { lazy, Suspense } from "react";
import type { DiaryState } from "../../useVisitDiaryLogic";
import { mergeSoapDiaryState } from "../../../lib/clinicalProtocols043";
import { buildProtocolTreatmentText, dispatchProtocolServices } from "./templatesModalHelpers";

const ClinicalDiaryTemplatesModal = lazy(() =>
	import("../../../emr/templates/ClinicalDiaryTemplatesModal").then((m) => ({ default: m.ClinicalDiaryTemplatesModal }))
);

export interface VisitDiaryTemplatesSubModalProps {
	readonly showTemplatesModal: boolean;
	readonly setShowTemplatesModal: (val: boolean) => void;
	readonly diary: DiaryState;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly isLocked: boolean;
	readonly isRevising: boolean;
	readonly beginRevise: () => void;
	readonly scheduleDebouncedSave: () => void;
	readonly setIcdSearch: (val: string) => void;
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly patientFullName: string;
}

export const VisitDiaryTemplatesSubModal: React.FC<VisitDiaryTemplatesSubModalProps> = ({
	showTemplatesModal,
	setShowTemplatesModal,
	diary,
	setDiary,
	isLocked,
	isRevising,
	beginRevise,
	scheduleDebouncedSave,
	setIcdSearch,
	doctorName,
	doctorSpecialty,
	patientFullName,
}) => {
	if (!showTemplatesModal) return null;

	return (
		<Suspense fallback={null}>
			<ClinicalDiaryTemplatesModal
				isOpen={showTemplatesModal}
				onClose={() => setShowTemplatesModal(false)}
				initialToothNumber={diary.diagnosisTooth}
				doctorFullName={doctorName}
				doctorSpecialty={doctorSpecialty}
				patientFullName={patientFullName}
				onApplyDiary={(res) => {
					if (isLocked && !isRevising) {
						beginRevise();
					}
					const combinedAnamnesis = [res.subjectiveComplaints?.trim(), res.anamnesisMorbi?.trim()]
						.filter(Boolean)
						.join("\n\n");

					const combinedTreatment = buildProtocolTreatmentText(res);
					if (res.order804nServices && res.order804nServices.length > 0) {
						dispatchProtocolServices(
							res.order804nServices,
							res.toothNumber ?? diary.diagnosisTooth,
							"clinical_diary_protocol",
						);
					}

					setDiary((prev) =>
						mergeSoapDiaryState(
							prev,
							{
								anamnesis: combinedAnamnesis,
								statusLocalis: res.objectiveStatusLocalis,
								treatmentDescription: combinedTreatment,
								diagnosisIcd10: res.assessmentIcd10Code,
								diagnosisTooth: res.toothNumber ? String(res.toothNumber) : prev.diagnosisTooth,
							},
							{ strategy: "smart_append" },
						),
					);
					if (res.assessmentIcd10Code) {
						setIcdSearch(res.assessmentIcd10Code);
					}
					scheduleDebouncedSave();
				}}
				onApplySoapText={(text, icd) => {
					if (isLocked && !isRevising) {
						beginRevise();
					}
					setDiary((prev) => ({
						...prev,
						treatmentDescription: prev.treatmentDescription
							? `${prev.treatmentDescription}\n\n${text}`
							: text,
						diagnosisIcd10: prev.diagnosisIcd10 || icd,
					}));
					if (icd && !diary.diagnosisIcd10) {
						setIcdSearch(icd);
					}
					scheduleDebouncedSave();
				}}
				onApplyServices={(services) => {
					dispatchProtocolServices(services, diary.diagnosisTooth, "clinical_diary_modal_services");
				}}
			/>
		</Suspense>
	);
};

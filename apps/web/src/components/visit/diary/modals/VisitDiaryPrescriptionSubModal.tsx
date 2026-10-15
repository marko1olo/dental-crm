import React, { lazy, Suspense } from "react";
import type { DiaryState } from "../../useVisitDiaryLogic";

const PrescriptionModal = lazy(() =>
	import("../../PrescriptionModal").then((m) => ({ default: m.PrescriptionModal }))
);

export interface VisitDiaryPrescriptionSubModalProps {
	readonly showPrescriptionModal: boolean;
	readonly setShowPrescriptionModal: (val: boolean) => void;
	readonly printPatient?: any;
	readonly activePatient?: any;
	readonly patientFullName: string;
	readonly patientBirthDate?: string | null;
	readonly patientCardNumber?: string | null;
	readonly diary: DiaryState;
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly clinicName?: string | null;
	readonly onInsertToDiary: (diaryText: string) => void;
}

export const VisitDiaryPrescriptionSubModal: React.FC<VisitDiaryPrescriptionSubModalProps> = ({
	showPrescriptionModal,
	setShowPrescriptionModal,
	printPatient,
	activePatient,
	patientFullName,
	patientBirthDate,
	patientCardNumber,
	diary,
	doctorName,
	doctorSpecialty,
	clinicName,
	onInsertToDiary,
}) => {
	if (!showPrescriptionModal) return null;

	return (
		<Suspense fallback={null}>
			<PrescriptionModal
				isOpen={showPrescriptionModal}
				onClose={() => setShowPrescriptionModal(false)}
				patient={
					printPatient || activePatient
						? {
								fullName: patientFullName,
								birthDate: patientBirthDate ?? null,
								medicalCardNumber: patientCardNumber ?? null,
							}
						: null
				}
				diary={diary}
				doctorName={doctorName}
				doctorSpecialty={doctorSpecialty}
				clinicName={clinicName ?? null}
				onInsertToDiary={onInsertToDiary}
			/>
		</Suspense>
	);
};

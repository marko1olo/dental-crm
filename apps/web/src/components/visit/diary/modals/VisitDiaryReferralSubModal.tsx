import React, { lazy, Suspense } from "react";
import type { DiaryState } from "../../useVisitDiaryLogic";

const RadiologyReferralModal = lazy(() =>
	import("../../../radiology/RadiologyReferralModal").then((m) => ({ default: m.RadiologyReferralModal }))
);

export interface VisitDiaryReferralSubModalProps {
	readonly showRadiologyReferralModal: boolean;
	readonly setShowRadiologyReferralModal: (val: boolean) => void;
	readonly printPatient?: any;
	readonly activePatient?: any;
	readonly patientFullName: string;
	readonly patientBirthDate?: string | null;
	readonly patientCardNumber?: string | null;
	readonly diary: DiaryState;
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly clinicName?: string | null;
}

export const VisitDiaryReferralSubModal: React.FC<VisitDiaryReferralSubModalProps> = ({
	showRadiologyReferralModal,
	setShowRadiologyReferralModal,
	printPatient,
	activePatient,
	patientFullName,
	patientBirthDate,
	patientCardNumber,
	diary,
	doctorName,
	doctorSpecialty,
	clinicName,
}) => {
	if (!showRadiologyReferralModal) return null;

	return (
		<Suspense fallback={null}>
			<RadiologyReferralModal
				isOpen={showRadiologyReferralModal}
				onClose={() => setShowRadiologyReferralModal(false)}
				patient={
					printPatient || activePatient
						? {
								fullName: patientFullName,
								birthDate: patientBirthDate,
								medicalCardNumber: patientCardNumber,
							}
						: null
				}
				diary={diary}
				doctorName={doctorName}
				doctorSpecialty={doctorSpecialty}
				clinicName={clinicName}
			/>
		</Suspense>
	);
};

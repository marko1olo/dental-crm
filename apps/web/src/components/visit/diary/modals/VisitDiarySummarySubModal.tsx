import React, { lazy, Suspense } from "react";
import type { DiaryState } from "../../useVisitDiaryLogic";

const VisitSummaryModal = lazy(() =>
	import("../../VisitSummaryModal").then((m) => ({ default: m.VisitSummaryModal }))
);

export interface VisitDiarySummarySubModalProps {
	readonly showSummaryModal: boolean;
	readonly setShowSummaryModal: (val: boolean) => void;
	readonly patient: any;
	readonly diary: DiaryState;
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly lockedAt?: string | null;
	readonly diaryHash?: string | null;
	readonly hasCryptoSignature?: boolean;
	readonly isLocked: boolean;
	readonly activeTeeth?: readonly any[];
	readonly radiologySnapshots?: readonly any[];
	readonly onPrint: () => void;
	readonly onOpenPrescription: () => void;
	readonly onOpenRadiologyReferral: () => void;
	readonly onOpenEgiszExport: () => void;
	readonly doSave: (showToast?: boolean) => Promise<any>;
}

export const VisitDiarySummarySubModal: React.FC<VisitDiarySummarySubModalProps> = ({
	showSummaryModal,
	setShowSummaryModal,
	patient,
	diary,
	doctorName,
	doctorSpecialty,
	lockedAt,
	diaryHash,
	hasCryptoSignature,
	isLocked,
	activeTeeth,
	radiologySnapshots,
	onPrint,
	onOpenPrescription,
	onOpenRadiologyReferral,
	onOpenEgiszExport,
	doSave,
}) => {
	if (!showSummaryModal) return null;

	return (
		<Suspense fallback={null}>
			<VisitSummaryModal
				isOpen={showSummaryModal}
				onClose={() => setShowSummaryModal(false)}
				patient={patient}
				diary={diary}
				doctorName={doctorName}
				doctorSpecialty={doctorSpecialty}
				lockedAt={lockedAt ?? null}
				diaryHash={diaryHash ?? null}
				hasCryptoSignature={Boolean(hasCryptoSignature)}
				isLocked={Boolean(isLocked)}
				teethData={activeTeeth ?? []}
				radiologySnapshots={radiologySnapshots ?? []}
				onPrint={onPrint}
				onOpenPrescription={onOpenPrescription}
				onOpenRadiologyReferral={onOpenRadiologyReferral}
				onOpenEgiszExport={onOpenEgiszExport}
				onCompleteVisit={async () => {
					await doSave(false);
					setShowSummaryModal(false);
				}}
			/>
		</Suspense>
	);
};

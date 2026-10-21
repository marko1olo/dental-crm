import React, { useEffect } from "react";
import type { VisitDiaryModalsProps } from "./modals/visitDiaryModalsTypes";
import { PrintPreviewOverlay } from "./modals/PrintPreviewOverlay";
import { VisitDiarySummarySubModal } from "./modals/VisitDiarySummarySubModal";
import { VisitDiaryPrescriptionSubModal } from "./modals/VisitDiaryPrescriptionSubModal";
import { VisitDiaryReferralSubModal } from "./modals/VisitDiaryReferralSubModal";
import { VisitDiaryEgiszSubModal } from "./modals/VisitDiaryEgiszSubModal";
import { VisitDiaryTemplatesSubModal } from "./modals/VisitDiaryTemplatesSubModal";

export type { VisitDiaryModalsProps } from "./modals/visitDiaryModalsTypes";

export function VisitDiaryModals(props: VisitDiaryModalsProps) {
	const {
		showSummaryModal, setShowSummaryModal,
		showPrescriptionModal, setShowPrescriptionModal,
		showRadiologyReferralModal, setShowRadiologyReferralModal,
		showEgiszModal, setShowEgiszModal,
		showTemplatesModal, setShowTemplatesModal,
		setShowPreview,
		setDiary,
		scheduleDebouncedSave,
		printPatient, activePatient,
		doSave,
	} = props;

	useEffect(() => {
		const handleInsertToDiary = (e: Event) => {
			const rawText = (e as CustomEvent<{ text?: string }>)?.detail?.text;
			if (rawText) {
				const textToInsert = String(rawText);
				setDiary((prev) => ({
					...prev,
					treatmentDescription: prev.treatmentDescription
						? `${prev.treatmentDescription}\n\n${textToInsert}`
						: textToInsert,
				}));
				scheduleDebouncedSave();
			}
		};
		window.addEventListener(
			"dente:insert-prescription-to-diary",
			handleInsertToDiary,
		);
		return () =>
			window.removeEventListener(
				"dente:insert-prescription-to-diary",
				handleInsertToDiary,
			);
	}, [setDiary, scheduleDebouncedSave]);

	return (
		<>
			<VisitDiarySummarySubModal
				{...props}
				patient={printPatient || activePatient}
				onPrint={() => setShowPreview(true)}
				onOpenPrescription={() => setShowPrescriptionModal(true)}
				onOpenRadiologyReferral={() => setShowRadiologyReferralModal(true)}
				onOpenEgiszExport={() => setShowEgiszModal(true)}
				doSave={doSave}
			/>

			<VisitDiaryPrescriptionSubModal
				{...props}
				onInsertToDiary={(diaryText) => {
					setDiary((prev) => ({
						...prev,
						treatmentDescription: prev.treatmentDescription
							? `${prev.treatmentDescription}\n\n${diaryText}`
							: diaryText,
					}));
					scheduleDebouncedSave();
				}}
			/>

			<VisitDiaryReferralSubModal {...props} />

			<VisitDiaryEgiszSubModal
				showEgiszModal={showEgiszModal}
				setShowEgiszModal={setShowEgiszModal}
			/>

			<VisitDiaryTemplatesSubModal
				showTemplatesModal={showTemplatesModal}
				setShowTemplatesModal={setShowTemplatesModal}
				diary={props.diary}
				setDiary={setDiary}
				isLocked={props.isLocked}
				isRevising={props.isRevising}
				beginRevise={props.beginRevise}
				scheduleDebouncedSave={scheduleDebouncedSave}
				setIcdSearch={props.setIcdSearch}
				doctorName={props.doctorName}
				doctorSpecialty={props.doctorSpecialty}
				patientFullName={props.patientFullName}
			/>

			<PrintPreviewOverlay {...props} />
		</>
	);
}

import React, { Suspense } from "react";
import { DocumentClinicalModals } from "./modals/DocumentClinicalModals";
import { DocumentRegulatoryModals } from "./modals/DocumentRegulatoryModals";
import { DocumentA4PrintPreviewModal } from "../DocumentA4PrintPreviewModal";
import type { DocumentModalsContainerProps } from "./modals/types";

export type { DocumentModalsContainerProps } from "./modals/types";

export const DocumentModalsContainer: React.FC<DocumentModalsContainerProps> = React.memo(
	function DocumentModalsContainer(props) {
		const {
			isA4PrintPreviewOpen,
			setIsA4PrintPreviewOpen,
			a4InitialTab,
			activePatient,
			activeDoctor,
			clinicProfileDraft,
			typedActiveDocuments,
		} = props;

		return (
			<Suspense fallback={null}>
				<DocumentClinicalModals {...props} />
				<DocumentRegulatoryModals {...props} />
				{isA4PrintPreviewOpen && setIsA4PrintPreviewOpen && (
					<DocumentA4PrintPreviewModal
						isOpen={isA4PrintPreviewOpen}
						onClose={() => setIsA4PrintPreviewOpen(false)}
						initialTab={a4InitialTab || "contract"}
						patient={activePatient ?? null}
						doctorFullName={activeDoctor?.fullName ?? null}
						clinicProfileDraft={clinicProfileDraft}
						existingDocuments={typedActiveDocuments}
					/>
				)}
			</Suspense>
		);
	},
);

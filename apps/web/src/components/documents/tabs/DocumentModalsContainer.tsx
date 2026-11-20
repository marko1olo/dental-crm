import React, { Suspense } from "react";
import { DocumentClinicalModals } from "./modals/DocumentClinicalModals";
import { DocumentRegulatoryModals } from "./modals/DocumentRegulatoryModals";
import { DocumentsStudioModal } from "../DocumentsStudioModal";
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
		} = props;

		const mappedTemplate = a4InitialTab === "act"
			? "card_extract"
			: (a4InitialTab === "consent" || a4InitialTab === "informed_consent")
				? "informed_consent"
				: "intake";

		return (
			<Suspense fallback={null}>
				<DocumentClinicalModals {...props} />
				<DocumentRegulatoryModals {...props} />
				{isA4PrintPreviewOpen && setIsA4PrintPreviewOpen && (
					<DocumentsStudioModal
						isOpen={isA4PrintPreviewOpen}
						onClose={() => setIsA4PrintPreviewOpen(false)}
						initialTemplate={mappedTemplate}
						patient={activePatient ?? undefined}
						doctorFullName={activeDoctor?.fullName ?? undefined}
						clinicProfileDraft={clinicProfileDraft ?? undefined}
					/>
				)}
			</Suspense>
		);
	},
);

import React from "react";
import type { DocumentKind, GeneratedDocument } from "@dental/shared";
import { printSurgicalPackage } from "./surgicalPackagePrintEngine";
import {
	type SurgicalPackageModalProps,
	type SurgicalItem,
	SURGICAL_STATUTORY_ITEMS,
	buildSurgicalClinic,
	buildSurgicalPatient,
	SurgicalPackageHeader,
	SurgicalPatientCard,
	SurgicalChecklist,
	SurgicalPackageFooter,
} from "./surgicalPackage/index";

export type { SurgicalPackageModalProps, SurgicalItem };
export { SURGICAL_STATUTORY_ITEMS };

export function SurgicalPackageModal({
	isOpen,
	onClose,
	patient,
	doctorFullName,
	existingDocuments,
	onCreateDocument,
	onOpenDocument,
	onSelectDocumentKind,
	clinicProfileDraft,
}: SurgicalPackageModalProps): React.JSX.Element | null {
	if (!isOpen) return null;

	const documentsByKind = new Map<DocumentKind, GeneratedDocument[]>();
	for (const doc of existingDocuments ?? []) {
		const list = documentsByKind.get(doc.kind) ?? [];
		list.push(doc);
		documentsByKind.set(doc.kind, list);
	}

	const missingKinds = SURGICAL_STATUTORY_ITEMS.filter(
		(item) => !documentsByKind.has(item.kind),
	).map((item) => item.kind);

	const handleBatchCreate = () => {
		for (const kind of missingKinds) {
			onCreateDocument(kind);
		}
	};

	const handleBatchPrint = () => {
		printSurgicalPackage({
			patient: buildSurgicalPatient(patient),
			clinic: buildSurgicalClinic(clinicProfileDraft),
			doctorFullName: doctorFullName || "Хирург-стоматолог",
		});
	};

	const handlePrintBlank = () => {
		printSurgicalPackage({
			patient: null,
			clinic: buildSurgicalClinic(clinicProfileDraft),
			doctorFullName: doctorFullName || "Хирург-стоматолог",
		});
	};

	return (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="surgical-package-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="document-package-modal-content">
				<SurgicalPackageHeader onClose={onClose} />
				<div className="document-package-modal-body">
					<SurgicalPatientCard
						patient={patient}
						doctorFullName={doctorFullName}
						missingCount={missingKinds.length}
					/>
					<SurgicalChecklist
						documentsByKind={documentsByKind}
						onOpenDocument={onOpenDocument}
						onSelectDocumentKind={onSelectDocumentKind}
						onCreateDocument={onCreateDocument}
						onClose={onClose}
					/>
				</div>
				<SurgicalPackageFooter
					missingCount={missingKinds.length}
					onBatchCreate={handleBatchCreate}
					onBatchPrint={handleBatchPrint}
					onPrintBlank={handlePrintBlank}
					onClose={onClose}
				/>
			</div>
		</div>
	);
}

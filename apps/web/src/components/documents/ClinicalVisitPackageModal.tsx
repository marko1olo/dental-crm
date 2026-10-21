import { Stethoscope, X } from "lucide-react";
import type React from "react";
import { ClinicalPackageChecklist } from "./clinicalPackageModal/ClinicalPackageChecklist";
import { ClinicalPackageFooter } from "./clinicalPackageModal/ClinicalPackageFooter";
import { ClinicalPackagePatientCard } from "./clinicalPackageModal/ClinicalPackagePatientCard";
import {
	CLINICAL_STATUTORY_ITEMS,
	type ClinicalItem,
	type ClinicalVisitPackageModalProps,
} from "./clinicalPackageModal/types";
import { useClinicalVisitPackage } from "./clinicalPackageModal/useClinicalVisitPackage";

export {
	CLINICAL_STATUTORY_ITEMS,
	type ClinicalItem,
	type ClinicalVisitPackageModalProps,
};

export function ClinicalVisitPackageModal(
	props: ClinicalVisitPackageModalProps,
): React.JSX.Element | null {
	const {
		isOpen,
		onClose,
		patient,
		doctorFullName,
		onOpenDocument,
		onSelectDocumentKind,
		onCreateDocument,
	} = props;
	const {
		documentsByKind,
		missingKinds,
		isMoreMenuOpen,
		setIsMoreMenuOpen,
		handleBatchCreate,
		handleBatchPrint,
		handlePrintBlank,
	} = useClinicalVisitPackage(props);

	if (!isOpen) return null;

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: backdrop overlay click
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="clinical-package-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="document-package-modal-content">
				<div className="document-package-modal-header">
					<h3
						className="document-package-modal-title"
						id="clinical-package-modal-title"
					>
						<Stethoscope
							size={18}
							className="text-teal-600 dark:text-teal-400"
							aria-hidden="true"
						/>
						<span>Клинический пакет приёма врача</span>
					</h3>
					<button
						type="button"
						className="secondary-button"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
					>
						<X size={18} aria-hidden="true" />
					</button>
				</div>

				<div className="document-package-modal-body">
					<ClinicalPackagePatientCard
						patient={patient}
						doctorFullName={doctorFullName}
						missingCount={missingKinds.length}
					/>
					<ClinicalPackageChecklist
						documentsByKind={documentsByKind}
						onOpenDocument={onOpenDocument}
						onSelectDocumentKind={onSelectDocumentKind}
						onCreateDocument={onCreateDocument}
						onClose={onClose}
					/>
				</div>

				<ClinicalPackageFooter
					missingCount={missingKinds.length}
					onBatchCreate={handleBatchCreate}
					onBatchPrint={handleBatchPrint}
					onPrintBlank={handlePrintBlank}
					onClose={onClose}
					isMoreMenuOpen={isMoreMenuOpen}
					setIsMoreMenuOpen={setIsMoreMenuOpen}
				/>
			</div>
		</div>
	);
}

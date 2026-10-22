// Клинический пакет документов первичного приёма: Договор, Согласие, Анкета, Журнал стерилизации и автоклавирования (Мандат 8x, 8y).
import React, { type ReactElement } from "react";
import { createPortal } from "react-dom";
import { DigitalSignatureTabletModal } from "./DigitalSignatureTabletModal";
import {
	INTAKE_STATUTORY_ITEMS,
	CONSENT_INTERVENTION_TYPES,
	type PrimaryIntakePackageModalProps,
	usePrimaryIntakeModalState,
	usePrimaryIntakePrint,
	PrimaryIntakeHeader,
	PrimaryIntakePatientCard,
	PrimaryIntakeInterventionsBar,
	PrimaryIntakeDocumentItem,
	PrimaryIntakeFooterActions,
} from "./primaryIntakeModal/index";
import "./documentNavigation.css";

export type { PrimaryIntakePackageModalProps } from "./primaryIntakeModal/types";

export function PrimaryIntakePackageModal(props: PrimaryIntakePackageModalProps): ReactElement | null {
	const { isOpen, onClose, patient, doctorFullName, clinicProfileDraft } = props;
	if (!isOpen) return null;

	const state = usePrimaryIntakeModalState(props);
	const print = usePrimaryIntakePrint({
		patient,
		clinicProfileDraft,
		doctorFullName,
		isNormApplied: state.isNormApplied,
	});

	const activeInterventions = CONSENT_INTERVENTION_TYPES.filter((t) =>
		state.selectedInterventions.includes(t.id),
	).map((t) => t.label).join(", ");

	if (state.isSignatureTabletOpen) {
		return (
			<DigitalSignatureTabletModal
				isOpen={state.isSignatureTabletOpen}
				onClose={() => state.setIsSignatureTabletOpen(false)}
				documentsPackageTitle={`Экспресс-пакет первичного визита (Договор и Согласие: ${activeInterventions})`}
				patient={patient}
				doctorFullName={doctorFullName ?? null}
				clinicName={clinicProfileDraft?.clinicName || "Стоматологическая клиника"}
				onConfirmSignature={state.handleConfirmSignatureFromTablet}
				onPrintArchiveA4={print.handleBatchPrint}
			/>
		);
	}

	const modalNode = (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="intake-package-modal-title"
			data-testid="modal-primary-intake-package"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="document-package-modal-content">
				<PrimaryIntakeHeader onClose={onClose} />
				<div className="document-package-modal-body">
					<PrimaryIntakePatientCard
						patient={patient}
						isNormApplied={state.isNormApplied}
						onFillSomaticNorm={state.handleFillSomaticNorm}
						missingCount={state.missingKinds.length}
						isSignedPep={state.isSignedPep}
					/>
					<PrimaryIntakeInterventionsBar
						selectedInterventions={state.selectedInterventions}
						onToggleIntervention={state.toggleIntervention}
					/>
					<div className="document-package-checklist">
						{INTAKE_STATUTORY_ITEMS.map((item) => (
							<PrimaryIntakeDocumentItem
								key={item.kind}
								item={item}
								existingDocs={state.documentsByKind.get(item.kind) ?? []}
								isSignedPep={state.isSignedPep}
								isNormApplied={state.isNormApplied}
								activeInterventionLabels={activeInterventions}
								onFillSomaticNorm={state.handleFillSomaticNorm}
								onOpenDocument={props.onOpenDocument}
								onSelectDocumentKind={props.onSelectDocumentKind}
								onCreateDocument={props.onCreateDocument}
								onClose={onClose}
							/>
						))}
					</div>
				</div>
				<PrimaryIntakeFooterActions
					missingCount={state.missingKinds.length}
					onBatchCreate={state.handleBatchCreate}
					onBatchPrint={print.handleBatchPrint}
					onOpenSignatureTablet={() => state.setIsSignatureTabletOpen(true)}
					isMoreMenuOpen={state.isMoreMenuOpen}
					setIsMoreMenuOpen={state.setIsMoreMenuOpen}
					isNormApplied={state.isNormApplied}
					onFillSomaticNorm={state.handleFillSomaticNorm}
					onPrintBlankPackage={print.handlePrintBlankPackage}
					onOpenAutoclaveLog257={props.onOpenAutoclaveLog257}
					onClose={onClose}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body ? createPortal(modalNode, document.body) : modalNode;
}

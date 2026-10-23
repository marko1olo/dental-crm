import type React from "react";
import type { DocumentKind, GeneratedDocument } from "@dental/shared";
import {
	type TaxDocumentPayerOption,
	type TaxAccountingPackageModalProps,
	type TaxItem,
	TAX_ACCOUNTING_ITEMS,
	TaxAccountingHeader,
	TaxPayerYearControls,
	TaxChecklistSection,
	TaxFnsXmlBanner,
	TaxAccountingFooter,
} from "./taxAccounting/index";

export type { TaxDocumentPayerOption, TaxAccountingPackageModalProps, TaxItem };
export { TAX_ACCOUNTING_ITEMS };

export function TaxAccountingPackageModal({
	isOpen,
	onClose,
	patient,
	taxYear,
	setTaxYear,
	payerOptions,
	selectedPayerKey,
	onSelectPayerKey,
	existingDocuments,
	onCreateDocument,
	onOpenDocument,
	onSelectDocumentKind,
	onOpenFnsXmlModal,
	onRequestIssueDocument,
}: TaxAccountingPackageModalProps): React.JSX.Element | null {
	if (!isOpen) return null;

	const documentsByKind = new Map<DocumentKind, GeneratedDocument[]>();
	for (const doc of existingDocuments ?? []) {
		const list = documentsByKind.get(doc.kind) ?? [];
		list.push(doc);
		documentsByKind.set(doc.kind, list);
	}

	const missingKinds = TAX_ACCOUNTING_ITEMS.filter(
		(item) => !documentsByKind.has(item.kind),
	).map((item) => item.kind);

	const handleBatchCreate = () => {
		for (const kind of missingKinds) {
			onCreateDocument(kind);
		}
	};

	return (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tax-package-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="document-package-modal-content">
				<TaxAccountingHeader onClose={onClose} />
				<div className="document-package-modal-body">
					<TaxPayerYearControls
						taxYear={taxYear}
						setTaxYear={setTaxYear}
						payerOptions={payerOptions}
						selectedPayerKey={selectedPayerKey}
						onSelectPayerKey={onSelectPayerKey}
						patient={patient}
					/>
					<TaxChecklistSection
						documentsByKind={documentsByKind}
						onOpenDocument={onOpenDocument}
						onSelectDocumentKind={onSelectDocumentKind}
						onCreateDocument={onCreateDocument}
						onRequestIssueDocument={onRequestIssueDocument}
						onClose={onClose}
					/>
					<TaxFnsXmlBanner
						onOpenFnsXmlModal={onOpenFnsXmlModal}
						onClose={onClose}
					/>
				</div>
				<TaxAccountingFooter
					missingCount={missingKinds.length}
					onBatchCreate={handleBatchCreate}
					onClose={onClose}
				/>
			</div>
		</div>
	);
}

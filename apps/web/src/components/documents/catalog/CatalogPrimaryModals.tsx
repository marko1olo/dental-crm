import type React from "react";
import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
import { DocumentA4PrintPreviewModal } from "../DocumentA4PrintPreviewModal";
import { OutpatientCardPrintModal } from "../OutpatientCardPrintModal";
import { PrimaryIntakePackageModal } from "../PrimaryIntakePackageModal";
import type { ProfessionalA4DocumentTab } from "../ProfessionalDocumentA4Sheet";

export interface CatalogPrimaryModalsProps {
	patient?: Patient | null | undefined;
	doctorName?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinicProfileDraft
	clinicProfileDraft?: any | undefined;
	existingDocuments?: readonly GeneratedDocument[] | undefined;
	isLocalIntakeModalOpen: boolean;
	setIsLocalIntakeModalOpen: (open: boolean) => void;
	isOutpatientCardModalOpen: boolean;
	setIsOutpatientCardModalOpen: (open: boolean) => void;
	isContractModalOpen: boolean;
	setIsContractModalOpen: (open: boolean) => void;
	selectedA4Tab: ProfessionalA4DocumentTab | null;
	setSelectedA4Tab: (tab: ProfessionalA4DocumentTab | null) => void;
	onCreateDocument?: ((kind: DocumentKind) => void | Promise<void>) | undefined;
	onOpenIssuedDocumentHtml?: ((id: string) => void | Promise<void>) | undefined;
	handleOpenKind: (kind: DocumentKind) => void;
}

export function CatalogPrimaryModals({
	patient,
	doctorName,
	clinicProfileDraft,
	existingDocuments,
	isLocalIntakeModalOpen,
	setIsLocalIntakeModalOpen,
	isOutpatientCardModalOpen,
	setIsOutpatientCardModalOpen,
	isContractModalOpen,
	setIsContractModalOpen,
	selectedA4Tab,
	setSelectedA4Tab,
	onCreateDocument,
	onOpenIssuedDocumentHtml,
	handleOpenKind,
}: CatalogPrimaryModalsProps): React.JSX.Element {
	return (
		<>
			{isLocalIntakeModalOpen && (
				<PrimaryIntakePackageModal
					isOpen={isLocalIntakeModalOpen}
					onClose={() => setIsLocalIntakeModalOpen(false)}
					patient={patient ?? null}
					existingDocuments={existingDocuments ? [...existingDocuments] : []}
					onCreateDocument={(kind) =>
						onCreateDocument
							? void onCreateDocument(kind)
							: handleOpenKind(kind)
					}
					onOpenDocument={(id) =>
						onOpenIssuedDocumentHtml
							? void onOpenIssuedDocumentHtml(id)
							: undefined
					}
					onSelectDocumentKind={(kind) => handleOpenKind(kind)}
					doctorFullName={doctorName}
					clinicProfileDraft={clinicProfileDraft}
				/>
			)}
			{isOutpatientCardModalOpen && (
				<OutpatientCardPrintModal
					isOpen={isOutpatientCardModalOpen}
					onClose={() => setIsOutpatientCardModalOpen(false)}
					patient={patient ?? null}
					doctorFullName={doctorName ?? null}
					clinicProfileDraft={clinicProfileDraft}
				/>
			)}
			{(selectedA4Tab || isContractModalOpen) && (
				<DocumentA4PrintPreviewModal
					isOpen={Boolean(selectedA4Tab || isContractModalOpen)}
					onClose={() => {
						setSelectedA4Tab(null);
						setIsContractModalOpen(false);
					}}
					initialTab={selectedA4Tab || "contract"}
					patient={patient ?? null}
					doctorFullName={doctorName ?? null}
					clinicProfileDraft={clinicProfileDraft}
					existingDocuments={existingDocuments}
				/>
			)}
		</>
	);
}

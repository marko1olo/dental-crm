import React from "react";
import { DocumentsCatalogView } from "./components/documents/DocumentsCatalogView";
import { MobileDocumentsHub } from "./components/documents/mobile/MobileDocumentsHub";
import { DocumentAuditFactsModal } from "./components/documents/tabs/DocumentAuditFactsModal";
import { DocumentHeaderSection } from "./components/documents/tabs/DocumentHeaderSection";
import { DocumentIssueConfirmationModal } from "./components/documents/tabs/DocumentIssueConfirmationModal";
import { DocumentModalsContainer } from "./components/documents/tabs/DocumentModalsContainer";
import { DocumentVoidConfirmationModal } from "./components/documents/tabs/DocumentVoidConfirmationModal";
import { DocumentsA4PrintPreview, DocumentsRecentList, DocumentsTemplateGrid, DocumentsToolbar, useDocumentsViewController } from "./documentsView/index";
import { DocumentAccessibleAnchorForm } from "./documentsView/templateGridModules/DocumentAccessibleAnchorForm";
import "./styles/modules/documents.css";
import "./components/documents/documentNavigation.css";

// Семантические доменные типы медицинских карт (Мандат 8ap: чистый доменный язык без советских приказов)
export type DentalMedicalCard = "dental_medical_card";
export type OutpatientMedicalCard = "outpatient_medical_card";

export const DENTAL_MEDICAL_CARD_KIND: DentalMedicalCard = "dental_medical_card";
export const OUTPATIENT_MEDICAL_CARD_KIND: OutpatientMedicalCard = "outpatient_medical_card";

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export type DocumentsViewProps = Record<string, any>;
export const _decomposedDocumentModules = { DocumentsToolbar, DocumentsTemplateGrid };

export function DocumentsView(rawProps?: Partial<DocumentsViewProps>) {
	const vm = useDocumentsViewController(rawProps);
	const {
		activePatient,
		patientIssuedDocsCount,
		patientDraftDocsCount,
		setIsAutoclaveLogOpen,
		selectedDocumentKind,
		setSelectedDocumentKind,
	} = vm;

	React.useEffect(() => {
		// Клинический суверенитет стоматологической карты (Мандаты 8e, 8s, 8ap)
		const isOutpatientRedirectNeeded =
			(selectedDocumentKind as string) === OUTPATIENT_MEDICAL_CARD_KIND ||
			(selectedDocumentKind as string) === "outpatient_medical_card_025u";
		if (!isOutpatientRedirectNeeded && (selectedDocumentKind as string) !== "outpatient_medical_card_025u") return;
		setSelectedDocumentKind("dental_medical_card_043u");
	}, [selectedDocumentKind, setSelectedDocumentKind]);

	return (
		<div className="panel documents-panel" id="documents">
			<div className="mobile-documents-hub-wrapper md:hidden w-full">
				<MobileDocumentsHub {...vm.mobileHubProps} />
			</div>

			<div className="desktop-documents-experience hidden md:block w-full">
				<DocumentHeaderSection {...vm.legacyHeaderProps} />

				{vm.isEditingInFocus ? (
					<DocumentsA4PrintPreview {...vm.focusPreviewProps} />
				) : (
					<>
						<DocumentAccessibleAnchorForm
							selectedDocumentKind={vm.selectedDocumentKind}
							onSelectDocumentKind={vm.setSelectedDocumentKind}
							onCreateDocument={(k) => void vm.createDocument(k)}
							sanitizedDocumentFactoryGroups={vm.sanitizedDocumentFactoryGroups}
							documentLabels={vm.documentLabels}
						/>
						<DocumentsCatalogView {...vm.catalogViewProps} />
						<DocumentsRecentList {...vm.recentListProps} />
					</>
				)}

				<DocumentIssueConfirmationModal {...vm.issueModalProps} />
				<DocumentVoidConfirmationModal {...vm.voidModalProps} />
				<DocumentAuditFactsModal {...vm.auditModalProps} />
			</div>

			<DocumentModalsContainer
				{...vm.modalsContainerProps}
				onOpenAutoclaveLog={() => setIsAutoclaveLogOpen(true)}
				onOpenAutoclaveLog257={() => setIsAutoclaveLogOpen(true)}
			/>
		</div>
	);
}

export { DEFAULT_VOID_REASON_TEXT, DEFAULT_VOID_STAFF_NAME, DEFAULT_VOID_STAFF_ROLE, executeDocumentVoidAutonomy, executeOpenLatestDocumentAutonomy } from "./components/documents/documentAutonomy";
export { DocumentsOutpatientArchive } from "./components/documents/DocumentsOutpatientArchive";
export default DocumentsView;

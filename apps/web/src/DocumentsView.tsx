import React from "react";
import { FileCheck, FileText } from "lucide-react";
import { DocumentNavTabs } from "./components/documents/DocumentNavTabs";
import { DocumentsCatalogView } from "./components/documents/DocumentsCatalogView";
import { MobileDocumentsHub } from "./components/documents/mobile/MobileDocumentsHub";
import { DocumentAuditFactsModal } from "./components/documents/tabs/DocumentAuditFactsModal";
import { DocumentFormSwitch } from "./components/documents/tabs/DocumentFormSwitch";
import { DocumentHeaderSection } from "./components/documents/tabs/DocumentHeaderSection";
import { DocumentIssueConfirmationModal } from "./components/documents/tabs/DocumentIssueConfirmationModal";
import { DocumentModalsContainer } from "./components/documents/tabs/DocumentModalsContainer";
import { DocumentVoidConfirmationModal } from "./components/documents/tabs/DocumentVoidConfirmationModal";
import { DocumentsA4PrintPreview, DocumentsRecentList, DocumentsTemplateGrid, DocumentsToolbar, useDocumentsViewController } from "./documentsView/index";
import "./styles/modules/documents.css";
import "./components/documents/documentNavigation.css";

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
		if ((selectedDocumentKind as string) !== "outpatient_medical_card_025u") return;
		setSelectedDocumentKind("dental_medical_card_043u");
	}, [selectedDocumentKind, setSelectedDocumentKind]);

	return (
		<div className="panel documents-panel" id="documents">
			<div className="mobile-documents-hub-wrapper md:hidden w-full">
				<MobileDocumentsHub {...vm.mobileHubProps} />
			</div>

			<div className="desktop-documents-experience hidden md:block w-full">
				<div className="flex items-center justify-between py-2 px-3 mb-2 bg-[var(--paper,#ffffff)] rounded-xl border border-[var(--line,#e2e8f0)] shadow-2xs">
					<div className="flex items-center gap-3">
						<span className="text-sm font-bold text-[var(--ink,#0f172a)]">{activePatient ? activePatient.fullName : "Все пациенты клиники"}</span>
						{activePatient?.birthDate && <span className="text-xs text-[var(--muted,#64748b)]">Д/Р: {vm.safeFormatShortDate(activePatient.birthDate)}</span>}
						{activePatient?.phone && <span className="text-xs text-[var(--muted,#64748b)]">Тел: {activePatient.phone}</span>}
						<span className="text-xs px-2 py-0.5 rounded-full bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] font-semibold">Выдано: {patientIssuedDocsCount}</span>
						<span className="text-xs px-2 py-0.5 rounded-full bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">Черновиков: {patientDraftDocsCount}</span>
					</div>
					<button
						type="button"
						className="secondary-button h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5 cursor-pointer documents-open-autoclave-log-257-btn"
						onClick={() => setIsAutoclaveLogOpen(true)}
						data-testid="documents-open-autoclave-log-257-btn"
						title="Открыть журнал контроля стерилизации и автоклавирования"
					>
						<FileCheck size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Журнал стерилизации</span>
					</button>
				</div>

				<div className="legacy-document-nav-hidden hidden" style={{ display: "none" }}>
					<DocumentHeaderSection {...vm.legacyHeaderProps} />
					<DocumentNavTabs activeTab={vm.activeCategoryTab} onSelectTab={vm.handleSelectCategoryTab} counts={vm.navCategoryCounts} />
				</div>

				{vm.isEditingInFocus ? (
					<DocumentsA4PrintPreview {...vm.focusPreviewProps} />
				) : (
					<>
						<DocumentsCatalogView {...vm.catalogViewProps} />
						<DocumentsRecentList {...vm.recentListProps} />
						<section className="document-factory hidden" aria-label="Быстро создать документ" style={{ display: "none" }}>
							<select
								id="document-kind-selector"
								className="document-factory-select"
								value={vm.selectedDocumentKind}
								onChange={(e) => vm.setSelectedDocumentKind(vm.normalizedDocumentKind(e.target.value))}
								data-testid="select-document-kind"
							>
								{(vm.sanitizedDocumentFactoryGroups ?? []).map((group) => (
									<optgroup key={group.title} label={group.title}>
										{(group?.kinds ?? []).map((kind) => (
											<option key={kind} value={kind}>{vm.documentLabels?.[kind] ?? kind}</option>
										))}
									</optgroup>
								))}
							</select>
							<button
								className="primary-button document-factory-create-btn"
								type="button"
								disabled={Boolean(vm.documentCreateSavingKind)}
								aria-busy={vm.isSelectedDocumentCreating || undefined}
								aria-describedby={vm.selectedDocumentCreateGuidanceId}
								onClick={() => void vm.createDocument(vm.selectedDocumentKind)}
								data-testid="btn-create-selected-document"
							>
								<FileText size={15} aria-hidden="true" />
								<span>{vm.isSelectedDocumentCreating ? "Создаю..." : "Создать выбранный документ"}</span>
							</button>
							<DocumentFormSwitch {...vm.props} selectedDocumentKind={vm.selectedDocumentKind} />
						</section>
					</>
				)}

				<DocumentIssueConfirmationModal {...vm.issueModalProps} />
				<DocumentVoidConfirmationModal {...vm.voidModalProps} />
				<DocumentAuditFactsModal {...vm.auditModalProps} />
			</div>

			<DocumentModalsContainer
				{...vm.modalsContainerProps}
				onOpenAutoclaveLog257={() => setIsAutoclaveLogOpen(true)}
			/>
		</div>
	);
}

export { DEFAULT_VOID_REASON_TEXT, DEFAULT_VOID_STAFF_NAME, DEFAULT_VOID_STAFF_ROLE, executeDocumentVoidAutonomy, executeOpenLatestDocumentAutonomy } from "./components/documents/documentAutonomy";
export { DocumentsOutpatientArchive } from "./components/documents/DocumentsOutpatientArchive";
export default DocumentsView;

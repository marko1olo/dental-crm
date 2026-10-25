import React from "react";
import type { GeneratedDocument, Patient } from "@dental/shared";
import { FileCheck } from "lucide-react";
import { VirtualizedTimeline } from "../../common/VirtualizedTimeline";
import { usePatientDocumentsLogic } from "./documents/usePatientDocumentsLogic";
import { PatientDocumentsHeader } from "./documents/PatientDocumentsHeader";
import { PatientDocumentItemCard } from "./documents/PatientDocumentItemCard";
import { PatientDocumentsModalsWrapper } from "./documents/PatientDocumentsModalsWrapper";

export interface PatientDocumentsTabProps {
	patient: Patient;
	/** Печать: Вкладыш в амбулаторную карту */
	onPrintOutpatientCard?: (() => void) | undefined;
}

export const PatientDocumentsTab: React.FC<PatientDocumentsTabProps> = React.memo(
	function PatientDocumentsTab({ patient, onPrintOutpatientCard }) {
		const logic = usePatientDocumentsLogic(patient);
		const { appLogic, docStore, patientDocs } = logic;

		return (
			<div
				className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs"
				data-testid="patient-documents-tab"
			>
				<PatientDocumentsHeader
					patient={patient}
					onPrintOutpatientCard={onPrintOutpatientCard}
					onOpenFastPrint={(type) => {
						logic.setFastPrintDocType(type);
						logic.setIsFastPrintOpen(true);
					}}
				/>

				{patientDocs.length > 0 ? (
					<div className="flex flex-col gap-2.5">
						<div className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
							Оформленные и подготовленные документы ({patientDocs.length})
						</div>

						<VirtualizedTimeline<GeneratedDocument>
							items={patientDocs}
							estimateHeight={76}
							overscan={2}
							threshold={8}
							getItemKey={(doc) => doc.id}
							dataTestId="patient-docs-virtualized-scroller"
							renderItem={(doc) => (
								<PatientDocumentItemCard
									key={doc.id}
									doc={doc}
									documentLabels={appLogic.documentLabels}
									documentStatusLabels={appLogic.documentStatusLabels}
									formatShortDate={appLogic.formatShortDate}
									money={appLogic.money}
									onAuditDoc={(id) => void appLogic.loadDocumentAuditFacts(id)}
									onOpenDocHtml={(id) => void appLogic.openIssuedDocumentHtml(id)}
									onDownloadPdf={(id) => void appLogic.downloadIssuedDocumentPdf(id)}
									onTabletSign={(d) => logic.setTabletSignDoc(d)}
									onRequestIssue={(d) => appLogic.requestDocumentIssue(d)}
								/>
							)}
						/>
					</div>
				) : (
					<div className="p-6 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-center flex flex-col items-center gap-2">
						<div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
							<FileCheck size={20} />
						</div>
						<h4 className="text-xs font-bold text-[var(--ink)] m-0">
							Нет сохранённых документов в базе
						</h4>
						<p className="text-xs text-[var(--muted)] max-w-md m-0">
							Для пациента пока не сформировано индивидуальных документов. Вы можете распечатать чистый бланк договора или перейти в раздел «Документы» для генерации.
						</p>
					</div>
				)}

				<PatientDocumentsModalsWrapper
					patient={patient}
					appLogic={appLogic}
					docStore={docStore}
					isFastPrintOpen={logic.isFastPrintOpen}
					setIsFastPrintOpen={logic.setIsFastPrintOpen}
					fastPrintDocType={logic.fastPrintDocType}
					tabletSignDoc={logic.tabletSignDoc}
					setTabletSignDoc={logic.setTabletSignDoc}
					activeIssueDoc={logic.activeIssueDoc}
					onTabletSignatureConfirm={logic.handleTabletSignatureConfirm}
				/>
			</div>
		);
	},
);

PatientDocumentsTab.displayName = "PatientDocumentsTab";
export default PatientDocumentsTab;

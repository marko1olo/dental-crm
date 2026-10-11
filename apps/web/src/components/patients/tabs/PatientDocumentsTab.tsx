import React, { useMemo } from "react";
import type { GeneratedDocument, Patient, DocumentKind, DocumentStatus } from "@dental/shared";
import {
	AlertCircle,
	CheckCircle2,
	FileCheck,
	FileSignature,
	FileText,
	Printer,
	ShieldCheck,
	Smartphone,
} from "lucide-react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useDocumentStore } from "../../../store/documentStore";
import {
	printBlankMedicalConsent,
	printBlankMedicalContract,
} from "../blankContractPrint";
import { DocumentAuditFactsModal } from "../../documents/tabs/DocumentAuditFactsModal";
import { DocumentIssueConfirmationModal } from "../../documents/tabs/DocumentIssueConfirmationModal";
import { CANONICAL_DOCUMENT_STATUS_LABELS } from "../../documents/documentAutonomy";

export interface PatientDocumentsTabProps {
	patient: Patient;
	onPrintOutpatientCard?: () => void;
}

export const PatientDocumentsTab: React.FC<PatientDocumentsTabProps> = React.memo(
	function PatientDocumentsTab({ patient, onPrintOutpatientCard }) {
		const appLogic = useAppLogicContext();
		const docStore = useDocumentStore();

		const {
			dashboard,
			loadDocumentAuditFacts,
			downloadIssuedDocumentPdf,
			openIssuedDocumentHtml,
			downloadIssuedDocumentHtml,
			requestDocumentIssue,
			confirmDocumentIssue,
			documentLabels,
			documentStatusLabels,
			documentSourceStatusClassNames,
			documentSourceStatusLabels,
			documentIssueSignatureModeLabels,
			documentVoidReasonLabels,
			formatShortDate,
			money,
		} = appLogic;

		const {
			documentAuditFacts,
			setDocumentAuditFacts,
			documentIssueConfirmationId,
			setDocumentIssueConfirmationId,
			documentIssueSignatureMode,
			setDocumentIssueSignatureMode,
			documentIssueSignedAt,
			setDocumentIssueSignedAt,
			documentIssueRecipientFullName,
			setDocumentIssueRecipientFullName,
			documentIssueRecipientRole,
			setDocumentIssueRecipientRole,
			documentIssueStaffFullName,
			setDocumentIssueStaffFullName,
			documentIssueStaffRole,
			setDocumentIssueStaffRole,
			documentIssueNote,
			setDocumentIssueNote,
			documentIssueIdentityChecked,
			setDocumentIssueIdentityChecked,
			documentIssueDocumentOpenedAndChecked,
			setDocumentIssueDocumentOpenedAndChecked,
			documentIssueRecipientSigned,
			setDocumentIssueRecipientSigned,
			documentIssueClinicSigned,
			setDocumentIssueClinicSigned,
		} = docStore;

		const patientDocs = useMemo(() => {
			return (dashboard?.documents ?? []).filter(
				(doc: GeneratedDocument) => doc && doc.patientId === patient.id,
			);
		}, [dashboard?.documents, patient.id]);

		const activeIssueDoc = useMemo(() => {
			if (!documentIssueConfirmationId) return null;
			return (
				(dashboard?.documents ?? []).find(
					(doc: GeneratedDocument) => doc.id === documentIssueConfirmationId,
				) ?? null
			);
		}, [dashboard?.documents, documentIssueConfirmationId]);

		return (
			<div
				className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs"
				data-testid="patient-documents-tab"
			>
				{/* Section Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
					<div>
						<h3 className="text-sm font-bold text-[var(--ink)] uppercase tracking-wider m-0 flex items-center gap-2">
							<FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
							<span>Официальная документация пациента</span>
						</h3>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							ЭМК Форма 043/у (Приказ 834н), договоры (Постановление 736), информированные согласия (ИДС) и справки ФНС.
						</p>
					</div>

					{/* Blanks Quick Bar */}
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={() => void printBlankMedicalContract(patient)}
							className="h-8 px-3 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
							data-testid="btn-print-blank-contract"
							title="Печать чистого бланка договора со строками заполнения"
						>
							<FileText size={13} className="text-teal-600 dark:text-teal-400" />
							<span>Бланк договора</span>
						</button>

						<button
							type="button"
							onClick={() => void printBlankMedicalConsent(patient)}
							className="h-8 px-3 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
							data-testid="btn-print-blank-consent"
							title="Печать чистого бланка информированного добровольного согласия (ИДС)"
						>
							<ShieldCheck size={13} className="text-teal-600 dark:text-teal-400" />
							<span>Бланк ИДС</span>
						</button>

						{onPrintOutpatientCard && (
							<button
								type="button"
								onClick={onPrintOutpatientCard}
								className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
								data-testid="btn-print-outpatient-card"
								title="Печать выписки из амбулаторной карты 043/у"
							>
								<Printer size={13} />
								<span>Выписка 043/у</span>
							</button>
						)}
					</div>
				</div>

				{/* Documents Registry */}
				{patientDocs.length > 0 ? (
					<div className="flex flex-col gap-2.5">
						<div className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
							Оформленные и подготовленные документы ({patientDocs.length})
						</div>

						<div className="flex flex-col gap-2">
							{patientDocs.map((doc: GeneratedDocument) => {
								const kindLabel =
									documentLabels?.[doc.kind as DocumentKind] ?? doc.kind;
								const statusLabel =
									documentStatusLabels?.[doc.status as DocumentStatus] ??
									CANONICAL_DOCUMENT_STATUS_LABELS[doc.status as DocumentStatus] ??
									doc.status;
								const isIssued = doc.status === "issued";
								const isDraft = doc.status === "draft";
								const isSignedSms =
									String(doc.signatureAttestation?.mode ?? "").includes("sms") ||
									doc.signatureAttestation?.mode === "simple_electronic_signature";
								const hasUkeP = Boolean(doc.cryptoSignaturePkcs7 || doc.doctorSignedAt);

								return (
									<div
										key={doc.id}
										className="p-3 sm:p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-[var(--teal)]/40"
										data-testid={`patient-doc-row-${doc.id}`}
									>
										{/* Document summary */}
										<div className="flex flex-col gap-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<strong className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">
													{doc.title || kindLabel}
												</strong>
												<span
													className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
														isIssued
															? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
															: isDraft
																? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
																: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20"
													}`}
												>
													{statusLabel}
												</span>
												{isSignedSms && (
													<span
														className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 inline-flex items-center gap-1"
														title="Подписан простой электронной подписью по СМС"
													>
														<Smartphone size={11} />
														<span>СМС ЭЦП</span>
													</span>
												)}
												{hasUkeP && (
													<span
														className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-flex items-center gap-1"
														title="Подписан УКЭП (ГОСТ Р 34.10-2012)"
													>
														<ShieldCheck size={11} />
														<span>УКЭП ГОСТ</span>
													</span>
												)}
											</div>

											<div className="text-[11.5px] text-[var(--muted)] flex items-center gap-2 flex-wrap">
												<span>{kindLabel}</span>
												{doc.issuedAt && (
													<span>· от {typeof formatShortDate === "function" ? formatShortDate(doc.issuedAt) : String(doc.issuedAt)}</span>
												)}
												{doc.totalAmountRub !== undefined && (
													<span>· {typeof money === "function" ? money(doc.totalAmountRub) : `${doc.totalAmountRub} ₽`}</span>
												)}
												{doc.issuedSnapshotSha256 && (
													<code className="text-[10.5px] bg-[var(--paper)] px-1 rounded border border-[var(--line)]">
														{doc.issuedSnapshotSha256.slice(0, 10)}
													</code>
												)}
											</div>
										</div>

										{/* Actions */}
										<div className="flex items-center gap-2 flex-wrap shrink-0">
											{/* 1-Click Legal Audit Button */}
											<button
												type="button"
												onClick={() => void loadDocumentAuditFacts(doc.id)}
												className="h-8 px-2.5 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
												data-testid={`btn-patient-audit-doc-${doc.id}`}
												title="Открыть аудит юридической чистоты и фактов выдачи"
											>
												<ShieldCheck size={13} className="text-teal-600 dark:text-teal-400" />
												<span>Аудит чистоты</span>
											</button>

											{/* View HTML */}
											<button
												type="button"
												onClick={() => void openIssuedDocumentHtml(doc.id)}
												className="h-8 px-2.5 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
												data-testid={`btn-patient-open-doc-${doc.id}`}
												title="Открыть HTML-версию документа"
											>
												<FileText size={13} />
												<span>Открыть</span>
											</button>

											{/* Print / PDF */}
											<button
												type="button"
												onClick={() => void downloadIssuedDocumentPdf(doc.id)}
												className="h-8 px-2.5 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
												data-testid={`btn-patient-pdf-doc-${doc.id}`}
												title="Печать / скачать PDF"
											>
												<Printer size={13} className="text-teal-600 dark:text-teal-400" />
												<span>Печать / PDF</span>
											</button>

											{/* If draft: Issue button */}
											{isDraft && (
												<button
													type="button"
													onClick={() => requestDocumentIssue(doc)}
													className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
													data-testid={`btn-patient-issue-doc-${doc.id}`}
													title="Проверить и выдать документ"
												>
													<FileSignature size={13} />
													<span>Выдать</span>
												</button>
											)}
										</div>
									</div>
								);
							})}
						</div>
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

				{/* Modals rendered via createPortal into document.body */}
				<DocumentAuditFactsModal
					documentAuditFacts={documentAuditFacts}
					documentLabels={documentLabels}
					documentStatusLabels={documentStatusLabels}
					formatShortDate={formatShortDate}
					documentSourceStatusClassNames={documentSourceStatusClassNames}
					documentSourceStatusLabels={documentSourceStatusLabels}
					documentIssueSignatureModeLabels={documentIssueSignatureModeLabels}
					documentVoidReasonLabels={documentVoidReasonLabels}
					loadDocumentAuditFacts={loadDocumentAuditFacts}
					setDocumentAuditFacts={setDocumentAuditFacts}
					openIssuedDocumentHtml={openIssuedDocumentHtml}
					downloadIssuedDocumentHtml={downloadIssuedDocumentHtml}
					downloadIssuedDocumentPdf={downloadIssuedDocumentPdf}
				/>

				<DocumentIssueConfirmationModal
					documentIssueConfirmation={activeIssueDoc}
					documentLabels={documentLabels}
					patientName={appLogic.patientName}
					patients={dashboard?.patients}
					money={money}
					documentIssueSignatureMode={documentIssueSignatureMode}
					setDocumentIssueSignatureMode={setDocumentIssueSignatureMode}
					normalizedDocumentIssueSignatureMode={appLogic.normalizedDocumentIssueSignatureMode}
					documentIssueSignatureModeLabels={documentIssueSignatureModeLabels}
					documentIssueSignedAt={documentIssueSignedAt}
					setDocumentIssueSignedAt={setDocumentIssueSignedAt}
					documentIssueRecipientFullName={documentIssueRecipientFullName}
					setDocumentIssueRecipientFullName={setDocumentIssueRecipientFullName}
					documentIssueRecipientRole={documentIssueRecipientRole}
					setDocumentIssueRecipientRole={setDocumentIssueRecipientRole}
					documentIssueStaffFullName={documentIssueStaffFullName}
					setDocumentIssueStaffFullName={setDocumentIssueStaffFullName}
					documentIssueStaffRole={documentIssueStaffRole}
					setDocumentIssueStaffRole={setDocumentIssueStaffRole}
					documentIssueNote={documentIssueNote}
					setDocumentIssueNote={setDocumentIssueNote}
					activeDoctor={dashboard?.activeDoctor}
					documentIssueIdentityChecked={documentIssueIdentityChecked}
					setDocumentIssueIdentityChecked={setDocumentIssueIdentityChecked}
					documentIssueDocumentOpenedAndChecked={documentIssueDocumentOpenedAndChecked}
					setDocumentIssueDocumentOpenedAndChecked={setDocumentIssueDocumentOpenedAndChecked}
					documentIssueRecipientSigned={documentIssueRecipientSigned}
					setDocumentIssueRecipientSigned={setDocumentIssueRecipientSigned}
					documentIssueClinicSigned={documentIssueClinicSigned}
					setDocumentIssueClinicSigned={setDocumentIssueClinicSigned}
					documentIssueAttestationReady={true}
					documentIssueMissingSteps={[]}
					documentIssueMissingGuidanceId="patient-doc-issue-missing"
					documentIssueSaving={false}
					setDocumentIssueConfirmationId={setDocumentIssueConfirmationId}
					confirmDocumentIssue={confirmDocumentIssue}
				/>
			</div>
		);
	},
);

PatientDocumentsTab.displayName = "PatientDocumentsTab";
export default PatientDocumentsTab;

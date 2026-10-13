import React, { useMemo, useState } from "react";
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
import { DigitalSignatureTabletModal } from "../../documents/DigitalSignatureTabletModal";
import { CANONICAL_DOCUMENT_STATUS_LABELS } from "../../documents/documentAutonomy";
import { VirtualizedTimeline } from "../../common/VirtualizedTimeline";
import {
	FastClinicalPrintEngine,
	type FastPrintDocType,
} from "../../documents/FastClinicalPrintEngine";

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

		const [isFastPrintOpen, setIsFastPrintOpen] = useState(false);
		const [fastPrintDocType, setFastPrintDocType] = useState<FastPrintDocType>("form043u");
		const [tabletSignDoc, setTabletSignDoc] = useState<GeneratedDocument | null>(null);

		const handleTabletSignatureConfirm = async (sigData: any) => {
			if (!tabletSignDoc) return;
			setDocumentIssueConfirmationId(tabletSignDoc.id);
			setDocumentIssueSignatureMode("simple_electronic_signature");
			setDocumentIssueSignedAt(sigData.signedAt);
			setDocumentIssueRecipientFullName(sigData.recipientFullName);
			setDocumentIssueRecipientRole(sigData.recipientRole);
			setDocumentIssueIdentityChecked(true);
			setDocumentIssueDocumentOpenedAndChecked(true);
			setDocumentIssueRecipientSigned(true);
			setDocumentIssueClinicSigned(true);
			setDocumentIssueNote(`Подписано ПЭП (63-ФЗ) на планшете. Хэш SHA-256: ${sigData.sha256Fingerprint?.slice(0, 16)}...`);
			await confirmDocumentIssue(true);
			setTabletSignDoc(null);
		};

		const allDocs = useMemo(() => {
			const fromStore = ((docStore as unknown as { activeDocuments?: GeneratedDocument[] }).activeDocuments ?? []) as GeneratedDocument[];
			if (fromStore.length > 0) return fromStore;
			return (dashboard?.documents ?? []) as GeneratedDocument[];
		}, [(docStore as unknown as { activeDocuments?: GeneratedDocument[] }).activeDocuments, dashboard?.documents]);

		const patientDocs = useMemo(() => {
			return allDocs.filter(
				(doc: GeneratedDocument) => doc && doc.patientId === patient.id,
			);
		}, [allDocs, patient.id]);

		const activeIssueDoc = useMemo(() => {
			if (!documentIssueConfirmationId) return null;
			return (
				allDocs.find(
					(doc: GeneratedDocument) => doc.id === documentIssueConfirmationId,
				) ?? null
			);
		}, [allDocs, documentIssueConfirmationId]);

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
							Медицинские карты, договоры на оказание услуг, согласия (ИДС) и налоговые справки.
						</p>
					</div>

					{/* Blanks Quick Bar */}
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={() => {
								setFastPrintDocType("form043u");
								setIsFastPrintOpen(true);
							}}
							className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
							data-testid="btn-fast-vector-print-hub"
							title="Мгновенная векторная печать карты, акта и сметы (0 мс / без зависаний)"
						>
							<Printer size={13} />
							<span>Векторная печать (0 мс)</span>
						</button>

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

						<button
							type="button"
							onClick={() => {
								setFastPrintDocType("partisan_insert_043u");
								setIsFastPrintOpen(true);
							}}
							className="h-8 px-3 rounded-lg bg-[var(--teal,#0d9488)] hover:opacity-90 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
							data-testid="btn-patient-print-insert"
							title="Распечатать вкладыш в амбулаторную медицинскую карту"
						>
							<Printer size={13} />
							<span>Вкладыш в карту</span>
						</button>

						{onPrintOutpatientCard && (
							<button
								type="button"
								onClick={() => {
									setFastPrintDocType("form043u");
									setIsFastPrintOpen(true);
								}}
								className="h-8 px-3 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
								data-testid="btn-print-outpatient-card"
								title="Печать выписки из амбулаторной медицинской карты"
							>
								<Printer size={13} />
								<span>Выписка из карты</span>
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

						<VirtualizedTimeline<GeneratedDocument>
							items={patientDocs}
							estimateHeight={76}
							overscan={2}
							threshold={8}
							getItemKey={(doc) => doc.id}
							dataTestId="patient-docs-virtualized-scroller"
							renderItem={(doc) => {
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
										className="p-3 sm:p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-[var(--teal)]/40 mb-2"
										data-testid={`patient-doc-row-${doc.id}`}
									>
										{/* Document summary */}
										<div className="flex flex-col gap-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<strong className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">
													{doc.title || kindLabel}
												</strong>
												{isDraft && (
													<span
														className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 inline-flex items-center gap-1"
														data-testid={`badge-requires-signature-${doc.id}`}
														title="Черновик подготовлен, требуется личная подпись пациента (ПЭП 63-ФЗ)"
													>
														<FileSignature size={11} />
														<span>Требуется подпись</span>
													</span>
												)}
												{isIssued && (
													<span
														className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 inline-flex items-center gap-1"
														data-testid={`badge-issued-${doc.id}`}
													>
														<CheckCircle2 size={11} />
														<span>Выдан</span>
													</span>
												)}
												{(isSignedSms || doc.signatureSvg || doc.signatureAttestation?.mode === "simple_electronic_signature") && (
													<span
														className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 inline-flex items-center gap-1"
														data-testid={`badge-signed-pep-${doc.id}`}
														title="Подписано простой электронной подписью по 63-ФЗ (экран / СМС)"
													>
														<CheckCircle2 size={11} />
														<span>Подписано ПЭП</span>
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
												{isIssued && doc.issuedSnapshotSha256 && (
													<span
														className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 inline-flex items-center gap-1"
														data-testid={`badge-archive-${doc.id}`}
														title={`Документ зафиксирован в неизменяемом архиве базы данных. SHA-256: ${doc.issuedSnapshotSha256}`}
													>
														<ShieldCheck size={11} />
														<span>Архив</span>
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

											{/* If draft: Issue button & Tablet sign */}
											{isDraft && (
												<>
													<button
														type="button"
														onClick={() => setTabletSignDoc(doc)}
														className="h-8 px-2.5 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
														data-testid={`btn-patient-tablet-sign-${doc.id}`}
														title="Подписание документа пациентом на экране (Digital Signature Canvas)"
													>
														<FileSignature size={13} />
														<span>Подписать (ПЭП)</span>
													</button>

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
												</>
											)}
										</div>
									</div>
								);
							}}
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

				{/* Векторный легковесный движок печати (0 мс, 0 МБ лишней памяти) */}
				<FastClinicalPrintEngine
					isOpen={isFastPrintOpen}
					onClose={() => setIsFastPrintOpen(false)}
					initialDocType={fastPrintDocType}
					patient={{
						id: patient.id,
						fullName: patient.fullName,
						birthDate: patient.birthDate,
						phone: patient.phone,
						address: (patient as any).address || undefined,
						cardNumber: patient.id ? `043/${patient.id.slice(0, 8)}` : "043/2026-01",
						allergies: (patient as any).allergies || (patient as any).allergyHistory,
						somaticNotes: (patient as any).somaticHistory || (patient as any).chronicDiseases,
					}}
					clinic={dashboard?.clinicSettings?.profile || dashboard?.organization}
					doctor={dashboard?.activeDoctor}
				/>

				{tabletSignDoc && (
					<DigitalSignatureTabletModal
						isOpen={Boolean(tabletSignDoc)}
						onClose={() => setTabletSignDoc(null)}
						document={tabletSignDoc}
						patient={patient}
						doctorFullName={dashboard?.activeDoctor?.fullName}
						clinicName={dashboard?.clinicSettings?.profile?.clinicName || dashboard?.organization?.name || "Стоматологическая клиника"}
						onConfirmSignature={handleTabletSignatureConfirm}
						onPrintArchiveA4={() => void downloadIssuedDocumentPdf(tabletSignDoc.id)}
					/>
				)}
			</div>
		);
	},
);

PatientDocumentsTab.displayName = "PatientDocumentsTab";
export default PatientDocumentsTab;

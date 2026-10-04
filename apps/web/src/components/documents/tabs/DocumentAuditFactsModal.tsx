import React from "react";
import { ShieldCheck } from "lucide-react";
import type {
	DocumentKind,
	DocumentSourceStatus,
	DocumentStatus,
} from "@dental/shared";
import { DocumentUkepSignButton } from "../DocumentUkepSignButton";
import { CANONICAL_DOCUMENT_STATUS_LABELS, humanizeDocumentAuditText } from "../documentAutonomy";
import { isoDateLabel } from "../../../AppHelpers";

export interface DocumentAuditFactsModalProps {
	documentAuditFacts: any;
	documentLabels?: Record<DocumentKind, string>;
	documentStatusLabels?: Record<DocumentStatus, string>;
	formatShortDate?: (date: string | null | undefined) => string;
	documentSourceStatusClassNames?: Record<DocumentSourceStatus, string>;
	documentSourceStatusLabels?: Record<DocumentSourceStatus, string>;
	documentIssueSignatureModeLabels: Record<string, string>;
	documentVoidReasonLabels: Record<string, string>;
	loadDocumentAuditFacts: (id: string) => Promise<void> | void;
	setDocumentAuditFacts: (facts: any) => void;
	openIssuedDocumentHtml: (id: string) => Promise<void> | void;
	downloadIssuedDocumentHtml: (id: string) => Promise<void> | void;
	downloadIssuedDocumentPdf: (id: string) => Promise<void> | void;
}

export const DocumentAuditFactsModal: React.FC<DocumentAuditFactsModalProps> = React.memo(
	function DocumentAuditFactsModal(props) {
		const {
			documentAuditFacts,
			documentLabels,
			documentStatusLabels,
			formatShortDate,
			documentSourceStatusClassNames,
			documentSourceStatusLabels,
			documentIssueSignatureModeLabels,
			documentVoidReasonLabels,
			loadDocumentAuditFacts,
			setDocumentAuditFacts,
			openIssuedDocumentHtml,
			downloadIssuedDocumentHtml,
			downloadIssuedDocumentPdf,
		} = props;

		if (!documentAuditFacts) return null;

		return (
			<section
				className="document-audit-facts"
				aria-label="Паспорт выдачи документа"
			>
				<div className="document-audit-facts-heading">
					<div>
						<span>Паспорт выдачи</span>
						<strong>
							{documentLabels?.[documentAuditFacts.kind] ??
								documentAuditFacts.kind}
						</strong>
						<p>
							{documentStatusLabels?.[documentAuditFacts.status] ??
								CANONICAL_DOCUMENT_STATUS_LABELS[documentAuditFacts.status] ??
								documentAuditFacts.status}{" "}
							·{" "}
							{documentAuditFacts.issuedAt
								? typeof formatShortDate === "function"
									? formatShortDate(documentAuditFacts.issuedAt)
									: String(documentAuditFacts.issuedAt)
								: "не выдан"}{" "}
							·{" "}
							{documentAuditFacts.immutableSnapshotReady
								? "архив HTML проверен"
								: "нет проверенного архива"}
						</p>
					</div>
					<span
						className={
							documentSourceStatusClassNames?.[
								documentAuditFacts.sourceStatus as DocumentSourceStatus
							] ?? "pill-gray"
						}
					>
						{documentSourceStatusLabels?.[
							documentAuditFacts.sourceStatus as DocumentSourceStatus
						] ?? "Ручной ввод"}
					</span>
				</div>
				<div className="document-audit-facts-grid">
					<div>
						<span>Контрольная метка</span>
						<code>
							{documentAuditFacts.snapshotSha256
								? documentAuditFacts.snapshotSha256.slice(0, 16)
								: "нет"}
						</code>
					</div>
					<div>
						<span>Источник</span>
						<strong>{documentAuditFacts.sourceAuthority}</strong>
						<small>
							{documentAuditFacts.sourceReference} · форма сверена с источником{" "}
							{isoDateLabel(documentAuditFacts.sourceCheckedAt)}
						</small>
						{(documentAuditFacts?.sourceUrls ?? []).length ? (
							<section
								className="document-source-links"
								aria-label="Официальные источники паспорта документа"
							>
								{(documentAuditFacts?.sourceUrls ?? []).map(
									(url: string, index: number) => (
										<a
											className="doc-link"
											href={url}
											key={url}
											target="_blank"
											rel="noreferrer noopener"
											aria-label={`Открыть официальный источник паспорта документа ${index + 1} в новой вкладке`}
											title={`Открыть официальный источник паспорта документа ${index + 1} в новой вкладке`}
										>
											Источник {index + 1}
										</a>
									),
								)}
							</section>
						) : null}
					</div>
					<div>
						<span>Действия</span>
						<strong>
							{documentAuditFacts.canDownloadHtml
								? "скачивание архива доступно"
								: "только предпросмотр или блокировка"}
						</strong>
						<small>
							{documentAuditFacts.canExportPdf
								? "PDF формируется из архивного HTML"
								: "PDF доступен только после выдачи"}{" "}
							·{" "}
							{documentAuditFacts.canExportFnsXml
								? "черновой файл для ФНС доступен после выдачи"
								: "файл для ФНС недоступен для этой записи"}
						</small>
					</div>
					{documentAuditFacts.taxXmlSourceSnapshotSha256 ? (
						<div>
							<span>Файл для ФНС</span>
							<strong>
								{documentAuditFacts.taxXmlSnapshotSha256
									? "черновой файл заархивирован"
									: "факты готовы, нужна проверка формата, подпись и отправка"}
							</strong>
							<small>
								факты:{" "}
								<code>
									{documentAuditFacts.taxXmlSourceSnapshotSha256.slice(0, 16)}
								</code>
							</small>
							{documentAuditFacts.taxXmlSnapshotSha256 ? (
								<small>
									файл:{" "}
									<code>
										{documentAuditFacts.taxXmlSnapshotSha256.slice(0, 16)}
									</code>
									{documentAuditFacts.taxXmlSnapshotCreatedAt &&
									typeof formatShortDate === "function"
										? ` · ${formatShortDate(documentAuditFacts.taxXmlSnapshotCreatedAt)}`
										: ""}
								</small>
							) : null}
							{documentAuditFacts.taxXmlOfficialValidationNote ? (
								<small>
									{humanizeDocumentAuditText(
										documentAuditFacts.taxXmlOfficialValidationNote,
									)}
								</small>
							) : null}
						</div>
					) : null}
					<div>
						<span>Подписание</span>
						<strong>
							{documentAuditFacts.signatureAttestation
								? documentIssueSignatureModeLabels[
										documentAuditFacts.signatureAttestation.mode
									]
								: "нет отметки"}
						</strong>
						<small>
							{documentAuditFacts.signatureAttestation
								? `${documentAuditFacts.signatureAttestation.recipientFullName} · ${documentAuditFacts.signatureAttestation.staffFullName}`
								: "PDF и файл ФНС заблокированы до фиксации получения"}
						</small>
						{documentAuditFacts.cryptoSignaturePkcs7 || documentAuditFacts.doctorSignedAt ? (
							<div
								style={{
									marginTop: "8px",
									padding: "10px 12px",
									borderRadius: "8px",
									border: "1.5px solid #003399",
									background: "rgba(0, 51, 153, 0.05)",
									color: "#003399",
									display: "flex",
									flexDirection: "column",
									gap: "4px",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "12px" }}>
									<ShieldCheck size={16} style={{ color: "#003399", flexShrink: 0 }} />
									<span>Документ подписан УКЭП (ГОСТ Р 34.10-2012)</span>
								</div>
								<div style={{ fontSize: "11.5px", color: "var(--ink, #0f172a)" }}>
									<strong>Владелец:</strong> {documentAuditFacts.doctorCertSubject || documentAuditFacts.signatureAttestation?.staffFullName || "Врач клиники"}
								</div>
								{documentAuditFacts.doctorCertSerial ? (
									<div style={{ fontSize: "10.5px", color: "var(--muted, #64748b)", wordBreak: "break-all" }}>
										<strong>Сертификат:</strong> {documentAuditFacts.doctorCertSerial}
									</div>
								) : null}
								{documentAuditFacts.doctorSignedAt ? (
									<div style={{ fontSize: "10.5px", color: "var(--muted, #64748b)" }}>
										<strong>Дата подписания:</strong>{" "}
										{typeof formatShortDate === "function"
											? formatShortDate(documentAuditFacts.doctorSignedAt)
											: String(documentAuditFacts.doctorSignedAt)}
									</div>
								) : null}
							</div>
						) : documentAuditFacts.status === "issued" && documentAuditFacts.canExportPdf ? (
							<DocumentUkepSignButton
								documentId={documentAuditFacts.documentId}
								onSuccess={() =>
									void loadDocumentAuditFacts(documentAuditFacts.documentId)
								}
							/>
						) : null}
					</div>
					{documentAuditFacts.voidAttestation ? (
						<div>
							<span>Аннулирование</span>
							<strong>
								{
									documentVoidReasonLabels[
										documentAuditFacts.voidAttestation.reasonCode
									]
								}
							</strong>
							<small>
								{documentAuditFacts.voidAttestation.staffRole}{" "}
								{documentAuditFacts.voidAttestation.staffFullName} ·{" "}
								{typeof formatShortDate === "function"
									? formatShortDate(documentAuditFacts.voidAttestation.voidedAt)
									: String(documentAuditFacts.voidAttestation.voidedAt)}
							</small>
							<small>{documentAuditFacts.voidAttestation.reasonText}</small>
						</div>
					) : null}
					{documentAuditFacts.releaseJournalEntry ? (
						<div>
							<span>Журнал выдачи</span>
							<strong>
								{(
									documentAuditFacts?.releaseJournalEntry?.documentTypes ?? []
								).join(", ") || "медицинская документация"}
							</strong>
							<small>
								{documentAuditFacts.releaseJournalEntry.recipientFullName} ·{" "}
								{typeof formatShortDate === "function"
									? formatShortDate(
											documentAuditFacts.releaseJournalEntry.deliveredAt,
										)
									: String(documentAuditFacts.releaseJournalEntry.deliveredAt)}
							</small>
							{documentAuditFacts.releaseJournalEntry.sourceSnapshotSha256 ? (
								<small>
									контрольная метка архива:{" "}
									<code>
										{documentAuditFacts.releaseJournalEntry.sourceSnapshotSha256.slice(
											0,
											16,
										)}
									</code>
								</small>
							) : null}
						</div>
					) : null}
				</div>
				{(documentAuditFacts?.blockers ?? []).length ||
				(documentAuditFacts?.warnings ?? []).length ? (
					<div
						className="document-audit-facts-notes"
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "6px",
							marginTop: "10px",
						}}
					>
						{[
							...(documentAuditFacts?.blockers ?? []),
							...(documentAuditFacts?.warnings ?? []),
						]?.map((note) => (
							<div
								key={note}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									fontSize: "12px",
									color: "var(--warn-fg)",
									background: "var(--warn-bg)",
									padding: "6px 10px",
									borderRadius: "8px",
									border: "1px solid var(--warn-fg)",
								}}
							>
								<span
									style={{
										width: "6px",
										height: "6px",
										borderRadius: "50%",
										background: "var(--warn-fg)",
										flexShrink: 0,
									}}
								/>
								<span>{note}</span>
							</div>
						))}
					</div>
				) : null}
				<div className="document-issue-confirmation-actions">
					<button
						className="secondary-button"
						type="button"
						onClick={() => setDocumentAuditFacts(null)}
					>
						Закрыть
					</button>
					{documentAuditFacts.canPreviewHtml ? (
						<button
							className="doc-link"
							type="button"
							onClick={() =>
								void openIssuedDocumentHtml(documentAuditFacts.documentId)
							}
						>
							Открыть HTML
						</button>
					) : null}
					{documentAuditFacts.htmlDownloadUrl ? (
						<button
							className="primary-button"
							type="button"
							onClick={() =>
								void downloadIssuedDocumentHtml(documentAuditFacts.documentId)
							}
						>
							Скачать HTML
						</button>
					) : null}
					{documentAuditFacts.pdfDownloadUrl ? (
						<button
							className="primary-button"
							type="button"
							onClick={() =>
								void downloadIssuedDocumentPdf(documentAuditFacts.documentId)
							}
						>
							Скачать PDF
						</button>
					) : null}
				</div>
			</section>
		);
	},
);

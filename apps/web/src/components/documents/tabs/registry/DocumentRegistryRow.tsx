/**
 * tabs/registry/DocumentRegistryRow.tsx
 * Single document row in registry (Mandate 8b <= 120 lines, Mandate 8e, Mandate 8x)
 */

import React from "react";
import { CheckCircle2, FileSignature, FileText, Printer } from "lucide-react";
import { CANONICAL_DOCUMENT_STATUS_LABELS, documentRowLifecycleGuidance } from "../../documentAutonomy";
import type { DocumentRowProps } from "./documentRegistryTypes";
import { DocumentRowActionMenu } from "./DocumentRowActionMenu";

export const DocumentRegistryRow: React.FC<DocumentRowProps> = React.memo(
	function DocumentRegistryRow(props) {
		const {
			document,
			documentActionLabels,
			documentLabels,
			documentKindMetadata,
			documentStatusLabels,
			documentSourceStatusClassNames,
			documentSourceStatusLabels,
			documentStatusSavingId,
			formatShortDate,
			money,
			requestDocumentIssue,
			downloadIssuedDocumentPdf,
			openIssuedDocumentHtml,
		} = props;

		const documentActionLabel = documentActionLabels?.[document.kind] ?? "Документ";
		const documentKindLabel = documentLabels?.[document.kind] ?? document.kind;
		const docSourceStatus = documentKindMetadata?.[document.kind]?.sourceStatus ?? "manual_only";
		const documentTaxYearContext = document.taxYear ? `, ${document.taxYear}` : "";
		const actionContext = `${documentActionLabel}: ${documentKindLabel}${documentTaxYearContext}`;
		const isSaving = documentStatusSavingId === document.id;
		const guidanceId = `document-lifecycle-guidance-${document.id}`;
		const guidance = documentRowLifecycleGuidance(document, documentSourceStatusLabels, documentKindMetadata);

		return (
			<article className="document-row" key={document.id}>
				<CheckCircle2 aria-hidden="true" />
				<div>
					<h3>{documentActionLabel}</h3>
					<p>
						{documentKindLabel} · {documentStatusLabels?.[document.status] ?? CANONICAL_DOCUMENT_STATUS_LABELS[document.status] ?? document.status}
						<span className={documentSourceStatusClassNames?.[docSourceStatus] ?? "pill-gray"}>
							{documentSourceStatusLabels?.[docSourceStatus] ?? "Ручной ввод"}
						</span>
						{document.taxYear ? ` · ${document.taxYear}` : ""}
						{(document.doctorSignedAt || document.cryptoSignaturePkcs7) && (
							<span
								className="document-source-badge official-form border border-[var(--primary,#0d9488)] text-[var(--primary,#0d9488)] bg-[var(--primary,#0d9488)]/10 font-semibold rounded px-1.5 py-0.5 text-[11px]"
								title={`Подписано электронной подписью: ${document.doctorCertSubject || ""}${document.doctorCertSerial ? ` (${document.doctorCertSerial})` : ""}`}
							>
								Подписан ЭЦП
							</span>
						)}
						{document.issuedAt ? ` ${typeof formatShortDate === "function" ? formatShortDate(document.issuedAt) : String(document.issuedAt)}` : ""}{" "}
						· {typeof money === "function" ? money(document.totalAmountRub) : String(document.totalAmountRub)}
					</p>
					<small className="document-row-guidance" id={guidanceId}>{guidance}</small>
				</div>
				<fieldset className="document-actions flex items-center gap-1.5 m-0 p-0 border-0" aria-label={`Действия с документом: ${actionContext}`}>
					<legend className="sr-only">{`Действия с документом: ${actionContext}`}</legend>

					{document.status === "draft" ? (
						<button
							className="tactile-doc-btn tactile-doc-btn--primary doc-link min-h-[44px] sm:min-h-[36px] sm:h-8"
							type="button"
							disabled={isSaving}
							aria-busy={isSaving || undefined}
							onClick={() => requestDocumentIssue(document)}
							aria-describedby={guidanceId}
							aria-label={`Выдать на бумаге: ${actionContext}`}
							data-testid={`btn-issue-doc-${document.id}`}
						>
							<FileSignature size={14} className="shrink-0" aria-hidden="true" />
							<span>Выдать на бумаге</span>
						</button>
					) : (
						<button
							className="tactile-doc-btn tactile-doc-btn--secondary doc-link min-h-[44px] sm:min-h-[36px] sm:h-8"
							type="button"
							onClick={() => void downloadIssuedDocumentPdf(document.id)}
							aria-describedby={guidanceId}
							aria-label={`Печать / Скачать PDF: ${actionContext}`}
							data-testid={`btn-pdf-doc-${document.id}`}
						>
							<Printer size={14} className="text-[var(--primary,#0d9488)] shrink-0" aria-hidden="true" />
							<span>Печать / PDF</span>
						</button>
					)}

					<button
						className="tactile-doc-btn tactile-doc-btn--ghost doc-link min-h-[44px] sm:min-h-[36px] sm:h-8"
						type="button"
						onClick={() => void openIssuedDocumentHtml(document.id)}
						aria-describedby={guidanceId}
						aria-label={`Открыть HTML документа: ${actionContext}`}
						data-testid={`btn-open-doc-${document.id}`}
					>
						<FileText size={14} className="text-[var(--muted)] shrink-0" aria-hidden="true" />
						<span>Открыть</span>
					</button>

					<DocumentRowActionMenu {...props} actionContext={actionContext} />
				</fieldset>
			</article>
		);
	},
);

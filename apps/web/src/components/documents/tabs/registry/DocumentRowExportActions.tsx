/**
 * tabs/registry/DocumentRowExportActions.tsx
 * Specialized export and integration menu actions (Mandate 8b <= 120 lines)
 */

import React from "react";
import { FileCheck, FileCode2, FileText, Printer, X } from "lucide-react";
import type { DocumentRowProps } from "./documentRegistryTypes";

export const DocumentRowExportActions: React.FC<DocumentRowProps & { onClose: () => void }> = React.memo(
	function DocumentRowExportActions(props) {
		const {
			document,
			onClose,
			documentStatusSavingId,
			downloadIssuedDocumentHtml,
			downloadIssuedDocumentPdf,
			handleDirectPrintDocumentA4,
			openIssuedDocumentHtml,
			downloadTaxDocumentXml,
			setIsFnsNdflXmlOpen,
			setIsEgiszRemdOpen,
			requestDocumentVoid,
		} = props;

		const isSaving = documentStatusSavingId === document.id;
		const hasArchive = (document.status === "issued" || document.status === "voided") &&
			Boolean(document.issuedSnapshotSha256 && document.issuedSnapshotCreatedAt);

		return (
			<>
				{hasArchive && (
					<button className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]" type="button" onClick={() => { onClose(); void downloadIssuedDocumentHtml?.(document.id); }}>
						<FileCode2 size={14} className="text-slate-500 shrink-0" aria-hidden="true" />
						<span>Скачать HTML</span>
					</button>
				)}
				{document.status === "draft" && (
					<button className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]" type="button" onClick={() => { onClose(); void downloadIssuedDocumentPdf(document.id); }}>
						<Printer size={14} className="text-slate-500 shrink-0" aria-hidden="true" />
						<span>Печать PDF (Черновик)</span>
					</button>
				)}
				<button className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]" type="button" onClick={() => { onClose(); if (handleDirectPrintDocumentA4) void handleDirectPrintDocumentA4(document.id, document.title); else void openIssuedDocumentHtml(document.id); }}>
					<Printer size={14} className="text-[var(--primary,#0d9488)] shrink-0" aria-hidden="true" />
					<span>Прямая печать (A4)</span>
				</button>
				{document.kind === "tax_deduction_certificate" && document.status === "issued" && (
					<>
						<button className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]" type="button" onClick={() => { onClose(); void downloadTaxDocumentXml?.(document.id); }}>
							<FileText size={14} className="text-[var(--primary,#0d9488)] shrink-0" aria-hidden="true" />
							<span>Файл для налоговой</span>
						</button>
						<button className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]" type="button" onClick={() => { onClose(); setIsFnsNdflXmlOpen?.(true); }}>
							<FileText size={14} className="text-[var(--primary,#0d9488)] shrink-0" aria-hidden="true" />
							<span>Справка для вычета</span>
						</button>
					</>
				)}
				{(document.kind === "dental_medical_card_043u" || document.kind === "orthodontic_medical_card_043_1u" || document.kind === "medical_record_extract") && (
					<button className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]" type="button" onClick={() => { onClose(); setIsEgiszRemdOpen?.(true); }}>
						<FileCheck size={14} className="text-[var(--primary,#0d9488)] shrink-0" aria-hidden="true" />
						<span>Отправка в ЕГИСЗ</span>
					</button>
				)}
				{document.status !== "voided" && (
					<button className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--bad-fg,#ef4444)] hover:bg-[var(--bad-fg,#ef4444)]/10 rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]" type="button" disabled={isSaving} aria-busy={isSaving || undefined} onClick={() => { onClose(); requestDocumentVoid(document); }}>
						<X size={14} className="shrink-0" aria-hidden="true" />
						<span>Аннулировать</span>
					</button>
				)}
			</>
		);
	},
);

import React from "react";
import { Download, FileText, Printer } from "lucide-react";

export interface DocumentAuditModalFooterProps {
	documentId?: string;
	hasHtmlDownloadUrl?: boolean;
	onClose: () => void;
	onOpenHtml: (id: string) => Promise<void> | void;
	onDownloadHtml: (id: string) => Promise<void> | void;
	onDownloadPdf: (id: string) => Promise<void> | void;
}

const btnBaseClass = "inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors cursor-pointer";

export const DocumentAuditModalFooter: React.FC<DocumentAuditModalFooterProps> = React.memo(
	function DocumentAuditModalFooter({
		documentId,
		hasHtmlDownloadUrl,
		onClose,
		onOpenHtml,
		onDownloadHtml,
		onDownloadPdf,
	}) {
		return (
			<div className="flex items-center justify-between p-3 px-4 border-t border-[var(--line)] bg-[var(--paper-soft)]">
				<button type="button" onClick={onClose} className={btnBaseClass}>
					Закрыть
				</button>
				<div className="flex items-center gap-2">
					{documentId && (
						<button type="button" onClick={() => void onOpenHtml(documentId)} className={btnBaseClass}>
							<FileText className="w-3.5 h-3.5" />
							<span>Открыть бланк</span>
						</button>
					)}
					{hasHtmlDownloadUrl && documentId && (
						<button type="button" onClick={() => void onDownloadHtml(documentId)} className={btnBaseClass}>
							<Download className="w-3.5 h-3.5" />
							<span>Скачать копию</span>
						</button>
					)}
					{documentId && (
						<button
							type="button"
							onClick={() => void onDownloadPdf(documentId)}
							className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[var(--teal)] text-white shadow-2xs hover:bg-[var(--teal-hover,var(--teal))] transition-colors cursor-pointer border-none"
						>
							<Printer className="w-3.5 h-3.5" />
							<span>Печать / PDF</span>
						</button>
					)}
				</div>
			</div>
		);
	},
);

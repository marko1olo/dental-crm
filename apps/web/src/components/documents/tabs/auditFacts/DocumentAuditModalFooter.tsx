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

const btnBaseClass = "inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3.5 text-sm font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0";

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
							<FileText className="w-4 h-4 shrink-0" />
							<span>Открыть бланк</span>
						</button>
					)}
					{hasHtmlDownloadUrl && documentId && (
						<button type="button" onClick={() => void onDownloadHtml(documentId)} className={btnBaseClass}>
							<Download className="w-4 h-4 shrink-0" />
							<span>Скачать копию</span>
						</button>
					)}
					{documentId && (
						<button
							type="button"
							onClick={() => void onDownloadPdf(documentId)}
							className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-4 text-sm font-medium rounded-lg bg-[var(--primary)] text-white shadow-xs hover:bg-[var(--primary-hover)] transition-colors cursor-pointer shrink-0 border-none"
						>
							<Printer className="w-4 h-4 shrink-0" />
							<span>Печать / PDF</span>
						</button>
					)}
				</div>
			</div>
		);
	},
);

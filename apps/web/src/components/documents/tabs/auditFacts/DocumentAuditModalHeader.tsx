import React from "react";
import { ShieldCheck, X } from "lucide-react";
import { CANONICAL_DOCUMENT_STATUS_LABELS } from "../../documentAutonomy";

export interface DocumentAuditModalHeaderProps {
	facts: any;
	documentLabels?: Record<string, string> | undefined;
	documentStatusLabels?: Record<string, string> | undefined;
	onClose: () => void;
}

export const DocumentAuditModalHeader: React.FC<DocumentAuditModalHeaderProps> = React.memo(
	function DocumentAuditModalHeader({ facts, documentLabels, documentStatusLabels, onClose }) {
		return (
			<div className="flex items-center justify-between p-3.5 px-4 border-b border-[var(--line)] bg-[var(--paper-soft)]">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-teal-500/15 text-[var(--teal)] flex items-center justify-center shrink-0">
						<ShieldCheck className="w-5 h-5" />
					</div>
					<div>
						<h3 className="m-0 text-base font-bold text-[var(--ink)]" id="document-audit-facts-title">
							Аудит юридической чистоты (63-ФЗ)
						</h3>
						<p className="m-0 text-xs text-[var(--muted)]">
							{documentLabels?.[facts.kind] ?? facts.kind} ·{" "}
							{documentStatusLabels?.[facts.status] ?? CANONICAL_DOCUMENT_STATUS_LABELS[facts.status] ?? facts.status}
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Закрыть журнал проверки документа"
					title="Закрыть"
					data-testid="btn-close-audit-modal"
					className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border border-transparent bg-transparent text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
				>
					<X className="w-4.5 h-4.5" />
				</button>
			</div>
		);
	},
);

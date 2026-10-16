import React from "react";
import { Hash } from "lucide-react";
import { CANONICAL_DOCUMENT_STATUS_LABELS } from "../../documentAutonomy";

export interface DocumentAuditRequisitesSectionProps {
	facts: any;
	documentLabels?: Record<string, string> | undefined;
	documentStatusLabels?: Record<string, string> | undefined;
	formatShortDate?: ((date: string | null | undefined) => string) | undefined;
}

export const DocumentAuditRequisitesSection: React.FC<DocumentAuditRequisitesSectionProps> = React.memo(
	function DocumentAuditRequisitesSection({ facts, documentLabels, documentStatusLabels, formatShortDate }) {
		const isIssued = facts.status === "issued";
		const isVoided = facts.status === "voided";

		return (
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div>
					<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">Вид документа</span>
					<strong className="block text-sm text-[var(--ink)] mt-0.5">{documentLabels?.[facts.kind] ?? facts.kind}</strong>
				</div>
				<div>
					<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">Статус и дата выдачи</span>
					<div className="flex items-center gap-2 mt-0.5">
						<span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11.5px] font-bold border ${
							isIssued
								? "bg-teal-500/15 text-[var(--teal)] border-teal-500/30"
								: isVoided
									? "bg-rose-500/15 text-rose-600 border-rose-500/30"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
						}`}>
							{documentStatusLabels?.[facts.status] ?? CANONICAL_DOCUMENT_STATUS_LABELS[facts.status] ?? facts.status}
						</span>
						<span className="text-xs text-[var(--muted)]">
							{facts.issuedAt ? (typeof formatShortDate === "function" ? formatShortDate(facts.issuedAt) : String(facts.issuedAt)) : "не выдан"}
						</span>
					</div>
				</div>
				<div>
					<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">Контрольный отпечаток</span>
					<div className="flex items-center gap-1.5 mt-0.5">
						<Hash className="w-3.5 h-3.5 text-[var(--muted)]" />
						<code className="text-[11.5px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]">
							{facts.snapshotSha256 ? facts.snapshotSha256.slice(0, 16) : "архив формируется"}
						</code>
					</div>
				</div>
			</div>
		);
	},
);

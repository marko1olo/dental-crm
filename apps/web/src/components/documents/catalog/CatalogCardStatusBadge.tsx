import { CheckCircle2, Clock } from "lucide-react";
import React from "react";
import { formatShortDate } from "../../../AppHelpers";

export function CatalogCardStatusBadge({
	isSigned,
	isDraft,
	isIssued,
	docDateStr,
}: {
	isSigned: boolean;
	isDraft: boolean;
	isIssued: boolean;
	docDateStr?: string | undefined;
}): React.JSX.Element {
	if (isSigned) {
		return (
			<span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
				<CheckCircle2 size={12} aria-hidden="true" />
				<span>Подписан {docDateStr ? formatShortDate(docDateStr) : ""}</span>
			</span>
		);
	}
	if (isDraft) {
		return (
			<span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
				<Clock size={12} aria-hidden="true" />
				<span>Черновик {docDateStr ? formatShortDate(docDateStr) : ""}</span>
			</span>
		);
	}
	if (isIssued) {
		return (
			<span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
				<CheckCircle2 size={12} aria-hidden="true" />
				<span>Оформлен {docDateStr ? formatShortDate(docDateStr) : ""}</span>
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f1f5f9)] px-2 py-0.5 rounded-md border border-[var(--line,#cbd5e1)]">
			Не оформлен
		</span>
	);
}

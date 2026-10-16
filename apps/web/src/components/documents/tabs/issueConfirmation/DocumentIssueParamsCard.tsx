import React from "react";
import type { GeneratedDocument } from "@dental/shared";

export interface DocumentIssueParamsCardProps {
	doc: GeneratedDocument;
	documentLabels?: Record<string, string> | undefined;
	money?: ((val: number | null | undefined) => string) | undefined;
}

export const DocumentIssueParamsCard: React.FC<DocumentIssueParamsCardProps> = React.memo(
	function DocumentIssueParamsCard({ doc, documentLabels, money }) {
		return (
			<div className="flex items-center justify-between flex-wrap gap-2.5 p-3 px-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div>
					<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">Параметры выдачи</span>
					<strong className="block text-sm text-[var(--ink)] mt-0.5">{documentLabels?.[doc.kind] ?? doc.kind}</strong>
				</div>
				<div className="text-xs text-[var(--muted)] text-right">
					{doc.taxYear && <div>Год: <strong>{doc.taxYear}</strong></div>}
					{doc.taxPayerInn && <div>ИНН плательщика: <code>{doc.taxPayerInn}</code></div>}
					{doc.totalAmountRub !== undefined && (
						<div className="text-[var(--teal)] font-bold text-[13px]">
							Сумма: {typeof money === "function" ? money(doc.totalAmountRub) : String(doc.totalAmountRub)}
						</div>
					)}
				</div>
			</div>
		);
	},
);

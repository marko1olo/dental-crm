import type { DocumentKind, GeneratedDocument } from "@dental/shared";
import { Eye, Printer } from "lucide-react";
import type React from "react";
import { CatalogCardStatusBadge } from "./CatalogCardStatusBadge";
import type { DocumentCatalogItem } from "./types";

export interface CatalogCardProps {
	item: DocumentCatalogItem;
	patientDoc?: GeneratedDocument | undefined;
	onOpenFocusEditor?: ((kind: DocumentKind) => void) | undefined;
}

export function CatalogCard({
	item,
	patientDoc,
	onOpenFocusEditor,
}: CatalogCardProps) {
	const ItemIcon = item.icon;
	// biome-ignore lint/suspicious/noExplicitAny: dynamic signedAt check
	const isSigned = Boolean(
		patientDoc?.doctorSignedAt ||
			(patientDoc as any)?.signedAt ||
			(patientDoc?.status as string) === "issued" ||
			(patientDoc as any)?.signatureAttestation,
	);
	const isDraft = patientDoc?.status === "draft";
	const isIssued = patientDoc?.status === "issued";
	// biome-ignore lint/suspicious/noExplicitAny: dynamic createdAt fallback
	const docDateStr = patientDoc?.issuedAt || (patientDoc as any)?.createdAt;

	return (
		<div
			className="dente-tile-card p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-card,var(--paper,#ffffff))] hover:border-[var(--teal,#0d9488)] transition-all flex flex-col gap-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_12px_rgba(13,148,136,0.10)]"
			data-testid={`document-item-${item.id}`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-start gap-2.5 min-w-0 flex-1">
					<div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-[var(--paper-soft,#f1f5f9)] text-[var(--teal,#0d9488)] border border-[var(--line,#cbd5e1)]">
						<ItemIcon className="w-4 h-4" />
					</div>
					<div className="min-w-0 flex-1">
						<h3 className="text-xs font-bold tracking-tight text-[var(--ink,#0f172a)] leading-snug">
							{item.titleRu}
						</h3>
						<div className="text-[10.5px] font-semibold text-[var(--teal,#0d9488)] dark:text-teal-400 mt-0.5 tracking-wide">
							{item.regulationRu}
						</div>
					</div>
				</div>
				<span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#334155)] border-[var(--line,#cbd5e1)]">
					{item.badgeRu}
				</span>
			</div>

			<p className="text-[11.5px] text-[var(--muted,#475569)] leading-snug">
				{item.descriptionRu}
			</p>

			<div className="mt-auto pt-2 border-t border-[var(--line,#e2e8f0)] flex flex-col gap-2">
				<div className="flex items-center justify-between text-[11px]">
					<CatalogCardStatusBadge
						isSigned={isSigned}
						isDraft={isDraft}
						isIssued={isIssued}
						docDateStr={docDateStr}
					/>
					<span className="text-[10.5px] font-medium text-[var(--muted,#64748b)]">
						{item.printSupported ? "Печать А4" : "Электронно"}
					</span>
				</div>

				<div className="flex items-center justify-end gap-1.5">
					<button
						type="button"
						onClick={() => {
							if (item.kind && onOpenFocusEditor) onOpenFocusEditor(item.kind);
							else if (item.onQuickAction) item.onQuickAction();
						}}
						className="secondary-button h-8 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] transition flex items-center gap-1.5 cursor-pointer flex-1 justify-center"
						title={
							patientDoc ? "Открыть документ пациента" : "Оформить документ"
						}
						data-testid={`btn-open-${item.id}`}
					>
						<Eye className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span>{patientDoc ? "Открыть" : "Оформить"}</span>
					</button>

					{item.printSupported && (
						<button
							type="button"
							onClick={item.onQuickAction}
							className="secondary-button h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-[var(--teal,#0d9488)] text-xs font-semibold text-[var(--ink,#0f172a)] transition flex items-center gap-1.5 cursor-pointer"
							title="Печать бланка"
							data-testid={`btn-print-${item.id}`}
						>
							<Printer className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							<span>Печать</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

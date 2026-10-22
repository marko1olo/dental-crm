import React from "react";
import type { DocumentKind, GeneratedDocument } from "@dental/shared";
import { ChevronRight } from "lucide-react";
import { MobileDocumentItemIcon } from "./MobileDocumentItemIcon";
import { MobileDocumentItemStatus } from "./MobileDocumentItemStatus";

interface MobileDocumentItemCardProps {
	doc: GeneratedDocument;
	documentLabels?: Record<DocumentKind, string> | undefined;
	money?: ((val: number | null | undefined) => string) | undefined;
	formatShortDate?: ((date: string | null | undefined) => string) | undefined;
	onOpenPreview: (doc: GeneratedDocument) => void;
}

export function MobileDocumentItemCard({
	doc,
	documentLabels,
	money,
	formatShortDate,
	onOpenPreview,
}: MobileDocumentItemCardProps) {
	const docLabel = documentLabels?.[doc.kind] ?? doc.title ?? "Документ";

	const formatRub = (val: number | null | undefined) => {
		if (typeof money === "function") return money(val);
		if (val == null) return "0 ₽";
		return `${val.toLocaleString("ru-RU")} ₽`;
	};

	const formatDate = (val: string | null | undefined) => {
		if (typeof formatShortDate === "function") return formatShortDate(val);
		if (!val) return "—";
		try {
			return new Date(val).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
		} catch {
			return String(val);
		}
	};

	return (
		<div
			onClick={() => onOpenPreview(doc)}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onOpenPreview(doc);
				}
			}}
			className="flex items-center justify-between px-4 py-3.5 min-h-[64px] active:bg-[var(--paper-soft)] cursor-pointer transition-colors"
			data-testid={`mobile-doc-item-${doc.id}`}
			aria-label={`Открыть документ: ${docLabel}`}
		>
			<div className="flex items-center gap-3 min-w-0 pr-2">
				<MobileDocumentItemIcon kind={doc.kind} />
				<div className="min-w-0">
					<div className="text-[14px] font-semibold text-[var(--ink)] line-clamp-2 leading-snug break-normal tracking-tight">
						{docLabel}
					</div>
					<div className="text-[12px] text-[var(--muted)] flex items-center gap-1.5 flex-wrap mt-0.5">
						<span>{formatDate(doc.issuedAt || (doc as any).createdAt)}</span>
						{doc.totalAmountRub != null && doc.totalAmountRub > 0 && (
							<>
								<span>·</span>
								<span className="font-bold text-[var(--ink)] font-mono">{formatRub(doc.totalAmountRub)}</span>
							</>
						)}
						{doc.taxYear && (
							<>
								<span>·</span>
								<span>ФНС {doc.taxYear}</span>
							</>
						)}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<MobileDocumentItemStatus doc={doc} />
				<ChevronRight size={16} className="text-[var(--muted)] shrink-0" aria-hidden="true" />
			</div>
		</div>
	);
}

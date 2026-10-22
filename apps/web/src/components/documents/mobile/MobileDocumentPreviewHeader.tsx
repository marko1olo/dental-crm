import React from "react";
import type { GeneratedDocument } from "@dental/shared";
import { X } from "lucide-react";
import { MobileDocumentItemIcon } from "./MobileDocumentItemIcon";

interface MobileDocumentPreviewHeaderProps {
	document: GeneratedDocument;
	docLabel: string;
	onClose: () => void;
	formatDate: (val: string | null | undefined) => string;
}

export function MobileDocumentPreviewHeader({
	document,
	docLabel,
	onClose,
	formatDate,
}: MobileDocumentPreviewHeaderProps) {
	return (
		<>
			<div
				className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
				onClick={onClose}
				aria-label="Закрыть свайпом"
			>
				<div className="w-10 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
			</div>

			<div className="flex items-center justify-between px-5 py-2 border-b border-[var(--line-subtle)]">
				<div className="flex items-center gap-3 min-w-0 pr-2">
					<div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 bg-[var(--paper-soft)] border border-[var(--line-subtle)]">
						<MobileDocumentItemIcon kind={document.kind} />
					</div>
					<div className="min-w-0">
						<h3
							id="mobile-doc-preview-title"
							className="text-[16px] font-bold text-[var(--ink)] truncate tracking-tight"
						>
							{docLabel}
						</h3>
						<p className="text-[12px] text-[var(--muted)] truncate">
							{document.issuedAt ? `Выдан: ${formatDate(document.issuedAt)}` : "Черновик документа"}
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-full flex items-center justify-center bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-transform"
					aria-label="Закрыть окно просмотра"
					data-testid="mobile-doc-preview-close"
				>
					<X size={18} aria-hidden="true" />
				</button>
			</div>
		</>
	);
}

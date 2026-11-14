import React from "react";
import type { GeneratedDocument } from "@dental/shared";
import { FileSignature, MessageCircle, Printer, Share2 } from "lucide-react";

interface MobileDocumentPreviewThumbBarProps {
	document: GeneratedDocument;
	isDraft: boolean;
	onVerifyAndIssue?: ((doc: GeneratedDocument) => void) | undefined;
	onPrint: (doc: GeneratedDocument) => void;
	onSendWhatsApp: () => void;
	onShare: () => void;
}

export function MobileDocumentPreviewThumbBar({
	document,
	isDraft,
	onVerifyAndIssue,
	onPrint,
	onSendWhatsApp,
	onShare,
}: MobileDocumentPreviewThumbBarProps) {
	const hasIssuePrimary = Boolean(isDraft && onVerifyAndIssue);

	return (
		<div className="p-4 border-t border-[var(--line-subtle)] bg-[var(--paper)] pb-[max(16px,env(safe-area-inset-bottom))] space-y-2">
			{hasIssuePrimary && onVerifyAndIssue && (
				<button
					type="button"
					onClick={() => onVerifyAndIssue(document)}
					className="w-full min-h-[48px] py-2.5 px-4 rounded-[14px] bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
					data-testid="mobile-btn-verify-issue"
				>
					<FileSignature size={18} aria-hidden="true" />
					<span>Проверить и выдать документ</span>
				</button>
			)}

			<div className="grid grid-cols-3 gap-2">
				<button
					type="button"
					onClick={() => onPrint(document)}
					className="mobile-print-secondary-btn min-h-[48px] py-2 px-2.5 rounded-[14px] border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-bold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform cursor-pointer"
					data-testid="mobile-btn-print-doc"
					aria-label="Печать документа"
				>
					<Printer size={16} className="shrink-0" aria-hidden="true" />
					<span>Печать</span>
				</button>

				<button
					type="button"
					onClick={onSendWhatsApp}
					className="mobile-whatsapp-secondary-btn min-h-[48px] py-2 px-2.5 rounded-[14px] border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-bold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform cursor-pointer"
					data-testid="mobile-btn-whatsapp-doc"
					aria-label="Отправить документ в WhatsApp"
				>
					<MessageCircle size={16} aria-hidden="true" className="shrink-0" />
					<span>WhatsApp</span>
				</button>

				<button
					type="button"
					onClick={onShare}
					className={`mobile-share-pdf-cta-btn min-h-[48px] py-2 px-2.5 rounded-[14px] ${
						hasIssuePrimary
							? "border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							: "bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white shadow-sm"
					} font-bold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform cursor-pointer`}
					data-testid="mobile-btn-share-doc"
				>
					<Share2 size={16} aria-hidden="true" className="shrink-0" />
					<span>Поделиться PDF</span>
				</button>
			</div>
		</div>
	);
}

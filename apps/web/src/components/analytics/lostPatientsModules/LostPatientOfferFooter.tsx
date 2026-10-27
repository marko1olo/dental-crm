import React from "react";
import { Check, Copy, MessageSquare, Phone } from "lucide-react";
import type { PersonalizedOfferResult } from "../analyticsWidgetData.js";
import type { LostPatientRow } from "./lostPatientTypes";

interface OfferFooterProps {
	readonly patient: LostPatientRow;
	readonly activeOffer: PersonalizedOfferResult;
	readonly copiedText: boolean;
	readonly onCopy: () => void;
	readonly onClose: () => void;
}

export function LostPatientOfferFooter({
	patient,
	activeOffer,
	copiedText,
	onCopy,
	onClose,
}: OfferFooterProps) {
	return (
		<div className="flex items-center justify-between gap-2 flex-wrap pt-3 border-t border-[var(--line)]">
			<div className="flex items-center gap-2">
				<a
					href={`https://wa.me/${patient.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(activeOffer.messageText)}`}
					target="_blank"
					rel="noopener noreferrer"
					className="dente-btn dente-btn-primary h-8 px-3 text-[13px] font-semibold inline-flex items-center gap-1.5 shadow-xs"
				>
					<MessageSquare className="w-3.5 h-3.5" />
					<span>WhatsApp</span>
				</a>

				<a
					href={`tel:${patient.phone}`}
					className="dente-btn dente-btn-secondary h-8 px-3 text-[13px] font-semibold inline-flex items-center gap-1.5 shadow-xs"
				>
					<Phone className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span>Позвонить</span>
				</a>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onCopy}
					className="dente-btn dente-btn-secondary h-8 px-3 text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
				>
					{copiedText ? (
						<Check className="w-3.5 h-3.5 text-[var(--teal)]" />
					) : (
						<Copy className="w-3.5 h-3.5" />
					)}
					<span>{copiedText ? "Скопировано!" : "Скопировать текст"}</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="dente-btn dente-btn-ghost h-8 px-3.5 text-[13px] font-medium inline-flex items-center justify-center cursor-pointer"
				>
					Закрыть
				</button>
			</div>
		</div>
	);
}

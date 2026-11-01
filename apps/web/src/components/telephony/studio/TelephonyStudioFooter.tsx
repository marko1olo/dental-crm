/**
 * apps/web/src/components/telephony/studio/TelephonyStudioFooter.tsx
 *
 * DENTE Dental CRM — Telephony Studio Action Footer.
 * Mandates: 8am (Single Primary CTA #0d9488), 8e (Doctor Autonomy, 0 Disabled Locks).
 */

import React from "react";
import { Phone, PhoneCall, Calendar, Check } from "lucide-react";
import { formatPhoneRu } from "../telephonyCatalogData";

export interface TelephonyStudioFooterProps {
	hasDialed: boolean;
	dialedNumber: string;
	isNoteSaved: boolean;
	onBookAction: () => void;
	onPrimaryAction: () => void;
}

export const TelephonyStudioFooter: React.FC<TelephonyStudioFooterProps> = ({
	hasDialed,
	dialedNumber,
	isNoteSaved,
	onBookAction,
	onPrimaryAction,
}) => {
	const primaryCtaLabel = hasDialed
		? `Позвонить на ${formatPhoneRu(dialedNumber)}`
		: isNoteSaved
			? "✓ Заметка сохранена"
			: "✓ Сохранить заметку звонка";

	return (
		<div className="p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--paper-strong)] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
			<div className="flex items-center gap-2 w-full sm:w-auto">
				<button
					type="button"
					onClick={onBookAction}
					data-testid="telephony-secondary-book-btn"
					className="dnt-telephony-secondary-btn flex-1 sm:flex-initial cursor-pointer"
				>
					<Calendar className="w-3.5 h-3.5" />
					<span>Записать на приём</span>
				</button>
			</div>

			{/* Exactly 1 Primary CTA Button (Mandates 8am & 8e: 0 disabled attribute) */}
			<button
				type="button"
				onClick={onPrimaryAction}
				data-testid="telephony-primary-cta-btn"
				className="dnt-telephony-primary-cta w-full sm:w-auto cursor-pointer"
			>
				{hasDialed ? (
					<PhoneCall className="w-4 h-4" />
				) : isNoteSaved ? (
					<Check className="w-4 h-4" />
				) : (
					<Phone className="w-4 h-4" />
				)}
				<span>{primaryCtaLabel}</span>
			</button>
		</div>
	);
};

export default TelephonyStudioFooter;

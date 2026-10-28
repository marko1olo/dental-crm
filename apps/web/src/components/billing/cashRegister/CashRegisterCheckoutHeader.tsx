/**
 * CashRegisterCheckoutHeader.tsx — Mobile Drag Handle & Modal Header.
 * Mandate 8b: <= 60 lines. Mandate 8am: Consistent Headers.
 */

import React from "react";
import { X } from "lucide-react";

export interface CashRegisterCheckoutHeaderProps {
	readonly modalTitleId: string;
	readonly patientName: string;
	readonly doctorFullName?: string | undefined;
	readonly onClose: () => void;
}

export const CashRegisterCheckoutHeader: React.FC<CashRegisterCheckoutHeaderProps> = ({
	modalTitleId,
	patientName,
	doctorFullName,
	onClose,
}) => {
	return (
		<>
			{/* Apple HIG Tactile Drag Handle for Mobile (390x844) */}
			<div className="md:hidden flex justify-center pt-2.5 pb-1" aria-hidden="true">
				<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
			</div>

			{/* Header */}
			<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line,#e2e8f0)]">
				<div>
					<h2
						id={modalTitleId}
						className="text-base md:text-lg font-semibold text-[var(--ink)] tracking-tight"
					>
						Касса · Оплата приёма
					</h2>
					<p className="text-xs text-[var(--muted,#64748b)]">
						{patientName} {doctorFullName ? `• Врач: ${doctorFullName}` : ""}
					</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="w-10 h-10 min-h-[44px] flex items-center justify-center rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors"
					aria-label="Закрыть окно оплаты"
				>
					<X className="w-5 h-5" />
				</button>
			</div>
		</>
	);
};

export default CashRegisterCheckoutHeader;

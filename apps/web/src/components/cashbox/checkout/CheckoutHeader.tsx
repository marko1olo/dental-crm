/**
 * apps/web/src/components/cashbox/checkout/CheckoutHeader.tsx
 *
 * Canonical Apple HIG Modal Header with Drag Handle, Touch Target >= 44x44px.
 * Governed by Mandate 8am, Mandate 8ze (Apple HIG) & Mandate 8b.
 */

import React from "react";
import { ShieldCheck, X } from "lucide-react";

export interface CheckoutHeaderProps {
	readonly titleId: string;
	readonly title?: string;
	readonly patientName?: string;
	readonly doctorFullName?: string;
	readonly onClose: () => void;
}

export const CheckoutHeader: React.FC<CheckoutHeaderProps> = ({
	titleId,
	title = "Касса · Оплата приёма",
	patientName = "Пациент",
	doctorFullName,
	onClose,
}) => {
	return (
		<div className="pt-2 px-4 border-b border-[var(--line)] flex flex-col bg-[var(--paper)] shrink-0">
			{/* Apple HIG Drag Handle for Mobile Viewport */}
			<div
				className="w-9 h-1.5 rounded-full bg-[var(--line)] mx-auto mb-2 md:hidden"
				aria-hidden="true"
			/>
			<div className="flex items-center justify-between pb-3">
				<div>
					<h2
						id={titleId}
						className="text-base sm:text-lg font-bold tracking-tight text-[var(--ink)] flex items-center gap-2"
					>
						<ShieldCheck className="w-5 h-5 text-[var(--teal,#0d9488)] shrink-0" />
						<span>{title}</span>
					</h2>
					<p className="text-xs text-[var(--muted)]">
						{patientName} {doctorFullName ? `· Врач: ${doctorFullName}` : ""}
					</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Закрыть"
					className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] transition-colors flex items-center justify-center cursor-pointer"
				>
					<X className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
};

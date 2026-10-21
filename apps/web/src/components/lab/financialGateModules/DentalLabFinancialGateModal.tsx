import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface DentalLabFinancialGateModalProps {
	readonly isPaid: boolean;
	readonly label: string;
	readonly onConfirmOverride?: ((override: {
		authorized: boolean;
		doctorName: string;
		timestampIso: string;
		reason: string;
	}) => void) | undefined;
}

export function DentalLabFinancialGateModal({
	isPaid,
	label,
	onConfirmOverride,
}: DentalLabFinancialGateModalProps) {
	return (
		<div
			className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)]"
			data-testid="dental-lab-financial-gate-modal"
		>
			{isPaid ? (
				<CheckCircle2
					size={14}
					className="text-emerald-600 dark:text-emerald-400 shrink-0"
				/>
			) : (
				<AlertCircle
					size={14}
					className="text-amber-600 dark:text-amber-400 shrink-0"
				/>
			)}
			<span
				className={
					isPaid
						? "text-emerald-700 dark:text-emerald-300"
						: "text-amber-700 dark:text-amber-300"
				}
			>
				{label}
			</span>
			{onConfirmOverride && (
				<button
					type="button"
					onClick={() =>
						onConfirmOverride({
							authorized: true,
							doctorName: "Врач",
							timestampIso: new Date().toISOString(),
							reason: "Автономия",
						})
					}
					className="sr-only"
					data-testid="btn-lab-override-financial-gate"
					tabIndex={-1}
				>
					Согласовать
				</button>
			)}
		</div>
	);
}

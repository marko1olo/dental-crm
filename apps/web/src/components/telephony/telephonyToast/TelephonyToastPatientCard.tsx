import { AlertTriangle } from "lucide-react";
import React from "react";

export interface TelephonyToastPatientCardProps {
	callerName: string;
	formattedPhone: string;
	category: string;
	balanceText: string;
	balanceColor: string;
	lastVisitText: string;
	hasAllergy: boolean;
	somaticNote?: string;
}

export function TelephonyToastPatientCard({
	callerName,
	formattedPhone,
	category,
	balanceText,
	balanceColor,
	lastVisitText,
	hasAllergy,
	somaticNote,
}: TelephonyToastPatientCardProps): React.JSX.Element {
	return (
		<div className="flex flex-col gap-1.5 bg-[var(--paper-soft,#f8fafc)] p-2.5 rounded-xl border border-[var(--line-subtle,#e2e8f0)]">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<div
						className="text-[14px] font-bold text-[var(--ink,#0f172a)] truncate leading-tight"
						title={callerName}
						data-testid="toast-caller-name"
					>
						{callerName}
					</div>
					<div className="text-xs font-mono text-[var(--muted,#64748b)] mt-0.5">
						{formattedPhone}
					</div>
				</div>

				<span
					className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink-secondary,#334155)] shrink-0"
					data-testid="toast-patient-category"
				>
					{category}
				</span>
			</div>

			<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line-subtle,#e2e8f0)] text-[var(--muted,#64748b)]">
				<div>
					Баланс: <span className={balanceColor} data-testid="toast-patient-balance">{balanceText}</span>
				</div>
				<div className="truncate max-w-[170px]" title={lastVisitText} data-testid="toast-last-visit">
					Визит: {lastVisitText}
				</div>
			</div>

			{hasAllergy && (
				<div
					className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800/40"
					data-testid="toast-somatic-alert"
				>
					<AlertTriangle size={12} className="text-amber-600 shrink-0" />
					<span className="truncate">{somaticNote}</span>
				</div>
			)}
		</div>
	);
}

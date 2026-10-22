import { ArrowRight, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import React from "react";
import {
	getIndicatorMeta,
	type IndicatorClassType,
} from "./autoclaveIndicatorMeta.js";

export type { IndicatorClassType };
export { getIndicatorMeta };

export interface AutoclaveIndicatorControlProps {
	readonly indicatorType?: IndicatorClassType | string;
	readonly passed?: boolean;
	readonly onChange?: (type: IndicatorClassType, passed: boolean) => void;
	readonly readonly?: boolean;
	readonly showDetails?: boolean;
}

export function AutoclaveIndicatorControl({
	indicatorType = "class5_integrating",
	passed = true,
	onChange,
	readonly = false,
	showDetails = false,
}: AutoclaveIndicatorControlProps) {
	const meta = getIndicatorMeta(indicatorType);

	if (readonly) {
		return (
			<div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
				{passed ? (
					<CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
				) : (
					<XCircle size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
				)}
				<span>{meta.classBadge}</span>
				{passed && <span className="text-[11px] opacity-80">(Норма)</span>}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2 p-2.5 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)]">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<ShieldCheck size={16} className="text-[var(--brand-primary,#2563eb)]" />
					<span className="text-xs font-bold text-ink">{meta.labelRu}</span>
				</div>
				<button
					type="button"
					onClick={() => onChange?.(indicatorType as IndicatorClassType, !passed)}
					className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
						passed
							? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
							: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
					}`}
				>
					{passed ? "Сработал (Норма)" : "Не сработал (Брак)"}
				</button>
			</div>

			{showDetails && (
				<div className="flex flex-col gap-1 text-[11px] text-[var(--muted,#64748b)] pt-1 border-t border-[var(--line-subtle,#e2e8f0)] dark:border-[#334155]/60">
					<div className="flex items-center justify-between">
						<span>Стандарт:</span>
						<span className="font-medium text-ink">{meta.standardRu}</span>
					</div>
					<div className="flex items-center justify-between">
						<span>Цвет индикатора:</span>
						<div className="flex items-center gap-1">
							<span
								className="w-3 h-3 rounded-full border border-gray-300"
								style={{ backgroundColor: meta.colorBefore }}
								title="До цикла"
							/>
							<ArrowRight size={12} className="text-[var(--muted)]" />
							<span
								className="w-3 h-3 rounded-full border border-gray-300"
								style={{ backgroundColor: meta.colorAfter }}
								title="После цикла (норма)"
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

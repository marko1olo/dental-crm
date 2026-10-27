import { AlertCircle, CheckCircle2 } from "lucide-react";
import type React from "react";
import type { SnilsValidationResult } from "./doctorSnilsTypes";

export const DoctorSnilsResultBadge: React.FC<{
	readonly result: SnilsValidationResult;
}> = ({ result }) => {
	const isOk = result.ok;
	const icon = isOk ? (
		<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
	) : (
		<AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
	);

	const bgClass = isOk
		? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
		: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30";

	return (
		<div className={`flex items-start gap-2 text-xs p-2.5 rounded-lg border ${bgClass}`}>
			{icon}
			<div className="min-w-0 flex-1">
				<p className="font-medium m-0 leading-snug">{result.message}</p>
				{result.formatted ? (
					<p className="text-[11px] opacity-90 mt-1 m-0">
						Форматированный СНИЛС:{" "}
						<code className="font-mono bg-[var(--paper)] px-1.5 py-0.5 rounded border border-[var(--line)] text-[var(--ink)]">
							{result.formatted}
						</code>
					</p>
				) : null}
			</div>
		</div>
	);
};

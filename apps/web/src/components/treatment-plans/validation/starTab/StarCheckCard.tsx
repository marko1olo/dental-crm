import type React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { StarProtocolRuleCheck } from "../starProtocolValidationEngine";

export interface StarCheckCardProps {
	readonly check: StarProtocolRuleCheck;
}

export const StarCheckCard: React.FC<StarCheckCardProps> = ({ check }) => {
	const relatedCodes =
		check.serviceCatalogCodesRelated || check.order804nCodesRelated || [];

	return (
		<div
			className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
				check.status === "pass"
					? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
					: check.status === "warning"
						? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/30 text-amber-900 dark:text-amber-200"
						: "bg-rose-50/50 dark:bg-rose-950/20 border-rose-500/30 text-rose-900 dark:text-rose-200"
			}`}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					{check.status === "pass" && (
						<CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
					)}
					{check.status === "warning" && (
						<AlertTriangle size={16} className="text-amber-600 shrink-0" />
					)}
					{check.status === "error" && (
						<AlertCircle size={16} className="text-rose-600 shrink-0" />
					)}
					<strong className="text-sm font-bold">
						{check.protocolTitleRu}
					</strong>
					{check.toothNumber && (
						<span className="px-2 py-0.5 rounded-md bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] font-mono font-bold text-[11px]">
							Зуб №{check.toothNumber}
						</span>
					)}
				</div>

				<span
					className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
						check.status === "pass"
							? "bg-emerald-600 text-white"
							: check.status === "warning"
								? "bg-amber-600 text-white"
								: "bg-rose-600 text-white"
					}`}
				>
					{check.status === "pass"
						? "Соответствует"
						: check.status === "warning"
							? "Рекомендация"
							: "Требует внимания"}
				</span>
			</div>

			<p className="text-[var(--ink)] font-medium">{check.messageRu}</p>

			{check.recommendationRu && (
				<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--ink)]">
					<strong className="text-[var(--teal,var(--brand-primary))]">
						Клиническая рекомендация:
					</strong>{" "}
					{check.recommendationRu}
				</div>
			)}

			<div className="flex justify-between items-center text-[10px] text-[var(--muted)] pt-1">
				<span>Норматив: {check.normativeRefRu}</span>
				{relatedCodes.length > 0 && (
					<span className="font-mono">
						Коды услуг: {relatedCodes.join(", ")}
					</span>
				)}
			</div>
		</div>
	);
};

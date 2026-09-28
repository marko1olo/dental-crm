import React, { useMemo } from "react";
import type { TreatmentPlanItem } from "@dental/shared";
import { Shield, Stethoscope } from "lucide-react";
import { money } from "../../utils/financeUtils";

export interface TreatmentPlanCardItemProps {
	readonly item: TreatmentPlanItem;
	readonly onOpenPlan?: ((planId: string) => void) | undefined;
}

export const TreatmentPlanCardItem: React.FC<TreatmentPlanCardItemProps> = React.memo(
	function TreatmentPlanCardItem({ item, onOpenPlan }) {
		const statusColorClass = useMemo(() => {
			switch (item.status) {
				case "completed":
					return "bg-[var(--ok-bg,rgba(16,185,129,0.12))] text-[var(--ok-fg,#047857)] border border-[var(--ok-border,rgba(16,185,129,0.3))]";
				case "in_progress":
					return "bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30";
				case "cancelled":
					return "bg-[var(--bad-bg,rgba(239,68,68,0.12))] text-[var(--bad-fg,#b91c1c)] border border-[var(--bad-border,rgba(239,68,68,0.3))]";
				default:
					return "bg-[var(--warn-bg,rgba(245,158,11,0.12))] text-[var(--warn-fg,#b45309)] border border-[var(--warn-border,rgba(245,158,11,0.3))]";
			}
		}, [item.status]);

		const statusLabel = useMemo(() => {
			switch (item.status) {
				case "completed":
					return "Выполнено";
				case "in_progress":
					return "В работе";
				case "cancelled":
					return "Отменено";
				default:
					return "Запланировано";
			}
		}, [item.status]);

		return (
			<div
				className="treatment-plan-card-item p-3 rounded-lg flex flex-col gap-1.5 bg-[var(--paper-soft)] border border-[var(--line)] transition-colors shadow-xs"
				style={{
					contentVisibility: "auto",
					containIntrinsicSize: "auto 96px",
				}}
			>
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-1.5 min-w-0">
						<Stethoscope className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<span className="font-bold text-xs text-[var(--ink)] truncate">
							{item.snapshotServiceName || "Услуга плана лечения"}
						</span>
					</div>
					<span
						className={`text-[11px] px-2 py-0.5 rounded-md font-bold shrink-0 ${statusColorClass}`}
					>
						{statusLabel}
					</span>
				</div>
				{item.toothCode ? (
					<div className="text-xs text-[var(--muted)]">
						Зуб / область:{" "}
						<strong className="text-[var(--ink)]">{item.toothCode}</strong>
					</div>
				) : null}
				<div className="flex items-center justify-between mt-0.5 pt-1.5 border-t border-[var(--line)] text-xs">
					<div className="flex items-center gap-2">
						<span className="text-[var(--ink)] font-bold font-mono text-xs">
							{item.unitPriceRub !== undefined && item.unitPriceRub !== null
								? money(item.unitPriceRub)
								: "—"}
						</span>
						<span className="inline-flex items-center gap-0.5 text-[10px] text-teal-700 dark:text-teal-300 font-medium">
							<Shield className="w-2.5 h-2.5" /> Согласовано
						</span>
					</div>
					{onOpenPlan ? (
						<button
							type="button"
							onClick={() => onOpenPlan(item.id)}
							className="min-h-[32px] px-1.5 text-[var(--teal)] hover:underline font-bold bg-transparent border-0 cursor-pointer text-xs inline-flex items-center"
						>
							Открыть план &rarr;
						</button>
					) : null}
				</div>
			</div>
		);
	},
);

TreatmentPlanCardItem.displayName = "TreatmentPlanCardItem";

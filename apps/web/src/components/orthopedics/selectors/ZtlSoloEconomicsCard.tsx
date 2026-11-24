import React from "react";
import { DollarSign, Calendar } from "lucide-react";
import { formatKopecksToRub, rublesToKopecks } from "@dental/shared";

export interface ZtlSoloEconomicsCardProps {
	readonly grossPriceRub?: number | undefined;
	readonly grossPriceKopecks?: bigint | undefined;
	readonly ztlCostRub?: number | undefined;
	readonly ztlCostKopecks?: bigint | undefined;
	readonly materialsCostRub?: number | undefined;
	readonly materialsCostKopecks?: bigint | undefined;
	readonly netMarginRub?: number | undefined;
	readonly netMarginKopecks?: bigint | undefined;
	readonly marginPercent: number;
	readonly dueDate?: string | undefined;
}

export function ZtlSoloEconomicsCard({
	grossPriceRub,
	grossPriceKopecks,
	ztlCostRub,
	ztlCostKopecks,
	materialsCostRub,
	materialsCostKopecks,
	netMarginRub,
	netMarginKopecks,
	marginPercent,
	dueDate,
}: ZtlSoloEconomicsCardProps) {
	const effectiveGrossKopecks = grossPriceKopecks !== undefined
		? grossPriceKopecks
		: BigInt(rublesToKopecks(grossPriceRub ?? 0));
	const effectiveZtlKopecks = ztlCostKopecks !== undefined
		? ztlCostKopecks
		: BigInt(rublesToKopecks(ztlCostRub ?? 0));
	const effectiveMaterialsKopecks = materialsCostKopecks !== undefined
		? materialsCostKopecks
		: BigInt(rublesToKopecks(materialsCostRub ?? 0));
	const effectiveNetMarginKopecks = netMarginKopecks !== undefined
		? netMarginKopecks
		: BigInt(rublesToKopecks(netMarginRub ?? 0));

	return (
		<div className="mb-2.5 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] min-w-0 overflow-hidden" data-testid="solo-economics-section">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<DollarSign size={15} className="text-[var(--primary)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)] truncate">
						Экономика наряда и маржинальность:
					</span>
				</div>
				{dueDate && (
					<div className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-muted)] shrink-0">
						<Calendar size={13} className="text-[var(--primary)] shrink-0" />
						<span>Готовность ЗТЛ: <strong className="font-mono text-[var(--ink)]">{dueDate}</strong></span>
					</div>
				)}
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between min-h-[46px] min-w-0 overflow-hidden">
					<span className="text-[10px] text-[var(--ink-muted)] truncate min-w-0">Пациент (выручка)</span>
					<span className="text-xs font-bold text-[var(--ink)] font-mono truncate min-w-0">
						{formatKopecksToRub(effectiveGrossKopecks)}
					</span>
				</div>
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between min-h-[46px] min-w-0 overflow-hidden">
					<span className="text-[10px] text-[var(--ink-muted)] truncate min-w-0">Лаборатория (ЗТЛ)</span>
					<span className="text-xs font-bold text-[var(--ink)] font-mono truncate min-w-0">
						- {formatKopecksToRub(effectiveZtlKopecks)}
					</span>
				</div>
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between min-h-[46px] min-w-0 overflow-hidden">
					<span className="text-[10px] text-[var(--ink-muted)] truncate min-w-0">Расходные материалы</span>
					<span className="text-xs font-bold text-[var(--ink-muted)] font-mono truncate min-w-0">
						- {formatKopecksToRub(effectiveMaterialsKopecks)}
					</span>
				</div>
				<div className="p-2 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex flex-col justify-between min-h-[46px] min-w-0 overflow-hidden">
					<div className="flex items-center justify-between min-w-0">
						<span className="text-[10px] font-bold text-[var(--primary)] truncate min-w-0">Чистая маржа</span>
						<span className="text-[10px] font-bold font-mono px-1 py-0.2 rounded bg-[var(--primary)]/20 text-[var(--primary)] shrink-0">
							{marginPercent}%
						</span>
					</div>
					<span className="text-xs font-bold text-[var(--primary)] font-mono truncate min-w-0">
						+{formatKopecksToRub(effectiveNetMarginKopecks)}
					</span>
				</div>
			</div>
		</div>
	);
}

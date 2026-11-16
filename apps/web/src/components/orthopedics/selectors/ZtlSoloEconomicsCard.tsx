import React from "react";
import { DollarSign, Calendar } from "lucide-react";

export interface ZtlSoloEconomicsCardProps {
	readonly grossPriceRub: number;
	readonly ztlCostRub: number;
	readonly materialsCostRub: number;
	readonly netMarginRub: number;
	readonly marginPercent: number;
	readonly dueDate?: string | undefined;
}

export function ZtlSoloEconomicsCard({
	grossPriceRub,
	ztlCostRub,
	materialsCostRub,
	netMarginRub,
	marginPercent,
	dueDate,
}: ZtlSoloEconomicsCardProps) {
	return (
		<div className="mb-2.5 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] min-w-0 overflow-hidden" data-testid="solo-economics-section">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<DollarSign size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)] truncate">
						Экономика наряда и маржинальность:
					</span>
				</div>
				{dueDate && (
					<div className="flex items-center gap-1 text-[11px] font-medium text-[var(--muted)] shrink-0">
						<Calendar size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span>Готовность ЗТЛ: <strong className="font-mono text-[var(--ink)]">{dueDate}</strong></span>
					</div>
				)}
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between min-h-[46px] min-w-0 overflow-hidden">
					<span className="text-[10px] text-[var(--muted)] truncate min-w-0">Пациент (выручка)</span>
					<span className="text-xs font-bold text-[var(--ink)] font-mono truncate min-w-0">
						{grossPriceRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between min-h-[46px] min-w-0 overflow-hidden">
					<span className="text-[10px] text-[var(--muted)] truncate min-w-0">Лаборатория (ЗТЛ)</span>
					<span className="text-xs font-bold text-[var(--warning,#f59e0b)] font-mono truncate min-w-0">
						- {ztlCostRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between min-h-[46px] min-w-0 overflow-hidden">
					<span className="text-[10px] text-[var(--muted)] truncate min-w-0">Расходные материалы</span>
					<span className="text-xs font-bold text-[var(--danger,#ef4444)] font-mono truncate min-w-0">
						- {materialsCostRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
				<div className="p-2 rounded-lg bg-[var(--success-soft,rgba(16,185,129,0.1))] border border-[var(--success,#10b981)]/30 flex flex-col justify-between min-h-[46px] min-w-0 overflow-hidden">
					<div className="flex items-center justify-between min-w-0">
						<span className="text-[10px] font-bold text-[var(--success,#10b981)] truncate min-w-0">Чистая маржа</span>
						<span className="text-[10px] font-bold font-mono px-1 py-0.2 rounded bg-[var(--success,#10b981)]/20 text-[var(--success,#10b981)] shrink-0">
							{marginPercent}%
						</span>
					</div>
					<span className="text-xs font-bold text-[var(--success,#10b981)] font-mono truncate min-w-0">
						+{netMarginRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
			</div>
		</div>
	);
}

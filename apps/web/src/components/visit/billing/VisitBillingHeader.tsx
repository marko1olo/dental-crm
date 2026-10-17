/**
 * apps/web/src/components/visit/billing/VisitBillingHeader.tsx
 * Chairside billing widget header with quick actions.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import { Tag, Plus, Boxes, Printer } from "lucide-react";

export interface VisitBillingHeaderProps {
	servicesCount: number;
	doctorName: string;
	readOnly?: boolean | undefined;
	onAddService: () => void;
	onOpenBom: () => void;
	onPrintEstimate: () => void;
}

export const VisitBillingHeader: React.FC<VisitBillingHeaderProps> = ({
	servicesCount,
	doctorName,
	readOnly = false,
	onAddService,
	onOpenBom,
	onPrintEstimate,
}) => {
	return (
		<div className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--line,#e2e8f0)] pb-3">
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
					<Tag size={18} />
				</div>
				<div>
					<h3 className="text-sm font-bold m-0 flex items-center gap-2">
						<span>Услуги и биллинг у кресла</span>
						<span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-mono font-bold">
							{servicesCount} поз.
						</span>
					</h3>
					<p className="text-xs text-[var(--muted,#64748b)] m-0">
						Врач: <strong className="text-[var(--ink,#0f172a)]">{doctorName}</strong>
					</p>
				</div>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				{!readOnly && (
					<button
						type="button"
						onClick={onAddService}
						title="Добавить позицию медицинской услуги в список визита"
						className="h-8 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100 text-xs font-bold cursor-pointer flex items-center gap-1 transition-all"
						data-testid="btn-add-service-chairside"
					>
						<Plus size={14} />
						<span>Добавить услугу</span>
					</button>
				)}
				{servicesCount > 0 && (
					<button
						type="button"
						onClick={onOpenBom}
						title="Проверить списание расходных материалов по услугам визита (BOM по FEFO)"
						className="h-8 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] text-xs font-semibold text-[var(--ink,#0f172a)] cursor-pointer flex items-center gap-1 transition-all"
						data-testid="btn-open-visit-bom-deduction"
					>
						<Boxes size={14} className="text-indigo-600" />
						<span>Расходники ({servicesCount})</span>
					</button>
				)}
				<button
					type="button"
					onClick={onPrintEstimate}
					title="Печать сметы оказанных услуг для пациента"
					className="h-8 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] text-xs font-semibold text-[var(--ink,#0f172a)] cursor-pointer flex items-center gap-1 transition-all"
					data-testid="btn-print-visit-estimate"
				>
					<Printer size={14} className="text-blue-600" />
					<span>Смета</span>
				</button>
			</div>
		</div>
	);
};

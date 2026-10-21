import type React from "react";
import { Check, ShieldAlert, ShieldCheck } from "lucide-react";
import { useConsumablesDeductionLogic } from "../deductionModalModules/useConsumablesDeductionLogic.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import { ShiftBatchProcedureItemRow } from "./ShiftBatchProcedureItemRow.js";

export interface ShiftBatchProcedureTabProps {
	readonly procedureTitle?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly service804nCode?: string | undefined;
	readonly toothNumber?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly currentStockMap?: Record<string, number> | undefined;
	readonly warehouseItems?: readonly InventoryItem[] | undefined;
	readonly onConfirmDeduction?: (() => void) | undefined;
}

export const ShiftBatchProcedureTab: React.FC<ShiftBatchProcedureTabProps> = ({
	procedureTitle = "Препарирование и пломба светового отверждения (Filtek / Estelite)",
	serviceCode,
	service804nCode = "A16.07.002.011",
	toothNumber = 16,
	doctorName = "Кузнецов А.В.",
	patientName = "Смирнова Е.А.",
	currentStockMap = {},
	warehouseItems,
	onConfirmDeduction,
}) => {
	const effectiveServiceCode = serviceCode || service804nCode;

	const {
		deductionItems,
		totals,
		handleUpdateQty,
		handleApplyStandardTherapistKit,
	} = useConsumablesDeductionLogic({
		isOpen: true,
		onClose: () => {},
		procedureTitle,
		serviceCode: effectiveServiceCode,
		service804nCode,
		doctorName,
		patientName,
		toothNumber,
		currentStockMap,
		warehouseItems: warehouseItems as any,
		onConfirmDeduction: onConfirmDeduction as any,
	});

	return (
		<div className="space-y-3">
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap text-xs">
				<div className="space-y-0.5">
					<div className="font-bold text-[var(--ink)]">
						{procedureTitle} {toothNumber ? `(Зуб ${toothNumber})` : ""}
					</div>
					<div className="text-[11px] text-[var(--muted)] font-mono">
						Код услуги: {effectiveServiceCode} • Врач: {doctorName} • Пациент: {patientName}
					</div>
				</div>
				<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
					<ShieldCheck size={14} className="text-teal-600" />
					<span>Клинический протокол лечения</span>
				</div>
			</div>

			<div className="flex items-center justify-between flex-wrap gap-2 text-xs">
				<span className="font-semibold text-[var(--muted)]">
					Расходные материалы ({deductionItems.length} поз.):
				</span>
				<button
					type="button"
					onClick={handleApplyStandardTherapistKit}
					className="h-8 min-h-[32px] px-3 rounded-lg text-xs font-bold border border-teal-600/40 bg-teal-500/10 text-teal-800 dark:text-teal-300 hover:bg-teal-500/20 flex items-center gap-1.5 cursor-pointer transition-colors active:scale-98"
					data-testid="btn-quick-standard-kit"
					title="Быстрое списание стандартного набора терапевта (СИЗ, слюноотсос, салфетка, валики)"
				>
					<Check size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>✓ Списать стандартный набор терапевта</span>
				</button>
			</div>

			{totals.hasOverdraft && (
				<div
					className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2"
					data-testid="procedure-overdraft-alert"
				>
					<div className="flex items-center gap-2 min-w-0">
						<ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<span className="font-semibold truncate">
							Мягкий овердрафт активен: дефицит {totals.overdraftCount} поз. Приём не блокируется.
						</span>
					</div>
					<span className="shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200">
						Мягкий минус
					</span>
				</div>
			)}

			<div className="rounded-xl border border-[var(--line)] divide-y divide-[var(--line)] bg-[var(--paper)]">
				{deductionItems.map((item) => (
					<ShiftBatchProcedureItemRow
						key={item.id}
						item={item}
						onUpdateQty={handleUpdateQty}
					/>
				))}
			</div>
		</div>
	);
};

export default ShiftBatchProcedureTab;

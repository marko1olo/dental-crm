import { AlertTriangle, Clock, ShieldAlert, ShoppingCart } from "lucide-react";
import type React from "react";
import type { ClinicalWriteoffTotals } from "./clinicalWriteoffEngine.js";

export interface ClinicalWriteoffAlertsProps {
	readonly totals: ClinicalWriteoffTotals;
	readonly validationErrors: readonly string[];
	readonly isValid: boolean;
	readonly onGenerateSupplierOrder: () => void;
}

export const ClinicalWriteoffAlerts: React.FC<ClinicalWriteoffAlertsProps> = ({
	totals,
	validationErrors,
	isValid,
	onGenerateSupplierOrder,
}) => {
	return (
		<>
			{totals.hasExpiredLots && (
				<div className="cw-warning-banner cw-warning-red">
					<ShieldAlert size={18} className="shrink-0 text-bad-fg" />
					<div>
						<strong>Внимание! Обнаружены партии с истекшим сроком годности:</strong>
						<div className="mt-0.5">
							Списание просроченных медикаментов пациенту запрещено санитарными нормами. Выберите свежую партию со склада.
						</div>
					</div>
				</div>
			)}

			{totals.hasExpiringLots && !totals.hasExpiredLots && (
				<div className="cw-warning-banner cw-warning-amber">
					<Clock size={18} className="shrink-0 text-amber-600" />
					<div>
						<strong>Внимание! Партии, истекающие в течение 30 дней ({totals.expiringBatchesCount} поз.):</strong>
						<div className="mt-0.5">
							Материалы подлежат первоочередному списанию по сроку годности (FEFO).
						</div>
					</div>
				</div>
			)}

			{totals.hasDeficit && !totals.hasExpiredLots && (
				<div className="cw-warning-banner cw-warning-amber">
					<AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
					<div className="flex-1">
						<strong>Внимание: остаток отрицательный, требуется закупка / оприходование ({totals.deficitItemsCount} поз.):</strong>
						<div className="mt-0.5">
							Позиции будут списаны с отрицательным остатком (мягкий овердрафт) без блокировки врача (Мандаты 8e, 8n).
						</div>
						<button
							type="button"
							onClick={onGenerateSupplierOrder}
							className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all cursor-pointer shadow-xs active:scale-95"
							data-testid="btn-generate-supplier-order"
							title="Сформировать черновик заказа поставщику в буфер обмена"
						>
							<ShoppingCart size={14} />
							<span>Сформировать черновик заказа поставщику ({totals.deficitItemsCount} поз.)</span>
						</button>
					</div>
				</div>
			)}

			{!isValid && (
				<div className="cw-warning-banner cw-warning-red">
					<AlertTriangle size={18} className="shrink-0 text-bad-fg" />
					<div>
						<strong>Ошибки валидации акта списания:</strong>
						<ul className="list-disc pl-4 mt-0.5">
							{validationErrors.map((err, i) => (
								<li key={i}>{err}</li>
							))}
						</ul>
					</div>
				</div>
			)}
		</>
	);
};

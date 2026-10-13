/**
 * ProcedureDeductionFooter.tsx — Подвал с метриками себестоимости и действиями списания.
 */

import { AlertTriangle, ShieldCheck } from "lucide-react";
import React from "react";
import type { DeductionSummary } from "../inventoryMath.js";

export interface ProcedureDeductionFooterProps {
	readonly summary: DeductionSummary;
	readonly preventNegativeStock: boolean;
	readonly onTogglePreventNegativeStock: (val: boolean) => void;
	readonly isDeducting: boolean;
	readonly onClose: () => void;
	readonly onConfirm: () => void;
}

export const ProcedureDeductionFooter: React.FC<ProcedureDeductionFooterProps> = ({
	summary,
	preventNegativeStock,
	onTogglePreventNegativeStock,
	isDeducting,
	onClose,
	onConfirm,
}) => {
	return (
		<footer className="inventory-deduction-footer">
			<div className="inventory-footer-summary">
				<div className="inventory-footer-metric">
					<span className="inventory-footer-metric-label">Всего позиций</span>
					<span className="inventory-footer-metric-val">{summary.totalLines} наименований</span>
				</div>

				<div className="inventory-footer-metric">
					<span className="inventory-footer-metric-label">Себестоимость материалов</span>
					<span className="inventory-footer-metric-val highlight-cost">
						{summary.totalCostFormatted}
					</span>
				</div>

				{summary.hasDeficit && (
					<div
						className="inventory-deficit-badge"
						data-testid="inventory-deficit-badge"
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
							padding: "6px 12px",
							borderRadius: 8,
							background: "rgba(217, 119, 6, 0.12)",
							color: "var(--warn-fg, #b45309)",
							fontWeight: 700,
							fontSize: 13,
						}}
					>
						<AlertTriangle size={16} />
						Дефицит: {summary.criticalCount} поз.
					</div>
				)}
			</div>

			<div className="inventory-footer-actions">
				<label
					className="inventory-guard-toggle"
					title="Автоматически формирует заявку поставщику при выявлении дефицита материалов"
					style={{ minHeight: "34px", display: "inline-flex", alignItems: "center" }}
				>
					<input
						type="checkbox"
						checked={preventNegativeStock}
						onChange={(e) => onTogglePreventNegativeStock(e.target.checked)}
					/>
					<span>Автозаказ поставщику при дефиците</span>
				</label>

				<button
					type="button"
					className="inventory-cancel-btn"
					onClick={onClose}
					disabled={isDeducting}
					style={{ minHeight: "34px" }}
					data-testid="inventory-cancel-btn"
				>
					Отмена
				</button>
				<button
					type="button"
					className={`inventory-confirm-deduct-btn ${summary.hasDeficit ? "has-deficit-warning" : ""}`}
					data-testid="confirm-deduction-btn"
					data-testid-alt="btn-confirm-dispense"
					onClick={onConfirm}
					disabled={isDeducting}
					style={{ minHeight: "36px" }}
					title={
						summary.hasDeficit
							? `Остаток 0, списание с дефицитом: задержка оприходования накладной не блокирует операцию, спасение зуба или закрытие приёма врача: дефицит ${summary.criticalCount} поз.`
							: "Провести списание выбранных материалов"
					}
				>
					{summary.hasDeficit ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
					{isDeducting
						? "Списание..."
						: summary.hasDeficit
							? "Списать (мягкий овердрафт)"
							: "Списать со склада"}
				</button>
			</div>
		</footer>
	);
};

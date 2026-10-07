/**
 * PriceValidatorFooter.tsx — Подвал действий валидатора цен плана лечения (DENTE CRM).
 *
 * Содержит:
 * 1. Итоговую сводку (количество позиций, итоговая сумма к оплате).
 * 2. Кнопки быстрых действий (Печать протокола сверки, Оформление наряда ЗТЛ, Сформировать акт).
 */

import type React from "react";
import { FileCheck, FileText, Printer } from "lucide-react";
import type { PlanPriceValidationReport } from "./planPriceValidationEngine";

export interface PriceValidatorFooterProps {
	readonly report: PlanPriceValidationReport;
	readonly onPrintProtocol: () => void;
	readonly onGenerateWorkOrder: () => void;
	readonly onGenerateCompletedAct: () => void;
}

export const PriceValidatorFooter: React.FC<PriceValidatorFooterProps> = ({
	report,
	onPrintProtocol,
	onGenerateWorkOrder,
	onGenerateCompletedAct,
}) => {
	return (
		<footer className="price-validator-footer">
			<div className="price-validator-footer-summary">
				<span>
					Позиций к оформлению: <strong>{report.totalItemsCount}</strong>
				</span>
				<span>
					Итоговая стоимость:{" "}
					<strong style={{ fontSize: "1.1rem", color: "var(--pv-brand)" }}>
						{report.resolvedNetRub.toLocaleString("ru-RU")} ₽
					</strong>
				</span>
			</div>

			<div className="price-validator-footer-actions">
				<button
					type="button"
					className="price-validator-btn-secondary"
					onClick={onPrintProtocol}
					title="Распечатать протокол сверки прайс-листа и СтАР"
				>
					<Printer size={16} /> Протокол сверки
				</button>
				<button
					type="button"
					className="price-validator-btn-brand"
					onClick={onGenerateWorkOrder}
					title="Сформировать зуботехнический наряд-заказ (ЗТЛ)"
					data-testid="btn-generate-lab-work-order"
				>
					<FileText size={16} /> Оформить наряд-заказ
				</button>
				<button
					type="button"
					className="price-validator-btn-brand"
					onClick={onGenerateCompletedAct}
					title="Сформировать акт выполненных работ"
					style={{ background: "var(--pv-ok)", borderColor: "var(--pv-ok)" }}
					data-testid="btn-generate-completed-act"
				>
					<FileCheck size={16} /> Сформировать акт
				</button>
			</div>
		</footer>
	);
};

export default PriceValidatorFooter;

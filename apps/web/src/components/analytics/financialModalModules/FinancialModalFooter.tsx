import React from "react";

export interface FinancialModalFooterProps {
	readonly onClose: () => void;
}

export const FinancialModalFooter: React.FC<FinancialModalFooterProps> = ({ onClose }) => (
	<footer className="fin-analytics-footer">
		<div style={{ fontSize: 11, color: "var(--muted)" }}>
			Управленческий учет ДЕНТЕ CRM • Касса и чеки • Расчет в целочисленных копейках
		</div>
		<button type="button" onClick={onClose} className="primary-button fin-analytics-action-btn primary" data-testid="close-financial-footer-btn">
			Закрыть аналитику
		</button>
	</footer>
);

import React from "react";
import { formatCurrencyRu } from "../omnichannelEngine.js";
import type { SbpPaymentInvoice } from "../omnichannelTypes.js";

export interface SbpInvoiceSummaryCardProps {
	readonly invoice: SbpPaymentInvoice;
}

export const SbpInvoiceSummaryCard: React.FC<SbpInvoiceSummaryCardProps> = ({ invoice }) => {
	const hasFamilyDeposit = Boolean(invoice.familyDepositOffsetRub && invoice.familyDepositOffsetRub > 0);
	const hasTotalDiscrepancy = Boolean(invoice.totalInvoiceRub && invoice.totalInvoiceRub > invoice.sumRub);

	return (
		<div className="sbp-invoice-summary-card">
			<div className="sbp-summary-row highlight">
				<span className="sbp-sum-label">Сумма к оплате по СБП:</span>
				<span className="sbp-sum-value">{formatCurrencyRu(invoice.sumRub)}</span>
			</div>

			{hasFamilyDeposit && (
				<div className="sbp-summary-row sub">
					<span>Покрыто семейным депозитом:</span>
					<span>{formatCurrencyRu(invoice.familyDepositOffsetRub!)}</span>
				</div>
			)}

			{hasTotalDiscrepancy && (
				<div className="sbp-summary-row sub">
					<span>Общая сумма по акту лечения:</span>
					<span>{formatCurrencyRu(invoice.totalInvoiceRub!)}</span>
				</div>
			)}

			<div className="sbp-summary-divider" />

			<div className="sbp-meta-grid">
				<div className="sbp-meta-item">
					<span className="sbp-meta-title">Пациент:</span>
					<span className="sbp-meta-val">{invoice.patientName}</span>
				</div>
				<div className="sbp-meta-item">
					<span className="sbp-meta-title">Телефон:</span>
					<span className="sbp-meta-val">{invoice.phone}</span>
				</div>
				<div className="sbp-meta-item full">
					<span className="sbp-meta-title">Назначение платежа:</span>
					<span className="sbp-meta-val">{invoice.purpose}</span>
				</div>
				<div className="sbp-meta-item">
					<span className="sbp-meta-title">Комиссия для пациента:</span>
					<span className="sbp-meta-val text-ok">0% (Бесплатно)</span>
				</div>
				<div className="sbp-meta-item">
					<span className="sbp-meta-title">Стандарт:</span>
					<span className="sbp-meta-val">ГОСТ Р 56042 / EMVCo</span>
				</div>
			</div>
		</div>
	);
};

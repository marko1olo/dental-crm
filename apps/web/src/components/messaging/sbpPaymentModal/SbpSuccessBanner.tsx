import React from "react";
import { CheckCircle2 } from "lucide-react";
import { formatCurrencyRu } from "../omnichannelEngine.js";

export interface SbpSuccessBannerProps {
	readonly sumRub: number;
	readonly fiscalReceiptId: string | null;
	readonly isManualReconciliation: boolean;
}

export const SbpSuccessBanner: React.FC<SbpSuccessBannerProps> = ({
	sumRub,
	fiscalReceiptId,
	isManualReconciliation,
}) => {
	return (
		<div className="sbp-success-banner" data-testid="sbp-success-banner">
			<div className="sbp-success-icon-wrap">
				<CheckCircle2 size={64} className="sbp-success-check" />
			</div>
			<h3 className="sbp-success-title">Оплачено успешно!</h3>
			<p className="sbp-success-sum">{formatCurrencyRu(sumRub)}</p>
			<p className="sbp-success-receipt">
				{fiscalReceiptId ? (
					<>
						Кассовый чек: <strong>#{fiscalReceiptId}</strong>
					</>
				) : (
					<strong>Ручная сверка (без чека ККТ)</strong>
				)}
			</p>
			<span className="sbp-badge-online">
				{isManualReconciliation
					? "Подтверждено кассиром (ручная сверка по выписке / СМС)"
					: "Фискальный накопитель подтвердил транзакцию"}
			</span>
		</div>
	);
};

/**
 * apps/web/src/components/billing/receiptPreview/ReceiptTapeTotals.tsx
 *
 * Totals and tender breakdown for 80mm thermal tape.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import type { ReceiptPaymentDetails } from "./receiptPreviewTypes.js";

interface ReceiptTapeTotalsProps {
	readonly totalDueRub: number;
	readonly payments?: ReceiptPaymentDetails | undefined;
	readonly isWarranty100?: boolean | undefined;
}

export const ReceiptTapeTotals: React.FC<ReceiptTapeTotalsProps> = ({
	totalDueRub,
	payments = {},
	isWarranty100 = false,
}) => {
	const cardRub = payments.cardRub || 0;
	const sbpRub = payments.sbpRub || 0;
	const cashRub = payments.cashRub || 0;
	const changeRub = payments.changeRub || 0;
	const depositRub = payments.depositRub || 0;

	return (
		<div className="py-2 space-y-1.5 font-mono text-xs text-slate-900 border-b border-dashed border-slate-400">
			<div className="flex justify-between items-baseline text-sm font-black text-slate-950">
				<span>ИТОГ К ОПЛАТЕ:</span>
				<span className="text-base" data-testid="receipt-total-due">
					{totalDueRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>

			{isWarranty100 && (
				<div className="text-[10px] font-bold text-emerald-700 text-right">
					Скидка клиники 100% (Гарантия)
				</div>
			)}

			<div className="pt-1 space-y-0.5 text-[11px] text-slate-800">
				{cardRub > 0 && (
					<div className="flex justify-between">
						<span>БЕЗНАЛИЧНЫМИ (КАРТА):</span>
						<span>{cardRub.toLocaleString("ru-RU")} ₽</span>
					</div>
				)}
				{sbpRub > 0 && (
					<div className="flex justify-between">
						<span>Безналичными (СБП QR):</span>
						<span>{sbpRub.toLocaleString("ru-RU")} ₽</span>
					</div>
				)}
				{cashRub > 0 && (
					<>
						<div className="flex justify-between">
							<span>Наличными:</span>
							<span>{cashRub.toLocaleString("ru-RU")} ₽</span>
						</div>
						{changeRub > 0 && (
							<div className="flex justify-between text-slate-600">
								<span>Сдача:</span>
								<span>{changeRub.toLocaleString("ru-RU")} ₽</span>
							</div>
						)}
					</>
				)}
				{depositRub > 0 && (
					<div className="flex justify-between">
						<span>Зачет аванса (депозит):</span>
						<span>{depositRub.toLocaleString("ru-RU")} ₽</span>
					</div>
				)}
			</div>
		</div>
	);
};

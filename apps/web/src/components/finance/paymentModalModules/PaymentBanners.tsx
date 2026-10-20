/**
 * apps/web/src/components/finance/paymentModalModules/PaymentBanners.tsx
 *
 * Layer 4: Banners for 100% Warranty Remake, Patient Debt Autonomy, and Deposit Debit.
 * Governed by Mandates 8b (<=120 lines), 8c, 8e, 8n.
 */

import React from "react";
import { AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import type { PaymentBannersProps } from "./types.js";
import { PaymentDepositBanner } from "./PaymentDepositBanner.js";

export const PaymentBanners: React.FC<PaymentBannersProps> = ({
	totalDueRub,
	rawTotalDueRub,
	patientDebtRub = 0,
	patientDepositRub = 0,
	discountsHook,
	execHook,
	tendersHook,
	onClose,
	onSuccess,
}) => {
	return (
		<>
			{/* 100% Warranty Remake Zero Due Banner */}
			{totalDueRub === 0 && (
				<div
					className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-3 flex-wrap animate-in fade-in"
					data-testid="banner-payment-zero-warranty"
				>
					<div className="flex items-center gap-2">
						<CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
							Гарантийный прием / 100% скидка (к оплате 0 ₽)
						</span>
					</div>
					<button
						type="button"
						onClick={() => {
							showToast("Гарантийный прием оформлен (скидка 100%, 0 ₽). Визит закрыт!", "success");
							if (onSuccess) {
								onSuccess({
									method: "warranty_discount_100",
									amountKopecks: 0,
									discountRub: discountsHook.discountCalc.discountRub,
									discountPercent: discountsHook.discountCalc.discountPercent,
									rawTotalRub: rawTotalDueRub,
									discountReason: discountsHook.discountReason || "Гарантийная переделка / скидка 100%",
								});
							}
							onClose();
						}}
						className="payment-footer-submit-btn btn-warranty"
						data-testid="btn-payment-close-warranty-zero"
					>
						<Sparkles size={14} />
						<span>Закрыть визит (0 ₽)</span>
					</button>
				</div>
			)}

			{/* Debt Autonomy Banner */}
			{patientDebtRub > 0 && (
				<div
					data-testid="debt-autonomy-banner"
					className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2"
				>
					<AlertTriangle size={14} className="shrink-0 text-amber-600" />
					<span>
						Задолженность пациента: {patientDebtRub.toLocaleString("ru-RU")} ₽.
						Долг не блокирует приём оплаты на фактически вносимую сумму.
					</span>
				</div>
			)}

			{/* 1-Click Patient Deposit Debit Chip */}
			{patientDepositRub > 0 &&
				totalDueRub > 0 &&
				tendersHook?.activeMethod !== "family_deposit" &&
				(tendersHook?.activeMethod as string) !== "deposit" && (
					<PaymentDepositBanner
						totalDueRub={totalDueRub}
						patientDepositRub={patientDepositRub}
						execHook={execHook}
					/>
				)}
		</>
	);
};

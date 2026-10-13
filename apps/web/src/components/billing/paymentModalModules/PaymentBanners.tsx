/**
 * apps/web/src/components/billing/paymentModalModules/PaymentBanners.tsx
 *
 * Layer 4: Banners for 100% Warranty Remake, Patient Debt Autonomy, and Deposit Debit.
 * Governed by Mandates 8c, 8e, 8n.
 */

import {
	AlertTriangle,
	CheckCircle,
	Coins,
	Sparkles,
	Wallet,
	Zap,
} from "lucide-react";
import type React from "react";
import { showToast } from "../../GlobalToast.js";
import type { PaymentBannersProps } from "./types.js";

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
			{/* 100% Warranty Remake Zero Due Banner (Mandates 8e, 8n) */}
			{totalDueRub === 0 && (
				<div
					className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-3 flex-wrap animate-in fade-in"
					data-testid="banner-payment-zero-warranty"
				>
					<div className="flex items-center gap-2">
						<CheckCircle
							size={18}
							className="text-emerald-600 dark:text-emerald-400 shrink-0"
						/>
						<span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
							Гарантийный прием / 100% скидка (к оплате 0 ₽)
						</span>
					</div>
					<button
						type="button"
						onClick={() => {
							showToast(
								"Гарантийный прием оформлен (скидка 100%, 0 ₽). Визит закрыт!",
								"success",
							);
							if (onSuccess) {
								onSuccess({
									method: "warranty_discount_100",
									amountKopecks: 0,
									discountRub: discountsHook.discountCalc.discountRub,
									discountPercent: discountsHook.discountCalc.discountPercent,
									rawTotalRub: rawTotalDueRub,
									discountReason:
										discountsHook.discountReason ||
										"Гарантийная переделка / скидка 100%",
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

			{/* Debt Autonomy Banner (Mandates 8e & 8n: Patient debt never blocks receipt or tender) */}
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

			{/* 1-Click Patient Deposit Debit Chip (Mandates 8c, 8e) — hidden when deposit tab is already active to prevent duplicate card (Mandate 8p) */}
			{patientDepositRub > 0 &&
				totalDueRub > 0 &&
				tendersHook?.activeMethod !== "family_deposit" && (
					<div
						className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-2.5 flex-wrap animate-in fade-in"
						data-testid="banner-quick-deposit-debit"
					>
						<div className="flex items-center gap-2">
							<Wallet
								size={16}
								className="text-indigo-600 dark:text-indigo-400 shrink-0"
							/>
							<div className="text-xs">
								<span className="font-bold text-indigo-950 dark:text-indigo-200">
									На депозите пациента:{" "}
								</span>
								<span className="font-mono font-black text-indigo-700 dark:text-indigo-300">
									{patientDepositRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>
						</div>
						<button
							type="button"
							disabled={execHook.isSubmittingDeposit}
							onClick={() => execHook.handleDepositOrPartialCombo("deposit")}
							style={{
								padding: "5px 12px",
								backgroundColor: "#0d9488",
								color: "#ffffff",
								borderRadius: "8px",
								fontSize: "12px",
							}}
							className="min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
							data-testid="btn-quick-debit-deposit-chip"
						>
							<Zap size={14} />
							<span>
								{patientDepositRub >= totalDueRub
									? `Списать ${totalDueRub.toLocaleString("ru-RU")} ₽ с депозита`
									: `Зачесть ${patientDepositRub.toLocaleString("ru-RU")} ₽ + остаток`}
							</span>
						</button>
					</div>
				)}
		</>
	);
};

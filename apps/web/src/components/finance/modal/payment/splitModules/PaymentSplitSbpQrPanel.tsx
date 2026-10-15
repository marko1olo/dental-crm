/**
 * apps/web/src/components/finance/modal/payment/splitModules/PaymentSplitSbpQrPanel.tsx
 *
 * Dedicated SBP Dynamic QR Display Panel for Multi-Tender Split payments.
 * Complies with 54-FZ electronic receipt standards and SBP gateway polling.
 */

import React from "react";
import { Check, QrCode, RefreshCw, Zap } from "lucide-react";
import type { PaymentSplitSbpQrPanelProps } from "./paymentSplitTypes.js";

export const PaymentSplitSbpQrPanel: React.FC<PaymentSplitSbpQrPanelProps> = ({
	splitSbpRub,
	sbpStatus,
	sbpQrData,
	sbpCheckMessage,
	isCheckingSbp,
	onCheckSbpStatus,
	onConfirmSbpManual,
}) => {
	if (splitSbpRub <= 0) return null;

	return (
		<div
			className="p-3.5 rounded-2xl bg-teal-500/5 border border-teal-500/30 flex flex-col items-center justify-center text-center gap-2.5"
			data-testid="split-sbp-qr-display-panel"
		>
			<div className="flex items-center justify-between w-full flex-wrap gap-2 px-1">
				<span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
					<Zap size={14} className="text-teal-600 dark:text-teal-400" />
					<span>Динамический QR-код СБП (НСПК)</span>
				</span>
				<span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-teal-500/15 text-teal-700 dark:text-teal-300 rounded-full border border-teal-500/20 flex items-center gap-1">
					СБП • {splitSbpRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</span>
			</div>

			{sbpStatus === "paid" ? (
				<div className="w-full py-4 px-3 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/40 flex flex-col items-center justify-center gap-1 text-emerald-800 dark:text-emerald-200">
					<div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
						<Check size={20} />
					</div>
					<p className="font-extrabold text-xs m-0">
						СБП часть ({splitSbpRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽) оплачена!
					</p>
					<span className="text-[11px] text-emerald-600 dark:text-emerald-400">
						Транзакция СБП подтверждена • Безналичный платёж
					</span>
				</div>
			) : (
				<>
					<div
						className="w-36 h-36 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] p-2 shadow-md flex items-center justify-center border border-teal-500/30 overflow-hidden"
						data-testid="split-sbp-dynamic-qr-svg"
					>
						{sbpQrData ? (
							<div
								className="w-full h-full flex items-center justify-center"
								dangerouslySetInnerHTML={{ __html: sbpQrData.svg }}
							/>
						) : (
							<QrCode className="w-full h-full text-teal-600 dark:text-teal-400" />
						)}
					</div>
					<div className="text-xs text-[var(--ink,#0f172a)] space-y-0.5">
						<p className="font-bold m-0 text-[var(--ink,#0f172a)]">
							Отсканируйте камерой телефона или в приложении любого банка
						</p>
						<p className="text-[var(--muted,#64748b)] m-0 font-mono text-[11px]">
							Сумма СБП: {splitSbpRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ • Безналичный расчёт
						</p>
						{sbpCheckMessage && (
							<p className="text-[11px] text-teal-700 dark:text-teal-300 font-medium m-0">
								{sbpCheckMessage}
							</p>
						)}
					</div>

					{/* Status Verification buttons */}
					<div className="flex items-center gap-2 flex-wrap justify-center pt-0.5">
						<button
							type="button"
							onClick={() => onCheckSbpStatus(true)}
							disabled={isCheckingSbp}
							className="h-7 px-2.5 rounded-lg text-xs font-bold bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 cursor-pointer flex items-center gap-1 transition-all disabled:opacity-50"
							data-testid="btn-check-split-sbp-status"
							title="Опросить банковский шлюз СБП"
						>
							<RefreshCw size={12} className={isCheckingSbp ? "animate-spin" : ""} />
							<span>{isCheckingSbp ? "Проверка..." : "Проверить СБП"}</span>
						</button>
						<button
							type="button"
							onClick={onConfirmSbpManual}
							disabled={isCheckingSbp}
							className="h-7 px-2.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 cursor-pointer flex items-center gap-1 transition-all disabled:opacity-50"
							data-testid="btn-manual-confirm-split-sbp"
							title="Подтвердить зачисление СБП вручную"
						>
							<Check size={12} />
							<span>Деньги поступили на счет клиники (ручное подтверждение)</span>
						</button>
					</div>
				</>
			)}
		</div>
	);
};

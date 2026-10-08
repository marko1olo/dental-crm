/**
 * apps/web/src/components/finance/modal/payment/PaymentSbpView.tsx
 *
 * Dynamic SBP QR display, status polling, and cashier manual confirmation.
 */

import React from "react";
import { Check, QrCode, RefreshCw, Zap } from "lucide-react";

export interface PaymentSbpViewProps {
	readonly sbpStatus: "pending" | "paid";
	readonly totalDueRub: number;
	readonly sbpQrData: { payload: { sumFormattedRu?: string; qrId?: string }; svg: string } | null;
	readonly sbpCheckMessage: string | null;
	readonly handleCheckSbpStatus: (manual?: boolean) => void;
	readonly isCheckingSbp: boolean;
	readonly handleConfirmSbpManual: () => void;
}

export const PaymentSbpView: React.FC<PaymentSbpViewProps> = ({
	sbpStatus,
	totalDueRub,
	sbpQrData,
	sbpCheckMessage,
	handleCheckSbpStatus,
	isCheckingSbp,
	handleConfirmSbpManual,
}) => {
	return (
		<div
			className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-3"
			data-testid="sbp-qr-embedded-container"
		>
			<div
				className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/30 flex flex-col items-center justify-center text-center gap-3 w-full"
				data-testid="sbp-qr-display-panel"
			>
				<div className="flex items-center justify-between w-full flex-wrap gap-2 px-1">
					<span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
						<Zap size={14} className="text-teal-600 dark:text-teal-400" />
						<span>Динамический QR-код СБП (НСПК)</span>
					</span>
					<span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-teal-500/15 text-teal-700 dark:text-teal-300 rounded-full border border-teal-500/20 flex items-center gap-1">
						СБП • Быстрый платёж
					</span>
				</div>

				{sbpStatus === "paid" ? (
					<div className="w-full py-5 px-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex flex-col items-center justify-center gap-2 text-emerald-800 dark:text-emerald-200">
						<div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
							<Check size={24} />
						</div>
						<p className="font-extrabold text-sm m-0">
							Оплачено по СБП (безналичный расчёт)
						</p>
						<p className="text-xs font-mono font-bold m-0 text-emerald-700 dark:text-emerald-300">
							Сумма: {totalDueRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
						</p>
						<span className="text-[11px] text-emerald-600 dark:text-emerald-400">
							Транзакция подтверждена • Чек 54-ФЗ успешно сформирован
						</span>
					</div>
				) : (
					<>
						<div
							className="w-44 h-44 rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] p-2.5 shadow-md flex items-center justify-center border border-teal-500/30 overflow-hidden"
							data-testid="sbp-dynamic-qr-svg"
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
						<div className="text-xs text-[var(--ink,#0f172a)] space-y-1">
							<p className="font-bold m-0 text-[var(--ink,#0f172a)]">
								Отсканируйте камерой телефона или в приложении любого банка
							</p>
							<p className="text-[var(--muted,#64748b)] m-0 font-mono text-[11px]">
								Сумма СБП: {totalDueRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ •
								Без комиссии для пациента
							</p>
							{sbpCheckMessage && (
								<p className="text-[11px] text-teal-700 dark:text-teal-300 font-medium m-0">
									{sbpCheckMessage}
								</p>
							)}
						</div>

						{/* 1-Click Status Verification & Cashier Autonomy (Mandates 8e, 8k) */}
						<div className="flex items-center gap-2 flex-wrap justify-center pt-1">
							<button
								type="button"
								onClick={() => handleCheckSbpStatus(true)}
								disabled={isCheckingSbp}
								className="h-8 px-3 rounded-lg text-xs font-bold bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
								data-testid="btn-check-sbp-status"
								title="Опросить банковский шлюз СБП"
							>
								<RefreshCw size={13} className={isCheckingSbp ? "animate-spin" : ""} />
								<span>{isCheckingSbp ? "Проверка..." : "Проверить оплату"}</span>
							</button>
							<button
								type="button"
								onClick={handleConfirmSbpManual}
								disabled={isCheckingSbp}
								className="h-8 px-3 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
								data-testid="btn-manual-confirm-sbp"
								title="Подтвердить зачисление средств по выписке/СМС банка"
							>
								<Check size={13} />
								<span>Подтвердить вручную</span>
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

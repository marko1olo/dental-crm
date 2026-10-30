/**
 * apps/web/src/components/cashbox/checkout/CheckoutSplitCalculator.tsx
 *
 * Cash Drawer Change Calculator, SBP QR SVG Code & Split-Tender Allocation.
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (1-click auto-balance rest).
 * - Integer Kopeck Math: Zero floating point errors.
 * - Apple HIG: Touch-friendly bills and inputs >= 44x44px.
 */

import React from "react";
import { QUICK_CASH_PRESET_BILLS } from "../cashboxCatalogData.js";
import type { CashboxTenderType } from "../cashboxCatalogData.js";

export interface CheckoutSplitCalculatorProps {
	readonly method: CashboxTenderType;
	readonly totalDue: number;
	readonly cashReceivedRub: number;
	readonly setCashReceivedRub: (val: number) => void;
	readonly cashChangeResult: { changeRub: number; isShortage?: boolean };
	readonly sbpQrSvg: string | null;
	readonly splitCardRub: number;
	readonly setSplitCardRub: (fn: ((prev: number) => number) | number) => void;
	readonly splitCashRub: number;
	readonly setSplitCashRub: (val: number) => void;
	readonly splitSbpRub: number;
	readonly setSplitSbpRub: (val: number) => void;
	readonly splitDepositRub: number;
	readonly setSplitDepositRub: (val: number) => void;
	readonly effectiveDepositLimit: number;
	readonly splitBalances: {
		allocatedRub: number;
		isFullyPaid: boolean;
		remainingRub?: number;
	};
	readonly splitInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const CheckoutSplitCalculator: React.FC<CheckoutSplitCalculatorProps> = ({
	method,
	totalDue,
	cashReceivedRub,
	setCashReceivedRub,
	cashChangeResult,
	sbpQrSvg,
	splitCardRub,
	setSplitCardRub,
	splitCashRub,
	setSplitCashRub,
	splitSbpRub,
	setSplitSbpRub,
	splitDepositRub,
	setSplitDepositRub,
	effectiveDepositLimit,
	splitBalances,
	splitInputRef,
}) => {
	return (
		<div className="space-y-4">
			{/* Cash Change Panel with Quick Bills */}
			{method === "cash" && (
				<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2.5">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
						<span className="text-xs font-bold text-[var(--ink)]">Получено наличными:</span>
						<div className="flex flex-wrap gap-1.5">
							{QUICK_CASH_PRESET_BILLS.map((b) => (
								<button
									key={b}
									type="button"
									onClick={() => setCashReceivedRub(b)}
									className="min-h-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
								>
									+{b} ₽
								</button>
							))}
						</div>
					</div>
					<div className="flex items-center gap-3">
						<input
							type="number"
							value={cashReceivedRub}
							onChange={(e) => setCashReceivedRub(Math.max(0, Number(e.target.value) || 0))}
							className="w-1/2 min-h-[44px] px-3 text-base font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
						/>
						<div className="w-1/2 text-right">
							<span className="text-xs text-[var(--muted)] block">Сдача клиенту:</span>
							<span
								className={`text-lg font-black ${cashChangeResult.changeRub >= 0 ? "text-[var(--teal,#0d9488)]" : "text-[var(--danger,#ef4444)]"}`}
							>
								{cashChangeResult.changeRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>
				</div>
			)}

			{/* SBP QR SVG Display */}
			{method === "sbp" && sbpQrSvg && (
				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col items-center justify-center text-center">
					<div
						className="p-2 bg-white rounded-xl shadow-xs border border-[var(--line)]"
						dangerouslySetInnerHTML={{ __html: sbpQrSvg }}
					/>
					<span className="text-xs font-semibold text-[var(--muted)] mt-2">
						Пациент сканирует камерой смартфона в приложении банка
					</span>
				</div>
			)}

			{/* Split Allocation Controls */}
			{method === "split" && (
				<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink)]">Сплит-распределение:</span>
						<span
							className={`text-xs font-bold ${splitBalances.isFullyPaid ? "text-[var(--teal,#0d9488)]" : "text-[var(--danger,#ef4444)]"}`}
						>
							{splitBalances.allocatedRub.toLocaleString("ru-RU")} / {totalDue.toLocaleString("ru-RU")} ₽
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div>
							<label className="text-[11px] font-semibold text-[var(--muted)] block mb-0.5">
								Банковской картой:
							</label>
							<input
								ref={splitInputRef}
								type="number"
								value={splitCardRub}
								onChange={(e) => setSplitCardRub(Math.max(0, Number(e.target.value) || 0))}
								className="w-full min-h-[44px] px-2.5 text-sm font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
							/>
						</div>
						<div>
							<label className="text-[11px] font-semibold text-[var(--muted)] block mb-0.5">
								Наличными:
							</label>
							<input
								type="number"
								value={splitCashRub}
								onChange={(e) => setSplitCashRub(Math.max(0, Number(e.target.value) || 0))}
								className="w-full min-h-[44px] px-2.5 text-sm font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
							/>
						</div>
						<div>
							<label className="text-[11px] font-semibold text-[var(--muted)] block mb-0.5">
								СБП QR:
							</label>
							<input
								type="number"
								value={splitSbpRub}
								onChange={(e) => setSplitSbpRub(Math.max(0, Number(e.target.value) || 0))}
								className="w-full min-h-[44px] px-2.5 text-sm font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
							/>
						</div>
						<div>
							<label className="text-[11px] font-semibold text-[var(--muted)] block mb-0.5">
								Депозит (макс {effectiveDepositLimit.toLocaleString("ru-RU")} ₽):
							</label>
							<input
								type="number"
								value={splitDepositRub}
								onChange={(e) =>
									setSplitDepositRub(
										Math.min(effectiveDepositLimit, Math.max(0, Number(e.target.value) || 0)),
									)
								}
								className="w-full min-h-[44px] px-2.5 text-sm font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
							/>
						</div>
					</div>
					{!splitBalances.isFullyPaid && (
						<div className="flex items-center justify-between pt-1">
							<span className="text-xs text-[var(--danger,#ef4444)] font-medium">
								{totalDue > splitBalances.allocatedRub
									? `Не распределено: ${(totalDue - splitBalances.allocatedRub).toLocaleString("ru-RU")} ₽`
									: `Превышение: +${(splitBalances.allocatedRub - totalDue).toLocaleString("ru-RU")} ₽`}
							</span>
							{totalDue > splitBalances.allocatedRub && (
								<button
									type="button"
									onClick={() =>
										setSplitCardRub((v: number) => v + (totalDue - splitBalances.allocatedRub))
									}
									className="text-xs font-bold text-[var(--teal,#0d9488)] hover:underline min-h-[32px] cursor-pointer"
								>
									+ Добавить остаток на карту
								</button>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

/**
 * apps/web/src/components/cashbox/studioModules/checkout/CheckoutSplitPaymentPanel.tsx
 *
 * Dedicated Combined Split Tender Panel for CashRegisterCheckoutSection.
 * Governed by Mandates 8e, 8n, 8am, 8ap:
 * - 1-click allocation presets (50/50, 100% card, 100% cash, 100% SBP).
 * - BigInt exact kopeck balance checking without float drift.
 * - Real-time cash change helper for split cash tender.
 */

import React from "react";
import { CreditCard, QrCode, Split, Banknote, Wallet } from "lucide-react";
import {
	type CashChangeResult,
	formatRubles,
	kopecksToRub,
} from "../../cashRegisterCatalogData.js";

function rubToKopecks(rub: number): bigint {
	if (!Number.isFinite(rub) || rub <= 0) return 0n;
	return BigInt(Math.round(rub * 100));
}

export interface CheckoutSplitPaymentPanelProps {
	readonly effectiveTotalRub: number;
	readonly effectiveTotalKop: bigint;
	readonly isSplitBalanced: boolean;
	readonly splitDiffKop: bigint;
	readonly splitCardRub: number;
	readonly setSplitCardRub: (val: number) => void;
	readonly splitCashRub: number;
	readonly setSplitCashRub: (val: number) => void;
	readonly splitSbpRub: number;
	readonly setSplitSbpRub: (val: number) => void;
	readonly splitDepositRub: number;
	readonly setSplitDepositRub: (val: number) => void;
	readonly splitCashReceivedRub: number;
	readonly setSplitCashReceivedRub: (val: number) => void;
	readonly splitCashChange: CashChangeResult | null;
	readonly handleBalanceSplit: (field: "cash" | "card" | "sbp" | "deposit") => void;
	readonly patientDepositRub?: number | undefined;
}

export const CheckoutSplitPaymentPanel: React.FC<CheckoutSplitPaymentPanelProps> = ({
	effectiveTotalRub,
	effectiveTotalKop,
	isSplitBalanced,
	splitDiffKop,
	splitCardRub,
	setSplitCardRub,
	splitCashRub,
	setSplitCashRub,
	splitSbpRub,
	setSplitSbpRub,
	splitDepositRub,
	setSplitDepositRub,
	splitCashReceivedRub,
	setSplitCashReceivedRub,
	splitCashChange,
	handleBalanceSplit,
	patientDepositRub = 0,
}) => {
	return (
		<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3" data-testid="split-tender-panel">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Split className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					<span className="text-xs font-bold text-[var(--ink)]">Комбинированная оплата (сплит)</span>
				</div>
				<span
					className={`text-xs font-semibold ${
						isSplitBalanced
							? "text-emerald-600"
							: splitDiffKop > 0n
								? "text-amber-600"
								: "text-rose-600"
					}`}
					data-testid="split-balance-status"
				>
					{isSplitBalanced
						? "Сумма сходится точно ✓"
						: splitDiffKop > 0n
							? `Осталось распределить: ${formatRubles(kopecksToRub(splitDiffKop))}`
							: `Превышение: ${formatRubles(kopecksToRub(-splitDiffKop))}`}
				</span>
			</div>

			{/* Quick split allocation presets */}
			<div className="flex flex-wrap gap-1.5" data-testid="quick-presets-section">
				<button
					type="button"
					data-testid="btn-checkout-split-50-50"
					onClick={() => {
						const halfKop = effectiveTotalKop / 2n;
						const halfRub = kopecksToRub(halfKop);
						const restRub = kopecksToRub(effectiveTotalKop - halfKop);
						setSplitCardRub(halfRub);
						setSplitCashRub(restRub);
						setSplitCashReceivedRub(restRub);
						setSplitSbpRub(0);
						setSplitDepositRub(0);
					}}
					className="dente-btn dente-btn-secondary px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					50% карта / 50% нал
				</button>
				<button
					type="button"
					data-testid="btn-checkout-100-card"
					onClick={() => {
						setSplitCardRub(effectiveTotalRub);
						setSplitCashRub(0);
						setSplitSbpRub(0);
						setSplitDepositRub(0);
					}}
					className="dente-btn dente-btn-secondary px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					100% карта
				</button>
				<button
					type="button"
					data-testid="btn-checkout-100-cash"
					onClick={() => {
						setSplitCashRub(effectiveTotalRub);
						setSplitCashReceivedRub(effectiveTotalRub);
						setSplitCardRub(0);
						setSplitSbpRub(0);
						setSplitDepositRub(0);
					}}
					className="dente-btn dente-btn-secondary px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					100% нал
				</button>
				<button
					type="button"
					data-testid="btn-checkout-100-sbp"
					onClick={() => {
						setSplitSbpRub(effectiveTotalRub);
						setSplitCardRub(0);
						setSplitCashRub(0);
						setSplitDepositRub(0);
					}}
					className="dente-btn dente-btn-secondary px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					100% СБП
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
				{/* Card Row */}
				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
							<CreditCard className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							<span>Карта (POS)</span>
						</span>
						<button
							type="button"
							onClick={() => handleBalanceSplit("card")}
							className="dente-btn dente-btn-secondary px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
						>
							Остаток
						</button>
					</div>
					<input
						type="number"
						data-testid="split-input-card"
						value={splitCardRub || ""}
						onChange={(e) => setSplitCardRub(Math.max(0, Number(e.target.value) || 0))}
						placeholder="0 ₽"
						className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold"
					/>
				</div>

				{/* Cash Row */}
				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
							<Banknote className="w-3.5 h-3.5 text-emerald-600" />
							<span>Наличные</span>
						</span>
						<button
							type="button"
							onClick={() => handleBalanceSplit("cash")}
							className="dente-btn dente-btn-secondary px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
						>
							Остаток
						</button>
					</div>
					<input
						type="number"
						data-testid="split-input-cash"
						value={splitCashRub || ""}
						onChange={(e) => {
							const val = Math.max(0, Number(e.target.value) || 0);
							setSplitCashRub(val);
							setSplitCashReceivedRub(val);
						}}
						placeholder="0 ₽"
						className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold"
					/>
				</div>

				{/* SBP QR Row */}
				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
							<QrCode className="w-3.5 h-3.5 text-blue-600" />
							<span>СБП QR</span>
						</span>
						<button
							type="button"
							onClick={() => handleBalanceSplit("sbp")}
							className="dente-btn dente-btn-secondary px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
						>
							Остаток
						</button>
					</div>
					<input
						type="number"
						data-testid="split-input-sbp"
						value={splitSbpRub || ""}
						onChange={(e) => setSplitSbpRub(Math.max(0, Number(e.target.value) || 0))}
						placeholder="0 ₽"
						className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold"
					/>
				</div>

				{/* Deposit Row */}
				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
							<Wallet className="w-3.5 h-3.5 text-amber-600" />
							<span>Аванс / Депозит ({formatRubles(patientDepositRub)})</span>
						</span>
						<button
							type="button"
							onClick={() => {
								const maxAllowed = Math.min(
									patientDepositRub,
									kopecksToRub(rubToKopecks(splitDepositRub) + splitDiffKop),
								);
								setSplitDepositRub(Math.max(0, maxAllowed));
							}}
							className="dente-btn dente-btn-secondary px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
						>
							Макс
						</button>
					</div>
					<input
						type="number"
						data-testid="split-input-deposit"
						value={splitDepositRub || ""}
						onChange={(e) => setSplitDepositRub(Math.max(0, Number(e.target.value) || 0))}
						placeholder="0 ₽"
						className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold"
					/>
				</div>
			</div>

			{/* Split cash change helper */}
			{splitCashRub > 0 && (
				<div className="pt-2 border-t border-[var(--line)] flex items-center gap-3">
					<span className="text-[11px] text-[var(--muted)]">Внесено наличными:</span>
					<input
						type="number"
						data-testid="split-input-cash-received"
						value={splitCashReceivedRub}
						onChange={(e) => setSplitCashReceivedRub(Math.max(0, Number(e.target.value)))}
						className="w-28 px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper)] font-mono text-xs font-bold"
					/>
					{splitCashChange && (
						<span className="text-xs">
							{splitCashChange.isSurplus && (
								<span className="text-emerald-600 font-bold">
									Сдача: {splitCashChange.formattedChange}
								</span>
							)}
							{splitCashChange.isExact && <span className="text-[var(--muted)]">Без сдачи ✓</span>}
							{splitCashChange.isShortage && (
								<span className="text-rose-600">
									Не хватает: {formatRubles(splitCashRub - splitCashReceivedRub)}
								</span>
							)}
						</span>
					)}
				</div>
			)}
		</div>
	);
};

/**
 * apps/web/src/components/cashbox/studioModules/checkout/CheckoutSplitPaymentPanel.tsx
 *
 * Dedicated Combined Split Tender Panel for CashRegisterCheckoutSection.
 * BigInt exact kopeck balance checking without float drift (Mandates 8e, 8n, 8am, 8ap, 8bm).
 */

import React from "react";
import { CreditCard, QrCode, Split, Banknote, Wallet, Gift, Sparkles } from "lucide-react";
import { formatKopecksToRub, kopecksToRubles } from "@dental/shared";
import {
	type CashChangeResult,
	rubToKopecks,
} from "../../cashRegisterCatalogData.js";

export interface CheckoutSplitPaymentPanelProps {
	readonly effectiveTotalKopecks: bigint;
	readonly isSplitBalanced: boolean;
	readonly splitDiffKopecks: bigint;
	readonly splitCardKopecks: bigint;
	readonly setSplitCardKopecks: (val: bigint) => void;
	readonly splitCashKopecks: bigint;
	readonly setSplitCashKopecks: (val: bigint) => void;
	readonly splitSbpKopecks: bigint;
	readonly setSplitSbpKopecks: (val: bigint) => void;
	readonly splitDepositKopecks: bigint;
	readonly setSplitDepositKopecks: (val: bigint) => void;
	readonly splitBonusKopecks?: bigint | undefined;
	readonly setSplitBonusKopecks?: ((val: bigint) => void) | undefined;
	readonly splitCertificateKopecks?: bigint | undefined;
	readonly setSplitCertificateKopecks?: ((val: bigint) => void) | undefined;
	readonly certificateNumber?: string | undefined;
	readonly setCertificateNumber?: ((val: string) => void) | undefined;
	readonly patientBonusPoints?: number | undefined;
	readonly splitCashReceivedKopecks: bigint;
	readonly setSplitCashReceivedKopecks: (val: bigint) => void;
	readonly splitCashChange: CashChangeResult | null;
	readonly handleBalanceSplit: (field: "cash" | "card" | "sbp" | "deposit" | "bonus" | "certificate") => void;
	readonly patientDepositKopecks?: bigint | undefined;
	readonly patientFamilyBalanceKopecks?: bigint | undefined;
}

export const CheckoutSplitPaymentPanel: React.FC<CheckoutSplitPaymentPanelProps> = ({
	effectiveTotalKopecks,
	isSplitBalanced,
	splitDiffKopecks,
	splitCardKopecks,
	setSplitCardKopecks,
	splitCashKopecks,
	setSplitCashKopecks,
	splitSbpKopecks,
	setSplitSbpKopecks,
	splitDepositKopecks,
	setSplitDepositKopecks,
	splitBonusKopecks = 0n,
	setSplitBonusKopecks,
	splitCertificateKopecks = 0n,
	setSplitCertificateKopecks,
	certificateNumber = "",
	setCertificateNumber,
	patientBonusPoints = 0,
	splitCashReceivedKopecks,
	setSplitCashReceivedKopecks,
	splitCashChange,
	handleBalanceSplit,
	patientDepositKopecks = 0n,
	patientFamilyBalanceKopecks = 0n,
}) => {
	const totalAvailableDepositKopecks = patientDepositKopecks + patientFamilyBalanceKopecks;
	const splitCardDisplay = splitCardKopecks > 0n ? kopecksToRubles(Number(splitCardKopecks)) : "";
	const splitCashDisplay = splitCashKopecks > 0n ? kopecksToRubles(Number(splitCashKopecks)) : "";
	const splitSbpDisplay = splitSbpKopecks > 0n ? kopecksToRubles(Number(splitSbpKopecks)) : "";
	const splitDepositDisplay = splitDepositKopecks > 0n ? kopecksToRubles(Number(splitDepositKopecks)) : "";
	const splitCertDisplay = splitCertificateKopecks > 0n ? kopecksToRubles(Number(splitCertificateKopecks)) : "";
	const splitBonusDisplay = splitBonusKopecks > 0n ? kopecksToRubles(Number(splitBonusKopecks)) : "";

	return (
		<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3" data-testid="split-tender-panel">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Split className="w-4 h-4 text-[var(--primary)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)]">Комбинированная оплата (сплит)</span>
				</div>
				<span
					className={`text-xs font-semibold font-mono tabular-nums ${
						isSplitBalanced
							? "text-[var(--success-ink)] font-sans"
							: splitDiffKopecks > 0n
								? "text-[var(--warning-ink)]"
								: "text-[var(--danger-ink)]"
					}`}
					data-testid="split-balance-status"
				>
					{isSplitBalanced
						? "Сумма сходится точно ✓"
						: splitDiffKopecks > 0n
							? `Осталось распределить: ${formatKopecksToRub(splitDiffKopecks)}`
							: `Превышение: ${formatKopecksToRub(-splitDiffKopecks)}`}
				</span>
			</div>

			<div className="flex flex-wrap gap-1.5" data-testid="quick-presets-section">
				<button
					type="button"
					data-testid="btn-checkout-split-50-50"
					onClick={() => {
						const halfKop = effectiveTotalKopecks / 2n;
						const restKop = effectiveTotalKopecks - halfKop;
						setSplitCardKopecks(halfKop);
						setSplitCashKopecks(restKop);
						setSplitCashReceivedKopecks(restKop);
						setSplitSbpKopecks(0n);
						setSplitDepositKopecks(0n);
						setSplitBonusKopecks?.(0n);
						setSplitCertificateKopecks?.(0n);
					}}
					className="dente-btn dente-btn-secondary px-2.5 py-1 min-h-[44px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					50% карта / 50% нал
				</button>
				<button
					type="button"
					data-testid="btn-checkout-100-card"
					onClick={() => {
						setSplitCardKopecks(effectiveTotalKopecks);
						setSplitCashKopecks(0n);
						setSplitSbpKopecks(0n);
						setSplitDepositKopecks(0n);
						setSplitBonusKopecks?.(0n);
						setSplitCertificateKopecks?.(0n);
					}}
					className="dente-btn dente-btn-secondary px-2.5 py-1 min-h-[44px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					100% карта
				</button>
				<button
					type="button"
					data-testid="btn-checkout-100-cash"
					onClick={() => {
						setSplitCashKopecks(effectiveTotalKopecks);
						setSplitCashReceivedKopecks(effectiveTotalKopecks);
						setSplitCardKopecks(0n);
						setSplitSbpKopecks(0n);
						setSplitDepositKopecks(0n);
						setSplitBonusKopecks?.(0n);
						setSplitCertificateKopecks?.(0n);
					}}
					className="dente-btn dente-btn-secondary px-2.5 py-1 min-h-[44px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					100% нал
				</button>
				<button
					type="button"
					data-testid="btn-checkout-100-sbp"
					onClick={() => {
						setSplitSbpKopecks(effectiveTotalKopecks);
						setSplitCardKopecks(0n);
						setSplitCashKopecks(0n);
						setSplitDepositKopecks(0n);
						setSplitBonusKopecks?.(0n);
						setSplitCertificateKopecks?.(0n);
					}}
					className="dente-btn dente-btn-secondary px-2.5 py-1 min-h-[44px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					100% СБП
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
							<CreditCard className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
							<span>Карта (POS)</span>
						</span>
						<button
							type="button"
							onClick={() => handleBalanceSplit("card")}
							className="dente-btn dente-btn-secondary px-2 py-0.5 rounded text-xs font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
						>
							Остаток
						</button>
					</div>
					<input
						type="number"
						data-testid="split-input-card"
						value={splitCardDisplay}
						onChange={(e) => setSplitCardKopecks(rubToKopecks(Math.max(0, Number(e.target.value) || 0)))}
						placeholder="0 ₽"
						className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono tabular-nums text-sm font-bold"
					/>
				</div>

				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
							<Banknote className="w-3.5 h-3.5 text-[var(--success-ink)] shrink-0" />
							<span>Наличные</span>
						</span>
						<button
							type="button"
							onClick={() => handleBalanceSplit("cash")}
							className="dente-btn dente-btn-secondary px-2 py-0.5 rounded text-xs font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
						>
							Остаток
						</button>
					</div>
					<input
						type="number"
						data-testid="split-input-cash"
						value={splitCashDisplay}
						onChange={(e) => {
							const nextKop = rubToKopecks(Math.max(0, Number(e.target.value) || 0));
							setSplitCashKopecks(nextKop);
							setSplitCashReceivedKopecks(nextKop);
						}}
						placeholder="0 ₽"
						className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono tabular-nums text-sm font-bold"
					/>
				</div>

				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
							<QrCode className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
							<span>СБП QR</span>
						</span>
						<button
							type="button"
							onClick={() => handleBalanceSplit("sbp")}
							className="dente-btn dente-btn-secondary px-2 py-0.5 rounded text-xs font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
						>
							Остаток
						</button>
					</div>
					<input
						type="number"
						data-testid="split-input-sbp"
						value={splitSbpDisplay}
						onChange={(e) => setSplitSbpKopecks(rubToKopecks(Math.max(0, Number(e.target.value) || 0)))}
						placeholder="0 ₽"
						className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono tabular-nums text-sm font-bold"
					/>
				</div>

				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
							<Wallet className="w-3.5 h-3.5 text-[var(--warning-ink)] shrink-0" />
							<span>Аванс / Семья ({formatKopecksToRub(totalAvailableDepositKopecks)})</span>
						</span>
						<button
							type="button"
							onClick={() => {
								const maxTargetKop = splitDepositKopecks + splitDiffKopecks;
								const cappedKop = totalAvailableDepositKopecks < maxTargetKop ? totalAvailableDepositKopecks : maxTargetKop;
								setSplitDepositKopecks(cappedKop > 0n ? cappedKop : 0n);
							}}
							className="dente-btn dente-btn-secondary px-2 py-0.5 rounded text-xs font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
						>
							Макс
						</button>
					</div>
					<input
						type="number"
						data-testid="split-input-deposit"
						value={splitDepositDisplay}
						onChange={(e) => setSplitDepositKopecks(rubToKopecks(Math.max(0, Number(e.target.value) || 0)))}
						placeholder="0 ₽"
						className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono tabular-nums text-sm font-bold"
					/>
				</div>

				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5" data-testid="split-row-certificate">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
							<Gift className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
							<span>Сертификат</span>
						</span>
						<button
							type="button"
							data-testid="btn-split-balance-cert"
							onClick={() => handleBalanceSplit("certificate")}
							className="dente-btn dente-btn-secondary px-2 py-0.5 rounded text-xs font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
						>
							Остаток
						</button>
					</div>
					<div className="space-y-1.5">
						{setCertificateNumber && (
							<input
								type="text"
								data-testid="split-input-cert-number"
								value={certificateNumber || ""}
								onChange={(e) => setCertificateNumber(e.target.value)}
								placeholder="№ сертификата"
								className="w-full px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] font-mono text-xs"
							/>
						)}
						<input
							type="number"
							data-testid="split-input-certificate"
							value={splitCertDisplay}
							onChange={(e) => setSplitCertificateKopecks?.(rubToKopecks(Math.max(0, Number(e.target.value) || 0)))}
							placeholder="0 ₽"
							className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono tabular-nums text-sm font-bold"
						/>
					</div>
				</div>

				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5" data-testid="split-row-bonus">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
							<Sparkles className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
							<span>Бонусы {patientBonusPoints > 0 ? `(${patientBonusPoints} б.)` : ""}</span>
						</span>
						<button
							type="button"
							data-testid="btn-split-balance-bonus"
							onClick={() => {
								if (patientBonusPoints > 0) {
									const maxBonusKop = rubToKopecks(patientBonusPoints);
									const targetKop = splitBonusKopecks + splitDiffKopecks;
									const capped = maxBonusKop < targetKop ? maxBonusKop : targetKop;
									setSplitBonusKopecks?.(capped > 0n ? capped : 0n);
								} else {
									handleBalanceSplit("bonus");
								}
							}}
							className="dente-btn dente-btn-secondary px-2 py-0.5 rounded text-xs font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
						>
							{patientBonusPoints > 0 ? "Макс" : "Остаток"}
						</button>
					</div>
					<input
						type="number"
						data-testid="split-input-bonus"
						value={splitBonusDisplay}
						onChange={(e) => setSplitBonusKopecks?.(rubToKopecks(Math.max(0, Number(e.target.value) || 0)))}
						placeholder="0 ₽"
						className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono tabular-nums text-sm font-bold"
					/>
				</div>
			</div>

			{splitCashKopecks > 0n && (
				<div className="pt-2 border-t border-[var(--line)] flex items-center gap-3">
					<span className="text-xs text-[var(--ink-muted)]">Внесено наличными:</span>
					<input
						type="number"
						data-testid="split-input-cash-received"
						value={kopecksToRubles(Number(splitCashReceivedKopecks))}
						onChange={(e) => setSplitCashReceivedKopecks(rubToKopecks(Math.max(0, Number(e.target.value) || 0)))}
						className="w-28 px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper)] font-mono tabular-nums text-xs font-bold"
					/>
					{splitCashChange && (
						<span className="text-xs font-mono tabular-nums">
							{splitCashChange.isSurplus && (
								<span className="text-[var(--success-ink)] font-bold">
									Сдача: {splitCashChange.formattedChange}
								</span>
							)}
							{splitCashChange.isExact && <span className="text-[var(--ink-muted)] font-sans">Без сдачи ✓</span>}
							{splitCashChange.isShortage && (
								<span className="text-[var(--danger-ink)]">
									Не хватает: {splitCashChange.formattedShortage}
								</span>
							)}
						</span>
					)}
				</div>
			)}
		</div>
	);
};

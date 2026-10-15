/**
 * apps/web/src/components/finance/modal/payment/splitModules/PaymentFiscalSummaryCard.tsx
 *
 * Statutory 54-FZ (FFD 1.2) Fiscal Requisites & Tender Parity Card.
 * Displays integer kopeck balance, electronic/cash breakdown, and VAT exemption.
 */

import React from "react";
import { AlertCircle, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { calculateCanonicalSplit } from "@dental/shared/fiscal";
import type { PaymentFiscalSummaryCardProps } from "./paymentSplitTypes.js";

export const PaymentFiscalSummaryCard: React.FC<PaymentFiscalSummaryCardProps> = ({
	totalDueRub,
	totalAllocatedRub,
	isBalanced,
	onAutoAlignRemainder,
	splitCashRub,
	splitCardRub,
	splitSbpRub,
	splitDepositRub,
	splitFamilyRub,
	splitDmsRub,
	splitCertificateRub,
	splitBonusRub,
}) => {
	const diffKop = Math.abs(rubToKopecks(totalDueRub) - rubToKopecks(totalAllocatedRub));
	const diffRub = kopecksToRub(diffKop);

	// Compute canonical statutory tender tags breakdown via SSOT
	const splitSummary = calculateCanonicalSplit({
		totalDueRub,
		cashRub: splitCashRub,
		cardRub: splitCardRub,
		sbpRub: splitSbpRub,
		depositRub: splitDepositRub,
		familyWalletRub: splitFamilyRub,
		insuranceRub: splitDmsRub,
		certificateRub: splitCertificateRub,
	});

	return (
		<div
			className="pt-1.5 border-t border-[var(--line,#e2e8f0)] space-y-1.5 text-xs"
			data-testid="split-balance-status-card"
		>
			{/* Balance and Auto-Align Header */}
			<div className="flex items-center justify-between flex-wrap gap-2 font-bold">
				<div className="flex items-center gap-2">
					<span className="text-[var(--muted,#64748b)]">Всего распределено:</span>
					<span
						className={`font-mono text-sm flex items-center gap-1 ${
							isBalanced
								? "text-emerald-600 dark:text-emerald-400"
								: "text-amber-600 dark:text-amber-400"
						}`}
					>
						<span>
							{totalAllocatedRub.toLocaleString("ru-RU")} / {totalDueRub.toLocaleString("ru-RU")} ₽
						</span>
						{isBalanced ? (
							<span className="inline-flex items-center gap-1 ml-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
								<CheckCircle2 size={13} /> Совпадает
							</span>
						) : (
							<span className="inline-flex items-center gap-1 ml-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold">
								<AlertCircle size={13} /> Не сходится ({diffRub.toLocaleString("ru-RU")} ₽)
							</span>
						)}
					</span>
				</div>

				{!isBalanced && (
					<button
						type="button"
						onClick={onAutoAlignRemainder}
						className="min-h-[32px] px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/30 cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
						data-testid="btn-auto-align-split-remainder"
						title="Автоматически выровнять остаток с копеечной точностью"
					>
						<Sparkles size={13} />
						<span>Выровнять остаток</span>
					</button>
				)}
			</div>

			{/* Statutory Tender Breakdown (Clean Domain Language) */}
			<div className="pt-1.5 border-t border-[var(--line,#e2e8f0)] grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs text-[var(--muted,#64748b)]">

				<div className="flex flex-col">
					<span className="text-[11px] font-medium">Наличные</span>
					<strong className="text-[var(--ink,#0f172a)] font-mono">
						{splitSummary.tag1031_cashRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>
				<div className="flex flex-col">
					<span className="text-[11px] font-medium">Карта и СБП</span>
					<strong className="text-[var(--ink,#0f172a)] font-mono">
						{splitSummary.tag1081_electronicRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>
				<div className="flex flex-col">
					<span className="text-[11px] font-medium">Зачёт аванса</span>
					<strong className="text-[var(--ink,#0f172a)] font-mono">
						{splitSummary.tag1215_advanceOffsetRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>
				<div className="flex flex-col">
					<span className="text-[11px] font-medium">ДМС и сертификат</span>
					<strong className="text-[var(--ink,#0f172a)] font-mono">
						{splitSummary.tag1217_counterProvisionRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>
			</div>

			{/* Tax and Receipt Format Badge */}
			<div className="flex items-center justify-between flex-wrap gap-1.5 pt-1 text-[11px] text-[var(--muted,#64748b)] border-t border-[var(--line,#e2e8f0)]/60">
				<div className="flex items-center gap-1">
					<FileText size={12} className="text-teal-600 dark:text-teal-400" />
					<span>Медицинские услуги (без НДС)</span>
				</div>
				<span className="font-semibold text-teal-700 dark:text-teal-300">
					Кассовый чек онлайн
				</span>
			</div>
		</div>

	);
};

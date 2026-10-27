import React from "react";
import { ShieldCheck } from "lucide-react";
import { showToast } from "../../../../GlobalToast";
import { formatMoneyRu } from "../fiscalModalRefundLogic";

export interface TenderSplitInsuranceRowProps {
	readonly totalSumRub: number;
	readonly insuranceAmount?: number | undefined;
	readonly setInsuranceAmount?: ((v: number) => void) | undefined;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly setGuaranteeLetterNumber?: ((v: string) => void) | undefined;
	readonly setCardAmount: (setter: (prev: number) => number) => void;
	readonly remainingRub: number;
	readonly handleFillRemaining: (t: "card" | "cash" | "sbp" | "certificate" | "insurance") => void;
}

export const TenderSplitInsuranceRow: React.FC<TenderSplitInsuranceRowProps> = ({
	totalSumRub,
	insuranceAmount = 0,
	setInsuranceAmount,
	guaranteeLetterNumber = "",
	setGuaranteeLetterNumber,
	setCardAmount,
	remainingRub,
	handleFillRemaining,
}) => {
	return (
		<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-sky-500/30 space-y-2" data-testid="split-insurance-row">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5">
					<ShieldCheck size={16} className="text-sky-600 shrink-0" />
					<div>
						<span className="text-xs font-bold block text-[var(--ink,#0f172a)]">ДМС / Страховая компания</span>
						<span className="text-[11px] text-[var(--muted,#64748b)]">Покрытие по гарантийному письму</span>
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<input
						type="number"
						min={0}
						max={totalSumRub}
						value={insuranceAmount || ""}
						onChange={(e) => setInsuranceAmount?.(Math.max(0, Number(e.target.value) || 0))}
						placeholder="0"
						className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
						data-testid="input-insurance-amount"
					/>
					{remainingRub > 0 && (
						<button
							type="button"
							onClick={() => handleFillRemaining("insurance")}
							className="primary-button h-8 px-2.5 text-xs rounded-lg cursor-pointer active:scale-95"
							data-testid="btn-fill-remaining-insurance"
						>
							+Остаток
						</button>
					)}
				</div>
			</div>

			<div className="flex items-center gap-2 pt-1 border-t border-[var(--border,#cbd5e1)] flex-wrap">
				<input
					type="text"
					value={guaranteeLetterNumber || ""}
					onChange={(e) => setGuaranteeLetterNumber?.(e.target.value)}
					placeholder="№ гарантийного письма"
					className="h-7 px-2 text-[11px] rounded-md border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] flex-1 min-w-[140px]"
					data-testid="input-tender-guarantee-letter"
				/>
				{insuranceAmount > 0 && (
					<button
						type="button"
						onClick={() => {
							const fallbackAmt = insuranceAmount;
							setInsuranceAmount?.(0);
							setCardAmount((prev) => prev + fallbackAmt);
							showToast(`ДМС переведен на оплату пациентом (карта): ${formatMoneyRu(fallbackAmt)}`, "info", 2000);
						}}
						className="h-7 px-2.5 rounded-md text-[11px] font-bold text-[var(--ink,#0f172a)] bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:bg-[var(--paper-hover,var(--paper-soft,#f8fafc))] cursor-pointer transition-colors"
						title="Отмена страхового покрытия и перевод на оплату картой пациентом"
						data-testid="btn-fallback-dms-to-patient"
					>
						Перевести на пациента
					</button>
				)}
			</div>
		</div>
	);
};

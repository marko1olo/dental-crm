import React from "react";

export interface FinanceTaxDeductionCardProps {
	taxDeductionEligibleRub?: number | null | undefined;
	money?: ((val: number | null) => string) | undefined;
	className?: string | undefined;
	onOpenCertificateModal?: (() => void) | undefined;
}

/**
 * FinanceTaxDeductionCard — Карточка расчета налогового вычета (13% / 15% НДФЛ, Код 01 / Код 02)
 * с безопасными отступами pb-3 и relaxed-интерлиньяжем для предотвращения обрезания текста.
 */
export const FinanceTaxDeductionCard: React.FC<FinanceTaxDeductionCardProps> = ({
	taxDeductionEligibleRub = null,
	money = (val) => (val !== null ? `${val.toLocaleString("ru-RU")} ₽` : "—"),
	className = "",
	onOpenCertificateModal,
}) => {
	const displayValue =
		taxDeductionEligibleRub !== null && taxDeductionEligibleRub !== undefined
			? money(taxDeductionEligibleRub)
			: "—";

	return (
		<article
			className={`finance-tax-deduction-card pb-3 flex flex-col justify-between gap-1.5 min-w-0 overflow-hidden ${className}`.trim()}
			data-testid="finance-tax-deduction-card"
		>
			<div className="finance-tax-card-header flex items-baseline justify-between gap-2 min-w-0 flex-wrap">
				<span className="text-[11px] font-bold text-[var(--muted)] shrink-0">Вычет</span>
				<strong className="font-mono tracking-tight tabular-nums text-[var(--ink)] whitespace-nowrap">{displayValue}</strong>
			</div>
			<p className="sr-only leading-relaxed text-xs text-[var(--muted)] m-0">
				медицинские услуги, пригодные для справки
			</p>
			{onOpenCertificateModal && (
				<button
					type="button"
					onClick={onOpenCertificateModal}
					className="finance-tax-cert-btn w-full max-w-full min-h-[44px] sm:min-h-[28px] px-2 py-1 text-[11px] font-medium text-[var(--primary)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] rounded-lg cursor-pointer inline-flex items-center justify-center text-center leading-snug whitespace-normal break-words transition-colors"
				>
					Сформировать справку для ФНС →
				</button>
			)}
		</article>
	);
};

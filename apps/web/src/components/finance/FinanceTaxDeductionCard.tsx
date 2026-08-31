import type React from "react";

export interface FinanceTaxDeductionCardProps {
	taxDeductionEligibleRub?: number | null | undefined;
	money?: (val: number | null) => string;
	className?: string;
	onOpenCertificateModal?: () => void;
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
	return (
		<article
			className={`finance-tax-deduction-card pb-3 flex flex-col justify-between ${className}`.trim()}
			data-testid="finance-tax-deduction-card"
		>
			<div>
				<span className="text-xs font-semibold text-[var(--muted,#64748b)]">Вычет</span>
				<strong className="block mt-1 text-2xl font-bold font-mono text-[var(--ink,#0f172a)]">
					{money(taxDeductionEligibleRub)}
				</strong>
			</div>
			<p className="leading-relaxed text-xs text-[var(--muted,#64748b)] mt-1.5 m-0">
				медицинские услуги, пригодные для справки
			</p>
			{onOpenCertificateModal && (
				<button
					type="button"
					onClick={onOpenCertificateModal}
					className="mt-2 text-xs font-semibold text-[var(--teal,var(--brand-primary))] hover:underline text-left cursor-pointer p-0 bg-transparent border-none"
				>
					Сформировать справку для ФНС →
				</button>
			)}
		</article>
	);
};

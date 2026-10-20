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
			className={`finance-tax-deduction-card pb-3 flex flex-col justify-between ${className}`.trim()}
			data-testid="finance-tax-deduction-card"
			style={{ display: "inline-flex", flexDirection: "row", alignItems: "center", gap: "8px", flexWrap: "nowrap" }}
		>
			<div className="finance-tax-card-header" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
				<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)" }}>Вычет:</span>
				<strong style={{ fontSize: "13px", fontWeight: 800, color: "var(--ink, #0f172a)" }}>{displayValue}</strong>
			</div>
			<p className="leading-relaxed text-xs text-[var(--muted,#64748b)] mt-1.5 m-0" style={{ display: "none" }}>
				медицинские услуги, пригодные для справки
			</p>
			{onOpenCertificateModal && (
				<button
					type="button"
					onClick={onOpenCertificateModal}
					className="finance-tax-cert-btn"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
						padding: "2px 8px",
						fontSize: "11px",
						fontWeight: 600,
						color: "var(--teal, #0d9488)",
						background: "var(--paper-soft, #f1f5f9)",
						border: "1px solid var(--line-subtle, var(--line, #e2e8f0))",
						borderRadius: "6px",
						cursor: "pointer",
						whiteSpace: "nowrap",
						marginLeft: "4px",
						transition: "all 0.15s ease",
					}}
				>
					Сформировать справку для ФНС →
				</button>
			)}
		</article>
	);
};

import React from "react";
import { DollarSign, Download } from "lucide-react";
import { formatRubles } from "../../patientCabinet/patientCabinetEngine.js";

export interface PlanTaxQuickCardProps {
	readonly paidCostRub: number;
	readonly estimatedTaxRefundRub: number;
	readonly onDownloadTax: () => void;
}

export const PlanTaxQuickCard: React.FC<PlanTaxQuickCardProps> = ({
	paidCostRub,
	estimatedTaxRefundRub,
	onDownloadTax,
}) => {
	if (paidCostRub <= 0) return null;

	return (
		<div
			className="pc-card tax-deduction-quick-card"
			data-testid="tax-deduction-quick-card"
			style={{
				backgroundColor: "var(--pc-surface, #1e293b)",
				border: "1px solid var(--pc-border, #334155)",
				borderRadius: "12px",
				padding: "14px 16px",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				flexWrap: "wrap",
				gap: "12px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<div
					style={{
						width: "36px",
						height: "36px",
						borderRadius: "8px",
						backgroundColor: "rgba(16, 185, 129, 0.15)",
						color: "var(--pc-success, #10b981)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
					}}
				>
					<DollarSign size={20} />
				</div>
				<div>
					<div style={{ fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
						Возврат 13% от оплаченного лечения (налоговый вычет):
					</div>
					<strong style={{ fontSize: "14px", color: "var(--pc-success, #10b981)" }}>
						~{formatRubles(estimatedTaxRefundRub)} к возврату на карту
					</strong>
				</div>
			</div>

			<button
				type="button"
				onClick={onDownloadTax}
				data-testid="plan-view-download-tax-btn"
				style={{
					minHeight: "44px",
					padding: "8px 16px",
					borderRadius: "8px",
					backgroundColor: "var(--pc-primary, #0d9488)",
					color: "var(--on-teal, #ffffff)",
					border: "none",
					fontSize: "13px",
					fontWeight: 700,
					cursor: "pointer",
					display: "inline-flex",
					alignItems: "center",
					gap: "6px",
					touchAction: "manipulation",
				}}
			>
				<Download size={16} />
				<span>Скачать справку для налоговой</span>
			</button>
		</div>
	);
};

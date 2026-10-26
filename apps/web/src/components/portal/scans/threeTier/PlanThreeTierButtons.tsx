import React from "react";
import { Check, Sparkles } from "lucide-react";
import { formatRubles, type ThreeTierOption } from "../../patientCabinet/patientCabinetEngine.js";

export interface PlanThreeTierButtonsProps {
	readonly tiers: readonly ThreeTierOption[];
	readonly selectedTierId: "basic" | "standard" | "premium";
	readonly onSelectTier: (tierId: "basic" | "standard" | "premium") => void;
}

export const PlanThreeTierButtons: React.FC<PlanThreeTierButtonsProps> = ({
	tiers,
	selectedTierId,
	onSelectTier,
}) => {
	return (
		<div
			className="three-tier-switcher-grid"
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
				gap: "10px",
			}}
		>
			{tiers.map((tier) => {
				const isSelected = selectedTierId === tier.tierId;
				const isDoctorChoice = tier.tierId === "standard";
				const tierDisplayName =
					tier.tierId === "standard" && !tier.tierNameRu.includes("Оптимум")
						? "Оптимум (Выбор врача)"
						: tier.tierNameRu;

				return (
					<button
						key={tier.tierId}
						type="button"
						onClick={() => onSelectTier(tier.tierId as "basic" | "standard" | "premium")}
						data-testid={`plan-tier-btn-${tier.tierId}`}
						style={{
							padding: "12px 14px",
							minHeight: "52px",
							borderRadius: "10px",
							border: `2px solid ${
								isSelected
									? "var(--pc-primary, #0d9488)"
									: isDoctorChoice
										? "rgba(13, 148, 136, 0.4)"
										: "var(--pc-border, #334155)"
							}`,
							backgroundColor: isSelected
								? "var(--pc-primary-light, rgba(13, 148, 136, 0.15))"
								: "var(--pc-surface, var(--paper-strong, #ffffff))",
							color: "var(--pc-text-main, var(--ink, #0f172a))",
							textAlign: "left",
							cursor: "pointer",
							display: "flex",
							flexDirection: "column",
							gap: "4px",
							transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
							touchAction: "manipulation",
							position: "relative",
							boxShadow: isSelected ? "0 0 12px rgba(13, 148, 136, 0.3)" : "none",
							transform: isSelected ? "scale(1.02)" : "scale(1)",
						}}
					>
						{isDoctorChoice && (
							<span
								style={{
									position: "absolute",
									top: "-9px",
									right: "8px",
									backgroundColor: "var(--pc-primary, #0d9488)",
									color: "var(--on-teal, #ffffff)",
									fontSize: "12px",
									fontWeight: 800,
									padding: "1px 6px",
									borderRadius: "8px",
									display: "inline-flex",
									alignItems: "center",
									gap: "3px",
									boxShadow: "0 2px 4px rgba(0, 0, 0, 0.25)",
								}}
							>
								<Sparkles size={10} />
								<span>Выбор врача</span>
							</span>
						)}

						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<strong style={{ fontSize: "13px", color: isSelected ? "var(--pc-primary, #0d9488)" : "inherit" }}>
								{tierDisplayName}
							</strong>
							{isSelected && <Check size={16} strokeWidth={3} style={{ color: "var(--pc-primary, #0d9488)" }} />}
						</div>

						<span style={{ fontSize: "16px", fontWeight: 800, color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
							{formatRubles(tier.totalCostRub)}
						</span>

						<span style={{ fontSize: "12px", color: isSelected ? "var(--pc-success, #10b981)" : "var(--pc-text-muted, #94a3b8)", fontWeight: 700 }}>
							Гарантия: {tier.warrantyMonths} мес.
						</span>
					</button>
				);
			})}
		</div>
	);
};

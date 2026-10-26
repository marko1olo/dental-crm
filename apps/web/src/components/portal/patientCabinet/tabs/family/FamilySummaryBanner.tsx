import React from "react";
import { CreditCard, Sparkles, Users } from "lucide-react";
import { formatRubles } from "../../patientCabinetEngine";

export interface FamilySummaryBannerProps {
	readonly membersCount: number;
	readonly familyBalance: number;
	readonly familyBonusPool: number;
}

export const FamilySummaryBanner: React.FC<FamilySummaryBannerProps> = ({
	membersCount,
	familyBalance,
	familyBonusPool,
}) => {
	const suffix = membersCount === 1 ? "родственник" : membersCount < 5 ? "родственника" : "родственников";

	return (
		<div
			className="pc-family-summary-banner"
			style={{
				background: "linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(14, 165, 233, 0.04) 100%)",
				border: "1px solid rgba(2, 132, 199, 0.2)",
				borderRadius: "12px",
				padding: "16px 20px",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Users size={20} style={{ color: "var(--pc-primary, #0284c7)" }} />
					<strong style={{ fontSize: "1.0625rem", color: "var(--pc-text-main, #0f172a)" }}>
						Семейный депозит и бонусный пул
					</strong>
				</div>
				<span
					style={{
						fontSize: "0.8125rem",
						fontWeight: 600,
						color: "var(--pc-primary, #0284c7)",
						background: "rgba(2, 132, 199, 0.12)",
						padding: "3px 10px",
						borderRadius: "9999px",
					}}
				>
					{membersCount} {suffix}
				</span>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
				<div style={{ background: "var(--pc-surface, #ffffff)", border: "1px solid var(--pc-border, #e2e8f0)", borderRadius: "8px", padding: "12px 14px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", color: "var(--pc-text-muted, #64748b)" }}>
						<CreditCard size={15} style={{ color: "#059669" }} />
						<span>Общий семейный счет</span>
					</div>
					<div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#059669", marginTop: "4px" }}>
						{formatRubles(familyBalance)}
					</div>
				</div>

				<div style={{ background: "var(--pc-surface, #ffffff)", border: "1px solid var(--pc-border, #e2e8f0)", borderRadius: "8px", padding: "12px 14px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", color: "var(--pc-text-muted, #64748b)" }}>
						<Sparkles size={15} style={{ color: "#d97706" }} />
						<span>Семейный бонусный пул</span>
					</div>
					<div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#d97706", marginTop: "4px" }}>
						{familyBonusPool.toLocaleString("ru-RU")} бонусов
					</div>
				</div>
			</div>

			<p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--pc-text-muted, #64748b)", lineHeight: 1.4 }}>
				Авторизованные члены семьи могут списывать средства с общего баланса для оплаты стоматологических услуг и процедур в клинике DENTE.
			</p>
		</div>
	);
};

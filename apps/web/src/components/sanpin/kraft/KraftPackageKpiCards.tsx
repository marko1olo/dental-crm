import React from "react";

export interface KraftPackageKpiCardsProps {
	readonly stats: {
		totalPacks: number;
		sterileValidCount: number;
		expiringSoonCount: number;
		expiredCount: number;
		recalledCount: number;
	};
}

export const KraftPackageKpiCards: React.FC<KraftPackageKpiCardsProps> = ({ stats }) => {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
				gap: "0.75rem",
			}}
		>
			<div className="kraft-panel-card" style={{ padding: "0.75rem" }}>
				<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
					Всего в партии
				</span>
				<span style={{ fontSize: "1.4rem", fontWeight: 800 }}>
					{stats.totalPacks} шт.
				</span>
			</div>
			<div className="kraft-panel-card" style={{ padding: "0.75rem" }}>
				<span style={{ fontSize: "0.75rem", color: "#059669" }}>
					Стерильно (валидно)
				</span>
				<span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#059669" }}>
					{stats.sterileValidCount} шт.
				</span>
			</div>
			<div className="kraft-panel-card" style={{ padding: "0.75rem" }}>
				<span style={{ fontSize: "0.75rem", color: "#d97706" }}>
					Истекает (≤7 дн.)
				</span>
				<span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#d97706" }}>
					{stats.expiringSoonCount} шт.
				</span>
			</div>
			<div className="kraft-panel-card" style={{ padding: "0.75rem" }}>
				<span style={{ fontSize: "0.75rem", color: "#dc2626" }}>
					Просрочено / Брак
				</span>
				<span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#dc2626" }}>
					{stats.expiredCount + stats.recalledCount} шт.
				</span>
			</div>
		</div>
	);
};

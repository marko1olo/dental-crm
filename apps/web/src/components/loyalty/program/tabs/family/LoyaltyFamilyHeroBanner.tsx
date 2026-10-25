import type React from "react";
import { Users } from "lucide-react";
import type { FamilyPoolResult } from "../../loyaltyEngine";

export interface LoyaltyFamilyHeroBannerProps {
	readonly familyPool: FamilyPoolResult;
	readonly isFamilyModeActive: boolean;
	readonly onToggleFamilyMode: () => void;
}

export const LoyaltyFamilyHeroBanner: React.FC<LoyaltyFamilyHeroBannerProps> = ({
	familyPool,
	isFamilyModeActive,
	onToggleFamilyMode,
}) => {
	return (
		<div
			style={{
				background: "linear-gradient(135deg, var(--ok-fg) 0%, var(--teal) 100%)",
				color: "var(--on-teal, var(--paper))",
				borderRadius: "1rem",
				padding: "1.5rem",
				marginBottom: "1.5rem",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
			}}
		>
			<div>
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "0.375rem",
						background: "rgba(255, 255, 255, 0.2)",
						padding: "0.25rem 0.625rem",
						borderRadius: "9999px",
						fontSize: "0.75rem",
						fontWeight: 700,
					}}
				>
					<Users size={14} />
					{familyPool.effectiveTier.badgeLabelRu}
				</div>
				<h3 style={{ fontSize: "1.375rem", fontWeight: 700, marginTop: "0.375rem" }}>
					{familyPool.familyName}
				</h3>
				<p style={{ fontSize: "0.8125rem", opacity: 0.9 }}>
					Единый счет: повышенный кэшбэк {familyPool.effectiveTier.cashbackPercent}% за
					визиты всех членов семьи.
				</p>
			</div>
			<div style={{ textAlign: "right" }}>
				<div style={{ fontSize: "0.8125rem", opacity: 0.9 }}>Общий баланс семьи</div>
				<div style={{ fontSize: "2.25rem", fontWeight: 800 }}>
					{familyPool.totalPooledPoints.toLocaleString("ru-RU")} ₽
				</div>
				<button
					type="button"
					onClick={onToggleFamilyMode}
					style={{
						marginTop: "0.5rem",
						padding: "0.375rem 0.875rem",
						minHeight: "44px",
						borderRadius: "0.5rem",
						border: "1px solid var(--on-teal, var(--paper))",
						background: isFamilyModeActive ? "var(--on-teal, var(--paper))" : "transparent",
						color: isFamilyModeActive
							? "var(--ok-fg, var(--teal))"
							: "var(--on-teal, var(--paper))",
						fontSize: "0.8125rem",
						fontWeight: 700,
						cursor: "pointer",
					}}
				>
					{isFamilyModeActive ? "Семейный режим включен" : "Включить семейный счет"}
				</button>
			</div>
		</div>
	);
};

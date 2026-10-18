/**
 * DENTE CRM — Patient Health Index Card
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo } from "react";
import { ShieldCheck } from "lucide-react";
import type { DentalHealthIndexResult } from "../patientFriendlyOdontogramEngine";

export interface PatientHealthIndexCardProps {
	readonly healthIndex: DentalHealthIndexResult;
}

export const PatientHealthIndexCard: React.FC<PatientHealthIndexCardProps> = memo(({ healthIndex }) => {
	const isExcellent = healthIndex.sanitationPercent >= 90;
	const accentColor = isExcellent ? "var(--pc-success, #10b981)" : "var(--pc-primary, #0d9488)";
	const accentLight = isExcellent ? "rgba(16, 185, 129, 0.15)" : "rgba(13, 148, 136, 0.15)";

	return (
		<div
			className="pc-card dental-health-index-card"
			data-testid="dental-health-index-card"
			style={{
				backgroundColor: "var(--pc-surface, #1e293b)",
				border: `1.5px solid ${accentColor}`,
				borderRadius: "12px",
				padding: "14px 16px",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<ShieldCheck size={20} style={{ color: accentColor, flexShrink: 0 }} />
					<div>
						<strong style={{ fontSize: "15px", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
							Интерактивный индекс здоровья зубов
						</strong>
						<div style={{ fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
							{healthIndex.statusLabelRu} &bull; Клиническая формула FDI (32 зуба)
						</div>
					</div>
				</div>

				<span
					data-testid="sanitation-percent-badge"
					style={{
						backgroundColor: accentLight,
						color: accentColor,
						border: `1.5px solid ${accentColor}`,
						padding: "4px 10px",
						borderRadius: "12px",
						fontWeight: 800,
						fontSize: "13px",
					}}
				>
					Здоровье зубов: {healthIndex.sanitationPercent}%
				</span>
			</div>

			<div
				data-testid="dental-health-summary-banner"
				style={{
					backgroundColor: "var(--pc-bg, #0f172a)",
					border: "1px solid var(--pc-border, #334155)",
					borderRadius: "8px",
					padding: "10px 12px",
					fontSize: "13px",
					fontWeight: 700,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "8px",
				}}
			>
				<span style={{ color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
					{healthIndex.formattedIndexRu}
					{healthIndex.inTreatmentCount > 0 ? ` • В процессе ${healthIndex.inTreatmentCount}` : ""}
				</span>
				<span style={{ fontSize: "12px", color: "var(--pc-success, #10b981)", fontWeight: 600 }}>
					Цель: 100% здоровые зубы
				</span>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
				<div className="pc-progress-bar-bg" style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
					<div
						className="pc-progress-bar-fill"
						style={{
							width: `${healthIndex.sanitationPercent}%`,
							height: "100%",
							backgroundColor: accentColor,
							transition: "width 0.4s ease",
						}}
					/>
				</div>
				<div style={{ fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)", lineHeight: "1.3" }}>
					{healthIndex.encouragingNoteRu}
				</div>
			</div>
		</div>
	);
});

PatientHealthIndexCard.displayName = "PatientHealthIndexCard";

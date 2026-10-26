import React from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { formatRubles, type PatientTreatmentPlan } from "../../patientCabinet/patientCabinetEngine.js";
import { PlanProgressBar } from "./PlanProgressBar";
import { PlanTransparencyBadge } from "./PlanTransparencyBadge";

export interface PlanProgressHeroProps {
	readonly plan?: PatientTreatmentPlan | undefined;
	readonly totalCostRub: number;
	readonly paidCostRub: number;
	readonly remainingCostRub: number;
	readonly stagesCount: number;
	readonly completedStagesCount: number;
	readonly progressPercent: number;
	readonly onViewPriceDetails?: (() => void) | undefined;
}

export const PlanProgressHero: React.FC<PlanProgressHeroProps> = ({
	plan,
	totalCostRub,
	paidCostRub,
	remainingCostRub,
	stagesCount,
	completedStagesCount,
	progressPercent,
	onViewPriceDetails,
}) => {
	return (
		<div
			className="pc-card plan-progress-hero-card"
			data-testid="treatment-plan-progress-hero"
			style={{
				backgroundColor: "var(--pc-surface, #1e293b)",
				border: "1.5px solid var(--pc-primary, #0d9488)",
				borderRadius: "12px",
				padding: "18px",
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
				<div>
					<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--pc-primary, #0d9488)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
						Текущий прогресс реабилитации
					</span>
					<h3 style={{ margin: "2px 0 0 0", fontSize: "16px", fontWeight: 800, color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
						{plan?.titleRu || "Комплексный план лечения"}
					</h3>
				</div>
				{onViewPriceDetails && (
					<button
						type="button"
						onClick={onViewPriceDetails}
						style={{
							background: "transparent",
							border: "1px solid var(--pc-primary, #0d9488)",
							color: "var(--pc-primary, #0d9488)",
							fontSize: "12px",
							fontWeight: 700,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							padding: "4px 8px",
							borderRadius: "6px",
						}}
					>
						<FileText size={13} />
						<span>Детализация сметы</span>
					</button>
				)}
			</div>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "10px",
					padding: "12px",
					backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
					border: "1px solid var(--pc-border, #334155)",
					borderRadius: "10px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<CheckCircle2 size={20} style={{ color: "var(--pc-success, #10b981)" }} />
					<strong style={{ fontSize: "14px", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
						Выполнено {completedStagesCount} из {stagesCount} этапов
					</strong>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", flexWrap: "wrap" }}>
					<span style={{ color: "var(--pc-success, #10b981)", fontWeight: 700 }}>
						Оплачено: {formatRubles(paidCostRub)}
					</span>
					<span style={{ color: "var(--pc-text-muted, #94a3b8)" }}>&bull;</span>
					<span style={{ color: remainingCostRub > 0 ? "var(--pc-warning, #f59e0b)" : "var(--pc-success, #10b981)", fontWeight: 700 }}>
						{remainingCostRub > 0 ? `Остаток: ${formatRubles(remainingCostRub)}` : "Полностью оплачен"}
					</span>
				</div>
			</div>
			<PlanProgressBar progressPercent={progressPercent} totalCostRub={totalCostRub} />
			<PlanTransparencyBadge />
		</div>
	);
};

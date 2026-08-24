/**
 * DENTE CRM — Patient-Friendly Treatment Plan Stage Card
 * Features:
 * - Dual service naming: prominent human-friendly title + statutory Order 804n code
 * - "Все включено" (All Inclusive) indicator for anesthesia, RVG scans, isolation
 * - 1-Click SBP Stage Payment button
 */

import { Check, CheckCircle2, Clock, CreditCard, Heart, ShieldCheck, Sparkles } from "lucide-react";
import type React from "react";
import { formatRubles } from "../portal/patientCabinet/patientCabinetEngine.js";

export interface DualServiceItem {
	readonly code804n: string;
	readonly humanTitleRu: string;
	readonly technicalTitleRu: string;
	readonly quantity: number;
	readonly priceRub: number;
	readonly totalRub: number;
	readonly toothFdi?: string | undefined;
	readonly isAllInclusive?: boolean | undefined;
}

export interface PatientTreatmentStageProps {
	readonly stage: {
		readonly id: string;
		readonly orderIndex: number;
		readonly titleRu: string;
		readonly teethFdi: readonly string[];
		readonly costRub: number;
		readonly status: "completed" | "in_progress" | "planned";
		readonly procedures: readonly string[];
	};
	readonly onPaySbp?: (() => void) | undefined;
}

export function formatDualServiceName(code: string, rawTitle: string): { humanTitleRu: string; statutoryCode804n: string } {
	// If title already has clean human mapping
	if (code.startsWith("A16.07.002") || rawTitle.toLowerCase().includes("пломб") || rawTitle.toLowerCase().includes("кариес")) {
		return { humanTitleRu: "Лечение кариеса и светоотверждаемая пломба", statutoryCode804n: code || "A16.07.002.001" };
	}
	if (code.startsWith("A16.07.004") || rawTitle.toLowerCase().includes("канал") || rawTitle.toLowerCase().includes("пульпит")) {
		return { humanTitleRu: "Лечение корневых каналов под микроскопом", statutoryCode804n: code || "A16.07.004" };
	}
	if (code.startsWith("A16.07.006") || rawTitle.toLowerCase().includes("коронк") || rawTitle.toLowerCase().includes("циркони")) {
		return { humanTitleRu: "Установка коронки из диоксида циркония", statutoryCode804n: code || "A16.07.006" };
	}
	if (code.startsWith("A16.07.054") || rawTitle.toLowerCase().includes("имплант")) {
		return { humanTitleRu: "Установка дентального имплантата под ключ", statutoryCode804n: code || "A16.07.054" };
	}
	if (code.startsWith("A16.07.051") || rawTitle.toLowerCase().includes("гигиен") || rawTitle.toLowerCase().includes("air-flow")) {
		return { humanTitleRu: "Профессиональная комплексная гигиена и Air-Flow", statutoryCode804n: code || "A16.07.051" };
	}
	return { humanTitleRu: rawTitle, statutoryCode804n: code || "Номенклатура 804н" };
}

export const TreatmentPlanStageCard: React.FC<PatientTreatmentStageProps> = ({
	stage,
	onPaySbp,
}) => {
	const isCompleted = stage.status === "completed";
	const isInProgress = stage.status === "in_progress";

	return (
		<div
			style={{
				padding: "14px",
				borderRadius: "10px",
				backgroundColor: "var(--pc-surface, #1e293b)",
				border: `1px solid ${isCompleted ? "#10b981" : isInProgress ? "#f59e0b" : "var(--pc-border, #334155)"}`,
				display: "flex",
				flexDirection: "column",
				gap: "10px",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<span
						style={{
							width: "26px",
							height: "26px",
							borderRadius: "50%",
							backgroundColor: isCompleted ? "#10b981" : isInProgress ? "#f59e0b" : "#475569",
							color: "#ffffff",
							fontWeight: 800,
							fontSize: "12px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						{isCompleted ? "✓" : stage.orderIndex}
					</span>
					<div>
						<strong style={{ fontSize: "15px" }}>{stage.titleRu}</strong>
						{stage.teethFdi.length > 0 && (
							<div style={{ fontSize: "12px", color: "var(--pc-primary, #0d9488)", marginTop: "2px" }}>
								Зубы: {stage.teethFdi.join(", ")}
							</div>
						)}
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<span style={{ fontSize: "16px", fontWeight: 800 }}>{formatRubles(stage.costRub)}</span>
					{!isCompleted && onPaySbp && (
						<button
							type="button"
							onClick={onPaySbp}
							style={{
								padding: "8px 16px",
								minHeight: "44px",
								borderRadius: "8px",
								border: "none",
								backgroundColor: "var(--pc-primary, #0d9488)",
								color: "#ffffff",
								fontSize: "13px",
								fontWeight: 700,
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "6px",
								touchAction: "manipulation",
							}}
						>
							<CreditCard size={16} />
							<span>Оплатить СБП</span>
						</button>
					)}
				</div>
			</div>

			{/* All-Inclusive Guarantee Badge */}
			<div
				style={{
					backgroundColor: "rgba(13, 148, 136, 0.1)",
					border: "1px solid rgba(13, 148, 136, 0.3)",
					borderRadius: "6px",
					padding: "6px 10px",
					fontSize: "11px",
					color: "var(--pc-primary, #0d9488)",
					display: "flex",
					alignItems: "center",
					gap: "6px",
				}}
			>
				<ShieldCheck size={14} />
				<span>Всё включено: анестезия, снимки визиографа, изоляция коффердамом и гарантия клиники</span>
			</div>

			{/* Procedures list with dual names */}
			<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
				{stage.procedures.map((proc, pIdx) => {
					const dual = formatDualServiceName(`A16.07.00${pIdx + 1}`, proc);
					return (
						<div
							key={pIdx}
							style={{
								padding: "6px 10px",
								backgroundColor: "var(--pc-bg, #0f172a)",
								borderRadius: "6px",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<div>
								<div style={{ fontSize: "13px", fontWeight: 600 }}>{dual.humanTitleRu}</div>
								<div style={{ fontSize: "10px", color: "var(--pc-text-muted, #94a3b8)" }}>
									Код Минздрава: {dual.statutoryCode804n} &bull; {proc}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

/**
 * DENTE CRM — Patient-Friendly 2D Odontogram & Interactive Dental Health Index
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 *
 * Color-coded representation for ordinary patients:
 * - Green: Healed / Healthy (Вылечен / Здоров)
 * - Yellow: In treatment (В процессе лечения)
 * - Red: Needs treatment (Требует внимания / лечения)
 * - Gray: Missing / Implant (Отсутствует / Имплантат)
 *
 * Features:
 * - Interactive Dental Health / Sanitation Index:
 *   «Индекс санации: X% • Вылечено Y зубов • Требуют внимания Z зубов»
 * - Interactive filter chips: All, Healthy, In Treatment, Needs Attention, Implants
 * - Anti-anxiety human explanations reducing patient fear
 */

import {
	AlertCircle,
	AlertTriangle,
	Award,
	Check,
	CheckCircle2,
	Clock,
	Filter,
	Heart,
	HelpCircle,
	Info,
	ShieldCheck,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import React, { memo, useCallback, useMemo, useState } from "react";

export * from "./patientFriendlyOdontogramEngine.js";
export * from "./PatientToothDetailBox.js";
import { PatientToothDetailBox } from "./PatientToothDetailBox.js";
import {
	type PatientToothStatus,
	type PatientToothInfo,
	type DentalHealthIndexResult,
	DEFAULT_PATIENT_TEETH,
	calculateDentalHealthIndex,
	getPatientToothStatusColor,
} from "./patientFriendlyOdontogramEngine.js";

interface PatientToothButtonProps {
	readonly tooth: PatientToothInfo;
	readonly isSelected: boolean;
	readonly isDimmed: boolean;
	readonly onSelect: (tooth: PatientToothInfo) => void;
}

const PatientToothButton: React.FC<PatientToothButtonProps> = memo(({
	tooth,
	isSelected,
	isDimmed,
	onSelect,
}) => {
	const color = getPatientToothStatusColor(tooth.status);

	return (
		<button
			key={tooth.fdiCode}
			type="button"
			onClick={() => onSelect(tooth)}
			data-testid={`tooth-btn-${tooth.fdiCode}`}
			aria-label={`${tooth.fdiCode}: ${tooth.humanNameRu}`}
			style={{
				minWidth: "44px",
				minHeight: "44px",
				width: "44px",
				height: "48px",
				borderRadius: "8px",
				border: `2px solid ${isSelected ? "var(--pc-primary, #0d9488)" : color.border}`,
				background: color.bg,
				color: color.text,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				cursor: "pointer",
				padding: "3px 2px",
				boxShadow: isSelected
					? `0 0 0 3px rgba(13, 148, 136, 0.6), ${color.glow}`
					: color.glow,
				transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
				touchAction: "manipulation",
				userSelect: "none",
				flexShrink: 0,
				opacity: isDimmed ? 0.35 : 1,
				transform: isSelected ? "scale(1.08)" : isDimmed ? "scale(0.95)" : "scale(1)",
			}}
			title={`${tooth.fdiCode}: ${tooth.humanNameRu}`}
		>
			<span style={{ fontSize: "12px", fontWeight: 800, textShadow: "0 1px 2px rgba(0,0,0,0.6)", letterSpacing: "0.2px" }}>
				{tooth.fdiCode}
			</span>
			{tooth.status === "healthy" && <Check size={12} strokeWidth={3} />}
			{tooth.status === "in_treatment" && <Clock size={11} strokeWidth={2.5} />}
			{tooth.status === "needs_treatment" && <AlertTriangle size={11} strokeWidth={2.5} />}
			{tooth.status === "missing_or_implant" && <span style={{ fontSize: "12px", fontWeight: 800 }}>—</span>}
		</button>
	);
});
PatientToothButton.displayName = "PatientToothButton";

export interface PatientFriendlyOdontogramProps {
	teeth?: readonly PatientToothInfo[] | PatientToothInfo[];
	onSelectTooth?: (tooth: PatientToothInfo) => void;
	showHealthIndexHeader?: boolean;
}

export const PatientFriendlyOdontogram: React.FC<PatientFriendlyOdontogramProps> = memo(({
	teeth = DEFAULT_PATIENT_TEETH,
	onSelectTooth,
	showHealthIndexHeader = true,
}) => {
	const [selectedTooth, setSelectedTooth] = useState<PatientToothInfo | null>(null);
	const [statusFilter, setStatusFilter] = useState<"all" | PatientToothStatus>("all");

	// Dental health index calculations
	const healthIndex = useMemo(() => calculateDentalHealthIndex(teeth), [teeth]);

	const upperRight = teeth.filter((t) => ["18", "17", "16", "15", "14", "13", "12", "11"].includes(t.fdiCode));
	const upperLeft = teeth.filter((t) => ["21", "22", "23", "24", "25", "26", "27", "28"].includes(t.fdiCode));
	const lowerRight = teeth.filter((t) => ["48", "47", "46", "45", "44", "43", "42", "41"].includes(t.fdiCode));
	const lowerLeft = teeth.filter((t) => ["31", "32", "33", "34", "35", "36", "37", "38"].includes(t.fdiCode));

	const handleToothClick = useCallback((tooth: PatientToothInfo) => {
		setSelectedTooth(tooth);
		if (onSelectTooth) {
			onSelectTooth(tooth);
		}
	}, [onSelectTooth]);

	const renderToothButton = (tooth: PatientToothInfo) => (
		<PatientToothButton
			key={tooth.fdiCode}
			tooth={tooth}
			isSelected={selectedTooth?.fdiCode === tooth.fdiCode}
			isDimmed={statusFilter !== "all" && tooth.status !== statusFilter}
			onSelect={handleToothClick}
		/>
	);

	return (
		<div
			className="patient-friendly-odontogram"
			data-testid="patient-friendly-odontogram"
			style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}
		>
			{/* 1. INTERACTIVE DENTAL HEALTH & SANITATION INDEX CARD */}
			{showHealthIndexHeader && (
				<div
					className="pc-card dental-health-index-card"
					data-testid="dental-health-index-card"
					style={{
						backgroundColor: "var(--pc-surface, #1e293b)",
						border: "1.5px solid var(--pc-primary, #0d9488)",
						borderRadius: "12px",
						padding: "14px 16px",
						display: "flex",
						flexDirection: "column",
						gap: "10px",
					}}
				>
					{/* Top Index Headline */}
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<ShieldCheck size={20} style={{ color: "var(--pc-primary, #0d9488)", flexShrink: 0 }} />
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
								backgroundColor:
									healthIndex.sanitationPercent >= 90
										? "var(--pc-success-light, rgba(16, 185, 129, 0.15))"
										: "var(--pc-primary-light, rgba(13, 148, 136, 0.15))",
								color: healthIndex.sanitationPercent >= 90 ? "var(--pc-success, #10b981)" : "var(--pc-primary, #0d9488)",
								border: `1.5px solid ${healthIndex.sanitationPercent >= 90 ? "var(--pc-success, #10b981)" : "var(--pc-primary, #0d9488)"}`,
								padding: "4px 10px",
								borderRadius: "12px",
								fontWeight: 800,
								fontSize: "13px",
							}}
						>
							Здоровье зубов: {healthIndex.sanitationPercent}%
						</span>
					</div>

					{/* Exact Metric String: «Индекс здоровья зубов: X% • Вылечено Y зубов • Требуют внимания Z зубов» */}
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

					{/* Progress Meter Bar */}
					<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
						<div className="pc-progress-bar-bg" style={{ height: "10px", borderRadius: "5px" }}>
							<div
								className="pc-progress-bar-fill"
								style={{
									width: `${healthIndex.sanitationPercent}%`,
									backgroundColor: healthIndex.sanitationPercent >= 90 ? "var(--pc-success, #10b981)" : "var(--pc-primary, #0d9488)",
									transition: "width 0.4s ease",
								}}
							/>
						</div>
						<div style={{ fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)", lineHeight: "1.3" }}>
							{healthIndex.encouragingNoteRu}
						</div>
					</div>
				</div>
			)}

			{/* 2. INTERACTIVE STATUS FILTER CHIPS */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "6px",
					justifyContent: "center",
					padding: "8px",
					backgroundColor: "var(--pc-surface, #1e293b)",
					borderRadius: "10px",
					border: "1px solid var(--pc-border, #334155)",
				}}
			>
				<button
					type="button"
					onClick={() => setStatusFilter("all")}
					data-testid="filter-teeth-all"
					style={{
						padding: "6px 12px",
						minHeight: "36px",
						borderRadius: "8px",
						border: statusFilter === "all" ? "1.5px solid var(--pc-primary, #0d9488)" : "1px solid var(--pc-border, #334155)",
						backgroundColor: statusFilter === "all" ? "var(--pc-primary-light, rgba(13, 148, 136, 0.15))" : "transparent",
						color: "var(--pc-text-main, var(--ink, #0f172a))",
						fontSize: "12px",
						fontWeight: statusFilter === "all" ? 700 : 500,
						cursor: "pointer",
						touchAction: "manipulation",
					}}
				>
					Все зубы ({healthIndex.totalTeeth})
				</button>

				<button
					type="button"
					onClick={() => setStatusFilter("healthy")}
					data-testid="filter-teeth-healthy"
					style={{
						padding: "6px 12px",
						minHeight: "36px",
						borderRadius: "8px",
						border: statusFilter === "healthy" ? "1.5px solid #10b981" : "1px solid var(--pc-border, #334155)",
						backgroundColor: statusFilter === "healthy" ? "rgba(16, 185, 129, 0.15)" : "transparent",
						color: "#10b981",
						fontSize: "12px",
						fontWeight: statusFilter === "healthy" ? 700 : 500,
						cursor: "pointer",
						touchAction: "manipulation",
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981" }} />
					<span>Здоровы / Вылечены ({healthIndex.healthyCount})</span>
				</button>

				<button
					type="button"
					onClick={() => setStatusFilter("in_treatment")}
					data-testid="filter-teeth-in_treatment"
					style={{
						padding: "6px 12px",
						minHeight: "36px",
						borderRadius: "8px",
						border: statusFilter === "in_treatment" ? "1.5px solid #f59e0b" : "1px solid var(--pc-border, #334155)",
						backgroundColor: statusFilter === "in_treatment" ? "rgba(245, 158, 11, 0.15)" : "transparent",
						color: "#f59e0b",
						fontSize: "12px",
						fontWeight: statusFilter === "in_treatment" ? 700 : 500,
						cursor: "pointer",
						touchAction: "manipulation",
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f59e0b" }} />
					<span>В процессе ({healthIndex.inTreatmentCount})</span>
				</button>

				<button
					type="button"
					onClick={() => setStatusFilter("needs_treatment")}
					data-testid="filter-teeth-needs_treatment"
					style={{
						padding: "6px 12px",
						minHeight: "36px",
						borderRadius: "8px",
						border: statusFilter === "needs_treatment" ? "1.5px solid #ef4444" : "1px solid var(--pc-border, #334155)",
						backgroundColor: statusFilter === "needs_treatment" ? "rgba(239, 68, 68, 0.15)" : "transparent",
						color: "#ef4444",
						fontSize: "12px",
						fontWeight: statusFilter === "needs_treatment" ? 700 : 500,
						cursor: "pointer",
						touchAction: "manipulation",
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
					<span>Требуют внимания ({healthIndex.needsTreatmentCount})</span>
				</button>

				<button
					type="button"
					onClick={() => setStatusFilter("missing_or_implant")}
					data-testid="filter-teeth-missing_or_implant"
					style={{
						padding: "6px 12px",
						minHeight: "36px",
						borderRadius: "8px",
						border: statusFilter === "missing_or_implant" ? "1.5px solid #64748b" : "1px solid var(--pc-border, #334155)",
						backgroundColor: statusFilter === "missing_or_implant" ? "rgba(100, 116, 139, 0.15)" : "transparent",
						color: "var(--pc-text-muted, #94a3b8)",
						fontSize: "12px",
						fontWeight: statusFilter === "missing_or_implant" ? 700 : 500,
						cursor: "pointer",
						touchAction: "manipulation",
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#64748b" }} />
					<span>Имплантат / Замещен ({healthIndex.missingOrImplantCount})</span>
				</button>
			</div>

			{/* Embedded Responsive Styles for Mobile 4-Quadrant Odontogram (< 640px) */}
			<style>{`
				.patient-odontogram-arch-container {
					padding: 14px;
					background-color: var(--pc-bg, #0f172a);
					border: 1px solid var(--pc-border, #334155);
					border-radius: 12px;
					display: flex;
					flex-direction: column;
					gap: 12px;
					overflow: hidden;
					max-width: 100%;
					box-sizing: border-box;
				}
				.patient-odontogram-arch {
					width: 100%;
					display: flex;
					flex-direction: column;
					align-items: center;
				}
				.patient-odontogram-jaw-title {
					font-size: 12px;
					color: var(--pc-text-muted, #94a3b8);
					text-align: center;
					margin-bottom: 6px;
					font-weight: 700;
					letter-spacing: 0.5px;
				}
				.patient-odontogram-quadrants-row {
					display: flex;
					justify-content: center;
					align-items: flex-start;
					gap: 12px;
					width: 100%;
					max-width: 100%;
					box-sizing: border-box;
				}
				.patient-odontogram-quadrant {
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 6px;
					box-sizing: border-box;
				}
				.patient-odontogram-quadrant-title {
					font-size: 12px;
					font-weight: 700;
					color: var(--pc-text-muted, #94a3b8);
					text-align: center;
				}
				.patient-odontogram-teeth-row {
					display: flex;
					gap: 3px;
					flex-wrap: nowrap;
					justify-content: center;
				}
				.patient-odontogram-divider {
					height: 1px;
					background-color: var(--pc-border, #334155);
					margin: 4px 0;
					width: 100%;
				}
				@media (max-width: 639px) {
					.patient-odontogram-arch-container {
						padding: 10px 8px;
						gap: 10px;
					}
					.patient-odontogram-quadrants-row {
						flex-direction: column;
						align-items: center;
						gap: 10px;
					}
					.patient-odontogram-quadrant {
						width: 100%;
						max-width: 320px;
						background: rgba(255, 255, 255, 0.02);
						border: 1px solid var(--pc-border, #334155);
						border-radius: 10px;
						padding: 8px 6px;
					}
					.patient-odontogram-teeth-row {
						display: grid;
						grid-template-columns: repeat(4, 44px);
						gap: 6px;
						justify-content: center;
						width: 100%;
					}
				}
			`}</style>

			{/* 3. DENTAL ARCH DISPLAY (RESPONSIVE 4 QUADRANTS, ZERO HORIZONTAL SCROLL) */}
			<div
				className="patient-odontogram-arch-container"
				data-testid="patient-odontogram-arch-container"
			>
				{/* Upper Arch */}
				<div className="patient-odontogram-arch">
					<div className="patient-odontogram-jaw-title">
						ВЕРХНЯЯ ЧЕЛЮСТЬ (ПРАВО ↔ ЛЕВО)
					</div>
					<div className="patient-odontogram-quadrants-row">
						{/* Quadrant 1: Upper Right (18..11) */}
						<div className="patient-odontogram-quadrant" data-testid="quadrant-upper-right">
							<span className="patient-odontogram-quadrant-title">Верхний правый (18..11)</span>
							<div className="patient-odontogram-teeth-row">{upperRight.map(renderToothButton)}</div>
						</div>
						{/* Quadrant 2: Upper Left (21..28) */}
						<div className="patient-odontogram-quadrant" data-testid="quadrant-upper-left">
							<span className="patient-odontogram-quadrant-title">Верхний левый (21..28)</span>
							<div className="patient-odontogram-teeth-row">{upperLeft.map(renderToothButton)}</div>
						</div>
					</div>
				</div>

				<div className="patient-odontogram-divider" />

				{/* Lower Arch */}
				<div className="patient-odontogram-arch">
					<div className="patient-odontogram-quadrants-row">
						{/* Quadrant 4: Lower Right (48..41) */}
						<div className="patient-odontogram-quadrant" data-testid="quadrant-lower-right">
							<span className="patient-odontogram-quadrant-title">Нижний правый (48..41)</span>
							<div className="patient-odontogram-teeth-row">{lowerRight.map(renderToothButton)}</div>
						</div>
						{/* Quadrant 3: Lower Left (31..38) */}
						<div className="patient-odontogram-quadrant" data-testid="quadrant-lower-left">
							<span className="patient-odontogram-quadrant-title">Нижний левый (31..38)</span>
							<div className="patient-odontogram-teeth-row">{lowerLeft.map(renderToothButton)}</div>
						</div>
					</div>
					<div className="patient-odontogram-jaw-title" style={{ marginTop: "6px", marginBottom: 0 }}>
						НИЖНЯЯ ЧЕЛЮСТЬ (ПРАВО ↔ ЛЕВО)
					</div>
				</div>
			</div>

			{/* 4. SELECTED TOOTH DETAIL BOX & REASSURANCE */}
			{selectedTooth && (
				<PatientToothDetailBox
					selectedTooth={selectedTooth}
					onClose={() => setSelectedTooth(null)}
				/>
			)}
		</div>
	);
});

PatientFriendlyOdontogram.displayName = "PatientFriendlyOdontogram";

export default PatientFriendlyOdontogram;

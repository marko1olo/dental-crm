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
	Filter,
	Heart,
	HelpCircle,
	Info,
	ShieldCheck,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";

export type PatientToothStatus = "healthy" | "in_treatment" | "needs_treatment" | "missing_or_implant";

export interface PatientToothInfo {
	readonly fdiCode: string;
	readonly status: PatientToothStatus;
	readonly humanNameRu: string;
	readonly clinicalStateRu: string;
	readonly procedureDescriptionRu?: string | undefined;
	readonly plannedStageTitleRu?: string | undefined;
	readonly warrantyActive?: boolean | undefined;
}

export interface DentalHealthIndexResult {
	readonly totalTeeth: number;
	readonly healthyCount: number;
	readonly inTreatmentCount: number;
	readonly needsTreatmentCount: number;
	readonly missingOrImplantCount: number;
	readonly sanitationPercent: number; // 0..100%
	readonly formattedIndexRu: string; // "Индекс санации: 78% • Вылечено 22 зуба • Требуют внимания 2 зуба"
	readonly badgeStatus: "excellent" | "good" | "needs_attention";
	readonly statusLabelRu: string;
	readonly encouragingNoteRu: string;
}

export const HUMAN_TOOTH_NAMES: Record<string, string> = {
	// Upper Right (18..11)
	"18": "Верхний правый зуб мудрости",
	"17": "Верхний правый 2-й жевательный зуб",
	"16": "Верхний правый 1-й жевательный зуб (шестерка)",
	"15": "Верхний правый 2-й малый жевательный зуб (премоляр)",
	"14": "Верхний правый 1-й малый жевательный зуб (премоляр)",
	"13": "Верхний правый клык",
	"12": "Верхний правый боковой резец",
	"11": "Верхний правый передний центральный резец",

	// Upper Left (21..28)
	"21": "Верхний левый передний центральный резец",
	"22": "Верхний левый боковой резец",
	"23": "Верхний левый клык",
	"24": "Верхний левый 1-й малый жевательный зуб (премоляр)",
	"25": "Верхний левый 2-й малый жевательный зуб (премоляр)",
	"26": "Верхний левый 1-й жевательный зуб (шестерка)",
	"27": "Верхний левый 2-й жевательный зуб",
	"28": "Верхний левый зуб мудрости",

	// Lower Left (31..38)
	"31": "Нижний левый передний центральный резец",
	"32": "Нижний левый боковой резец",
	"33": "Нижний левый клык",
	"34": "Нижний левый 1-й малый жевательный зуб (премоляр)",
	"35": "Нижний левый 2-й малый жевательный зуб (премоляр)",
	"36": "Нижний левый 1-й жевательный зуб (шестерка)",
	"37": "Нижний левый 2-й жевательный зуб",
	"38": "Нижний левый зуб мудрости",

	// Lower Right (48..41)
	"48": "Нижний правый зуб мудрости",
	"47": "Нижний правый 2-й жевательный зуб",
	"46": "Нижний правый 1-й жевательный зуб (шестерка)",
	"45": "Нижний правый 2-й малый жевательный зуб (премоляр)",
	"44": "Нижний правый 1-й малый жевательный зуб (премоляр)",
	"43": "Нижний правый клык",
	"42": "Нижний правый боковой резец",
	"41": "Нижний правый передний центральный резец",
};

export const DEFAULT_PATIENT_TEETH: readonly PatientToothInfo[] = [
	{ fdiCode: "18", status: "healthy", humanNameRu: "Верхний правый зуб мудрости", clinicalStateRu: "Здоров, прорезался правильно" },
	{ fdiCode: "17", status: "healthy", humanNameRu: "Верхний правый 2-й жевательный зуб", clinicalStateRu: "Здоров, пломб нет" },
	{ fdiCode: "16", status: "healthy", humanNameRu: "Верхний правый 1-й жевательный зуб (шестерка)", clinicalStateRu: "Вылечен: установлена коронка из диоксида циркония", warrantyActive: true },
	{ fdiCode: "15", status: "healthy", humanNameRu: "Верхний правый 2-й малый жевательный зуб", clinicalStateRu: "Световая пломба Estelite, краевое прилегание идеальное" },
	{ fdiCode: "14", status: "healthy", humanNameRu: "Верхний правый 1-й малый жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "13", status: "healthy", humanNameRu: "Верхний правый клык", clinicalStateRu: "Здоров" },
	{ fdiCode: "12", status: "healthy", humanNameRu: "Верхний правый боковой резец", clinicalStateRu: "Здоров" },
	{ fdiCode: "11", status: "healthy", humanNameRu: "Верхний правый передний центральный резец", clinicalStateRu: "Здоров" },

	{ fdiCode: "21", status: "healthy", humanNameRu: "Верхний левый передний центральный резец", clinicalStateRu: "Здоров" },
	{ fdiCode: "22", status: "healthy", humanNameRu: "Верхний левый боковой резец", clinicalStateRu: "Здоров" },
	{ fdiCode: "23", status: "healthy", humanNameRu: "Верхний левый клык", clinicalStateRu: "Здоров" },
	{ fdiCode: "24", status: "healthy", humanNameRu: "Верхний левый 1-й малый жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "25", status: "in_treatment", humanNameRu: "Верхний левый 2-й малый жевательный зуб", clinicalStateRu: "В процессе: временная пломба, обработка каналов", plannedStageTitleRu: "Терапевтический этап (пломбирование каналов)" },
	{ fdiCode: "26", status: "needs_treatment", humanNameRu: "Верхний левый 1-й жевательный зуб", clinicalStateRu: "Требует внимания: апроксимальный кариес", plannedStageTitleRu: "Этап 2: Лечение кариеса" },
	{ fdiCode: "27", status: "healthy", humanNameRu: "Верхний левый 2-й жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "28", status: "missing_or_implant", humanNameRu: "Верхний левый зуб мудрости", clinicalStateRu: "Удален ранее по ортодонтическим показаниям" },

	// Lower Arch
	{ fdiCode: "48", status: "missing_or_implant", humanNameRu: "Нижний правый зуб мудрости", clinicalStateRu: "Удален" },
	{ fdiCode: "47", status: "healthy", humanNameRu: "Нижний правый 2-й жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "46", status: "missing_or_implant", humanNameRu: "Нижний правый 1-й жевательный зуб", clinicalStateRu: "Установлен имплантат Dentium SuperLine с циркониевой коронкой", warrantyActive: true },
	{ fdiCode: "45", status: "healthy", humanNameRu: "Нижний правый 2-й малый жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "44", status: "healthy", humanNameRu: "Нижний правый 1-й малый жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "43", status: "healthy", humanNameRu: "Нижний правый клык", clinicalStateRu: "Здоров" },
	{ fdiCode: "42", status: "healthy", humanNameRu: "Нижний правый боковой резец", clinicalStateRu: "Здоров" },
	{ fdiCode: "41", status: "healthy", humanNameRu: "Нижний правый передний центральный резец", clinicalStateRu: "Здоров" },

	{ fdiCode: "31", status: "healthy", humanNameRu: "Нижний левый передний центральный резец", clinicalStateRu: "Здоров" },
	{ fdiCode: "32", status: "healthy", humanNameRu: "Нижний левый боковой резец", clinicalStateRu: "Здоров" },
	{ fdiCode: "33", status: "healthy", humanNameRu: "Нижний левый клык", clinicalStateRu: "Здоров" },
	{ fdiCode: "34", status: "healthy", humanNameRu: "Нижний левый 1-й малый жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "35", status: "healthy", humanNameRu: "Нижний левый 2-й малый жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "36", status: "in_treatment", humanNameRu: "Нижний левый 1-й жевательный зуб", clinicalStateRu: "Подготовка под коронку: культевая вкладка", plannedStageTitleRu: "Ортопедический этап" },
	{ fdiCode: "37", status: "needs_treatment", humanNameRu: "Нижний левый 2-й жевательный зуб", clinicalStateRu: "Кариес фиссур", plannedStageTitleRu: "Этап 1: Гигиена и лечение кариеса" },
	{ fdiCode: "38", status: "healthy", humanNameRu: "Нижний левый зуб мудрости", clinicalStateRu: "Здоров" },
];

/**
 * Calculates the patient's Dental Health & Sanitation Index.
 * Formula: % of healthy, cured and restored teeth vs total teeth in chart.
 */
export function calculateDentalHealthIndex(
	teeth: readonly PatientToothInfo[] = DEFAULT_PATIENT_TEETH,
): DentalHealthIndexResult {
	const totalTeeth = teeth.length || 32;
	const healthyCount = teeth.filter((t) => t.status === "healthy").length;
	const inTreatmentCount = teeth.filter((t) => t.status === "in_treatment").length;
	const needsTreatmentCount = teeth.filter((t) => t.status === "needs_treatment").length;
	const missingOrImplantCount = teeth.filter((t) => t.status === "missing_or_implant").length;

	// Санированные зубы = здоровые/вылеченные + качественно замещенные имплантами
	const sanitatedTeeth = healthyCount + missingOrImplantCount;
	const sanitationPercent = Math.min(100, Math.max(0, Math.round((sanitatedTeeth / totalTeeth) * 100)));

	let badgeStatus: "excellent" | "good" | "needs_attention" = "good";
	let statusLabelRu = "Хороший уровень санации";
	let encouragingNoteRu = "Лечение идет по плану! После завершения текущего плана индекс достигнет 100%.";

	if (sanitationPercent >= 90) {
		badgeStatus = "excellent";
		statusLabelRu = "Отличный уровень санации";
		encouragingNoteRu = "Полость рта практически полностью санирована! Соблюдайте профгигиену 1 раз в 6 месяцев для сохранения гарантии.";
	} else if (sanitationPercent < 70) {
		badgeStatus = "needs_attention";
		statusLabelRu = "Требуется плановая санация";
		encouragingNoteRu = "Не переживайте! Все процедуры проводятся 100% безболезненно под контролем дентального микроскопа.";
	}

	return {
		totalTeeth,
		healthyCount,
		inTreatmentCount,
		needsTreatmentCount,
		missingOrImplantCount,
		sanitationPercent,
		formattedIndexRu: `Индекс санации: ${sanitationPercent}% • Вылечено ${healthyCount} зубов • Требуют внимания ${needsTreatmentCount} зубов`,
		badgeStatus,
		statusLabelRu,
		encouragingNoteRu,
	};
}

export interface PatientFriendlyOdontogramProps {
	readonly teeth?: readonly PatientToothInfo[] | undefined;
	readonly onSelectTooth?: ((tooth: PatientToothInfo) => void) | undefined;
	readonly showHealthIndexHeader?: boolean | undefined;
}

export const PatientFriendlyOdontogram: React.FC<PatientFriendlyOdontogramProps> = ({
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

	const handleToothClick = (tooth: PatientToothInfo) => {
		setSelectedTooth(tooth);
		if (onSelectTooth) {
			onSelectTooth(tooth);
		}
	};

	const getStatusColor = (status: PatientToothStatus) => {
		switch (status) {
			case "healthy":
				return { bg: "#10b981", light: "rgba(16, 185, 129, 0.15)", text: "#065f46", border: "#059669" };
			case "in_treatment":
				return { bg: "#f59e0b", light: "rgba(245, 158, 11, 0.15)", text: "#92400e", border: "#d97706" };
			case "needs_treatment":
				return { bg: "#ef4444", light: "rgba(239, 68, 68, 0.15)", text: "#991b1b", border: "#dc2626" };
			case "missing_or_implant":
				return { bg: "#64748b", light: "rgba(100, 116, 139, 0.15)", text: "#334155", border: "#475569" };
		}
	};

	const renderToothButton = (tooth: PatientToothInfo) => {
		const color = getStatusColor(tooth.status);
		const isSelected = selectedTooth?.fdiCode === tooth.fdiCode;
		const isDimmed = statusFilter !== "all" && tooth.status !== statusFilter;

		return (
			<button
				key={tooth.fdiCode}
				type="button"
				onClick={() => handleToothClick(tooth)}
				data-testid={`tooth-btn-${tooth.fdiCode}`}
				style={{
					minWidth: "36px",
					width: "36px",
					height: "48px",
					borderRadius: "6px",
					border: `2px solid ${isSelected ? "var(--pc-primary, #0d9488)" : color.border}`,
					backgroundColor: color.bg,
					color: "#ffffff",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
					padding: "2px",
					boxShadow: isSelected ? "0 0 0 3px rgba(13, 148, 136, 0.5)" : "0 1px 2px rgba(0, 0, 0, 0.2)",
					transition: "all 0.2s ease",
					touchAction: "manipulation",
					userSelect: "none",
					flexShrink: 0,
					opacity: isDimmed ? 0.35 : 1,
					transform: isSelected ? "scale(1.08)" : isDimmed ? "scale(0.95)" : "scale(1)",
				}}
				title={`${tooth.fdiCode}: ${tooth.humanNameRu}`}
			>
				<span style={{ fontSize: "11px", fontWeight: 800, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{tooth.fdiCode}</span>
				{tooth.status === "healthy" && <Check size={12} strokeWidth={3} />}
				{tooth.status === "in_treatment" && <span style={{ fontSize: "10px" }}>⏳</span>}
				{tooth.status === "needs_treatment" && <span style={{ fontSize: "10px" }}>⚠️</span>}
				{tooth.status === "missing_or_implant" && <span style={{ fontSize: "10px" }}>🔩</span>}
			</button>
		);
	};

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
								<strong style={{ fontSize: "15px", color: "var(--pc-text-main, #f8fafc)" }}>
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
							Санация: {healthIndex.sanitationPercent}%
						</span>
					</div>

					{/* Exact Metric String: «Индекс санации: X% • Вылечено Y зубов • Требуют внимания Z зубов» */}
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
						<span style={{ color: "var(--pc-text-main, #f8fafc)" }}>
							{healthIndex.formattedIndexRu}
							{healthIndex.inTreatmentCount > 0 ? ` • В процессе ${healthIndex.inTreatmentCount}` : ""}
						</span>

						<span style={{ fontSize: "11px", color: "var(--pc-success, #10b981)", fontWeight: 600 }}>
							Цель: 100% санация
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
						<div style={{ fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)", lineHeight: "1.3" }}>
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
						color: "var(--pc-text-main, #f8fafc)",
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

			{/* Mobile scroll hint */}
			<div style={{ fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)", textAlign: "center" }}>
				<span>↔ Прокрутите влево/вправо для просмотра всех зубов формулы (нажмите на зуб для расшифровки)</span>
			</div>

			{/* 3. DENTAL ARCH DISPLAY */}
			<div
				style={{
					padding: "14px",
					backgroundColor: "var(--pc-bg, #0f172a)",
					border: "1px solid var(--pc-border, #334155)",
					borderRadius: "12px",
					display: "flex",
					flexDirection: "column",
					gap: "12px",
					overflowX: "auto",
					WebkitOverflowScrolling: "touch",
					maxWidth: "100%",
					boxSizing: "border-box",
				}}
			>
				{/* Upper Arch */}
				<div style={{ minWidth: "640px", display: "flex", flexDirection: "column", alignItems: "center" }}>
					<div style={{ fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)", textAlign: "center", marginBottom: "6px" }}>
						ВЕРХНЯЯ ЧЕЛЮСТЬ (ПРАВО ↔ ЛЕВО)
					</div>
					<div style={{ display: "flex", justifyContent: "center", gap: "4px" }}>
						<div style={{ display: "flex", gap: "3px" }}>{upperRight.map(renderToothButton)}</div>
						<div style={{ width: "8px" }} />
						<div style={{ display: "flex", gap: "3px" }}>{upperLeft.map(renderToothButton)}</div>
					</div>
				</div>

				{/* Divider */}
				<div style={{ height: "1px", backgroundColor: "var(--pc-border, #334155)", margin: "4px 0", minWidth: "640px" }} />

				{/* Lower Arch */}
				<div style={{ minWidth: "640px", display: "flex", flexDirection: "column", alignItems: "center" }}>
					<div style={{ display: "flex", justifyContent: "center", gap: "4px" }}>
						<div style={{ display: "flex", gap: "3px" }}>{lowerRight.map(renderToothButton)}</div>
						<div style={{ width: "8px" }} />
						<div style={{ display: "flex", gap: "3px" }}>{lowerLeft.map(renderToothButton)}</div>
					</div>
					<div style={{ fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)", textAlign: "center", marginTop: "6px" }}>
						НИЖНЯЯ ЧЕЛЮСТЬ (ПРАВО ↔ ЛЕВО)
					</div>
				</div>
			</div>

			{/* 4. SELECTED TOOTH DETAIL BOX & REASSURANCE */}
			{selectedTooth && (
				<div
					data-testid={`selected-tooth-details-${selectedTooth.fdiCode}`}
					style={{
						padding: "14px",
						borderRadius: "10px",
						backgroundColor: "var(--pc-surface, #1e293b)",
						border: "1.5px solid var(--pc-primary, #0d9488)",
						display: "flex",
						flexDirection: "column",
						gap: "8px",
					}}
				>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
						<div>
							<strong style={{ fontSize: "14px", color: "var(--pc-primary, #0d9488)" }}>
								{selectedTooth.humanNameRu} (№{selectedTooth.fdiCode})
							</strong>
							<div style={{ fontSize: "13px", marginTop: "2px", color: "var(--pc-text-main, #f8fafc)" }}>
								<strong>Текущее состояние:</strong> {selectedTooth.clinicalStateRu}
							</div>
						</div>
						<button
							type="button"
							onClick={() => setSelectedTooth(null)}
							aria-label="Закрыть информацию о зубе"
							style={{ background: "transparent", border: "none", color: "var(--pc-text-muted, #94a3b8)", cursor: "pointer" }}
						>
							<X size={18} />
						</button>
					</div>

					{selectedTooth.plannedStageTitleRu && (
						<div style={{ fontSize: "12px", color: "#f59e0b", marginTop: "2px" }}>
							<strong>Запланировано в плане лечения:</strong> {selectedTooth.plannedStageTitleRu}
						</div>
					)}

					{selectedTooth.warrantyActive && (
						<div style={{ fontSize: "12px", color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
							<Sparkles size={14} />
							<span>Действует гарантийный сертификат качества клиники DENTE</span>
						</div>
					)}

					{/* Anti-anxiety reassurance note */}
					<div
						style={{
							backgroundColor: "var(--pc-bg, #0f172a)",
							borderRadius: "6px",
							padding: "8px 10px",
							fontSize: "11px",
							color: "var(--pc-text-muted, #94a3b8)",
							display: "flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<Heart size={14} style={{ color: "var(--pc-primary, #0d9488)", flexShrink: 0 }} />
						<span>
							Все манипуляции выполняются под 100% анестезией Septanest с мягкой гелевой премедикацией места укола. <strong>Никакой боли.</strong>
						</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default PatientFriendlyOdontogram;

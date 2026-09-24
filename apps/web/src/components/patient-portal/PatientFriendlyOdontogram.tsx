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
import type React from "react";
import { memo, useCallback, useMemo, useState } from "react";

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
	"18": "Восьмерка сверху справа №18 (зуб мудрости)",
	"17": "Семерка сверху справа №17 (2-й жевательный зуб)",
	"16": "Шестерка сверху справа №16 (1-й жевательный зуб)",
	"15": "Пятерка сверху справа №15 (2-й малый жевательный зуб)",
	"14": "Четверка сверху справа №14 (1-й малый жевательный зуб)",
	"13": "Тройка сверху справа №13 (клык)",
	"12": "Двойка сверху справа №12 (боковой резец)",
	"11": "Единичка сверху справа №11 (передний центральный резец)",

	// Upper Left (21..28)
	"21": "Единичка сверху слева №21 (передний центральный резец)",
	"22": "Двойка сверху слева №22 (боковой резец)",
	"23": "Тройка сверху слева №23 (клык)",
	"24": "Четверка сверху слева №24 (1-й малый жевательный зуб)",
	"25": "Пятерка сверху слева №25 (2-й малый жевательный зуб)",
	"26": "Шестерка сверху слева №26 (1-й жевательный зуб)",
	"27": "Семерка сверху слева №27 (2-й жевательный зуб)",
	"28": "Восьмерка сверху слева №28 (зуб мудрости)",

	// Lower Left (31..38)
	"31": "Единичка снизу слева №31 (передний центральный резец)",
	"32": "Двойка снизу слева №32 (боковой резец)",
	"33": "Тройка снизу слева №33 (клык)",
	"34": "Четверка снизу слева №34 (1-й малый жевательный зуб)",
	"35": "Пятерка снизу слева №35 (2-й малый жевательный зуб)",
	"36": "Шестерка снизу слева №36 (1-й жевательный зуб)",
	"37": "Семерка снизу слева №37 (2-й жевательный зуб)",
	"38": "Восьмерка снизу слева №38 (зуб мудрости)",

	// Lower Right (48..41)
	"48": "Восьмерка снизу справа №48 (зуб мудрости)",
	"47": "Семерка снизу справа №47 (2-й жевательный зуб)",
	"46": "Шестерка снизу справа №46 (1-й жевательный зуб)",
	"45": "Пятерка снизу справа №45 (2-й малый жевательный зуб)",
	"44": "Четверка снизу справа №44 (1-й малый жевательный зуб)",
	"43": "Тройка снизу справа №43 (клык)",
	"42": "Двойка снизу справа №42 (боковой резец)",
	"41": "Единичка снизу справа №41 (передний центральный резец)",
};

export const ALL_ADULT_FDI_TEETH: readonly string[] = [
	"18", "17", "16", "15", "14", "13", "12", "11",
	"21", "22", "23", "24", "25", "26", "27", "28",
	"48", "47", "46", "45", "44", "43", "42", "41",
	"31", "32", "33", "34", "35", "36", "37", "38",
];

export interface TreatmentPlanStageLike {
	readonly id?: string | undefined;
	readonly titleRu: string;
	readonly status: "completed" | "in_progress" | "planned";
	readonly teethFdi: readonly string[];
	readonly procedures?: readonly string[] | undefined;
	readonly categoryRu?: string | undefined;
}

export interface WarrantyItemLike {
	readonly toothFdi: string;
	readonly workTitleRu: string;
}

export interface WarrantyCardLike {
	readonly items: readonly WarrantyItemLike[];
	readonly status?: string | undefined;
}

/**
 * Dynamically computes patient's 32 teeth statuses from current treatment plan stages and active warranties.
 * Eliminates hardcoded dummy mouth per Mandates 8c, 8e, 8i.
 */
export function computePatientTeethFromStages(
	stages: readonly TreatmentPlanStageLike[] = [],
	warranties?: readonly WarrantyCardLike[] | undefined,
): readonly PatientToothInfo[] {
	const normalizeTooth = (raw: string) => raw.replace(/[^0-9]/g, "");

	return ALL_ADULT_FDI_TEETH.map((fdiCode) => {
		const humanNameRu = HUMAN_TOOTH_NAMES[fdiCode] || `Зуб №${fdiCode}`;

		// Find stages that specifically target this tooth
		const directStages = stages.filter((stage) => {
			if (!stage.teethFdi || stage.teethFdi.length === 0) return false;
			return stage.teethFdi.some((raw) => {
				const norm = normalizeTooth(raw);
				if (norm === fdiCode) return true;
				if (raw.includes("-") && !raw.includes("1.1-4.8") && !raw.includes("11-48")) {
					const parts = raw.split("-").map(normalizeTooth);
					if (parts.length === 2) {
						const start = parseInt(parts[0] || "", 10);
						const end = parseInt(parts[1] || "", 10);
						const current = parseInt(fdiCode, 10);
						if (!isNaN(start) && !isNaN(end) && !isNaN(current)) {
							const min = Math.min(start, end);
							const max = Math.max(start, end);
							if (current >= min && current <= max) {
								return true;
							}
						}
					}
				}
				return false;
			});
		});

		if (directStages.length > 0) {
			const inProgress = directStages.find((s) => s.status === "in_progress");
			if (inProgress) {
				return {
					fdiCode,
					status: "in_treatment",
					humanNameRu,
					clinicalStateRu: `В процессе лечения: ${inProgress.titleRu}`,
					plannedStageTitleRu: inProgress.titleRu,
				};
			}

			const planned = directStages.find((s) => s.status === "planned");
			if (planned) {
				return {
					fdiCode,
					status: "needs_treatment",
					humanNameRu,
					clinicalStateRu: `Требует лечения: ${planned.titleRu}`,
					plannedStageTitleRu: planned.titleRu,
				};
			}

			// All direct stages completed
			const completed = directStages[0];
			const isImplant = directStages.some(
				(s) =>
					s.titleRu.toLowerCase().includes("имплант") ||
					(s.categoryRu && s.categoryRu.toLowerCase().includes("имплант")),
			);
			const isExtraction = directStages.some((s) => s.titleRu.toLowerCase().includes("удален"));

			if (isImplant) {
				return {
					fdiCode,
					status: "missing_or_implant",
					humanNameRu,
					clinicalStateRu: `Установлен имплантат: ${completed?.titleRu || "Имплантация"}`,
					warrantyActive: true,
				};
			}
			if (isExtraction) {
				return {
					fdiCode,
					status: "missing_or_implant",
					humanNameRu,
					clinicalStateRu: `Удален: ${completed?.titleRu || "Удаление"}`,
				};
			}
			return {
				fdiCode,
				status: "healthy",
				humanNameRu,
				clinicalStateRu: `Вылечен: ${completed?.titleRu || "Лечение завершено"}`,
				warrantyActive: true,
			};
		}

		// Check active warranties
		const activeWarranty = warranties?.find((w) =>
			w.items?.some((i) => normalizeTooth(i.toothFdi) === fdiCode),
		);
		if (activeWarranty) {
			const item = activeWarranty.items.find((i) => normalizeTooth(i.toothFdi) === fdiCode);
			return {
				fdiCode,
				status: "healthy",
				humanNameRu,
				clinicalStateRu: `Вылечен: ${item?.workTitleRu || "Комплексная реставрация"}`,
				warrantyActive: true,
			};
		}

		// Default healthy tooth
		return {
			fdiCode,
			status: "healthy",
			humanNameRu,
			clinicalStateRu: "Здоров, патологий не выявлено",
		};
	});
}

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

function getPatientToothStatusColor(status: PatientToothStatus) {
	switch (status) {
		case "healthy":
			return {
				bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
				light: "rgba(16, 185, 129, 0.2)",
				glow: "0 0 14px rgba(16, 185, 129, 0.3), 0 2px 4px rgba(0, 0, 0, 0.25)",
				text: "#ffffff",
				border: "#10b981",
				badgeText: "Здоров / Санирован",
			};
		case "in_treatment":
			return {
				bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
				light: "rgba(245, 158, 11, 0.2)",
				glow: "0 0 14px rgba(245, 158, 11, 0.3), 0 2px 4px rgba(0, 0, 0, 0.25)",
				text: "#ffffff",
				border: "#f59e0b",
				badgeText: "В процессе лечения",
			};
		case "needs_treatment":
			return {
				bg: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
				light: "rgba(244, 63, 94, 0.2)",
				glow: "0 0 14px rgba(244, 63, 94, 0.35), 0 2px 4px rgba(0, 0, 0, 0.25)",
				text: "#ffffff",
				border: "#f43f5e",
				badgeText: "Требует внимания",
			};
		case "missing_or_implant":
			return {
				bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
				light: "rgba(100, 116, 139, 0.2)",
				glow: "0 0 10px rgba(100, 116, 139, 0.25), 0 2px 4px rgba(0, 0, 0, 0.25)",
				text: "#ffffff",
				border: "#64748b",
				badgeText: "Имплантат / Замещен",
			};
	}
}

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
			{tooth.status === "missing_or_implant" && <span style={{ fontSize: "10px", fontWeight: 800 }}>—</span>}
		</button>
	);
});
PatientToothButton.displayName = "PatientToothButton";

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
						<span style={{ color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
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
					font-size: 11px;
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
					font-size: 11px;
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
				<div
					data-testid={`selected-tooth-details-${selectedTooth.fdiCode}`}
					className="pc-card selected-tooth-popup"
					style={{
						padding: "16px",
						borderRadius: "12px",
						backgroundColor: "var(--pc-surface, #1e293b)",
						border: `1.5px solid ${getPatientToothStatusColor(selectedTooth.status).border}`,
						boxShadow: `0 8px 24px -4px rgba(0, 0, 0, 0.4), ${getPatientToothStatusColor(selectedTooth.status).glow}`,
						display: "flex",
						flexDirection: "column",
						gap: "10px",
					}}
				>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
						<div>
							<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
								<strong style={{ fontSize: "15px", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
									{selectedTooth.humanNameRu}
								</strong>
								<span
									style={{
										padding: "2px 8px",
										borderRadius: "12px",
										fontSize: "11px",
										fontWeight: 800,
										backgroundColor: getPatientToothStatusColor(selectedTooth.status).light,
										color: getPatientToothStatusColor(selectedTooth.status).border,
										border: `1px solid ${getPatientToothStatusColor(selectedTooth.status).border}`,
									}}
								>
									{getPatientToothStatusColor(selectedTooth.status).badgeText}
								</span>
							</div>
							<div style={{ fontSize: "13px", marginTop: "4px", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
								<strong>Клинический статус:</strong> {selectedTooth.clinicalStateRu}
							</div>
						</div>
						<button
							type="button"
							onClick={() => setSelectedTooth(null)}
							aria-label="Закрыть информацию о зубе"
							data-testid="close-tooth-details-btn"
							style={{
								background: "rgba(255, 255, 255, 0.05)",
								border: "1px solid var(--pc-border, #334155)",
								borderRadius: "6px",
								width: "32px",
								height: "32px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "var(--pc-text-muted, #94a3b8)",
								cursor: "pointer",
								flexShrink: 0,
							}}
						>
							<X size={16} />
						</button>
					</div>

					{/* Assigned Procedures & Treatment Plan Details */}
					<div
						style={{
							backgroundColor: "var(--pc-bg, #0f172a)",
							border: "1px solid var(--pc-border, #334155)",
							borderRadius: "8px",
							padding: "10px 12px",
							display: "flex",
							flexDirection: "column",
							gap: "4px",
							fontSize: "12px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--pc-primary, #0d9488)", fontWeight: 700 }}>
							<Zap size={14} />
							<span>Назначенные процедуры и план лечения:</span>
						</div>
						<div style={{ color: "var(--pc-text-main, var(--ink, #0f172a))", lineHeight: "1.4" }}>
							{selectedTooth.plannedStageTitleRu ||
								selectedTooth.procedureDescriptionRu ||
								(selectedTooth.status === "healthy"
									? "Контрольный осмотр и поддержание профессиональной гигиены (патологий не выявлено)"
									: "Плановый лечебный этап по согласованному плану")}
						</div>
					</div>

					{selectedTooth.warrantyActive && (
						<div style={{ fontSize: "12px", color: "var(--pc-success, #10b981)", display: "flex", alignItems: "center", gap: "6px" }}>
							<ShieldCheck size={16} />
							<span>Действует официальный гарантийный сертификат качества клиники DENTE</span>
						</div>
					)}

					{/* Anti-anxiety reassurance note */}
					<div
						style={{
							backgroundColor: "rgba(13, 148, 136, 0.08)",
							border: "1px solid rgba(13, 148, 136, 0.2)",
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
});

PatientFriendlyOdontogram.displayName = "PatientFriendlyOdontogram";

export default PatientFriendlyOdontogram;

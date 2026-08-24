/**
 * DENTE CRM — Patient-Friendly 2D Odontogram & Human-Readable Tooth Explanations
 * Color-coded representation for ordinary patients:
 * - Green: Healed / Healthy (Вылечен / Здоров)
 * - Yellow: In treatment (В процессе лечения)
 * - Red: Needs treatment (Требует лечения)
 * - Gray: Missing / Implant (Отсутствует / Имплантат)
 */

import { Check, CheckCircle2, Heart, HelpCircle, Info, Sparkles, X } from "lucide-react";
import type React from "react";
import { useState } from "react";

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

export interface PatientFriendlyOdontogramProps {
	readonly teeth?: readonly PatientToothInfo[] | undefined;
	readonly onSelectTooth?: ((tooth: PatientToothInfo) => void) | undefined;
}

export const PatientFriendlyOdontogram: React.FC<PatientFriendlyOdontogramProps> = ({
	teeth = DEFAULT_PATIENT_TEETH,
	onSelectTooth,
}) => {
	const [selectedTooth, setSelectedTooth] = useState<PatientToothInfo | null>(null);

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

		return (
			<button
				key={tooth.fdiCode}
				type="button"
				onClick={() => handleToothClick(tooth)}
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
					transition: "all 0.15s ease",
					touchAction: "manipulation",
					userSelect: "none",
					flexShrink: 0,
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
		<div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
			{/* Color Legend */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "10px",
					padding: "8px 12px",
					backgroundColor: "var(--pc-surface, #1e293b)",
					borderRadius: "8px",
					fontSize: "12px",
					justifyContent: "center",
					border: "1px solid var(--pc-border, #334155)",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#10b981" }} />
					<span>Здоров / Вылечен</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#f59e0b" }} />
					<span>В процессе лечения</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#ef4444" }} />
					<span>Требует лечения</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#64748b" }} />
					<span>Имплантат / Удален</span>
				</div>
			</div>

			{/* Mobile scroll hint */}
			<div style={{ fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)", textAlign: "center" }}>
				<span>↔ Прокрутите влево/вправо для просмотра всех зубов формулы</span>
			</div>

			{/* Dental Arch Display */}
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

			{/* Selected Tooth Detail Box */}
			{selectedTooth && (
				<div
					style={{
						padding: "14px",
						borderRadius: "8px",
						backgroundColor: "var(--pc-surface, #1e293b)",
						border: "1px solid var(--pc-primary, #0d9488)",
						display: "flex",
						flexDirection: "column",
						gap: "6px",
					}}
				>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
						<div>
							<strong style={{ fontSize: "14px", color: "var(--pc-primary, #0d9488)" }}>
								{selectedTooth.humanNameRu} (№{selectedTooth.fdiCode})
							</strong>
							<div style={{ fontSize: "13px", marginTop: "2px" }}>
								<strong>Состояние:</strong> {selectedTooth.clinicalStateRu}
							</div>
						</div>
						<button
							type="button"
							onClick={() => setSelectedTooth(null)}
							style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
						>
							<X size={16} />
						</button>
					</div>

					{selectedTooth.plannedStageTitleRu && (
						<div style={{ fontSize: "12px", color: "#f59e0b", marginTop: "2px" }}>
							<strong>Запланировано в плане лечения:</strong> {selectedTooth.plannedStageTitleRu}
						</div>
					)}

					{selectedTooth.warrantyActive && (
						<div style={{ fontSize: "12px", color: "#10b981", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
							<Sparkles size={14} />
							<span>Действует гарантийный сертификат качества клиники</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

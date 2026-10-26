/**
 * DENTE CRM — DICOM AI Findings Drawer
 * Side-sheet displaying detected pathologies (caries, periodontitis, fillings)
 * with explicit practitioner confirmation before updating the dental chart.
 *
 * Strict invariants: Mandate 8b (<=120 lines), Mandate 8e (Doctor Autonomy).
 */

import React from "react";
import { AlertTriangle, Info, Sparkles, X } from "lucide-react";
import type { planVisiographFindings } from "./visiographFindings.js";
import { DicomAiFindingsList } from "./aiFindings/DicomAiFindingsList.js";
import { DicomAiFindingsFooter } from "./aiFindings/DicomAiFindingsFooter.js";

export interface DicomAiFindingsDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly plan: ReturnType<typeof planVisiographFindings> | null;
	readonly selectedFindingCodes: Set<string>;
	readonly setSelectedFindingCodes: React.Dispatch<React.SetStateAction<Set<string>>>;
	readonly appliedToothCodes: readonly string[];
	readonly formulaFailure: string | null;
	readonly aiReport: string | null;
	readonly isApplyingToChart: boolean;
	readonly onApplyFindingsToChart: () => void;
}

export const DicomAiFindingsDrawer: React.FC<DicomAiFindingsDrawerProps> = ({
	isOpen, onClose, plan, selectedFindingCodes, setSelectedFindingCodes,
	appliedToothCodes, formulaFailure, aiReport, isApplyingToChart, onApplyFindingsToChart,
}) => {
	if (!isOpen) return null;

	return (
		<div
			data-testid="dicom-ai-findings-drawer"
			style={{
				width: "360px", backgroundColor: "#0f172a", borderLeft: "1px solid #1e293b",
				display: "flex", flexDirection: "column", zIndex: 10,
				boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.4)",
			}}
		>
			<div style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#1e293b" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Sparkles size={16} color="#2dd4bf" />
					<span style={{ fontWeight: 700, fontSize: "13px", color: "#f8fafc" }}>Находки ИИ (Предварительный разбор)</span>
				</div>
				<button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }} title="Скрыть панель">
					<X size={16} />
				</button>
			</div>

			<div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
				<div style={{ fontSize: "12px", color: "#cbd5e1", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid #334155", borderRadius: "8px", padding: "10px", lineHeight: "1.4", display: "flex", alignItems: "flex-start", gap: "8px" }}>
					<Info size={16} className="text-teal-400 shrink-0 mt-0.5" />
					<span>Предварительный анализ. Данные <strong>не перезаписывают</strong> зубную формулу автоматически. Врач проверяет снимок и подтверждает внесение.</span>
				</div>

				<DicomAiFindingsList
					plan={plan}
					selectedFindingCodes={selectedFindingCodes}
					setSelectedFindingCodes={setSelectedFindingCodes}
					appliedToothCodes={appliedToothCodes}
				/>

				{plan && plan.noFormulaStateCodes.length > 0 && (
					<div style={{ fontSize: "12px", color: "#fbbf24", backgroundColor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "8px", padding: "10px", lineHeight: "1.4", display: "flex", alignItems: "center", gap: "6px" }}>
						<AlertTriangle size={14} style={{ flexShrink: 0 }} />
						<span>Зубы {plan.noFormulaStateCodes.join(", ")} требуют внимания/наблюдения. Отметьте их на одонтограмме вручную.</span>
					</div>
				)}

				{formulaFailure && (
					<div style={{ fontSize: "12px", color: "#f87171", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "10px", lineHeight: "1.4" }}>
						{formulaFailure}
					</div>
				)}

				{aiReport && (
					<details style={{ marginTop: "auto", fontSize: "12px", color: "#94a3b8" }}>
						<summary style={{ cursor: "pointer", padding: "6px 0", color: "#cbd5e1", fontWeight: 600 }}>Полный отчёт модели</summary>
						<div style={{ whiteSpace: "pre-wrap", backgroundColor: "#020617", padding: "10px", borderRadius: "6px", border: "1px solid #1e293b", marginTop: "6px", maxHeight: "160px", overflowY: "auto", fontFamily: "monospace", fontSize: "11px" }}>
							{aiReport}
						</div>
					</details>
				)}
			</div>

			{plan && plan.groups.length > 0 && (
				<DicomAiFindingsFooter
					isApplyingToChart={isApplyingToChart}
					onApplyFindingsToChart={onApplyFindingsToChart}
				/>
			)}
		</div>
	);
};

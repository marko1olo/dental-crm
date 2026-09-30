import { Sparkles } from "lucide-react";
import React from "react";
import { countLabel } from "../../AppHelpers";
import type { AiToothState } from "./VisiographScanHelpers";
import { VisiographFindingsPills } from "./VisiographFindingsPills";

export interface VisiographFindingsSectionProps {
	readonly toothStates: AiToothState[];
	readonly appliedToothCodes: string[];
	readonly isHistoryView: boolean;
	readonly selectedFindingCodes: Set<string>;
	readonly onToggleFindingCode: (code: string) => void;
	readonly onToggleSelectAll: () => void;
	readonly applyButton: React.ReactNode;
}

export function VisiographFindingsSection({
	toothStates,
	appliedToothCodes,
	isHistoryView,
	selectedFindingCodes,
	onToggleFindingCode,
	onToggleSelectAll,
	applyButton,
}: VisiographFindingsSectionProps) {
	if (toothStates.length === 0) return null;

	const allSelected = selectedFindingCodes.size === toothStates.length;

	return (
		<div
			style={{
				padding: "14px 16px",
				background: "var(--paper-soft)",
				borderRadius: "10px",
				border: "1px solid var(--line)",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "8px",
				}}
			>
				<div>
					<div
						style={{
							fontSize: "0.88rem",
							fontWeight: 700,
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<Sparkles size={16} style={{ color: "var(--teal)" }} />
						<span>Находки ИИ на снимке (рекомендательный список)</span>
					</div>
					<div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "2px" }}>
						{isHistoryView
							? `Зубы из архива: ${toothStates.length} поз.`
							: appliedToothCodes.length > 0
								? `Внесено в зубную формулу: ${countLabel(appliedToothCodes.length, "зуб", "зуба", "зубов")} из ${toothStates.length}`
								: "Отметьте нужные зубы и нажмите «Применить выбранные к формуле»"}
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<button
						type="button"
						onClick={onToggleSelectAll}
						style={{
							padding: "5px 10px",
							fontSize: "0.75rem",
							background: "transparent",
							color: "var(--muted)",
							border: "1px solid var(--line)",
							borderRadius: "6px",
							cursor: "pointer",
						}}
					>
						{allSelected ? "Снять выбор" : "Выбрать все"}
					</button>

					{applyButton}
				</div>
			</div>

			<VisiographFindingsPills
				toothStates={toothStates}
				appliedToothCodes={appliedToothCodes}
				selectedFindingCodes={selectedFindingCodes}
				onToggleFindingCode={onToggleFindingCode}
			/>
		</div>
	);
}

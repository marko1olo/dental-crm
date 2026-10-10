import { CheckCircle2, Loader2, Maximize2, Sparkles } from "lucide-react";
import React from "react";
import {
	cockpitToolbarStyle,
	getAiButtonStyle,
	getNormaButtonStyle,
} from "../VisiographAnalyzerStyles.js";
import { VisiographCockpitPresets } from "../VisiographCockpitPresets.js";
import type { VisiographToolbarControlsProps } from "./types.js";

export function VisiographToolbarControls({
	quickPreset,
	setQuickPreset,
	isStudioMode,
	onToggleStudio,
	onOpenApexRuler,
	isNormaApplied,
	onApplyNormaTo043,
	isAnalyzing,
	onRunAiAnalysis,
	hasAiReport,
	onOpenSensorViewer,
}: VisiographToolbarControlsProps) {
	return (
		<div data-testid="visiograph-cockpit-toolbar" style={cockpitToolbarStyle}>
			<VisiographCockpitPresets
				quickPreset={quickPreset}
				setQuickPreset={setQuickPreset}
				isStudioMode={isStudioMode}
				onToggleStudio={onToggleStudio}
				onOpenApexRuler={onOpenApexRuler}
			/>

			{/* Actions */}
			<div
				className="flex items-center gap-1.5 flex-nowrap shrink-0 ml-auto"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					flexWrap: "nowrap",
					flexShrink: 0,
					marginLeft: "auto",
				}}
			>
				<button
					type="button"
					data-testid="btn-visiograph-norma-043"
					onClick={onApplyNormaTo043}
					className="shrink-0"
					style={getNormaButtonStyle(isNormaApplied)}
				>
					<CheckCircle2
						size={13}
						className={isNormaApplied ? "text-[var(--teal)]" : "text-[var(--ink)]"}
					/>
					<span>{isNormaApplied ? "✓ Норма внесена" : "✓ Норма в протокол"}</span>
				</button>

				<button
					type="button"
					data-testid="btn-run-visiograph-ai"
					onClick={onRunAiAnalysis}
					disabled={isAnalyzing}
					className="shrink-0"
					style={getAiButtonStyle(isAnalyzing)}
				>
					{isAnalyzing ? (
						<>
							<Loader2 size={13} className="animate-spin" />
							<span>Анализ...</span>
						</>
					) : (
						<>
							<Sparkles size={13} />
							<span>{hasAiReport ? "Перезапуск ИИ" : "ИИ-анализ"}</span>
						</>
					)}
				</button>

				{/* EzDent-i 2D Fullscreen Sensor Viewer Button */}
				<button
					type="button"
					data-testid="btn-open-ezdent-sensor-viewer"
					onClick={onOpenSensorViewer}
					className="emk-toolbar-btn shrink-0"
					style={{
						height: "32px",
						minHeight: "32px",
						padding: "0 10px",
						borderRadius: "8px",
						border: "1px solid var(--line)",
						background: "var(--paper-soft)",
						color: "var(--ink)",
						fontSize: "12px",
						fontWeight: 600,
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						cursor: "pointer",
						whiteSpace: "nowrap",
					}}
					title="Открыть полноэкранный режим 2D-разметки со шкалой 5 мм и фильтрами"
				>
					<Maximize2 size={14} className="text-[var(--teal)]" />
					<span>2D Разметка</span>
				</button>
			</div>
		</div>
	);
}

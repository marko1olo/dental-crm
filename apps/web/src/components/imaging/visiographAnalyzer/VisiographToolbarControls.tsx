import { CheckCircle2, ChevronDown, Loader2, Maximize2, Sparkles } from "lucide-react";
import React, { useState } from "react";
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
	boundToothCode,
	onBindTooth,
}: VisiographToolbarControlsProps) {
	const [isToothPickerOpen, setIsToothPickerOpen] = useState(false);

	return (
		<div data-testid="visiograph-cockpit-toolbar" style={cockpitToolbarStyle}>
			<VisiographCockpitPresets
				quickPreset={quickPreset}
				setQuickPreset={setQuickPreset}
				isStudioMode={isStudioMode}
				onToggleStudio={onToggleStudio}
				onOpenApexRuler={onOpenApexRuler}
			/>

			{/* FDI Tooth Selector (Mandate 8e: 1-click RVG to FDI tooth) */}
			<div className="relative shrink-0 ml-1">
				<button
					type="button"
					data-testid="btn-visiograph-fdi-selector"
					onClick={() => setIsToothPickerOpen((prev) => !prev)}
					className="secondary-button shrink-0"
					style={{
						height: "30px",
						minHeight: "30px",
						padding: "0 8px",
						borderRadius: "8px",
						border: boundToothCode ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line, #334155)",
						background: boundToothCode ? "rgba(13, 148, 136, 0.15)" : "var(--paper-soft, #1e293b)",
						color: boundToothCode ? "var(--teal, #2dd4bf)" : "var(--ink, #f8fafc)",
						fontSize: "11.5px",
						fontWeight: 700,
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
						cursor: "pointer",
						whiteSpace: "nowrap",
					}}
					title="Связать снимок с зубом FDI (11..48)"
				>
					<span className="font-mono">{boundToothCode ? `Зуб #${boundToothCode}` : "Привязать зуб"}</span>
					<ChevronDown size={12} />
				</button>

				{isToothPickerOpen && (
					<div
						className="absolute top-full left-0 mt-1 z-50 p-2.5 rounded-xl border border-[var(--line,#334155)] bg-[var(--paper-strong,#0f172a)] shadow-2xl flex flex-col gap-1.5"
						style={{ minWidth: "240px", backgroundColor: "var(--paper-strong, #0f172a)" }}
					>
						<div className="flex items-center justify-between text-[10px] font-bold text-[var(--muted,#94a3b8)] uppercase tracking-wider mb-0.5">
							<span>Формула FDI</span>
							<span className="text-[var(--teal,#2dd4bf)]">{boundToothCode ? `Текущий: #${boundToothCode}` : "Не привязан"}</span>
						</div>
						{/* Upper Jaw */}
						<div className="grid grid-cols-8 gap-1">
							{["18", "17", "16", "15", "14", "13", "12", "11"].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => {
										onBindTooth?.(t);
										setIsToothPickerOpen(false);
									}}
									className={`h-6 text-[10px] font-bold rounded flex items-center justify-center cursor-pointer transition-colors ${
										boundToothCode === t
											? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
											: "bg-[var(--paper-soft,#1e293b)] hover:bg-[var(--teal,#0d9488)]/25 text-[var(--ink,#f8fafc)]"
									}`}
								>
									{t}
								</button>
							))}
						</div>
						<div className="grid grid-cols-8 gap-1">
							{["21", "22", "23", "24", "25", "26", "27", "28"].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => {
										onBindTooth?.(t);
										setIsToothPickerOpen(false);
									}}
									className={`h-6 text-[10px] font-bold rounded flex items-center justify-center cursor-pointer transition-colors ${
										boundToothCode === t
											? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
											: "bg-[var(--paper-soft,#1e293b)] hover:bg-[var(--teal,#0d9488)]/25 text-[var(--ink,#f8fafc)]"
									}`}
								>
									{t}
								</button>
							))}
						</div>
						<div className="w-full h-[1px] bg-[var(--line,#334155)] my-0.5" />
						{/* Lower Jaw */}
						<div className="grid grid-cols-8 gap-1">
							{["48", "47", "46", "45", "44", "43", "42", "41"].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => {
										onBindTooth?.(t);
										setIsToothPickerOpen(false);
									}}
									className={`h-6 text-[10px] font-bold rounded flex items-center justify-center cursor-pointer transition-colors ${
										boundToothCode === t
											? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
											: "bg-[var(--paper-soft,#1e293b)] hover:bg-[var(--teal,#0d9488)]/25 text-[var(--ink,#f8fafc)]"
									}`}
								>
									{t}
								</button>
							))}
						</div>
						<div className="grid grid-cols-8 gap-1">
							{["31", "32", "33", "34", "35", "36", "37", "38"].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => {
										onBindTooth?.(t);
										setIsToothPickerOpen(false);
									}}
									className={`h-6 text-[10px] font-bold rounded flex items-center justify-center cursor-pointer transition-colors ${
										boundToothCode === t
											? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
											: "bg-[var(--paper-soft,#1e293b)] hover:bg-[var(--teal,#0d9488)]/25 text-[var(--ink,#f8fafc)]"
									}`}
								>
									{t}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

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
					className="secondary-button shrink-0"
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
					className="primary-button shrink-0"
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

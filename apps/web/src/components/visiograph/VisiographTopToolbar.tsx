/**
 * VisiographTopToolbar.tsx
 *
 * Strict 1-Row Top Toolbar for Visiograph Studio (Mandates 8d, 8e):
 * - Primary tools: Pointer, Ruler, Apex WL, Invert, Rotate 90°
 * - Secondary tools dropdown: Calibrate, Angle, Lesion, Rotate 180°
 * - 1-Click Sensor Presets & Clinical Filters selectors
 * - Zoom controls, Reset, Print protocol, Export
 */

import {
	Activity,
	AlertTriangle,
	Compass,
	Contrast,
	FileDown,
	MousePointer,
	Printer,
	RotateCcw,
	RotateCw,
	Ruler,
	Scale,
	Sliders,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
	CLINICAL_VISIOGRAPH_FILTERS,
	type ClinicalVisiographFilterPreset,
} from "./VisiographWindowPresets";
import type { ActiveVisiographToolType } from "./VisiographInteractiveOverlay";
import type { VisiographImageParams } from "./VisiographImageProcessor";
import type { DentalSensorPreset } from "./VisiographMeasurementMath";

export type SensorPresetItem = DentalSensorPreset;

export interface VisiographTopToolbarProps {
	activeTool: ActiveVisiographToolType;
	setActiveTool: (tool: ActiveVisiographToolType) => void;
	onClearDrawing: () => void;
	params: VisiographImageParams;
	setParams: React.Dispatch<React.SetStateAction<VisiographImageParams>>;
	activeClinicalFilter: string | null;
	onApplyClinicalFilter: (filter: ClinicalVisiographFilterPreset) => void;
	canvasZoom: number;
	setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
	setCanvasRotationDeg: React.Dispatch<React.SetStateAction<number>>;
	sensorPresets: readonly SensorPresetItem[];
	activeSensorPresetId: string | null;
	isCalibrated: boolean;
	onApplySensorPreset: (preset: SensorPresetItem) => void;
	onResetAll: () => void;
	onPrintProtocol: () => void;
	onOpenExportModal: () => void;
	onClose?: (() => void) | undefined;
}

export function VisiographTopToolbar({
	activeTool,
	setActiveTool,
	onClearDrawing,
	params,
	setParams,
	activeClinicalFilter,
	onApplyClinicalFilter,
	canvasZoom,
	setCanvasZoom,
	setCanvasRotationDeg,
	sensorPresets,
	activeSensorPresetId,
	isCalibrated,
	onApplySensorPreset,
	onResetAll,
	onPrintProtocol,
	onOpenExportModal,
	onClose,
}: VisiographTopToolbarProps) {
	const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);

	return (
		<div
			className="visiograph-top-toolbar"
			style={{
				display: "flex",
				flexWrap: "nowrap",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "2px 8px",
				height: "36px",
				minHeight: "36px",
				maxHeight: "36px",
				background: "var(--paper-soft, #161b22)",
				borderBottom: "1px solid var(--line, #30363d)",
				gap: "6px",
				overflowX: "auto",
				whiteSpace: "nowrap",
			}}
		>
			{/* Primary Tools: Pointer, Ruler, Apex + Invert + Rotate + Secondary Tools Dropdown */}
			<div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
				<button
					type="button"
					data-testid="btn-tool-pointer"
					onClick={() => {
						setActiveTool("pointer");
						onClearDrawing();
					}}
					style={{
						height: "30px",
						background: activeTool === "pointer" ? "var(--primary, #1f6feb)" : "var(--paper-strong, #0d1117)",
						color: activeTool === "pointer" ? "#ffffff" : "var(--ink, #c9d1d9)",
						border: "1px solid var(--line, #30363d)",
						borderRadius: "5px",
						padding: "2px 8px",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "4px",
						fontSize: "0.78rem",
						fontWeight: 500,
					}}
					title="Указатель (Просмотр)"
				>
					<MousePointer size={14} /> <span>Указатель</span>
				</button>

				<button
					type="button"
					data-testid="btn-tool-ruler"
					onClick={() => {
						setActiveTool("ruler");
						onClearDrawing();
					}}
					style={{
						height: "30px",
						background: activeTool === "ruler" ? "var(--primary, #1f6feb)" : "var(--paper-strong, #0d1117)",
						color: activeTool === "ruler" ? "#ffffff" : "var(--primary, #58a6ff)",
						border: "1px solid var(--line, #30363d)",
						borderRadius: "5px",
						padding: "2px 8px",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "4px",
						fontSize: "0.78rem",
						fontWeight: 600,
					}}
					title="Измерить расстояние между двумя точками (мм)"
				>
					<Ruler size={14} /> <span>Линейка</span>
				</button>

				<button
					type="button"
					data-testid="btn-tool-apex"
					onClick={() => {
						setActiveTool("root_canal");
						onClearDrawing();
					}}
					style={{
						height: "30px",
						background: activeTool === "root_canal" ? "var(--success, #238636)" : "var(--paper-strong, #0d1117)",
						color: activeTool === "root_canal" ? "#ffffff" : "var(--success, #3fb950)",
						border: `1px solid ${activeTool === "root_canal" ? "var(--success, #238636)" : "var(--line, #30363d)"}`,
						borderRadius: "5px",
						padding: "2px 8px",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "4px",
						fontSize: "0.78rem",
						fontWeight: 700,
					}}
					title="Эндо-линейка (Apex Locator / WL): измерение рабочей длины канала в мм"
				>
					<Activity size={14} /> <span>Апекс WL</span>
				</button>

				{/* Direct 1-Click Invert (Negative/Positive) — Hick's Law */}
				<button
					type="button"
					data-testid="btn-tool-invert"
					onClick={() => setParams((prev) => ({ ...prev, invert: !prev.invert }))}
					style={{
						height: "30px",
						background: params.invert ? "var(--teal, #0d9488)" : "var(--paper-strong, #0d1117)",
						color: params.invert ? "#ffffff" : "var(--ink, #c9d1d9)",
						border: `1px solid ${params.invert ? "var(--teal, #0d9488)" : "var(--line, #30363d)"}`,
						borderRadius: "5px",
						padding: "2px 8px",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "4px",
						fontSize: "0.78rem",
						fontWeight: 600,
					}}
					title="Инверсия (Негатив / Позитив) для оценки микротрещин"
				>
					<Contrast size={14} /> <span>Негатив</span>
				</button>

				{/* Direct 1-Click Rotate 90° */}
				<button
					type="button"
					data-testid="btn-tool-rotate"
					onClick={() => setCanvasRotationDeg((r) => (r + 90) % 360)}
					style={{
						height: "30px",
						background: "var(--paper-strong, #0d1117)",
						color: "var(--ink, #c9d1d9)",
						border: "1px solid var(--line, #30363d)",
						borderRadius: "5px",
						padding: "2px 8px",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "4px",
						fontSize: "0.78rem",
					}}
					title="Повернуть снимок на 90°"
				>
					<RotateCw size={14} /> <span>90°</span>
				</button>

				{/* Secondary Tools Dropdown: Calibrate, Angle, Lesion, Rotate 180 */}
				<div style={{ position: "relative", display: "inline-block" }}>
					<button
						type="button"
						data-testid="btn-tools-dropdown"
						onClick={() => setIsToolsMenuOpen((prev) => !prev)}
						style={{
							height: "30px",
							background: ["calibrate", "angle", "lesion"].includes(activeTool) ? "var(--primary, #1f6feb)" : "var(--paper-strong, #0d1117)",
							color: ["calibrate", "angle", "lesion"].includes(activeTool) ? "#ffffff" : "var(--ink, #c9d1d9)",
							border: "1px solid var(--line, #30363d)",
							borderRadius: "5px",
							padding: "2px 8px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "4px",
							fontSize: "0.78rem",
							fontWeight: 500,
						}}
						title="Дополнительные инструменты: калибровка, угломер, очаг деструкции"
					>
						<Sliders size={13} />
						<span>
							{activeTool === "calibrate"
								? "Калибр."
								: activeTool === "angle"
									? "Угломер"
									: activeTool === "lesion"
										? "Очаг"
										: "Ещё ▾"}
						</span>
					</button>
					{isToolsMenuOpen && (
						<div
							style={{
								position: "absolute",
								top: "calc(100% + 4px)",
								left: 0,
								background: "var(--paper-strong, #0d1117)",
								border: "1px solid var(--line, #30363d)",
								borderRadius: "8px",
								boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
								zIndex: 60,
								minWidth: "210px",
								display: "flex",
								flexDirection: "column",
								padding: "4px",
								gap: "2px",
							}}
						>
							<button
								type="button"
								onClick={() => {
									setActiveTool("calibrate");
									onClearDrawing();
									setIsToolsMenuOpen(false);
								}}
								style={{
									height: "32px",
									background: activeTool === "calibrate" ? "var(--primary, #1f6feb)" : "transparent",
									color: activeTool === "calibrate" ? "#ffffff" : "var(--ink, #c9d1d9)",
									border: "none",
									borderRadius: "5px",
									padding: "4px 10px",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "8px",
									fontSize: "0.8rem",
									textAlign: "left",
								}}
							>
								<Scale size={14} />
								<span>Калибровка по эталону</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setActiveTool("angle");
									onClearDrawing();
									setIsToolsMenuOpen(false);
								}}
								style={{
									height: "32px",
									background: activeTool === "angle" ? "var(--primary, #1f6feb)" : "transparent",
									color: activeTool === "angle" ? "#ffffff" : "var(--ink, #c9d1d9)",
									border: "none",
									borderRadius: "5px",
									padding: "4px 10px",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "8px",
									fontSize: "0.8rem",
									textAlign: "left",
								}}
							>
								<Compass size={14} />
								<span>Угломер оси зуба</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setActiveTool("lesion");
									onClearDrawing();
									setIsToolsMenuOpen(false);
								}}
								style={{
									height: "32px",
									background: activeTool === "lesion" ? "var(--primary, #1f6feb)" : "transparent",
									color: activeTool === "lesion" ? "#ffffff" : "var(--ink, #c9d1d9)",
									border: "none",
									borderRadius: "5px",
									padding: "4px 10px",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "8px",
									fontSize: "0.8rem",
									textAlign: "left",
								}}
							>
								<AlertTriangle size={14} />
								<span>Очаг деструкции (мм²)</span>
							</button>
							<div style={{ height: "1px", background: "var(--line, #30363d)", margin: "2px 0" }} />
							<button
								type="button"
								onClick={() => {
									setCanvasRotationDeg((r) => (r + 180) % 360);
									setIsToolsMenuOpen(false);
								}}
								style={{
									height: "32px",
									background: "transparent",
									color: "var(--ink, #c9d1d9)",
									border: "none",
									borderRadius: "5px",
									padding: "4px 10px",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "8px",
									fontSize: "0.8rem",
									textAlign: "left",
								}}
							>
								<RotateCw size={14} />
								<span>Повернуть на 180°</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Center/Right: Sensor preset + Clinical filter select + Zoom + Reset + Print + Export */}
			<div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
				{/* 1-Click Sensor Calibration Presets */}
				<div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
					<span style={{ fontSize: "0.75rem", color: "var(--muted, #8b949e)", whiteSpace: "nowrap" }}>
						Датчик:
					</span>
					<select
						value={activeSensorPresetId ?? (isCalibrated ? "manual" : "")}
						onChange={(e) => {
							const val = e.target.value;
							if (val === "manual") {
								setActiveTool("calibrate");
								onClearDrawing();
							} else {
								const preset = sensorPresets.find((p) => p.id === val);
								if (preset) {
									onApplySensorPreset(preset);
								}
							}
						}}
						style={{
							height: "30px",
							background: "var(--paper-strong, #0d1117)",
							color: "var(--ink, #c9d1d9)",
							border: "1px solid var(--line, #30363d)",
							borderRadius: "5px",
							padding: "2px 6px",
							fontSize: "0.78rem",
							cursor: "pointer",
						}}
						title="1-клик калибровка по стандартным датчикам RVG / ОПТГ"
					>
						<option value="">Калибровка датчика...</option>
						{sensorPresets.map((p) => (
							<option key={p.id} value={p.id}>
								{p.label}
							</option>
						))}
						<option value="manual">Ручная калибровка (шарик 5 мм)</option>
					</select>
				</div>

				{/* 1-Click Clinical Filters Selector */}
				<div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
					<span style={{ fontSize: "0.75rem", color: "var(--muted, #8b949e)", whiteSpace: "nowrap" }}>
						Фильтр:
					</span>
					<select
						value={activeClinicalFilter ?? ""}
						onChange={(e) => {
							const val = e.target.value;
							if (!val) {
								setParams((prev) => ({
									...prev,
									brightness: 0,
									contrast: 0,
									gamma: 1.0,
									sharpness: 0,
								}));
							} else {
								const f = CLINICAL_VISIOGRAPH_FILTERS.find((item) => item.id === val);
								if (f) {
									onApplyClinicalFilter(f);
								}
							}
						}}
						style={{
							height: "30px",
							background: "var(--paper-strong, #0d1117)",
							color: "var(--ink, #c9d1d9)",
							border: "1px solid var(--line, #30363d)",
							borderRadius: "5px",
							padding: "2px 6px",
							fontSize: "0.78rem",
							cursor: "pointer",
						}}
						title="Клинические фильтры радиовизиографа (Контраст, Резкость, Эндо, Кость)"
					>
						<option value="">Без фильтра (Стандарт)</option>
						{CLINICAL_VISIOGRAPH_FILTERS.map((f) => (
							<option key={f.id} value={f.id}>
								{f.label} ({f.badge})
							</option>
						))}
					</select>
				</div>

				{/* Zoom Controls */}
				<div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
					<button
						type="button"
						onClick={() => setCanvasZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(2))))}
						style={{
							height: "30px",
							minWidth: "30px",
							background: "var(--paper-strong, #0d1117)",
							color: "var(--ink, #c9d1d9)",
							border: "1px solid var(--line, #30363d)",
							borderRadius: "5px 0 0 5px",
							padding: "2px 6px",
							fontSize: "0.78rem",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
						}}
						title="Уменьшить масштаб"
					>
						<ZoomOut size={13} />
					</button>
					<button
						type="button"
						onClick={() => {
							setCanvasZoom(1.0);
							setCanvasRotationDeg(0);
						}}
						style={{
							height: "30px",
							minWidth: "40px",
							background: "var(--paper-strong, #0d1117)",
							color: "var(--primary, #58a6ff)",
							borderTop: "1px solid var(--line, #30363d)",
							borderBottom: "1px solid var(--line, #30363d)",
							borderLeft: "none",
							borderRight: "none",
							padding: "2px 6px",
							fontSize: "0.76rem",
							cursor: "pointer",
							fontFamily: "monospace",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
						}}
						title="Сброс масштаба и поворота к 100%"
					>
						{Math.round(canvasZoom * 100)}%
					</button>
					<button
						type="button"
						onClick={() => setCanvasZoom((z) => Math.min(3.5, Number((z + 0.2).toFixed(2))))}
						style={{
							height: "30px",
							minWidth: "30px",
							background: "var(--paper-strong, #0d1117)",
							color: "var(--ink, #c9d1d9)",
							border: "1px solid var(--line, #30363d)",
							borderRadius: "0 5px 5px 0",
							padding: "2px 6px",
							fontSize: "0.78rem",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
						}}
						title="Увеличить масштаб"
					>
						<ZoomIn size={13} />
					</button>
				</div>

				{/* 1-Click Reset — Hick's Law */}
				<button
					type="button"
					onClick={onResetAll}
					style={{
						height: "30px",
						background: "var(--paper-strong, #0d1117)",
						color: "var(--muted, #8b949e)",
						border: "1px solid var(--line, #30363d)",
						borderRadius: "5px",
						padding: "2px 8px",
						fontSize: "0.78rem",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "4px",
					}}
					title="Сбросить все фильтры, масштаб и поворот"
				>
					<RotateCcw size={13} /> <span>Сброс</span>
				</button>

				{/* 1-Click Legal Protocol Printout — Doctor Autonomy (Mandate 8e) */}
				<button
					type="button"
					data-testid="btn-visiograph-print-protocol"
					onClick={onPrintProtocol}
					style={{
						height: "30px",
						background: "var(--teal, #0d9488)",
						color: "var(--paper, #ffffff)",
						border: "none",
						borderRadius: "5px",
						padding: "2px 10px",
						fontSize: "0.78rem",
						fontWeight: 600,
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "5px",
					}}
					title="Быстрая печать протокола РВГ с юридическим штампом и таблицей измерений"
				>
					<Printer size={13} /> <span>Печать</span>
				</button>

				{/* Export & Legal Watermark */}
				<button
					type="button"
					data-testid="btn-visiograph-export-modal"
					onClick={onOpenExportModal}
					style={{
						height: "30px",
						background: "var(--success, #238636)",
						color: "var(--paper, #ffffff)",
						border: "none",
						borderRadius: "5px",
						padding: "2px 10px",
						fontSize: "0.78rem",
						fontWeight: 600,
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "5px",
					}}
					title="Экспорт снимка (JPEG, PNG, DICOM)"
				>
					<FileDown size={13} /> <span>Экспорт</span>
				</button>

				{onClose && (
					<button
						type="button"
						onClick={onClose}
						style={{
							height: "30px",
							width: "30px",
							background: "transparent",
							color: "var(--muted, #8b949e)",
							border: "none",
							cursor: "pointer",
							padding: "4px",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							borderRadius: "5px",
						}}
						title="Закрыть студию"
					>
						<X size={16} />
					</button>
				)}
			</div>
		</div>
	);
}

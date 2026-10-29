/**
 * VisiographStudioSidebar.tsx
 * Left adjustments sidebar for Visiograph & PACS Studio (Mandates 8b, 8e, 8n).
 */

import type React from "react";
import { AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import "./VisiographStudioSidebar.css";
import { VisiographImageSliders } from "./VisiographImageSliders";
import type { VisiographImageParams } from "./VisiographImageProcessor";
import { STANDARD_SENSOR_PRESETS, type ActiveVisiographTool, type SensorCalibrationPreset } from "./VisiographStudioTypes";
import type { CalibrationReference } from "./VisiographMeasurementMath";

export interface VisiographStudioSidebarProps {
	params: VisiographImageParams;
	setParams: React.Dispatch<React.SetStateAction<VisiographImageParams>>;
	onResetParams: () => void;
	setActiveClinicalFilter: React.Dispatch<React.SetStateAction<string | null>>;
	isCalibrated: boolean;
	calibration: CalibrationReference;
	activeTool: ActiveVisiographTool;
	activeSensorPresetId: string | null;
	onApplySensorPreset: (preset: SensorCalibrationPreset) => void;
	onStartManualCalibration: () => void;
	rulersCount: number;
	anglesCount: number;
	lesionsCount: number;
	onClearAllMeasurements: () => void;
}

export function VisiographStudioSidebar({
	params, setParams, onResetParams, setActiveClinicalFilter,
	isCalibrated, calibration, activeTool, activeSensorPresetId,
	onApplySensorPreset, onStartManualCalibration,
	rulersCount, anglesCount, lesionsCount, onClearAllMeasurements,
}: VisiographStudioSidebarProps) {
	return (
		<div className="visiograph-studio-sidebar">
			<VisiographImageSliders params={params} setParams={setParams} onResetParams={onResetParams} setActiveClinicalFilter={setActiveClinicalFilter} />
			<hr className="visiograph-sidebar-divider" />
			<div className="visiograph-sidebar-calib-box" style={{ border: `1px solid ${isCalibrated ? "var(--success, #238636)" : "var(--line, #30363d)"}` }}>
				<div style={{ fontWeight: 600, color: isCalibrated ? "var(--success, #3fb950)" : "var(--muted, #8b949e)", display: "flex", alignItems: "center", gap: 4 }}>
					{isCalibrated ? <><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /><span>[Откалибровано]</span></> : <><AlertTriangle size={13} className="text-amber-500 shrink-0" /><span>[Стандартный масштаб]</span></>}
				</div>
				<div>1 px = {calibration.scaleMmPerPixel.toFixed(4)} мм</div>
				{activeTool === "calibrate" && <div style={{ marginTop: 2, color: "var(--success, #76ff03)" }}>Кликните 2 точки на эталоне (шарик 5 мм) на снимке.</div>}
				<div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
					<span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted, #8b949e)" }}>Пресеты датчиков:</span>
					{STANDARD_SENSOR_PRESETS.map((preset) => {
						const isSelected = activeSensorPresetId === preset.id;
						return (
							<button key={preset.id} type="button" onClick={() => onApplySensorPreset(preset)} className="visiograph-sidebar-preset-btn"
								style={{
									background: isSelected ? "var(--teal, var(--primary, #0d9488))" : "var(--paper, #21262d)",
									color: isSelected ? "#ffffff" : "var(--ink, #c9d1d9)",
									border: `1px solid ${isSelected ? "var(--teal, var(--primary, #0d9488))" : "var(--line, #30363d)"}`,
								}} title={preset.description}>
								<span>{preset.label}</span>{isSelected && <CheckCircle2 size={14} />}
							</button>
						);
					})}
					<button key="manual-calib-btn" type="button" onClick={onStartManualCalibration} className="visiograph-sidebar-preset-btn"
						style={{
							background: activeTool === "calibrate" ? "var(--teal, var(--primary, #0d9488))" : "var(--paper, #21262d)",
							color: activeTool === "calibrate" ? "#ffffff" : "var(--ink, #c9d1d9)",
							border: `1px solid ${activeTool === "calibrate" ? "var(--teal, var(--primary, #0d9488))" : "var(--line, #30363d)"}`,
						}} title="Ручная калибровка по 2 точкам (шарик 5.0 мм или шаг резьбы)">
						<span>Ручная калибровка (шарик / резьба)</span><Scale size={14} />
					</button>
				</div>
			</div>
			<div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
				<div style={{ fontSize: "0.74rem", color: "var(--muted, #8b949e)" }}>
					Замеры: {rulersCount} лин., {anglesCount} угл., {lesionsCount} очаг.
				</div>
				{(rulersCount > 0 || anglesCount > 0 || lesionsCount > 0) && (
					<button type="button" onClick={onClearAllMeasurements} className="visiograph-sidebar-clear-btn">Очистить все замеры</button>
				)}
			</div>
		</div>
	);
}

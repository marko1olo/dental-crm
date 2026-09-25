import React from "react";
import { CLINICAL_2D_WL_PRESETS, type ClinicalWlPreset } from "./dentalViewerMath";

export interface Dental2DRadiologySubToolbarProps {
	readonly activePresetId: string;
	readonly onApplyPreset: (preset: ClinicalWlPreset) => void;
	readonly brightness: number;
	readonly onChangeBrightness: (b: number) => void;
	readonly contrast: number;
	readonly onChangeContrast: (c: number) => void;
	readonly measurementsCount: number;
	readonly onClearMeasurements: () => void;
}

export const Dental2DRadiologySubToolbar: React.FC<Dental2DRadiologySubToolbarProps> = ({
	activePresetId,
	onApplyPreset,
	brightness,
	onChangeBrightness,
	contrast,
	onChangeContrast,
	measurementsCount,
	onClearMeasurements,
}) => {
	return (
		<div
			style={{
				height: "32px",
				minHeight: "32px",
				backgroundColor: "#090d16",
				borderBottom: "1px solid #1e293b",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "0 10px",
				fontSize: "11px",
				color: "#94a3b8",
				gap: "10px",
				overflowX: "auto",
			}}
		>
			{/* Presets */}
			<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
				<span style={{ fontWeight: 600, color: "#64748b" }}>Пресеты:</span>
				{CLINICAL_2D_WL_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						onClick={() => onApplyPreset(preset)}
						style={{
							height: "22px",
							padding: "0 6px",
							fontSize: "10px",
							fontWeight: activePresetId === preset.id ? 700 : 500,
							borderRadius: "4px",
							border: activePresetId === preset.id ? "1px solid #14b8a6" : "1px solid #334155",
							backgroundColor: activePresetId === preset.id ? "#134e4a" : "#1e293b",
							color: activePresetId === preset.id ? "#5eead4" : "#cbd5e1",
							cursor: "pointer",
						}}
						title={preset.description}
					>
						{preset.shortLabel}
					</button>
				))}
			</div>

			{/* Sliders: Brightness & Contrast */}
			<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
				<label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<span>Яркость:</span>
					<input
						type="range"
						min="20"
						max="200"
						value={brightness}
						onChange={(e) => onChangeBrightness(Number(e.target.value))}
						style={{ width: "70px", accentColor: "#14b8a6" }}
					/>
					<span style={{ fontFamily: "monospace", width: "28px" }}>{brightness}%</span>
				</label>

				<label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<span>Контраст:</span>
					<input
						type="range"
						min="30"
						max="300"
						value={contrast}
						onChange={(e) => onChangeContrast(Number(e.target.value))}
						style={{ width: "70px", accentColor: "#14b8a6" }}
					/>
					<span style={{ fontFamily: "monospace", width: "28px" }}>{contrast}%</span>
				</label>

				{measurementsCount > 0 && (
					<button
						type="button"
						onClick={onClearMeasurements}
						style={{
							height: "20px",
							padding: "0 6px",
							fontSize: "10px",
							borderRadius: "3px",
							border: "1px solid #475569",
							background: "transparent",
							color: "#94a3b8",
							cursor: "pointer",
						}}
						title="Удалить все нарисованные линейки"
					>
						Очистить линейки ({measurementsCount})
					</button>
				)}
			</div>
		</div>
	);
};

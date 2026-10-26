/**
 * DicomWindowLevelSliders.tsx — Слайдеры ширины (WW) и уровня (WL) окна DICOM
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { numberInputStyle } from "./dicomRibbonConstants.js";

interface Props {
	windowWidth: number;
	windowCenter: number;
	onViewportChange: (delta: { windowWidth?: number; windowCenter?: number }) => void;
}

export const DicomWindowLevelSliders: React.FC<Props> = ({
	windowWidth,
	windowCenter,
	onViewportChange,
}) => {
	return (
		<>
			<div style={{ marginBottom: "8px" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
					<span style={{ color: "#94a3b8" }}>Ширина:</span>
					<input
						type="number"
						min={1}
						max={10000}
						value={windowWidth}
						onChange={(e) => {
							const val = Number.parseInt(e.target.value, 10);
							if (!Number.isNaN(val) && val > 0) onViewportChange({ windowWidth: val });
						}}
						style={numberInputStyle}
					/>
				</div>
				<input
					type="range"
					min={100}
					max={8000}
					step={50}
					value={windowWidth}
					onChange={(e) => onViewportChange({ windowWidth: Number(e.target.value) })}
					style={{ width: "100%", accentColor: "#0d9488", cursor: "pointer" }}
				/>
			</div>

			<div style={{ marginBottom: "10px" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
					<span style={{ color: "#94a3b8" }}>Уровень:</span>
					<input
						type="number"
						min={-1000}
						max={3000}
						value={windowCenter}
						onChange={(e) => {
							const val = Number.parseInt(e.target.value, 10);
							if (!Number.isNaN(val)) onViewportChange({ windowCenter: val });
						}}
						style={numberInputStyle}
					/>
				</div>
				<input
					type="range"
					min={-500}
					max={2500}
					step={25}
					value={windowCenter}
					onChange={(e) => onViewportChange({ windowCenter: Number(e.target.value) })}
					style={{ width: "100%", accentColor: "#8b5cf6", cursor: "pointer" }}
				/>
			</div>
		</>
	);
};

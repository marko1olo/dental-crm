/**
 * DENTE CRM — Window / Level Management Dock Panel (Layer 4)
 * Strict invariants: Mandate 8b (<=800 lines), Mandate 8d (Clinical density), Mandate 8e (Doctor Autonomy).
 */

import React from "react";
import { RotateCcw } from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import {
	checkboxLabelStyle,
	numberInputStyle,
	RESET_WINDOW_PRESET,
} from "./dicomRibbonConstants.js";
import type { DicomWindowLevelPanelProps } from "./types.js";

export const DicomWindowLevelPanel: React.FC<DicomWindowLevelPanelProps> = ({
	panelRef,
	viewportState,
	onViewportChange,
}) => {
	return (
		<div
			ref={panelRef}
			id="dicom-window-management-dock"
			style={{
				position: "absolute",
				top: "42px",
				left: "12px",
				width: "270px",
				backgroundColor: "#0b1120",
				border: "1px solid #334155",
				borderRadius: "8px",
				boxShadow: "0 15px 35px rgba(0,0,0,0.75)",
				zIndex: 10002,
				padding: "10px",
				color: "#f8fafc",
				fontSize: "12px",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderBottom: "1px solid #1e293b",
					paddingBottom: "6px",
					marginBottom: "8px",
				}}
			>
				<span style={{ fontWeight: 800, letterSpacing: "0.5px", color: "#e2e8f0" }}>
					УПРАВЛЕНИЕ ОКНАМИ
				</span>
				<button
					type="button"
					onClick={() => {
						onViewportChange(RESET_WINDOW_PRESET);
						showToast("Окна сброшены к стандартным значениям", "info");
					}}
					style={{
						background: "transparent",
						border: "none",
						color: "#94a3b8",
						cursor: "pointer",
					}}
					title="Сброс окна"
				>
					<RotateCcw size={12} />
				</button>
			</div>

			<div style={{ marginBottom: "8px" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "3px",
					}}
				>
					<span style={{ color: "#94a3b8" }}>Ширина:</span>
					<input
						type="number"
						min={1}
						max={10000}
						value={viewportState.windowWidth}
						onChange={(e) => {
							const val = Number.parseInt(e.target.value, 10);
							if (!Number.isNaN(val) && val > 0) {
								onViewportChange({ windowWidth: val });
							}
						}}
						style={numberInputStyle}
					/>
				</div>
				<input
					type="range"
					min={100}
					max={8000}
					step={50}
					value={viewportState.windowWidth}
					onChange={(e) => onViewportChange({ windowWidth: Number(e.target.value) })}
					style={{ width: "100%", accentColor: "#0d9488", cursor: "pointer" }}
				/>
			</div>

			<div style={{ marginBottom: "10px" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "3px",
					}}
				>
					<span style={{ color: "#94a3b8" }}>Уровень:</span>
					<input
						type="number"
						min={-1000}
						max={3000}
						value={viewportState.windowCenter}
						onChange={(e) => {
							const val = Number.parseInt(e.target.value, 10);
							if (!Number.isNaN(val)) {
								onViewportChange({ windowCenter: val });
							}
						}}
						style={numberInputStyle}
					/>
				</div>
				<input
					type="range"
					min={-500}
					max={2500}
					step={25}
					value={viewportState.windowCenter}
					onChange={(e) => onViewportChange({ windowCenter: Number(e.target.value) })}
					style={{ width: "100%", accentColor: "#8b5cf6", cursor: "pointer" }}
				/>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "6px",
					backgroundColor: "#131b2e",
					padding: "8px",
					borderRadius: "6px",
					border: "1px solid #1e293b",
				}}
			>
				<label style={checkboxLabelStyle}>
					<input
						type="checkbox"
						checked={Boolean(viewportState.smooth)}
						onChange={(e) => onViewportChange({ smooth: e.target.checked })}
						style={{ accentColor: "#0d9488" }}
					/>
					<span>Сглаживание</span>
				</label>
				<label style={checkboxLabelStyle}>
					<input
						type="checkbox"
						checked={viewportState.sharpen > 0}
						onChange={(e) =>
							onViewportChange({ sharpen: e.target.checked ? 35 : 0 })
						}
						style={{ accentColor: "#8b5cf6" }}
					/>
					<span>Резкость</span>
				</label>
				<label style={checkboxLabelStyle}>
					<input
						type="checkbox"
						checked={Boolean(viewportState.mip)}
						onChange={(e) => onViewportChange({ mip: e.target.checked })}
						style={{ accentColor: "#0d9488" }}
					/>
					<span>MIP</span>
				</label>
				<label style={checkboxLabelStyle}>
					<input
						type="checkbox"
						checked={Boolean(viewportState.maxRes)}
						onChange={(e) => onViewportChange({ maxRes: e.target.checked })}
						style={{ accentColor: "#8b5cf6" }}
					/>
					<span>Макс. резкость</span>
				</label>
				<label style={checkboxLabelStyle}>
					<input
						type="checkbox"
						checked={Boolean(viewportState.vr)}
						onChange={(e) => onViewportChange({ vr: e.target.checked })}
						style={{ accentColor: "#0d9488" }}
					/>
					<span>VR (3D)</span>
				</label>
				<label style={checkboxLabelStyle}>
					<input
						type="checkbox"
						checked={Boolean(viewportState.invert)}
						onChange={(e) => onViewportChange({ invert: e.target.checked })}
						style={{ accentColor: "#3b82f6" }}
					/>
					<span>Инверсия</span>
				</label>
			</div>
		</div>
	);
};

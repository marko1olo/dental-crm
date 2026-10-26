/**
 * DicomWindowLevelPanel.tsx — Панель управления окнами яркости/контраста (WW/WL)
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { RotateCcw } from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import { RESET_WINDOW_PRESET } from "./dicomRibbonConstants.js";
import type { DicomWindowLevelPanelProps } from "./types.js";
import { DicomWindowLevelSliders } from "./DicomWindowLevelSliders.js";
import { DicomWindowLevelFilters } from "./DicomWindowLevelFilters.js";

export const DicomWindowLevelPanel: React.FC<DicomWindowLevelPanelProps> = ({
	panelRef,
	viewportState,
	onViewportChange,
}) => {
	const handleReset = () => {
		onViewportChange(RESET_WINDOW_PRESET);
		showToast("Окна сброшены к стандартным значениям", "info");
	};

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
					onClick={handleReset}
					style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
					title="Сброс окна"
				>
					<RotateCcw size={12} />
				</button>
			</div>

			<DicomWindowLevelSliders
				windowWidth={viewportState.windowWidth}
				windowCenter={viewportState.windowCenter}
				onViewportChange={onViewportChange}
			/>

			<DicomWindowLevelFilters
				viewportState={viewportState}
				onViewportChange={onViewportChange}
			/>
		</div>
	);
};

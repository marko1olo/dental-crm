/**
 * DicomWindowLevelFilters.tsx — Чекбоксы фильтров рендеринга (сглаживание, резкость, MIP, VR)
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { checkboxLabelStyle } from "./dicomRibbonConstants.js";

interface Props {
	viewportState: any;
	onViewportChange: (delta: any) => void;
}

export const DicomWindowLevelFilters: React.FC<Props> = ({
	viewportState,
	onViewportChange,
}) => {
	return (
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
					onChange={(e) => onViewportChange({ sharpen: e.target.checked ? 35 : 0 })}
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
	);
};

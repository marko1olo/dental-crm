/**
 * DicomClippingControls.tsx — Элементы управления плоскостью и направлением обрезки ROI
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { selectInputStyle } from "./dicomRibbonConstants.js";
import type { ClippingDir, ClippingPlane, ClippingRef } from "./types.js";

interface Props {
	clippingPlane: ClippingPlane;
	onChangeClippingPlane: (plane: ClippingPlane) => void;
	clippingRef: ClippingRef;
	onChangeClippingRef: (ref: ClippingRef) => void;
	clippingDir: ClippingDir;
	onChangeClippingDir: (dir: ClippingDir) => void;
}

export const DicomClippingControls: React.FC<Props> = ({
	clippingPlane,
	onChangeClippingPlane,
	clippingRef,
	onChangeClippingRef,
	clippingDir,
	onChangeClippingDir,
}) => {
	const dirBtn = (dir: ClippingDir, label: string) => (
		<button
			type="button"
			onClick={() => onChangeClippingDir(dir)}
			style={{
				flex: 1,
				height: "24px",
				borderRadius: "4px",
				border: clippingDir === dir ? "1px solid #0d9488" : "1px solid #334155",
				backgroundColor: clippingDir === dir ? "#134e4a" : "#1e293b",
				color: clippingDir === dir ? "#2dd4bf" : "#cbd5e1",
				cursor: "pointer",
				fontWeight: 600,
			}}
		>
			{label}
		</button>
	);

	return (
		<>
			<div style={{ marginBottom: "6px" }}>
				<label style={{ display: "block", color: "#94a3b8", marginBottom: "3px" }}>Плоскость:</label>
				<select value={clippingPlane} onChange={(e) => onChangeClippingPlane(e.target.value as any)} style={selectInputStyle}>
					<option value="sagittal">Сагиттальная</option>
					<option value="coronal">Фронтальная (Корональная)</option>
					<option value="axial">Аксиальная</option>
					<option value="custom">Пользовательская</option>
				</select>
			</div>

			<div style={{ marginBottom: "8px" }}>
				<label style={{ display: "block", color: "#94a3b8", marginBottom: "3px" }}>Ориентир:</label>
				<select value={clippingRef} onChange={(e) => onChangeClippingRef(e.target.value as any)} style={selectInputStyle}>
					<option value="user">Пользователь</option>
					<option value="arch_center">Центр зубной дуги</option>
					<option value="symphysis">Симфиз подбородка</option>
				</select>
			</div>

			<div style={{ marginBottom: "10px" }}>
				<span style={{ display: "block", color: "#94a3b8", marginBottom: "4px" }}>Направление:</span>
				<div style={{ display: "flex", gap: "4px" }}>
					{dirBtn("right", "Справа")}
					{dirBtn("left", "Слева")}
				</div>
			</div>
		</>
	);
};

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
				border: clippingDir === dir ? "1px solid var(--primary)" : "1px solid var(--line)",
				backgroundColor: clippingDir === dir ? "var(--primary)" : "var(--paper-soft)",
				color: clippingDir === dir ? "#ffffff" : "var(--ink)",
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
				<label style={{ display: "block", color: "var(--ink-muted)", marginBottom: "3px" }}>Плоскость:</label>
				<select value={clippingPlane} onChange={(e) => onChangeClippingPlane(e.target.value as ClippingPlane)} style={selectInputStyle}>
					<option value="sagittal">Сагиттальная</option>
					<option value="coronal">Фронтальная (Корональная)</option>
					<option value="axial">Аксиальная</option>
					<option value="custom">Пользовательская</option>
				</select>
			</div>

			<div style={{ marginBottom: "8px" }}>
				<label style={{ display: "block", color: "var(--ink-muted)", marginBottom: "3px" }}>Ориентир:</label>
				<select value={clippingRef} onChange={(e) => onChangeClippingRef(e.target.value as ClippingRef)} style={selectInputStyle}>
					<option value="user">Пользователь</option>
					<option value="arch_center">Центр зубной дуги</option>
					<option value="symphysis">Симфиз подбородка</option>
				</select>
			</div>

			<div style={{ marginBottom: "10px" }}>
				<span style={{ display: "block", color: "var(--ink-muted)", marginBottom: "4px" }}>Направление:</span>
				<div style={{ display: "flex", gap: "4px" }}>
					{dirBtn("right", "Справа")}
					{dirBtn("left", "Слева")}
				</div>
			</div>
		</>
	);
};

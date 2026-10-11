/**
 * DENTE CRM — Clipping Box / ROI Management Panel (Layer 4)
 * Strict invariants: Mandate 8b (<=800 lines), Mandate 8d (Clinical density), Mandate 8e (Doctor Autonomy).
 */

import React from "react";
import { Check, Scissors, X } from "lucide-react";
import { selectInputStyle } from "./dicomRibbonConstants.js";
import type { DicomClippingRoiPanelProps } from "./types.js";

export const DicomClippingRoiPanel: React.FC<DicomClippingRoiPanelProps> = ({
	panelRef,
	clippingPlane,
	onChangeClippingPlane,
	clippingRef,
	onChangeClippingRef,
	clippingDir,
	onChangeClippingDir,
	isClippingApplied,
	onToggleClipping,
	onClose,
}) => {
	return (
		<div
			ref={panelRef}
			id="dicom-clipping-dock"
			style={{
				position: "absolute",
				top: "42px",
				left: "140px",
				width: "250px",
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
					ОБРЕЗКА ROI
				</span>
				<button
					type="button"
					onClick={onClose}
					style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
				>
					<X size={13} />
				</button>
			</div>

			<div style={{ marginBottom: "6px" }}>
				<label style={{ display: "block", color: "#94a3b8", marginBottom: "3px" }}>
					Плоскость:
				</label>
				<select
					value={clippingPlane}
					onChange={(e) => onChangeClippingPlane(e.target.value as any)}
					style={selectInputStyle}
				>
					<option value="sagittal">Сагиттальная</option>
					<option value="coronal">Фронтальная (Корональная)</option>
					<option value="axial">Аксиальная</option>
					<option value="custom">Пользовательская</option>
				</select>
			</div>

			<div style={{ marginBottom: "8px" }}>
				<label style={{ display: "block", color: "#94a3b8", marginBottom: "3px" }}>
					Ориентир:
				</label>
				<select
					value={clippingRef}
					onChange={(e) => onChangeClippingRef(e.target.value as any)}
					style={selectInputStyle}
				>
					<option value="user">Пользователь</option>
					<option value="arch_center">Центр зубной дуги</option>
					<option value="symphysis">Симфиз подбородка</option>
				</select>
			</div>

			<div style={{ marginBottom: "10px" }}>
				<span style={{ display: "block", color: "#94a3b8", marginBottom: "4px" }}>
					Направление:
				</span>
				<div style={{ display: "flex", gap: "4px" }}>
					<button
						type="button"
						onClick={() => onChangeClippingDir("right")}
						style={{
							flex: 1,
							height: "24px",
							borderRadius: "4px",
							border: clippingDir === "right" ? "1px solid #0d9488" : "1px solid #334155",
							backgroundColor: clippingDir === "right" ? "#134e4a" : "#1e293b",
							color: clippingDir === "right" ? "#2dd4bf" : "#cbd5e1",
							cursor: "pointer",
							fontWeight: 600,
						}}
					>
						Справа
					</button>
					<button
						type="button"
						onClick={() => onChangeClippingDir("left")}
						style={{
							flex: 1,
							height: "24px",
							borderRadius: "4px",
							border: clippingDir === "left" ? "1px solid #0d9488" : "1px solid #334155",
							backgroundColor: clippingDir === "left" ? "#134e4a" : "#1e293b",
							color: clippingDir === "left" ? "#2dd4bf" : "#cbd5e1",
							cursor: "pointer",
							fontWeight: 600,
						}}
					>
						Слева
					</button>
				</div>
			</div>

			<button
				type="button"
				onClick={onToggleClipping}
				style={{
					width: "100%",
					height: "28px",
					borderRadius: "5px",
					border: "none",
					backgroundColor: isClippingApplied ? "#065f46" : "#0d9488",
					color: "#ffffff",
					fontWeight: 700,
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "6px",
				}}
			>
				{isClippingApplied ? <Check size={14} /> : <Scissors size={14} />}
				<span>{isClippingApplied ? "Сбросить обрезку" : "Применить обрезку"}</span>
			</button>
		</div>
	);
};

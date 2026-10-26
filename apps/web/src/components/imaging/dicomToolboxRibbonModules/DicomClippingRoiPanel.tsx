/**
 * DicomClippingRoiPanel.tsx — Панель обрезки ROI и клиппинг-бокса КЛКТ
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Check, Scissors, X } from "lucide-react";
import type { DicomClippingRoiPanelProps } from "./types.js";
import { DicomClippingControls } from "./DicomClippingControls.js";

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

			<DicomClippingControls
				clippingPlane={clippingPlane}
				onChangeClippingPlane={onChangeClippingPlane}
				clippingRef={clippingRef}
				onChangeClippingRef={onChangeClippingRef}
				clippingDir={clippingDir}
				onChangeClippingDir={onChangeClippingDir}
			/>

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

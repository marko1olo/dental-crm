/**
 * DENTE CRM — Clinical DICOM / RVG Radiography Viewer Modal
 * Complete multi-touch medical viewer for periapical RVG, OPTG, and CBCT slices.
 */

import {
	Activity,
	Contrast,
	Eye,
	Layers,
	Maximize2,
	RotateCcw,
	Ruler,
	Sparkles,
	Sun,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { DicomViewport } from "./DicomViewport.js";
import {
	DENTAL_RADIOGRAPHY_PRESETS,
	DEFAULT_DICOM_VIEWPORT_STATE,
	type CalibratedRulerMeasurement,
	type DicomViewportState,
	type ImagingActiveTool,
} from "./rvgViewerEngine.js";

export interface DicomViewerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly imageSrc: string;
	readonly title?: string | undefined;
	readonly toothFdiCode?: string | undefined;
	readonly patientName?: string | undefined;
	readonly studyDate?: string | undefined;
}

export const DicomViewerModal: React.FC<DicomViewerModalProps> = ({
	isOpen,
	onClose,
	imageSrc,
	title = "Дентальный снимок (RVG / DICOM)",
	toothFdiCode,
	patientName,
	studyDate,
}) => {
	const [viewportState, setViewportState] = useState<DicomViewportState>(
		DEFAULT_DICOM_VIEWPORT_STATE,
	);
	const [measurements, setMeasurements] = useState<CalibratedRulerMeasurement[]>([]);

	if (!isOpen) return null;

	const handleViewportChange = (nextState: Partial<DicomViewportState>) => {
		setViewportState((prev) => ({ ...prev, ...nextState }));
	};

	const handleApplyPreset = (preset: (typeof DENTAL_RADIOGRAPHY_PRESETS)[number]) => {
		setViewportState((prev) => ({
			...prev,
			windowWidth: preset.windowWidth,
			windowCenter: preset.windowCenter,
			gamma: preset.gamma,
			sharpen: preset.sharpen,
			emboss: preset.emboss,
		}));
	};

	const handleReset = () => {
		setViewportState(DEFAULT_DICOM_VIEWPORT_STATE);
		setMeasurements([]);
	};

	const handleAddMeasurement = (m: CalibratedRulerMeasurement) => {
		setMeasurements((prev) => [...prev, m]);
	};

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 9999,
				backgroundColor: "rgba(2, 6, 23, 0.95)",
				display: "flex",
				flexDirection: "column",
				color: "#f8fafc",
				fontFamily: "inherit",
			}}
		>
			{/* Top Header Toolbar */}
			<div
				style={{
					height: "56px",
					backgroundColor: "#0f172a",
					borderBottom: "1px solid #1e293b",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "0 16px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<Activity size={20} color="#0d9488" />
					<div>
						<div style={{ fontWeight: "bold", fontSize: "14px" }}>
							{title} {toothFdiCode ? `· Зуб ${toothFdiCode}` : ""}
						</div>
						<div style={{ fontSize: "11px", color: "#94a3b8" }}>
							{patientName ? `${patientName} · ` : ""}
							{studyDate || "Дата снимка: сегодня"}
						</div>
					</div>
				</div>

				{/* Presets Chips */}
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					{DENTAL_RADIOGRAPHY_PRESETS.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => handleApplyPreset(p)}
							style={{
								padding: "6px 10px",
								fontSize: "12px",
								borderRadius: "6px",
								border: "1px solid #334155",
								backgroundColor: "#1e293b",
								color: "#e2e8f0",
								cursor: "pointer",
							}}
						>
							{p.labelRu}
						</button>
					))}
				</div>

				<button
					type="button"
					onClick={onClose}
					style={{
						background: "transparent",
						border: "none",
						color: "#94a3b8",
						cursor: "pointer",
						padding: "6px",
					}}
					title="Закрыть (Esc)"
				>
					<X size={22} />
				</button>
			</div>

			{/* Center Viewport Area */}
			<div style={{ flex: 1, position: "relative" }}>
				<DicomViewport
					imageSrc={imageSrc}
					viewportState={viewportState}
					onViewportChange={handleViewportChange}
					measurements={measurements}
					onAddMeasurement={handleAddMeasurement}
				/>
			</div>

			{/* Bottom Controls Bar */}
			<div
				style={{
					height: "56px",
					backgroundColor: "#0f172a",
					borderTop: "1px solid #1e293b",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "0 16px",
				}}
			>
				{/* Tool Selectors */}
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<button
						type="button"
						onClick={() => handleViewportChange({ activeTool: "pan" })}
						style={{
							padding: "8px 12px",
							borderRadius: "6px",
							border: "none",
							backgroundColor: viewportState.activeTool === "pan" ? "#0d9488" : "#1e293b",
							color: "#ffffff",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							fontSize: "13px",
						}}
					>
						Панорамирование
					</button>
					<button
						type="button"
						onClick={() => handleViewportChange({ activeTool: "ruler" })}
						style={{
							padding: "8px 12px",
							borderRadius: "6px",
							border: "none",
							backgroundColor: viewportState.activeTool === "ruler" ? "#0d9488" : "#1e293b",
							color: "#ffffff",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							fontSize: "13px",
						}}
					>
						<Ruler size={16} /> Линейка (мм)
					</button>
				</div>

				{/* Filters & Tonal toggles */}
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<button
						type="button"
						onClick={() => handleViewportChange({ invert: !viewportState.invert })}
						style={{
							padding: "8px 12px",
							borderRadius: "6px",
							border: "none",
							backgroundColor: viewportState.invert ? "#3b82f6" : "#1e293b",
							color: "#ffffff",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							fontSize: "13px",
						}}
					>
						<Eye size={16} /> Негатив (Инверсия)
					</button>

					<button
						type="button"
						onClick={() => handleViewportChange({ sharpen: viewportState.sharpen > 0 ? 0 : 35 })}
						style={{
							padding: "8px 12px",
							borderRadius: "6px",
							border: "none",
							backgroundColor: viewportState.sharpen > 0 ? "#8b5cf6" : "#1e293b",
							color: "#ffffff",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							fontSize: "13px",
						}}
					>
						<Sparkles size={16} /> Резкость
					</button>

					<button
						type="button"
						onClick={() => handleViewportChange({ emboss: !viewportState.emboss })}
						style={{
							padding: "8px 12px",
							borderRadius: "6px",
							border: "none",
							backgroundColor: viewportState.emboss ? "#ec4899" : "#1e293b",
							color: "#ffffff",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							fontSize: "13px",
						}}
					>
						<Layers size={16} /> 3D Рельеф (Emboss)
					</button>

					<button
						type="button"
						onClick={handleReset}
						style={{
							padding: "8px 12px",
							borderRadius: "6px",
							border: "1px solid #475569",
							backgroundColor: "transparent",
							color: "#94a3b8",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							fontSize: "13px",
						}}
					>
						<RotateCcw size={16} /> Сброс
					</button>
				</div>
			</div>
		</div>
	);
};

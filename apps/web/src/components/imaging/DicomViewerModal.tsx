/**
 * DENTE CRM — Clinical DICOM / RVG Radiography Viewer Modal
 * Complete multi-touch medical viewer for periapical RVG, OPTG, and CBCT slices.
 */

import {
	Activity,
	CheckCircle2,
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
import { useVisitStore } from "../../store/visitStore.js";
import { showToast } from "../GlobalToast.js";
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
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const DicomViewerModal: React.FC<DicomViewerModalProps> = ({
	isOpen,
	onClose,
	imageSrc,
	title = "Дентальный снимок (RVG / DICOM)",
	toothFdiCode,
	patientName,
	studyDate,
	onInsertToProtocol,
}) => {
	const [viewportState, setViewportState] = useState<DicomViewportState>(
		DEFAULT_DICOM_VIEWPORT_STATE,
	);
	const [measurements, setMeasurements] = useState<CalibratedRulerMeasurement[]>([]);
	const [isNormaApplied, setIsNormaApplied] = useState(false);

	if (!isOpen) return null;

	const handleInsertNormaTo043 = () => {
		const targetTooth = toothFdiCode ? ` зуба ${toothFdiCode}` : "";
		const normaStatement = `Рентгенологическое исследование (RVG/DICOM)${targetTooth}: норма. Патологических изменений костной ткани и периапикальных очагов деструкции на снимке не выявлено. Кортикальная пластинка альвеолы и периодонтальная щель прослеживаются на всем протяжении.`;

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const current = prev.objectiveStatus || "";
				const updated = current.trim()
					? `${current.trim()}\n${normaStatement}`
					: normaStatement;
				return { ...prev, objectiveStatus: updated };
			});
		} catch {
			// Outside visit context
		}

		if (onInsertToProtocol) {
			onInsertToProtocol(normaStatement);
		}

		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(normaStatement).catch(() => {});
		}

		setIsNormaApplied(true);
		showToast(
			`Заключение «Норма: патологии на снимке не выявлено» внесено в карту 043/у${targetTooth ? ` (${targetTooth.trim()})` : ""}`,
			"success",
		);
	};

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
					<span
						style={{
							fontSize: "11px",
							padding: "4px 8px",
							borderRadius: "6px",
							background: "rgba(16, 185, 129, 0.15)",
							color: "#34d399",
							border: "1px solid rgba(16, 185, 129, 0.3)",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							fontWeight: 600,
						}}
						title="СанПиН 2.6.1.1192-03: При острой боли и неотложном приёме снимок доступен мгновенно, дозиметрия и ИДС вносятся без блокировки работы"
					>
						✓ Неотложный доступ (без блокировки ИДС)
					</span>
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
					<button
						type="button"
						data-testid="btn-dicom-norma-043"
						onClick={handleInsertNormaTo043}
						style={{
							padding: "6px 12px",
							fontSize: "12px",
							borderRadius: "6px",
							border: "1px solid #10b981",
							backgroundColor: isNormaApplied ? "rgba(16, 185, 129, 0.25)" : "#064e3b",
							color: "#a7f3d0",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "5px",
							fontWeight: 600,
							transition: "all 0.2s ease",
						}}
						title="1-клик действие: внести запись «Норма: патологии на снимке не выявлено» в карту 043/у"
					>
						<CheckCircle2 size={14} />
						<span>{isNormaApplied ? "✓ Норма в 043/у" : "⚡ Норма (043/у)"}</span>
					</button>
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
							whiteSpace: "nowrap",
						}}
					>
						<Ruler size={16} /> Линейка (мм)
					</button>
					<button
						type="button"
						onClick={() => handleViewportChange({ activeTool: "root_canal_tracer" })}
						style={{
							padding: "8px 12px",
							borderRadius: "6px",
							border: "none",
							backgroundColor: viewportState.activeTool === "root_canal_tracer" ? "#047857" : "#1e293b",
							color: viewportState.activeTool === "root_canal_tracer" ? "#a7f3d0" : "#ffffff",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							fontSize: "13px",
							fontWeight: 600,
							whiteSpace: "nowrap",
						}}
						title="Эндо-линейка (Apex Locator): измерение рабочей длины канала в мм (клик по точкам вдоль кривой корня, двойной клик для фиксации)"
					>
						<Activity size={16} /> Эндо-линейка (Апекс, мм)
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

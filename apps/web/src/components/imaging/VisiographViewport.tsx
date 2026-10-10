import React from "react";
import { VisiographStudioCanvas } from "../visiograph/VisiographStudioCanvas";
import { ShadowAnalystImageSlider } from "./ShadowAnalystImageSlider";
import { RadiologyCalibratedScaleRuler } from "../radiology/RadiologyCalibratedScaleRuler";
import type { XrayScan } from "./VisiographScanHelpers";
import type { VisiographPresetType } from "./VisiographCockpitPresets";

export interface VisiographViewportProps {
	readonly isStudioMode: boolean;
	readonly currentImageUrl: string;
	readonly effectivePatientId?: string | null | undefined;
	readonly currentScan?: XrayScan | null | undefined;
	readonly initialStudioTool: "pointer" | "root_canal";
	readonly quickPreset: VisiographPresetType;
	readonly onCloseStudio: () => void;
}

export function VisiographViewport({
	isStudioMode,
	currentImageUrl,
	effectivePatientId,
	currentScan,
	initialStudioTool,
	quickPreset,
	onCloseStudio,
}: VisiographViewportProps) {
	if (isStudioMode) {
		return (
			<VisiographStudioCanvas
				imageUrl={currentImageUrl}
				patientId={effectivePatientId}
				patientFullName={effectivePatientId ? `Пациент #${effectivePatientId}` : undefined}
				toothCode={currentScan?.toothCode}
				studyId={currentScan?.id}
				initialTool={initialStudioTool}
				onClose={onCloseStudio}
			/>
		);
	}

	const filterStyle =
		quickPreset === "invert"
			? "invert(1) contrast(1.3)"
			: quickPreset === "endo"
				? "contrast(1.6) brightness(1.15)"
				: quickPreset === "bone"
					? "contrast(1.4) brightness(0.95)"
					: quickPreset === "enamel"
						? "contrast(1.8) brightness(1.05)"
						: undefined;

	return (
		<div
			className="visiograph-dominant-canvas"
			data-testid="visiograph-dominant-canvas"
			style={{
				width: "100%",
				minHeight: "540px",
				height: "calc(100vh - 210px)",
				maxHeight: "calc(100vh - 200px)",
				borderRadius: "12px",
				overflow: "hidden",
				border: "1px solid var(--line)",
				background: "var(--dark-bg, #0a0e17)",
				position: "relative",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{/* Чистый русский паспорт снимка поверх запечённого текста датчика */}
			<div
				data-testid="visiograph-patient-passport-badge"
				style={{
					position: "absolute",
					top: "6px",
					left: "6px",
					zIndex: 20,
					display: "inline-flex",
					alignItems: "center",
					gap: "8px",
					padding: "4px 10px",
					borderRadius: "6px",
					background: "rgba(10, 14, 23, 0.92)",
					border: "1px solid rgba(45, 212, 191, 0.35)",
					color: "#f8fafc",
					fontSize: "11.5px",
					fontWeight: 600,
					pointerEvents: "none",
				}}
			>
				<span style={{ color: "#2dd4bf", fontWeight: 700 }}>
					{currentScan?.toothCode ? `RVG · Зуб #${currentScan.toothCode}` : "Прицельный снимок RVG"}
				</span>
				<span style={{ opacity: 0.85 }}>
					{currentScan?.originalFilename || "Цифровой радиовизиограф"}
				</span>
			</div>

			<ShadowAnalystImageSlider
				imageUrl={currentImageUrl}
				enhanced={true}
				viewerStyle={{
					filter: filterStyle,
					transition: "filter 0.15s ease",
				}}
			/>

			{/* EzDent-i Calibrated Vertical 5 mm Scale Ruler (Screenshots 22, 24) */}
			<RadiologyCalibratedScaleRuler
				zoom={1.0}
				sensorModelOrDevice="vatech_ezsensor"
				targetLengthMm={5.0}
				position="left"
			/>
		</div>
	);
}

import React from "react";
import { VisiographStudioCanvas } from "../visiograph/VisiographStudioCanvas";
import { ShadowAnalystImageSlider } from "./ShadowAnalystImageSlider";
import type { XrayScan } from "./VisiographScanHelpers";
import type { VisiographPresetType } from "./VisiographCockpitPresets";

export interface VisiographViewportProps {
	readonly isStudioMode: boolean;
	readonly currentImageUrl: string;
	readonly effectivePatientId?: string | null | undefined;
	readonly currentScan: XrayScan;
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
				toothCode={currentScan.toothCode}
				studyId={currentScan.id}
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
			style={{
				width: "100%",
				minHeight: "480px",
				height: "560px",
				maxHeight: "72vh",
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
			<ShadowAnalystImageSlider
				imageUrl={currentImageUrl}
				enhanced={true}
				viewerStyle={{
					filter: filterStyle,
					transition: "filter 0.15s ease",
				}}
			/>
		</div>
	);
}

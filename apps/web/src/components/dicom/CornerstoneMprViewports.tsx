import React, { type RefObject } from "react";
import { VIEWPORT_IDS } from "./cornerstoneTypes";

export interface CornerstoneMprViewportsProps {
	axialRef: RefObject<HTMLDivElement | null>;
	sagittalRef: RefObject<HTMLDivElement | null>;
	coronalRef: RefObject<HTMLDivElement | null>;
	activeTool: string;
	onViewportClickForNerve: (
		viewportId: string,
		container: HTMLElement | null,
		e: React.MouseEvent<any>,
	) => void;
}

export const CornerstoneMprViewports: React.FC<CornerstoneMprViewportsProps> = ({
	axialRef,
	sagittalRef,
	coronalRef,
	activeTool,
	onViewportClickForNerve,
}) => {
	return (
		<>
			{/* AXIAL */}
			<div style={{ position: "relative", backgroundColor: "var(--paper-contrast, #000)" }}>
				<div
					style={{
						position: "absolute",
						top: "8px",
						left: "8px",
						padding: "4px 8px",
						borderRadius: "4px",
						backgroundColor: "rgba(0,0,0,0.6)",
						backdropFilter: "blur(4px)",
						color: "var(--rose-400, #f87171)",
						fontSize: "11px",
						fontWeight: "bold",
						letterSpacing: "0.05em",
						zIndex: 10,
					}}
				>
					АКСИАЛЬНЫЙ (AXIAL)
				</div>
				<section
					ref={axialRef}
					aria-label="Просмотр Аксиальный"
					style={{
						width: "100%",
						height: "100%",
						touchAction: "none",
						cursor: activeTool === "NerveTracer" ? "crosshair" : "default",
					}}
					onContextMenu={(e) => e.preventDefault()}
					onClick={(e) => onViewportClickForNerve(VIEWPORT_IDS.axial, axialRef.current, e)}
				/>
			</div>

			{/* SAGITTAL */}
			<div style={{ position: "relative", backgroundColor: "var(--paper-contrast, #000)" }}>
				<div
					style={{
						position: "absolute",
						top: "8px",
						left: "8px",
						padding: "4px 8px",
						borderRadius: "4px",
						backgroundColor: "rgba(0,0,0,0.6)",
						backdropFilter: "blur(4px)",
						color: "var(--emerald-400, #4ade80)",
						fontSize: "11px",
						fontWeight: "bold",
						letterSpacing: "0.05em",
						zIndex: 10,
					}}
				>
					САГИТТАЛЬНЫЙ (SAGITTAL)
				</div>
				<section
					ref={sagittalRef}
					aria-label="Просмотр Сагиттальный"
					style={{
						width: "100%",
						height: "100%",
						touchAction: "none",
						cursor: activeTool === "NerveTracer" ? "crosshair" : "default",
					}}
					onContextMenu={(e) => e.preventDefault()}
					onClick={(e) => onViewportClickForNerve(VIEWPORT_IDS.sagittal, sagittalRef.current, e)}
				/>
			</div>

			{/* CORONAL */}
			<div style={{ position: "relative", backgroundColor: "var(--paper-contrast, #000)" }}>
				<div
					style={{
						position: "absolute",
						top: "8px",
						left: "8px",
						padding: "4px 8px",
						borderRadius: "4px",
						backgroundColor: "rgba(0,0,0,0.6)",
						backdropFilter: "blur(4px)",
						color: "var(--brand-primary, #60a5fa)",
						fontSize: "11px",
						fontWeight: "bold",
						letterSpacing: "0.05em",
						zIndex: 10,
					}}
				>
					КОРОНАЛЬНЫЙ (CORONAL)
				</div>
				<section
					ref={coronalRef}
					aria-label="Просмотр Корональный"
					style={{
						width: "100%",
						height: "100%",
						touchAction: "none",
						cursor: activeTool === "NerveTracer" ? "crosshair" : "default",
					}}
					onContextMenu={(e) => e.preventDefault()}
					onClick={(e) => onViewportClickForNerve(VIEWPORT_IDS.coronal, coronalRef.current, e)}
				/>
			</div>
		</>
	);
};

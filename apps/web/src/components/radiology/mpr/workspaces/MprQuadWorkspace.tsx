import React, { useEffect, useRef, useState } from "react";
import type { ViewLayoutMode } from "../cbctStudioTypes";
import type { WorkspaceCommonProps } from "./workspaceTypes";

export interface MprQuadWorkspaceProps extends WorkspaceCommonProps {
	readonly viewLayout: ViewLayoutMode;
}

export const MprQuadWorkspace: React.FC<MprQuadWorkspaceProps> = ({
	renderers,
	maximizedViewport,
	mobileActiveTab,
	viewLayout,
}) => {
	// 4-Way Interactive 2x2 Grid Resizer State
	const [splitX, setSplitX] = useState<number>(0.5);
	const [splitY, setSplitY] = useState<number>(0.5);
	const [isDraggingSplitter, setIsDraggingSplitter] = useState<"x" | "y" | "center" | null>(null);
	const quadGridRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isDraggingSplitter) return;

		const handlePointerMove = (e: PointerEvent) => {
			if (!quadGridRef.current) return;
			const rect = quadGridRef.current.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return;

			if (isDraggingSplitter === "x" || isDraggingSplitter === "center") {
				const relX = (e.clientX - rect.left) / rect.width;
				setSplitX(Math.max(0.2, Math.min(0.8, relX)));
			}
			if (isDraggingSplitter === "y" || isDraggingSplitter === "center") {
				const relY = (e.clientY - rect.top) / rect.height;
				setSplitY(Math.max(0.2, Math.min(0.8, relY)));
			}
		};

		const handlePointerUp = () => {
			setIsDraggingSplitter(null);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [isDraggingSplitter]);

	if (maximizedViewport) {
		return (
			<div className="flex-1 flex min-h-0 min-w-0 w-full h-full" data-testid="cbct-mpr-maximized-grid">
				{maximizedViewport === "axial" && renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "coronal" && renderers.renderCoronal("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "sagittal" && renderers.renderSagittal("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "panoramic" && renderers.renderPanoramic("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "cross_section" && renderers.renderCrossSection("flex-1 flex flex-col w-full h-full", true)}
			</div>
		);
	}

	if (viewLayout === "mpr_3_view") {
		return (
			<div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-1 min-h-0 min-w-0 w-full h-full" data-testid="cbct-mpr-3-view-grid">
				{renderers.renderAxial(mobileActiveTab === "axial" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
				{renderers.renderCoronal(mobileActiveTab === "coronal" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
				{renderers.renderSagittal(mobileActiveTab === "sagittal" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
			</div>
		);
	}

	if (viewLayout === "layout_1_plus_3") {
		return (
			<div className="flex-1 grid grid-cols-12 gap-1 min-h-0 min-w-0 w-full h-full" data-testid="cbct-mpr-axial-focus-grid">
				<div className="col-span-12 lg:col-span-8 min-h-0 min-w-0 w-full h-full">
					{renderers.renderAxial(mobileActiveTab === "axial" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
				</div>
				<div className="col-span-12 lg:col-span-4 min-h-0 min-w-0 w-full h-full flex flex-col lg:grid lg:grid-rows-3 gap-1">
					{renderers.renderCoronal(mobileActiveTab === "coronal" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
					{renderers.renderSagittal(mobileActiveTab === "sagittal" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
					{renderers.renderVolume3D(mobileActiveTab === "panoramic" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
				</div>
			</div>
		);
	}

	return (
		<div
			ref={quadGridRef}
			style={{
				display: "grid",
				gridTemplateColumns: `calc(${(splitX * 100).toFixed(2)}% - 2px) calc(${((1 - splitX) * 100).toFixed(2)}% - 2px)`,
				gridTemplateRows: `calc(${(splitY * 100).toFixed(2)}% - 2px) calc(${((1 - splitY) * 100).toFixed(2)}% - 2px)`,
				gap: "4px",
			}}
			className="flex-1 min-h-0 min-w-0 w-full h-full relative"
			data-testid="cbct-mpr-quad-grid"
		>
			<div className="contents">
				{renderers.renderAxial(mobileActiveTab === "axial" ? "flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col w-full h-full")}
				{renderers.renderCoronal(mobileActiveTab === "coronal" ? "flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col w-full h-full")}
				{renderers.renderSagittal(mobileActiveTab === "sagittal" ? "flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col w-full h-full")}
				{renderers.renderVolume3D(mobileActiveTab === "panoramic" ? "flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col w-full h-full")}
			</div>

			{/* Interactive Splitter Controls (Desktop only) */}
			{/* 1. Vertical Splitter Bar */}
			<div
				onPointerDown={(e) => {
					e.preventDefault();
					setIsDraggingSplitter("x");
				}}
				style={{ left: `calc(${(splitX * 100).toFixed(2)}% - 3px)` }}
				className="hidden lg:block absolute top-0 bottom-0 w-1.5 cursor-col-resize z-30 group"
				title="Перетащите для изменения ширины окон (двойной клик — сброс 50%)"
				onDoubleClick={() => setSplitX(0.5)}
				data-testid="cbct-mpr-vertical-splitter"
			>
				<div className="w-0.5 h-full mx-auto bg-zinc-800 group-hover:bg-cyan-500/80 transition-colors" />
			</div>

			{/* 2. Horizontal Splitter Bar */}
			<div
				onPointerDown={(e) => {
					e.preventDefault();
					setIsDraggingSplitter("y");
				}}
				style={{ top: `calc(${(splitY * 100).toFixed(2)}% - 3px)` }}
				className="hidden lg:block absolute left-0 right-0 h-1.5 cursor-row-resize z-30 group"
				title="Перетащите для изменения высоты окон (двойной клик — сброс 50%)"
				onDoubleClick={() => setSplitY(0.5)}
				data-testid="cbct-mpr-horizontal-splitter"
			>
				<div className="h-0.5 w-full my-auto bg-zinc-800 group-hover:bg-cyan-500/80 transition-colors" />
			</div>

			{/* 3. Central 4-Way Crosshair Splitter Knob */}
			<div
				onPointerDown={(e) => {
					e.preventDefault();
					setIsDraggingSplitter("center");
				}}
				onDoubleClick={() => {
					setSplitX(0.5);
					setSplitY(0.5);
				}}
				style={{
					left: `calc(${(splitX * 100).toFixed(2)}% - 7px)`,
					top: `calc(${(splitY * 100).toFixed(2)}% - 7px)`,
				}}
				className="hidden lg:flex absolute w-3.5 h-3.5 rounded-full bg-zinc-900 border border-zinc-700 hover:border-cyan-400 hover:bg-cyan-950 items-center justify-center cursor-move z-40 shadow-md group transition-transform hover:scale-125"
				title="4-сторонний сплиттер: перетащите для изменения размеров окон (двойной клик — сброс 50/50)"
				data-testid="cbct-mpr-grid-splitter-knob"
			>
				<div className="w-1 h-1 rounded-full bg-zinc-400 group-hover:bg-cyan-400" />
			</div>
		</div>
	);
};

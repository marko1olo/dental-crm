import React, { type RefObject } from "react";
import { Box, Compass, RotateCcw } from "lucide-react";
import { VIEWPORT_IDS, VOLUME_3D_PRESETS } from "./cornerstoneEngineHelper";

export interface CornerstoneVolume3DViewportProps {
	volume3dRef: RefObject<HTMLDivElement | null>;
	activePresetId?: string;
	onSelectPreset?: (presetId: string) => void;
	onResetCamera?: () => void;
	onRotateOrientation?: (axis: "coronal" | "sagittal" | "axial") => void;
	isLoading?: boolean;
}

/**
 * Dedicated 4th quadrant viewport for interactive WebGL 3D Volume Rendering:
 * - Real-time maxillofacial skull/jaw volume visualization
 * - Trackball camera rotation (LMB) and zoom (MMB)
 * - HU 150..2000 bone and soft-tissue transfer function presets
 * - 1-click clinical camera resets & orthogonal angles
 */
export const CornerstoneVolume3DViewport: React.FC<CornerstoneVolume3DViewportProps> = ({
	volume3dRef,
	activePresetId = "bone",
	onSelectPreset,
	onResetCamera,
	onRotateOrientation,
	isLoading = false,
}) => {
	return (
		<div
			data-testid="cornerstone-volume-3d-viewport"
			style={{
				position: "relative",
				width: "100%",
				height: "100%",
				minHeight: "280px",
				backgroundColor: "var(--paper-contrast, #000)",
				overflow: "hidden",
				display: "flex",
				flexDirection: "column",
			}}
		>
			{/* Top-left Badge: 3D VOLUME */}
			<div
				style={{
					position: "absolute",
					top: "8px",
					left: "8px",
					padding: "4px 8px",
					borderRadius: "4px",
					backgroundColor: "rgba(0,0,0,0.7)",
					backdropFilter: "blur(4px)",
					color: "var(--cyan-400, #22d3ee)",
					fontSize: "11px",
					fontWeight: "bold",
					letterSpacing: "0.05em",
					zIndex: 10,
					display: "inline-flex",
					alignItems: "center",
					gap: "5px",
					border: "1px solid rgba(34,211,238,0.3)",
					pointerEvents: "none",
				}}
			>
				<Box className="w-3.5 h-3.5 text-cyan-400" />
				<span>3D ОБЪЁМ (VOLUME 3D)</span>
			</div>

			{/* Top-right Quick Controls: Presets, Angles & Reset */}
			<div
				style={{
					position: "absolute",
					top: "8px",
					right: "8px",
					display: "flex",
					alignItems: "center",
					gap: "4px",
					zIndex: 10,
					backgroundColor: "rgba(0,0,0,0.65)",
					backdropFilter: "blur(6px)",
					padding: "3px 6px",
					borderRadius: "6px",
					border: "1px solid rgba(255,255,255,0.12)",
				}}
			>
				{/* Presets Chips */}
				{onSelectPreset && (
					<div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
						{VOLUME_3D_PRESETS.map((p) => {
							const isActive = activePresetId === p.id;
							return (
								<button
									key={p.id}
									type="button"
									onClick={() => onSelectPreset(p.id)}
									title={`${p.label}: ${p.description} (${p.huRange})`}
									style={{
										height: "22px",
										padding: "0 6px",
										borderRadius: "4px",
										fontSize: "10px",
										fontWeight: isActive ? 700 : 500,
										border: isActive
											? "1px solid var(--cyan-400, #22d3ee)"
											: "1px solid rgba(255,255,255,0.1)",
										backgroundColor: isActive
											? "rgba(34,211,238,0.25)"
											: "rgba(255,255,255,0.05)",
										color: isActive ? "#fff" : "var(--muted, #a1a1aa)",
										cursor: "pointer",
										transition: "all 0.15s ease",
										whiteSpace: "nowrap",
									}}
								>
									{p.label.split(" ")[0]}
								</button>
							);
						})}
					</div>
				)}

				{/* Orthogonal Orientation Angles */}
				{onRotateOrientation && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "2px",
							marginLeft: "4px",
							paddingLeft: "4px",
							borderLeft: "1px solid rgba(255,255,255,0.15)",
						}}
					>
						<button
							type="button"
							onClick={() => onRotateOrientation("coronal")}
							title="Фронтальная проекция (Фас / Coronal)"
							style={{
								height: "22px",
								padding: "0 5px",
								borderRadius: "3px",
								fontSize: "10px",
								fontWeight: 600,
								border: "1px solid rgba(255,255,255,0.1)",
								backgroundColor: "rgba(255,255,255,0.06)",
								color: "var(--ink-muted, #d4d4d8)",
								cursor: "pointer",
							}}
						>
							Фас
						</button>
						<button
							type="button"
							onClick={() => onRotateOrientation("sagittal")}
							title="Сагиттальная проекция (Профиль / Sagittal)"
							style={{
								height: "22px",
								padding: "0 5px",
								borderRadius: "3px",
								fontSize: "10px",
								fontWeight: 600,
								border: "1px solid rgba(255,255,255,0.1)",
								backgroundColor: "rgba(255,255,255,0.06)",
								color: "var(--ink-muted, #d4d4d8)",
								cursor: "pointer",
							}}
						>
							Профиль
						</button>
					</div>
				)}

				{/* Reset Camera Button */}
				{onResetCamera && (
					<button
						type="button"
						onClick={onResetCamera}
						title="Сбросить положение камеры 3D объема"
						aria-label="Сброс камеры 3D"
						style={{
							height: "22px",
							width: "24px",
							padding: 0,
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							borderRadius: "4px",
							border: "1px solid rgba(255,255,255,0.15)",
							backgroundColor: "rgba(255,255,255,0.08)",
							color: "var(--ink, #fff)",
							cursor: "pointer",
							marginLeft: "2px",
						}}
					>
						<RotateCcw className="w-3 h-3 text-cyan-300" />
					</button>
				)}
			</div>

			{/* Bottom Telemetry & Navigation Tip */}
			<div
				style={{
					position: "absolute",
					bottom: "6px",
					left: "8px",
					right: "8px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					fontSize: "10px",
					color: "var(--muted, #a1a1aa)",
					backgroundColor: "rgba(0,0,0,0.6)",
					backdropFilter: "blur(4px)",
					padding: "2px 8px",
					borderRadius: "4px",
					zIndex: 10,
					pointerEvents: "none",
				}}
			>
				<span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
					<Compass className="w-3 h-3 text-cyan-400" />
					<span>Вращение 3D: ЛКМ (Trackball) • Зум: СКМ / Колесико • Панорама: ПКМ</span>
				</span>
				<span style={{ color: "var(--cyan-300, #67e8f9)", fontWeight: 600 }}>
					HU 150..2000
				</span>
			</div>

			{/* 3D WebGL Canvas Section */}
			<section
				ref={volume3dRef}
				aria-label="Просмотр 3D Объем"
				style={{
					width: "100%",
					height: "100%",
					flex: 1,
					touchAction: "none",
					cursor: "grab",
				}}
				onContextMenu={(e) => e.preventDefault()}
			/>
		</div>
	);
};

export interface CornerstoneMprViewportsProps {
	axialRef: RefObject<HTMLDivElement | null>;
	sagittalRef: RefObject<HTMLDivElement | null>;
	coronalRef: RefObject<HTMLDivElement | null>;
	volume3dRef?: RefObject<HTMLDivElement | null>;
	activeTool: string;
	onViewportClickForNerve: (
		viewportId: string,
		container: HTMLElement | null,
		e: React.MouseEvent<any>,
	) => void;
	active3DPresetId?: string;
	onSelect3DPreset?: (presetId: string) => void;
	onReset3DCamera?: () => void;
	onRotate3DOrientation?: (axis: "coronal" | "sagittal" | "axial") => void;
}

export const CornerstoneMprViewports: React.FC<CornerstoneMprViewportsProps> = ({
	axialRef,
	sagittalRef,
	coronalRef,
	volume3dRef,
	activeTool,
	onViewportClickForNerve,
	active3DPresetId,
	onSelect3DPreset,
	onReset3DCamera,
	onRotate3DOrientation,
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

			{/* 4TH VIEWPORT: VOLUME 3D (IF PROVIDED) */}
			{volume3dRef && (
				<CornerstoneVolume3DViewport
					volume3dRef={volume3dRef}
					activePresetId={active3DPresetId}
					onSelectPreset={onSelect3DPreset}
					onResetCamera={onReset3DCamera}
					onRotateOrientation={onRotate3DOrientation}
				/>
			)}
		</>
	);
};

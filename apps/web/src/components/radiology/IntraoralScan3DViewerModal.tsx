import React, { useEffect } from "react";
import { X, Maximize2, Minimize2, Box } from "lucide-react";

export interface IntraoralScan3DViewerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly modelUrl?: string;
	readonly modelFormat?: "stl" | "obj" | "ply";
	readonly patientName?: string;
	readonly scanTitle?: string;
}

export function build3DViewerIframeSrc(
	modelUrl?: string,
	modelFormat: "stl" | "obj" | "ply" = "stl",
): string {
	return modelUrl
		? `/viewer3d.html?model=${encodeURIComponent(modelUrl)}&ext=${modelFormat}`
		: "/viewer3d.html";
}

export const IntraoralScan3DViewerModal: React.FC<IntraoralScan3DViewerModalProps> = ({
	isOpen,
	onClose,
	modelUrl,
	modelFormat = "stl",
	patientName,
	scanTitle = "Интраоральный 3D-скан (STL / OBJ / PLY)",
}) => {
	const [isFullscreen, setIsFullscreen] = React.useState(false);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const iframeSrc = build3DViewerIframeSrc(modelUrl, modelFormat);

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 9999,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(3, 7, 18, 0.85)",
				backdropFilter: "blur(6px)",
			}}
			role="dialog"
			aria-modal="true"
			aria-label="3D Просмотрщик интраоральных сканов"
		>
			<div
				style={{
					position: "relative",
					width: isFullscreen ? "100vw" : "92vw",
					height: isFullscreen ? "100vh" : "90vh",
					maxWidth: isFullscreen ? "100vw" : "1400px",
					maxHeight: isFullscreen ? "100vh" : "900px",
					background: "var(--paper-strong, #090d16)",
					border: isFullscreen ? "none" : "1px solid var(--line, #334155)",
					borderRadius: isFullscreen ? "0" : "10px",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
				}}
			>
				{/* Header */}
				<div
					style={{
						height: "44px",
						padding: "0 16px",
						background: "var(--paper, #0f172a)",
						borderBottom: "1px solid var(--line, #1e293b)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						userSelect: "none",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<Box size={18} color="#6366f1" />
						<span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink, #f8fafc)" }}>
							{scanTitle}
						</span>
						{patientName && (
							<span
								style={{
									fontSize: "11px",
									padding: "2px 8px",
									background: "rgba(99, 102, 241, 0.15)",
									color: "#818cf8",
									borderRadius: "4px",
									border: "1px solid rgba(99, 102, 241, 0.3)",
								}}
							>
								Пациент: {patientName}
							</span>
						)}
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<button
							type="button"
							onClick={() => setIsFullscreen(!isFullscreen)}
							title={isFullscreen ? "Свернуть" : "На весь экран"}
							style={{
								background: "transparent",
								border: "none",
								color: "var(--ink-muted, #94a3b8)",
								cursor: "pointer",
								padding: "6px",
								borderRadius: "4px",
								display: "flex",
								alignItems: "center",
							}}
						>
							{isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
						</button>
						<button
							type="button"
							onClick={onClose}
							title="Закрыть (Esc)"
							style={{
								background: "transparent",
								border: "none",
								color: "var(--ink-muted, #94a3b8)",
								cursor: "pointer",
								padding: "6px",
								borderRadius: "4px",
								display: "flex",
								alignItems: "center",
							}}
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* 3D WebGL Canvas iframe */}
				<div style={{ flex: 1, position: "relative", width: "100%", height: "100%" }}>
					<iframe
						src={iframeSrc}
						title="3D Scan View"
						style={{
							width: "100%",
							height: "100%",
							border: "none",
							display: "block",
						}}
					/>
				</div>
			</div>
		</div>
	);
};

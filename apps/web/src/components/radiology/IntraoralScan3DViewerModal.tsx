import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Maximize2, Minimize2, Box, ExternalLink } from "lucide-react";

export interface Scan3dPopoutParams {
	readonly modelUrl?: string | undefined;
	readonly modelFormat?: ("stl" | "obj" | "ply") | undefined;
	readonly patientName?: string | undefined;
	readonly scanTitle?: string | undefined;
	readonly toothCode?: (string | number) | undefined;
	readonly orderId?: string | undefined;
}

export function buildScan3dPopoutUrl(params: Scan3dPopoutParams): string {
	const q = new URLSearchParams();
	if (params.modelUrl) q.set("model", params.modelUrl);
	if (params.modelFormat) q.set("ext", params.modelFormat);
	if (params.scanTitle) q.set("title", params.scanTitle);
	if (params.patientName) q.set("patient", params.patientName);
	if (params.toothCode) q.set("tooth", String(params.toothCode));
	if (params.orderId) q.set("orderId", params.orderId);
	q.set("popout", "1");
	return `/viewer3d.html?${q.toString()}`;
}

export function openScan3dPopoutWindow(params: Scan3dPopoutParams): Window | null {
	if (typeof window === "undefined") return null;
	const url = buildScan3dPopoutUrl(params);
	const width = 1280;
	const height = 800;
	const left = Math.max(0, Math.round((window.screen.width - width) / 2));
	const top = Math.max(0, Math.round((window.screen.height - height) / 2));
	const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no`;
	const win = window.open(url, "dente_3d_scan_popout", features);
	if (win) {
		win.focus();
	}
	return win;
}

export interface IntraoralScan3DViewerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly modelUrl?: string | undefined;
	readonly modelFormat?: ("stl" | "obj" | "ply") | undefined;
	readonly patientName?: string | undefined;
	readonly scanTitle?: string | undefined;
	readonly title?: string | undefined;
	readonly toothCode?: (string | number) | undefined;
	readonly orderId?: string | undefined;
	readonly onPopout?: (() => void) | undefined;
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
	title,
	toothCode,
	orderId,
	onPopout,
}) => {
	const effectiveTitle = title || scanTitle;
	const [isFullscreen, setIsFullscreen] = React.useState(false);

	const handlePopout = () => {
		openScan3dPopoutWindow({
			modelFormat,
			scanTitle,
			...(modelUrl ? { modelUrl } : {}),
			...(patientName ? { patientName } : {}),
			...(toothCode !== undefined && toothCode !== null ? { toothCode } : {}),
			...(orderId ? { orderId } : {}),
		});
		if (onPopout) {
			onPopout();
		} else {
			onClose();
		}
	};

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

	const modalContent = (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 999999,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(3, 7, 18, 0.85)",
				backdropFilter: "blur(6px)",
			}}
			role="dialog"
			aria-modal="true"
			aria-label="3D Просмотрщик интраоральных сканов"
			data-testid="intraoral-scan-3d-viewer-modal"
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
						{toothCode && (
							<span
								style={{
									fontSize: "11px",
									padding: "2px 8px",
									background: "rgba(13, 148, 136, 0.15)",
									color: "#2dd4bf",
									borderRadius: "4px",
									border: "1px solid rgba(13, 148, 136, 0.3)",
									fontWeight: 600,
								}}
							>
								{`Зуб № ${toothCode}`}
							</span>
						)}
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<button
							type="button"
							data-testid="btn-scan3d-popout"
							onClick={handlePopout}
							title="Открыть 3D-скан в отдельном окне / на 2-м мониторе (освобождает экран приема)"
							style={{
								background: "rgba(99, 102, 241, 0.15)",
								border: "1px solid rgba(99, 102, 241, 0.4)",
								color: "#818cf8",
								cursor: "pointer",
								padding: "4px 10px",
								borderRadius: "6px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								fontSize: "12px",
								fontWeight: 600,
							}}
						>
							<ExternalLink size={13} />
							<span>На 2-й монитор</span>
						</button>
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
							data-testid="btn-close-3d-scan-modal"
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

	if (typeof document !== "undefined" && document.body) {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};

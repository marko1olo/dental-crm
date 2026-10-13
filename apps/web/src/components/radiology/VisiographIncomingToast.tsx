/**
 * VisiographIncomingToast.tsx — Ergonomic Floating HUD for Incoming Visiograph Scans.
 *
 * Implements Mandates 8e (Doctor Autonomy, zero sensor lock-in), 8s (Canonical Authority).
 * Adheres strictly to:
 * - DESIGNER_VISUAL_INQUISITION_BIBLE.md (Single-height 32px buttons, quiet telemetry, zero color confetti)
 * - Anti-monolith file limit (<500 lines)
 * - 12 questions of ruthless design audit
 */

import React from "react";
import { Check, Eye, HardDrive, Sparkles, X, Zap } from "lucide-react";
import { useVisiographHotFolder } from "../../hooks/useVisiographHotFolder";

export interface VisiographIncomingToastProps {
	readonly className?: string;
	readonly onLinked?: (tooth: string) => void;
	readonly onOpenedViewer?: () => void;
}

export const VisiographIncomingToast: React.FC<VisiographIncomingToastProps> = ({
	className = "",
	onLinked,
	onOpenedViewer,
}) => {
	const {
		currentScan,
		queuedCount,
		activeTooth,
		linkToTooth,
		openInViewer,
		dismissToast,
	} = useVisiographHotFolder();

	if (!currentScan) {
		return null;
	}

	const targetTooth = currentScan.detectedTooth || activeTooth;

	const handleConfirmLink = () => {
		linkToTooth(targetTooth);
		if (onLinked) onLinked(targetTooth);
	};

	const handleOpenViewer = () => {
		openInViewer();
		if (onOpenedViewer) onOpenedViewer();
	};

	return (
		<div
			role="alert"
			aria-live="polite"
			data-testid="visiograph-incoming-toast"
			className={`fixed bottom-20 right-6 z-[9999] flex flex-col gap-3 rounded-[12px] p-3.5 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${className}`}
			style={{
				background: "var(--paper-strong)",
				border: "1px solid var(--line)",
				color: "var(--ink)",
				width: "420px",
				maxWidth: "calc(100vw - 32px)",
				boxShadow: "0 16px 36px rgba(0, 0, 0, 0.24), 0 2px 8px rgba(0, 0, 0, 0.08)",
			}}
		>
			{/* Top Bar: Sensor / Hardware telemetry & close */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<div
						className="flex h-5 w-5 items-center justify-center rounded-[6px]"
						style={{
							background: "rgba(13, 148, 136, 0.12)",
							color: "var(--teal)",
						}}
					>
						<Zap className="h-3.5 w-3.5" />
					</div>
					<span className="text-[12px] font-semibold tracking-tight truncate" style={{ color: "var(--ink)" }}>
						{currentScan.brandName}
					</span>
					{queuedCount > 0 && (
						<span
							className="rounded-full px-1.5 py-0.2 text-[10px] font-semibold tracking-wide whitespace-nowrap"
							style={{
								background: "rgba(13, 148, 136, 0.15)",
								color: "var(--teal)",
								border: "1px solid rgba(13, 148, 136, 0.3)",
							}}
						>
							+{queuedCount} новых
						</span>
					)}
				</div>

				<button
					type="button"
					onClick={dismissToast}
					title="Отклонить снимок (Esc)"
					aria-label="Закрыть уведомление"
					className="flex h-7 w-7 items-center justify-center rounded-[8px] transition-colors"
					style={{
						color: "var(--muted)",
						background: "transparent",
						border: "1px solid transparent",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = "var(--paper-soft)";
						e.currentTarget.style.borderColor = "var(--line)";
						e.currentTarget.style.color = "var(--ink)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = "transparent";
						e.currentTarget.style.borderColor = "transparent";
						e.currentTarget.style.color = "var(--muted)";
					}}
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			{/* Main Content: Thumbnail + File Details */}
			<div className="flex items-center gap-3">
				{/* Thumbnail */}
				<div
					className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[8px]"
					style={{
						background: "#0f172a",
						border: "1px solid var(--line)",
					}}
				>
					{currentScan.thumbnailUrl ? (
						<img
							src={currentScan.thumbnailUrl}
							alt={currentScan.fileName}
							className="h-full w-full object-cover"
							onError={(e) => {
								// Fallback to placeholder icon on broken image
								e.currentTarget.style.display = "none";
							}}
						/>
					) : (
						<HardDrive className="h-6 w-6 text-slate-400" />
					)}
					<span
						className="absolute bottom-0.5 right-0.5 rounded-[4px] px-1 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider text-white"
						style={{ background: "rgba(0, 0, 0, 0.65)" }}
					>
						{currentScan.fileType.replace(".", "") || "RVG"}
					</span>
				</div>

				{/* File Metadata */}
				<div className="flex flex-col min-w-0 flex-1">
					<div
						className="truncate text-[13px] font-medium leading-snug"
						style={{ color: "var(--ink)" }}
						title={currentScan.fileName}
					>
						{currentScan.fileName}
					</div>
					<div
						className="flex items-center gap-1.5 text-[11px] leading-relaxed"
						style={{ color: "var(--muted)" }}
					>
						<span>{currentScan.formattedSize}</span>
						<span>•</span>
						<span className="truncate">{currentScan.folderPath}</span>
					</div>
				</div>
			</div>

			{/* Actions Row: Strict Single-Height 32px Controls */}
			<div className="flex items-center gap-2 pt-1">
				{/* Primary CTA: 1-Click Link to Active Tooth */}
				<button
					type="button"
					onClick={handleConfirmLink}
					data-testid="btn-link-to-tooth"
					className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] font-semibold text-[12px] px-3 whitespace-nowrap transition-all"
					style={{
						height: "32px",
						background: "var(--teal)",
						color: "#ffffff",
						border: "none",
						boxShadow: "0 1px 3px rgba(13, 148, 136, 0.3)",
					}}
				>
					<Check className="h-3.5 w-3.5 stroke-[2.5]" />
					<span>Привязать к зубу {targetTooth}</span>
					<kbd
						className="ml-1 rounded px-1 py-0.5 text-[10px] font-mono opacity-80"
						style={{ background: "rgba(0, 0, 0, 0.22)" }}
					>
						↵
					</kbd>
				</button>

				{/* Secondary Action: Open in Direct Viewer */}
				<button
					type="button"
					onClick={handleOpenViewer}
					data-testid="btn-open-in-viewer"
					className="flex shrink-0 items-center justify-center gap-1.5 rounded-[8px] font-medium text-[12px] px-3 whitespace-nowrap transition-colors"
					style={{
						height: "32px",
						background: "var(--paper-soft)",
						color: "var(--ink)",
						border: "1px solid var(--line)",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = "var(--paper)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = "var(--paper-soft)";
					}}
				>
					<Eye className="h-3.5 w-3.5" style={{ color: "var(--muted)" }} />
					<span>Во вьюере</span>
				</button>
			</div>
		</div>
	);
};

export default VisiographIncomingToast;

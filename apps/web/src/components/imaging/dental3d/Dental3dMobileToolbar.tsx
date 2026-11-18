/**
 * apps/web/src/components/imaging/dental3d/Dental3dMobileToolbar.tsx
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * APPLE HIG MOBILE CONTROLS FOR DENTAL 3D VIEWER (SMARTPHONE VIEWPORTS)
 * ═══════════════════════════════════════════════════════════════════════════
 * Compact Top Bar (1 row <= 44px) + Natural Thumb Zone Floating Bottom Bar
 * with Segmented Layer Toggles, Material Switchers, Kinematic Bite & Caliper.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import {
	RotateCcw,
	Send,
	Ruler,
	Eye,
	EyeOff,
	X,
	FolderOpen,
	Box,
} from "lucide-react";
import type {
	DentalArchLayer,
	DentalMaterialMode,
	LayerVisibilityState,
} from "./dental3dTypes.js";

export interface Dental3dMobileToolbarProps {
	readonly patientName?: string | undefined;
	readonly displayTooth?: string | undefined;
	readonly layerVisibility: LayerVisibilityState;
	readonly onToggleLayer: (layer: DentalArchLayer) => void;
	readonly materialMode: DentalMaterialMode;
	readonly onChangeMaterialMode: (mode: DentalMaterialMode) => void;
	readonly isBiteClosed: boolean;
	readonly onToggleBite: () => void;
	readonly isCaliperActive: boolean;
	readonly onToggleCaliper: () => void;
	readonly onResetCamera: () => void;
	readonly onOpenFilePicker: () => void;
	readonly onOpenLabOrder?: (() => void) | undefined;
	readonly onClose?: (() => void) | undefined;
}

export const Dental3dMobileToolbar: React.FC<Dental3dMobileToolbarProps> = ({
	patientName,
	displayTooth,
	layerVisibility,
	onToggleLayer,
	materialMode,
	onChangeMaterialMode,
	isBiteClosed,
	onToggleBite,
	isCaliperActive,
	onToggleCaliper,
	onResetCamera,
	onOpenFilePicker,
	onOpenLabOrder,
	onClose,
}) => {
	const layerItems: ReadonlyArray<{ readonly id: DentalArchLayer; readonly label: string; readonly shortLabel: string }> = [
		{ id: "upper", label: "Верхняя", shortLabel: "ВЧ" },
		{ id: "lower", label: "Нижняя", shortLabel: "НЧ" },
		{ id: "bite", label: "Прикус", shortLabel: "Прикус" },
		{ id: "prep", label: "Преп", shortLabel: "Преп" },
		{ id: "scanbody", label: "Скан-боди", shortLabel: "Боди" },
	];

	const modeItems: ReadonlyArray<{ readonly id: DentalMaterialMode; readonly label: string; readonly shortLabel: string }> = [
		{ id: "truecolor", label: "24-bit Цвет", shortLabel: "Цвет" },
		{ id: "occlusion", label: "Окклюзия", shortLabel: "Окклюзия" },
		{ id: "undercut", label: "Поднутрения", shortLabel: "Поднутр." },
		{ id: "wireframe", label: "Сетка STL", shortLabel: "Сетка" },
	];

	return (
		<>
			{/* Compact Mobile Top Bar (Strictly 1 Row <= 44px) */}
			<div className="flex md:hidden absolute top-0 left-0 right-0 z-30 pointer-events-none p-2 flex-col gap-1.5">
				<div
					className="pointer-events-auto h-11 px-3 rounded-xl backdrop-blur-md border shadow-md flex items-center justify-between gap-2"
					style={{
						backgroundColor: "var(--paper-strong, #090d16)",
						borderColor: "var(--line, #334155)",
						color: "var(--ink, #f8fafc)",
					}}
				>
					{/* Left: Box Icon, Short Title & Tooth Badge */}
					<div className="flex items-center gap-2 min-w-0">
						<Box className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span className="text-xs font-bold tracking-tight whitespace-nowrap" style={{ color: "var(--ink)" }}>
							3D-скан
						</span>
						{displayTooth && (
							<span
								className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
								style={{
									backgroundColor: "rgba(13, 148, 136, 0.15)",
									color: "var(--teal, #0d9488)",
									border: "1px solid rgba(13, 148, 136, 0.3)",
								}}
								data-testid="viewer3d-tooth-badge-mobile"
							>
								{displayTooth}
							</span>
						)}
						{patientName && (
							<span className="text-[11px] font-semibold truncate max-w-[100px]" style={{ color: "var(--muted)" }}>
								{patientName}
							</span>
						)}
					</div>

					{/* Right: Compact Icon Actions */}
					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={onOpenFilePicker}
							className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border"
							style={{
								backgroundColor: "var(--paper, #0f172a)",
								borderColor: "var(--line, #334155)",
								color: "var(--ink, #f8fafc)",
							}}
							title="Файл"
							data-testid="btn-open-3d-file-mobile"
						>
							<FolderOpen className="w-3.5 h-3.5 text-[var(--muted)]" />
						</button>

						<button
							type="button"
							onClick={onResetCamera}
							className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border"
							style={{
								backgroundColor: "var(--paper, #0f172a)",
								borderColor: "var(--line, #334155)",
								color: "var(--ink, #f8fafc)",
							}}
							title="Сброс камеры"
							data-testid="btn-reset-camera-mobile"
						>
							<RotateCcw className="w-3.5 h-3.5 text-[var(--muted)]" />
						</button>

						{onClose && (
							<button
								type="button"
								onClick={onClose}
								className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border-0"
								style={{ color: "var(--muted)", backgroundColor: "transparent" }}
								title="Закрыть"
								data-testid="btn-close-3d-viewer-mobile"
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Mobile Floating Bottom Bar (Natural Thumb Zone - Apple HIG) */}
			<div
				className="flex md:hidden fixed bottom-2 left-2 right-2 z-30 pointer-events-auto flex-col gap-1.5 p-2 rounded-2xl backdrop-blur-lg border shadow-xl"
				style={{
					backgroundColor: "var(--paper-strong, #090d16)",
					borderColor: "var(--line, #334155)",
					color: "var(--ink, #f8fafc)",
				}}
			>
				{/* Mobile Segmented Layer Toggles */}
				<div
					className="grid grid-cols-5 gap-1 p-0.5 rounded-lg border"
					style={{
						backgroundColor: "var(--paper-soft, #1e293b)",
						borderColor: "var(--line-subtle, #334155)",
					}}
				>
					{layerItems.map((layer) => {
						const isVisible = layerVisibility[layer.id];
						return (
							<button
								key={layer.id}
								type="button"
								onClick={() => onToggleLayer(layer.id)}
								className="min-h-[44px] h-11 rounded-md text-[11px] font-medium flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border"
								style={{
									backgroundColor: isVisible ? "var(--paper, #0f172a)" : "transparent",
									borderColor: isVisible ? "var(--line, #334155)" : "transparent",
									color: isVisible ? "var(--ink, #f8fafc)" : "var(--muted, #94a3b8)",
									fontWeight: isVisible ? 700 : 500,
								}}
								title={layer.label}
								data-testid={`layer-toggle-mobile-${layer.id}`}
							>
								{isVisible ? <Eye className="w-3.5 h-3.5 text-[var(--primary)]" /> : <EyeOff className="w-3.5 h-3.5 text-[var(--muted)]" />}
								<span className="truncate">{layer.shortLabel}</span>
							</button>
						);
					})}
				</div>

				{/* Mobile Segmented Material Modes */}
				<div
					className="grid grid-cols-4 gap-1 p-0.5 rounded-lg border"
					style={{
						backgroundColor: "var(--paper-soft, #1e293b)",
						borderColor: "var(--line-subtle, #334155)",
					}}
				>
					{modeItems.map((mode) => {
						const isActive = materialMode === mode.id;
						return (
							<button
								key={mode.id}
								type="button"
								onClick={() => onChangeMaterialMode(mode.id)}
								className="min-h-[44px] h-11 rounded-md text-xs font-medium transition-all flex items-center justify-center cursor-pointer border"
								style={{
									backgroundColor: isActive ? "var(--teal, #0d9488)" : "transparent",
									borderColor: isActive ? "var(--teal, #0d9488)" : "transparent",
									color: isActive ? "#ffffff" : "var(--muted, #94a3b8)",
									fontWeight: isActive ? 700 : 500,
								}}
								title={mode.label}
								data-testid={`material-mode-mobile-${mode.id}`}
							>
								<span>{mode.shortLabel}</span>
							</button>
						);
					})}
				</div>

				{/* Mobile Kinematic Actions */}
				<div className="grid grid-cols-2 gap-1.5">
					<button
						type="button"
						onClick={onToggleBite}
						className="min-h-[44px] h-11 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border"
						style={{
							backgroundColor: isBiteClosed ? "rgba(13, 148, 136, 0.15)" : "var(--paper, #0f172a)",
							borderColor: isBiteClosed ? "rgba(13, 148, 136, 0.35)" : "var(--line, #334155)",
							color: isBiteClosed ? "var(--teal, #0d9488)" : "var(--ink, #f8fafc)",
							fontWeight: isBiteClosed ? 600 : 500,
						}}
						data-testid="btn-toggle-bite-mobile"
					>
						<span>{isBiteClosed ? "Сомкнуты" : "Разомкнуты"}</span>
					</button>

					<button
						type="button"
						onClick={onToggleCaliper}
						className="min-h-[44px] h-11 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border"
						style={{
							backgroundColor: isCaliperActive ? "rgba(245, 158, 11, 0.15)" : "var(--paper, #0f172a)",
							borderColor: isCaliperActive ? "rgba(245, 158, 11, 0.4)" : "var(--line, #334155)",
							color: isCaliperActive ? "#f59e0b" : "var(--ink, #f8fafc)",
							fontWeight: isCaliperActive ? 600 : 500,
						}}
						data-testid="btn-toggle-caliper-mobile"
					>
						<Ruler className="w-3.5 h-3.5" />
						<span>{isCaliperActive ? "Циркуль вкл." : "Циркуль"}</span>
					</button>
				</div>

				{/* Mobile Primary CTA: В лабораторию (if requested) */}
				{onOpenLabOrder && (
					<button
						type="button"
						onClick={onOpenLabOrder}
						className="min-h-[48px] h-12 w-full rounded-xl text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer border-0"
						style={{
							backgroundColor: "var(--teal, #0d9488)",
							color: "#ffffff",
						}}
						data-testid="btn-create-lab-order-from-3d-mobile"
					>
						<Send className="w-4 h-4" />
						<span>В лабораторию</span>
					</button>
				)}
			</div>
		</>
	);
};

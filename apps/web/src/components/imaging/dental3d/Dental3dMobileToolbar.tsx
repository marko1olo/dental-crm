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
						backgroundColor: "var(--paper-strong)",
						borderColor: "var(--line)",
						color: "var(--ink)",
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
									backgroundColor: "var(--primary-soft)",
									color: "var(--primary)",
									border: "1px solid var(--primary-line)",
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
								backgroundColor: "var(--paper)",
								borderColor: "var(--line)",
								color: "var(--ink)",
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
								backgroundColor: "var(--paper)",
								borderColor: "var(--line)",
								color: "var(--ink)",
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
					backgroundColor: "var(--paper-strong)",
					borderColor: "var(--line)",
					color: "var(--ink)",
				}}
			>
				{/* Mobile Segmented Layer Toggles */}
				<div
					className="grid grid-cols-5 gap-1 p-0.5 rounded-lg border"
					style={{
						backgroundColor: "var(--paper-soft)",
						borderColor: "var(--line-subtle)",
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
									backgroundColor: isVisible ? "var(--paper)" : "transparent",
									borderColor: isVisible ? "var(--line)" : "transparent",
									color: isVisible ? "var(--ink)" : "var(--muted)",
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
						backgroundColor: "var(--paper-soft)",
						borderColor: "var(--line-subtle)",
					}}
				>
					{modeItems.map((mode) => {
						const isActive = materialMode === mode.id;
						return (
							<button
								key={mode.id}
								type="button"
								onClick={() => onChangeMaterialMode(mode.id)}
								className={`min-h-[44px] h-11 rounded-md text-xs font-medium transition-all flex items-center justify-center cursor-pointer border ${isActive ? "text-white" : ""}`}
								style={{
									backgroundColor: isActive ? "var(--primary)" : "transparent",
									borderColor: isActive ? "var(--primary)" : "transparent",
									color: isActive ? undefined : "var(--muted)",
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
							backgroundColor: isBiteClosed ? "var(--primary-soft)" : "var(--paper)",
							borderColor: isBiteClosed ? "var(--primary-line)" : "var(--line)",
							color: isBiteClosed ? "var(--primary)" : "var(--ink)",
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
							backgroundColor: isCaliperActive ? "var(--warning-soft)" : "var(--paper)",
							borderColor: isCaliperActive ? "var(--warning-line)" : "var(--line)",
							color: isCaliperActive ? "var(--warning)" : "var(--ink)",
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
						className="min-h-[48px] h-12 w-full rounded-xl text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer border-0 bg-[var(--primary)] text-white"
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

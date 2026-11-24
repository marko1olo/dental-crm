/**
 * apps/web/src/components/imaging/dental3d/Dental3dToolbar.tsx
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * APPLE HIG DENTAL 3D CONTROLS TOOLBAR & SEGMENTED SWITCHERS
 * ═══════════════════════════════════════════════════════════════════════════
 * Dual-arch layer toggles, TrueColor/Occlusion/Undercut modes, 3D Caliper,
 * Anti-Desktop-Squeeze responsive architecture (compact topbar + bottom bar
 * on mobile, segmented controls on desktop), Zero Clipped Words, and Zero Emojis.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import {
	RotateCcw,
	ExternalLink,
	Send,
	Ruler,
	Layers,
	Eye,
	EyeOff,
	X,
	Maximize2,
	Minimize2,
	FolderOpen,
	Box,
} from "lucide-react";
import type {
	DentalArchLayer,
	DentalMaterialMode,
	LayerVisibilityState,
	CaliperMeasurement,
} from "./dental3dTypes.js";
import { Dental3dMobileToolbar } from "./Dental3dMobileToolbar.js";
import { Dental3dCaliperToast } from "./Dental3dCaliperToast.js";

export interface Dental3dToolbarProps {
	readonly patientName?: string | undefined;
	readonly toothCode?: (string | number) | undefined;
	readonly activeTeeth?: string[] | undefined;
	readonly layerVisibility: LayerVisibilityState;
	readonly onToggleLayer: (layer: DentalArchLayer) => void;
	readonly materialMode: DentalMaterialMode;
	readonly onChangeMaterialMode: (mode: DentalMaterialMode) => void;
	readonly isBiteClosed: boolean;
	readonly onToggleBite: () => void;
	readonly isCaliperActive: boolean;
	readonly onToggleCaliper: () => void;
	readonly caliperMeasurement: CaliperMeasurement | null;
	readonly onClearCaliper: () => void;
	readonly onResetCamera: () => void;
	readonly onOpenFilePicker: () => void;
	readonly onOpenLabOrder?: (() => void) | undefined;
	readonly onPopout?: (() => void) | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly isFullscreen?: boolean | undefined;
	readonly onToggleFullscreen?: (() => void) | undefined;
	readonly isStandalone?: boolean | undefined;
}

export const Dental3dToolbar: React.FC<Dental3dToolbarProps> = ({
	patientName,
	toothCode,
	activeTeeth,
	layerVisibility,
	onToggleLayer,
	materialMode,
	onChangeMaterialMode,
	isBiteClosed,
	onToggleBite,
	isCaliperActive,
	onToggleCaliper,
	caliperMeasurement,
	onClearCaliper,
	onResetCamera,
	onOpenFilePicker,
	onOpenLabOrder,
	onPopout,
	onClose,
	isFullscreen,
	onToggleFullscreen,
	isStandalone,
}) => {
	const displayTooth = toothCode !== undefined ? String(toothCode) : (activeTeeth && activeTeeth.length > 0 ? activeTeeth.join(", ") : undefined);

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
			{/* ═══════════════════════════════════════════════════════════════════
			    1. DESKTOP TOOLBAR (md:flex - Screens > 768px)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="hidden md:flex absolute top-0 left-0 right-0 z-30 pointer-events-none p-3 flex-col gap-2">
				{/* Top Bar: Title & Primary Actions */}
				<div
					className="pointer-events-auto flex items-center justify-between gap-3 px-3 py-2 rounded-xl backdrop-blur-md border shadow-md"
					style={{
						backgroundColor: "var(--paper-strong)",
						borderColor: "var(--line)",
						color: "var(--ink)",
					}}
				>
					{/* Left: Box Icon, Title & Clinical Badges */}
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="flex items-center gap-1.5 shrink-0">
							<Box className="w-4 h-4 text-[var(--primary)]" />
							<span className="text-sm font-bold tracking-tight whitespace-nowrap" style={{ color: "var(--ink)" }}>
								3D-скан челюстей
							</span>
						</div>

						{patientName && (
							<span
								className="text-xs font-semibold px-2 py-0.5 rounded-md truncate max-w-[200px]"
								style={{
									backgroundColor: "var(--primary-soft)",
									color: "var(--primary)",
									border: "1px solid var(--primary-line)",
								}}
								title={`Пациент: ${patientName}`}
							>
								{patientName}
							</span>
						)}

						{displayTooth && (
							<span
								className="text-xs font-mono font-bold px-2 py-0.5 rounded-md whitespace-nowrap"
								style={{
									backgroundColor: "var(--primary-soft)",
									color: "var(--primary)",
									border: "1px solid var(--primary-line)",
								}}
								title={`Зуб FDI: ${displayTooth}`}
								data-testid="viewer3d-tooth-badge"
							>
								{`Зуб № ${displayTooth}`}
							</span>
						)}
					</div>

					{/* Right Actions: File, Reset, Popout, Lab Order, Fullscreen, Close */}
					<div className="flex items-center gap-2 shrink-0 ml-auto">
						<button
							type="button"
							onClick={onOpenFilePicker}
							className="h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer border"
							style={{
								backgroundColor: "var(--paper)",
								borderColor: "var(--line)",
								color: "var(--ink)",
							}}
							title="Загрузить сканы челюстей (.ply, .stl, .obj, .zip)"
							data-testid="btn-open-3d-file"
						>
							<FolderOpen className="w-3.5 h-3.5 text-[var(--muted)]" />
							<span>Файл</span>
						</button>

						<button
							type="button"
							onClick={onResetCamera}
							className="h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer border"
							style={{
								backgroundColor: "var(--paper)",
								borderColor: "var(--line)",
								color: "var(--ink)",
							}}
							title="Сброс камеры в анатомический ракурс"
							data-testid="btn-reset-camera"
						>
							<RotateCcw className="w-3.5 h-3.5 text-[var(--muted)]" />
							<span>Сброс камеры</span>
						</button>

						{onPopout && !isStandalone && (
							<button
								type="button"
								onClick={onPopout}
								className="h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border"
								style={{
									backgroundColor: "var(--paper-soft)",
									borderColor: "var(--line)",
									color: "var(--primary)",
								}}
								title="Открыть на 2-м мониторе врача/пациента"
								data-testid="btn-scan3d-popout"
							>
								<ExternalLink className="w-3.5 h-3.5" />
								<span>На 2-й монитор</span>
							</button>
						)}

						{onOpenLabOrder && (
							<button
								type="button"
								onClick={onOpenLabOrder}
								className="h-8 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
								style={{
									backgroundColor: "var(--primary)",
									color: "var(--paper-strong)",
									border: "1px solid var(--primary)",
								}}
								title="Создать зуботехнический наряд в лабораторию"
								data-testid="btn-create-lab-order-from-3d"
							>
								<Send className="w-3.5 h-3.5" />
								<span>В лабораторию</span>
							</button>
						)}

						{onToggleFullscreen && (
							<button
								type="button"
								onClick={onToggleFullscreen}
								className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
								style={{ color: "var(--ink-muted)", backgroundColor: "transparent" }}
								title={isFullscreen ? "Свернуть" : "На весь экран"}
							>
								{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
							</button>
						)}

						{onClose && (
							<button
								type="button"
								onClick={onClose}
								className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
								style={{ color: "var(--ink-muted)", backgroundColor: "transparent" }}
								title="Закрыть окно (Esc)"
								data-testid="btn-close-3d-scan-modal"
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>
				</div>

				{/* Second Row: Segmented Controls for Layers, Materials, and Kinematics */}
				<div
					className="pointer-events-auto flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl backdrop-blur-md border shadow-xs"
					style={{
						backgroundColor: "var(--paper-strong)",
						borderColor: "var(--line)",
						color: "var(--ink)",
					}}
				>
					{/* Group 1: Segmented Layer Toggles */}
					<div
						className="flex items-center gap-1 p-0.5 rounded-lg border shrink-0"
						style={{
							backgroundColor: "var(--paper-soft)",
							borderColor: "var(--line-subtle)",
						}}
					>
						<span className="text-[10px] font-semibold px-2 tracking-wider flex items-center gap-1" style={{ color: "var(--ink-muted)" }}>
							<Layers className="w-3 h-3" />
							Слои:
						</span>

						{layerItems.map((layer) => {
							const isVisible = layerVisibility[layer.id];
							return (
								<button
									key={layer.id}
									type="button"
									onClick={() => onToggleLayer(layer.id)}
									className="h-7 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer border"
									style={{
										backgroundColor: isVisible ? "var(--paper)" : "transparent",
										borderColor: isVisible ? "var(--line)" : "transparent",
										color: isVisible ? "var(--ink)" : "var(--ink-muted)",
										fontWeight: isVisible ? 600 : 500,
									}}
									title={`Видимость слоя: ${layer.label}`}
									data-testid={`layer-toggle-${layer.id}`}
								>
									{isVisible ? <Eye className="w-3 h-3 text-[var(--primary)]" /> : <EyeOff className="w-3 h-3 text-[var(--muted)]" />}
									<span>{layer.label}</span>
								</button>
							);
						})}
					</div>

					{/* Group 2: Segmented Material Mode Switcher */}
					<div
						className="flex items-center gap-1 p-0.5 rounded-lg border shrink-0"
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
									className={`h-7 px-3 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${isActive ? "text-white" : ""}`}
									style={{
										backgroundColor: isActive ? "var(--primary)" : "transparent",
										borderColor: isActive ? "var(--primary)" : "transparent",
										color: isActive ? undefined : "var(--ink-muted)",
										fontWeight: isActive ? 600 : 500,
									}}
									title={`Режим отображения: ${mode.label}`}
									data-testid={`material-mode-${mode.id}`}
								>
									{mode.label}
								</button>
							);
						})}
					</div>

					{/* Group 3: Kinematic Bite & Caliper Buttons */}
					<div className="flex items-center gap-2 shrink-0 ml-auto">
						<button
							type="button"
							onClick={onToggleBite}
							className="h-7 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer border"
							style={{
								backgroundColor: isBiteClosed ? "var(--primary-soft)" : "var(--paper)",
								borderColor: isBiteClosed ? "var(--primary-line)" : "var(--line)",
								color: isBiteClosed ? "var(--primary)" : "var(--ink)",
								fontWeight: isBiteClosed ? 600 : 500,
							}}
							title={isBiteClosed ? "Челюсти сомкнуты в прикусе (кликните чтобы разомкнуть)" : "Челюсти разомкнуты для обзора окклюзии"}
							data-testid="btn-toggle-bite"
						>
							<span>{isBiteClosed ? "Смыкание: Прикус" : "Разомкнуты"}</span>
						</button>

						<button
							type="button"
							onClick={onToggleCaliper}
							className="h-7 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer border"
							style={{
								backgroundColor: isCaliperActive ? "var(--warning-soft)" : "var(--paper)",
								borderColor: isCaliperActive ? "var(--warning-line)" : "var(--line)",
								color: isCaliperActive ? "var(--warning)" : "var(--ink)",
								fontWeight: isCaliperActive ? 600 : 500,
							}}
							title="Микрометрический штангенциркуль — кликните 2 точки на челюсти для замера"
							data-testid="btn-toggle-caliper"
						>
							<Ruler className="w-3.5 h-3.5" />
							<span>Штангенциркуль</span>
						</button>
					</div>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. MOBILE TOOLBAR (md:hidden - Screens <= 768px, Apple HIG)
			    ═══════════════════════════════════════════════════════════════════ */}
			<Dental3dMobileToolbar
				patientName={patientName}
				displayTooth={displayTooth}
				layerVisibility={layerVisibility}
				onToggleLayer={onToggleLayer}
				materialMode={materialMode}
				onChangeMaterialMode={onChangeMaterialMode}
				isBiteClosed={isBiteClosed}
				onToggleBite={onToggleBite}
				isCaliperActive={isCaliperActive}
				onToggleCaliper={onToggleCaliper}
				onResetCamera={onResetCamera}
				onOpenFilePicker={onOpenFilePicker}
				onOpenLabOrder={onOpenLabOrder}
				onClose={onClose}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			    3. 3D CALIPER ACTIVE MEASUREMENT TOAST / HUD
			    ═══════════════════════════════════════════════════════════════════ */}
			<Dental3dCaliperToast
				isCaliperActive={isCaliperActive}
				caliperMeasurement={caliperMeasurement}
				onClearCaliper={onClearCaliper}
			/>
		</>
	);
};

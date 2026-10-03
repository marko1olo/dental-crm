/**
 * DENTE CRM — CBCT 3D Volume Skull Projections & Orientation Toolbar
 * Standards: Vatech Ez3D-i (8 Skull Projections Dock), Planmeca Romexis 6.x
 *
 * Implements 8 1-click anatomical cranial views for immediate 3D volume orientation:
 * 1. Фас / Anterior (yaw=0, pitch=0) — Frontal facial view
 * 2. Правый профиль / Right Lateral (yaw=90, pitch=0) — Right mandible & TMJ
 * 3. Левый профиль / Left Lateral (yaw=-90, pitch=0) — Left mandible & TMJ
 * 4. Затылок / Posterior (yaw=180, pitch=0) — Occipital & cervical view
 * 5. Сверху / Окклюзия / Superior (yaw=0, pitch=85) — Occlusal arch view
 * 6. Снизу / Базис / Inferior (yaw=0, pitch=-85) — Submental mandibular base
 * 7. 3/4 Правый / Right Anterolateral (yaw=45, pitch=15) — Right 3D isometric
 * 8. 3/4 Левый / Left Anterolateral (yaw=-45, pitch=15) — Left 3D isometric
 * Plus instant center/zoom reset button.
 */

import React from "react";
import { RotateCcw } from "lucide-react";

export type SkullProjectionKey =
	| "anterior"       // Фас (0°, 0°)
	| "right_lateral"  // Правый профиль (90°, 0°)
	| "left_lateral"   // Левый профиль (-90°, 0°)
	| "posterior"      // Затылок (180°, 0°)
	| "superior"       // Сверху / Окклюзия (0°, 85°)
	| "inferior"       // Снизу / Базис (0°, -85°)
	| "right_oblique"  // 3/4 Правый (45°, 15°)
	| "left_oblique";  // 3/4 Левый (-45°, 15°)

export interface SkullProjectionDefinition {
	key: SkullProjectionKey;
	label: string;
	shortLabel: string;
	tooltip: string;
	yaw: number;
	pitch: number;
	ez3dCode: "A" | "P" | "L" | "R" | "F" | "H" | "3/4R" | "3/4L";
}

export const SKULL_PROJECTIONS: readonly SkullProjectionDefinition[] = [
	{
		key: "anterior",
		label: "Фас",
		shortLabel: "Фас",
		tooltip: "A (Anterior) / Фас: фронтальный вид черепа и резцов (Yaw 0°, Pitch 0°)",
		yaw: 0,
		pitch: 0,
		ez3dCode: "A",
	},
	{
		key: "posterior",
		label: "Затылок",
		shortLabel: "Зат.",
		tooltip: "P (Posterior) / Затылок: вид сзади, основание черепа и шейный отдел (Yaw 180°, Pitch 0°)",
		yaw: 180,
		pitch: 0,
		ez3dCode: "P",
	},
	{
		key: "left_lateral",
		label: "Лев. профиль",
		shortLabel: "Лев.",
		tooltip: "L (Left) / Левый профиль: латеральный вид левой челюсти и ВНЧС (Yaw -90°, Pitch 0°)",
		yaw: -90,
		pitch: 0,
		ez3dCode: "L",
	},
	{
		key: "right_lateral",
		label: "Пр. профиль",
		shortLabel: "Пр.",
		tooltip: "R (Right) / Правый профиль: латеральный вид правой челюсти и ВНЧС (Yaw 90°, Pitch 0°)",
		yaw: 90,
		pitch: 0,
		ez3dCode: "R",
	},
	{
		key: "inferior",
		label: "Снизу",
		shortLabel: "Низ",
		tooltip: "F (Foot/Inferior) / Снизу: вид снизу на базис нижней челюсти (Yaw 0°, Pitch -85°)",
		yaw: 0,
		pitch: -85,
		ez3dCode: "F",
	},
	{
		key: "superior",
		label: "Сверху",
		shortLabel: "Верх",
		tooltip: "H (Head/Superior) / Сверху: аксиальный вид сверху на зубной ряд (Yaw 0°, Pitch +85°)",
		yaw: 0,
		pitch: 85,
		ez3dCode: "H",
	},
	{
		key: "right_oblique",
		label: "3/4 Пр.",
		shortLabel: "3/4П",
		tooltip: "3/4R (Right Oblique): изометрический правый ракурс челюсти (Yaw 45°, Pitch 15°)",
		yaw: 45,
		pitch: 15,
		ez3dCode: "3/4R",
	},
	{
		key: "left_oblique",
		label: "3/4 Лев.",
		shortLabel: "3/4Л",
		tooltip: "3/4L (Left Oblique): изометрический левый ракурс челюсти (Yaw -45°, Pitch 15°)",
		yaw: -45,
		pitch: 15,
		ez3dCode: "3/4L",
	},
];

/** Lightweight schematic vector SVG skull icons for Ez3D-i cranial projection shortcuts */
export const SkullSvgIcon: React.FC<{ projection: SkullProjectionKey; className?: string }> = ({
	projection,
	className = "w-3.5 h-3.5",
}) => {
	switch (projection) {
		case "anterior":
			// Frontal skull contour with eyes and jaw
			return (
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className={className} aria-hidden="true">
					<path d="M4 7C4 4.2 5.8 2 8 2s4 2.2 4 5c0 1.6-.6 2.8-1.5 3.5v2H5.5v-2C4.6 9.8 4 8.6 4 7z" />
					<circle cx="6.2" cy="6.8" r="0.9" fill="currentColor" />
					<circle cx="9.8" cy="6.8" r="0.9" fill="currentColor" />
					<line x1="7" y1="12" x2="9" y2="12" strokeLinecap="round" />
				</svg>
			);
		case "right_lateral":
			// Profile facing right with prominent nose and chin
			return (
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className={className} aria-hidden="true">
					<path d="M4 8C4 4.5 5.8 2 8.5 2c2 0 3.2 1.2 3.5 3 .5.4 1.5 1 1.5 2-.8.5-.8 1-.2 1.5-.7 1.5-1.5 1.5-2.3 2.5v2H6.5c-1.5-1-2.5-2.8-2.5-5z" />
					<circle cx="9.2" cy="6.2" r="0.8" fill="currentColor" />
				</svg>
			);
		case "left_lateral":
			// Profile facing left with prominent nose and chin
			return (
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className={className} aria-hidden="true">
					<path d="M12 8C12 4.5 10.2 2 7.5 2c-2 0-3.2 1.2-3.5 3-.5.4-1.5 1-1.5 2 .8.5.8 1 .2 1.5.7 1.5 1.5 1.5 2.3 2.5v2h4.5c1.5-1 2.5-2.8 2.5-5z" />
					<circle cx="6.8" cy="6.2" r="0.8" fill="currentColor" />
				</svg>
			);
		case "posterior":
			// Occipital back of the head
			return (
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className={className} aria-hidden="true">
					<path d="M4 7.5C4 4.5 5.8 2 8 2s4 2.5 4 5.5c0 2-1 3.5-1.5 4.5v1.5H5.5V12C5 11 4 9.5 4 7.5z" />
					<line x1="8" y1="4" x2="8" y2="10" strokeDasharray="1.5 1.5" />
				</svg>
			);
		case "superior":
			// Top-down occlusal view with anterior dental arch indicator
			return (
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className={className} aria-hidden="true">
					<ellipse cx="8" cy="8.5" rx="4.8" ry="5.5" />
					<path d="M5.5 5.5Q8 3.5 10.5 5.5" strokeWidth="1.5" strokeLinecap="round" />
					<circle cx="8" cy="4" r="0.7" fill="currentColor" />
				</svg>
			);
		case "inferior":
			// Submental view looking up at the mandible horseshoe
			return (
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className={className} aria-hidden="true">
					<ellipse cx="8" cy="7.5" rx="5" ry="5" />
					<path d="M5 10.5Q8 13 11 10.5" strokeWidth="1.5" strokeLinecap="round" />
					<circle cx="8" cy="12" r="0.7" fill="currentColor" />
				</svg>
			);
		case "right_oblique":
			// 3/4 right turn
			return (
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className={className} aria-hidden="true">
					<path d="M4.5 7.5c0-3 1.8-5 4-5 2.5 0 4 1.8 4 4.5 0 1.5-.5 2.8-1.2 3.5l.2 2H6v-2C5 9.8 4.5 8.8 4.5 7.5z" />
					<circle cx="7.5" cy="6.5" r="0.8" fill="currentColor" />
					<circle cx="10.5" cy="6.5" r="0.8" fill="currentColor" />
				</svg>
			);
		case "left_oblique":
			// 3/4 left turn
			return (
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className={className} aria-hidden="true">
					<path d="M11.5 7.5c0-3-1.8-5-4-5-2.5 0-4 1.8-4 4.5 0 1.5.5 2.8 1.2 3.5l-.2 2H10v-2c1-.7 1.5-1.7 1.5-3z" />
					<circle cx="8.5" cy="6.5" r="0.8" fill="currentColor" />
					<circle cx="5.5" cy="6.5" r="0.8" fill="currentColor" />
				</svg>
			);
	}
};

export interface CbctSkullProjectionsToolbarProps {
	readonly currentYaw: number;
	readonly currentPitch: number;
	readonly onSelectProjection: (yaw: number, pitch: number) => void;
	readonly onResetCamera?: () => void;
	readonly className?: string;
}

export const CbctSkullProjectionsToolbar: React.FC<CbctSkullProjectionsToolbarProps> = ({
	currentYaw,
	currentPitch,
	onSelectProjection,
	onResetCamera,
	className = "",
}) => {
	// Normalize yaw to [-180, 180] for comparison
	const normYaw = ((((currentYaw + 180) % 360) + 360) % 360) - 180;
	const isNear = (targetYaw: number, targetPitch: number): boolean => {
		const dYaw = Math.abs(normYaw - targetYaw);
		const dPitch = Math.abs(currentPitch - targetPitch);
		return (dYaw <= 12 || Math.abs(dYaw - 360) <= 12) && dPitch <= 12;
	};

	return (
		<div
			role="toolbar"
			aria-label="Проекции черепа Ez3D-i"
			data-testid="cbct-skull-projections-toolbar"
			className={`inline-flex items-center bg-zinc-950/85 backdrop-blur-md px-1.5 py-1 rounded-lg border border-zinc-800 shadow-xl pointer-events-auto gap-1 select-none z-20 ${className}`}
		>
			{SKULL_PROJECTIONS.map((proj) => {
				const active = isNear(proj.yaw, proj.pitch);
				return (
					<button
						key={proj.key}
						type="button"
						onClick={() => onSelectProjection(proj.yaw, proj.pitch)}
						title={proj.tooltip}
						data-testid={`cbct-skull-proj-${proj.key}`}
						className={`px-1.5 py-0.5 min-w-[30px] h-7 rounded flex flex-col items-center justify-center gap-0.5 text-[9px] font-semibold transition-all cursor-pointer ${
							active
								? "bg-[#054A6E]/50 text-cyan-300 border border-cyan-400 shadow-xs font-bold ring-1 ring-cyan-500/40"
								: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-200 hover:bg-[#054A6E]/20 border border-zinc-800/80"
						}`}
					>
						<div className="flex items-center gap-1">
							<SkullSvgIcon projection={proj.key} className={active ? "text-cyan-300" : "text-zinc-400"} />
							<span className={`text-[8.5px] font-mono font-bold leading-none ${active ? "text-cyan-200" : "text-cyan-600"}`}>
								{proj.ez3dCode}
							</span>
						</div>
						<span className="leading-none">{proj.shortLabel}</span>
					</button>
				);
			})}

			{onResetCamera && (
				<>
					<div className="w-[1px] h-5 bg-zinc-800 mx-0.5 shrink-0" />
					<button
						type="button"
						onClick={onResetCamera}
						title="Сброс масштаба и угла камеры (30°, 12°, 1.0x)"
						data-testid="cbct-btn-reset-skull-proj"
						className="p-1.5 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors cursor-pointer"
					>
						<RotateCcw className="w-3.5 h-3.5" />
					</button>
				</>
			)}
		</div>
	);
};

export default CbctSkullProjectionsToolbar;

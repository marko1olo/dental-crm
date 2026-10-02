/**
 * DENTE CRM — VATECH Ez3D-i 3D Volume Rendering Quadrant Component
 * Houses: 3D Skull & Mandible Spatial Scene, Orbit Controls, Airway Visualization, Titanium Implant, 9 Skull Presets.
 * Strict Mandate 8b (<= 800 lines).
 */

import React from "react";
import {
	SKULL_PRESETS,
	VR_PRESET_CONFIGS,
	type Ez3dVrPreset,
	type SkullOrientationPreset,
} from "./ez3dMprTypes.js";

export interface Ez3dQuadrant3dProps {
	readonly skullRotation: { pitch: number; yaw: number; roll: number };
	readonly onMouseDown: (e: React.MouseEvent) => void;
	readonly onMouseMove: (e: React.MouseEvent) => void;
	readonly onMouseUp: () => void;
	readonly vrPreset: Ez3dVrPreset;
	readonly showAirway: boolean;
	readonly isImplantVisible: boolean;
	readonly activeSkullPreset: number;
	readonly onSelectSkullPreset: (preset: SkullOrientationPreset) => void;
}

export const Ez3dQuadrant3d: React.FC<Ez3dQuadrant3dProps> = ({
	skullRotation,
	onMouseDown,
	onMouseMove,
	onMouseUp,
	vrPreset,
	showAirway,
	isImplantVisible,
	activeSkullPreset,
	onSelectSkullPreset,
}) => {
	return (
		<div
			className="relative bg-black border border-slate-800 overflow-hidden flex flex-col justify-between p-2 select-none cursor-grab active:cursor-grabbing"
			onMouseDown={onMouseDown}
			onMouseMove={onMouseMove}
			onMouseUp={onMouseUp}
		>
			{/* Header HUD: 3D Label */}
			<div className="flex justify-between items-start z-10">
				<span className="font-bold text-sm tracking-wide text-amber-500 drop-shadow">
					3D
				</span>
				<div className="text-[10px] font-mono text-slate-400">
					Вращение: мышь ЛКМ
				</div>
			</div>

			{/* Center 3D Skull & Mandible Rendering Canvas with Dynamic Orbit */}
			<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
				<div
					className="w-64 h-64 relative flex items-center justify-center transition-transform duration-75"
					style={{
						transform: `perspective(600px) rotateX(${skullRotation.pitch}deg) rotateY(${skullRotation.yaw}deg)`,
					}}
				>
					{/* 3D Skull Volume Silhouette Shader Mockup */}
					<svg viewBox="0 0 300 300" className="w-full h-full filter drop-shadow-2xl">
						<defs>
							<radialGradient id="vrSkullGradient" cx="40%" cy="35%" r="60%">
								<stop
									offset="0%"
									stopColor={VR_PRESET_CONFIGS[vrPreset].colorHex}
									stopOpacity="0.95"
								/>
								<stop offset="70%" stopColor="#451a03" stopOpacity="0.8" />
								<stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
							</radialGradient>
						</defs>
						{/* Cranium Skull Dome */}
						<ellipse cx="150" cy="110" rx="90" ry="75" fill="url(#vrSkullGradient)" />
						{/* Eye Orbits */}
						<circle cx="115" cy="115" r="22" fill="#050505" opacity="0.9" />
						<circle cx="185" cy="115" r="22" fill="#050505" opacity="0.9" />
						{/* Nasal Cavity (Пириформная апертура) */}
						<polygon points="150,130 140,165 160,165" fill="#050505" opacity="0.95" />
						{/* Maxilla & Upper Teeth Row */}
						<path
							d="M 95 180 Q 150 200 205 180 L 195 210 Q 150 220 105 210 Z"
							fill="#fef08a"
							stroke="#ca8a04"
							strokeWidth="1.5"
						/>
						{/* Mandible Jaw */}
						<path
							d="M 85 215 Q 150 280 215 215 L 205 250 Q 150 295 95 250 Z"
							fill="url(#vrSkullGradient)"
						/>

						{/* Airway Visualization Overlay (Cyan Volume) */}
						{showAirway && (
							<path
								d="M 135 155 Q 150 250 145 285 Q 155 285 160 250 Q 155 155 135 155 Z"
								fill="#06b6d4"
								opacity="0.8"
								className="animate-pulse"
							/>
						)}

						{/* Titanium Dental Implant Model (Ø4.5x11.5mm) */}
						{isImplantVisible && (
							<g transform="translate(110, 220) rotate(5)">
								<rect x="-4" y="0" width="8" height="24" rx="2" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
								<line x1="-4" y1="5" x2="4" y2="5" stroke="#ffffff" strokeWidth="0.8" />
								<line x1="-4" y1="10" x2="4" y2="10" stroke="#ffffff" strokeWidth="0.8" />
								<line x1="-4" y1="15" x2="4" y2="15" stroke="#ffffff" strokeWidth="0.8" />
							</g>
						)}
					</svg>
				</div>

				{/* 3D Spatial Orientation Crosshair Target (Yellow/Red/Green Probe) */}
				<div className="absolute pointer-events-none flex items-center justify-center">
					<div className="w-8 h-[2px] bg-yellow-400" />
					<div className="h-8 w-[2px] bg-yellow-400 absolute" />
					<div className="w-2 h-2 rounded-full border border-yellow-300 absolute" />
				</div>
			</div>

			{/* 9 SKULL ORIENTATION PRESET BUTTONS (Parity with Screen 1 floating bar) */}
			<div className="z-20 flex justify-center mb-1">
				<div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700 backdrop-blur-md shadow-xl">
					{SKULL_PRESETS.map((preset) => {
						const isActive = activeSkullPreset === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onSelectSkullPreset(preset);
								}}
								title={preset.nameRu}
								className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer ${
									isActive
										? "bg-emerald-600 text-white shadow-md scale-105"
										: "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
								}`}
							>
								{preset.shortCode}
							</button>
						);
					})}
				</div>
			</div>

			{/* Bottom Right 3D Telemetry HUD: FOV & Spatial Coords Cs: [1.2, -4.7, -3.7] */}
			<div className="flex justify-between items-end text-[10px] font-mono text-slate-400 z-10">
				<div className="text-[9px]">
					{showAirway && (
						<span className="text-cyan-400 font-bold">
							Airway: 24.8 cm³ [min: 148 mm²]
						</span>
					)}
				</div>
				<div className="text-right space-y-0.5">
					<div>FOV [51 x 80 мм]</div>
					<div className="text-emerald-400 font-bold">
						Cs: [1.2, -4.7, -3.7]
					</div>
				</div>
			</div>
		</div>
	);
};

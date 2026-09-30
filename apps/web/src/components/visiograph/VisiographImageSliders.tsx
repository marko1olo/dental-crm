/**
 * VisiographImageSliders.tsx
 *
 * Real-time sliders for Brightness, Contrast, Gamma (γ), and Sharpness (USM).
 */

import { Sliders } from "lucide-react";
import type React from "react";
import type { VisiographImageParams } from "./VisiographImageProcessor";

export interface VisiographImageSlidersProps {
	params: VisiographImageParams;
	setParams: React.Dispatch<React.SetStateAction<VisiographImageParams>>;
	onResetParams: () => void;
	setActiveClinicalFilter: (id: string | null) => void;
}

export function VisiographImageSliders({
	params,
	setParams,
	onResetParams,
	setActiveClinicalFilter,
}: VisiographImageSlidersProps) {
	return (
		<>
			<div
				style={{
					fontWeight: 600,
					color: "var(--primary, #58a6ff)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<span>
					<Sliders size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
					Коррекция
				</span>
				<button
					type="button"
					onClick={onResetParams}
					style={{
						background: "none",
						border: "none",
						color: "var(--muted, #8b949e)",
						cursor: "pointer",
						fontSize: "0.74rem",
					}}
				>
					Сброс
				</button>
			</div>

			{/* Brightness */}
			<div>
				<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
					<span>Яркость</span>
					<span>{params.brightness > 0 ? `+${params.brightness}` : params.brightness}</span>
				</div>
				<input
					type="range"
					min="-100"
					max="100"
					value={params.brightness}
					onChange={(e) => {
						setParams((p) => ({ ...p, brightness: Number(e.target.value) }));
						setActiveClinicalFilter(null);
					}}
					style={{ width: "100%", accentColor: "var(--primary, #58a6ff)" }}
				/>
			</div>

			{/* Contrast */}
			<div>
				<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
					<span>Контраст</span>
					<span>{params.contrast > 0 ? `+${params.contrast}` : params.contrast}</span>
				</div>
				<input
					type="range"
					min="-100"
					max="100"
					value={params.contrast}
					onChange={(e) => {
						setParams((p) => ({ ...p, contrast: Number(e.target.value) }));
						setActiveClinicalFilter(null);
					}}
					style={{ width: "100%", accentColor: "var(--primary, #58a6ff)" }}
				/>
			</div>

			{/* Gamma */}
			<div>
				<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
					<span>Гамма (γ)</span>
					<span>{params.gamma.toFixed(2)}</span>
				</div>
				<input
					type="range"
					min="0.2"
					max="3.0"
					step="0.05"
					value={params.gamma}
					onChange={(e) => {
						setParams((p) => ({ ...p, gamma: Number(e.target.value) }));
						setActiveClinicalFilter(null);
					}}
					style={{ width: "100%", accentColor: "var(--primary, #58a6ff)" }}
				/>
			</div>

			{/* Sharpness (Unsharp Mask) */}
			<div>
				<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
					<span>Резкость (USM)</span>
					<span>{params.sharpness}%</span>
				</div>
				<input
					type="range"
					min="0"
					max="100"
					value={params.sharpness}
					onChange={(e) => {
						setParams((p) => ({ ...p, sharpness: Number(e.target.value) }));
						setActiveClinicalFilter(null);
					}}
					style={{ width: "100%", accentColor: "var(--primary, #58a6ff)" }}
				/>
			</div>
		</>
	);
}

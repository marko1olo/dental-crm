/**
 * VisiographImageSliders.tsx
 * Real-time sliders for Brightness, Contrast, Gamma (γ), and Sharpness (USM).
 * Modular decomposition <= 120 lines (Mandate 8b).
 */

import { Sliders } from "lucide-react";
import type React from "react";
import type { VisiographImageParams } from "./VisiographImageProcessor";
import { VisiographSliderField } from "./VisiographSliderField";

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

			<VisiographSliderField
				label="Яркость"
				valueText={params.brightness > 0 ? `+${params.brightness}` : params.brightness}
				value={params.brightness}
				min={-100}
				max={100}
				onChange={(val) => {
					setParams((p) => ({ ...p, brightness: val }));
					setActiveClinicalFilter(null);
				}}
			/>

			<VisiographSliderField
				label="Контраст"
				valueText={params.contrast > 0 ? `+${params.contrast}` : params.contrast}
				value={params.contrast}
				min={-100}
				max={100}
				onChange={(val) => {
					setParams((p) => ({ ...p, contrast: val }));
					setActiveClinicalFilter(null);
				}}
			/>

			<VisiographSliderField
				label="Гамма (γ)"
				valueText={params.gamma.toFixed(2)}
				value={params.gamma}
				min={0.2}
				max={3.0}
				step={0.05}
				onChange={(val) => {
					setParams((p) => ({ ...p, gamma: val }));
					setActiveClinicalFilter(null);
				}}
			/>

			<VisiographSliderField
				label="Резкость (USM)"
				valueText={`${params.sharpness}%`}
				value={params.sharpness}
				min={0}
				max={100}
				onChange={(val) => {
					setParams((p) => ({ ...p, sharpness: val }));
					setActiveClinicalFilter(null);
				}}
			/>
		</>
	);
}

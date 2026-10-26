import React from "react";
import { Contrast, Sun } from "lucide-react";

interface ToothRvgSlidersProps {
	brightness: number;
	contrast: number;
	onChangeBrightness: (val: number) => void;
	onChangeContrast: (val: number) => void;
}

export const ToothRvgSliders: React.FC<ToothRvgSlidersProps> = ({
	brightness,
	contrast,
	onChangeBrightness,
	onChangeContrast,
}) => {
	return (
		<>
			<div className="dente-rvg-slider-row">
				<Sun size={14} color="var(--muted, #64748b)" />
				<input
					type="range"
					min="60"
					max="160"
					value={brightness}
					onChange={(e) => onChangeBrightness(Number(e.target.value))}
					className="dente-mini-slider"
					title="Яркость снимка"
				/>
				<span className="slider-label">{brightness}%</span>
			</div>

			<div className="dente-rvg-slider-row">
				<Contrast size={14} color="var(--muted, #64748b)" />
				<input
					type="range"
					min="60"
					max="180"
					value={contrast}
					onChange={(e) => onChangeContrast(Number(e.target.value))}
					className="dente-mini-slider"
					title="Контраст снимка"
				/>
				<span className="slider-label">{contrast}%</span>
			</div>
		</>
	);
};

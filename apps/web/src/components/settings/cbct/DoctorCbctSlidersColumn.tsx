import React from "react";
import { DoctorCbctThicknessSliders } from "./DoctorCbctThicknessSliders";
import { DoctorCbctWindowSliders } from "./DoctorCbctWindowSliders";

interface DoctorCbctSlidersColumnProps {
	windowWidth: number;
	onWindowWidthChange: (v: number) => void;
	windowLevel: number;
	onWindowLevelChange: (v: number) => void;
	gamma: number;
	onGammaChange: (v: number) => void;
	airCutoffHU: number;
	onAirCutoffChange: (v: number) => void;
	mprThicknessMm: number;
	onMprThicknessChange: (v: number) => void;
	panoThicknessMm: number;
	onPanoThicknessChange: (v: number) => void;
}

export function DoctorCbctSlidersColumn({
	windowWidth, onWindowWidthChange,
	windowLevel, onWindowLevelChange,
	gamma, onGammaChange,
	airCutoffHU, onAirCutoffChange,
	mprThicknessMm, onMprThicknessChange,
	panoThicknessMm, onPanoThicknessChange,
}: DoctorCbctSlidersColumnProps) {
	return (
		<div className="lg:col-span-7 flex flex-col space-y-4">
			<DoctorCbctWindowSliders
				windowWidth={windowWidth} onWindowWidthChange={onWindowWidthChange}
				windowLevel={windowLevel} onWindowLevelChange={onWindowLevelChange}
				gamma={gamma} onGammaChange={onGammaChange}
			/>
			<DoctorCbctThicknessSliders
				airCutoffHU={airCutoffHU} onAirCutoffChange={onAirCutoffChange}
				mprThicknessMm={mprThicknessMm} onMprThicknessChange={onMprThicknessChange}
				panoThicknessMm={panoThicknessMm} onPanoThicknessChange={onPanoThicknessChange}
			/>
		</div>
	);
}

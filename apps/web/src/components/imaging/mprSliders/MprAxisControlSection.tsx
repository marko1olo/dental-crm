/**
 * MprAxisControlSection.tsx — Выбор проекции и управление углом оси MPR (Мандат 8b <= 120 строк).
 */

import React from "react";
import type { ImagingMprSlidersProps } from "./types";

type Props = Pick<
	ImagingMprSlidersProps,
	| "cbctWorkbenchProjections"
	| "mprProjection"
	| "setMprProjection"
	| "mprControlsReady"
	| "mprProjectionLabels"
	| "mprAxisDeg"
	| "mprAxisRangeValue"
	| "mprAxisBounds"
	| "clampMprAxisDeg"
	| "setMprAxisDeg"
	| "mprAxisNudgeDeg"
	| "formatSignedMprStep"
	| "mprAxisPresetDeg"
>;

export const MprAxisControlSection: React.FC<Props> = ({
	cbctWorkbenchProjections, mprProjection, setMprProjection, mprControlsReady,
	mprProjectionLabels, mprAxisDeg, mprAxisRangeValue, mprAxisBounds,
	clampMprAxisDeg, setMprAxisDeg, mprAxisNudgeDeg, formatSignedMprStep, mprAxisPresetDeg,
}) => {
	return (
		<>
			<div className="mpr-toggle-row">
				{(cbctWorkbenchProjections ?? []).map((projection: any) => (
					<button
						className={mprProjection === projection ? "active" : ""}
						key={projection}
						type="button"
						onClick={() => setMprProjection(projection)}
						disabled={!mprControlsReady}
						aria-pressed={mprProjection === projection}
					>
						{mprProjectionLabels[projection]}
					</button>
				))}
			</div>
			<label>
				Угол оси: {mprAxisDeg}°
				<input
					aria-valuetext={mprAxisRangeValue}
					disabled={!mprControlsReady}
					min={mprAxisBounds.min}
					max={mprAxisBounds.max}
					step="1"
					type="range"
					value={mprAxisDeg}
					style={{ touchAction: "none" }}
					className="cbct-mpr-range-slider"
					onChange={(e) => setMprAxisDeg(clampMprAxisDeg(Number(e.target.value)))}
				/>
			</label>
			<fieldset className="mpr-stepper-row" data-testid="ct-mpr-axis-nudge" aria-label="Точная правка угла КТ-срезов">
				{(mprAxisNudgeDeg ?? []).map((delta: any) => (
					<button
						key={delta}
						type="button"
						onClick={() => setMprAxisDeg(clampMprAxisDeg(mprAxisDeg + delta))}
						disabled={!mprControlsReady}
						aria-label={`Изменить угол оси КТ-среза на ${formatSignedMprStep(delta, "°")}`}
					>
						{formatSignedMprStep(delta, "°")}
					</button>
				))}
			</fieldset>
			<fieldset className="mpr-preset-row" aria-label="Быстрые углы КТ-срезов">
				{(Array.isArray(mprAxisPresetDeg) ? mprAxisPresetDeg : [-30, -15, 0, 15, 30]).map((angle: any) => (
					<button
						className={mprAxisDeg === angle ? "active" : ""}
						key={angle}
						type="button"
						onClick={() => setMprAxisDeg(angle)}
						disabled={!mprControlsReady}
						aria-pressed={mprAxisDeg === angle}
						aria-label={`Установить угол оси КТ-срезов ${angle > 0 ? `+${angle}` : angle}°`}
					>
						{angle > 0 ? `+${angle}°` : `${angle}°`}
					</button>
				))}
			</fieldset>
		</>
	);
};

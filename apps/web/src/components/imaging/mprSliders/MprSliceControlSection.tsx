/**
 * MprSliceControlSection.tsx — Навигация по срезам и ручной числовой ввод параметров (Мандат 8b <= 120 строк).
 */

import React from "react";
import type { ImagingMprSlidersProps } from "./types";

export const MprSliceControlSection: React.FC<ImagingMprSlidersProps> = ({
	mprSliceLabel, mprControlsReady, mprSliceMaxIndex, mprSafeSliceIndex,
	mprSliceRangeValue, setMprSliceIndex, clampMprSliceIndex, mprAxisDeg,
	mprAxisBounds, clampMprAxisDeg, setMprAxisDeg, mprSlabMm, mprSlabBounds,
	clampMprSlabMm, setMprSlabMm, mprSliceNudgeSteps, formatSignedMprStep,
	mprSlicePresetFractions, mprSliceIndexFromFraction,
}) => {
	return (
		<>
			<label>
				Положение среза: {mprSliceLabel}
				<input
					disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
					min="0"
					max={mprSliceMaxIndex}
					step="1"
					type="range"
					value={mprSafeSliceIndex}
					aria-valuetext={mprSliceRangeValue}
					style={{ touchAction: "none" }}
					className="cbct-mpr-range-slider"
					onChange={(e) => setMprSliceIndex(clampMprSliceIndex(Number(e.target.value), mprSliceMaxIndex))}
				/>
			</label>
			<fieldset className="mpr-manual-grid" data-testid="ct-mpr-manual-inputs" aria-label="Точные числовые настройки КТ-срезов">
				<label>
					Угол, °
					<input disabled={!mprControlsReady} inputMode="numeric" max={mprAxisBounds.max} min={mprAxisBounds.min} step="1" type="number" value={mprAxisDeg} onChange={(e) => setMprAxisDeg(clampMprAxisDeg(Number(e.target.value)))} />
				</label>
				<label>
					Слой, мм
					<input disabled={!mprControlsReady} inputMode="numeric" max={mprSlabBounds.max} min={mprSlabBounds.min} step="1" type="number" value={mprSlabMm} onChange={(e) => setMprSlabMm(clampMprSlabMm(Number(e.target.value)))} />
				</label>
				<label>
					Срез
					<input disabled={!mprControlsReady || mprSliceMaxIndex <= 0} inputMode="numeric" max={mprSliceMaxIndex + 1} min="1" step="1" type="number" value={mprSafeSliceIndex + 1} onChange={(e) => setMprSliceIndex(clampMprSliceIndex(Number(e.target.value) - 1, mprSliceMaxIndex))} />
				</label>
			</fieldset>
			<fieldset className="mpr-stepper-row" data-testid="ct-mpr-slice-nudge" aria-label="Точная навигация по КТ-срезам">
				{(mprSliceNudgeSteps ?? []).map((delta: any) => (
					<button
						key={delta}
						type="button"
						onClick={() => setMprSliceIndex(clampMprSliceIndex(mprSafeSliceIndex + delta, mprSliceMaxIndex))}
						disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
						aria-label={`Перейти по КТ-срезам на ${formatSignedMprStep(delta, " срез")}`}
					>
						{formatSignedMprStep(delta, " срез")}
					</button>
				))}
			</fieldset>
			<fieldset className="mpr-preset-row" aria-label="Опорные КТ-срезы">
				{(mprSlicePresetFractions ?? []).map((preset: any) => {
					const targetIndex = mprSliceIndexFromFraction(preset.fraction, mprSliceMaxIndex);
					return (
						<button
							className={mprSafeSliceIndex === targetIndex ? "active" : ""}
							key={preset.id}
							type="button"
							onClick={() => setMprSliceIndex(targetIndex)}
							disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
							aria-pressed={mprSafeSliceIndex === targetIndex}
							aria-label={`Перейти на опорный КТ-срез: ${preset.label}`}
						>
							{preset.label}
						</button>
					);
				})}
			</fieldset>
		</>
	);
};

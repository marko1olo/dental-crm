/**
 * MprSlabControlSection.tsx — Управление толщиной слоя КТ-срезов (Мандат 8b <= 120 строк).
 */

import React from "react";
import { RotateCcw } from "lucide-react";
import type { ImagingMprSlidersProps } from "./types";

type Props = Pick<
	ImagingMprSlidersProps,
	| "mprSlabMm"
	| "mprSlabRangeValue"
	| "mprControlsReady"
	| "mprSlabBounds"
	| "setMprSlabMm"
	| "clampMprSlabMm"
	| "mprSlabNudgeMm"
	| "formatSignedMprStep"
	| "mprSlabPresetMm"
	| "mprAxisDeg"
	| "setMprAxisDeg"
>;

export const MprSlabControlSection: React.FC<Props> = ({
	mprSlabMm, mprSlabRangeValue, mprControlsReady, mprSlabBounds,
	setMprSlabMm, clampMprSlabMm, mprSlabNudgeMm, formatSignedMprStep,
	mprSlabPresetMm, mprAxisDeg, setMprAxisDeg,
}) => {
	return (
		<>
			<label>
				Толщина слоя: {mprSlabMm} мм
				<input
					aria-valuetext={mprSlabRangeValue}
					disabled={!mprControlsReady}
					min={mprSlabBounds.min}
					max={mprSlabBounds.max}
					step="1"
					type="range"
					value={mprSlabMm}
					style={{ touchAction: "none" }}
					className="cbct-mpr-range-slider"
					onChange={(e) => setMprSlabMm(clampMprSlabMm(Number(e.target.value)))}
				/>
			</label>
			<fieldset className="mpr-stepper-row" data-testid="ct-mpr-slab-nudge" aria-label="Точная правка толщины слоя КТ-срезов">
				{(mprSlabNudgeMm ?? []).map((delta: any) => (
					<button
						key={delta}
						type="button"
						onClick={() => setMprSlabMm(clampMprSlabMm((mprSlabMm ?? 0) + delta))}
						disabled={!mprControlsReady}
						aria-label={`Изменить толщину слоя КТ-срезов на ${formatSignedMprStep(delta, " мм")}`}
					>
						{formatSignedMprStep(delta, " мм")}
					</button>
				))}
			</fieldset>
			<fieldset className="mpr-preset-row" aria-label="Быстрая толщина слоя КТ-срезов">
				{(Array.isArray(mprSlabPresetMm) ? mprSlabPresetMm : [1, 2, 3, 5, 10, 20]).map((slab: any) => (
					<button
						className={mprSlabMm === slab ? "active" : ""}
						key={slab}
						type="button"
						onClick={() => setMprSlabMm(slab)}
						disabled={!mprControlsReady}
						aria-pressed={mprSlabMm === slab}
						aria-label={`Установить толщину слоя КТ-срезов ${slab} мм`}
					>
						{slab} мм
					</button>
				))}
				<button
					type="button"
					onClick={() => setMprAxisDeg(0)}
					disabled={!mprControlsReady}
					aria-pressed={mprAxisDeg === 0}
					aria-label="Вернуть ось КТ-срезов к 0°"
				>
					<RotateCcw aria-hidden="true" /> ось 0°
				</button>
			</fieldset>
		</>
	);
};

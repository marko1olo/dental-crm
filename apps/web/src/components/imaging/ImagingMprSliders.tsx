/**
 * ImagingMprSliders.tsx — Панель управления проекциями, осями и срезами КТ/КЛКТ
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import type { ImagingMprSlidersProps } from "./mprSliders/types";
import { MprAxisControlSection } from "./mprSliders/MprAxisControlSection";
import { MprSlabControlSection } from "./mprSliders/MprSlabControlSection";
import { MprSliceControlSection } from "./mprSliders/MprSliceControlSection";
import { MprPresetOptionsSection } from "./mprSliders/MprPresetOptionsSection";

export type { ImagingMprSlidersProps };

export function ImagingMprSliders(props: ImagingMprSlidersProps) {
	return (
		<div className="mpr-control-panel">
			<MprAxisControlSection {...props} />
			<MprSlabControlSection {...props} />
			<MprSliceControlSection {...props} />
			<MprPresetOptionsSection {...props} />
		</div>
	);
}

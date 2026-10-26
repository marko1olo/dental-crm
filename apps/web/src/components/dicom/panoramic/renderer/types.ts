/**
 * types.ts — Типы для хука панорамного рендерера (Мандат 8b <= 120 строк).
 */

import type { Point2D } from "../../../../utils/math/mprMath";
import type { PanoramicVolumeInput } from "../panoramicTypes";

export interface UsePanoramicRendererProps {
	splinePoints: Point2D[];
	volume: PanoramicVolumeInput | null;
	thickness?: number | undefined;
	blendMode?: "mip" | "average" | undefined;
	zStartWorld?: number | undefined;
	zEndWorld?: number | undefined;
	zStepWorld?: number | undefined;
	patientId?: string | null | undefined;
	authHeaders?: Record<string, string> | undefined;
}

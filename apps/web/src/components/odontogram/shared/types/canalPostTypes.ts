import type { Point2D } from "./sharedGeometryTypes";

export type PostMaterialType = "fiber" | "metal_cast" | "gold_cast";

export interface CanalTrajectory {
	readonly id: string;
	readonly canalPath: string;
	readonly apexPoint?: Point2D | undefined;
	readonly orificePoint?: Point2D | undefined;
}

export interface CanalPostProps {
	readonly postShaftPath: string;
	readonly coreStumpPath?: string | undefined;
	readonly material?: PostMaterialType | undefined;
	readonly trajectories?: readonly CanalTrajectory[] | undefined;
	readonly isDark?: boolean | undefined;
	readonly className?: string | undefined;
}

/**
 * scratch.ts — Reusable буферы для 60 FPS скроллинга без аллокаций (Мандат 8b <= 120 строк).
 */

import type { Vec3, Segment3D } from "./types";

export class SliceIntersectionScratch {
	public readonly rayPoint: Vec3 = [0, 0, 0];
	public readonly rayDir: Vec3 = [0, 0, 0];
	public readonly seg3D: Segment3D = {
		p1: [0, 0, 0],
		p2: [0, 0, 0],
	};
}

export const GLOBAL_SCRATCH = new SliceIntersectionScratch();

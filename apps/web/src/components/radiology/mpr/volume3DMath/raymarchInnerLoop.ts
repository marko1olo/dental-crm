import type { Volume3DClippingBox } from "./types";

export interface RaymarchLoopParams {
	width: number;
	height: number;
	centerX: number;
	centerY: number;
	invScale: number;
	col0: [number, number, number];
	col1: [number, number, number];
	col2: [number, number, number];
	dimW: number;
	dimH: number;
	dimD: number;
	halfW: number;
	halfH: number;
	halfD: number;
	sliceSize: number;
	data: Int16Array | Int32Array | Float32Array;
	clipping: Volume3DClippingBox;
	huMin: number;
	huMax: number;
	baseR: number;
	baseG: number;
	baseB: number;
	subSample: number;
	STEPS: number;
	tNear: number;
	stepDx: number;
	stepDy: number;
	stepDz: number;
	isAirway: boolean;
	isMip: boolean;
	u32: Uint32Array;
}

export function executeRaymarchLoop(p: RaymarchLoopParams): void {
	for (let py = 0; py < p.height; py += p.subSample) {
		const viewY = -(py - p.centerY) * p.invScale;
		const p0y_x = p.col1[0] * viewY + p.halfW;
		const p0y_y = p.col1[1] * viewY + p.halfH;
		const p0y_z = p.col1[2] * viewY + p.halfD;

		for (let px = 0; px < p.width; px += p.subSample) {
			const viewX = (px - p.centerX) * p.invScale;
			let rx = p.col0[0] * viewX + p0y_x + p.col2[0] * p.tNear;
			let ry = p.col0[1] * viewX + p0y_y + p.col2[1] * p.tNear;
			let rz = p.col0[2] * viewX + p0y_z + p.col2[2] * p.tNear;

			let hitFound = false;
			let hitHU = -1000;
			let hitStep = 0;
			let maxValHU = -1000;

			for (let s = 0; s < p.STEPS; s++) {
				const vx = rx | 0;
				const vy = ry | 0;
				const vz = rz | 0;

				if (vx >= 0 && vx < p.dimW && vy >= 0 && vy < p.dimH && vz >= 0 && vz < p.dimD) {
					const normX = rx / p.dimW;
					const normY = ry / p.dimH;
					const normZ = rz / p.dimD;
					if (
						normX >= p.clipping.clipMin[0] && normX <= p.clipping.clipMax[0] &&
						normY >= p.clipping.clipMin[1] && normY <= p.clipping.clipMax[1] &&
						normZ >= p.clipping.clipMin[2] && normZ <= p.clipping.clipMax[2]
					) {
						const hu = p.data[vz * p.sliceSize + vy * p.dimW + vx] ?? -1000;
						if (p.isMip) {
							if (hu > maxValHU) maxValHU = hu;
						} else {
							const isHit = p.isAirway ? (hu >= p.huMin && hu <= p.huMax) : (hu >= p.huMin);
							if (isHit) {
								hitFound = true;
								hitHU = hu;
								hitStep = s;
								break;
							}
						}
					}
				}
				rx += p.stepDx;
				ry += p.stepDy;
				rz += p.stepDz;
			}

			if (p.isMip && maxValHU >= p.huMin) {
				hitFound = true;
				hitHU = maxValHU;
				hitStep = 12;
			}

			if (hitFound) {
				const depthFade = 1.0 - (hitStep / p.STEPS) * 0.35;
				const norm = Math.min(1.0, Math.max(0.0, (hitHU - p.huMin) / (p.huMax - p.huMin || 1)));
				const shade = p.isAirway ? 0.85 : Math.min(1.0, (0.35 + 0.65 * norm) * depthFade);
				const r = Math.min(255, (p.baseR * shade) | 0);
				const g = Math.min(255, (p.baseG * shade) | 0);
				const b = Math.min(255, (p.baseB * shade) | 0);
				const colorU32 = (255 << 24) | (b << 16) | (g << 8) | r;

				if (p.subSample === 1) {
					p.u32[py * p.width + px] = colorU32;
				} else {
					for (let sy = 0; sy < p.subSample && py + sy < p.height; sy++) {
						const rowOffset = (py + sy) * p.width;
						for (let sx = 0; sx < p.subSample && px + sx < p.width; sx++) {
							p.u32[rowOffset + px + sx] = colorU32;
						}
					}
				}
			}
		}
	}
}

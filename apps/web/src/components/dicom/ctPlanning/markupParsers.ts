/**
 * markupParsers.ts — Парсер сохраненных имплантатов и полной разметки КЛКТ (Мандат 8b <= 120 строк).
 */

import { validateImplantNerveSafety } from "@dental/shared";
import {
	type WorldPoint3,
	type StoredImplant,
	type CtPlanningMarkup,
	emptyCtPlanningMarkup,
} from "./types";
import { worldTriple, worldPointOf, finiteNumber } from "./geometryParsers";

export function parseJsonArray(value: unknown): unknown[] {
	if (Array.isArray(value)) return value;
	if (typeof value !== "string") return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function storedImplantOf(value: unknown): StoredImplant | null {
	if (!value || typeof value !== "object") return null;
	const raw = value as Record<string, unknown>;
	const startWorld = worldTriple(raw.startWorld);
	const endWorld = worldTriple(raw.endWorld);
	if (!startWorld || !endWorld) return null;
	const density = (raw.boneDensity ?? {}) as Record<string, unknown>;
	return {
		id: typeof raw.id === "string" && raw.id ? raw.id : `restored-${startWorld.join("-")}`,
		fdiCode: typeof raw.fdiCode === "string" ? raw.fdiCode : "",
		diameter: finiteNumber(raw.diameter) ?? 0,
		length: finiteNumber(raw.length) ?? 0,
		startWorld,
		endWorld,
		boneDensity: {
			averageHU: finiteNumber(density.averageHU) ?? 0,
			classification: typeof density.classification === "string" ? density.classification : "",
		},
		distanceToNerve: finiteNumber(raw.distanceToNerve) ?? null,
		...(typeof raw.systemId === "string" ? { systemId: raw.systemId } : {}),
		...(typeof raw.brandName === "string" ? { brandName: raw.brandName } : {}),
		...(typeof raw.lineName === "string" ? { lineName: raw.lineName } : {}),
		...(typeof raw.platformCode === "string" ? { platformCode: raw.platformCode } : {}),
		...(typeof raw.platformColor === "string" ? { platformColor: raw.platformColor } : {}),
	};
}

export function worldPointsOf(value: unknown): WorldPoint3[] {
	const out: WorldPoint3[] = [];
	for (const candidate of parseJsonArray(value)) {
		if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
			const raw = candidate as Record<string, unknown>;
			const x = finiteNumber(raw.x);
			const y = finiteNumber(raw.y);
			const z = finiteNumber(raw.z);
			if (x !== null && y !== null && z !== null) {
				out.push({ x, y, z });
				continue;
			}
		}
		const p = worldPointOf(candidate);
		if (p) out.push(p);
	}
	return out;
}

export function parseCtPlanningMarkup(planning: unknown): CtPlanningMarkup {
	if (!planning || typeof planning !== "object") return emptyCtPlanningMarkup();
	const row = planning as Record<string, unknown>;
	const nervePoints = worldPointsOf(row.nervePointsJson);
	const implants: StoredImplant[] = [];
	for (const candidate of parseJsonArray(row.implantsJson)) {
		const implant = storedImplantOf(candidate);
		if (implant) {
			if (nervePoints.length > 0 && implant.distanceToNerve === null) {
				const safety = validateImplantNerveSafety(implant, nervePoints);
				if (safety) implant.distanceToNerve = safety.distanceToNerveMm;
			}
			implants.push(implant);
		}
	}
	return { splinePoints: worldPointsOf(row.splinePointsJson), nervePoints, implants };
}

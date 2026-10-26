/**
 * catalogQueries.ts — Хелперы поиска и валидации спецификаций имплантатов (Мандат 8b <= 120 строк).
 */

import type { ImplantPlatformInfo, ImplantSystemSpec } from "./types";
import { OSSTEM_SYSTEM } from "./osstem";
import { CANONICAL_IMPLANT_SYSTEMS } from "./systemsList";

export function normalizeSystemId(rawId: string | undefined | null): string {
	if (!rawId) return "osstem-ts3";
	const lower = rawId.toLowerCase().trim();
	if (lower.includes("osstem")) return "osstem-ts3";
	if (lower.includes("straumann")) return "straumann-blx";
	if (lower.includes("nobel")) return "nobel-active";
	if (lower.includes("dentium")) return "dentium-superline";
	if (lower.includes("mis")) return "mis-implants";
	if (lower.includes("astra")) return "astra-tech-ev";
	return "generic";
}

export function getImplantSystem(id: string | undefined | null): ImplantSystemSpec {
	const normalized = normalizeSystemId(id);
	return CANONICAL_IMPLANT_SYSTEMS.find((s) => s.id === normalized) ?? OSSTEM_SYSTEM;
}

export function getAllImplantSystems(): ImplantSystemSpec[] {
	return CANONICAL_IMPLANT_SYSTEMS;
}

export function getAvailableDiameters(systemId: string | undefined | null): number[] {
	return getImplantSystem(systemId).diameters;
}

export function getAvailableLengths(systemId: string | undefined | null, diameterMm?: number): number[] {
	const sys = getImplantSystem(systemId);
	if (diameterMm !== undefined) {
		const size = sys.sizes.find((s) => Math.abs(s.diameterMm - diameterMm) < 0.1);
		if (size) return size.lengthsMm;
	}
	return sys.lengths;
}

export function getPlatformForDiameter(systemId: string | undefined | null, diameterMm: number): ImplantPlatformInfo {
	const sys = getImplantSystem(systemId);
	let closestSize = sys.sizes[0]!;
	let minDiff = Infinity;
	for (const size of sys.sizes) {
		const diff = Math.abs(size.diameterMm - diameterMm);
		if (diff < minDiff) {
			minDiff = diff;
			closestSize = size;
		}
	}
	return closestSize.platform;
}

export function validateImplantDimensions(systemId: string | undefined | null, diameterMm: number, lengthMm: number) {
	const sys = getImplantSystem(systemId);
	let normDiameter = sys.diameters[0]!;
	let minDDiff = Infinity;
	for (const d of sys.diameters) {
		const diff = Math.abs(d - diameterMm);
		if (diff < minDDiff) {
			minDDiff = diff;
			normDiameter = d;
		}
	}
	const availLengths = getAvailableLengths(sys.id, normDiameter);
	let normLength = availLengths[0]!;
	let minLDiff = Infinity;
	for (const l of availLengths) {
		const diff = Math.abs(l - lengthMm);
		if (diff < minLDiff) {
			minLDiff = diff;
			normLength = l;
		}
	}
	const exactMatch = minDDiff < 0.05 && minLDiff < 0.05;
	const platform = getPlatformForDiameter(sys.id, normDiameter);
	return { valid: exactMatch, normalizedDiameter: normDiameter, normalizedLength: normLength, platform };
}

export function formatImplantSpecRu(systemId: string | undefined | null, diameterMm: number, lengthMm: number): string {
	const sys = getImplantSystem(systemId);
	const platform = getPlatformForDiameter(sys.id, diameterMm);
	return `${sys.brand} ${sys.line} • Ø${diameterMm.toFixed(1)} × ${lengthMm.toFixed(1)} мм (${platform.code})`;
}

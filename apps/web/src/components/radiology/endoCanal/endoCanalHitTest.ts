/**
 * DENTE CRM — Endodontic Root Canal CAD Hit-Testing
 * Standards: 44x44px medical touch targets (DEF-R2-06), Mandate 8b (<= 120 lines).
 */

export function hitTestEndoCanalHandle(
	pointerPx: { readonly x: number; readonly y: number },
	canals: readonly {
		readonly id: string;
		readonly plane: string;
		readonly orificePx: { readonly x: number; readonly y: number };
		readonly apexPx: { readonly x: number; readonly y: number };
		readonly inflectionPx?: { readonly x: number; readonly y: number } | undefined;
	}[],
	hitRadiusPx = 12,
): { id: string; handleType: "orifice" | "apex" | "inflection"; distancePx: number } | null {
	let closestHit: { id: string; handleType: "orifice" | "apex" | "inflection"; distancePx: number } | null = null;
	let minDistance = hitRadiusPx;

	for (const c of canals) {
		const dOrifice = Math.hypot(pointerPx.x - c.orificePx.x, pointerPx.y - c.orificePx.y);
		if (dOrifice <= minDistance) {
			minDistance = dOrifice;
			closestHit = { id: c.id, handleType: "orifice", distancePx: Number(dOrifice.toFixed(1)) };
		}
		const dApex = Math.hypot(pointerPx.x - c.apexPx.x, pointerPx.y - c.apexPx.y);
		if (dApex <= minDistance) {
			minDistance = dApex;
			closestHit = { id: c.id, handleType: "apex", distancePx: Number(dApex.toFixed(1)) };
		}
		if (c.inflectionPx) {
			const dInflection = Math.hypot(pointerPx.x - c.inflectionPx.x, pointerPx.y - c.inflectionPx.y);
			if (dInflection <= minDistance) {
				minDistance = dInflection;
				closestHit = { id: c.id, handleType: "inflection", distancePx: Number(dInflection.toFixed(1)) };
			}
		}
	}
	return closestHit;
}

export function hitTestEndoCanalObject(
	pointerPx: { readonly x: number; readonly y: number },
	canals: readonly {
		readonly id: string;
		readonly plane: string;
		readonly orificePx: { readonly x: number; readonly y: number };
		readonly apexPx: { readonly x: number; readonly y: number };
		readonly inflectionPx?: { readonly x: number; readonly y: number } | undefined;
		readonly badgePx?: { readonly x: number; readonly y: number; readonly width?: number; readonly height?: number } | undefined;
	}[],
	lineHitTolerancePx = 10,
): { id: string; isDeleteButtonHit: boolean; distancePx: number } | null {
	const distPointToSeg = (pt: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
		const dx = p2.x - p1.x, dy = p2.y - p1.y;
		const l2 = dx * dx + dy * dy;
		if (l2 === 0) return Math.hypot(pt.x - p1.x, pt.y - p1.y);
		let t = Math.max(0, Math.min(1, ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / l2));
		return Math.hypot(pt.x - (p1.x + t * dx), pt.y - (p1.y + t * dy));
	};

	let closestHit: { id: string; isDeleteButtonHit: boolean; distancePx: number } | null = null;
	let minDistance = lineHitTolerancePx;

	for (const c of canals) {
		const badgeX = c.badgePx?.x ?? (c.inflectionPx ? c.inflectionPx.x : (c.orificePx.x + c.apexPx.x) / 2);
		const badgeY = c.badgePx?.y ?? (c.inflectionPx ? c.inflectionPx.y - 20 : (c.orificePx.y + c.apexPx.y) / 2 - 20);
		const badgeW = c.badgePx?.width ?? 90;
		const badgeH = c.badgePx?.height ?? 22;

		const deleteTargetX = badgeX + badgeW / 2 - 14;
		const isDeleteHitbox = Math.abs(pointerPx.x - deleteTargetX) <= 22 && Math.abs(pointerPx.y - badgeY) <= 22;
		const isInsideBadge = Math.abs(pointerPx.x - badgeX) <= badgeW / 2 + 8 && Math.abs(pointerPx.y - badgeY) <= badgeH / 2 + 8;

		if (isDeleteHitbox || isInsideBadge) {
			return {
				id: c.id,
				isDeleteButtonHit: isDeleteHitbox || pointerPx.x >= badgeX + badgeW / 2 - 28,
				distancePx: 0,
			};
		}

		const d = c.inflectionPx
			? Math.min(distPointToSeg(pointerPx, c.orificePx, c.inflectionPx), distPointToSeg(pointerPx, c.inflectionPx, c.apexPx))
			: distPointToSeg(pointerPx, c.orificePx, c.apexPx);

		if (d <= minDistance) {
			minDistance = d;
			closestHit = { id: c.id, isDeleteButtonHit: false, distancePx: Number(d.toFixed(1)) };
		}
	}
	return closestHit;
}

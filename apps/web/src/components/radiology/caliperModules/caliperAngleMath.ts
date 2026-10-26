/**
 * caliperAngleMath.ts — Расчет углов, форматирование бейджей и позиционирование (Мандат 8b).
 */

import type { Point2D, Point3D } from "./caliperTypes";

export function calculateAngleBetween3Points2D(p1: Point2D, vertex: Point2D, p2: Point2D): number {
	const v1x = p1.x - vertex.x;
	const v1y = p1.y - vertex.y;
	const v2x = p2.x - vertex.x;
	const v2y = p2.y - vertex.y;

	const len1 = Math.hypot(v1x, v1y);
	const len2 = Math.hypot(v2x, v2y);
	if (len1 === 0 || len2 === 0) return 0;

	const dot = v1x * v2x + v1y * v2y;
	const cosTheta = Math.max(-1.0, Math.min(1.0, dot / (len1 * len2)));
	return Number(((Math.acos(cosTheta) * 180) / Math.PI).toFixed(1));
}

export function calculateAngleBetween3Points3D(p1: Point3D, vertex: Point3D, p2: Point3D): number {
	const v1x = p1.x - vertex.x;
	const v1y = p1.y - vertex.y;
	const v1z = p1.z - vertex.z;
	const v2x = p2.x - vertex.x;
	const v2y = p2.y - vertex.y;
	const v2z = p2.z - vertex.z;

	const len1 = Math.hypot(v1x, v1y, v1z);
	const len2 = Math.hypot(v2x, v2y, v2z);
	if (len1 === 0 || len2 === 0) return 0;

	const dot = v1x * v2x + v1y * v2y + v1z * v2z;
	const cosTheta = Math.max(-1.0, Math.min(1.0, dot / (len1 * len2)));
	return Number(((Math.acos(cosTheta) * 180) / Math.PI).toFixed(1));
}

export function formatRulerBadgeText(distanceMm: number): string {
	return `${distanceMm.toFixed(1)} мм`;
}

export function formatAngleBadgeText(angleDeg: number): string {
	return `${angleDeg.toFixed(1)}°`;
}

export function formatProbeBadgeText(hu: number, tissueName?: string): string {
	return tissueName ? `${hu} HU · ${tissueName}` : `${hu} HU`;
}

export function calculateAngleBadgePosition(
	p1Screen: { readonly x: number; readonly y: number },
	vertexScreen: { readonly x: number; readonly y: number },
	p2Screen: { readonly x: number; readonly y: number },
): { x: number; y: number } {
	const dx1 = p1Screen.x - vertexScreen.x;
	const dy1 = p1Screen.y - vertexScreen.y;
	const dx2 = p2Screen.x - vertexScreen.x;
	const dy2 = p2Screen.y - vertexScreen.y;
	const len1 = Math.hypot(dx1, dy1);
	const len2 = Math.hypot(dx2, dy2);

	if (len1 >= 5 && len2 >= 5) {
		const angle1 = Math.atan2(dy1, dx1);
		const angle2 = Math.atan2(dy2, dx2);
		let diff = angle2 - angle1;
		while (diff > Math.PI) diff -= Math.PI * 2;
		while (diff < -Math.PI) diff += Math.PI * 2;
		const bisectorAngle = angle1 + diff / 2;
		const badgeDist = Math.min(48, Math.max(26, Math.min(len1, len2) * 0.4 + 14));
		return {
			x: Number((vertexScreen.x + Math.cos(bisectorAngle) * badgeDist).toFixed(1)),
			y: Number((vertexScreen.y + Math.sin(bisectorAngle) * badgeDist).toFixed(1)),
		};
	}
	if (len1 >= 5) {
		return {
			x: Number(((vertexScreen.x + p1Screen.x) / 2).toFixed(1)),
			y: Number(((vertexScreen.y + p1Screen.y) / 2 - 14).toFixed(1)),
		};
	}
	return { x: vertexScreen.x, y: vertexScreen.y - 18 };
}

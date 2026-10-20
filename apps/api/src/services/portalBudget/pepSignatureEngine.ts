import { createHash } from "node:crypto";
import type { PortalBudgetSignature } from "./types.js";

export function computeDocumentHash(payload: {
	readonly token: string;
	readonly planId?: string | undefined;
	readonly totalPriceRub: number;
	readonly items: readonly {
		readonly id: string;
		readonly toothNumber?: number | null | undefined;
		readonly totalRub: number;
	}[];
	readonly signedByName: string;
	readonly signedAt: string;
	readonly ipHash: string;
}): string {
	const docData = JSON.stringify({
		token: payload.token,
		planId: payload.planId,
		totalPriceRub: payload.totalPriceRub,
		items: payload.items.map((i) => ({ id: i.id, tooth: i.toothNumber, total: i.totalRub })),
		signedByName: payload.signedByName,
		signedAt: payload.signedAt,
		ipHash: payload.ipHash,
	});
	return createHash("sha256").update(docData).digest("hex");
}

function escapeSvgText(raw: string): string {
	return raw
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function generateFallbackTextSignatureDataUrl(
	signerName: string,
	signedAtIso?: string,
): string {
	const cleanName = escapeSvgText((signerName || "Пациент").trim() || "Пациент");
	const dateLabel = signedAtIso
		? escapeSvgText(signedAtIso.slice(0, 10))
		: new Date().toISOString().slice(0, 10);
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="32" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d">ЭЛЕКТРОННАЯ ПОДПИСЬ ПАЦИЕНТА</text><text x="160" y="54" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#166534">${cleanName} • ${dateLabel}</text></svg>`;
	return `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;
}

export function createSignatureRecord(params: {
	readonly signaturePng: string;
	readonly signatureSvg?: string | undefined;
	readonly signedByName: string;
	readonly relationshipToPatient?: string | undefined;
	readonly clientIp: string;
	readonly ipHash: string;
	readonly userAgent?: string | undefined;
	readonly signedAtIso: string;
	readonly documentHash: string;
}): PortalBudgetSignature {
	const effectiveSignatureDataUrl =
		params.signaturePng && params.signaturePng.trim().startsWith("data:image/")
			? params.signaturePng.trim()
			: generateFallbackTextSignatureDataUrl(params.signedByName, params.signedAtIso);

	return {
		signaturePng: effectiveSignatureDataUrl,
		signatureSvg: params.signatureSvg,
		signedByName: params.signedByName,
		relationshipToPatient: params.relationshipToPatient || "patient",
		ipAddress: params.clientIp,
		ipHash: params.ipHash,
		userAgent: params.userAgent,
		signedAtIso: params.signedAtIso,
		documentHash: params.documentHash,
	};
}

export function validateSignaturePng(signaturePng?: string | null): {
	readonly valid: boolean;
	readonly error?: string;
	readonly message?: string;
} {
	const trimmed = typeof signaturePng === "string" ? signaturePng.trim() : "";
	if (!trimmed || !trimmed.startsWith("data:image/")) {
		return {
			valid: false,
			error: "InvalidSignature",
			message: "Отсутствует графическая или электронная подпись пациента.",
		};
	}
	return { valid: true };
}

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
	return {
		signaturePng: params.signaturePng,
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
	if (!signaturePng || !signaturePng.startsWith("data:image/")) {
		return {
			valid: false,
			error: "InvalidSignature",
			message: "Отсутствует графическая цифровая подпись пациента (Canvas Base64 PNG).",
		};
	}
	return { valid: true };
}

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { requireAuthTokenSecret } from "../../accessGuard.js";
import type { PortalAuthMethod } from "./types.js";

export function getSecretKey(): string {
	return process.env.BUDGET_PUBLIC_SECRET_KEY || requireAuthTokenSecret();
}

export function hashIp(ipAddress?: string): string {
	return createHash("sha256").update(ipAddress || "127.0.0.1").digest("hex");
}

export function normalizeIsoDate(rawDate?: string | null): string | null {
	if (!rawDate) return null;
	const trimmed = rawDate.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		return trimmed;
	}
	const dotMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
	if (dotMatch && dotMatch[1] && dotMatch[2] && dotMatch[3]) {
		return `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`;
	}
	return null;
}

export function resolveAuthMethod(patient: {
	readonly phone?: string | null | undefined;
	readonly birthDate?: string | null | undefined;
}): PortalAuthMethod {
	const digits = (patient.phone || "").replace(/\D/g, "");
	if (digits.length >= 4) {
		return "phone_last4";
	}
	if (patient.birthDate && patient.birthDate.trim().length > 0) {
		return "dob";
	}
	return "none";
}

export function createSessionToken(patientId: string, token: string): string {
	const expiresAt = Date.now() + 30 * 60 * 1000;
	const payload = `${patientId}:${token}:${expiresAt}`;
	const signature = createHmac("sha256", getSecretKey()).update(payload).digest("hex");
	return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function validateSessionToken(sessionToken: string, expectedPatientId: string, expectedToken: string): boolean {
	try {
		const decoded = Buffer.from(sessionToken, "base64url").toString("utf-8");
		const parts = decoded.split(":");
		if (parts.length !== 4) return false;
		const [patientId, token, expiresAtStr, signature] = parts;
		if (!patientId || !token || !expiresAtStr || !signature) return false;

		if (patientId !== expectedPatientId || token !== expectedToken) {
			return false;
		}

		const expiresAt = Number.parseInt(expiresAtStr, 10);
		if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
			return false;
		}

		const payload = `${patientId}:${token}:${expiresAtStr}`;
		const expectedSig = createHmac("sha256", getSecretKey()).update(payload).digest("hex");
		if (Buffer.byteLength(signature) !== Buffer.byteLength(expectedSig)) {
			return false;
		}
		return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
	} catch {
		return false;
	}
}

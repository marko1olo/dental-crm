import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { requireAuthTokenSecret } from "../../accessGuard.js";

export const MAX_VERIFY_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 минут

export function getSecretKey(): string {
	return process.env.BUDGET_PUBLIC_SECRET_KEY || requireAuthTokenSecret();
}

export function hashIp(ipAddress?: string): string {
	return createHash("sha256").update(ipAddress || "127.0.0.1").digest("hex");
}

export function maskPhone(phone?: string | null): string {
	if (!phone) return "+* *** *** **-**";
	const digits = phone.replace(/\D/g, "");
	if (digits.length < 4) return "+* *** *** **-**";
	const last4 = digits.slice(-4);
	return `+7 *** *** ${last4.slice(0, 2)}-${last4.slice(2, 4)}`;
}

export function createSessionToken(patientId: string, token: string): string {
	const expires = Date.now() + 30 * 60 * 1000; // 30 минут
	const payload = `${patientId}:${token}:${expires}`;
	const signature = createHmac("sha256", getSecretKey()).update(payload).digest("hex");
	return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export function validateSessionToken(sessionToken: string, patientId: string, token: string): boolean {
	try {
		const [b64Payload, signature] = sessionToken.split(".");
		if (!b64Payload || !signature) return false;
		const payload = Buffer.from(b64Payload, "base64url").toString("utf-8");
		const expectedSig = createHmac("sha256", getSecretKey()).update(payload).digest("hex");
		if (
			signature.length !== expectedSig.length ||
			!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
		) {
			return false;
		}
		const [tokenPatientId, tokenBdgToken, expStr] = payload.split(":");
		if (tokenPatientId !== patientId || tokenBdgToken !== token || !expStr) return false;
		const exp = Number.parseInt(expStr, 10);
		return !Number.isNaN(exp) && exp > Date.now();
	} catch {
		return false;
	}
}

import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from "./types.js";
import { publicBookingQueueService } from "../../services/publicBookingQueueService.js";

const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const entry = ipRequestCounts.get(ip);
	if (!entry || now > entry.resetAt) {
		ipRequestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}
	entry.count++;
	return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

export function resetRateLimitsForTesting(): void {
	ipRequestCounts.clear();
}

export function requestPhoneVerification(
	phone: string,
	method: "sms" | "flash_call",
	clientIp: string,
	organizationId?: string,
) {
	return publicBookingQueueService.requestPhoneVerification(
		phone,
		method,
		clientIp,
		organizationId,
	);
}

export function verifyPhoneOtp(phone: string, code: string) {
	return publicBookingQueueService.verifyPhoneOtp(phone, code);
}

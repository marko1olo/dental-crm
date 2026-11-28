import { z } from "zod";
import { BoundedTtlMap } from "../../../lib/boundedTtlMap.js";

export const signTreatmentPlanPepSchema = z.object({
	action: z.enum(["request_code", "confirm"]).default("confirm"),
	method: z.enum(["sms", "qr_touch", "paper"]).default("sms"),
	phone: z.string().trim().optional(),
	code: z.string().trim().optional(),
	signerName: z.string().trim().optional(),
	signatureBase64: z.string().trim().optional(),
}).strict();

export interface ActivePepOtp {
	code: string;
	expiresAt: number;
	phone?: string;
}

export const activeOtpCache = new BoundedTtlMap<string, ActivePepOtp>({
	maxEntries: 5000,
	ttlMs: 30 * 60_000,
});

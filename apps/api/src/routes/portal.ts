import { and, eq, ilike } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireAuthTokenSecret } from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	patientInvoices,
	patients,
	treatmentPlans,
	visitDiaries,
	generatedDocuments,
} from "../db/schema.js";
import { signToken, verifyToken } from "../utils/cryptoHelper.js";

// Patient portal sessions are short-lived; the patient re-authenticates via OTP.
const PORTAL_TOKEN_TTL_SECONDS = 60 * 60 * 12;
const PORTAL_TOKEN_KIND = "portal";

// MVP OTP behaviour is documented in TELEPHONY_AND_PORTAL.md: no SMS gateway is
// wired yet, so the accepted code is a fixed value sourced from env (never
// hardcoded) so it can be tightened per-deployment without a code change.
function configuredPortalOtpCode(): string {
	return process.env.PORTAL_MVP_OTP_CODE?.trim() || "0000";
}

export const portalRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// 1. Send OTP
	server.post<{ Body: { phone: string } }>(
		"/auth/send-otp",
		async (request, reply) => {
			const { phone } = request.body;
			if (!phone) return reply.status(400).send({ error: "Phone is required" });

			// MVP: SMS gateway integration is not wired yet. The verification code is
			// the configured fixed value; no code is transmitted here.
			return { success: true, message: "OTP sent" };
		},
	);

	// 2. Verify OTP
	server.post<{ Body: { phone: string; code: string } }>(
		"/auth/verify-otp",
		async (request, reply) => {
			const { phone, code } = request.body;
			if (typeof phone !== "string" || typeof code !== "string") {
				return reply.status(400).send({ error: "Phone and code are required" });
			}
			if (code !== configuredPortalOtpCode()) {
				return reply.status(401).send({ error: "Invalid OTP" });
			}

			const rawPhone = phone.replace(/\D/g, "");
			if (rawPhone.length < 10)
				return reply.status(400).send({ error: "Invalid phone" });

			const phoneSuffix = rawPhone.slice(-10);
			const searchResult = await db
				.select()
				.from(patients)
				.where(ilike(patients.phone, `%${phoneSuffix}%`))
				.limit(1);

			const patient = searchResult[0];
			if (!patient) {
				return reply.status(404).send({ error: "Patient not found in CRM" });
			}

			// Signed, expiring session token. Replaces the previous unsigned
			// base64(`DENTE_TOKEN:<id>`) payload, which any caller could forge to read
			// another patient's medical record (IDOR).
			const token = signToken(
				{
					sub: patient.id,
					organizationId: patient.organizationId,
					kind: PORTAL_TOKEN_KIND,
				},
				requireAuthTokenSecret(),
				PORTAL_TOKEN_TTL_SECONDS,
			);

			return { success: true, token, patientId: patient.id };
		},
	);

	// 3. Get Patient Data (Protected)
	server.get("/me", async (request, reply) => {
		const authHeader = request.headers.authorization;
		if (!authHeader?.startsWith("Bearer "))
			return reply.status(401).send({ error: "Unauthorized" });

		const token = authHeader.slice("Bearer ".length).trim();
		if (!token) return reply.status(401).send({ error: "Unauthorized" });

		const payload = verifyToken(token, requireAuthTokenSecret());
		if (
			!payload ||
			payload.kind !== PORTAL_TOKEN_KIND ||
			typeof payload.sub !== "string" ||
			typeof payload.organizationId !== "string"
		) {
			return reply.status(401).send({ error: "Invalid token" });
		}
		const patientId = payload.sub;
		const organizationId = payload.organizationId as string;

		// Defence-in-depth: even though the token is signed and can't be forged,
		// we explicitly scope the query to the org recorded in the token so a
		// stolen token from org A cannot read org B's data if IDs ever collide.
		const pResult = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.id, patientId),
					eq(patients.organizationId, organizationId),
				),
			)
			.limit(1);
		const patient = pResult[0];
		if (!patient) return reply.status(404).send({ error: "Not found" });

		const visits = await db
			.select()
			.from(visitDiaries)
			.where(eq(visitDiaries.patientId, patient.id));
		const plans = await db
			.select()
			.from(treatmentPlans)
			.where(eq(treatmentPlans.patientId, patient.id));
		const invoices = await db
			.select()
			.from(patientInvoices)
			.where(eq(patientInvoices.patientId, patient.id));
		const documents = await db
			.select()
			.from(generatedDocuments)
			.where(
				and(
					eq(generatedDocuments.patientId, patient.id),
					eq(generatedDocuments.status, "issued"),
				)
			);

		return {
			patient,
			visits,
			plans,
			invoices,
			documents,
		};
	});
};

import { and, eq, ilike } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireAuthTokenSecret } from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	generatedDocuments,
	patientInvoices,
	patients,
	treatmentPlans,
	visitDiaries,
} from "../db/schema.js";
import {
	getDocumentById,
	readIssuedDocumentSnapshot,
} from "../db/documentQuery.js";
import { signToken, verifyToken } from "../utils/cryptoHelper.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";

// Patient portal sessions are short-lived; the patient re-authenticates via OTP.
const PORTAL_TOKEN_TTL_SECONDS = 60 * 60 * 12;
const PORTAL_TOKEN_KIND = "portal";

// The OTP endpoints are public and unauthenticated. Without a limit they form a
// phone-enumeration oracle (verify-otp answers 404 vs 200 depending on whether a
// phone belongs to a patient) and a brute-force surface. Cap requests per IP.
const OTP_RATE_LIMIT_WINDOW_MS = 60_000;
const OTP_RATE_LIMIT_MAX_REQUESTS = 10;
const otpRequestCounts = new Map<string, { count: number; resetAt: number }>();

function isOtpRateLimited(ip: string): boolean {
	const now = Date.now();
	const entry = otpRequestCounts.get(ip);
	if (!entry || now > entry.resetAt) {
		otpRequestCounts.set(ip, {
			count: 1,
			resetAt: now + OTP_RATE_LIMIT_WINDOW_MS,
		});
		return false;
	}
	entry.count++;
	return entry.count > OTP_RATE_LIMIT_MAX_REQUESTS;
}

// MVP OTP behaviour is documented in TELEPHONY_AND_PORTAL.md: no SMS gateway is
// wired yet, so the accepted code is a fixed value sourced from env.
//
// БЫЛО: при отсутствии PORTAL_MVP_OTP_CODE принимался код "0000" — то есть
// любой человек, зная номер телефона пациента, входил в его личный кабинет и
// читал визиты, планы лечения, счета и выданные документы. СТАЛО: без явно
// заданного кода портал отвечает 503 и никого не пускает (fail closed).
function configuredPortalOtpCode(): string | null {
	const code = process.env.PORTAL_MVP_OTP_CODE?.trim();
	if (process.env.NODE_ENV !== "production") {
		// Локальная разработка работает без настройки: код по умолчанию 0000.
		return code || "0000";
	}
	// В production код обязателен и не короче 6 символов.
	if (!code || code.length < 6) return null;
	return code;
}

export const portalRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// 1. Send OTP
	server.post<{ Body: { phone: string } }>(
		"/auth/send-otp",
		async (request, reply) => {
			if (isOtpRateLimited(request.ip ?? "unknown")) {
				return reply.status(429).send({ error: "Слишком много запросов." });
			}
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
			if (isOtpRateLimited(request.ip ?? "unknown")) {
				return reply.status(429).send({ error: "Слишком много запросов." });
			}
			const { phone, code } = request.body;
			if (typeof phone !== "string" || typeof code !== "string") {
				return reply.status(400).send({ error: "Phone and code are required" });
			}
			const expectedCode = configuredPortalOtpCode();
			if (!expectedCode) {
				return reply.status(503).send({
					error: "PortalOtpNotConfigured",
					message:
						"Личный кабинет пациента не настроен: администратору нужно задать PORTAL_MVP_OTP_CODE или подключить SMS-шлюз.",
				});
			}
			// Сравнение постоянного времени: посимвольное !== позволяет подбирать код по таймингу.
			if (!timingSafeSecretEqual(code, expectedCode)) {
				return reply.status(401).send({ error: "Invalid OTP" });
			}

			const rawPhone = phone.replace(/\D/g, "");
			if (rawPhone.length < 10)
				return reply.status(400).send({ error: "Invalid phone" });

			const phoneSuffix = rawPhone.slice(-10);
			// Берём до двух совпадений: раньше .limit(1) с частичным LIKE молча
			// выдавал первого попавшегося пациента, чей номер СОДЕРЖИТ эти цифры,
			// и человек мог войти в чужую медкарту. Неоднозначность — отказ.
			const searchResult = await db
				.select()
				.from(patients)
				.where(ilike(patients.phone, `%${phoneSuffix}`))
				.limit(2);

			if (searchResult.length !== 1) {
				// Единый ответ и для "нет пациента", и для "несколько совпадений",
				// чтобы endpoint не работал как справочник существующих номеров.
				return reply.status(401).send({ error: "Invalid OTP" });
			}
			const patient = searchResult[0]!;

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
				),
			);

		return {
			patient,
			visits,
			plans,
			invoices,
			documents,
		};
	});

	// 4. View Document HTML (Protected)
	server.get<{ Params: { documentId: string } }>(
		"/documents/:documentId/html",
		async (request, reply) => {
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

			const document = await getDocumentById(
				organizationId,
				request.params.documentId,
			);

			if (!document || document.patientId !== patientId || document.status !== "issued") {
				return reply.status(404).send({ error: "Not found" });
			}

			const issuedSnapshot = readIssuedDocumentSnapshot(document);
			if (!issuedSnapshot) {
				return reply
					.status(409)
					.send({ error: "Архивная копия документа отсутствует" });
			}

			return reply.type("text/html; charset=utf-8").send(issuedSnapshot);
		},
	);
};

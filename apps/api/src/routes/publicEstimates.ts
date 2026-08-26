/**
 * DENTE CRM — Public 2FA Treatment Plan & Financial Estimate Routes.
 * Implements ADR 0006 for zero-SMS online estimate approvals and digital signatures.
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
	publicAuthMethodSchema,
	publicRejectionReasonSchema,
} from "@dental/shared";
import { PublicEstimatesService } from "../services/publicEstimatesService.js";

const verifyBodySchema = z.object({
	method: publicAuthMethodSchema,
	value: z.string().min(1).max(64),
});

const acceptBodySchema = z.object({
	signerName: z.string().min(1).max(200),
	relationship: z.string().max(100).optional(),
	signatureMethod: z.enum(["drawn", "click_accept"]).optional(),
	signaturePng: z.string().optional(),
	signatureSvg: z.string().optional(),
});

const rejectBodySchema = z.object({
	reason: publicRejectionReasonSchema,
	note: z.string().max(2000).optional(),
});

export const registerPublicEstimatesRoutes: FastifyPluginAsync = async (server) => {
	// 1. GET /api/public/estimates/:token/meta
	server.get<{ Params: { token: string } }>(
		"/api/public/estimates/:token/meta",
		async (request, reply) => {
			const token = request.params.token?.trim();
			if (!token) {
				reply.status(400);
				return { error: "TokenRequired", message: "Укажите публичный токен сметы." };
			}

			const meta = PublicEstimatesService.getMeta(token);
			if (!meta) {
				reply.status(404);
				return { error: "EstimateNotFound", message: "Ссылка на смету не найдена или аннулирована." };
			}

			return { data: meta };
		},
	);

	// 2. POST /api/public/estimates/:token/verify
	server.post<{ Params: { token: string } }>(
		"/api/public/estimates/:token/verify",
		async (request, reply) => {
			const token = request.params.token?.trim();
			if (!token) {
				reply.status(400);
				return { error: "TokenRequired", message: "Укажите публичный токен сметы." };
			}

			const parsed = verifyBodySchema.safeParse(request.body);
			if (!parsed.success) {
				reply.status(400);
				return {
					error: "InvalidVerificationData",
					message: "Некорректный формат фактора подтверждения.",
				};
			}

			const rawIp =
				(request.headers["x-forwarded-for"] as string) ||
				request.ip ||
				request.socket?.remoteAddress ||
				"127.0.0.1";
			const clientIp = typeof rawIp === "string" ? rawIp.split(",")[0]?.trim() || "127.0.0.1" : "127.0.0.1";

			const result = PublicEstimatesService.verifyAccess(token, parsed.data, clientIp);

			if (!result.success) {
				reply.status(result.status);
				return {
					error: "VerificationFailed",
					message: result.error,
				};
			}

			// Issue HttpOnly session cookie scoped to this estimate token
			if (result.sessionToken) {
				reply.header(
					"Set-Cookie",
					`bdg_session_${token}=${result.sessionToken}; Path=/api/public/estimates/${token}; HttpOnly; SameSite=Strict; Max-Age=1800`,
				);
			}

			return {
				success: true,
				sessionToken: result.sessionToken,
			};
		},
	);

	// 3. GET /api/public/estimates/:token (Detailed Estimate)
	server.get<{ Params: { token: string } }>(
		"/api/public/estimates/:token",
		async (request, reply) => {
			const token = request.params.token?.trim();
			if (!token) {
				reply.status(400);
				return { error: "TokenRequired", message: "Укажите публичный токен сметы." };
			}

			// Extract session token from Bearer header or Cookie
			const authHeader = request.headers.authorization;
			let sessionToken = authHeader?.startsWith("Bearer ")
				? authHeader.slice("Bearer ".length).trim()
				: undefined;

			if (!sessionToken) {
				const cookieHeader = request.headers.cookie || "";
				const cookieMatch = cookieHeader.match(new RegExp(`bdg_session_${token}=([^;]+)`));
				if (cookieMatch && cookieMatch[1]) {
					sessionToken = cookieMatch[1];
				}
			}

			const rawIp =
				(request.headers["x-forwarded-for"] as string) ||
				request.ip ||
				request.socket?.remoteAddress ||
				"127.0.0.1";
			const clientIp = typeof rawIp === "string" ? rawIp.split(",")[0]?.trim() || "127.0.0.1" : "127.0.0.1";

			const detail = PublicEstimatesService.getDetail(token, sessionToken, clientIp);
			if (!detail) {
				reply.status(401);
				return {
					error: "Unauthorized",
					message: "Требуется двухфакторная верификация для просмотра сметы.",
				};
			}

			return { data: detail };
		},
	);

	// 4. POST /api/public/estimates/:token/accept
	server.post<{ Params: { token: string } }>(
		"/api/public/estimates/:token/accept",
		async (request, reply) => {
			const token = request.params.token?.trim();
			if (!token) {
				reply.status(400);
				return { error: "TokenRequired" };
			}

			const parsed = acceptBodySchema.safeParse(request.body);
			if (!parsed.success) {
				reply.status(400);
				return {
					error: "InvalidSignatureData",
					message: "Необходимо указать ФИО подписанта и зафиксировать подпись.",
				};
			}

			const rawIp =
				(request.headers["x-forwarded-for"] as string) ||
				request.ip ||
				request.socket?.remoteAddress ||
				"127.0.0.1";
			const clientIp = typeof rawIp === "string" ? rawIp.split(",")[0]?.trim() || "127.0.0.1" : "127.0.0.1";
			const userAgent = request.headers["user-agent"];

			const acceptPayload = {
				signerName: parsed.data.signerName,
				...(parsed.data.relationship ? { relationship: parsed.data.relationship } : {}),
				...(parsed.data.signatureMethod ? { signatureMethod: parsed.data.signatureMethod } : {}),
				...(parsed.data.signaturePng ? { signaturePng: parsed.data.signaturePng } : {}),
				...(parsed.data.signatureSvg ? { signatureSvg: parsed.data.signatureSvg } : {}),
			};
			const result = PublicEstimatesService.acceptEstimate(token, acceptPayload, {
				ipAddress: clientIp,
				...(userAgent ? { userAgent } : {}),
			});

			if (!result.success) {
				reply.status(400);
				return { error: "AcceptanceFailed", message: result.error };
			}

			return {
				success: true,
				status: "accepted",
				estimateNumber: result.estimate?.estimateNumber,
				documentHash: result.estimate?.signature?.document_hash,
			};
		},
	);

	// 5. POST /api/public/estimates/:token/reject
	server.post<{ Params: { token: string } }>(
		"/api/public/estimates/:token/reject",
		async (request, reply) => {
			const token = request.params.token?.trim();
			if (!token) {
				reply.status(400);
				return { error: "TokenRequired" };
			}

			const parsed = rejectBodySchema.safeParse(request.body);
			if (!parsed.success) {
				reply.status(400);
				return { error: "InvalidRejectionData", message: "Укажите причину отклонения." };
			}

			const rejectPayload = {
				reason: parsed.data.reason,
				...(parsed.data.note ? { note: parsed.data.note } : {}),
			};
			const result = PublicEstimatesService.rejectEstimate(token, rejectPayload);
			if (!result.success) {
				reply.status(400);
				return { error: "RejectionFailed", message: result.error };
			}

			return {
				success: true,
				status: "rejected",
			};
		},
	);

	// 6. GET /api/public/estimates/:token/pdf/signed
	server.get<{ Params: { token: string } }>(
		"/api/public/estimates/:token/pdf/signed",
		async (request, reply) => {
			const token = request.params.token?.trim();
			if (!token) {
				reply.status(400);
				return { error: "TokenRequired" };
			}

			const html = PublicEstimatesService.generateSignedHtml(token);
			if (!html) {
				reply.status(404);
				return { error: "NotSigned", message: "Смета не была утверждена электронной подписью." };
			}

			reply.type("text/html; charset=utf-8");
			return reply.send(html);
		},
	);
};

export default registerPublicEstimatesRoutes;

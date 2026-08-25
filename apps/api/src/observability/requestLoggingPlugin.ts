/**
 * DENTE CRM — Fastify Structured Request Logging & Observability Plugin
 *
 * Обеспечивает сквозное отслеживание (Correlation ID), замер латентности,
 * структурированные JSON логи в Pino и санитизацию чувствительных данных (152-ФЗ).
 */

import {
	CORRELATION_ID_HEADER,
	REQUEST_ID_HEADER,
	extractCorrelationId,
	generateCorrelationId,
	sanitizePayload,
} from "@dental/shared";
import type {
	FastifyInstance,
	FastifyPluginAsync,
	FastifyReply,
	FastifyRequest,
} from "fastify";
import fp from "fastify-plugin";
import { getRequestIdentity } from "../security/identity.js";

declare module "fastify" {
	interface FastifyRequest {
		correlationId: string;
		requestStartTimeMs: number;
		dbQueryCount?: number;
	}
}

export function resolveRequestCorrelationId(request: FastifyRequest): string {
	const extracted = extractCorrelationId(request.headers);
	if (extracted) {
		return extracted;
	}
	return generateCorrelationId("req");
}

export function extractClientIp(request: FastifyRequest): string {
	const forwarded = request.headers["x-forwarded-for"];
	if (typeof forwarded === "string" && forwarded.trim()) {
		const first = forwarded.split(",")[0]?.trim();
		if (first) return first;
	}
	return request.ip || request.socket.remoteAddress || "127.0.0.1";
}

const requestLoggingPluginAsync: FastifyPluginAsync = async (
	app: FastifyInstance,
) => {
	// Hook 1: onRequest — Инициализация Correlation ID, таймера и заголовка ответа
	app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
		const correlationId = resolveRequestCorrelationId(request);
		request.correlationId = correlationId;
		request.requestStartTimeMs = performance.now();
		request.dbQueryCount = 0;

		// Пробрасываем сквозной Correlation ID в исходящие заголовки ответа
		reply.header(CORRELATION_ID_HEADER, correlationId);
		reply.header(REQUEST_ID_HEADER, correlationId);
	});

	// Hook 2: onResponse — Структурированное логирование завершения HTTP-запроса
	app.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
		// Игнорируем частые health-check запросы в обычных логах, если не dev
		const isHealthCheck = request.url === "/api/health" || request.url === "/health";
		if (isHealthCheck && process.env.NODE_ENV === "production") {
			return;
		}

		const latencyMs = Number(
			(performance.now() - (request.requestStartTimeMs || performance.now())).toFixed(2),
		);
		const identity = getRequestIdentity(request);
		const ip = extractClientIp(request);
		const statusCode = reply.statusCode;

		const logPayload = {
			correlationId: request.correlationId,
			method: request.method,
			url: request.url,
			path: request.routeOptions.url || request.url.split("?")[0],
			statusCode,
			latencyMs,
			ip,
			organizationId: identity.organizationId ?? null,
			userId: identity.userId ?? null,
			userRole: identity.role ?? null,
			userAgent: request.headers["user-agent"] ?? "unknown",
			dbQueryCount: request.dbQueryCount ?? 0,
		};

		if (statusCode >= 500) {
			request.log.error(logPayload, `[HTTP] ${request.method} ${request.url} ${statusCode} (${latencyMs}ms)`);
		} else if (statusCode >= 400) {
			request.log.warn(logPayload, `[HTTP] ${request.method} ${request.url} ${statusCode} (${latencyMs}ms)`);
		} else {
			request.log.info(logPayload, `[HTTP] ${request.method} ${request.url} ${statusCode} (${latencyMs}ms)`);
		}
	});

	// Hook 3: onError — Санитизированное логирование необработанных исключений
	app.addHook("onError", async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
		const identity = getRequestIdentity(request);
		const sanitizedBody = request.body ? sanitizePayload(request.body) : undefined;
		const sanitizedQuery = request.query ? sanitizePayload(request.query) : undefined;

		request.log.error(
			{
				correlationId: request.correlationId,
				method: request.method,
				url: request.url,
				error: {
					name: error.name,
					message: error.message,
					stack: error.stack,
				},
				organizationId: identity.organizationId ?? null,
				userId: identity.userId ?? null,
				query: sanitizedQuery,
				body: sanitizedBody,
			},
			`[HTTP_ERROR] ${request.method} ${request.url} failed: ${error.message}`,
		);
	});
};

export const requestLoggingPlugin = fp(requestLoggingPluginAsync, {
	name: "dente-request-logging-plugin",
	fastify: "5.x",
});

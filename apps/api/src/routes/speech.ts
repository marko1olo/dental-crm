import {
	type SpeechChunkUploadInput,
	speechChunkUploadSchema,
	speechGatewayHealthReportSchema,
	speechGatewayStatusSchema,
	speechProviderRuntimeStatusSchema,
	speechRecordingAssemblySchema,
	speechRecordingRecoveryListSchema,
	speechRecordingStrategyRequestSchema,
	speechRecordingStrategySchema,
	speechTranscriptionChunkSchema,
	speechTranscriptionResponseSchema,
	speechTranscriptPolishRequestSchema,
	speechTranscriptPolishResponseSchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { defineStreamRoute } from "../core/routeFactories.js";
import type { TenantDb } from "../db/client.js";
import { withTenantCtx, withTenantReadCtx } from "../db/rls.js";
import { patients, visits } from "../db/schema.js";
import {
	buildSpeechRecordingStrategy,
	getSpeechGatewayHealthReport,
	getSpeechGatewayStatus,
	getSpeechProviderRuntimeStatuses,
	SpeechChunkPayloadError,
	speechJsonBodyLimitBytes,
	transcribeSpeechChunk,
} from "../speech/gateway.js";
import { polishSpeechTranscript } from "../speech/polish.js";
import {
	assembleSpeechRecording,
	listSpeechRecordingRecoveries,
	listSpeechTranscriptionChunks,
	SpeechChunkIdentityConflictError,
} from "../speech/storage.js";

type SpeechScopeInput = {
	organizationId?: string | null | undefined;
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	source?: SpeechChunkUploadInput["source"] | null | undefined;
};

type SpeechPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

type SpeechScopeValidation =
	| { ok: true; patientId: string | null; visitId: string | null }
	| {
			ok: false;
			statusCode: 400 | 401 | 404 | 409;
			error: "SpeechClinicalScopeError";
			message: string;
	  };
type SpeechChunkRejectionReason = "audio_rejected" | "chunk_conflict";

const speechStrategyValidationMessage =
	"Стратегия записи не рассчитана: проверьте длительность, режим сети, приватность, специальность и источник диктовки.";
const speechChunkValidationMessage =
	"Фрагмент диктовки не принят: передайте запись, номер фрагмента, аудио или локальную расшифровку и клинический контекст.";
const speechChunkAudioRejectedMessage =
	"Аудиофрагмент не принят: запись повреждена. Повторите запись или сохраните текстовый черновик.";
const speechChunkConflictMessage =
	"Фрагмент диктовки не принят: очередь уже содержит фрагмент другой записи. Обновите очередь диктовки и повторите отправку.";

function parseSpeechPayload<T>(
	schema: SpeechPayloadSchema<T>,
	value: unknown,
	error: string,
	message: string,
	reply: FastifyReply,
): T | null {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		reply.code(400).send({ error, message });
		return null;
	}
	return parsed.data;
}

function normalizeScopeId(value: string | null | undefined): string | null {
	const normalized = value?.trim();
	return normalized ? normalized : null;
}

function speechScopeFailure(
	statusCode: 400 | 401 | 404 | 409,
	message: string,
): SpeechScopeValidation {
	return { ok: false, statusCode, error: "SpeechClinicalScopeError", message };
}

function sendSpeechScopeValidationError(
	reply: FastifyReply,
	scopeValidation: Extract<SpeechScopeValidation, { ok: false }>,
) {
	return reply.code(scopeValidation.statusCode).send({
		error: scopeValidation.error,
		message: scopeValidation.message,
	});
}

function sendSpeechChunkRejection(
	reply: FastifyReply,
	statusCode: number,
	reason: SpeechChunkRejectionReason,
	message: string,
) {
	return reply.code(statusCode).send({
		error: "SpeechChunkRejected",
		reason,
		message,
	});
}

/**
 * Проверяет клинический контекст диктовки.
 *
 * options.organizationId — организация ВЫЗЫВАЮЩЕГО, полученная из подписанного токена.
 * Когда она задана, пациент и прием ищутся только внутри этой организации: карта чужой
 * клиники отвечает «не найден» и не подтверждает даже существование идентификатора.
 * Это обязательно для записи: speech/storage.ts:404-425 определяет организацию
 * сохраняемого фрагмента ПО присланным patientId/visitId, поэтому без этой проверки
 * фрагмент диктовки ложится в карту той клиники, чей UUID назвал клиент.
 *
 * null больше не используется обработчиками маршрутов. Параметр оставлен nullable
 * только для внутренних/тестовых вызовов; production read/write пути передают
 * organizationId из requireClinicalReadContext / requireClinicalMutationContext.
 */
async function validateSpeechClinicalScope(
	input: SpeechScopeInput,
	options: {
		organizationId: string | null;
		requirePatientOrVisit?: boolean;
		runReadTx?: <T>(fn: (tx: TenantDb) => Promise<T>) => Promise<T>;
	},
): Promise<SpeechScopeValidation> {
	const requestedPatientId = normalizeScopeId(input.patientId);
	const requestedVisitId = normalizeScopeId(input.visitId);
	const callerOrganizationId = options.organizationId;

	if (
		options.requirePatientOrVisit &&
		!requestedPatientId &&
		!requestedVisitId
	) {
		return speechScopeFailure(400, "Укажите пациента или прием для диктовки.");
	}
	if (input.source === "visit" && !requestedVisitId) {
		return speechScopeFailure(
			400,
			"Для диктовки приема выберите активный прием.",
		);
	}

	if (!callerOrganizationId) {
		return speechScopeFailure(
			400,
			"Не указана организация клиники для проверки контекста диктовки.",
		);
	}

	const executeRead =
		options.runReadTx ??
		(<T>(fn: (tx: TenantDb) => Promise<T>) =>
			withTenantReadCtx(callerOrganizationId, fn));

	const { patient, visit } = await executeRead(async (tx) => {
		let foundPatient: typeof patients.$inferSelect | null = null;
		if (requestedPatientId) {
			const patientScope = and(
				eq(patients.id, requestedPatientId),
				eq(patients.organizationId, callerOrganizationId),
			);
			const [found] = await tx
				.select()
				.from(patients)
				.where(patientScope)
				.limit(1);
			foundPatient = found ?? null;
		}

		let foundVisit: typeof visits.$inferSelect | null = null;
		if (requestedVisitId) {
			const visitScope = and(
				eq(visits.id, requestedVisitId),
				eq(visits.organizationId, callerOrganizationId),
			);
			const [found] = await tx.select().from(visits).where(visitScope).limit(1);
			foundVisit = found ?? null;
		}

		return { patient: foundPatient, visit: foundVisit };
	});

	if (requestedPatientId && !patient) {
		return speechScopeFailure(404, "Пациент для диктовки не найден.");
	}
	if (requestedVisitId && !visit) {
		return speechScopeFailure(404, "Прием для диктовки не найден.");
	}

	if (visit && patient && visit.patientId !== patient.id) {
		return speechScopeFailure(
			409,
			"Диктовка приема относится к другому пациенту.",
		);
	}
	if (visit && patient && visit.organizationId !== patient.organizationId) {
		return speechScopeFailure(
			409,
			"Диктовка приема относится к другой клинике.",
		);
	}

	return {
		ok: true,
		patientId: patient?.id ?? visit?.patientId ?? null,
		visitId: visit?.id ?? null,
	};
}

async function handleSpeechStatus() {
	return speechGatewayStatusSchema.parse(getSpeechGatewayStatus());
}

async function handleSpeechGatewayHealth() {
	return speechGatewayHealthReportSchema.parse(getSpeechGatewayHealthReport());
}

async function handleSpeechProvidersRuntime() {
	return getSpeechProviderRuntimeStatuses().map((provider) =>
		speechProviderRuntimeStatusSchema.parse(provider),
	);
}

async function handleSpeechRecordingStrategy(
	body: unknown,
	reply: FastifyReply,
) {
	const input = parseSpeechPayload(
		speechRecordingStrategyRequestSchema,
		body,
		"SpeechStrategyValidationError",
		speechStrategyValidationMessage,
		reply,
	);
	if (!input) return;
	return speechRecordingStrategySchema.parse(
		buildSpeechRecordingStrategy(input),
	);
}

const speechChunksQuerySchema = z
	.object({
		recordingId: z.string().optional(),
		visitId: z.string().optional(),
		patientId: z.string().optional(),
	})
	.strict();

const speechRecoveryQuerySchema = z
	.object({
		visitId: z.string().optional(),
		patientId: z.string().optional(),
		limit: z.string().optional(),
	})
	.strict();

const speechAssembleParamsSchema = z
	.object({
		recordingId: z.string().min(1),
	})
	.strict();

const speechAssembleQuerySchema = z
	.object({
		visitId: z.string().optional(),
		patientId: z.string().optional(),
	})
	.strict();

async function handleSpeechChunks(
	organizationId: string,
	runReadTx: <T>(fn: (tx: TenantDb) => Promise<T>) => Promise<T>,
	rawQuery: unknown,
	reply: FastifyReply,
) {
	const parsedQuery = speechChunksQuerySchema.safeParse(rawQuery ?? {});
	if (!parsedQuery.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры запроса фрагментов диктовки.",
		});
	}
	const query = parsedQuery.data;
	const recordingId = query.recordingId?.trim();
	if (!recordingId) return [];

	const scopeValidation = await validateSpeechClinicalScope(
		{ patientId: query.patientId, visitId: query.visitId },
		{ organizationId, requirePatientOrVisit: true, runReadTx },
	);
	if (!scopeValidation.ok)
		return sendSpeechScopeValidationError(reply, scopeValidation);

	const scope: Parameters<typeof listSpeechTranscriptionChunks>[1] = {
		organizationId,
	};
	if (scopeValidation.visitId) scope.visitId = scopeValidation.visitId;
	if (scopeValidation.patientId) scope.patientId = scopeValidation.patientId;
	return z
		.array(speechTranscriptionChunkSchema)
		.parse(listSpeechTranscriptionChunks(recordingId, scope));
}

async function handleSpeechRecordingsRecovery(
	organizationId: string,
	runReadTx: <T>(fn: (tx: TenantDb) => Promise<T>) => Promise<T>,
	rawQuery: unknown,
	reply: FastifyReply,
) {
	const parsedQuery = speechRecoveryQuerySchema.safeParse(rawQuery ?? {});
	if (!parsedQuery.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры запроса восстановления записей.",
		});
	}
	const query = parsedQuery.data;
	const scopeValidation = await validateSpeechClinicalScope(
		{ patientId: query.patientId, visitId: query.visitId },
		{ organizationId, requirePatientOrVisit: true, runReadTx },
	);
	if (!scopeValidation.ok)
		return sendSpeechScopeValidationError(reply, scopeValidation);

	const parsedLimit = query.limit ? Number(query.limit) : undefined;
	const filters: {
		organizationId: string;
		visitId?: string | null;
		patientId?: string | null;
		limit?: number | null;
	} = { organizationId };
	if (scopeValidation.visitId) filters.visitId = scopeValidation.visitId;
	if (scopeValidation.patientId) filters.patientId = scopeValidation.patientId;
	if (parsedLimit !== undefined && !Number.isNaN(parsedLimit)) filters.limit = parsedLimit;
	return speechRecordingRecoveryListSchema.parse(
		listSpeechRecordingRecoveries(filters),
	);
}

async function handleSpeechRecordingAssemble(
	organizationId: string,
	runReadTx: <T>(fn: (tx: TenantDb) => Promise<T>) => Promise<T>,
	rawParams: unknown,
	rawQuery: unknown,
	reply: FastifyReply,
) {
	const parsedParams = speechAssembleParamsSchema.safeParse(rawParams ?? {});
	const parsedQuery = speechAssembleQuerySchema.safeParse(rawQuery ?? {});
	if (!parsedParams.success || !parsedQuery.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры сборки записи диктовки.",
		});
	}
	const params = parsedParams.data;
	const query = parsedQuery.data;
	const scopeValidation = await validateSpeechClinicalScope(
		{ patientId: query.patientId, visitId: query.visitId },
		{ organizationId, requirePatientOrVisit: true, runReadTx },
	);
	if (!scopeValidation.ok)
		return sendSpeechScopeValidationError(reply, scopeValidation);

	const scope: Parameters<typeof assembleSpeechRecording>[1] = {
		organizationId,
	};
	if (scopeValidation.visitId) scope.visitId = scopeValidation.visitId;
	if (scopeValidation.patientId) scope.patientId = scopeValidation.patientId;
	return speechRecordingAssemblySchema.parse(
		assembleSpeechRecording(params.recordingId, scope),
	);
}

async function handleSpeechTranscribeChunk(
	organizationId: string,
	runReadTx: <T>(fn: (tx: TenantDb) => Promise<T>) => Promise<T>,
	body: unknown,
	reply: FastifyReply,
) {
	const input = parseSpeechPayload(
		speechChunkUploadSchema,
		body,
		"SpeechChunkValidationError",
		speechChunkValidationMessage,
		reply,
	);
	if (!input) return;
	const scopeValidation = await validateSpeechClinicalScope(input, {
		organizationId,
		runReadTx,
	});
	if (!scopeValidation.ok)
		return sendSpeechScopeValidationError(reply, scopeValidation);
	const scopedInput: SpeechChunkUploadInput = {
		...input,
		patientId: scopeValidation.patientId,
		visitId: scopeValidation.visitId,
	};

	try {
		const result = await transcribeSpeechChunk(scopedInput);
		return reply
			.code(result.chunk.status === "failed" ? 503 : 201)
			.send(speechTranscriptionResponseSchema.parse(result));
	} catch (error) {
		if (error instanceof SpeechChunkPayloadError) {
			return sendSpeechChunkRejection(
				reply,
				error.statusCode,
				"audio_rejected",
				speechChunkAudioRejectedMessage,
			);
		}
		if (error instanceof SpeechChunkIdentityConflictError) {
			return sendSpeechChunkRejection(
				reply,
				error.statusCode,
				"chunk_conflict",
				speechChunkConflictMessage,
			);
		}
		throw error;
	}
}

async function handleSpeechPolishTranscript(
	body: unknown,
	reply: FastifyReply,
) {
	const parsedInput = speechTranscriptPolishRequestSchema.safeParse(body);
	if (!parsedInput.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message:
				"Некорректный текст для очистки диктовки. Передайте непустую расшифровку до 80 000 символов и специальность приема.",
		});
	}
	const input = parsedInput.data;
	return speechTranscriptPolishResponseSchema.parse(
		await polishSpeechTranscript(input),
	);
}

const SPEECH_READ_PERMISSION = {
	anyOf: ["clinical.read", "agent.read", "schedule.read"],
} as const;
const SPEECH_WRITE_PERMISSION = {
	anyOf: ["clinical.write", "clinical.read", "agent.write", "schedule.write"],
} as const;
const SPEECH_AUTH_OPTIONS = { allowClinicTokenWithoutStaff: true } as const;

export async function registerSpeechRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/speech/status",
		permission: SPEECH_READ_PERMISSION,
		authOptions: SPEECH_AUTH_OPTIONS,
		handler: async () => handleSpeechStatus(),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/speech/gateway-health",
		permission: SPEECH_READ_PERMISSION,
		authOptions: SPEECH_AUTH_OPTIONS,
		handler: async () => handleSpeechGatewayHealth(),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/speech/providers/runtime",
		permission: SPEECH_READ_PERMISSION,
		authOptions: SPEECH_AUTH_OPTIONS,
		handler: async () => handleSpeechProvidersRuntime(),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/speech/recording-strategy",
		permission: SPEECH_READ_PERMISSION,
		authOptions: SPEECH_AUTH_OPTIONS,
		handler: async ({ request, reply }) =>
			handleSpeechRecordingStrategy(request.body, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/speech/chunks",
		permission: SPEECH_READ_PERMISSION,
		authOptions: SPEECH_AUTH_OPTIONS,
		handler: async ({ organizationId, runReadTx, request, reply }) => {
			if (!organizationId) {
				return reply.code(401).send({ error: "Unauthorized" });
			}
			return handleSpeechChunks(organizationId, runReadTx, request.query, reply);
		},
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/speech/recordings/recovery",
		permission: SPEECH_READ_PERMISSION,
		authOptions: SPEECH_AUTH_OPTIONS,
		handler: async ({ organizationId, runReadTx, request, reply }) => {
			if (!organizationId) {
				return reply.code(401).send({ error: "Unauthorized" });
			}
			return handleSpeechRecordingsRecovery(
				organizationId,
				runReadTx,
				request.query,
				reply,
			);
		},
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/speech/recordings/:recordingId/assemble",
		permission: SPEECH_READ_PERMISSION,
		authOptions: SPEECH_AUTH_OPTIONS,
		handler: async ({ organizationId, runReadTx, request, reply }) => {
			if (!organizationId) {
				return reply.code(401).send({ error: "Unauthorized" });
			}
			return handleSpeechRecordingAssemble(
				organizationId,
				runReadTx,
				request.params,
				request.query,
				reply,
			);
		},
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/speech/transcribe-chunk",
		bodyLimit: speechJsonBodyLimitBytes(),
		permission: SPEECH_WRITE_PERMISSION,
		authOptions: SPEECH_AUTH_OPTIONS,
		handler: async ({ organizationId, runReadTx, request, reply }) => {
			if (!organizationId) {
				return reply.code(401).send({ error: "Unauthorized" });
			}
			return handleSpeechTranscribeChunk(
				organizationId,
				runReadTx,
				request.body,
				reply,
			);
		},
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/speech/polish-transcript",
		permission: SPEECH_WRITE_PERMISSION,
		authOptions: SPEECH_AUTH_OPTIONS,
		handler: async ({ request, reply }) =>
			handleSpeechPolishTranscript(request.body, reply),
	});
}

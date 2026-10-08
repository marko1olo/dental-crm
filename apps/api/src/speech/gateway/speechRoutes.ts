import {
	type SpeechChunkUploadInput,
	speechChunkUploadSchema,
	speechGatewayHealthReportSchema,
	speechGatewayStatusSchema,
	speechProviderRuntimeStatusSchema,
	speechRecordingStrategyRequestSchema,
	speechRecordingStrategySchema,
	speechTranscriptionResponseSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadAccess,
} from "../../accessGuard.js";
import { speechJsonBodyLimitBytes } from "./audioBufferUtils.js";
import { buildSpeechRecordingStrategy } from "./recordingStrategy.js";
import {
	getSpeechGatewayHealthReport,
	getSpeechGatewayStatus,
	getSpeechProviderRuntimeStatuses,
} from "./speechSessionManager.js";
import { transcribeSpeechChunk } from "./transcriptionEngine.js";
import { SpeechChunkPayloadError } from "./types.js";

type SpeechPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

const speechStrategyValidationMessage =
	"Стратегия записи не рассчитана: проверьте длительность, режим сети, приватность, специальность и источник диктовки.";
const speechChunkValidationMessage =
	"Фрагмент диктовки не принят: передайте запись, номер фрагмента, аудио или локальную расшифровку и клинический контекст.";
const speechChunkAudioRejectedMessage =
	"Аудиофрагмент не принят: запись повреждена. Повторите запись или сохраните текстовый черновик.";

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

export async function handleSpeechStatus(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalReadAccess(request, reply, "speech gateway status"))
	)
		return;
	return speechGatewayStatusSchema.parse(getSpeechGatewayStatus());
}

export async function handleSpeechGatewayHealth(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalReadAccess(request, reply, "speech gateway health"))
	)
		return;
	return speechGatewayHealthReportSchema.parse(getSpeechGatewayHealthReport());
}

export async function handleSpeechProvidersRuntime(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalReadAccess(
			request,
			reply,
			"speech provider runtime",
		))
	)
		return;
	return getSpeechProviderRuntimeStatuses().map((provider) =>
		speechProviderRuntimeStatusSchema.parse(provider),
	);
}

export async function handleSpeechRecordingStrategy(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalReadAccess(
			request,
			reply,
			"speech recording strategy",
		))
	)
		return;
	const input = parseSpeechPayload(
		speechRecordingStrategyRequestSchema,
		request.body,
		"SpeechStrategyValidationError",
		speechStrategyValidationMessage,
		reply,
	);
	if (!input) return;
	return speechRecordingStrategySchema.parse(
		buildSpeechRecordingStrategy(input),
	);
}

export async function handleSpeechGatewayTranscribeChunk(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const context = await requireClinicalMutationContext(
		request,
		reply,
		"speech chunk transcribe",
	);
	if (!context) return;
	const input = parseSpeechPayload(
		speechChunkUploadSchema,
		request.body,
		"SpeechChunkValidationError",
		speechChunkValidationMessage,
		reply,
	);
	if (!input) return;

	try {
		const result = await transcribeSpeechChunk(input);
		return reply
			.code(result.chunk.status === "failed" ? 503 : 201)
			.send(speechTranscriptionResponseSchema.parse(result));
	} catch (error) {
		if (error instanceof SpeechChunkPayloadError) {
			return reply.code(error.statusCode).send({
				error: "SpeechChunkRejected",
				reason: "audio_rejected",
				message: speechChunkAudioRejectedMessage,
			});
		}
		throw error;
	}
}

export async function registerSpeechGatewayRoutes(app: FastifyInstance) {
	app.get("/api/speech/status", handleSpeechStatus);
	app.get("/api/speech/gateway-health", handleSpeechGatewayHealth);
	app.get("/api/speech/providers/runtime", handleSpeechProvidersRuntime);
	app.post("/api/speech/recording-strategy", handleSpeechRecordingStrategy);
	app.post(
		"/api/speech/transcribe-chunk",
		{ bodyLimit: speechJsonBodyLimitBytes() },
		handleSpeechGatewayTranscribeChunk,
	);
}

import {
	documentIngestionRequestSchema,
	documentIngestionResponseSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireClinicalMutationAccess } from "../accessGuard.js";
import { extractDocument } from "../ingestion/documentExtractor.js";

type IngestionPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

const ingestionValidationMessage =
	"Файл не разобран: передайте название и файл или текст документа до безопасного лимита.";

function parseIngestionPayload<T>(
	schema: IngestionPayloadSchema<T>,
	value: unknown,
) {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	return parsed.data;
}

export async function registerIngestionRoutes(app: FastifyInstance) {
	app.post(
		"/api/ingestion/extract",
		{
			bodyLimit: 9 * 1024 * 1024,
		},
		async (request, reply) => {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"document ingestion extract",
				))
			)
				return;
			const input = parseIngestionPayload(
				documentIngestionRequestSchema,
				request.body,
			);
			if (!input) {
				return reply.code(400).send({
					error: "DocumentIngestionValidationError",
					message: ingestionValidationMessage,
				});
			}
			try {
				return documentIngestionResponseSchema.parse(extractDocument(input));
			} catch (extractErr) {
				request.log.warn(
					{ err: extractErr },
					"Ошибка при разборе документа в роуте ингестии",
				);
				return documentIngestionResponseSchema.parse({
					fileName: input.fileName,
					mimeType: input.mimeType ?? null,
					detectedKind: "unknown",
					byteSize: 0,
					extractedText: "",
					textPreview: "",
					rowCount: 0,
					tableCount: 0,
					extractedFiles: [],
					routes: [
						{
							target: "plain_text",
							title: "Проверка обычного текста",
							endpoint: "",
							enabled: false,
							reason: "Файл поврежден или не может быть прочитан.",
						},
					],
					quality: {
						extractionQuality: "unsupported",
						confidence: 0.1,
						suggestedTarget: "plain_text",
						signals: [],
						nextAction:
							"Файл поврежден или имеет нечитаемый формат. Проверьте исходный файл.",
					},
					warnings: ["file_corrupted_or_unreadable"],
					parserNotes: [
						"Исключение при разборе файла; процесс Node.js защищен от падения.",
					],
				});
			}
		},
	);
}

/**
 * visionTool.ts — Radiograph Diagnostic Vision AI Tool for Dentalpin Agentic Core.
 * Executes dual-pass clinical vision analysis (Pass 1 Clinical Read + Pass 2 Critic)
 * with FDI tooth charting and EMR imaging study synchronization.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import {
	analyzeRadiographBuffer,
	type RadiographAnalysisResult,
} from "../../../ai/visionAnalyzer.js";
import { db } from "../../../db/client.js";
import {
	getImagingStudyById,
	updateImagingStudyAiSummaryInDb,
} from "../../../db/imagingQuery.js";
import type { ToolRegistry } from "./registry.js";
import type { ToolDefinition } from "./tool.js";

// ─── 1. Zod Input Schema ──────────────────────────────────────────────────

export const analyzeRadiographVisionSchema = z.object({
	studyId: z
		.string()
		.uuid("Некорректный UUID исследования в базе данных")
		.optional()
		.describe("Уникальный идентификатор рентген-исследования (imaging_study) в базе данных"),
	imageBase64: z
		.string()
		.optional()
		.describe("Изображение снимка в base64 или data URL (если не передан studyId)"),
	mimeType: z
		.string()
		.optional()
		.default("image/png")
		.describe("MIME-тип изображения (image/png, image/jpeg, image/webp)"),
	toothCode: z
		.string()
		.optional()
		.describe("Номер зуба по международной классификации FDI (11–48, 51–85) или анатомическая область"),
	clinicalQuestion: z
		.string()
		.optional()
		.describe("Клинический фокус врача (например, 'оценить качество обтурации канала 36' или 'подозрение на вторичный кариес под пломбой')"),
});

export type AnalyzeRadiographVisionInput = z.infer<
	typeof analyzeRadiographVisionSchema
>;

export interface AnalyzeRadiographVisionOutput extends RadiographAnalysisResult {
	readonly studyId: string | null;
	readonly toothCode: string | null;
}

// ─── 2. Tool Definition ───────────────────────────────────────────────────

export const analyzeRadiographVisionTool: ToolDefinition<
	typeof analyzeRadiographVisionSchema,
	AnalyzeRadiographVisionOutput
> = {
	name: "analyze_radiograph_vision",
	description:
		"Мультимодальный ИИ-анализ рентгеновских снимков (прицельная визиография, ОПТГ) с двухпроходной клинической валидацией (Pass 1 Clinical Read + Pass 2 Critic), выявлением патологий и разметкой зубов по формуле FDI.",
	parameters: analyzeRadiographVisionSchema,
	permissions: ["clinical.read"],
	category: "read",
	exposesFreeText: true,
	handler: async (ctx, args) => {
		let imageBuffer: Buffer;
		let effectiveMimeType = args.mimeType || "image/png";
		let foundStudyId: string | null = null;
		let studyToothCode: string | null = null;

		if (args.studyId) {
			const targetDb = ctx.db ?? db;
			const study = await getImagingStudyById(
				ctx.organizationId,
				args.studyId,
				targetDb,
			);
			if (!study) {
				throw new Error(
					`Рентген-исследование с ID ${args.studyId} не найдено в текущей организации`,
				);
			}
			if (!study.storagePath) {
				throw new Error(
					`У исследования ${args.studyId} отсутствует путь к файлу на сервере`,
				);
			}
			if (!existsSync(study.storagePath)) {
				throw new Error(
					`Файл рентген-снимка не найден на диске по пути: ${study.storagePath}`,
				);
			}

			imageBuffer = await readFile(study.storagePath);
			foundStudyId = study.id;
			studyToothCode = study.toothCode ?? null;

			// Infer MIME type from file extension if default was left
			const lowerPath = study.storagePath.toLowerCase();
			if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
				effectiveMimeType = "image/jpeg";
			} else if (lowerPath.endsWith(".webp")) {
				effectiveMimeType = "image/webp";
			} else if (lowerPath.endsWith(".png")) {
				effectiveMimeType = "image/png";
			}
		} else if (args.imageBase64) {
			const rawBase64 = args.imageBase64.trim();
			if (!rawBase64) {
				throw new Error("Передана пустая строка base64-изображения снимка");
			}

			// Extract MIME type from data URL header if present
			const matchMime = rawBase64.match(/^data:(.*?);base64,/i);
			if (matchMime?.[1]) {
				effectiveMimeType = matchMime[1];
			}

			const cleanBase64 = rawBase64.includes(",")
				? rawBase64.split(",")[1]!
				: rawBase64;

			imageBuffer = Buffer.from(cleanBase64, "base64");
			if (imageBuffer.length === 0) {
				throw new Error("Не удалось декодировать переданные base64-данные снимка");
			}
		} else {
			throw new Error(
				"Необходимо указать studyId (ID снимка в базе) или imageBase64 (base64-данные изображения)",
			);
		}

		const resolvedToothCode = args.toothCode ?? studyToothCode ?? undefined;

		const analysisResult = await analyzeRadiographBuffer(
			imageBuffer,
			effectiveMimeType,
			{
				toothCode: resolvedToothCode,
				clinicalQuestion: args.clinicalQuestion,
			},
		);

		// Synchronize AI summary into DB if studyId was provided
		if (foundStudyId) {
			try {
				const targetDb = ctx.db ?? db;
				await updateImagingStudyAiSummaryInDb(
					ctx.organizationId,
					foundStudyId,
					analysisResult.summary,
					targetDb,
				);
			} catch (persistErr) {
				console.warn(
					`[visionTool] Не удалось сохранить AI summary в базу для study ${foundStudyId}:`,
					persistErr,
				);
			}
		}

		return {
			studyId: foundStudyId,
			toothCode: resolvedToothCode ?? null,
			summary: analysisResult.summary,
			toothUpdates: analysisResult.toothUpdates,
			_meta: analysisResult._meta ?? {
				pass1Model: "unknown",
				pass2Model: null,
			},
		};
	},
};

/**
 * Registers all vision-related AI tools into the specified ToolRegistry.
 */
export function registerVisionTools(
	registry: ToolRegistry,
	moduleName = "clinical",
): void {
	registry.register(analyzeRadiographVisionTool, moduleName);
}

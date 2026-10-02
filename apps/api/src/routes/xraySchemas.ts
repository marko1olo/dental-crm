/**
 * xraySchemas.ts — Zod schemas, types, and analysis background worker helpers for 2D X-ray scans.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { analyzeVisiographImage } from "../ai/visiograph.js";
import { transactionStorage } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import { xrayScans } from "../db/schema.js";

// Schemas

export const createXrayScanSchema = z.object({
	patientId: z.string().uuid(),
	visitId: z.string().uuid().optional(),
	imageBase64: z.string().min(100), // data:image/... base64 string or raw base64
	originalFilename: z.string().optional(),
	mimeType: z.string().optional().default("image/jpeg"),
	kind: z
		.enum(["periapical", "bitewing", "opg", "other"])
		.optional()
		.default("periapical"),
	toothCode: z.string().optional(), // e.g. "46"
	notes: z.string().optional(),
	organizationId: z.string().uuid().optional(), // resolved from session context
	aiReport: z.string().max(50000).nullable().optional(),
	aiSummary: z.string().max(2000).nullable().optional(),
	aiToothStates: z.record(z.string(), z.string()).nullable().optional(),
	status: z.enum(["pending", "analyzing", "done", "error"]).optional(),
});

export const _xrayScanResponseSchema = z.object({
	id: z.string(),
	patientId: z.string(),
	visitId: z.string().nullable().optional(),
	status: z.string(),
	kind: z.string(),
	toothCode: z.string().nullable().optional(),
	originalFilename: z.string().nullable().optional(),
	aiReport: z.string().nullable().optional(),
	aiSummary: z.string().nullable().optional(),
	aiToothStates: z.record(z.string()).nullable().optional(),
	aiModelName: z.string().nullable().optional(),
	aiAnalyzedAt: z.string().nullable().optional(),
	aiError: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	capturedAt: z.string(),
	createdAt: z.string(),
	hasImage: z.boolean(),
	fileUrl: z.string().optional(),
	storagePath: z.string().nullable().optional(),
});

/** Целое из окружения с зажимом в границы. Ноль хардкода сроков в коде. */
export function xrayIntFromEnv(
	name: string,
	fallback: number,
	min: number,
	max: number,
): number {
	const parsed = Number.parseInt(process.env[name]?.trim() ?? "", 10);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.max(min, Math.min(max, parsed));
}

/**
 * Общий предельный срок одного разбора.
 */
export function xrayAnalysisDeadlineMs(): number {
	return xrayIntFromEnv(
		"DENTE_XRAY_ANALYSIS_DEADLINE_MS",
		120_000,
		10_000,
		600_000,
	);
}

/**
 * Через сколько состояние `analyzing` считается брошенным и разбор можно запустить заново.
 */
export function xrayAnalysisStaleMs(): number {
	return xrayIntFromEnv(
		"DENTE_XRAY_ANALYSIS_STALE_MS",
		900_000,
		60_000,
		24 * 60 * 60_000,
	);
}

/** Отдельный тип, чтобы отличить срыв срока от отказа самого провайдера. */
export class XrayAnalysisDeadlineError extends Error {
	constructor(deadlineMs: number) {
		super(`Разбор снимка не уложился в ${Math.round(deadlineMs / 1000)} с.`);
		this.name = "XrayAnalysisDeadlineError";
	}
}

/** Всё, что фоновому заданию нужно знать. Захватывается ДО отправки ответа. */
export type XrayAnalysisJob = {
	readonly scanId: string;
	readonly organizationId: string;
	readonly imageDataUri: string;
};

export type XrayAnalysisPatch = Partial<typeof xrayScans.$inferInsert>;

/**
 * Единственная точка записи результата. Своя транзакция со своим тенант-контекстом.
 */
export async function persistXrayAnalysisOutcome(
	job: XrayAnalysisJob,
	patch: XrayAnalysisPatch,
): Promise<void> {
	await withTenantCtx(job.organizationId, async (tx) => {
		await tx
			.update(xrayScans)
			.set({ ...patch, updatedAt: new Date() })
			.where(
				and(
					eq(xrayScans.id, job.scanId),
					eq(xrayScans.organizationId, job.organizationId),
				),
			);
	});
}

/**
 * Разбор с предельным сроком.
 */
export async function analyzeWithDeadline(imageDataUri: string, deadlineMs: number) {
	let timer: ReturnType<typeof setTimeout> | null = null;
	try {
		return await Promise.race([
			analyzeVisiographImage(imageDataUri),
			new Promise<never>((_resolve, reject) => {
				timer = setTimeout(
					() => reject(new XrayAnalysisDeadlineError(deadlineMs)),
					deadlineMs,
				);
				timer.unref?.();
			}),
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

/**
 * Тело фонового задания.
 */
export async function executeXrayAnalysisJob(job: XrayAnalysisJob): Promise<void> {
	try {
		const result = await analyzeWithDeadline(
			job.imageDataUri,
			xrayAnalysisDeadlineMs(),
		);
		await persistXrayAnalysisOutcome(job, {
			status: "done",
			aiReport: result.report,
			aiSummary: extractSummary(result.report),
			aiToothStates: result.toothStates,
			aiAnalyzedAt: new Date(),
			aiError: result.warnings.length > 0 ? result.warnings.join("; ") : null,
		});
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		console.error("[XRay AI] Разбор снимка не выполнен", job.scanId, reason);
		try {
			await persistXrayAnalysisOutcome(job, {
				status: "error",
				aiError:
					error instanceof XrayAnalysisDeadlineError
						? `${reason} Повторите разбор снимка.`
						: "Не удалось выполнить AI-анализ снимка.",
			});
		} catch (persistError) {
			console.error(
				"[XRay AI] Состояние разбора не записано",
				job.scanId,
				persistError instanceof Error
					? persistError.message
					: String(persistError),
			);
		}
	}
}

/**
 * Ставит задание за пределами обработчика И за пределами его асинхронного контекста.
 */
export function startDetachedXrayAnalysis(job: XrayAnalysisJob): void {
	setImmediate(() => {
		transactionStorage.exit(() => {
			void executeXrayAnalysisJob(job).catch((err) => {
				console.error(`[XrayAI] Detached analysis job failed for scan ${job.scanId}:`, err);
			});
		});
	});
}

export function scanToResponse(
	scan: typeof xrayScans.$inferSelect,
	includeImage = false,
	resolvedImageDataUri?: string | null,
) {
	return {
		id: scan.id,
		patientId: scan.patientId,
		visitId: scan.visitId ?? null,
		status: scan.status,
		kind: scan.kind,
		toothCode: scan.toothCode ?? null,
		originalFilename: scan.originalFilename ?? null,
		aiReport: scan.aiReport ?? null,
		aiSummary: scan.aiSummary ?? null,
		aiToothStates: (scan.aiToothStates ?? null) as Record<
			string,
			string
		> | null,
		aiModelName: scan.aiModelName ?? null,
		aiAnalyzedAt: scan.aiAnalyzedAt?.toISOString() ?? null,
		aiError: scan.aiError ?? null,
		notes: scan.notes ?? null,
		capturedAt: scan.capturedAt.toISOString(),
		createdAt: scan.createdAt.toISOString(),
		hasImage: !!(scan.imageDataUri || scan.storagePath),
		fileUrl: `/api/xray/scans/${scan.id}/file`,
		storagePath: scan.storagePath ?? null,
		...(includeImage
			? { imageDataUri: resolvedImageDataUri ?? scan.imageDataUri ?? null }
			: {}),
	};
}

/**
 * Extracts a short summary from the AI markdown report.
 * Uses the "Заключение:" section if present, otherwise first 2 sentences.
 */
export function extractSummary(report: string): string | null {
	if (!report) return null;

	// Try to find the "Заключение:" section
	const conclusionMatch = report.match(
		/\*\*Заключение:\*\*\s*\n([\s\S]*?)(?:\n\n|\*\*|$)/i,
	);
	if (conclusionMatch?.[1]) {
		return conclusionMatch[1]
			.replace(/^[-*\s]+/gm, "")
			.trim()
			.substring(0, 500);
	}

	// Fallback: first 2 sentences
	const sentences = report.replace(/[#*`]/g, "").split(/(?<=[.!?])\s+/);
	return sentences.slice(0, 2).join(" ").trim().substring(0, 500) || null;
}

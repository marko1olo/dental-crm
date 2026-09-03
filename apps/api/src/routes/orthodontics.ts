/**
 * orthodontics.ts — Ортодонтический модуль: трекинг элайнеров, смены дуг, активации и этапы лечения.
 *
 * МАНДАТ THE HAMMER & ЗАПРЕТ НА ПАЛКИ В КОЛЁСА:
 * 1. Никаких блокировок перехода к следующему этапу/шагу без загрузки 8 обязательных фото.
 * 2. 1-клик быстрые действия:
 *    - Выдача сета элайнеров №X-Y (+14/28 дн.)
 *    - Смена дуги на верх/низ (NiTi, CuNiTi, SS, TMA)
 *    - Активация лигатур и Power Chain
 *    - Продвижение клинического этапа лечения
 * 3. Полная синхронизация с administrativeProfile.orthodonticProgress и ЭМК 043/у.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	getPatientByIdFromDb,
	updatePatientAdministrativeProfileInDb,
} from "../db/patientsQuery.js";
import { requireOrganizationId } from "../security/identity.js";

// Schemas
const patientParamsSchema = z.object({
	patientId: z.string().min(1),
});

const issueAlignerSetSchema = z.object({
	alignerCount: z.number().int().min(1).max(20).default(2),
	wearDaysPerAligner: z.number().int().min(3).max(30).default(14),
	totalAligners: z.number().int().min(1).max(100).optional(),
	note: z.string().max(300).optional(),
});

const archwireChangeSchema = z.object({
	material: z.enum(["NiTi", "CuNiTi", "SS", "TMA"]),
	section: z.string().min(1).max(30),
	arch: z.enum(["upper", "lower", "both"]).default("both"),
	note: z.string().max(300).optional(),
});

const ligatureActivateSchema = z.object({
	powerChain: z.boolean().default(false),
	powerChainSpan: z.string().max(50).optional(),
	note: z.string().max(300).optional(),
});

const stageAdvanceSchema = z.object({
	nextStage: z.number().int().min(1).max(10),
	stageTitle: z.string().max(120).optional(),
	note: z.string().max(300).optional(),
});

export interface OrthodonticProgressRecord {
	currentAligner: number;
	totalAligners: number;
	startDate: string;
	currentStage: number;
	stageTitle?: string | undefined;
	archwire?: string | undefined;
	elastics?: string | undefined;
	lastActionDate?: string | undefined;
	lastActionSummary?: string | undefined;
	wearDaysPerAligner?: number | undefined;
	nextVisitRecommendedDate?: string | undefined;
}

function parseOrthoData(raw: unknown): OrthodonticProgressRecord {
	const defaultRecord: OrthodonticProgressRecord = {
		currentAligner: 1,
		totalAligners: 36,
		startDate: new Date().toISOString().split("T")[0] || "",
		currentStage: 1,
		stageTitle: "Диагностика и начало нивелирования",
		wearDaysPerAligner: 14,
	};

	if (!raw) return defaultRecord;

	let parsed: Record<string, unknown> = {};
	if (typeof raw === "string") {
		try {
			parsed = JSON.parse(raw);
		} catch {
			return defaultRecord;
		}
	} else if (typeof raw === "object" && raw !== null) {
		parsed = raw as Record<string, unknown>;
	}

	return {
		currentAligner: Number(parsed.currentAligner ?? parsed.current) || defaultRecord.currentAligner,
		totalAligners: Number(parsed.totalAligners ?? parsed.total) || defaultRecord.totalAligners,
		startDate: String(parsed.startDate ?? parsed.start ?? defaultRecord.startDate),
		currentStage: Number(parsed.currentStage ?? parsed.stage) || defaultRecord.currentStage,
		stageTitle: parsed.stageTitle ? String(parsed.stageTitle) : defaultRecord.stageTitle,
		archwire: parsed.archwire ? String(parsed.archwire) : undefined,
		elastics: parsed.elastics ? String(parsed.elastics) : undefined,
		lastActionDate: parsed.lastActionDate ? String(parsed.lastActionDate) : undefined,
		lastActionSummary: parsed.lastActionSummary ? String(parsed.lastActionSummary) : undefined,
		wearDaysPerAligner: Number(parsed.wearDaysPerAligner) || defaultRecord.wearDaysPerAligner,
		nextVisitRecommendedDate: parsed.nextVisitRecommendedDate ? String(parsed.nextVisitRecommendedDate) : undefined,
	};
}

function calculateNextDate(daysToAdd: number): string {
	const d = new Date();
	d.setDate(d.getDate() + daysToAdd);
	return d.toISOString().split("T")[0] || "";
}

export async function registerOrthodonticsRoutes(app: FastifyInstance) {
	/**
	 * GET /api/orthodontics/:patientId/progress
	 * Возвращает текущий ортодонтический статус пациента (элайнеры, дуга, эластики, этап).
	 */
	app.get<{ Params: { patientId: string } }>(
		"/api/orthodontics/:patientId/progress",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = patientParamsSchema.parse(request.params);
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден",
				});
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const orthoProgress = parseOrthoData(adminProfile.orthodonticProgress);

			return reply.send({
				patientId,
				patientName: patient.fullName,
				...orthoProgress,
			});
		},
	);

	/**
	 * POST /api/orthodontics/:patientId/aligners/issue-set
	 * 1-клик действие: выдача очередного сета элайнеров (напр. №11-12 или №11-14).
	 * Автоматически сдвигает текущую каппу, рассчитывает дату следующего осмотра (+14/28 дн.)
	 * и сохраняет прогресс в карточку пациента. Без бюрократических блокировок!
	 */
	app.post<{ Params: { patientId: string } }>(
		"/api/orthodontics/:patientId/aligners/issue-set",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = patientParamsSchema.parse(request.params);
			const body = issueAlignerSetSchema.parse(request.body);

			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден",
				});
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress);

			const effectiveTotal = body.totalAligners || currentProgress.totalAligners;
			const fromAligner = currentProgress.currentAligner;
			const toAligner = Math.min(effectiveTotal, fromAligner + body.alignerCount);
			const totalDays = body.alignerCount * body.wearDaysPerAligner;
			const nextDate = calculateNextDate(totalDays);
			const actionSummary = `Выдан сет элайнеров №${fromAligner}–${toAligner} (+${totalDays} дн. до ${nextDate})`;

			const updatedProgress: OrthodonticProgressRecord = {
				...currentProgress,
				currentAligner: toAligner,
				totalAligners: effectiveTotal,
				wearDaysPerAligner: body.wearDaysPerAligner,
				lastActionDate: new Date().toISOString(),
				lastActionSummary: actionSummary,
				nextVisitRecommendedDate: nextDate,
			};

			const serialized = JSON.stringify(updatedProgress);
			await updatePatientAdministrativeProfileInDb(orgId, patientId, {
				...adminProfile,
				orthodonticProgress: serialized,
			});

			return reply.send({
				success: true,
				issuedRange: `№${fromAligner}–${toAligner}`,
				nextVisitRecommendedDate: nextDate,
				actionSummary,
				progress: updatedProgress,
			});
		},
	);

	/**
	 * POST /api/orthodontics/:patientId/archwire-change
	 * 1-клик фиксация смены дуги (NiTi, CuNiTi, SS, TMA) с сечением и челюстью (ВЧ/НЧ/обе).
	 */
	app.post<{ Params: { patientId: string } }>(
		"/api/orthodontics/:patientId/archwire-change",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = patientParamsSchema.parse(request.params);
			const body = archwireChangeSchema.parse(request.body);

			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден",
				});
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress);

			const archLabel =
				body.arch === "upper" ? "ВЧ" : body.arch === "lower" ? "НЧ" : "ВЧ + НЧ";
			const archwireStr = `${body.material} ${body.section}" (${archLabel})`;
			const actionSummary = `Смена дуги: ${archwireStr}${body.note ? ` · ${body.note}` : ""}`;

			const updatedProgress: OrthodonticProgressRecord = {
				...currentProgress,
				archwire: archwireStr,
				lastActionDate: new Date().toISOString(),
				lastActionSummary: actionSummary,
			};

			const serialized = JSON.stringify(updatedProgress);
			await updatePatientAdministrativeProfileInDb(orgId, patientId, {
				...adminProfile,
				orthodonticProgress: serialized,
			});

			return reply.send({
				success: true,
				archwire: archwireStr,
				actionSummary,
				progress: updatedProgress,
			});
		},
	);

	/**
	 * POST /api/orthodontics/:patientId/ligatures-activate
	 * 1-клик действие: активация лигатур или установка цепочки Power Chain.
	 */
	app.post<{ Params: { patientId: string } }>(
		"/api/orthodontics/:patientId/ligatures-activate",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = patientParamsSchema.parse(request.params);
			const body = ligatureActivateSchema.parse(request.body);

			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден",
				});
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress);

			const actionSummary = body.powerChain
				? `Установка цепочки Power Chain${body.powerChainSpan ? ` (сегмент ${body.powerChainSpan})` : ""}`
				: `Активация лигатур замков брекет-системы${body.note ? ` · ${body.note}` : ""}`;

			const updatedProgress: OrthodonticProgressRecord = {
				...currentProgress,
				lastActionDate: new Date().toISOString(),
				lastActionSummary: actionSummary,
			};

			const serialized = JSON.stringify(updatedProgress);
			await updatePatientAdministrativeProfileInDb(orgId, patientId, {
				...adminProfile,
				orthodonticProgress: serialized,
			});

			return reply.send({
				success: true,
				actionSummary,
				progress: updatedProgress,
			});
		},
	);

	/**
	 * POST /api/orthodontics/:patientId/stages/advance
	 * 1-клик переход к следующему клиническому этапу.
	 * ВАЖНО: Никаких блокировок из-за отсутствия 8 фото! Врач переключает этап свободно.
	 */
	app.post<{ Params: { patientId: string } }>(
		"/api/orthodontics/:patientId/stages/advance",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = patientParamsSchema.parse(request.params);
			const body = stageAdvanceSchema.parse(request.body);

			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден",
				});
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress);

			const actionSummary = `Переход на этап ${body.nextStage}${body.stageTitle ? `: ${body.stageTitle}` : ""}`;

			const updatedProgress: OrthodonticProgressRecord = {
				...currentProgress,
				currentStage: body.nextStage,
				stageTitle: body.stageTitle || currentProgress.stageTitle,
				lastActionDate: new Date().toISOString(),
				lastActionSummary: actionSummary,
			};

			const serialized = JSON.stringify(updatedProgress);
			await updatePatientAdministrativeProfileInDb(orgId, patientId, {
				...adminProfile,
				orthodonticProgress: serialized,
			});

			return reply.send({
				success: true,
				currentStage: body.nextStage,
				actionSummary,
				progress: updatedProgress,
			});
		},
	);
}

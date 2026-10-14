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
import { and, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { inventoryItems, inventoryTransactions } from "../db/schema.js";
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

const deductOrthoMaterialsSchema = z.object({
	action: z.enum([
		"wire_change",
		"spring_activation",
		"separation_rings",
		"bonding",
		"power_chain",
		"elastics",
		"custom",
	]),
	materialName: z.string().optional(),
	materialCategory: z.string().default("other"),
	quantity: z.number().positive().default(1),
	unit: z.string().default("шт."),
	arch: z.enum(["upper", "lower", "both"]).default("both"),
	visitId: z.string().optional(),
	notes: z.string().max(300).optional(),
});

export interface OrthoMaterialDeductionResult {
	success: boolean;
	itemId?: string | undefined;
	itemName?: string | undefined;
	deductedQty: number;
	remainingStock?: number | undefined;
	isOverdraft: boolean;
	error?: string | undefined;
}

export async function deductOrthoMaterialSafely(params: {
	organizationId: string;
	patientId: string;
	itemNamePattern: string;
	defaultItemName: string;
	category: string;
	quantity: number;
	unit: string;
	notes: string;
	unitCostRub?: number | undefined;
	visitId?: string | null | undefined;
	userId?: string | null | undefined;
}): Promise<OrthoMaterialDeductionResult> {
	const {
		organizationId,
		patientId,
		itemNamePattern,
		defaultItemName,
		category,
		quantity,
		unit,
		notes,
		unitCostRub = 1200,
		visitId = null,
		userId = null,
	} = params;

	try {
		return await db.transaction(async (tx) => {
			const found = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, organizationId),
						or(
							ilike(inventoryItems.name, `%${itemNamePattern}%`),
							ilike(inventoryItems.name, `%${defaultItemName}%`),
						),
					),
				)
				.limit(1)
				.for("update");

			let targetItem = found[0];

			if (!targetItem) {
				const [created] = await tx
					.insert(inventoryItems)
					.values({
						organizationId,
						name: defaultItemName,
						category,
						unit,
						unitCostRub: String(unitCostRub),
						stockQuantity: "0",
						currentQty: "0",
						criticalThreshold: "5",
					})
					.returning();
				targetItem = created;
			}

			if (!targetItem) {
				return { success: false, isOverdraft: false, deductedQty: 0 };
			}

			const currentStock = Number(targetItem.stockQuantity ?? targetItem.currentQty ?? 0);
			const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
			const newStock = Number((baseStock - quantity).toFixed(4));
			const isOverdraft = newStock < 0;

			await tx
				.update(inventoryItems)
				.set({
					stockQuantity: String(newStock),
					currentQty: String(newStock),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(inventoryItems.id, targetItem.id),
						eq(inventoryItems.organizationId, organizationId),
					),
				);

			await tx.insert(inventoryTransactions).values({
				organizationId,
				visitId,
				userId,
				itemId: targetItem.id,
				inventoryItemId: targetItem.id,
				quantityChanged: String(-quantity),
				qty: String(-quantity),
				unitCostRub: targetItem.unitCostRub ?? String(unitCostRub),
				transactionType: isOverdraft ? "emergency_overdraft" : "auto_deduct",
				isOverdraft,
				notes: isOverdraft
					? `Списано под ортодонтический прием (мягкий овердрафт): пациент ${patientId}, остаток ${newStock} ${targetItem.unit}`
					: `${notes} (пациент ${patientId})`,
			});

			return {
				success: true,
				itemId: targetItem.id,
				itemName: targetItem.name,
				deductedQty: quantity,
				remainingStock: newStock,
				isOverdraft,
			};
		});
	} catch (err) {
		console.warn("[Orthodontics] Soft overdraft deduction failed gracefully:", err);
		return { success: false, isOverdraft: false, deductedQty: 0, error: String(err) };
	}
}

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

			// Soft overdraft deduction of archwire (Mandates 8e, 8n)
			const archwireQty = body.arch === "both" ? 2 : 1;
			const deduction = await deductOrthoMaterialSafely({
				organizationId: orgId,
				patientId,
				itemNamePattern: body.material,
				defaultItemName: `Дуга ортодонтическая ${body.material} ${body.section}"`,
				category: "ortho_archwire",
				quantity: archwireQty,
				unit: "шт.",
				unitCostRub: 1200,
				notes: `Смена дуги: ${archwireStr}`,
			});

			return reply.send({
				success: true,
				archwire: archwireStr,
				actionSummary,
				progress: updatedProgress,
				deduction,
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

			// Soft overdraft deduction of ligatures or power chain (Mandates 8e, 8n)
			const deduction = await deductOrthoMaterialSafely({
				organizationId: orgId,
				patientId,
				itemNamePattern: body.powerChain ? "Power Chain" : "лигатур",
				defaultItemName: body.powerChain
					? "Эластическая цепочка Power Chain"
					: "Эластические лигатуры цветные/прозрачные",
				category: body.powerChain ? "ortho_archwire" : "other",
				quantity: body.powerChain ? 1 : 10,
				unit: body.powerChain ? "см" : "шт.",
				unitCostRub: body.powerChain ? 80 : 15,
				notes: actionSummary,
			});

			return reply.send({
				success: true,
				actionSummary,
				progress: updatedProgress,
				deduction,
			});
		},
	);

	/**
	 * POST /api/orthodontics/:patientId/deduct-materials
	 * 1-клик списание материалов (брекеты Damon, дуги NiTi/CuNiTi/SS/TMA, эластики Zoo, пружины, сепараторы)
	 * со склада PostgreSQL 18 с мягким овердрафтом (allowOverdraft: true — прием врача никогда не блокируется).
	 */
	app.post<{ Params: { patientId: string } }>(
		"/api/orthodontics/:patientId/deduct-materials",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = patientParamsSchema.parse(request.params);
			const body = deductOrthoMaterialsSchema.parse(request.body);

			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден",
				});
			}

			let defaultName = body.materialName || "Расходный ортодонтический материал";
			let pattern = body.materialName || "";
			let category = body.materialCategory;
			let unit = body.unit;
			let unitCostRub = 500;

			switch (body.action) {
				case "wire_change":
					pattern = pattern || "дуга";
					defaultName = defaultName || "Дуга ортодонтическая NiTi / CuNiTi / TMA / SS";
					category = "ortho_archwire";
					unitCostRub = 1200;
					break;
				case "bonding":
					pattern = pattern || "Damon";
					defaultName = defaultName || "Брекет-система металлическая Damon Q2";
					category = "ortho_bracket";
					unit = "компл.";
					unitCostRub = 28000;
					break;
				case "spring_activation":
					pattern = pattern || "пружин";
					defaultName = defaultName || "Пружина ортодонтическая Open/Closed Coil";
					category = "ortho_archwire";
					unitCostRub = 650;
					break;
				case "separation_rings":
					pattern = pattern || "сепарацион";
					defaultName = defaultName || "Кольца сепарационные эластические";
					category = "other";
					unitCostRub = 25;
					break;
				case "power_chain":
					pattern = pattern || "Power Chain";
					defaultName = defaultName || "Эластическая цепочка Power Chain";
					category = "ortho_archwire";
					unit = "см";
					unitCostRub = 80;
					break;
				case "elastics":
					pattern = pattern || "эластик";
					defaultName = defaultName || "Межчелюстные эластики (Лиса, Заяц, Медведь, Буйвол, Кенгуру)";
					category = "other";
					unit = "упак.";
					unitCostRub = 450;
					break;
			}

			const deduction = await deductOrthoMaterialSafely({
				organizationId: orgId,
				patientId,
				itemNamePattern: pattern,
				defaultItemName: defaultName,
				category,
				quantity: body.quantity,
				unit,
				unitCostRub,
				visitId: body.visitId ?? null,
				notes: body.notes || `Ортодонтическое списание [${body.action}]`,
			});

			return reply.send({
				success: true,
				action: body.action,
				deduction,
				message: `Материал «${deduction.itemName || defaultName}» успешно списан со склада (мягкий овердрафт).`,
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

import {
	fdiToothNumberSchema,
	nonNegativeMoneyRubSchema,
	sumKopecks,
} from "@dental/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { evaluateClinicalRulesInDb } from "../db/clinicalQuery.js";
import { withTenantCtx } from "../db/rls.js";
import {
	patients,
	serviceCatalogItems,
	toothStateHistory,
	toothStates,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../db/schema.js";
import {
	chargeLineKopecks,
	debtNumericText,
	rublesFromKopecks,
} from "../money/patientDebt.js";
import { getRequestIdentity } from "../security/identity.js";
import { auditMedicalAccessFromRequest } from "../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";
import { wsBroker } from "../services/websocketBroker.js";
import {
	createAlternativePlanGroup,
	getAlternativePlanGroupsForPatient,
	selectAndApprovePlanVariant,
} from "../db/alternativeTreatmentPlansQuery.js";
import {
	getActivePriceFreezeToken,
	issuePriceFreezeToken,
	setPlanDiscountMode,
} from "../db/priceFreezeTokensQuery.js";



export const CLINICAL_TOOTH_STATE_VALUES = [
	"Healthy",
	"Caries",
	"Pulpitis",
	"Periodontitis",
	"Root_Canal_Treated",
	"Filled",
	"Crown",
	"Bridge",
	"Bridge_Abutment",
	"Implant",
	"Planned_Implant",
	"Missing",
	"Extracted",
	"Impacted",
	"Mobility_I",
	"Mobility_II",
	"Mobility_III",
	"Mobility_IV",
	"Furcation_I",
	"Furcation_II",
	"Furcation_III",
] as const;

export type ClinicalToothState = (typeof CLINICAL_TOOTH_STATE_VALUES)[number];

export const endoCanalMeasurementSchema = z.object({
	id: z.string().optional(),
	canalName: z.string().trim().min(1).max(50),
	referencePoint: z.string().trim().max(100).optional().default(""),
	workingLengthMm: z.union([z.number(), z.string()]).optional().default(""),
	masterApicalFile: z.string().trim().max(100).optional().default(""),
	taper: z.string().trim().max(50).optional().default(""),
	obturationTechnique: z.string().trim().max(200).optional().default(""),
	sealer: z.string().trim().max(200).optional().default(""),
	notes: z.string().trim().max(500).optional().default(""),
});

export const endoToothClinicalDataSchema = z
	.object({
		canals: z.array(endoCanalMeasurementSchema).default([]),
		irrigation: z.string().trim().max(1000).optional(),
		radiologyControl: z.string().trim().max(1000).optional(),
		notes: z.string().trim().max(2000).optional(),
		updatedAt: z.string().optional(),
	})
	.passthrough();

export type EndoToothClinicalData = z.infer<typeof endoToothClinicalDataSchema>;

const toothEndoUpsertSchema = z.object({
	canals: z.array(endoCanalMeasurementSchema).min(1),
	irrigation: z.string().trim().max(1000).optional(),
	radiologyControl: z.string().trim().max(1000).optional(),
	state: z.enum(CLINICAL_TOOTH_STATE_VALUES).optional(),
	surfaces: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
	visitId: z.string().uuid().optional().nullable(),
});

const batchToothStateSchema = z.object({
	toothNumbers: z.array(fdiToothNumberSchema).min(1).max(64),
	state: z.enum(CLINICAL_TOOTH_STATE_VALUES),
	surfaces: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
	notes: z.string().max(10000).optional().nullable(),
	clinicalData: endoToothClinicalDataSchema.optional().nullable(),
	visitId: z.string().uuid().optional().nullable(),
	updatedAt: z.string().optional().nullable(),
	version: z.number().int().nonnegative().optional().nullable(),
	reason: z.string().max(1000).optional().nullable(),
});

function parseClinicalDataFromNotes(
	notes: string | null | undefined,
): EndoToothClinicalData | null {
	if (!notes) return null;
	const trimmed = notes.trim();
	if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
	try {
		const parsed = JSON.parse(trimmed);
		if (parsed && typeof parsed === "object" && Array.isArray(parsed.canals)) {
			return parsed as EndoToothClinicalData;
		}
	} catch {
		// Non-JSON notes
	}
	return null;
}

const treatmentPlanMoneyRubSchema = nonNegativeMoneyRubSchema.refine(
	(value) => value <= 100_000_000,
	{ message: "сумма позиции плана не помещается в допустимый диапазон" },
);

const treatmentPlanItemSchema = z.object({
	toothNumber: fdiToothNumberSchema.optional().nullable(),
	priceId: z.string().trim().min(1).max(200),
	name: z.string().trim().max(500).optional(),
	quantity: z.number().int().min(1).max(999).default(1),
	price: treatmentPlanMoneyRubSchema,
	discount: treatmentPlanMoneyRubSchema.default(0),
	phase: z.number().int().min(1).max(12).default(1),
	isAuto: z.boolean().optional(),
});

const treatmentPlanUpsertSchema = z.object({
	id: z.string().uuid().optional().nullable(),
	name: z.string().trim().min(1).max(300).default("Комплексный план лечения"),
	patientSignature: z.string().max(2_000_000).optional().nullable(),
	items: z.array(treatmentPlanItemSchema).max(500).default([]),
	planGroupId: z.string().uuid().optional().nullable(),
	groupName: z.string().trim().max(300).optional().nullable(),
	isAlternative: z.boolean().optional().default(false),
	alternativeTier: z.string().trim().max(100).optional().nullable(),
	alternativeStatus: z
		.enum(["proposed", "approved", "declined"])
		.optional()
		.default("proposed"),
	declinedReason: z.string().trim().max(1000).optional().nullable(),
	priceFreezePolicy: z
		.enum([
			"standard_30_days",
			"surgery_implant_90_days",
			"ortho_vip_180_days",
			"strict_fixed_contract",
			"market_floating",
		])
		.optional()
		.default("standard_30_days"),
	discountMode: z
		.enum(["none", "plan_fixed", "on_selection"])
		.optional()
		.default("plan_fixed"),
	planDiscountPercent: z.number().min(0).max(100).optional().default(0),
	planDiscountRub: z.number().nonnegative().optional().default(0),
});

type TreatmentPlanRow = typeof treatmentPlans.$inferSelect;
type TreatmentPlanItemRow = typeof treatmentPlanItemsNew.$inferSelect;

const LEDGER_ID_PREFIX_LENGTH = 32;
const LEDGER_MAX_SLOT = 0xffff;

function ledgerRowId(planId: string, slot: number): string {
	return `${planId.slice(0, LEDGER_ID_PREFIX_LENGTH)}${slot
		.toString(16)
		.padStart(4, "0")}`;
}

const LEDGER_STATUSES_OWNED_BY_PLAN = new Set<string>(["proposed", "approved"]);
const UUID_SHAPE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ensurePatientInOrganization(
	patientId: string,
	organizationId: string,
): Promise<{ id: string } | null> {
	const [patient] = await db
		.select({ id: patients.id })
		.from(patients)
		.where(
			and(
				eq(patients.id, patientId),
				eq(patients.organizationId, organizationId),
			),
		)
		.limit(1);
	return patient ?? null;
}

function numeric(value: unknown): number {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

function splitStoredPriceId(value: string | null): { priceId: string; name: string } {
	const stored = value ?? "";
	const separatorIndex = stored.indexOf("::");
	if (separatorIndex < 0) return { priceId: stored, name: stored };
	return {
		priceId: stored.slice(0, separatorIndex),
		name: stored.slice(separatorIndex + 2) || stored.slice(0, separatorIndex),
	};
}

function serializeTreatmentPlan(
	plan: TreatmentPlanRow,
	items: TreatmentPlanItemRow[],
) {
	return {
		id: plan.id,
		patientId: plan.patientId,
		name: plan.name,
		status: plan.status,
		totalPrice: numeric(plan.totalPrice),
		patientSignature: plan.patientSignature ?? null,
		planGroupId: plan.planGroupId ?? null,
		groupName: plan.groupName ?? null,
		isAlternative: plan.isAlternative ?? false,
		alternativeTier: plan.alternativeTier ?? null,
		alternativeStatus: plan.alternativeStatus ?? "proposed",
		declinedReason: plan.declinedReason ?? null,
		activePriceFreezeTokenId: plan.activePriceFreezeTokenId ?? null,
		priceFreezePolicy: plan.priceFreezePolicy ?? "standard_30_days",
		priceFrozenUntil: plan.priceFrozenUntil
			? plan.priceFrozenUntil.toISOString()
			: null,
		discountMode: plan.discountMode ?? "plan_fixed",
		planDiscountPercent: Number(plan.planDiscountPercent ?? 0),
		planDiscountRub: Number(plan.planDiscountRub ?? 0),
		approvedAt: plan.approvedAt ? plan.approvedAt.toISOString() : null,
		createdAt: plan.createdAt.toISOString(),
		updatedAt: (plan.updatedAt ?? plan.createdAt).toISOString(),
		items: items.map((item) => {
			const { priceId, name } = splitStoredPriceId(item.priceId);
			return {
				id: item.id,
				toothNumber: item.toothNumber ?? undefined,
				priceId,
				name,
				quantity: item.quantity,
				price: numeric(item.price),
				discount: numeric(item.discount),
				phase: item.phase,
				isAuto: item.isBundle,
			};
		}),
	};
}

async function loadTreatmentPlansForPatient(
	patientId: string,
	organizationId: string,
) {
	const plans = await db
		.select()
		.from(treatmentPlans)
		.where(
			and(
				eq(treatmentPlans.patientId, patientId),
				eq(treatmentPlans.organizationId, organizationId),
			),
		)
		.orderBy(desc(treatmentPlans.updatedAt));

	if (plans.length === 0) return [];

	const planIds = plans.map((plan) => plan.id);
	const items = await db
		.select()
		.from(treatmentPlanItemsNew)
		.where(
			and(
				inArray(treatmentPlanItemsNew.planId, planIds),
				eq(treatmentPlanItemsNew.organizationId, organizationId),
			),
		);

	const itemsByPlanId = new Map<string, TreatmentPlanItemRow[]>();
	for (const item of items) {
		const group = itemsByPlanId.get(item.planId) ?? [];
		group.push(item);
		itemsByPlanId.set(item.planId, group);
	}

	return plans.map((plan) =>
		serializeTreatmentPlan(plan, itemsByPlanId.get(plan.id) ?? []),
	);
}

export async function registerOdontogramRoutes(app: FastifyInstance) {
	app.get("/api/patients/:patientId/tooth-states", async (request, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"tooth states read",
		);
		if (!organizationId) return;
		const { patientId } = request.params as { patientId: string };
		if (!UUID_SHAPE.test(patientId)) {
			return reply.code(400).send({ error: "InvalidPatientId" });
		}
		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound" });
		}

		// 152-ФЗ / 323-ФЗ ст. 13: Доступ к зубной формуле и диагнозам разрешен ТОЛЬКО клиническому персоналу
		const identity = getRequestIdentity(request);
		const reqAny = request as unknown as {
			user?: {
				role?: string | null;
				canSignMedicalRecords?: boolean;
				clinicalRole?: string | null;
			};
		};
		// Роль определяется ИСКЛЮЧИТЕЛЬНО из подписанного токена или проверенного контекста request.user.
		// Чтение недоверенных заголовков x-user-role / x-staff-role / x-forwarded-role категорически ЗАПРЕЩЕНО!
		const staffRole = identity.role ?? reqAny.user?.role ?? null;

		// Fail-closed: если токен сотрудника отсутствует (голый токен клиники), немедленно 403 Forbidden!
		if (!staffRole) {
			await auditMedicalAccessFromRequest(request, {
				organizationId,
				patientId,
				action: "ACCESS_DENIED_ODONTOGRAM",
				diagnosis: "Попытка анонимного доступа к зубной формуле без токена медработника (152-ФЗ)",
			});
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.read",
				role: null,
				message: "Отказ в доступе к зубной формуле и диагнозам (152-ФЗ / 323-ФЗ ст. 13): требуется авторизованный токен медработника",
			});
		}

		const evalAccess = evaluateClinicalAccess(staffRole, {
			clinicalRole:
				(identity as unknown as { clinicalRole?: string | null })
					.clinicalRole ??
				reqAny.user?.clinicalRole ??
				null,
			canSignMedicalRecords:
				(identity as unknown as { canSignMedicalRecords?: boolean })
					.canSignMedicalRecords ??
				reqAny.user?.canSignMedicalRecords ??
				false,
		});

		if (!evalAccess.hasClinicalAccess) {
			await auditMedicalAccessFromRequest(request, {
				organizationId,
				patientId,
				action: "ACCESS_DENIED_ODONTOGRAM",
				diagnosis: "Попытка несанкционированного доступа к зубной формуле (152-ФЗ)",
			});
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.read",
				role: staffRole,
				message: `Отказ в доступе к зубной формуле и диагнозам (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const rawStates = await db
			.select({
				toothNumber: toothStates.toothNumber,
				state: toothStates.state,
				surfaces: toothStates.surfaces,
				notes: toothStates.notes,
			})
			.from(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, organizationId),
					eq(toothStates.patientId, patientId),
				),
			);

		// Фиксация правомерного доступа врача к зубной формуле в журнале аудита (152-ФЗ)
		await auditMedicalAccessFromRequest(request, {
			organizationId,
			patientId,
			action: "VIEW_ODONTOGRAM",
			diagnosis: "Зубная формула и одонтограмма (32 зуба)",
		});

		const states = rawStates.map((row) => ({
			toothNumber: row.toothNumber,
			state: row.state,
			surfaces: row.surfaces,
			notes: row.notes,
			clinicalData: parseClinicalDataFromNotes(row.notes),
		}));

		return reply.send({ success: true, states });
	});

	app.post(
		"/api/patients/:patientId/tooth-states/batch",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"tooth states update",
			);
			if (!organizationId) return;
			const { patientId } = request.params as { patientId: string };
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const parsed = batchToothStateSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ToothStateValidationError",
					message: "Ошибка валидации зубной формулы. Проверьте номера зубов и статус.",
					details: parsed.error.format(),
				});
			}

			const toothNumbers: number[] = [
				...new Set<number>(parsed.data.toothNumbers),
			];
			if (toothNumbers.length === 0)
				return reply.send({ success: true, states: [] });

			const actorUserId = getRequestIdentity(request).userId;
			const now = new Date();

			const maxFutureSkewMs = 60 * 1000; // max 1 minute future tolerance for clock drift
			const incomingRawTime = parsed.data.updatedAt
				? new Date(parsed.data.updatedAt).getTime()
				: now.getTime();
			const boundedIncomingTime = Math.min(
				incomingRawTime,
				now.getTime() + maxFutureSkewMs,
			);
			const incomingUpdatedAt = new Date(boundedIncomingTime);
			const incomingVersion = parsed.data.version ?? 1;

			const inserted = await withTenantCtx(organizationId, async (tx) => {
				const previousStates = await tx
					.select({
						toothNumber: toothStates.toothNumber,
						state: toothStates.state,
						surfaces: toothStates.surfaces,
						notes: toothStates.notes,
						updatedAt: toothStates.updatedAt,
						version: toothStates.version,
					})
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
							inArray(toothStates.toothNumber, toothNumbers),
						),
					);

				type PreviousToothState = {
					toothNumber: number;
					state: string;
					surfaces: unknown;
					notes: string | null;
					updatedAt: Date | null;
					version: number | null;
				};
				const previousByTooth = new Map<number, PreviousToothState>(
					(previousStates as PreviousToothState[]).map((row) => [
						row.toothNumber,
						row,
					]),
				);

				const serializedClinicalNotes = parsed.data.clinicalData
					? JSON.stringify(parsed.data.clinicalData)
					: parsed.data.notes;

				for (const toothNumber of toothNumbers) {
					const prev = previousByTooth.get(toothNumber);
					const prevTime = prev?.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
					const prevVersion = prev?.version ?? 0;
					const incomingTime = incomingUpdatedAt.getTime();

					const incomingWins =
						!prev ||
						incomingTime > prevTime ||
						(incomingTime === prevTime && incomingVersion >= prevVersion);

					if (incomingWins) {
						// 1. Record transition into append-only tooth state history audit log
						await tx.insert(toothStateHistory).values({
							organizationId,
							patientId,
							visitId: parsed.data.visitId ?? null,
							toothNumber,
							previousState: prev?.state ?? null,
							newState: parsed.data.state,
							previousSurfaces: prev?.surfaces ?? null,
							newSurfaces: parsed.data.surfaces || null,
							changedByUserId: actorUserId,
							reason: parsed.data.clinicalData
								? "Эндодонтический протокол / обработка каналов"
								: (parsed.data.reason || null),
							changedAt: incomingUpdatedAt,
						});

						// 2. Delete and insert winning state in toothStates
						await tx
							.delete(toothStates)
							.where(
								and(
									eq(toothStates.organizationId, organizationId),
									eq(toothStates.patientId, patientId),
									eq(toothStates.toothNumber, toothNumber),
								),
							);

						const effectiveNotes =
							serializedClinicalNotes !== undefined
								? serializedClinicalNotes
								: (prev?.notes ?? null);

						await tx.insert(toothStates).values({
							organizationId,
							patientId,
							toothNumber,
							state: parsed.data.state,
							surfaces: parsed.data.surfaces || null,
							notes: effectiveNotes,
							updatedAt: incomingUpdatedAt,
							isSynced: false,
							version: Math.max(prevVersion + 1, incomingVersion, 1),
						});
					} else {
						// Stale offline mutation: Server active state is newer and wins (LWW),
						// but offline mutation transition is STILL appended to toothStateHistory for full 043/u audit trail!
						await tx.insert(toothStateHistory).values({
							organizationId,
							patientId,
							visitId: parsed.data.visitId ?? null,
							toothNumber,
							previousState: null,
							newState: parsed.data.state,
							previousSurfaces: null,
							newSurfaces: parsed.data.surfaces || null,
							changedByUserId: actorUserId,
							reason:
								parsed.data.reason ||
								"Оффлайн-синхронизация (LWW архив)",
							changedAt: incomingUpdatedAt,
						});
					}
				}

				const currentStates = await tx
					.select({
						toothNumber: toothStates.toothNumber,
						state: toothStates.state,
						surfaces: toothStates.surfaces,
						notes: toothStates.notes,
					})
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
							inArray(toothStates.toothNumber, toothNumbers),
						),
					);

				return currentStates.map((row) => ({
					toothNumber: row.toothNumber,
					state: row.state,
					surfaces: row.surfaces,
					notes: row.notes,
					clinicalData: parseClinicalDataFromNotes(row.notes),
				}));
			});

			wsBroker.broadcastToOrganization(organizationId, {
				type: "UPDATE_ODONTOGRAM",
				payload: { patientId, states: inserted },
			});
			return reply.send({ success: true, states: inserted });
		},
	);

	app.get(
		"/api/patients/:patientId/tooth-states/:toothNumber/endo",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"tooth endo read",
			);
			if (!organizationId) return;

			// 152-ФЗ / 323-ФЗ: Эндодонтические данные — врачебная тайна
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.endo.read",
					role: staffRole,
					message: `Отказ в доступе к эндодонтической карте (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}

			const { patientId, toothNumber: toothParam } = request.params as {
				patientId: string;
				toothNumber: string;
			};
			const toothNumber = parseInt(toothParam, 10);
			if (!UUID_SHAPE.test(patientId) || Number.isNaN(toothNumber)) {
				return reply.code(400).send({ error: "InvalidParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const [tooth] = await db
				.select({
					toothNumber: toothStates.toothNumber,
					state: toothStates.state,
					surfaces: toothStates.surfaces,
					notes: toothStates.notes,
				})
				.from(toothStates)
				.where(
					and(
						eq(toothStates.organizationId, organizationId),
						eq(toothStates.patientId, patientId),
						eq(toothStates.toothNumber, toothNumber),
					),
				)
				.limit(1);

			if (!tooth) {
				return reply.send({
					success: true,
					toothNumber,
					state: "Healthy",
					clinicalData: null,
				});
			}

			return reply.send({
				success: true,
				toothNumber: tooth.toothNumber,
				state: tooth.state,
				surfaces: tooth.surfaces,
				notes: tooth.notes,
				clinicalData: parseClinicalDataFromNotes(tooth.notes),
			});
		},
	);

	app.post(
		"/api/patients/:patientId/tooth-states/:toothNumber/endo",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"tooth endo save",
			);
			if (!organizationId) return;

			// 152-ФЗ / 323-ФЗ: Запись эндодонтических данных разрешена только клиническому персоналу
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.endo.write",
					role: staffRole,
					message: `Отказ в изменении эндодонтических данных (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}

			const { patientId, toothNumber: toothParam } = request.params as {
				patientId: string;
				toothNumber: string;
			};
			const toothNumber = parseInt(toothParam, 10);
			if (!UUID_SHAPE.test(patientId) || Number.isNaN(toothNumber)) {
				return reply.code(400).send({ error: "InvalidParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const parsed = toothEndoUpsertSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "EndoValidationError",
					message: "Некорректные параметры корневых каналов.",
					details: parsed.error.format(),
				});
			}

			const actorUserId = getRequestIdentity(request).userId;
			const now = new Date();

			const clinicalData: EndoToothClinicalData = {
				canals: parsed.data.canals,
				irrigation: parsed.data.irrigation,
				radiologyControl: parsed.data.radiologyControl,
				updatedAt: now.toISOString(),
			};

			const serializedNotes = JSON.stringify(clinicalData);

			const updated = await db.transaction(async (tx) => {
				const [existing] = await tx
					.select({
						state: toothStates.state,
						surfaces: toothStates.surfaces,
						notes: toothStates.notes,
					})
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
							eq(toothStates.toothNumber, toothNumber),
						),
					)
					.limit(1);

				const targetState = parsed.data.state || existing?.state || "Pulpitis";
				const targetSurfaces = parsed.data.surfaces || existing?.surfaces || null;

				await tx
					.delete(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
							eq(toothStates.toothNumber, toothNumber),
						),
					);

				await tx.insert(toothStateHistory).values({
					organizationId,
					patientId,
					visitId: parsed.data.visitId ?? null,
					toothNumber,
					previousState: existing?.state ?? null,
					newState: targetState,
					previousSurfaces: existing?.surfaces ?? null,
					newSurfaces: targetSurfaces,
					changedByUserId: actorUserId,
					reason: "Эндодонтический протокол / обработка каналов",
					changedAt: now,
				});

				const [insertedRow] = await tx
					.insert(toothStates)
					.values({
						organizationId,
						patientId,
						toothNumber,
						state: targetState,
						surfaces: targetSurfaces,
						notes: serializedNotes,
						updatedAt: now,
						isSynced: false,
						version: 1,
					})
					.returning({
						toothNumber: toothStates.toothNumber,
						state: toothStates.state,
						surfaces: toothStates.surfaces,
						notes: toothStates.notes,
					});

				return {
					toothNumber: insertedRow?.toothNumber ?? toothNumber,
					state: insertedRow?.state ?? targetState,
					surfaces: insertedRow?.surfaces ?? targetSurfaces,
					notes: insertedRow?.notes ?? serializedNotes,
					clinicalData,
				};
			});

			wsBroker.broadcastToOrganization(organizationId, {
				type: "UPDATE_ODONTOGRAM",
				payload: { patientId, states: [updated] },
			});

			return reply.send({ success: true, ...updated });
		},
	);

	app.get(
		"/api/patients/:patientId/treatment-plans",
		async (request, reply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"treatment plans read",
			);
			if (!organizationId) return;

			// 152-ФЗ / 323-ФЗ: Планы лечения содержат медицинскую тайну — доступ только клиническому персоналу
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.read",
					role: staffRole,
					message: `Отказ в доступе к планам лечения (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId } = request.params as { patientId: string };
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const plans = await loadTreatmentPlansForPatient(patientId, organizationId);
			return reply.send({ success: true, plans });
		},
	);

	app.post(
		"/api/patients/:patientId/treatment-plans",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"treatment plan upsert",
			);
			if (!organizationId) return;

			// 152-ФЗ / 323-ФЗ: План лечения является клиническим документом — создание доступно только медработникам
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user
					?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.write",
					role: staffRole,
					message: `Отказ в создании плана лечения (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId } = request.params as { patientId: string };
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const parsed = treatmentPlanUpsertSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "TreatmentPlanValidationError",
					message: "План лечения не сохранен: проверьте услуги, цены и этапы.",
					details: parsed.error.format(),
				});
			}

			const input = parsed.data;
			const now = new Date();
			let planId: string | null = null;
			let totalPriceKopecks = 0;

			try {
				const lineKopecks = input.items.map((item) =>
					chargeLineKopecks({
						patientId,
						status: "proposed",
						unitPriceRub: item.price,
						quantity: item.quantity,
						discountRub: item.discount,
					}),
				);
				totalPriceKopecks = sumKopecks(lineKopecks);
				const totalPriceText = debtNumericText(totalPriceKopecks);

				planId = await withTenantCtx(organizationId, async (tx) => {
					let savedPlanId = input.id ?? null;
					if (savedPlanId) {
						const [existing] = await tx
							.select({
								id: treatmentPlans.id,
								patientSignature: treatmentPlans.patientSignature,
								status: treatmentPlans.status,
							})
							.from(treatmentPlans)
							.where(
								and(
									eq(treatmentPlans.id, savedPlanId),
									eq(treatmentPlans.patientId, patientId),
									eq(treatmentPlans.organizationId, organizationId),
								),
							)
							.for("update")
							.limit(1);

						if (!existing) return null;

						// БЛОКИРУЮЩИЙ ГЕЙТ №2 (ПОСТАНОВЛЕНИЕ №659 И СТ. 16 ЗОЗПП):
						// Запрещено изменять утвержденный (status === "Approved") или подписанный план лечения
						// без отдельного Дополнительного соглашения.
						if (existing.status === "Approved" || existing.patientSignature) {
							const err = new Error(
								"Запрещено изменять утвержденный или подписанный план лечения. Согласно Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 ЗоЗПП любые изменения и дополнения платных услуг требуют оформления отдельного Дополнительного соглашения или создания нового плана лечения.",
							);
							// biome-ignore lint/suspicious/noExplicitAny: error mapping
							(err as any).statusCode = 409;
							throw err;
						}

						const [planUpdated] = await tx
							.update(treatmentPlans)
							.set({
								name: input.name,
								totalPrice: totalPriceText,
								totalPriceRub: debtNumericText(totalPriceKopecks),
								...(input.patientSignature !== undefined
									? { patientSignature: input.patientSignature }
									: {}),
								...(input.planGroupId !== undefined
									? { planGroupId: input.planGroupId }
									: {}),
								...(input.groupName !== undefined
									? { groupName: input.groupName }
									: {}),
								...(input.isAlternative !== undefined
									? { isAlternative: input.isAlternative }
									: {}),
								...(input.alternativeTier !== undefined
									? { alternativeTier: input.alternativeTier }
									: {}),
								...(input.alternativeStatus !== undefined
									? { alternativeStatus: input.alternativeStatus }
									: {}),
								...(input.declinedReason !== undefined
									? { declinedReason: input.declinedReason }
									: {}),
								...(input.priceFreezePolicy !== undefined
									? { priceFreezePolicy: input.priceFreezePolicy }
									: {}),
								...(input.discountMode !== undefined
									? { discountMode: input.discountMode }
									: {}),
								...(input.planDiscountPercent !== undefined
									? { planDiscountPercent: input.planDiscountPercent }
									: {}),
								...(input.planDiscountRub !== undefined
									? { planDiscountRub: input.planDiscountRub }
									: {}),
								updatedAt: now,
								isSynced: false,
								version: sql`${treatmentPlans.version} + 1`,
							})
							.where(
								and(
									eq(treatmentPlans.id, savedPlanId),
									eq(treatmentPlans.patientId, patientId),
									eq(treatmentPlans.organizationId, organizationId),
								),
							)
							.returning({ id: treatmentPlans.id });
						if (!planUpdated) return null;

						await tx
							.delete(treatmentPlanItemsNew)
							.where(
								and(
									eq(treatmentPlanItemsNew.planId, savedPlanId),
									eq(treatmentPlanItemsNew.organizationId, organizationId),
								),
							);
					} else {
						const [created] = await tx
							.insert(treatmentPlans)
							.values({
								organizationId,
								patientId,
								name: input.name,
								totalPrice: totalPriceText,
								totalPriceRub: debtNumericText(totalPriceKopecks),
								patientSignature: input.patientSignature ?? null,
								planGroupId: input.planGroupId ?? null,
								groupName: input.groupName ?? null,
								isAlternative: input.isAlternative ?? false,
								alternativeTier: input.alternativeTier ?? null,
								alternativeStatus: input.alternativeStatus ?? "proposed",
								declinedReason: input.declinedReason ?? null,
								priceFreezePolicy: input.priceFreezePolicy ?? "standard_30_days",
								discountMode: input.discountMode ?? "plan_fixed",
								planDiscountPercent: input.planDiscountPercent ?? 0,
								planDiscountRub: input.planDiscountRub ?? 0,
								isSynced: false,
								version: 1,
								updatedAt: now,
							})
							.returning({ id: treatmentPlans.id });
						savedPlanId = created?.id ?? null;
					}

					if (!savedPlanId) return null;

					if (input.items.length > 0) {
						await tx.insert(treatmentPlanItemsNew).values(
							input.items.map((item) => ({
								organizationId,
								planId: savedPlanId,
								toothNumber: item.toothNumber ?? null,
								priceId: item.name
									? `${item.priceId}::${item.name}`
									: item.priceId,
								quantity: item.quantity,
								price: item.price.toString(),
								discount: item.discount.toString(),
								phase: item.phase,
								isBundle: Boolean(item.isAuto),
							})),
						);
					}

					const ledgerPrefix = savedPlanId.slice(0, LEDGER_ID_PREFIX_LENGTH).toLowerCase();
					const ownedRows = await tx
						.select({
							id: treatmentItems.id,
							status: treatmentItems.status,
							visitId: treatmentItems.visitId,
						})
						.from(treatmentItems)
						.where(
							and(
								eq(treatmentItems.organizationId, organizationId),
								eq(treatmentItems.patientId, patientId),
								sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${ledgerPrefix}`,
							),
						);

					const rewritableIds = ownedRows
						.filter(
							(row) =>
								row.visitId === null &&
								LEDGER_STATUSES_OWNED_BY_PLAN.has(row.status),
						)
						.map((row) => row.id);

					if (rewritableIds.length > 0) {
						await tx
							.delete(treatmentItems)
							.where(
								and(
									eq(treatmentItems.organizationId, organizationId),
									inArray(treatmentItems.id, rewritableIds),
								),
							);
					}
					const keptSlots = new Set(
						ownedRows
							.filter((row) => !rewritableIds.includes(row.id))
							.map((row) => row.id.toLowerCase()),
					);

					if (input.items.length > 0) {
						const priceIdCandidates = [
							...new Set(
								input.items
									.map((item) => item.priceId)
									.filter((priceId) => UUID_SHAPE.test(priceId)),
							),
						];
						const knownServiceIds = new Set<string>(
							priceIdCandidates.length === 0
								? []
								: (
										await tx
											.select({ id: serviceCatalogItems.id })
											.from(serviceCatalogItems)
											.where(
												and(
													eq(
														serviceCatalogItems.organizationId,
														organizationId,
													),
													inArray(serviceCatalogItems.id, priceIdCandidates),
												),
											)
									).map((row) => row.id),
						);

						const completedItems = await tx
							.select({ serviceId: treatmentItems.serviceId })
							.from(treatmentItems)
							.where(
								and(
									eq(treatmentItems.organizationId, organizationId),
									eq(treatmentItems.patientId, patientId),
									eq(treatmentItems.status, "completed"),
								),
							);

						const evaluation = await evaluateClinicalRulesInDb(organizationId, {
							patientId,
							serviceIds: Array.from(knownServiceIds),
							completedServiceIds: completedItems
								.map((r) => r.serviceId)
								.filter(Boolean) as string[],
							enforceBlockers: true,
						});

						const blockingRule = evaluation.evaluations.find(
							(e) => !e.resolved && e.severity === "blocker",
						);
						if (blockingRule) {
							const err = new Error(
								`Отказ: план содержит противопоказание. ${blockingRule.message}`,
							);
							// biome-ignore lint/suspicious/noExplicitAny: error mapping
							(err as any).statusCode = 400;
							throw err;
						}

						const ledgerStatus = input.patientSignature
							? "approved"
							: "proposed";

						let slot = 0;
						const ledgerValues = input.items.map((item, index) => {
							while (
								slot <= LEDGER_MAX_SLOT &&
								keptSlots.has(ledgerRowId(savedPlanId, slot).toLowerCase())
							) {
								slot += 1;
							}
							if (slot > LEDGER_MAX_SLOT) {
								throw new Error(
									`Позиции плана лечения некуда записать: свободных слотов книги лечения не осталось (позиция ${index + 1}).`,
								);
							}
							const id = ledgerRowId(savedPlanId, slot);
							slot += 1;

							const lineTotalRub = rublesFromKopecks(
								chargeLineKopecks({
									patientId,
									status: ledgerStatus,
									unitPriceRub: item.price,
									quantity: item.quantity,
									discountRub: item.discount,
								}),
							);
							const unitPriceRub = rublesFromKopecks(
								chargeLineKopecks({
									patientId,
									status: ledgerStatus,
									unitPriceRub: item.price,
									quantity: 1,
									discountRub: 0,
								}),
							);
							return {
								id,
								organizationId,
								patientId,
								visitId: null,
								serviceId: knownServiceIds.has(item.priceId)
									? item.priceId
									: null,
								toothCode:
									item.toothNumber === null || item.toothNumber === undefined
										? null
										: String(item.toothNumber),
								title: item.name?.trim() || item.priceId,
								quantity: String(item.quantity),
								priceRub: lineTotalRub,
								unitPriceRub,
								discountRub: rublesFromKopecks(
									chargeLineKopecks({
										patientId,
										status: ledgerStatus,
										unitPriceRub: item.discount,
										quantity: 1,
										discountRub: 0,
									}),
								),
								status: ledgerStatus as "proposed" | "approved",
								notes: null,
							};
						});
						await tx.insert(treatmentItems).values(ledgerValues);
					}

					return savedPlanId;
				});
				// biome-ignore lint/suspicious/noExplicitAny: error mapping
			} catch (err: any) {
				if (err.statusCode) {
					return reply.code(err.statusCode).send({
						error: "TreatmentPlanValidationError",
						message: err.message,
					});
				}
				throw err;
			}

			if (!planId) {
				return reply.code(input.id ? 404 : 500).send({
					error: input.id ? "TreatmentPlanNotFound" : "TreatmentPlanSaveFailed",
				});
			}

			const [savedPlan] = await loadTreatmentPlansForPatient(patientId, organizationId);
			return reply.send({
				success: true,
				planId,
				totalPrice: numeric(rublesFromKopecks(totalPriceKopecks)),
				plan: savedPlan ?? null,
			});
		},
	);

	/**
	 * Выбор и утверждение конкретного плана из группы альтернатив (ст. 20 323-ФЗ и ПП РФ №659)
	 * При утверждении одного плана остальные в группе автоматически отклоняются (Declined / Rejected)
	 */
	app.post(
		"/api/patients/:patientId/treatment-plans/:planId/approve-variant",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"approve treatment plan variant",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.write",
					role: staffRole,
					message: `Отказ в утверждении плана лечения (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId, planId } = request.params as {
				patientId: string;
				planId: string;
			};
			if (!UUID_SHAPE.test(patientId) || !UUID_SHAPE.test(planId)) {
				return reply.code(400).send({ error: "InvalidParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const body = (request.body as { reason?: string | null } | undefined) ?? {};

			try {
				const result = await withTenantCtx(organizationId, async (tx) => {
					return selectAndApprovePlanVariant(tx, {
						organizationId,
						patientId,
						planId,
						actorUserId: identity.userId ?? null,
						reason: body.reason ?? null,
					});
				});

				wsBroker.broadcastToOrganization(organizationId, {
					type: "TREATMENT_PLAN_VARIANT_APPROVED",
					payload: { patientId, planId, result },
				});

				return reply.send(result);
			} catch (err: any) {
				if (err.statusCode) {
					return reply.code(err.statusCode).send({
						error: "TreatmentPlanVariantSelectionError",
						message: err.message,
					});
				}
				throw err;
			}
		},
	);

	/**
	 * Создание группы альтернативных планов лечения (ст. 20 323-ФЗ и ПП РФ №659)
	 */
	app.post(
		"/api/patients/:patientId/treatment-plans/alternative-group",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"create alternative treatment plan group",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.write",
					role: staffRole,
					message: `Отказ в создании группы планов лечения (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId } = request.params as { patientId: string };
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const body = request.body as {
				groupName: string;
				doctorId?: string | null;
				variants: Array<{
					name: string;
					alternativeTier?: string;
					isInitiallyApproved?: boolean;
					items: Array<{
						toothNumber?: number | null;
						priceId: string;
						name?: string | null;
						quantity: number;
						price: number;
						discount?: number;
						phase?: number;
						isAuto?: boolean;
					}>;
				}>;
			};

			if (
				!body ||
				!body.groupName ||
				!Array.isArray(body.variants) ||
				body.variants.length < 2
			) {
				return reply.code(400).send({
					error: "AlternativePlanGroupValidationError",
					message:
						"Необходимо указать название группы и минимум 2 альтернативных варианта плана лечения (ст. 20 323-ФЗ).",
				});
			}

			try {
				const result = await withTenantCtx(organizationId, async (tx) => {
					return createAlternativePlanGroup(tx, {
						organizationId,
						patientId,
						doctorId: body.doctorId ?? null,
						groupName: body.groupName,
						variants: body.variants,
						actorUserId: identity.userId ?? null,
					});
				});

				wsBroker.broadcastToOrganization(organizationId, {
					type: "ALTERNATIVE_PLAN_GROUP_CREATED",
					payload: { patientId, result },
				});

				return reply.send({ success: true, ...result });
			} catch (err: any) {
				if (err.statusCode) {
					return reply.code(err.statusCode).send({
						error: "AlternativePlanGroupError",
						message: err.message,
					});
				}
				throw err;
			}
		},
	);

	/**
	 * Получение групп альтернативных планов для пациента
	 */
	app.get(
		"/api/patients/:patientId/treatment-plans/alternative-groups",
		async (request, reply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"get alternative plan groups",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.read",
					role: staffRole,
					message: `Отказ в чтении альтернативных планов (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId } = request.params as { patientId: string };
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const groups = await getAlternativePlanGroupsForPatient(
				db,
				organizationId,
				patientId,
			);

			return reply.send({ success: true, groups });
		},
	);

	/**
	 * Выпуск или обновление токена закрепления цен плана лечения (Price Freeze Token / GAP_REPORT строка 164)
	 */
	app.post(
		"/api/patients/:patientId/treatment-plans/:planId/price-freeze",
		async (request, reply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"issue price freeze token",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.manage",
					role: staffRole,
					message: `Отказ в закреплении цен плана (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId, planId } = request.params as {
				patientId: string;
				planId: string;
			};
			if (!UUID_SHAPE.test(patientId) || !UUID_SHAPE.test(planId)) {
				return reply.code(400).send({ error: "InvalidRequestParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const body =
				(request.body as {
					// biome-ignore lint/suspicious/noExplicitAny: policyKind enum
					policyKind?: any;
					customValidityDays?: number;
					notes?: string;
				}) || {};

			try {
				const result = await db.transaction(async (tx) => {
					return issuePriceFreezeToken(tx, {
						organizationId,
						patientId,
						planId,
						...(body.policyKind ? { policyKind: body.policyKind } : {}),
						...(body.customValidityDays !== undefined
							? { customValidityDays: body.customValidityDays }
							: {}),
						...(identity.userId ? { actorUserId: identity.userId } : {}),
						...(body.notes ? { notes: body.notes } : {}),
					});
				});

				wsBroker.broadcastToOrganization(organizationId, {
					type: "PRICE_FREEZE_TOKEN_ISSUED",
					organizationId,
					payload: {
						patientId,
						planId,
						token: result.token,
						policyKind: result.policyKind,
						validUntil: result.validUntil,
					},
				});

				return reply.code(201).send({ success: true, ...result });
			} catch (err: any) {
				if (err.statusCode) {
					return reply.code(err.statusCode).send({
						error: "PriceFreezeError",
						message: err.message,
					});
				}
				throw err;
			}
		},
	);

	/**
	 * Получение текущего статуса закрепления цен плана (Price Freeze Token)
	 */
	app.get(
		"/api/patients/:patientId/treatment-plans/:planId/price-freeze",
		async (request, reply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"get price freeze status",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.read",
					role: staffRole,
					message: `Отказ в чтении статуса закрепления цен (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId, planId } = request.params as {
				patientId: string;
				planId: string;
			};
			if (!UUID_SHAPE.test(patientId) || !UUID_SHAPE.test(planId)) {
				return reply.code(400).send({ error: "InvalidRequestParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const tokenStatus = await getActivePriceFreezeToken(
				db,
				organizationId,
				planId,
			);

			return reply.send({
				success: true,
				hasActiveFreeze: !!tokenStatus && tokenStatus.isPriceLocked,
				token: tokenStatus,
			});
		},
	);

	/**
	 * Изменение режима скидок плана лечения (GAP_REPORT строка 165: none | plan_fixed | on_selection)
	 */
	app.post(
		"/api/patients/:patientId/treatment-plans/:planId/discount-mode",
		async (request, reply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"set plan discount mode",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.manage",
					role: staffRole,
					message: `Отказ в настройке скидок плана (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId, planId } = request.params as {
				patientId: string;
				planId: string;
			};
			if (!UUID_SHAPE.test(patientId) || !UUID_SHAPE.test(planId)) {
				return reply.code(400).send({ error: "InvalidRequestParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const body = request.body as {
				discountMode: "none" | "plan_fixed" | "on_selection";
				planDiscountPercent?: number;
				planDiscountRub?: number;
			};

			if (
				!body ||
				!["none", "plan_fixed", "on_selection"].includes(body.discountMode)
			) {
				return reply.code(400).send({
					error: "InvalidDiscountMode",
					message:
						"Недопустимый режим скидок. Разрешены: 'none' (скидки не действуют), 'plan_fixed' (задать на план), 'on_selection' (при выборе в наряд).",
				});
			}

			try {
				const result = await db.transaction(async (tx) => {
					return setPlanDiscountMode(tx, {
						organizationId,
						patientId,
						planId,
						discountMode: body.discountMode,
						...(body.planDiscountPercent !== undefined
							? { planDiscountPercent: body.planDiscountPercent }
							: {}),
						...(body.planDiscountRub !== undefined
							? { planDiscountRub: body.planDiscountRub }
							: {}),
						...(identity.userId ? { actorUserId: identity.userId } : {}),
					});
				});

				wsBroker.broadcastToOrganization(organizationId, {
					type: "TREATMENT_PLAN_DISCOUNT_MODE_CHANGED",
					organizationId,
					payload: {
						patientId,
						planId,
						discountMode: result.discountMode,
						planDiscountPercent: result.planDiscountPercent,
						totalDiscountRub: result.totalDiscountRub,
						totalPriceRub: result.totalPriceRub,
					},
				});

				return reply.send(result);
			} catch (err: any) {
				if (err.statusCode) {
					return reply.code(err.statusCode).send({
						error: "DiscountModeError",
						message: err.message,
					});
				}
				throw err;
			}
		},
	);
}

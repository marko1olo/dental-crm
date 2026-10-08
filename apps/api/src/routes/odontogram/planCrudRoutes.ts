import { sumKopecks } from "@dental/shared";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { evaluateClinicalRulesInDb } from "../../db/clinicalQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	patients,
	serviceCatalogItems,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import {
	chargeLineKopecks,
	debtNumericText,
	rublesFromKopecks,
} from "../../money/patientDebt.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	ensurePatientInOrganization,
	ledgerRowId,
	loadTreatmentPlansForPatient,
	numeric,
	serializeTreatmentPlan,
	splitStoredPriceId,
} from "./planHelpers.js";
import {
	LEDGER_ID_PREFIX_LENGTH,
	LEDGER_MAX_SLOT,
	LEDGER_STATUSES_OWNED_BY_PLAN,
	UUID_SHAPE,
	treatmentPlanUpsertSchema,
} from "./types.js";

export function registerPlanCrudRoutes(app: FastifyInstance) {
	app.get(
		"/api/treatment-plans/:id",
		async (request, reply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"treatment plan read",
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
					message: `Отказ в доступе к плану лечения (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { id } = request.params as { id: string };
			if (!UUID_SHAPE.test(id)) {
				return reply.code(400).send({ error: "InvalidTreatmentPlanId" });
			}

			const [plan] = await db
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.id, id),
						eq(treatmentPlans.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!plan) {
				return reply.code(404).send({ error: "TreatmentPlanNotFound" });
			}

			const [patientRow] = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.id, plan.patientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);

			const items = await db
				.select()
				.from(treatmentPlanItemsNew)
				.where(
					and(
						eq(treatmentPlanItemsNew.planId, plan.id),
						eq(treatmentPlanItemsNew.organizationId, organizationId),
					),
				)
				.orderBy(treatmentPlanItemsNew.createdAt);

			const doctorIds = [
				...new Set(
					items
						.map((item) => item.doctorId)
						.filter((dId): dId is string => Boolean(dId)),
				),
			];
			const doctorsById = new Map<
				string,
				{ fullName: string; specialty: string | null }
			>();
			if (doctorIds.length > 0) {
				const docRows = await db
					.select({
						id: users.id,
						fullName: users.fullName,
						role: users.role,
						specialties: users.specialties,
					})
					.from(users)
					.where(
						and(
							eq(users.organizationId, organizationId),
							inArray(users.id, doctorIds),
						),
					);
				for (const doc of docRows) {
					const specList = Array.isArray(doc.specialties)
						? doc.specialties.join(", ")
						: null;
					doctorsById.set(doc.id, {
						fullName: doc.fullName,
						specialty:
							specList ||
							(doc.role === "doctor" ? "Врач-стоматолог" : doc.role),
					});
				}
			}

			const ledgerRows = await db
				.select({
					id: treatmentItems.id,
					status: treatmentItems.status,
					visitId: treatmentItems.visitId,
				})
				.from(treatmentItems)
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.patientId, plan.patientId),
					),
				);

			const ledgerMap = new Map<string, { status: string; visitId: string | null }>();
			for (const lr of ledgerRows) {
				ledgerMap.set(lr.id.toLowerCase(), { status: lr.status, visitId: lr.visitId });
			}

			const serialized = serializeTreatmentPlan(
				plan,
				items,
				doctorsById,
				ledgerMap,
			);

			const primaryDoctorId = doctorIds[0] ?? "";
			const primaryDoctor = primaryDoctorId ? doctorsById.get(primaryDoctorId) : undefined;

			const validationPayload = {
				planId: plan.id,
				planNumber: plan.id.slice(0, 8).toUpperCase(),
				planTitle: plan.name,
				patientId: plan.patientId,
				patientChartNumber: patientRow
					? patientRow.administrativeProfile?.insurancePolicyNumber ||
						`К-${patientRow.id.slice(0, 8).toUpperCase()}`
					: undefined,
				doctorId: primaryDoctorId,
				doctorFullName: primaryDoctor?.fullName ?? "Лечащий врач",
				createdAtIso: plan.createdAt.toISOString(),
				validUntilIso: plan.priceFrozenUntil ? plan.priceFrozenUntil.toISOString() : undefined,
				items: items.map((item) => {
					const { priceId, name } = splitStoredPriceId(item.priceId);
					const unitPrice = numeric(item.price);
					const discountRub = numeric(item.discount);
					const quantity = item.quantity || 1;
					const lineTotal = Math.max(0, unitPrice * quantity - discountRub);
					const discountPercent =
						unitPrice > 0 ? Math.round((discountRub / (unitPrice * quantity)) * 100) : 0;
					return {
						itemId: item.id,
						toothNumber: item.toothNumber ?? undefined,
						code804n: priceId || "A16.07.002",
						serviceTitle: name || "Медицинская услуга",
						category: "therapy",
						planUnitPriceRub: unitPrice,
						planDiscountRub: discountRub,
						planDiscountPercent: discountPercent,
						quantity,
						planLineTotalRub: lineTotal,
						serviceId: priceId,
						phase: item.phase || 1,
					};
				}),
			};

			return reply.send({
				success: true,
				plan: serialized,
				validationPayload,
			});
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
								doctorId: item.doctorId ?? null,
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
							if (input.allowClinicalBlockerOverride) {
								request.log.warn(
									{
										patientId,
										planId: savedPlanId,
										blockingRule: blockingRule.message,
										overrideReason: input.clinicalBlockerOverrideReason ?? null,
									},
									`[Автономия врача] План лечения сохранен под ответственность врача: ${blockingRule.message}`,
								);
							} else {
								const err = new Error(
									`Отказ: план содержит противопоказание. ${blockingRule.message}`,
								);
								// biome-ignore lint/suspicious/noExplicitAny: error mapping
								(err as any).statusCode = 400;
								throw err;
							}
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
								plannedDoctorUserId: item.doctorId ?? null,
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
}

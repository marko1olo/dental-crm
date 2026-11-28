import {
	canEditManagementNotes,
	canManageStaffAuthority,
	checkStaffDuplicates,
	kopecksToRubles,
	rublesToKopecks,
	type StaffMemberSearchCandidate,
	updateStaffProfileExtendedSchema,
	validateMedicalBook,
	validateStaffInn,
	validateStaffSnils,
} from "@dental/shared";
import { and, eq, ne } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { recordAuditEventInDb } from "../../db/auditQuery.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import * as schema from "../../db/schema.js";
import { invalidateStaffSessionCache } from "../../security/identity.js";
import { assembleStaffProfile, resolveOrganizationId } from "./staffHelpers.js";
import type { ExtendedHrProfileStorage } from "./types.js";

const staffIdParamsSchema = z.object({
	staffId: z.string().trim().uuid(),
});

function asPlainRecord(value: unknown): Record<string, unknown> {
	if (typeof value === "object" && value !== null && !Array.isArray(value)) {
		const out: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value)) {
			out[key] = entry;
		}
		return out;
	}
	return {};
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
	const value = record[key];
	return typeof value === "string" ? value : undefined;
}

function readOptionalNullableString(
	record: Record<string, unknown>,
	key: string,
): string | null | undefined {
	const value = record[key];
	if (value === null || typeof value === "string") return value;
	return undefined;
}

function readOptionalStringArray(
	record: Record<string, unknown>,
	key: string,
): string[] | undefined {
	const value = record[key];
	return Array.isArray(value) && value.every((item): item is string => typeof item === "string")
		? value
		: undefined;
}

function readOptionalNumber(record: Record<string, unknown>, key: string): number | undefined {
	const value = record[key];
	return typeof value === "number" ? value : undefined;
}

function extractHrProfile(uiPreferences: unknown): ExtendedHrProfileStorage {
	const ui = asPlainRecord(uiPreferences);
	const hr = asPlainRecord(ui.hrProfile);
	return {
		inn: readOptionalNullableString(hr, "inn"),
		medicalBookNumber: readOptionalNullableString(hr, "medicalBookNumber"),
		medicalBookCheckupDate: readOptionalNullableString(hr, "medicalBookCheckupDate"),
		minzdravAccreditationDate: readOptionalNullableString(hr, "minzdravAccreditationDate"),
		minzdravAccreditationSpecialty: readOptionalNullableString(hr, "minzdravAccreditationSpecialty"),
		clinicalNotes: readOptionalNullableString(hr, "clinicalNotes"),
		managementNotes: readOptionalNullableString(hr, "managementNotes"),
		assignedBranches: readOptionalStringArray(hr, "assignedBranches"),
		assignedCabinetRooms: readOptionalStringArray(hr, "assignedCabinetRooms"),
		assignedChairIds: readOptionalStringArray(hr, "assignedChairIds"),
		priceCategory: readOptionalString(hr, "priceCategory"),
		baseSalaryRub: readOptionalNumber(hr, "baseSalaryRub"),
		baseSalaryKopecks: readOptionalNumber(hr, "baseSalaryKopecks"),
		passwordEntropyBits: readOptionalNumber(hr, "passwordEntropyBits"),
	};
}

const staffMutationOptions = {
	config: { tenantTxSelfManaged: true },
	schema: {
		description: "Staff mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				"x-idempotency-key": { type: "string" },
				organizationid: { type: "string" },
				"x-organization-id": { type: "string" },
			},
		},
	},
} as const;

export async function registerStaffMutationRoutes(app: FastifyInstance) {
	/**
	 * Изменение кадровых данных требует ЛИЧНОГО входа сотрудника. Токена
	 * кабинета (общая стойка ресепшена без входа конкретного человека) для
	 * мутаций мало: у запроса нет личности, а значит некому отвечать за правку
	 * чужой карточки, роли или ставки.
	 */
	function requirePersonalStaff(
		auth: { callerUserId: string | null },
		reply: FastifyReply,
	): boolean {
		if (auth.callerUserId) return true;
		reply.code(401);
		reply.send({
			error: "StaffAuthRequired",
			message:
				"Изменение карточек сотрудников выполняется от конкретного лица: войдите в кабинет под своей учётной записью.",
		});
		return false;
	}

	/**
	 * PUT /api/staff/:staffId/profile & PUT /api/staff/:staffId — Сохранение полной расширенной карточки сотрудника
	 */
	const updateStaffProfileHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;
		if (!requirePersonalStaff(auth, reply)) return;

		const parsedParams = staffIdParamsSchema.safeParse(request.params ?? {});
		if (!parsedParams.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Некорректный идентификатор сотрудника (ожидается UUID).",
			};
		}
		const params = parsedParams.data;
		const parsed = updateStaffProfileExtendedSchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Некорректные данные карточки сотрудника.",
				details: parsed.error.format(),
			};
		}

		const data = parsed.data;

		// 1. Валидация и автоформатирование СНИЛС (Мандат 8e: ошибки не блокируют сохранение)
		let snilsToSave = data.snils ?? null;
		if (data.snils) {
			const snilsValidation = validateStaffSnils(data.snils);
			if (snilsValidation.isValid && snilsValidation.formatted) {
				snilsToSave = snilsValidation.formatted;
			} else {
				request.log.warn(
					{ staffId: params.staffId, error: snilsValidation.error || "контрольная сумма не совпадает" },
					"Staff SNILS saved with warning",
				);
			}
		}

		// 2. Валидация и автоформатирование ИНН (Мандат 8e: ошибки не блокируют сохранение)
		let innToSave = data.inn ?? null;
		if (data.inn) {
			const innValidation = validateStaffInn(data.inn);
			if (innValidation.isValid && innValidation.formatted) {
				innToSave = innValidation.formatted;
			} else {
				request.log.warn(
					{ staffId: params.staffId, error: innValidation.error || "неверный формат" },
					"Staff INN saved with warning",
				);
			}
		}

		// 3. Валидация медкнижки и аккредитации (если переданы)
		if (data.medicalBookNumber) {
			const medBookCheck = validateMedicalBook(
				data.medicalBookNumber,
				data.medicalBookCheckupDate,
			);
			if (medBookCheck.status === "expired") {
				// We allow saving but keep status logged
				request.log.warn(
					{ staffId: params.staffId },
					"Staff medical book expired",
				);
			}
		}

		// 4. Проверка дубликатов по всей организации и загрузка существующей записи в контексте тенанта
		const { allStaff, existingUser } = await withTenantReadCtx(
			auth.orgId,
			async (tx) => {
				const staffRows = await tx
					.select({
						id: schema.users.id,
						fullName: schema.users.fullName,
						snils: schema.users.snils,
						email: schema.users.email,
						phone: schema.users.phone,
						uiPreferences: schema.users.uiPreferences,
					})
					.from(schema.users)
					.where(
						and(
							eq(schema.users.organizationId, auth.orgId),
							ne(schema.users.id, params.staffId),
						),
					);

				const [existing] = await tx
					.select()
					.from(schema.users)
					.where(
						and(
							eq(schema.users.id, params.staffId),
							eq(schema.users.organizationId, auth.orgId),
						),
					)
					.limit(1);

				return { allStaff: staffRows, existingUser: existing };
			},
		);

		const staffCandidates: StaffMemberSearchCandidate[] = allStaff.map((u) => {
			const hr = extractHrProfile(u.uiPreferences);
			return {
				id: u.id,
				fullName: u.fullName,
				snils: u.snils,
				inn: hr.inn || null,
				email: u.email,
				phone: u.phone,
			};
		});

		const duplicateConflict = checkStaffDuplicates(staffCandidates, {
			id: params.staffId,
			fullName: data.fullName || "",
			...(data.snils !== undefined ? { snils: data.snils } : {}),
			...(data.inn !== undefined ? { inn: data.inn } : {}),
			...(data.email !== undefined ? { email: data.email } : {}),
			...(data.phone !== undefined ? { phone: data.phone } : {}),
		});

		if (duplicateConflict) {
			reply.code(409);
			return {
				error: "StaffDuplicateConflict",
				message: duplicateConflict.message,
				conflict: duplicateConflict,
			};
		}

		if (!existingUser) {
			reply.code(404);
			return {
				error: "StaffNotFound",
				message: "Сотрудник не найден в этой клинике.",
			};
		}

		// 6. Проверка прав доступа и предотвращение эскалации привилегий
		const existingUiPrefs = asPlainRecord(existingUser.uiPreferences);
		const existingHr = extractHrProfile(existingUiPrefs);

		const isSelf = Boolean(auth.callerUserId && auth.callerUserId === params.staffId);
		const hasStaffAuthority = canManageStaffAuthority(auth.callerRole) || auth.callerRole === "owner";

		// Редактирование карточек других сотрудников доступно только руководству
		if (auth.callerUserId && !isSelf && !hasStaffAuthority) {
			reply.code(403);
			return {
				error: "Forbidden",
				message: "Редактирование карточек других сотрудников доступно только Руководству клиники.",
			};
		}

		// Защита от несанкционированной смены роли (Мандат 8e, 8n)
		if (data.role !== undefined && data.role !== existingUser.role) {
			if (!hasStaffAuthority) {
				reply.code(403);
				return {
					error: "Forbidden",
					message: "Назначение и изменение должностей доступно только Главному врачу и Владельцу клиники.",
				};
			}
		}

		// Защита административных полномочий и прав подписи
		if (
			(data.canSignMedicalRecords !== undefined &&
				Boolean(data.canSignMedicalRecords) !== Boolean(existingUser.canSignMedicalRecords)) ||
			(data.canManageMoney !== undefined &&
				Boolean(data.canManageMoney) !== Boolean(existingUser.canManageMoney)) ||
			(data.canManageImports !== undefined &&
				Boolean(data.canManageImports) !== Boolean(existingUser.canManageImports))
		) {
			if (!hasStaffAuthority) {
				reply.code(403);
				return {
					error: "Forbidden",
					message: "Изменение административных полномочий и прав подписи доступно только Руководству клиники.",
				};
			}
		}

		// Защита ставок и окладов (Управление ФОТ): доступно только владельцу или бухгалтеру
		const isBaseSalaryRubChanged =
			data.baseSalaryRub !== undefined &&
			data.baseSalaryRub !== (existingHr.baseSalaryRub || 0);
		const isBaseSalaryKopecksChanged =
			data.baseSalaryKopecks !== undefined &&
			data.baseSalaryKopecks !==
				(existingHr.baseSalaryKopecks ??
					rublesToKopecks(existingHr.baseSalaryRub || 0));

		if (
			isBaseSalaryRubChanged ||
			isBaseSalaryKopecksChanged ||
			data.commissionPct !== undefined ||
			data.materialCostDeductionPct !== undefined ||
			data.labCostDeductionPct !== undefined
		) {
			if (!hasStaffAuthority && auth.callerRole !== "accountant") {
				reply.code(403);
				return {
					error: "Forbidden",
					message: "Управление окладами и процентными ставками сотрудников доступно только Владельцу и Бухгалтеру.",
				};
			}
		}

		let nextManagementNotes = existingHr.managementNotes || null;
		if (data.managementNotes !== undefined) {
			if (canEditManagementNotes(auth.callerRole)) {
				nextManagementNotes = data.managementNotes;
			} else if (data.managementNotes !== existingHr.managementNotes) {
				reply.code(403);
				return {
					error: "Forbidden",
					message:
						"Редактирование внутренних заметок руководства доступно только Главному врачу и Директору.",
				};
			}
		}

		// 7. Сборка обновленного хранилища HR
		const updatedHrProfile: ExtendedHrProfileStorage = {
			...existingHr,
			inn: data.inn !== undefined ? innToSave : (existingHr.inn || null),
			medicalBookNumber:
				data.medicalBookNumber !== undefined
					? data.medicalBookNumber
					: (existingHr.medicalBookNumber || null),
			medicalBookCheckupDate:
				data.medicalBookCheckupDate !== undefined
					? data.medicalBookCheckupDate
					: (existingHr.medicalBookCheckupDate || null),
			minzdravAccreditationDate:
				data.minzdravAccreditationDate !== undefined
					? data.minzdravAccreditationDate
					: (existingHr.minzdravAccreditationDate || null),
			minzdravAccreditationSpecialty:
				data.minzdravAccreditationSpecialty !== undefined
					? data.minzdravAccreditationSpecialty
					: (existingHr.minzdravAccreditationSpecialty || null),
			clinicalNotes:
				data.clinicalNotes !== undefined
					? data.clinicalNotes
					: (existingHr.clinicalNotes || null),
			managementNotes: nextManagementNotes,
			assignedBranches:
				data.assignedBranches !== undefined
					? data.assignedBranches
					: (existingHr.assignedBranches || []),
			assignedCabinetRooms:
				data.assignedCabinetRooms !== undefined
					? data.assignedCabinetRooms
					: (existingHr.assignedCabinetRooms || []),
			assignedChairIds:
				data.assignedChairIds !== undefined
					? data.assignedChairIds
					: (existingHr.assignedChairIds || []),
			priceCategory:
				data.priceCategory !== undefined
					? data.priceCategory
					: (existingHr.priceCategory || "standard"),
			baseSalaryRub:
				data.baseSalaryRub !== undefined
					? data.baseSalaryRub
					: data.baseSalaryKopecks !== undefined
						? kopecksToRubles(data.baseSalaryKopecks)
						: (existingHr.baseSalaryRub || 0),
			baseSalaryKopecks:
				data.baseSalaryKopecks !== undefined
					? data.baseSalaryKopecks
					: data.baseSalaryRub !== undefined
						? rublesToKopecks(data.baseSalaryRub)
						: (existingHr.baseSalaryKopecks || rublesToKopecks(existingHr.baseSalaryRub || 0)),
			passwordEntropyBits:
				data.passwordEntropyBits !== undefined
					? data.passwordEntropyBits
					: existingHr.passwordEntropyBits,
		};

		// 8. Обновление таблицы `users`
		const userUpdates: Partial<typeof schema.users.$inferInsert> = {
			uiPreferences: {
				...existingUiPrefs,
				hrProfile: updatedHrProfile,
			},
		};

		if (data.fullName !== undefined) userUpdates.fullName = data.fullName;
		if (data.role !== undefined) userUpdates.role = data.role;
		if (data.phone !== undefined) userUpdates.phone = data.phone;
		if (data.email !== undefined) userUpdates.email = data.email;
		if (data.active !== undefined) userUpdates.isActive = data.active;
		if (data.snils !== undefined) userUpdates.snils = snilsToSave;
		if (data.specialties !== undefined) userUpdates.specialties = data.specialties;
		if (data.canSignMedicalRecords !== undefined)
			userUpdates.canSignMedicalRecords = data.canSignMedicalRecords;
		if (data.canManageMoney !== undefined)
			userUpdates.canManageMoney = data.canManageMoney;
		if (data.canManageImports !== undefined)
			userUpdates.canManageImports = data.canManageImports;

		const { updatedUser, comm } = await withTenantWriteCtx(auth.orgId, async (tx) => {
			await tx
				.update(schema.users)
				.set(userUpdates)
				.where(
					and(
						eq(schema.users.id, params.staffId),
						eq(schema.users.organizationId, auth.orgId),
					),
				);

			// Загрузка существующей комиссии врача для расчета дельт и аудита
			const [existingComm] = await tx
				.select()
				.from(schema.doctorCommissions)
				.where(
					and(
						eq(schema.doctorCommissions.organizationId, auth.orgId),
						eq(schema.doctorCommissions.userId, params.staffId),
					),
				)
				.limit(1);

			// 9. Обновление комиссии врача в `doctorCommissions`
			if (
				data.commissionPct !== undefined ||
				data.materialCostDeductionPct !== undefined ||
				data.labCostDeductionPct !== undefined
			) {
				const commUpdates: Partial<typeof schema.doctorCommissions.$inferInsert> = {};
				if (data.commissionPct !== undefined) {
					commUpdates.commissionPct = String(data.commissionPct);
					commUpdates.commissionPercent = String(data.commissionPct);
				}
				if (data.materialCostDeductionPct !== undefined) {
					commUpdates.materialCostDeductionPct = String(
						data.materialCostDeductionPct,
					);
				}
				if (data.labCostDeductionPct !== undefined) {
					commUpdates.labCostDeductionPct = String(data.labCostDeductionPct);
				}

				if (existingComm) {
					await tx
						.update(schema.doctorCommissions)
						.set(commUpdates)
						.where(
							and(
								eq(schema.doctorCommissions.organizationId, auth.orgId),
								eq(schema.doctorCommissions.userId, params.staffId),
							),
						);
				} else {
					await tx.insert(schema.doctorCommissions).values({
						organizationId: auth.orgId,
						userId: params.staffId,
						doctorId: params.staffId,
						commissionPct: String(data.commissionPct ?? 25),
						commissionPercent: String(data.commissionPct ?? 25),
						materialCostDeductionPct: String(data.materialCostDeductionPct ?? 0),
						labCostDeductionPct: String(data.labCostDeductionPct ?? 0),
						isActive: true,
					});
				}
			}

			// 9.1. Обязательная запись в неизменяемый журнал audit_events [SEC-07]
			const isRoleChanged = data.role !== undefined && data.role !== existingUser.role;
			const isSalaryOrCommissionChanged =
				isBaseSalaryRubChanged ||
				isBaseSalaryKopecksChanged ||
				(data.commissionPct !== undefined &&
					(existingComm?.commissionPct == null ||
						Number(existingComm.commissionPct) !== Number(data.commissionPct))) ||
				(data.materialCostDeductionPct !== undefined &&
					(existingComm?.materialCostDeductionPct == null ||
						Number(existingComm.materialCostDeductionPct) !== Number(data.materialCostDeductionPct))) ||
				(data.labCostDeductionPct !== undefined &&
					(existingComm?.labCostDeductionPct == null ||
						Number(existingComm.labCostDeductionPct) !== Number(data.labCostDeductionPct)));
			const isAuthorityChanged =
				(data.canSignMedicalRecords !== undefined && Boolean(data.canSignMedicalRecords) !== Boolean(existingUser.canSignMedicalRecords)) ||
				(data.canManageMoney !== undefined && Boolean(data.canManageMoney) !== Boolean(existingUser.canManageMoney)) ||
				(data.canManageImports !== undefined && Boolean(data.canManageImports) !== Boolean(existingUser.canManageImports));

			if (isRoleChanged) {
				await recordAuditEventInDb(auth.orgId, {
					entityType: "user",
					entityId: params.staffId,
					action: "STAFF_ROLE_CHANGE",
					actorUserId: auth.callerUserId,
					reason: JSON.stringify({
						field: "role",
						oldValue: existingUser.role,
						newValue: data.role,
						targetStaffId: params.staffId,
						ip: request.ip,
						timestamp: new Date().toISOString(),
					}),
				}, tx);
			}

			if (isSalaryOrCommissionChanged) {
				await recordAuditEventInDb(auth.orgId, {
					entityType: "user",
					entityId: params.staffId,
					action: "STAFF_SALARY_CHANGE",
					actorUserId: auth.callerUserId,
					reason: JSON.stringify({
						field: "salary_and_rates",
						oldValues: {
							baseSalaryRub: existingHr.baseSalaryRub || 0,
							commissionPct: existingComm?.commissionPct ?? null,
							materialCostDeductionPct: existingComm?.materialCostDeductionPct ?? null,
							labCostDeductionPct: existingComm?.labCostDeductionPct ?? null,
						},
						newValues: {
							baseSalaryRub: data.baseSalaryRub !== undefined ? data.baseSalaryRub : (existingHr.baseSalaryRub || 0),
							commissionPct: data.commissionPct !== undefined ? data.commissionPct : (existingComm?.commissionPct ?? null),
							materialCostDeductionPct: data.materialCostDeductionPct !== undefined ? data.materialCostDeductionPct : (existingComm?.materialCostDeductionPct ?? null),
							labCostDeductionPct: data.labCostDeductionPct !== undefined ? data.labCostDeductionPct : (existingComm?.labCostDeductionPct ?? null),
						},
						targetStaffId: params.staffId,
						ip: request.ip,
						timestamp: new Date().toISOString(),
					}),
				}, tx);
			}

			if (isAuthorityChanged) {
				await recordAuditEventInDb(auth.orgId, {
					entityType: "user",
					entityId: params.staffId,
					action: "STAFF_AUTHORITY_CHANGE",
					actorUserId: auth.callerUserId,
					reason: JSON.stringify({
						field: "authorities",
						oldValues: {
							canSignMedicalRecords: existingUser.canSignMedicalRecords,
							canManageMoney: existingUser.canManageMoney,
							canManageImports: existingUser.canManageImports,
						},
						newValues: {
							canSignMedicalRecords: data.canSignMedicalRecords !== undefined ? data.canSignMedicalRecords : existingUser.canSignMedicalRecords,
							canManageMoney: data.canManageMoney !== undefined ? data.canManageMoney : existingUser.canManageMoney,
							canManageImports: data.canManageImports !== undefined ? data.canManageImports : existingUser.canManageImports,
						},
						targetStaffId: params.staffId,
						ip: request.ip,
						timestamp: new Date().toISOString(),
					}),
				}, tx);
			}

			// 10. Перечитывание и ответ
			const [freshUser] = await tx
				.select()
				.from(schema.users)
				.where(
					and(
						eq(schema.users.id, params.staffId),
						eq(schema.users.organizationId, auth.orgId),
					),
				)
				.limit(1);

			const [freshComm] = await tx
				.select()
				.from(schema.doctorCommissions)
				.where(
					and(
						eq(schema.doctorCommissions.organizationId, auth.orgId),
						eq(schema.doctorCommissions.userId, params.staffId),
					),
				)
				.limit(1);

			return { updatedUser: freshUser, comm: freshComm };
		});

		if (!updatedUser) {
			reply.code(404);
			return {
				error: "StaffNotFound",
				message: "Сотрудник не найден после обновления.",
			};
		}

		return assembleStaffProfile(
			updatedUser,
			comm,
			auth.callerRole,
			auth.callerUserId,
		);
	};

	app.put("/api/staff/:staffId", staffMutationOptions, updateStaffProfileHandler);
	app.put("/api/staff/:staffId/profile", staffMutationOptions, updateStaffProfileHandler);

	/**
	 * DELETE /api/staff/:staffId — Мягкая деактивация сотрудника
	 */
	app.delete("/api/staff/:staffId", staffMutationOptions, async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;
		if (!requirePersonalStaff(auth, reply)) return;

		const parsedParams = staffIdParamsSchema.safeParse(request.params ?? {});
		if (!parsedParams.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Некорректный идентификатор сотрудника (ожидается UUID).",
			};
		}
		const params = parsedParams.data;

		if (!canManageStaffAuthority(auth.callerRole) && auth.callerRole !== "owner") {
			reply.code(403);
			return {
				error: "Forbidden",
				message: "Деактивация сотрудников доступна только Руководству клиники.",
			};
		}

		const result = await withTenantWriteCtx(auth.orgId, async (tx) => {
			const [user] = await tx
				.select()
				.from(schema.users)
				.where(
					and(
						eq(schema.users.id, params.staffId),
						eq(schema.users.organizationId, auth.orgId),
					),
				)
				.limit(1);

			if (!user) {
				return { notFound: true as const };
			}

			await tx
				.update(schema.users)
				.set({ isActive: false, currentSessionId: null })
				.where(
					and(
						eq(schema.users.id, params.staffId),
						eq(schema.users.organizationId, auth.orgId),
					),
				);

			await recordAuditEventInDb(auth.orgId, {
				entityType: "user",
				entityId: params.staffId,
				action: "STAFF_DEACTIVATE",
				actorUserId: auth.callerUserId,
				reason: `Деактивация сотрудника ${user.fullName} (${user.role})`,
			}, tx);
			return { notFound: false as const, user };
		});

		if (result.notFound) {
			reply.code(404);
			return {
				error: "StaffNotFound",
				message: "Сотрудник не найден в этой клинике.",
			};
		}

		invalidateStaffSessionCache(params.staffId, auth.orgId);

		const { user } = result;
		return {
			ok: true,
			id: user.id,
			fullName: user.fullName,
			active: false,
			message: `Сотрудник ${user.fullName} успешно деактивирован.`,
		};
	});

	/**
	 * POST /api/staff/:staffId/terminate-session — Принудительное завершение активной сессии
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/staff/:staffId/terminate-session",
		permission: "public",
		handler: async ({ request, reply }) => {
			const auth = await resolveOrganizationId(request, reply);
			if (!auth) return;
			/*
			 * Завершение чужой сессии — административное действие: оно выкидывает
			 * коллегу из программы. Кабинетный токен стойки без входа конкретного
			 * человека это делать не может; самоуправство сотрудника ограничено
			 * правом управления кадрами (свою сессию завершает владелец токена —
			 * это выход, а не атака).
			 */
			const parsedParams = staffIdParamsSchema.safeParse(request.params ?? {});
			const rawStaffId =
				typeof request.params === "object" &&
				request.params !== null &&
				"staffId" in request.params &&
				typeof request.params.staffId === "string"
					? request.params.staffId
					: undefined;
			const isSelf = Boolean(auth.callerUserId && rawStaffId && auth.callerUserId === rawStaffId);
			if (!auth.callerUserId) {
				reply.code(401);
				return {
					error: "StaffAuthRequired",
					message:
						"Завершение сессии сотрудника выполняется от конкретного лица: войдите под своей учётной записью.",
				};
			}
			if (!isSelf && !canManageStaffAuthority(auth.callerRole) && auth.callerRole !== "owner") {
				reply.code(403);
				return {
					error: "Forbidden",
					message:
						"Завершать чужие сессии могут владелец клиники и руководство.",
				};
			}

			if (!parsedParams.success) {
				reply.code(400);
				return {
					error: "ValidationError",
					message: "Некорректный идентификатор сотрудника (ожидается UUID).",
				};
			}
			const params = parsedParams.data;
			await withTenantWriteCtx(auth.orgId, async (tx) => {
				await tx
					.update(schema.users)
					.set({ currentSessionId: null })
					.where(
						and(
							eq(schema.users.id, params.staffId),
							eq(schema.users.organizationId, auth.orgId),
						),
					);

				await tx
					.delete(schema.singleSessionEnforcements)
					.where(
						and(
							eq(schema.singleSessionEnforcements.userId, params.staffId),
							eq(schema.singleSessionEnforcements.organizationId, auth.orgId),
						),
					);

				await recordAuditEventInDb(auth.orgId, {
					entityType: "user",
					entityId: params.staffId,
					action: "STAFF_SESSION_TERMINATE",
					actorUserId: auth.callerUserId,
					reason: `Принудительное завершение активной сессии сотрудника (IP: ${request.ip})`,
				}, tx);
			});

			invalidateStaffSessionCache(params.staffId, auth.orgId);

			return {
				ok: true,
				message: "Активная сессия сотрудника успешно завершена.",
			};
		},
	});
}

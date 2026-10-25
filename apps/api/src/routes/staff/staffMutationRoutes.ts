import {
	canEditManagementNotes,
	canManageStaffAuthority,
	checkStaffDuplicates,
	type StaffMemberSearchCandidate,
	updateStaffProfileExtendedSchema,
	validateMedicalBook,
	validateStaffInn,
	validateStaffSnils,
} from "@dental/shared";
import { and, eq, ne } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { assembleStaffProfile, resolveOrganizationId } from "./staffHelpers.js";
import type { ExtendedHrProfileStorage } from "./types.js";

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
	 * PUT /api/staff/:staffId/profile — Сохранение полной расширенной карточки сотрудника
	 */
	app.put("/api/staff/:staffId/profile", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;
		if (!requirePersonalStaff(auth, reply)) return;

		const params = request.params as { staffId: string };
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
				console.warn(
					`[Кадры: СНИЛС] СНИЛС сотрудника ${params.staffId} сохранён с предупреждением: ${snilsValidation.error || "контрольная сумма не совпадает"}.`,
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
				console.warn(
					`[Кадры: ИНН] ИНН сотрудника ${params.staffId} сохранён с предупреждением: ${innValidation.error || "неверный формат"}.`,
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
				console.warn(
					`[Кадры: СанПиН] Медкнижка сотрудника ${params.staffId} просрочена.`,
				);
			}
		}

		// 4. Проверка дубликатов по всей организации
		const allStaff = await db
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

		const staffCandidates: StaffMemberSearchCandidate[] = allStaff.map((u) => {
			const ui = (u.uiPreferences as Record<string, unknown>) || {};
			const hr = (ui.hrProfile as ExtendedHrProfileStorage) || {};
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

		// 5. Загрузка существующей записи
		const [existingUser] = await db
			.select()
			.from(schema.users)
			.where(
				and(
					eq(schema.users.id, params.staffId),
					eq(schema.users.organizationId, auth.orgId),
				),
			)
			.limit(1);

		if (!existingUser) {
			reply.code(404);
			return {
				error: "StaffNotFound",
				message: "Сотрудник не найден в этой клинике.",
			};
		}

		// 6. Проверка прав доступа и предотвращение эскалации привилегий
		const existingUiPrefs =
			(existingUser.uiPreferences as Record<string, unknown>) || {};
		const existingHr =
			(existingUiPrefs.hrProfile as ExtendedHrProfileStorage) || {};

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
		if (
			(data.baseSalaryRub !== undefined && data.baseSalaryRub !== (existingHr.baseSalaryRub || 0)) ||
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
					: (existingHr.baseSalaryRub || 0),
			passwordEntropyBits:
				data.passwordEntropyBits !== undefined
					? data.passwordEntropyBits
					: existingHr.passwordEntropyBits,
		};

		// 8. Обновление таблицы `users`
		// biome-ignore lint/suspicious/noExplicitAny: Update payload object
		const userUpdates: any = {
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

		await db
			.update(schema.users)
			.set(userUpdates)
			.where(
				and(
					eq(schema.users.id, params.staffId),
					eq(schema.users.organizationId, auth.orgId),
				),
			);

		// 9. Обновление комиссии врача в `doctorCommissions`
		if (
			data.commissionPct !== undefined ||
			data.materialCostDeductionPct !== undefined ||
			data.labCostDeductionPct !== undefined
		) {
			const [existingComm] = await db
				.select()
				.from(schema.doctorCommissions)
				.where(
					and(
						eq(schema.doctorCommissions.organizationId, auth.orgId),
						eq(schema.doctorCommissions.userId, params.staffId),
					),
				)
				.limit(1);

			// biome-ignore lint/suspicious/noExplicitAny: Update commission payload
			const commUpdates: any = {};
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
				await db
					.update(schema.doctorCommissions)
					.set(commUpdates)
					.where(
						and(
							eq(schema.doctorCommissions.organizationId, auth.orgId),
							eq(schema.doctorCommissions.userId, params.staffId),
						),
					);
			} else {
				await db.insert(schema.doctorCommissions).values({
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

		// 10. Перечитывание и ответ
		const [updatedUser] = await db
			.select()
			.from(schema.users)
			.where(
				and(
					eq(schema.users.id, params.staffId),
					eq(schema.users.organizationId, auth.orgId),
				),
			)
			.limit(1);

		const [comm] = await db
			.select()
			.from(schema.doctorCommissions)
			.where(
				and(
					eq(schema.doctorCommissions.organizationId, auth.orgId),
					eq(schema.doctorCommissions.userId, params.staffId),
				),
			)
			.limit(1);

		return assembleStaffProfile(
			updatedUser,
			comm,
			auth.callerRole,
			auth.callerUserId,
		);
	});

	/**
	 * POST /api/staff/:staffId/terminate-session — Принудительное завершение активной сессии
	 */
	app.post("/api/staff/:staffId/terminate-session", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;
		/*
		 * Завершение чужой сессии — административное действие: оно выкидывает
		 * коллегу из программы. Кабинетный токен стойки без входа конкретного
		 * человека это делать не может; самоуправство сотрудника ограничено
		 * правом управления кадрами (свою сессию завершает владелец токена —
		 * это выход, а не атака).
		 */
		const isSelf = auth.callerUserId === (request.params as { staffId: string }).staffId;
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

		const params = request.params as { staffId: string };
		await db
			.update(schema.users)
			.set({ currentSessionId: null })
			.where(
				and(
					eq(schema.users.id, params.staffId),
					eq(schema.users.organizationId, auth.orgId),
				),
			);

		return {
			ok: true,
			message: "Активная сессия сотрудника успешно завершена.",
		};
	});
}

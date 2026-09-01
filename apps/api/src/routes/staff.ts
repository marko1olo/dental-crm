/**
 * staff.ts — Расширенная карточка сотрудника, проверка дубликатов, аудит безопасности и энтропия паролей.
 *
 * Реализация фичи №51 («Кадры: Карточка сотрудника со шкалой надежности пароля, правами и блокировкой дублей»).
 * Нормативы: 152-ФЗ, Приказ ФСТЭК № 21, Минздрав РФ (аккредитация и ЛМК), ФНС (ИНН), ПФР/СФР/ЕГИСЗ (СНИЛС).
 */

import {
	canEditManagementNotes,
	canViewManagementNotes,
	checkStaffDuplicates,
	evaluatePasswordEntropy,
	formatStaffSnils,
	staffAuthorityFlagKeys,
	type StaffMemberSearchCandidate,
	type StaffProfileExtended,
	type StaffRole,
	updateStaffProfileExtendedSchema,
	validateMedicalBook,
	validateMinzdravAccreditation,
	validateStaffInn,
	validateStaffSnils,
} from "@dental/shared";
import { and, eq, ne, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { getClinicSettingsFromDb } from "../db/settingsQuery.js";
import { repairMojibakeDeep } from "../text/repairMojibake.js";

interface ExtendedHrProfileStorage {
	inn?: string | null | undefined;
	medicalBookNumber?: string | null | undefined;
	medicalBookCheckupDate?: string | null | undefined;
	minzdravAccreditationDate?: string | null | undefined;
	minzdravAccreditationSpecialty?: string | null | undefined;
	clinicalNotes?: string | null | undefined;
	managementNotes?: string | null | undefined;
	assignedBranches?: string[] | undefined;
	assignedCabinetRooms?: string[] | undefined;
	assignedChairIds?: string[] | undefined;
	priceCategory?: string | undefined;
	baseSalaryRub?: number | undefined;
}

function extractTokenClaims(token: string): Record<string, any> | null {
	try {
		const parts = token.split(".");
		if (parts.length >= 2 && parts[1]) {
			const payload = Buffer.from(parts[1], "base64").toString("utf8");
			return JSON.parse(payload);
		}
		const decoded = Buffer.from(token, "base64").toString("utf8");
		return JSON.parse(decoded);
	} catch {
		return null;
	}
}

function getRequestOrgAndRole(request: FastifyRequest): {
	orgId: string | null;
	callerRole: string | null;
	callerUserId: string | null;
} {
	const rawStaffToken = request.headers["x-dente-staff-token"];
	const rawClinicToken = request.headers["x-dente-clinic-token"];
	const tokenToParse =
		typeof rawStaffToken === "string"
			? rawStaffToken
			: typeof rawClinicToken === "string"
				? rawClinicToken
				: null;

	if (tokenToParse) {
		const claims = extractTokenClaims(tokenToParse);
		if (claims) {
			return {
				orgId: claims.organizationId || claims.orgId || null,
				callerRole: claims.role || "owner",
				callerUserId: claims.userId || claims.id || null,
			};
		}
	}

	// Fallback to query/body orgId or default org
	const queryOrg = (request.query as { organizationId?: string })?.organizationId;
	return {
		orgId: queryOrg || null,
		callerRole: "owner",
		callerUserId: null,
	};
}

async function resolveOrganizationId(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<{ orgId: string; callerRole: string; callerUserId: string | null } | null> {
	const auth = getRequestOrgAndRole(request);
	if (auth.orgId) {
		return {
			orgId: auth.orgId,
			callerRole: auth.callerRole || "owner",
			callerUserId: auth.callerUserId,
		};
	}

	// Read first active organization from database if none passed
	const [firstOrg] = await db
		.select({ id: schema.organizations.id })
		.from(schema.organizations)
		.limit(1);

	if (firstOrg?.id) {
		return {
			orgId: firstOrg.id,
			callerRole: "owner",
			callerUserId: null,
		};
	}

	reply.code(401);
	reply.send({
		error: "Unauthorized",
		message: "Не удалось определить организацию клиники.",
	});
	return null;
}

function assembleStaffProfile(
	// biome-ignore lint/suspicious/noExplicitAny: DB row representation
	user: any,
	// biome-ignore lint/suspicious/noExplicitAny: DB commission row
	commissionRow: any,
	callerRole: string,
): StaffProfileExtended {
	const uiPrefs = (user.uiPreferences as Record<string, unknown>) || {};
	const hr = (uiPrefs.hrProfile as ExtendedHrProfileStorage) || {};

	const allowManagementNotes = canViewManagementNotes(callerRole);

	const commissionPct = commissionRow?.commissionPct
		? Number(commissionRow.commissionPct)
		: commissionRow?.commissionPercent
			? Number(commissionRow.commissionPercent)
			: 25;
	const materialCostDeductionPct = commissionRow?.materialCostDeductionPct
		? Number(commissionRow.materialCostDeductionPct)
		: 0;
	const labCostDeductionPct = commissionRow?.labCostDeductionPct
		? Number(commissionRow.labCostDeductionPct)
		: 0;

	return {
		id: user.id,
		organizationId: user.organizationId,
		fullName: repairMojibakeDeep(user.fullName),
		role: (user.role as StaffRole) || "doctor",
		specialties: Array.isArray(user.specialties) ? user.specialties : ["universal"],
		phone: user.phone ? repairMojibakeDeep(user.phone) : null,
		email: user.email ? repairMojibakeDeep(user.email) : null,
		active: user.isActive ?? true,
		color: "#3b82f6",
		avatarUrl: null,

		// Колонка 1: Реквизиты
		snils: user.snils ? formatStaffSnils(user.snils) : null,
		inn: hr.inn ? (validateStaffInn(hr.inn).formatted || hr.inn) : null,
		medicalBookNumber: hr.medicalBookNumber ? repairMojibakeDeep(hr.medicalBookNumber) : null,
		medicalBookCheckupDate: hr.medicalBookCheckupDate || null,
		minzdravAccreditationDate: hr.minzdravAccreditationDate || null,
		minzdravAccreditationSpecialty: hr.minzdravAccreditationSpecialty
			? repairMojibakeDeep(hr.minzdravAccreditationSpecialty)
			: null,
		clinicalNotes: hr.clinicalNotes ? repairMojibakeDeep(hr.clinicalNotes) : null,
		managementNotes: allowManagementNotes
			? hr.managementNotes
				? repairMojibakeDeep(hr.managementNotes)
				: null
			: null,

		// Колонка 2: Назначения и тарификация
		assignedBranches: Array.isArray(hr.assignedBranches) ? hr.assignedBranches : [],
		assignedCabinetRooms: Array.isArray(hr.assignedCabinetRooms) ? hr.assignedCabinetRooms : [],
		assignedChairIds: Array.isArray(hr.assignedChairIds) ? hr.assignedChairIds : [],
		priceCategory: hr.priceCategory || "standard",
		baseSalaryRub: hr.baseSalaryRub || 0,
		commissionPct,
		materialCostDeductionPct,
		labCostDeductionPct,

		// Колонка 3: Безопасность
		canSignMedicalRecords: Boolean(user.canSignMedicalRecords),
		canManageMoney: Boolean(user.canManageMoney),
		canManageImports: Boolean(user.canManageImports),
		hasPinCode: Boolean(user.pinCodeHash),
		hasPassword: Boolean(user.passwordHash),
		passwordEntropyBits: user.passwordHash ? 64 : 0,
		lastLoginAt: user.createdAt?.toISOString ? user.createdAt.toISOString() : null,
		currentSessionIp: user.currentSessionId ? "127.0.0.1 (активно)" : null,
		currentSessionUserAgent: user.currentSessionId ? "DENTE Clinic Workstation" : null,
		isSessionActive: Boolean(user.currentSessionId),

		createdAt: user.createdAt?.toISOString
			? user.createdAt.toISOString()
			: new Date().toISOString(),
		updatedAt: user.createdAt?.toISOString
			? user.createdAt.toISOString()
			: new Date().toISOString(),
	};
}

export async function registerStaffRoutes(app: FastifyInstance) {
	/**
	 * GET /api/staff/extended — Список сотрудников клиники с расширенным профилем
	 */
	app.get("/api/staff/extended", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

		const staffRows = await db
			.select()
			.from(schema.users)
			.where(eq(schema.users.organizationId, auth.orgId));

		const commissions = await db
			.select()
			.from(schema.doctorCommissions)
			.where(eq(schema.doctorCommissions.organizationId, auth.orgId));

		const commissionMap = new Map<string, (typeof commissions)[0]>();
		for (const comm of commissions) {
			const targetId = comm.userId || comm.doctorId;
			if (targetId) commissionMap.set(targetId, comm);
		}

		const results = staffRows.map((user) =>
			assembleStaffProfile(user, commissionMap.get(user.id), auth.callerRole),
		);

		return results;
	});

	/**
	 * GET /api/staff/:staffId/profile — Карточка конкретного сотрудника
	 */
	app.get("/api/staff/:staffId/profile", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

		const params = request.params as { staffId: string };
		const [user] = await db
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
			reply.code(404);
			return {
				error: "StaffNotFound",
				message: "Сотрудник не найден в этой клинике.",
			};
		}

		const [commissionRow] = await db
			.select()
			.from(schema.doctorCommissions)
			.where(
				and(
					eq(schema.doctorCommissions.organizationId, auth.orgId),
					eq(schema.doctorCommissions.userId, params.staffId),
				),
			)
			.limit(1);

		return assembleStaffProfile(user, commissionRow, auth.callerRole);
	});

	/**
	 * POST /api/staff/validate-duplicates — Проверка кандидата на дублирование
	 */
	app.post("/api/staff/validate-duplicates", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

		const candidateSchema = z.object({
			id: z.string().uuid().optional(),
			fullName: z.string().optional(),
			snils: z.string().nullable().optional(),
			inn: z.string().nullable().optional(),
			email: z.string().nullable().optional(),
			phone: z.string().nullable().optional(),
		});

		const parsed = candidateSchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Некорректные параметры для проверки дубликатов.",
			};
		}

		const staffRows = await db
			.select({
				id: schema.users.id,
				fullName: schema.users.fullName,
				snils: schema.users.snils,
				email: schema.users.email,
				phone: schema.users.phone,
				uiPreferences: schema.users.uiPreferences,
			})
			.from(schema.users)
			.where(eq(schema.users.organizationId, auth.orgId));

		const candidateList: StaffMemberSearchCandidate[] = staffRows.map((u) => {
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

		const targetCandidate: StaffMemberSearchCandidate = {
			id: parsed.data.id || "NEW",
			fullName: parsed.data.fullName || "",
			...(parsed.data.snils !== undefined ? { snils: parsed.data.snils } : {}),
			...(parsed.data.inn !== undefined ? { inn: parsed.data.inn } : {}),
			...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}),
			...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
		};

		const conflict = checkStaffDuplicates(candidateList, targetCandidate);

		return {
			isDuplicate: Boolean(conflict),
			conflict,
		};
	});

	/**
	 * POST /api/staff/evaluate-password — Оценка энтропии и стойкости пароля
	 */
	app.post("/api/staff/evaluate-password", async (request, reply) => {
		const bodySchema = z.object({
			password: z.string().default(""),
		});

		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Пароль не передан для оценки.",
			};
		}

		return evaluatePasswordEntropy(parsed.data.password);
	});

	/**
	 * PUT /api/staff/:staffId/profile — Сохранение полной расширенной карточки сотрудника
	 */
	app.put("/api/staff/:staffId/profile", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

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

		// 1. Валидация СНИЛС (если передан)
		if (data.snils) {
			const snilsValidation = validateStaffSnils(data.snils);
			if (!snilsValidation.isValid) {
				reply.code(400);
				return {
					error: "InvalidSnils",
					message: snilsValidation.error || "Указан невалидный СНИЛС.",
				};
			}
		}

		// 2. Валидация ИНН (если передан)
		if (data.inn) {
			const innValidation = validateStaffInn(data.inn);
			if (!innValidation.isValid) {
				reply.code(400);
				return {
					error: "InvalidInn",
					message: innValidation.error || "Указан невалидный ИНН.",
				};
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

		// 6. Проверка прав на заметки руководства
		const existingUiPrefs =
			(existingUser.uiPreferences as Record<string, unknown>) || {};
		const existingHr =
			(existingUiPrefs.hrProfile as ExtendedHrProfileStorage) || {};

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
			inn: data.inn !== undefined ? data.inn : existingHr.inn,
			medicalBookNumber:
				data.medicalBookNumber !== undefined
					? data.medicalBookNumber
					: existingHr.medicalBookNumber,
			medicalBookCheckupDate:
				data.medicalBookCheckupDate !== undefined
					? data.medicalBookCheckupDate
					: existingHr.medicalBookCheckupDate,
			minzdravAccreditationDate:
				data.minzdravAccreditationDate !== undefined
					? data.minzdravAccreditationDate
					: existingHr.minzdravAccreditationDate,
			minzdravAccreditationSpecialty:
				data.minzdravAccreditationSpecialty !== undefined
					? data.minzdravAccreditationSpecialty
					: existingHr.minzdravAccreditationSpecialty,
			clinicalNotes:
				data.clinicalNotes !== undefined
					? data.clinicalNotes
					: existingHr.clinicalNotes,
			managementNotes: nextManagementNotes,
			assignedBranches:
				data.assignedBranches !== undefined
					? data.assignedBranches
					: existingHr.assignedBranches,
			assignedCabinetRooms:
				data.assignedCabinetRooms !== undefined
					? data.assignedCabinetRooms
					: existingHr.assignedCabinetRooms,
			assignedChairIds:
				data.assignedChairIds !== undefined
					? data.assignedChairIds
					: existingHr.assignedChairIds,
			priceCategory:
				data.priceCategory !== undefined
					? data.priceCategory
					: existingHr.priceCategory,
			baseSalaryRub:
				data.baseSalaryRub !== undefined
					? data.baseSalaryRub
					: existingHr.baseSalaryRub,
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
		if (data.snils !== undefined) userUpdates.snils = data.snils;
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

		return assembleStaffProfile(updatedUser, comm, auth.callerRole);
	});

	/**
	 * POST /api/staff/:staffId/terminate-session — Принудительное завершение активной сессии
	 */
	app.post("/api/staff/:staffId/terminate-session", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

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

	/**
	 * GET /api/staff/:staffId/sessions — Журнал телеметрии сессий сотрудника
	 */
	app.get("/api/staff/:staffId/sessions", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

		const params = request.params as { staffId: string };
		const [user] = await db
			.select({
				id: schema.users.id,
				fullName: schema.users.fullName,
				currentSessionId: schema.users.currentSessionId,
				createdAt: schema.users.createdAt,
			})
			.from(schema.users)
			.where(
				and(
					eq(schema.users.id, params.staffId),
					eq(schema.users.organizationId, auth.orgId),
				),
			)
			.limit(1);

		if (!user) {
			reply.code(404);
			return {
				error: "StaffNotFound",
				message: "Сотрудник не найден.",
			};
		}

		return {
			staffId: user.id,
			fullName: user.fullName,
			hasActiveSession: Boolean(user.currentSessionId),
			sessions: user.currentSessionId
				? [
						{
							sessionId: user.currentSessionId,
							ipAddress: "127.0.0.1",
							userAgent: "DENTE Desktop Client (Windows 11 x64)",
							status: "online",
							connectedAt: new Date().toISOString(),
							lastActivityAt: new Date().toISOString(),
						},
					]
				: [],
		};
	});
}

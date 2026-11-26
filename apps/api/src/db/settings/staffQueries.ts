import type {
	CreateStaffMemberInput,
	StaffMember,
	UpdateStaffWorkingHoursInput,
} from "@dental/shared";
import {
	checkStaffDuplicates,
	validateStaffSnils,
} from "@dental/shared";
import { and, desc, eq, or } from "drizzle-orm";
import {
	createStaffMember as createStaffMemberInMemory,
	deactivateStaffMember as deactivateStaffMemberInMemory,
	updateStaffMemberProfile as updateStaffMemberProfileInMemory,
	updateStaffWorkingHours as updateStaffWorkingHoursInMemory,
} from "../../sampleData.js";
import { staffAuthorityFlags } from "../../security/permissions.js";
import { type TenantDb, withSavepoint, withTenantCtx } from "../rls.js";
import * as schema from "../schema.js";
import type {
	DoctorCommissionRate,
	UpdateStaffMemberProfileInput,
} from "./types.js";
import { useInMemory } from "./types.js";

export async function createStaffMemberInDb(
	organizationId: string,
	input: CreateStaffMemberInput,
	externalTx?: TenantDb | undefined,
): Promise<StaffMember> {
	if (useInMemory()) return createStaffMemberInMemory(input);

	let snilsToSave = input.snils || null;
	if (input.snils) {
		const snilsCheck = validateStaffSnils(input.snils);
		if (snilsCheck.isValid && snilsCheck.formatted) {
			snilsToSave = snilsCheck.formatted;
		}
	}

	const run = async (tx: TenantDb) => {
		const existingUsers = await tx
			.select({
				id: schema.users.id,
				fullName: schema.users.fullName,
				snils: schema.users.snils,
				email: schema.users.email,
				phone: schema.users.phone,
			})
			.from(schema.users)
			.where(eq(schema.users.organizationId, organizationId));

		const duplicate = checkStaffDuplicates(existingUsers, {
			id: "NEW",
			fullName: input.fullName,
			snils: input.snils ?? null,
			email: input.email ?? null,
			phone: input.phone ?? null,
		});

		if (duplicate) {
			throw new Error(duplicate.message);
		}

		const [createdRow] = await tx
			.insert(schema.users)
			.values({
				organizationId,
				fullName: input.fullName,
				role: input.role,
				phone: input.phone || null,
				email: input.email || null,
				snils: snilsToSave,
				isActive: true,
				workingHours: input.workingHours,
			})
			.returning();

		return createdRow;
	};

	const inserted = externalTx
		? await run(externalTx)
		: await withTenantCtx(organizationId, run);

	if (!inserted) {
		throw new Error("Не удалось добавить сотрудника в базу данных.");
	}

	const nowIso = new Date().toISOString();
	return {
		id: inserted.id,
		organizationId: inserted.organizationId,
		fullName: inserted.fullName,
		role: input.role,
		specialties: ["universal"],
		phone: inserted.phone,
		email: inserted.email,
		active: inserted.isActive,
		...staffAuthorityFlags(inserted.role),
		color: "#000000",
		...(inserted.workingHours
			? { workingHours: inserted.workingHours as StaffMember["workingHours"] }
			: {}),
		createdAt: nowIso,
		updatedAt: nowIso,
	};
}

export async function updateStaffWorkingHoursInDb(
	organizationId: string,
	staffId: string,
	input: UpdateStaffWorkingHoursInput | StaffMember["workingHours"] | null | undefined,
	externalTx?: TenantDb | undefined,
) {
	if (!input) return;
	const workingHours = Array.isArray(input) ? input : input.workingHours;
	if (!workingHours) return;
	const workingHoursInput: UpdateStaffWorkingHoursInput = { workingHours };
	if (useInMemory()) {
		return updateStaffWorkingHoursInMemory(staffId, workingHoursInput);
	}
	const run = async (tx: TenantDb) => {
		await tx
			.update(schema.users)
			.set({ workingHours })
			.where(
				and(
					eq(schema.users.id, staffId),
					eq(schema.users.organizationId, organizationId),
				),
			);
	};
	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

/**
 * Правка карточки сотрудника с атомарным обновлением ставки врача через savepoint.
 */
export async function updateStaffMemberProfileInDb(
	organizationId: string,
	staffId: string,
	input: UpdateStaffMemberProfileInput,
	externalTx?: TenantDb | undefined,
) {
	if (useInMemory()) {
		updateStaffMemberProfileInMemory(staffId, input);
		return;
	}
	const updateData: {
		fullName?: string;
		role?: string;
		phone?: string | null;
		email?: string | null;
		isActive?: boolean;
		specialties?: string[];
		snils?: string | null;
		canSignMedicalRecords?: boolean;
		canManageMoney?: boolean;
		canManageImports?: boolean;
	} = {};
	if (input.fullName !== undefined) updateData.fullName = input.fullName;
	if (input.role !== undefined) updateData.role = input.role;
	if (input.phone !== undefined) updateData.phone = input.phone;
	if (input.email !== undefined) updateData.email = input.email;
	if (input.active !== undefined) updateData.isActive = input.active;
	if (input.specialties !== undefined) updateData.specialties = input.specialties;
	if (input.snils !== undefined) updateData.snils = input.snils;
	if (input.canSignMedicalRecords !== undefined) {
		updateData.canSignMedicalRecords = input.canSignMedicalRecords;
	}
	if (input.canManageMoney !== undefined) {
		updateData.canManageMoney = input.canManageMoney;
	}
	if (input.canManageImports !== undefined) {
		updateData.canManageImports = input.canManageImports;
	}

	const run = async (tx: TenantDb) => {
		if (Object.keys(updateData).length > 0) {
			await tx
				.update(schema.users)
				.set(updateData)
				.where(
					and(
						eq(schema.users.id, staffId),
						eq(schema.users.organizationId, organizationId),
					),
				);
		}
		const commissionPct = input.commissionPct;
		if (commissionPct !== undefined && commissionPct !== null) {
			await withSavepoint(tx, async (spTx) =>
				setDoctorCommissionRateInDb(
					organizationId,
					staffId,
					commissionPct,
					{
						materialCostDeductionPct: input.materialCostDeductionPct ?? undefined,
						labCostDeductionPct: input.labCostDeductionPct ?? undefined,
					},
					spTx,
				),
			);
		}
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

/**
 * Мягкое отключение сотрудника (is_active = false).
 */
export async function deactivateStaffMemberInDb(
	organizationId: string,
	staffId: string,
	externalTx?: TenantDb | undefined,
) {
	if (useInMemory()) {
		deactivateStaffMemberInMemory(staffId);
		return;
	}
	const run = async (tx: TenantDb) => {
		await tx
			.update(schema.users)
			.set({ isActive: false })
			.where(
				and(
					eq(schema.users.id, staffId),
					eq(schema.users.organizationId, organizationId),
				),
			);
	};
	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

export async function updateStaffCredentialsInDb(
	organizationId: string,
	staffId: string,
	updates: {
		email?: string;
		passwordHash?: string;
		pinCodeHash?: string;
		passwordEntropyBits?: number;
	},
	externalTx?: TenantDb | undefined,
) {
	if (useInMemory()) return;

	const userUpdates: Partial<typeof schema.users.$inferInsert> & {
		passwordEntropyBits?: number;
	} = { ...updates };
	delete userUpdates.passwordEntropyBits;

	const run = async (tx: TenantDb) => {
		if (updates.passwordEntropyBits !== undefined) {
			const [user] = await tx
				.select({ uiPreferences: schema.users.uiPreferences })
				.from(schema.users)
				.where(
					and(
						eq(schema.users.id, staffId),
						eq(schema.users.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!user) {
				throw new Error("Сотрудник не найден.");
			}

			const existingUi = (user.uiPreferences as Record<string, unknown>) || {};
			const existingHr = (existingUi.hrProfile as Record<string, unknown>) || {};
			userUpdates.uiPreferences = {
				...existingUi,
				hrProfile: {
					...existingHr,
					passwordEntropyBits: updates.passwordEntropyBits,
				},
			};
		}

		const updatedRows = await tx
			.update(schema.users)
			.set(userUpdates)
			.where(
				and(
					eq(schema.users.id, staffId),
					eq(schema.users.organizationId, organizationId),
				),
			)
			.returning({ id: schema.users.id });

		if (updatedRows.length === 0) {
			throw new Error("Сотрудник не найден.");
		}
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

const COMMISSION_STORAGE_UNAVAILABLE =
	"Ставка врача не сохранена: хранение отключено (DENTAL_STATE_PERSISTENCE=off), ставки живут только в базе. Включите базу и повторите.";

/**
 * Действующие ставки всех врачей организации, самая свежая первой.
 */
export async function listDoctorCommissionRatesInDb(
	organizationId: string,
	externalTx?: TenantDb | undefined,
): Promise<DoctorCommissionRate[]> {
	if (useInMemory()) return [];

	const run = async (tx: TenantDb): Promise<DoctorCommissionRate[]> => {
		const rows = await tx
			.select({
				userId: schema.doctorCommissions.userId,
				doctorId: schema.doctorCommissions.doctorId,
				commissionPct: schema.doctorCommissions.commissionPct,
				commissionPercent: schema.doctorCommissions.commissionPercent,
				materialCostDeductionPct:
					schema.doctorCommissions.materialCostDeductionPct,
				labCostDeductionPct: schema.doctorCommissions.labCostDeductionPct,
				effectiveFrom: schema.doctorCommissions.effectiveFrom,
			})
			.from(schema.doctorCommissions)
			.where(
				and(
					eq(schema.doctorCommissions.organizationId, organizationId),
					eq(schema.doctorCommissions.isActive, true),
				),
			)
			.orderBy(
				desc(schema.doctorCommissions.effectiveFrom),
				desc(schema.doctorCommissions.createdAt),
			);

		const rates: DoctorCommissionRate[] = [];
		for (const row of rows) {
			const resolvedUserId = row.userId || row.doctorId;
			if (!resolvedUserId) continue;
			rates.push({
				userId: resolvedUserId,
				commissionPct: row.commissionPct || row.commissionPercent || "25.00",
				materialCostDeductionPct: row.materialCostDeductionPct,
				labCostDeductionPct: row.labCostDeductionPct ?? "0",
				effectiveFrom: row.effectiveFrom.toISOString(),
			});
		}
		return rates;
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

/**
 * Назначение ставки врачу — процента от кассы, по которому клиника платит за лечение.
 */
export async function setDoctorCommissionRateInDb(
	organizationId: string,
	staffId: string,
	commissionPct: number,
	options?: {
		materialCostDeductionPct?: number | undefined;
		labCostDeductionPct?: number | undefined;
	},
	externalTx?: TenantDb | undefined,
): Promise<DoctorCommissionRate> {
	if (useInMemory()) throw new Error(COMMISSION_STORAGE_UNAVAILABLE);

	const run = async (tx: TenantDb): Promise<DoctorCommissionRate> => {
		const [staffMember] = await tx
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(
				and(
					eq(schema.users.id, staffId),
					eq(schema.users.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!staffMember) throw new Error("Сотрудник не найден.");

		const normalizedPct = commissionPct.toFixed(2);
		const [previous] = await tx
			.select({
				materialCostDeductionPct:
					schema.doctorCommissions.materialCostDeductionPct,
				labCostDeductionPct:
					schema.doctorCommissions.labCostDeductionPct,
			})
			.from(schema.doctorCommissions)
			.where(
				and(
					eq(schema.doctorCommissions.organizationId, organizationId),
					or(
						eq(schema.doctorCommissions.userId, staffId),
						eq(schema.doctorCommissions.doctorId, staffId),
					),
					eq(schema.doctorCommissions.isActive, true),
				),
			)
			.orderBy(
				desc(schema.doctorCommissions.effectiveFrom),
				desc(schema.doctorCommissions.createdAt),
			)
			.limit(1);

		await tx
			.update(schema.doctorCommissions)
			.set({ isActive: false })
			.where(
				and(
					eq(schema.doctorCommissions.organizationId, organizationId),
					or(
						eq(schema.doctorCommissions.userId, staffId),
						eq(schema.doctorCommissions.doctorId, staffId),
					),
					eq(schema.doctorCommissions.isActive, true),
				),
			);

		const effectiveFrom = new Date();
		const nextMaterialDeductionPct =
			options?.materialCostDeductionPct !== undefined
				? options.materialCostDeductionPct.toFixed(2)
				: (previous?.materialCostDeductionPct ?? "0");
		const nextLabDeductionPct =
			options?.labCostDeductionPct !== undefined
				? options.labCostDeductionPct.toFixed(2)
				: (previous?.labCostDeductionPct ?? "0");

		const [inserted] = await tx
			.insert(schema.doctorCommissions)
			.values({
				organizationId,
				userId: staffId,
				doctorId: staffId,
				specialty: "universal",
				serviceCategory: "other",
				commissionPct: normalizedPct,
				commissionPercent: normalizedPct,
				materialCostDeductionPct: nextMaterialDeductionPct,
				labCostDeductionPct: nextLabDeductionPct,
				isActive: true,
				effectiveFrom,
			})
			.returning({
				commissionPct: schema.doctorCommissions.commissionPct,
				materialCostDeductionPct:
					schema.doctorCommissions.materialCostDeductionPct,
				labCostDeductionPct:
					schema.doctorCommissions.labCostDeductionPct,
				effectiveFrom: schema.doctorCommissions.effectiveFrom,
			});
		if (!inserted) {
			throw new Error(
				"Ставка врача не сохранена: строка ставки не записалась.",
			);
		}

		return {
			userId: staffId,
			commissionPct: inserted.commissionPct,
			materialCostDeductionPct: inserted.materialCostDeductionPct,
			labCostDeductionPct: inserted.labCostDeductionPct ?? "0",
			effectiveFrom: inserted.effectiveFrom.toISOString(),
		};
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

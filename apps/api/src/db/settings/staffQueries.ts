import type { CreateStaffMemberInput, StaffMember } from "@dental/shared";
import {
	checkStaffDuplicates,
	validateStaffSnils,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import {
	createStaffMember as createStaffMemberInMemory,
	deactivateStaffMember as deactivateStaffMemberInMemory,
	updateStaffMemberProfile as updateStaffMemberProfileInMemory,
	updateStaffWorkingHours as updateStaffWorkingHoursInMemory,
} from "../../sampleData.js";
import type {
	DoctorCommissionRate,
	UpdateStaffMemberProfileInput,
} from "./types.js";
import { useInMemory } from "./types.js";
import { staffAuthorityFlags } from "../../security/permissions.js";
import { db } from "../client.js";
import * as schema from "../schema.js";

export async function createStaffMemberInDb(
	organizationId: string,
	input: CreateStaffMemberInput,
): Promise<StaffMember> {
	if (useInMemory()) return createStaffMemberInMemory(input);

	if (input.snils) {
		const snilsCheck = validateStaffSnils(input.snils);
		if (!snilsCheck.isValid) {
			throw new Error(snilsCheck.error || "Невалидный СНИЛС сотрудника.");
		}
	}

	const existingUsers = await db
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

	const [inserted] = await db
		.insert(schema.users)
		.values({
			organizationId,
			fullName: input.fullName,
			role: input.role,
			phone: input.phone || null,
			email: input.email || null,
			snils: input.snils || null,
			isActive: true,
			workingHours: input.workingHours,
		})
		.returning();

	if (!inserted) {
		throw new Error("Не удалось добавить сотрудника в базу данных.");
	}

	return {
		id: inserted.id,
		organizationId: inserted.organizationId,
		fullName: inserted.fullName,
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		role: inserted.role as any,
		specialties: ["universal"],
		phone: inserted.phone,
		email: inserted.email,
		active: inserted.isActive,
		...staffAuthorityFlags(inserted.role),
		color: "#000000",
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		workingHours: inserted.workingHours as any,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	} as StaffMember;
}

export async function updateStaffWorkingHoursInDb(
	organizationId: string,
	staffId: string,
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	workingHours: any,
) {
	if (useInMemory())
		return updateStaffWorkingHoursInMemory(staffId, workingHours);
	await db
		.update(schema.users)
		.set({ workingHours })
		.where(
			and(
				eq(schema.users.id, staffId),
				eq(schema.users.organizationId, organizationId),
			),
		);
}

/**
 * Правка карточки сотрудника. Пишутся только те поля, которые действительно
 * есть в таблице users и возвращаются назад через getClinicSettingsFromDb:
 * иначе интерфейс показывал бы «сохранено», а после перезагрузки — старое
 * значение. Специальности сюда не входят: столбец users.specialties есть, но
 * чтение жестко отдает ["universal"], так что запись была бы невидимой.
 */
export async function updateStaffMemberProfileInDb(
	organizationId: string,
	staffId: string,
	input: UpdateStaffMemberProfileInput,
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
	} = {};
	if (input.fullName !== undefined) updateData.fullName = input.fullName;
	if (input.role !== undefined) updateData.role = input.role;
	if (input.phone !== undefined) updateData.phone = input.phone;
	if (input.email !== undefined) updateData.email = input.email;
	if (input.active !== undefined) updateData.isActive = input.active;
	if (Object.keys(updateData).length === 0) return;
	await db
		.update(schema.users)
		.set(updateData)
		.where(
			and(
				eq(schema.users.id, staffId),
				eq(schema.users.organizationId, organizationId),
			),
		);
}

/**
 * Мягкое отключение сотрудника вместо DELETE: на users.id ссылаются приемы
 * (appointments.doctor_user_id, appointments.assistant_user_id) и медицинские
 * записи. Физическое удаление либо упало бы на внешнем ключе, либо стерло
 * авторство лечения. Строка остается, is_active становится false.
 */
export async function deactivateStaffMemberInDb(
	organizationId: string,
	staffId: string,
) {
	if (useInMemory()) {
		deactivateStaffMemberInMemory(staffId);
		return;
	}
	await db
		.update(schema.users)
		.set({ isActive: false })
		.where(
			and(
				eq(schema.users.id, staffId),
				eq(schema.users.organizationId, organizationId),
			),
		);
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
) {
	if (useInMemory()) return;

	// biome-ignore lint/suspicious/noExplicitAny: DB update payload
	const userUpdates: any = { ...updates };
	delete userUpdates.passwordEntropyBits;

	if (updates.passwordEntropyBits !== undefined) {
		const [user] = await db
			.select({ uiPreferences: schema.users.uiPreferences })
			.from(schema.users)
			.where(
				and(
					eq(schema.users.id, staffId),
					eq(schema.users.organizationId, organizationId),
				),
			)
			.limit(1);

		if (user) {
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
	}

	await db
		.update(schema.users)
		.set(userUpdates)
		.where(
			and(
				eq(schema.users.id, staffId),
				eq(schema.users.organizationId, organizationId),
			),
		);
}

const COMMISSION_STORAGE_UNAVAILABLE =
	"Ставка врача не сохранена: хранение отключено (DENTAL_STATE_PERSISTENCE=off), ставки живут только в базе. Включите базу и повторите.";

/**
 * Действующие ставки всех врачей организации, самая свежая первой.
 *
 * Отдаются только строки с is_active = true: отключённые остаются в таблице
 * ради истории, но платить по ним нельзя. Порядок совпадает с порядком, по
 * которому ставку выбирает расчёт выплат (свежая effective_from, при равенстве
 * — свежая created_at), поэтому первая строка на врача — та же, по которой
 * посчитаются деньги.
 */
export async function listDoctorCommissionRatesInDb(
	organizationId: string,
): Promise<DoctorCommissionRate[]> {
	if (useInMemory()) return [];
	const rows = await db
		.select({
			userId: schema.doctorCommissions.userId,
			commissionPct: schema.doctorCommissions.commissionPct,
			materialCostDeductionPct:
				schema.doctorCommissions.materialCostDeductionPct,
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
		// user_id в схеме допускает NULL, а платить по строке без врача нельзя:
		// такая ставка не принадлежит никому и в расчёт выплат тоже не попадает.
		if (!row.userId) continue;
		rates.push({
			userId: row.userId,
			commissionPct: row.commissionPct,
			materialCostDeductionPct: row.materialCostDeductionPct,
			effectiveFrom: row.effectiveFrom.toISOString(),
		});
	}
	return rates;
}

/**
 * Назначение ставки врачу.
 *
 * Три решения, каждое из которых иначе стоило бы клинике денег:
 *
 * 1. Пишутся ОБА процента — commission_pct и commission_percent. Рядом в
 *    таблице живёт commission_percent с DEFAULT '25'. Вставка без него
 *    оставила бы в ОДНОЙ строке два несогласованных числа (45 % в одной
 *    колонке, 25 % в другой), и первый же будущий читатель второй колонки
 *    заплатил бы врачу другую сумму — без ошибки и без расхождения в логах.
 *
 * 2. Прежние действующие ставки отключаются, а не остаются рядом. Уникальности
 *    в базе нет, и при нескольких активных строках расчёт берёт самую свежую,
 *    приписывая к выплате предупреждение о двоящейся настройке
 *    (doctorPayouts.ts:373). Ставка врача не должна зависеть от порядка строк.
 *
 * 3. Строки не удаляются: is_active = false сохраняет, что клиника назначала
 *    раньше. Прошлые периоды продолжают считаться по той ставке, которая
 *    действовала тогда, — новая начинает действовать с момента назначения.
 *
 * Доля себестоимости материалов (material_cost_deduction_pct) переносится из
 * прежней действующей строки: это ВТОРАЯ, независимая договорённость с врачом,
 * и правка процента от кассы не имеет права её обнулять.
 */
export async function setDoctorCommissionRateInDb(
	organizationId: string,
	staffId: string,
	commissionPct: number,
): Promise<DoctorCommissionRate> {
	if (useInMemory()) throw new Error(COMMISSION_STORAGE_UNAVAILABLE);

	const [staffMember] = await db
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

	return db.transaction(async (tx) => {
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
					eq(schema.doctorCommissions.userId, staffId),
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
					eq(schema.doctorCommissions.userId, staffId),
					eq(schema.doctorCommissions.isActive, true),
				),
			);

		const effectiveFrom = new Date();
		const [inserted] = await tx
			.insert(schema.doctorCommissions)
			.values({
				organizationId,
				userId: staffId,
				/*
				 * specialty и service_category передаются ЯВНО, и это не избыточность.
				 * Модель Drizzle описывает их как text со значением по умолчанию, а в
				 * живой таблице это перечисления (dental_specialty, service_category)
				 * NOT NULL и БЕЗ значения по умолчанию — замерено на базе. Вставка,
				 * доверившаяся модели, отправляла в обе колонки DEFAULT, получала NULL и
				 * падала на NOT NULL: ставка не сохранялась, а владелец видел «проверьте
				 * выбранного сотрудника и процент», где ни сотрудник, ни процент не были
				 * виноваты. Ровно поэтому их явно передаёт и routes/diary.ts.
				 *
				 * Значения выбраны как наименее лживые: расчёт выплат
				 * (services/finance/doctorPayouts.ts) не фильтрует ставку ни по
				 * специальности, ни по категории услуги — он берёт любую действующую
				 * строку врача. Поставить здесь «therapy» значило бы заявить, что процент
				 * действует только на терапию, чего клиника не говорила.
				 *
				 * ДОЛГ: раздельные ставки по категориям услуг в продукте отсутствуют, а
				 * колонки под них в таблице есть. Это продуктовое решение, и выдумывать
				 * его здесь нельзя.
				 */
				specialty: "universal",
				serviceCategory: "other",
				commissionPct: normalizedPct,
				commissionPercent: normalizedPct,
				materialCostDeductionPct: previous?.materialCostDeductionPct ?? "0",
				labCostDeductionPct: previous?.labCostDeductionPct ?? "0",
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
		if (!inserted)
			throw new Error(
				"Ставка врача не сохранена: строка ставки не записалась.",
			);

		return {
			userId: staffId,
			commissionPct: inserted.commissionPct,
			materialCostDeductionPct: inserted.materialCostDeductionPct,
			effectiveFrom: inserted.effectiveFrom.toISOString(),
		};
	});
}

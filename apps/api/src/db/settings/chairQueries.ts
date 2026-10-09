import type { CreateChairInput, DentalSpecialty } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import {
	createChair as createChairInMemory,
	deactivateChair as deactivateChairInMemory,
	updateChairProfile as updateChairProfileInMemory,
	updateChairWorkingHours as updateChairWorkingHoursInMemory,
} from "../../sampleData.js";
import type { UpdateChairProfileInput } from "./types.js";
import { useInMemory } from "./types.js";
import { db } from "../client.js";
import * as schema from "../schema.js";

export async function createChairInDb(
	organizationId: string,
	input: CreateChairInput,
) {
	if (useInMemory()) return createChairInMemory(input);
	const [clinic] = await db
		.select()
		.from(schema.clinics)
		.where(eq(schema.clinics.organizationId, organizationId))
		.limit(1);
	if (!clinic) throw new Error("Клиника не найдена в базе данных.");

	const equipmentParts: string[] = [];
	if (input.room) equipmentParts.push(`Кабинет: ${input.room}`);
	if (input.hasXraySensor) equipmentParts.push("рентген");
	if (input.hasMicroscope) equipmentParts.push("микроскоп");
	if (input.hasSurgeryKit) equipmentParts.push("хирургия");
	if (input.notes) equipmentParts.push(input.notes);

	await db.insert(schema.chairs).values({
		organizationId,
		clinicId: clinic.id,
		name: input.name,
		specializations: input.specialization ?? null,
		equipment: equipmentParts.length > 0 ? equipmentParts.join(", ") : null,
		isActive: true,
		workingHours: input.workingHours,
	});
}

export async function updateChairWorkingHoursInDb(
	organizationId: string,
	chairId: string,
	workingHours: unknown,
) {
	if (useInMemory())
		return updateChairWorkingHoursInMemory(
			chairId,
			workingHours as {
				workingHours: {
					enabled: boolean;
					weekday: number;
					start: string;
					end: string;
				}[];
			},
		);
	await db
		.update(schema.chairs)
		.set({ workingHours })
		.where(
			and(
				eq(schema.chairs.id, chairId),
				eq(schema.chairs.organizationId, organizationId),
			),
		);
}

/**
 * Правка кресла. В таблице chairs из карточки кресла хранятся только название
 * и признак активности, а кабинет, специализация и оснащение читаются как
 * пустые значения — принимать их означало бы молча терять ввод оператора.
 */
export async function updateChairProfileInDb(
	organizationId: string,
	chairId: string,
	input: UpdateChairProfileInput,
) {
	if (useInMemory()) {
		updateChairProfileInMemory(chairId, input);
		return;
	}
	const updateData: { name?: string; isActive?: boolean } = {};
	if (input.name !== undefined) updateData.name = input.name;
	if (input.active !== undefined) updateData.isActive = input.active;
	if (Object.keys(updateData).length === 0) return;
	await db
		.update(schema.chairs)
		.set(updateData)
		.where(
			and(
				eq(schema.chairs.id, chairId),
				eq(schema.chairs.organizationId, organizationId),
			),
		);
}

/**
 * Мягкое отключение кресла вместо DELETE: на chairs.id ссылаются приемы
 * (appointments.chair_id). Строка остается, is_active становится false, уже
 * назначенные приемы не теряют привязку к кабинету.
 */
export async function deactivateChairInDb(
	organizationId: string,
	chairId: string,
) {
	if (useInMemory()) {
		deactivateChairInMemory(chairId);
		return;
	}
	await db
		.update(schema.chairs)
		.set({ isActive: false })
		.where(
			and(
				eq(schema.chairs.id, chairId),
				eq(schema.chairs.organizationId, organizationId),
			),
		);
}

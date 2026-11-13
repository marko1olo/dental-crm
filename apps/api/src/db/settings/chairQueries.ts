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
	let [clinic] = await db
		.select()
		.from(schema.clinics)
		.where(eq(schema.clinics.organizationId, organizationId))
		.limit(1);

	if (!clinic) {
		const [org] = await db
			.select({ name: schema.organizations.name })
			.from(schema.organizations)
			.where(eq(schema.organizations.id, organizationId))
			.limit(1);
		const [createdClinic] = await db
			.insert(schema.clinics)
			.values({
				organizationId,
				name: org?.name || "Основное отделение",
			})
			.returning();
		clinic = createdClinic;
	}

	if (!clinic) throw new Error("Не удалось инициализировать отделение клиники для добавления кресла.");

	const equipmentParts: string[] = [];
	if (input.hasXraySensor) equipmentParts.push("рентген");
	if (input.hasMicroscope) equipmentParts.push("микроскоп");
	if (input.hasSurgeryKit) equipmentParts.push("хирургия");
	if (input.notes) equipmentParts.push(input.notes);

	await db.insert(schema.chairs).values({
		organizationId,
		clinicId: clinic.id,
		name: input.name,
		room: input.room ?? null,
		color: input.color ?? null,
		defaultDoctorId: input.defaultDoctorId ?? null,
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
 * Правка кресла в базе данных с сохранением названия, активности, кабинета, цвета и оснащения.
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
	const updateData: {
		name?: string;
		isActive?: boolean;
		specializations?: string | null;
		room?: string | null;
		color?: string | null;
		defaultDoctorId?: string | null;
		equipment?: string | null;
	} = {};
	if (input.name !== undefined) updateData.name = input.name;
	if (input.active !== undefined) updateData.isActive = input.active;
	if (input.specialization !== undefined) updateData.specializations = input.specialization ?? null;
	if (input.room !== undefined) updateData.room = input.room ?? null;
	if (input.color !== undefined) updateData.color = input.color ?? null;
	if (input.defaultDoctorId !== undefined) updateData.defaultDoctorId = input.defaultDoctorId ?? null;

	const hasEquipmentField =
		input.hasXraySensor !== undefined ||
		input.hasMicroscope !== undefined ||
		input.hasSurgeryKit !== undefined ||
		input.notes !== undefined;

	if (hasEquipmentField) {
		const [existing] = await db
			.select()
			.from(schema.chairs)
			.where(
				and(
					eq(schema.chairs.id, chairId),
					eq(schema.chairs.organizationId, organizationId),
				),
			)
			.limit(1);

		const eqStr = existing?.equipment || "";
		const currentHasXray = eqStr.toLowerCase().includes("рентген") || eqStr.toLowerCase().includes("xray");
		const currentHasMicroscope = eqStr.toLowerCase().includes("микроскоп") || eqStr.toLowerCase().includes("microscope");
		const currentHasSurgery = eqStr.toLowerCase().includes("хирург") || eqStr.toLowerCase().includes("surgery");

		const hasXray = input.hasXraySensor !== undefined ? input.hasXraySensor : currentHasXray;
		const hasMicroscope = input.hasMicroscope !== undefined ? input.hasMicroscope : currentHasMicroscope;
		const hasSurgery = input.hasSurgeryKit !== undefined ? input.hasSurgeryKit : currentHasSurgery;
		const notes = input.notes !== undefined ? input.notes : null;

		const equipmentParts: string[] = [];
		if (hasXray) equipmentParts.push("рентген");
		if (hasMicroscope) equipmentParts.push("микроскоп");
		if (hasSurgery) equipmentParts.push("хирургия");
		if (notes) equipmentParts.push(notes);

		updateData.equipment = equipmentParts.length > 0 ? equipmentParts.join(", ") : null;
	}

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

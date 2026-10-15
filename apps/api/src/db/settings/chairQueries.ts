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
	if (input.room) equipmentParts.push(`Кабинет: ${input.room}`);
	if (input.color) equipmentParts.push(`Цвет: ${input.color}`);
	if (input.defaultDoctorId) equipmentParts.push(`Врач: ${input.defaultDoctorId}`);
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
		equipment?: string | null;
	} = {};
	if (input.name !== undefined) updateData.name = input.name;
	if (input.active !== undefined) updateData.isActive = input.active;
	if (input.specialization !== undefined) updateData.specializations = input.specialization ?? null;

	const hasEquipmentField =
		input.room !== undefined ||
		input.color !== undefined ||
		input.defaultDoctorId !== undefined ||
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
		const currentRoom = eqStr.match(/Кабинет:\s*([^,]+)/)?.[1]?.trim() ?? null;
		const currentColor = eqStr.match(/Цвет:\s*([^,]+)/)?.[1]?.trim() ?? null;
		const currentDoctor = eqStr.match(/Врач:\s*([^,]+)/)?.[1]?.trim() ?? null;
		const currentHasXray = eqStr.toLowerCase().includes("рентген") || eqStr.toLowerCase().includes("xray");
		const currentHasMicroscope = eqStr.toLowerCase().includes("микроскоп") || eqStr.toLowerCase().includes("microscope");
		const currentHasSurgery = eqStr.toLowerCase().includes("хирург") || eqStr.toLowerCase().includes("surgery");

		const room = input.room !== undefined ? input.room : currentRoom;
		const color = input.color !== undefined ? input.color : currentColor;
		const defaultDoctorId = input.defaultDoctorId !== undefined ? input.defaultDoctorId : currentDoctor;
		const hasXray = input.hasXraySensor !== undefined ? input.hasXraySensor : currentHasXray;
		const hasMicroscope = input.hasMicroscope !== undefined ? input.hasMicroscope : currentHasMicroscope;
		const hasSurgery = input.hasSurgeryKit !== undefined ? input.hasSurgeryKit : currentHasSurgery;
		const notes = input.notes !== undefined ? input.notes : null;

		const equipmentParts: string[] = [];
		if (room) equipmentParts.push(`Кабинет: ${room}`);
		if (color) equipmentParts.push(`Цвет: ${color}`);
		if (defaultDoctorId) equipmentParts.push(`Врач: ${defaultDoctorId}`);
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

import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { messengerInboundEvents, patients } from "../../../db/schema.js";
import type { BotChannel } from "../../../services/bots/types.js";

/**
 * Привязка активного чата к существующей или новой карте пациента.
 */
export async function handleLinkPatient(
	orgId: string,
	senderId: string,
	channel: BotChannel = "telegram",
	patientId?: string,
	createNew?: { fullName: string; phone?: string | null },
): Promise<{
	ok: boolean;
	statusCode?: number;
	error?: string;
	message?: string;
	patient?: { id: string; fullName: string; phone: string | null };
}> {
	let targetPatient: { id: string; fullName: string; phone: string | null } | null = null;

	if (patientId) {
		const [existing] = await db
			.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone, notes: patients.notes })
			.from(patients)
			.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
			.limit(1);

		if (!existing) {
			return { ok: false, statusCode: 404, error: "PatientNotFound", message: "Пациент не найден." };
		}
		targetPatient = existing;

		// Дописываем маркер мессенджера в notes если ещё нет
		const marker = `${channel}:${senderId}`;
		if (!existing.notes || !existing.notes.includes(marker)) {
			await db
				.update(patients)
				.set({
					notes: existing.notes ? `${existing.notes} • ${marker}` : marker,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(patients.organizationId, orgId),
						eq(patients.id, existing.id),
					),
				);
		}
	} else if (createNew && createNew.fullName.trim()) {
		const marker = `${channel}:${senderId}`;
		const [created] = await db
			.insert(patients)
			.values({
				organizationId: orgId,
				fullName: createNew.fullName.trim(),
				phone: createNew.phone?.trim() || null,
				status: "active",
				notes: `Создан из чата оператора (${marker})`,
			})
			.returning({ id: patients.id, fullName: patients.fullName, phone: patients.phone });

		if (!created) {
			return { ok: false, statusCode: 500, error: "CreateFailed", message: "Не удалось создать карту пациента." };
		}
		targetPatient = created;
	} else {
		return {
			ok: false,
			statusCode: 400,
			error: "ValidationError",
			message: "Укажите ID существующего пациента либо данные для создания нового.",
		};
	}

	// Обновляем все входящие события этого чата
	await db
		.update(messengerInboundEvents)
		.set({ patientId: targetPatient.id })
		.where(
			and(
				eq(messengerInboundEvents.organizationId, orgId),
				eq(messengerInboundEvents.channel, channel),
				eq(messengerInboundEvents.externalChatId, senderId),
			),
		);

	return {
		ok: true,
		patient: targetPatient,
		message: `Чат ${channel.toUpperCase()} успешно привязан к карте: ${targetPatient.fullName}`,
	};
}

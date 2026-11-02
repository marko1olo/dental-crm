import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	appointments,
	chairs,
	patients,
	users,
} from "../../../db/schema.js";
import { omnichannelBotEngine } from "../../../services/bots/OmnichannelBotEngine.js";
import type { BotChannel } from "../../../services/bots/types.js";

/**
 * Создание записи на приём из чата оператора с авто-подтверждением в мессенджер.
 */
export async function handleBookAppointment(
	orgId: string,
	senderId: string,
	options: {
		channel?: BotChannel;
		patientId: string;
		doctorUserId?: string;
		startsAt: string;
		endsAt: string;
		reason?: string;
		sendConfirmationToChat?: boolean;
		operatorName?: string;
	},
): Promise<{
	ok: boolean;
	statusCode?: number;
	error?: string;
	message?: string;
	appointmentId?: string;
}> {
	const {
		channel = "telegram",
		patientId,
		doctorUserId,
		startsAt,
		endsAt,
		reason = "Консультация и первичный осмотр",
		sendConfirmationToChat = true,
		operatorName = "Оператор клиники",
	} = options;

	if (!patientId || !startsAt || !endsAt) {
		return {
			ok: false,
			statusCode: 400,
			error: "ValidationError",
			message: "Необходимо указать patientId, startsAt и endsAt.",
		};
	}

	// 1. Проверяем пациента
	const [patient] = await db
		.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
		.from(patients)
		.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
		.limit(1);

	if (!patient) {
		return { ok: false, statusCode: 404, error: "PatientNotFound", message: "Пациент не найден." };
	}

	// 2. Определяем врача
	let selectedDoctorId = doctorUserId;
	let doctorName = "Дежурный врач";
	if (selectedDoctorId) {
		const [doc] = await db
			.select({ id: users.id, fullName: users.fullName })
			.from(users)
			.where(and(eq(users.organizationId, orgId), eq(users.id, selectedDoctorId)))
			.limit(1);
		if (doc) doctorName = doc.fullName;
	} else {
		const [firstDoc] = await db
			.select({ id: users.id, fullName: users.fullName })
			.from(users)
			.where(
				and(
					eq(users.organizationId, orgId),
					inArray(users.role, ["doctor", "owner", "administrator"]),
				),
			)
			.limit(1);
		if (firstDoc) {
			selectedDoctorId = firstDoc.id;
			doctorName = firstDoc.fullName;
		}
	}

	// 3. Определяем кресло
	const [chair] = await db
		.select({ id: chairs.id })
		.from(chairs)
		.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)))
		.limit(1);

	// 4. Создаем запись в appointments
	const [newAppt] = await db
		.insert(appointments)
		.values({
			organizationId: orgId,
			patientId: patient.id,
			doctorUserId: selectedDoctorId || null,
			chairId: chair?.id || null,
			startsAt: new Date(startsAt),
			endsAt: new Date(endsAt),
			status: "planned",
			reason: reason.trim(),
			comment: `Записан через омниканальный чат оператора (${channel.toUpperCase()})`,
		})
		.returning({ id: appointments.id });

	if (!newAppt) {
		return { ok: false, statusCode: 500, error: "BookingFailed", message: "Не удалось создать запись на приём." };
	}

	// 5. Если запрошено авто-подтверждение в чат пациенту
	if (sendConfirmationToChat) {
		const startDate = new Date(startsAt);
		const formattedDate = startDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });
		const formattedTime = startDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

		const confirmText = `Здравствуйте, ${patient.fullName}! Вы успешно записаны на приём в клинику DENTE.\n\n📅 Дата: ${formattedDate}\n⏰ Время: ${formattedTime}\n👨‍⚕️ Врач: ${doctorName}\n🎯 Причина: ${reason}\n\n📍 Адрес: ул. Стоматологическая, 12 (парковка во дворе).\nЕсли потребуется перенести или отменить визит, просто ответьте в этот чат!`;

		await omnichannelBotEngine.sendOperatorMessage({
			channel,
			organizationId: orgId,
			senderId,
			message: confirmText,
			operatorName,
		});

		// Автоматически перехватываем чат оператором
		omnichannelBotEngine.takeoverChat(channel, orgId, senderId, operatorName);
	}

	return {
		ok: true,
		appointmentId: newAppt.id,
		message: `Запись успешно создана на ${new Date(startsAt).toLocaleString("ru-RU")}`,
	};
}

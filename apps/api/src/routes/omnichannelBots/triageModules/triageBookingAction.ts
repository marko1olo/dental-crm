import { and, eq } from "drizzle-orm";
import type { Appointment } from "@dental/shared";
import { createAppointmentInDb } from "../../../db/appointmentsQuery.js";
import { db } from "../../../db/client.js";
import {
	chairs,
	clinics,
	organizations,
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

	// 2. Определяем врача (строго с ролью 'doctor', исключая неврачебный персонал)
	let selectedDoctorId = doctorUserId;
	let doctorName = "Дежурный врач";
	if (selectedDoctorId) {
		const [doc] = await db
			.select({ id: users.id, fullName: users.fullName, role: users.role })
			.from(users)
			.where(
				and(
					eq(users.organizationId, orgId),
					eq(users.id, selectedDoctorId),
					eq(users.role, "doctor"),
				),
			)
			.limit(1);
		if (doc) {
			doctorName = doc.fullName;
		} else {
			return {
				ok: false,
				statusCode: 400,
				error: "DoctorNotFound",
				message: "Указанный сотрудник не найден или не является лечащим врачом клиники.",
			};
		}
	} else {
		const [firstDoc] = await db
			.select({ id: users.id, fullName: users.fullName })
			.from(users)
			.where(
				and(
					eq(users.organizationId, orgId),
					eq(users.role, "doctor"),
					eq(users.isActive, true),
				),
			)
			.limit(1);
		if (firstDoc) {
			selectedDoctorId = firstDoc.id;
			doctorName = firstDoc.fullName;
		} else {
			const [anyDoc] = await db
				.select({ id: users.id, fullName: users.fullName })
				.from(users)
				.where(and(eq(users.organizationId, orgId), eq(users.role, "doctor")))
				.limit(1);
			if (anyDoc) {
				selectedDoctorId = anyDoc.id;
				doctorName = anyDoc.fullName;
			}
		}
	}

	const startDate = new Date(startsAt);
	const endDate = new Date(endsAt);
	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
		return {
			ok: false,
			statusCode: 400,
			error: "ValidationError",
			message: "Некорректный временной интервал приёма.",
		};
	}

	// 3. Определяем кресло
	const [chair] = await db
		.select({ id: chairs.id })
		.from(chairs)
		.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)))
		.limit(1);

	// 4. Создаем запись через канонический SSOT createAppointmentInDb
	let createdAppt: Appointment | undefined;
	try {
		createdAppt = await createAppointmentInDb(orgId, {
			patientId: patient.id,
			doctorUserId: selectedDoctorId || null,
			chairId: chair?.id || null,
			startsAt: startDate.toISOString(),
			endsAt: endDate.toISOString(),
			status: "planned",
			reason: reason.trim(),
			comment: `Записан через омниканальный чат оператора (${channel.toUpperCase()})`,
		});
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		if (
			msg.includes("overlap_excl") ||
			msg.includes("exclusion") ||
			msg.includes("conflict") ||
			msg.includes("уже занято") ||
			msg.includes("уже есть запись") ||
			msg.includes("удерживается другим пользователем") ||
			msg.includes("резервирования слота")
		) {
			return {
				ok: false,
				statusCode: 409,
				error: "SlotConflict",
				message: "Выбранное время у врача, кресла или пациента уже занято другой записью или удерживается.",
			};
		}
		throw err;
	}

	if (!createdAppt) {
		return { ok: false, statusCode: 500, error: "BookingFailed", message: "Не удалось создать запись на приём." };
	}

	// 5. Если запрошено авто-подтверждение в чат пациенту
	if (sendConfirmationToChat) {
		const formattedDate = startDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });
		const formattedTime = startDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

		const [clinic] = await db
			.select({ name: clinics.name, address: clinics.address })
			.from(clinics)
			.where(eq(clinics.organizationId, orgId))
			.limit(1);

		let clinicAddress = clinic?.address?.trim();
		if (!clinicAddress) {
			const [org] = await db
				.select({ name: organizations.name, legalAddress: organizations.legalAddress })
				.from(organizations)
				.where(eq(organizations.id, orgId))
				.limit(1);
			clinicAddress = org?.legalAddress?.trim();
		}

		const addressLine = clinicAddress ? `\nАдрес: ${clinicAddress}` : "";
		const confirmText = `Здравствуйте, ${patient.fullName}! Вы успешно записаны на приём в клинику.\n\nДата: ${formattedDate}\nВремя: ${formattedTime}\nВрач: ${doctorName}\nПричина: ${reason}${addressLine}\n\nЕсли потребуется перенести или отменить визит, ответьте в этот чат.`;

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
		appointmentId: createdAppt.id,
		message: `Запись успешно создана на ${new Date(startsAt).toLocaleString("ru-RU")}`,
	};
}

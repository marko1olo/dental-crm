import { and, eq } from "drizzle-orm";
import type { Appointment } from "@dental/shared";
import { createAppointmentInDb } from "../../../db/appointmentsQuery.js";
import { withTenantCtx } from "../../../db/rls.js";
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
		channel?: BotChannel | undefined;
		patientId: string;
		doctorUserId?: string | undefined;
		startsAt: string;
		endsAt: string;
		reason?: string | undefined;
		sendConfirmationToChat?: boolean | undefined;
		operatorName?: string | undefined;
	},
): Promise<{
	ok: boolean;
	statusCode?: number | undefined;
	error?: string | undefined;
	message?: string | undefined;
	appointmentId?: string | undefined;
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

	const preflight = await withTenantCtx(orgId, async (tx) => {
		// 1. Проверяем пациента
		const [patientRow] = await tx
			.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
			.from(patients)
			.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
			.limit(1);

		if (!patientRow) {
			return {
				ok: false as const,
				response: { ok: false, statusCode: 404, error: "PatientNotFound", message: "Пациент не найден." },
			};
		}

		// 2. Определяем врача (строго с ролью 'doctor', исключая неврачебный персонал)
		let docId = doctorUserId;
		let docName = "Дежурный врач";
		if (docId) {
			const [doc] = await tx
				.select({ id: users.id, fullName: users.fullName, role: users.role })
				.from(users)
				.where(
					and(
						eq(users.organizationId, orgId),
						eq(users.id, docId),
						eq(users.role, "doctor"),
					),
				)
				.limit(1);
			if (doc) {
				docName = doc.fullName;
			} else {
				return {
					ok: false as const,
					response: {
						ok: false,
						statusCode: 400,
						error: "DoctorNotFound",
						message: "Указанный сотрудник не найден или не является лечащим врачом клиники.",
					},
				};
			}
		} else {
			const [firstDoc] = await tx
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
				docId = firstDoc.id;
				docName = firstDoc.fullName;
			} else {
				const [anyDoc] = await tx
					.select({ id: users.id, fullName: users.fullName })
					.from(users)
					.where(and(eq(users.organizationId, orgId), eq(users.role, "doctor")))
					.limit(1);
				if (anyDoc) {
					docId = anyDoc.id;
					docName = anyDoc.fullName;
				}
			}
		}

		const startDate = new Date(startsAt);
		const endDate = new Date(endsAt);
		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
			return {
				ok: false as const,
				response: {
					ok: false,
					statusCode: 400,
					error: "ValidationError",
					message: "Некорректный временной интервал приёма.",
				},
			};
		}

		// 3. Определяем кресло
		const [chairRow] = await tx
			.select({ id: chairs.id })
			.from(chairs)
			.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)))
			.limit(1);

		return {
			ok: true as const,
			patient: patientRow,
			selectedDoctorId: docId,
			doctorName: docName,
			startDate,
			endDate,
			chairId: chairRow?.id || null,
		};
	});

	if (!preflight.ok) {
		return preflight.response;
	}

	const { patient, selectedDoctorId, doctorName, startDate, endDate, chairId } = preflight;

	// 4. Создаем запись через канонический SSOT createAppointmentInDb
	let createdAppt: Appointment | undefined;
	try {
		createdAppt = await createAppointmentInDb(orgId, {
			patientId: patient.id,
			doctorUserId: selectedDoctorId || null,
			chairId,
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

		const clinicAddress = await withTenantCtx(orgId, async (tx) => {
			const [clinic] = await tx
				.select({ name: clinics.name, address: clinics.address })
				.from(clinics)
				.where(eq(clinics.organizationId, orgId))
				.limit(1);

			let addr = clinic?.address?.trim();
			if (!addr) {
				const [org] = await tx
					.select({ name: organizations.name, legalAddress: organizations.legalAddress })
					.from(organizations)
					.where(eq(organizations.id, orgId))
					.limit(1);
				addr = org?.legalAddress?.trim();
			}
			return addr;
		});

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

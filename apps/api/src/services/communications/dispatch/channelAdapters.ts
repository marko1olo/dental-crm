/**
 * @file channelAdapters.ts
 * @description Layer 1: Channel adapters and recipient address resolvers
 * for SMS, Telegram, WhatsApp, MAX and Email.
 */

import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { patients } from "../../../db/schema.js";
import { isValidEmailAddress } from "../../../emailTransport.js";
import { normalizeRussianMsisdn } from "../../../smsTransport.js";
import { normalizeWhatsappRecipient } from "../../../whatsappTransport.js";
import {
	type CommunicationChannelCode,
	resolveTelegramChatId,
} from "../channelRouter.js";

/** Адрес получателя по правилам канала. Пустой результат — отправлять некуда. */
export async function resolveRecipientAddress(
	organizationId: string,
	channel: CommunicationChannelCode,
	patientId: string,
): Promise<{ address: string | null; reason: string | null }> {
	// Контекст ставится здесь по той же причине, что и в
	// resolveCommunicationSettings: функцию зовут и маршруты, и фоновый
	// цикл, а арендатор — обязательный аргумент. Без контекста и привязка к
	// Telegram, и карточка пациента читались как отсутствующие, и напоминание
	// молча отменялось с причиной «у пациента нет телефона».
	return withTenantCtx(organizationId, async (tx) => {
		if (channel === "telegram") {
			const chatId = await resolveTelegramChatId(organizationId, patientId);
			return chatId
				? { address: chatId, reason: null }
				: {
						address: null,
						reason: "У пациента нет активной привязки к Telegram-боту клиники.",
					};
		}

		const [patient] = await tx
			.select({
				phone: patients.phone,
				email: patients.email,
				notes: patients.notes,
			})
			.from(patients)
			.where(
				and(
					eq(patients.id, patientId),
					eq(patients.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!patient)
			return { address: null, reason: "Пациент не найден в этой организации." };

		if (channel === "max") {
			/*
			 * В MAX бот не пишет первым: диалог начинает пациент, и его идентификатор
			 * приходит во входящем событии. Разбор входящих оставляет метку
			 * `MAX:<chat_id>` в заметках карточки — отсюда и берётся адрес.
			 */
			const mark = /MAX:(-?\d{1,19})/.exec(patient.notes ?? "");
			return mark?.[1]
				? { address: mark[1], reason: null }
				: {
						address: null,
						reason:
							"У пациента нет переписки в MAX: бот не может написать первым, диалог начинает пациент.",
					};
		}

		if (channel === "email") {
			const email = patient.email?.trim() ?? "";
			return isValidEmailAddress(email)
				? { address: email, reason: null }
				: {
						address: null,
						reason: "У пациента не указан корректный адрес электронной почты.",
					};
		}

		const msisdn =
			channel === "whatsapp"
				? normalizeWhatsappRecipient(patient.phone)
				: normalizeRussianMsisdn(patient.phone);
		return msisdn
			? { address: msisdn, reason: null }
			: {
					address: null,
					reason: "У пациента не указан корректный номер телефона.",
				};
	});
}

/**
 * omnichannelActionHelpers.ts — Хелперы обработки интерактивных кнопок, файлов и счетов СБП.
 * Строго <= 120 строк по Мандату 8b.
 */

import { showToast } from "../../../GlobalToast.js";
import { formatCurrencyRu } from "../../omnichannelEngine.js";
import type {
	InteractiveButtonPayload,
	MessageAttachment,
	OmnichannelChannel,
	OmnichannelMessage,
	PatientOmnichannelContact,
	SbpPaymentInvoice,
} from "../types.js";

export function createInteractiveButtonReply(
	btn: InteractiveButtonPayload,
	originalMsg: OmnichannelMessage,
	patientId: string,
): OmnichannelMessage {
	return {
		id: `msg-${Date.now()}`,
		patientId,
		channel: originalMsg.channel,
		direction: "outbound",
		senderName: "Администратор клиники",
		senderType: "clinic_staff",
		timestamp: new Date().toISOString(),
		body: `Выбрано действие: ${btn.title}`,
		status: "sent",
	};
}

export function createFileAttachmentMessage(
	file: File,
	patientId: string,
	channel: OmnichannelChannel,
): { message: OmnichannelMessage; attachment: MessageAttachment } {
	const att: MessageAttachment = {
		id: `att-${Date.now()}`,
		name: file.name,
		type: file.type.includes("pdf") ? "pdf" : file.type.includes("image") ? "image" : "document",
		url: URL.createObjectURL(file),
		sizeFormatted: `${(file.size / 1024).toFixed(1)} КБ`,
	};
	const message: OmnichannelMessage = {
		id: `msg-${Date.now()}`,
		patientId,
		channel,
		direction: "outbound",
		senderName: "Администратор клиники",
		senderType: "clinic_staff",
		timestamp: new Date().toISOString(),
		body: `Прикреплен файл: ${file.name}`,
		attachments: [att],
		status: "sent",
	};
	return { message, attachment: att };
}

export function buildSbpInvoiceForContact(
	contact: PatientOmnichannelContact,
	clinicName: string,
): SbpPaymentInvoice {
	const sumRub = contact.activeTreatmentPlan?.totalRub || 14500;
	return {
		orderId: `ORD-${Date.now().toString().slice(-6)}`,
		patientId: contact.id,
		patientName: contact.fullName,
		phone: contact.phone,
		sumRub,
		sumKopecks: sumRub * 100,
		purpose: `Оплата медицинских стоматологических услуг (${clinicName})`,
		clinicName,
		totalInvoiceRub: sumRub,
	};
}

export function buildSbpSuccessMessage(
	patientId: string,
	channel: OmnichannelChannel,
	res: { orderId: string; sumRub: number; fiscalReceiptId: string | null },
): OmnichannelMessage {
	return {
		id: `msg-sbp-${Date.now()}`,
		patientId,
		channel,
		direction: "outbound",
		senderName: "Фискальный Шлюз СБП",
		senderType: "automated_bot",
		timestamp: new Date().toISOString(),
		body: `Поступила оплата заказа №${res.orderId} на сумму ${formatCurrencyRu(res.sumRub)} через СБП.\n${
			res.fiscalReceiptId ? `Электронный чек: #${res.fiscalReceiptId}` : "Ручная сверка (без чека ККТ)"
		}`,
		status: "delivered",
		templateCategory: "sbp_payment",
	};
}

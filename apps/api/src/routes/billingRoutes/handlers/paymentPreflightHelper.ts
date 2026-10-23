import type { CreatePaymentInput } from "@dental/shared";
import type { FastifyReply } from "fastify";
import {
	getDocumentForBilling,
	getPatientForBilling,
	getVisitForBilling,
} from "../../../db/billingQuery.js";
import { documentCanReceivePayment } from "../fiscalReceiptService.js";
import { sendBillingPaymentScopeError } from "../paymentProcessingService.js";

export type PreflightResult =
	| { ok: true; paymentInput: CreatePaymentInput }
	| { ok: false };

export async function preflightValidatePaymentEntities(
	orgId: string,
	input: CreatePaymentInput,
	reply: FastifyReply,
): Promise<PreflightResult> {
	let paymentInput = input;
	const patient = await getPatientForBilling(orgId, input.patientId);
	if (!patient) {
		sendBillingPaymentScopeError(reply, 404, "Пациент для оплаты не найден.");
		return { ok: false };
	}
	if (input.visitId) {
		const visit = await getVisitForBilling(orgId, input.visitId);
		if (!visit) {
			sendBillingPaymentScopeError(reply, 404, "Прием для оплаты не найден.");
			return { ok: false };
		}
		if (visit.patientId !== input.patientId) {
			sendBillingPaymentScopeError(reply, 409, "Прием оплаты относится к другому пациенту.");
			return { ok: false };
		}
	}
	if (input.documentId) {
		const document = await getDocumentForBilling(orgId, input.documentId);
		if (!document) {
			sendBillingPaymentScopeError(reply, 404, "Документ для оплаты не найден.");
			return { ok: false };
		}
		if (document.patientId !== input.patientId) {
			sendBillingPaymentScopeError(reply, 409, "Документ оплаты относится к другому пациенту.");
			return { ok: false };
		}
		if (document.visitId && input.visitId && document.visitId !== input.visitId) {
			sendBillingPaymentScopeError(reply, 409, "Документ оплаты относится к другому приему.");
			return { ok: false };
		}
		if (document.visitId && !input.visitId) {
			const visit = await getVisitForBilling(orgId, document.visitId);
			if (!visit) {
				sendBillingPaymentScopeError(reply, 404, "Прием документа для оплаты не найден.");
				return { ok: false };
			}
			if (visit.patientId !== input.patientId) {
				sendBillingPaymentScopeError(reply, 409, "Прием документа относится к другому пациенту.");
				return { ok: false };
			}
			paymentInput = { ...input, visitId: document.visitId };
		}
		if (document.status === "voided") {
			sendBillingPaymentScopeError(reply, 409, "К аннулированному документу нельзя привязать оплату.");
			return { ok: false };
		}
		if (document.kind === "payment_refund_correction_request") {
			sendBillingPaymentScopeError(
				reply,
				409,
				"Заявление на возврат или коррекцию не принимает новую оплату. Оформите документ коррекции без повторной записи оплаты.",
			);
			return { ok: false };
		}
		if (!documentCanReceivePayment(document.kind)) {
			sendBillingPaymentScopeError(
				reply,
				409,
				"Выберите финансовый документ для оплаты: договор, счет, акт, квитанцию, смету или рассрочку.",
			);
			return { ok: false };
		}
	}
	return { ok: true, paymentInput };
}

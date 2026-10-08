import {
	type CreateDocumentInput,
	documentKindMetadata,
	documentPayloadDisallowedKeys,
} from "@dental/shared";
import {
	checkDecree659TaxDeductionRestriction,
	checkPatientAndVisitAccess,
} from "./accessControlGuards.js";
import {
	checkClinicalRecordPayloadMissingReason,
	validateClinicalRecordSpecificRules,
} from "./clinicalRecordGuards.js";
import {
	checkConsentPayloadMissingReason,
	validateConsentSpecificRules,
} from "./consentGuards.js";
import {
	documentPayloadConsistencyReason,
	plannedDocumentTotalRub,
} from "./financialGuards.js";
import { checkPrescriptionPayloadMissingReason } from "./prescriptionGuards.js";
import { checkTaxDocumentYearAndScopeErrors } from "./taxGuards.js";
import type {
	DocumentCreationFacts,
	DocumentCreationGuardResult,
} from "./types.js";

export function payloadKindMismatchReason(input: CreateDocumentInput): string | null {
	const disallowedKeys = documentPayloadDisallowedKeys(
		input.kind,
		input.payload,
	);
	if (disallowedKeys.length === 0) return null;
	const documentLabel = documentKindMetadata[input.kind]?.label ?? input.kind;
	return `Структурированные данные не соответствуют документу "${documentLabel}": ${disallowedKeys.join(", ")}. Создайте документ с данными нужной формы.`;
}

export function structuredPayloadMissingReason(
	input: CreateDocumentInput,
): string | null {
	const consentMissing = checkConsentPayloadMissingReason(input);
	if (consentMissing) return consentMissing;

	const prescriptionMissing = checkPrescriptionPayloadMissingReason(input);
	if (prescriptionMissing) return prescriptionMissing;

	const clinicalMissing = checkClinicalRecordPayloadMissingReason(input);
	if (clinicalMissing) return clinicalMissing;

	if (
		input.kind === "tax_deduction_application" &&
		!input.payload?.taxDeductionApplication
	) {
		return "Для заявления на налоговую справку нужны структурированные данные: заявитель, ИНН, дата рождения, документ, родство, год, форма справки, канал выдачи, контакт и подтверждение проверки дублей.";
	}
	if (
		input.kind === "paid_medical_services_contract" &&
		!input.payload?.paidMedicalServicesContract
	) {
		return "Для договора платных медицинских услуг нужны структурированные данные: номер и дата договора, сроки, заказчик, основание обращения, состав услуг, сумма, порядок оплаты, изменение цены, уведомление о бесплатной помощи, предупреждение о рекомендациях врача, отказ/возврат, гарантия и подтверждения пациента.";
	}
	if (
		input.kind === "completed_works_act" &&
		!input.payload?.completedWorksAct
	) {
		return "Для акта выполненных работ нужны структурированные данные: номер и дата акта, договор, период оказания, врач, состав работ, суммы, фискальные чеки, претензии или их отсутствие и подтверждения пациента.";
	}
	if (
		input.kind === "treatment_cost_estimate" &&
		!input.payload?.treatmentCostEstimate
	) {
		return "Для сметы лечения нужны структурированные данные: номер, дата, пациент или плательщик, основание лечения, состав услуг, сумма, срок действия, правила изменения цены, исключения, условия оплаты, ответственный врач и подтверждения пациента.";
	}
	if (input.kind === "payment_invoice" && !input.payload?.paymentInvoice) {
		return "Для счета на оплату нужны структурированные данные: номер и дата счета, плательщик, назначение платежа, состав услуг, сумма, срок оплаты, реквизиты, способы оплаты и подтверждение, что счет не заменяет кассовый чек.";
	}
	if (input.kind === "payment_receipt" && !input.payload?.paymentReceipt) {
		return "Для платежной квитанции нужны структурированные данные: номер и дата квитанции, выбранные оплаченные платежи, сумма, плательщик, фискальные чеки, назначение оплаты и подтверждение проверки.";
	}
	if (
		input.kind === "installment_payment_schedule" &&
		!input.payload?.installmentPaymentSchedule
	) {
		return "Для графика рассрочки нужны структурированные данные: номер и дата графика, базовый договор или план, плательщик, сумма, предоплата, остаток, платежи, правила просрочки, способы оплаты и подтверждения пациента.";
	}
	if (
		input.kind === "payment_refund_correction_request" &&
		!input.payload?.paymentRefundCorrection
	) {
		return "Для возврата или коррекции оплаты нужны структурированные данные: действие, сумма, основание, способ, получатель, исходный чек и решение ответственного.";
	}

	return null;
}

export function validateDocumentCreation(
	input: CreateDocumentInput,
	facts: DocumentCreationFacts,
): DocumentCreationGuardResult {
	const accessError = checkPatientAndVisitAccess(input, facts);
	if (accessError) return accessError;

	const metadata = documentKindMetadata[input.kind];

	const decree659Error = checkDecree659TaxDeductionRestriction(input, facts);
	if (decree659Error) return decree659Error;

	const taxScopeError = checkTaxDocumentYearAndScopeErrors(input);
	if (taxScopeError) return taxScopeError;

	if (
		metadata.amountSource === "planned" &&
		!input.visitId &&
		input.kind !== "paid_medical_services_contract"
	) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Документ с плановой суммой требует явный визит или контекст плана лечения.",
		};
	}

	const payloadMismatchReason = payloadKindMismatchReason(input);
	if (payloadMismatchReason) {
		return { ok: false, statusCode: 409, error: payloadMismatchReason };
	}

	const payloadReason = structuredPayloadMissingReason(input);
	if (payloadReason) {
		return { ok: false, statusCode: 409, error: payloadReason };
	}

	const payloadConsistencyReason = documentPayloadConsistencyReason(
		input,
		facts,
	);
	if (payloadConsistencyReason) {
		return { ok: false, statusCode: 409, error: payloadConsistencyReason };
	}
	if (facts.taxPaymentSelectionError) {
		return {
			ok: false,
			statusCode: 409,
			error: facts.taxPaymentSelectionError,
		};
	}
	if (facts.paymentReceiptSelectionError) {
		return {
			ok: false,
			statusCode: 409,
			error: facts.paymentReceiptSelectionError,
		};
	}
	if (facts.paymentRefundCorrectionSelectionError) {
		return {
			ok: false,
			statusCode: 409,
			error: facts.paymentRefundCorrectionSelectionError,
		};
	}

	const consentError = validateConsentSpecificRules(input);
	if (consentError) return consentError;

	const clinicalError = validateClinicalRecordSpecificRules(input);
	if (clinicalError) return clinicalError;

	let totalAmountRub =
		metadata.amountSource === "none" ? null : (input.totalAmountRub ?? null);

	if (metadata.requiresPaidRecord) {
		if (facts.paidAmountRub <= 0) {
			return {
				ok: false,
				statusCode: 409,
				error:
					"Для этого документа нужен существующий оплаченный платеж; плановые суммы не подходят.",
			};
		}
		totalAmountRub = facts.paidAmountRub;
	}

	if (
		input.kind === "payment_refund_correction_request" &&
		input.payload?.paymentRefundCorrection
	) {
		const requestedAmountRub = input.payload.paymentRefundCorrection.amountRub;
		if (requestedAmountRub > facts.paidAmountRub) {
			return {
				ok: false,
				statusCode: 409,
				error:
					"Сумма возврата или коррекции не может превышать фактически оплаченную сумму по выбранному визиту.",
			};
		}
	}

	if (metadata.amountSource === "planned") {
		totalAmountRub = plannedDocumentTotalRub(input, facts);
	}

	return {
		ok: true,
		input: {
			...input,
			taxYear: metadata.group === "tax" ? (input.taxYear ?? null) : null,
			taxPayerInn:
				metadata.group === "tax" ? input.taxPayerInn?.trim() || null : null,
			payload: input.payload ?? null,
			totalAmountRub,
		},
	};
}

import { normalizeRubAmountInput, validateRubAmountInput } from "../rubAmountInput";
import type { DoctorDiscountPreset } from "../PaymentDiscountsAndSplitSection";
import type { TaxDeductionCode } from "./types";

export type PaymentValidationParams = {
	amount: string;
	selectedDoctorDiscount?: DoctorDiscountPreset | null | undefined;
	taxDeductionCode: TaxDeductionCode;
	fiscalReceiptUrl: string;
	payerInn: string;
	fiscalReceiptNumber: string;
	fiscalReceiptIssuedAt: string;
	fiscalFn: string;
	fiscalFd: string;
	fiscalFpd: string;
	payerFullName: string;
	payerBirthDate: string;
	payerIdentityDocument: string;
	payerRelationship: string;
	patientContextReady: boolean;
	patientContextMessage: string;
	patientDefaults: {
		birthDate?: string | null;
		fullName?: string | null;
		identityDocument?: string | null;
		taxpayerInn?: string | null;
	};
};

export function computePaymentValidation(p: PaymentValidationParams) {
	const isZeroAllowedDiscount =
		(p.selectedDoctorDiscount === "warranty_100" || p.selectedDoctorDiscount === "colleague_100") &&
		(p.amount.trim() === "0" || normalizeRubAmountInput(p.amount) === 0);

	const amountMissingStep = isZeroAllowedDiscount ? null : validateRubAmountInput(p.amount);
	const taxDeductionRequested = p.taxDeductionCode === "1" || p.taxDeductionCode === "2";
	const trimmedFiscalReceiptUrl = p.fiscalReceiptUrl.trim();
	const trimmedPayerInn = p.payerInn.trim();
	const paymentAmountInvalid = Boolean(amountMissingStep);
	const fiscalReceiptUrlInvalid = Boolean(trimmedFiscalReceiptUrl && !/^https?:\/\/\S+$/i.test(trimmedFiscalReceiptUrl));
	const payerInnInvalid = Boolean(trimmedPayerInn && !/^\d{10}$|^\d{12}$/.test(trimmedPayerInn));

	const patientTaxDefaultsAvailable = Boolean(
		p.patientDefaults.fullName?.trim() ||
			p.patientDefaults.birthDate?.trim() ||
			p.patientDefaults.identityDocument?.trim() ||
			p.patientDefaults.taxpayerInn?.trim(),
	);

	const fiscalDetailsOpen =
		taxDeductionRequested ||
		Boolean(p.fiscalReceiptNumber.trim() || p.fiscalReceiptIssuedAt.trim() || p.fiscalFn.trim() || p.fiscalFd.trim() || p.fiscalFpd.trim() || trimmedFiscalReceiptUrl);

	const taxPayerDetailsOpen =
		taxDeductionRequested ||
		Boolean(p.payerFullName.trim() || trimmedPayerInn || p.payerBirthDate.trim() || p.payerIdentityDocument.trim() || (p.payerRelationship.trim() && p.payerRelationship.trim() !== "пациент"));

	const paymentMissingSteps = [
		!p.patientContextReady ? p.patientContextMessage || "выберите пациента текущего приема" : null,
		amountMissingStep,
		fiscalReceiptUrlInvalid ? "ссылка ОФД должна начинаться с http:// или https://" : null,
	].filter((s): s is string => Boolean(s));

	const paymentReadyToSubmit = paymentMissingSteps.length === 0;
	const isZeroAmount = !isZeroAllowedDiscount && (!p.amount.trim() || normalizeRubAmountInput(p.amount) === 0 || normalizeRubAmountInput(p.amount) === null);

	const taxDeductionMissingSteps = [
		payerInnInvalid ? "ИНН плательщика должен содержать 10 или 12 цифр (опционально для физлиц)" : null,
		taxDeductionRequested && !p.fiscalReceiptIssuedAt.trim() ? "дата фискального чека" : null,
		taxDeductionRequested && !p.payerFullName.trim() ? "ФИО плательщика" : null,
		taxDeductionRequested && !p.payerBirthDate.trim() ? "дата рождения плательщика" : null,
		taxDeductionRequested && !p.payerIdentityDocument.trim() ? "документ плательщика" : null,
		taxDeductionRequested && !p.payerRelationship.trim() ? "родство плательщика" : null,
	].filter((s): s is string => Boolean(s));

	const isTaxDeductionDraft = taxDeductionRequested && taxDeductionMissingSteps.length > 0;

	return {
		isZeroAllowedDiscount,
		paymentAmountInvalid,
		fiscalReceiptUrlInvalid,
		payerInnInvalid,
		patientTaxDefaultsAvailable,
		fiscalDetailsOpen,
		taxPayerDetailsOpen,
		paymentMissingSteps,
		paymentReadyToSubmit,
		isZeroAmount,
		taxDeductionMissingSteps,
		isTaxDeductionDraft,
	};
}

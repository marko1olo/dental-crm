import {
	type CreateDocumentInput,
	type DocumentKind,
	documentKindMetadata,
	legacyTaxDeductionCertificateMaxYear,
	legacyTaxDeductionCertificateMinYear,
	type Payment,
	taxDeductionCertificateMinYear,
} from "@dental/shared";

export function taxPaidDocumentsNeedYear(kind: DocumentKind): boolean {
	const metadata = documentKindMetadata[kind];
	return metadata.group === "tax" && metadata.amountSource === "paid";
}

export function taxPaidDocumentKindIsKnd(kind: DocumentKind): boolean {
	return (
		kind === "tax_deduction_certificate" || kind === "tax_deduction_registry"
	);
}

export function taxPaidDocumentKindIsLegacy(kind: DocumentKind): boolean {
	return kind === "legacy_tax_deduction_certificate";
}

export function taxCertificateRequiresPayerInn(kind: DocumentKind): boolean {
	return kind === "legacy_tax_deduction_certificate";
}

export function taxPaidDocumentRequiresPaymentSelection(kind: DocumentKind): boolean {
	return (
		kind === "tax_deduction_certificate" ||
		kind === "legacy_tax_deduction_certificate" ||
		kind === "tax_deduction_registry"
	);
}

export function taxPaidDocumentCanValidatePaymentSelection(
	kind: DocumentKind,
): boolean {
	return (
		taxPaidDocumentRequiresPaymentSelection(kind) ||
		kind === "tax_deduction_application"
	);
}

export function selectedTaxPaymentIds(
	input: Pick<CreateDocumentInput, "payload">,
): string[] {
	if (input.payload?.taxDeductionApplication)
		return input.payload.taxDeductionApplication.selectedPaymentIds ?? [];
	return input.payload?.taxPaymentSelection?.selectedPaymentIds ?? [];
}

export function paymentTaxYear(payment: Payment): number | null {
	const sourceDate = payment.fiscalReceiptIssuedAt || payment.paidAt;
	if (!sourceDate) return null;
	const explicitYear = /^(\d{4})/.exec(sourceDate)?.[1];
	if (explicitYear) return Number(explicitYear);
	const parsed = new Date(sourceDate);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed.getFullYear();
}

export function paymentPaidInTaxYear(payment: Payment, taxYear: number): boolean {
	return paymentTaxYear(payment) === taxYear;
}

export function normalizeInnDigits(value: string | null | undefined): string {
	return (value ?? "").replace(/\D+/g, "");
}

export function paymentMatchesTaxPayer(
	payment: Payment,
	payerInn: string | null | undefined,
): boolean {
	const normalizedPayerInn = normalizeInnDigits(payerInn);
	if (!normalizedPayerInn) return true;
	return normalizeInnDigits(payment.payerInn) === normalizedPayerInn;
}

export function taxDocumentSelectionScope(input: CreateDocumentInput): {
	taxYear: number | null | undefined;
	payerInn: string | null | undefined;
} {
	const application =
		input.kind === "tax_deduction_application"
			? input.payload?.taxDeductionApplication
			: null;
	return {
		taxYear: application?.requestedTaxYear ?? input.taxYear,
		payerInn: application?.taxpayerInn ?? input.taxPayerInn,
	};
}

export function paymentMatchesTaxDocumentScope(
	payment: Payment,
	input: CreateDocumentInput,
): boolean {
	const { taxYear, payerInn } = taxDocumentSelectionScope(input);
	return Boolean(
		taxYear &&
			payment.patientId === input.patientId &&
			payment.status === "paid" &&
			payment.amountRub > 0 &&
			paymentPaidInTaxYear(payment, taxYear) &&
			paymentMatchesTaxPayer(payment, payerInn),
	);
}

export function taxPaymentSelectionErrorForDocument(
	input: CreateDocumentInput,
	payments: readonly Payment[],
): string | null {
	if (!taxPaidDocumentCanValidatePaymentSelection(input.kind)) return null;

	const selectedIds = selectedTaxPaymentIds(input);
	const { taxYear, payerInn } = taxDocumentSelectionScope(input);
	if (!selectedIds.length) {
		if (!taxPaidDocumentRequiresPaymentSelection(input.kind)) return null;
		return "Для налогового заявления, справки или реестра нужно явно выбрать фискальные чеки. Автоматический захват всех оплат за год отключен.";
	}

	const uniqueSelectedIds = new Set(selectedIds);
	if (uniqueSelectedIds.size !== selectedIds.length) {
		return "В выбранных чеках есть дубли. Оставьте каждый фискальный чек один раз.";
	}

	const paymentsById = new Map(
		payments.map((payment) => [payment.id, payment]),
	);
	for (const paymentId of selectedIds) {
		const payment = paymentsById.get(paymentId);
		if (!payment) {
			return "Выбранный фискальный чек не найден. Обновите экран и выберите чек заново.";
		}
		if (payment.patientId !== input.patientId) {
			return "Выбранный фискальный чек относится к другому пациенту.";
		}
		if (payment.status !== "paid" || payment.amountRub <= 0) {
			return "В налоговый документ можно включать только проведенные положительные оплаты.";
		}
		if (!taxYear || !paymentPaidInTaxYear(payment, taxYear)) {
			return "Выбранный фискальный чек не относится к выбранному налоговому году.";
		}
		if (!paymentMatchesTaxPayer(payment, payerInn)) {
			return "Выбранный фискальный чек относится к другому ИНН плательщика.";
		}
	}

	return null;
}

export function checkTaxDocumentYearAndScopeErrors(
	input: CreateDocumentInput,
): { ok: false; statusCode: 409; error: string } | null {
	if (taxPaidDocumentsNeedYear(input.kind) && !input.taxYear) {
		return {
			ok: false,
			statusCode: 409,
			error: "Налоговым документам нужен явный год оплаты.",
		};
	}
	if (
		taxCertificateRequiresPayerInn(input.kind) &&
		!input.taxPayerInn?.trim()
	) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Налоговой справке нужен ИНН налогоплательщика. Для разных плательщиков создавайте отдельные справки.",
		};
	}
	if (
		taxPaidDocumentKindIsKnd(input.kind) &&
		input.taxYear &&
		input.taxYear < taxDeductionCertificateMinYear
	) {
		return {
			ok: false,
			statusCode: 409,
			error: "КНД 1151156 поддерживается только для оплат с 2024 года.",
		};
	}
	if (
		taxPaidDocumentKindIsLegacy(input.kind) &&
		input.taxYear &&
		(input.taxYear < legacyTaxDeductionCertificateMinYear ||
			input.taxYear > legacyTaxDeductionCertificateMaxYear)
	) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Старая налоговая справка поддерживается только для оплат 2021-2023; для оплат с 2024 года используйте КНД 1151156.",
		};
	}
	if (
		taxPaidDocumentRequiresPaymentSelection(input.kind) &&
		!selectedTaxPaymentIds(input).length
	) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Для налогового заявления, справки или реестра нужно явно выбрать фискальные чеки. Автоматический захват всех оплат за год отключен.",
		};
	}
	return null;
}

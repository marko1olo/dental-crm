import {
	type Dashboard,
	type GeneratedDocument,
	type Patient,
	type Payment,
	type StaffMember,
	type TreatmentPlanItem,
} from "@dental/shared";
import { installmentPaymentStatusAliases } from "../../../AppConstants";
import { dateInputValuePlusDays } from "../../../AppHelpers";
import { normalizeRubAmountInput } from "../../../rubAmountInput";
import {
	compactDocumentText,
	documentTextLines,
} from "../../../utils/documentPayloadUtils";

export interface DocumentFinancialCalculationsParams {
	activeTreatmentPlanItems: TreatmentPlanItem[];
	dashboard: Dashboard | null;
	activePayments: Payment[];
	documentState: any;
	documentPatient: Patient | null;
	activeDoctor: StaffMember | null;
	selectedPaymentReceiptPayments: Payment[];
	activeUsableDocuments: GeneratedDocument[];
	treatmentAcceptancePlannedTotalRub: () => number;
}

export function createDocumentFinancialCalculations({
	activeTreatmentPlanItems,
	dashboard,
	activePayments,
	documentState,
	documentPatient,
	activeDoctor,
	selectedPaymentReceiptPayments,
	activeUsableDocuments,
	treatmentAcceptancePlannedTotalRub,
}: DocumentFinancialCalculationsParams) {
	function activePaidPaymentsForVisit(): Payment[] {
		return activePayments.filter(
			(payment) =>
				payment.status === "paid" &&
				(!dashboard?.activeVisit?.id ||
					payment.visitId === dashboard?.activeVisit?.id),
		);
	}

	function manualRubAmount(value: string): number {
		const withoutCurrency = value.replace(/₽|руб\.?/gi, "");
		return normalizeRubAmountInput(withoutCurrency) ?? 0;
	}

	function _paidContractTotalRubValue(): number {
		const manual = manualRubAmount(documentState.paidContractTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

	function completedActPaidRubValue(): number {
		const manual = manualRubAmount(documentState.completedActPaidRub);
		if (manual > 0) return manual;
		return activePaidPaymentsForVisit().reduce(
			(total, payment) => total + payment.amountRub,
			0,
		);
	}

	function _completedActFiscalReceiptLines(): string[] {
		const manual = documentTextLines(documentState.completedActFiscalReceipts);
		if (manual.length) return manual;
		return activePaidPaymentsForVisit()
			.map((payment) => payment.fiscalReceiptNumber?.trim())
			.filter((value): value is string => Boolean(value));
	}

	function plannedServiceLinesForFinancialPayload() {
		return activeTreatmentPlanItems
			.filter((item) => item.status !== "cancelled")
			.filter(
				(item) =>
					!dashboard?.activeVisit?.id ||
					item.visitId === dashboard?.activeVisit?.id,
			)
			.map((item) => {
				const service = dashboard?.serviceCatalog?.find(
					(catalogItem) => catalogItem.id === item.serviceId,
				);
				const totalRub = Math.max(
					0,
					item.unitPriceRub * item.quantity - item.discountRub,
				);
				return {
					serviceName: service?.title ?? item.serviceId,
					toothOrArea: item.toothCode ? `зуб ${item.toothCode}` : null,
					quantity: item.quantity,
					unitPriceRub: item.unitPriceRub,
					discountRub: item.discountRub,
					totalRub,
				};
			});
	}

	function _treatmentEstimatePatientOrPayerFullNameValue(): string {
		return (
			documentState.treatmentEstimatePatientOrPayerFullName.trim() ||
			documentPatient?.fullName ||
			""
		);
	}

	function _treatmentEstimateTreatmentBasisValue(): string {
		return (
			documentState.treatmentEstimateTreatmentBasis.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.diagnosis,
				dashboard?.activeVisit?.complaint,
				dashboard?.activeVisit?.treatmentPlan,
			) ||
			"плановое стоматологическое лечение по результатам осмотра"
		);
	}

	function paymentInvoiceTotalRubValue(): number {
		return (
			plannedServiceLinesForFinancialPayload().reduce(
				(total, line) => total + line.totalRub,
				0,
			) || treatmentAcceptancePlannedTotalRub()
		);
	}

	function _treatmentEstimateTotalRubValue(): number {
		const manual = manualRubAmount(documentState.treatmentEstimateTotalRub);
		return manual > 0 ? manual : paymentInvoiceTotalRubValue();
	}

	function firstPaymentReceiptPayment() {
		return selectedPaymentReceiptPayments[0] ?? null;
	}

	function _paymentReceiptPayerFullNameValue(): string {
		return (
			documentState.paymentReceiptPayerFullName.trim() ||
			firstPaymentReceiptPayment()?.payerFullName?.trim() ||
			""
		);
	}

	function _paymentReceiptPayerBirthDateValue(): string {
		return (
			documentState.paymentReceiptPayerBirthDate.trim() ||
			firstPaymentReceiptPayment()?.payerBirthDate?.trim() ||
			""
		);
	}

	function _paymentReceiptPayerInnValue(): string {
		return (
			documentState.paymentReceiptPayerInn.trim() ||
			firstPaymentReceiptPayment()?.payerInn?.trim() ||
			""
		);
	}

	function _paymentReceiptPayerIdentityDocumentValue(): string {
		return (
			documentState.paymentReceiptPayerIdentityDocument.trim() ||
			firstPaymentReceiptPayment()?.payerIdentityDocument?.trim() ||
			""
		);
	}

	function _paymentReceiptPayerRelationshipValue(): string {
		return (
			documentState.paymentReceiptPayerRelationship.trim() ||
			firstPaymentReceiptPayment()?.payerRelationship?.trim() ||
			"пациент"
		);
	}

	function _paymentReceiptIssuedByValue(): string {
		return (
			documentState.paymentReceiptIssuedBy.trim() ||
			activeDoctor?.fullName ||
			"Администратор клиники"
		);
	}

	function _paymentReceiptFiscalReceiptLines(): string[] {
		return selectedPaymentReceiptPayments
			.map((payment) => payment.fiscalReceiptNumber?.trim())
			.filter((value): value is string => Boolean(value));
	}

	function installmentScheduleTotalRubValue(): number {
		const manual = manualRubAmount(documentState.installmentScheduleTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

	function installmentSchedulePrepaidRubValue(): number {
		const manual = manualRubAmount(documentState.installmentSchedulePrepaidRub);
		if (manual > 0) return manual;
		return activePaidPaymentsForVisit().reduce(
			(total, payment) => total + payment.amountRub,
			0,
		);
	}

	function installmentScheduleRemainingRubValue(): number {
		return Math.max(
			0,
			installmentScheduleTotalRubValue() - installmentSchedulePrepaidRubValue(),
		);
	}

	function _installmentScheduleInstallmentRows() {
		const rows = documentTextLines(
			documentState.installmentScheduleRows,
		).map((line, index) => {
			const [label, dueDate, amount, status] = line
				.split("|")
				.map((part) => part.trim());
			const parsedAmount = amount
				? Number(amount.replace(/[^\d]/g, ""))
				: Number.NaN;
			const parsedStatus =
				installmentPaymentStatusAliases[
					status?.toLocaleLowerCase("ru-RU").replaceAll("ё", "е") ?? ""
				] ?? "planned";
			return {
				label: label || `Платеж ${index + 1}`,
				dueDate: dueDate || dateInputValuePlusDays(index === 0 ? 7 : 21),
				amountRub:
					Number.isFinite(parsedAmount) && parsedAmount > 0
						? parsedAmount
						: 0,
				status: parsedStatus,
			};
		});
		if (rows.some((row) => row.amountRub > 0))
			return rows.filter((row) => row.amountRub > 0);
		const remaining = installmentScheduleRemainingRubValue();
		if (remaining <= 0) return [];
		const firstPart = Math.ceil(remaining / 2);
		const secondPart = remaining - firstPart;
		return [
			{
				label: "Первый платеж",
				dueDate: dateInputValuePlusDays(7),
				amountRub: firstPart,
				status: "planned" as const,
			},
			...(secondPart > 0
				? [
						{
							label: "Финальный платеж",
							dueDate: dateInputValuePlusDays(21),
							amountRub: secondPart,
							status: "planned" as const,
						},
					]
				: []),
		];
	}

	function _installmentScheduleBaseDocumentTitleValue(): string {
		return (
			documentState.installmentScheduleBaseDocumentTitle.trim() ||
			activeUsableDocuments?.find(
				(document) => document.kind === "paid_medical_services_contract",
			)?.title ||
			"договор или план лечения клиники"
		);
	}

	return {
		activePaidPaymentsForVisit,
		manualRubAmount,
		_paidContractTotalRubValue,
		completedActPaidRubValue,
		_completedActFiscalReceiptLines,
		plannedServiceLinesForFinancialPayload,
		_treatmentEstimatePatientOrPayerFullNameValue,
		_treatmentEstimateTreatmentBasisValue,
		paymentInvoiceTotalRubValue,
		_treatmentEstimateTotalRubValue,
		firstPaymentReceiptPayment,
		_paymentReceiptPayerFullNameValue,
		_paymentReceiptPayerBirthDateValue,
		_paymentReceiptPayerInnValue,
		_paymentReceiptPayerIdentityDocumentValue,
		_paymentReceiptPayerRelationshipValue,
		_paymentReceiptIssuedByValue,
		_paymentReceiptFiscalReceiptLines,
		installmentScheduleTotalRubValue,
		installmentSchedulePrepaidRubValue,
		installmentScheduleRemainingRubValue,
		_installmentScheduleInstallmentRows,
		_installmentScheduleBaseDocumentTitleValue,
	};
}

import type { Dashboard, Patient, PaymentMethod } from "@dental/shared";

export type ClinicalRuleEvaluation = Dashboard["clinicalRuleEvaluations"][number];
export type Payment = Dashboard["payments"][number];
export type ServiceCatalogItem = Dashboard["serviceCatalog"][number];
export type TreatmentPlanItem = Dashboard["treatmentPlanItems"][number];
export type TreatmentPlanScenario = Dashboard["treatmentPlanScenarios"][number];
export type TaxDeductionCode = "" | "1" | "2";

export interface PendingCheckout {
	patientId: string;
	patientName: string;
	visitId?: string;
	services: any[];
	totalDueRub: number;
	receiptNumber?: string;
	timestamp?: number;
}

export interface TaxDeductionPayment {
	id: string;
	receiptNumber: string;
	fiscalDocumentNumber: string;
	fiscalSign: string;
	serviceName: string;
	dateIso: string;
	amountRub: number;
	taxCode: "1" | "2";
}

export type FinanceViewProps = {
	activePayments: Payment[];
	activeTreatmentPlanItems: TreatmentPlanItem[];
	activeTreatmentPlanScenarios: TreatmentPlanScenario[];
	/*
	 * null — «итог не посчитан», а не «нулевой итог».
	 *
	 * Источник (useAppLogic.tsx, patientBillingSummary) отдаёт null, пока нет
	 * дашборда или не выбран пациент. Раньше в этом случае приходил объект из
	 * восьми нулей, и экран заявлял «пациент ничего не должен».
	 */
	billingSummary: Dashboard["billingSummary"] | null;
	clinicalRuleEvaluations: ClinicalRuleEvaluation[];
	clinicalRuleActionLabels: Record<ClinicalRuleEvaluation["action"], string>;
	clinicalRuleSeverityLabels: Record<
		ClinicalRuleEvaluation["severity"],
		string
	>;
	clinicalRuleSummary: Dashboard["clinicalRuleSummary"];
	dashboard: Dashboard;
	documentPatient: Patient | null;
	formatDateTime: (value: string) => string;
	isPaymentSaving: boolean;
	money: (value: number | null) => string;
	onCashIn?: (amountRub: number, basis: string, typeAlias?: string) => void | Promise<void>;
	onCashOut?: (amountRub: number, basis: string, recipientFio?: string, typeAlias?: string) => void | Promise<void>;
	onCloseShift?: () => void | Promise<void>;
	onCreateDocument?: (kind: string) => void;
	onGoToDocuments: () => void;
	onGoToPrices: () => void;
	onGoToVisit: () => void;
	onOpenShift?: () => void | Promise<void>;
	onRecordPayment: () => void;
	paymentAmount: string;
	paymentFeedback: string;
	paymentFiscalCashierName: string;
	paymentFiscalFd: string;
	paymentFiscalFn: string;
	paymentFiscalFpd: string;
	paymentFiscalReceiptIssuedAt: string;
	paymentFiscalReceiptNumber: string;
	paymentFiscalReceiptUrl: string;
	paymentFiscalReceiptLabel: (
		payment: Pick<Payment, "id" | "fiscalReceiptNumber" | "fiscalReceipt">,
	) => string;
	paymentMethod: PaymentMethod;
	paymentMethodLabels: Record<PaymentMethod, string>;
	paymentPatientContextMessage: string;
	paymentPatientContextReady: boolean;
	paymentPayerBirthDate: string;
	paymentPayerFullName: string;
	paymentPayerIdentityDocument: string;
	paymentPayerInn: string;
	paymentPayerRelationship: string;
	paymentTaxDeductionCode: TaxDeductionCode;
	scenarioPriorityLabels: Record<TreatmentPlanScenario["priority"], string>;
	scenarioStrategyLabels: Record<TreatmentPlanScenario["strategy"], string>;
	serviceCategoryLabels: Record<ServiceCatalogItem["category"], string>;
	serviceTitle: (serviceId: string) => string;
	setPaymentAmount: (value: string) => void;
	setPaymentFiscalCashierName: (value: string) => void;
	setPaymentFiscalFd: (value: string) => void;
	setPaymentFiscalFn: (value: string) => void;
	setPaymentFiscalFpd: (value: string) => void;
	setPaymentFiscalReceiptIssuedAt: (value: string) => void;
	setPaymentFiscalReceiptNumber: (value: string) => void;
	setPaymentFiscalReceiptUrl: (value: string) => void;
	setPaymentMethod: (value: PaymentMethod) => void;
	setPaymentPayerBirthDate: (value: string) => void;
	setPaymentPayerFullName: (value: string) => void;
	setPaymentPayerIdentityDocument: (value: string) => void;
	setPaymentPayerInn: (value: string) => void;
	setPaymentPayerRelationship: (value: string) => void;
	setPaymentTaxDeductionCode: (value: TaxDeductionCode) => void;
	staffRoleLabels: Record<ClinicalRuleEvaluation["ownerRole"], string>;
	treatmentStatusLabels: Record<TreatmentPlanItem["status"], string>;
};

export type FinanceViewComponentProps = Partial<FinanceViewProps>;

/*
 * Пустой словарь подписей.
 */
export const noLabels = <Key extends string>(): Record<Key, string> =>
	({}) as Record<Key, string>;

/*
 * Нулевая сводка клинических правил.
 */
export const EMPTY_CLINICAL_RULE_SUMMARY: Dashboard["clinicalRuleSummary"] = {
	activeRules: 0,
	evaluatedRules: 0,
	unresolved: 0,
	blockers: 0,
	warnings: 0,
	requiredServices: 0,
	coveredRules: 0,
};

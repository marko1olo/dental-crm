import type {
	CreateDocumentInput,
	Patient,
	TreatmentPlanItem,
	Visit,
} from "@dental/shared";

export type DocumentVisit = Pick<Visit, "id" | "patientId">;
export type DocumentPatient = Pick<Patient, "id">;
export type DocumentTreatmentPlanItem = Pick<
	TreatmentPlanItem,
	| "patientId"
	| "visitId"
	| "status"
	| "unitPriceRub"
	| "quantity"
	| "discountRub"
>;

export type DocumentCreationFacts = {
	patient: DocumentPatient | null;
	visit: DocumentVisit | null;
	paidAmountRub: number;
	plannedAmountRub: number;
	taxPaymentSelectionError?: string | null;
	paymentReceiptSelectionError?: string | null;
	paymentRefundCorrectionSelectionError?: string | null;
};

export type DocumentCreationGuardResult =
	| { ok: true; input: CreateDocumentInput }
	| { ok: false; statusCode: 404 | 409 | 422; error: string; code?: string };

export type PaymentRefundSettlement = {
	paymentId: string;
	/** Сумма исходного чека в копейках. */
	amountKopecks: number;
	/** Уже возвращено выданными заявлениями, в копейках. */
	refundedKopecks: number;
	/** Возврат покрыл чек целиком — платёж обязан уйти из выручки. */
	fullyRefunded: boolean;
};

export type FinancialServicePayloadLine = {
	quantity: number;
	unitPriceRub: number;
	discountRub: number;
	totalRub: number;
};

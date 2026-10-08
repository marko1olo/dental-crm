import { useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import { useFinanceLogic } from "../domains/useFinanceLogic";
import type { BillingModalLogicSlice } from "./types";

interface UseBillingModalLogicProps {
	auth: any;
	dashboard: Dashboard | null;
	documentPatient: any;
	paymentPatientContextReady: boolean;
	paymentPatientContextMessage: string;
	realActiveVisitId: string | null;
	loadDashboard: () => Promise<void>;
	setError: (err: string | null) => void;
}

export function useBillingModalLogic({
	auth,
	dashboard,
	documentPatient,
	paymentPatientContextReady,
	paymentPatientContextMessage,
	realActiveVisitId,
	loadDashboard,
	setError,
}: UseBillingModalLogicProps): BillingModalLogicSlice {
	const finance = useFinanceLogic({
		auth,
		dashboard,
		documentPatient,
		paymentPatientContextReady,
		paymentPatientContextMessage,
		realActiveVisitId,
		loadDashboard,
		setError,
	});

	const {
		paymentAmount,
		setPaymentAmount,
		paymentMethod,
		setPaymentMethod,
		paymentFiscalReceiptNumber,
		setPaymentFiscalReceiptNumber,
		paymentFiscalReceiptIssuedAt,
		setPaymentFiscalReceiptIssuedAt,
		paymentFiscalFn,
		setPaymentFiscalFn,
		paymentFiscalFd,
		setPaymentFiscalFd,
		paymentFiscalFpd,
		setPaymentFiscalFpd,
		paymentFiscalCashierName,
		setPaymentFiscalCashierName,
		paymentFiscalReceiptUrl,
		setPaymentFiscalReceiptUrl,
		paymentPayerFullName,
		setPaymentPayerFullName,
		paymentPayerInn,
		setPaymentPayerInn,
		paymentPayerBirthDate,
		setPaymentPayerBirthDate,
		paymentPayerIdentityDocument,
		setPaymentPayerIdentityDocument,
		paymentPayerRelationship,
		setPaymentPayerRelationship,
		paymentTaxDeductionCode,
		setPaymentTaxDeductionCode,
		paymentFeedback,
		setPaymentFeedback,
	} = finance;

	const activePayments = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		return (
			dashboard.payments?.filter(
				(payment) => payment.patientId === documentPatient.id,
			) ?? []
		);
	}, [dashboard, documentPatient]);

	const activeTreatmentPlanItems = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		return (
			dashboard.treatmentPlanItems?.filter(
				(item) => item.patientId === documentPatient.id,
			) ?? []
		);
	}, [dashboard, documentPatient]);

	const selectedPaymentReceiptTotalRub = 0;
	const selectedTaxPaymentTotalRub = 0;

	return {
		finance,
		paymentAmount,
		setPaymentAmount,
		paymentMethod,
		setPaymentMethod,
		paymentFeedback,
		setPaymentFeedback,
		activePayments,
		activeTreatmentPlanItems,
		paymentFiscalCashierName,
		setPaymentFiscalCashierName,
		paymentFiscalFd,
		setPaymentFiscalFd,
		paymentFiscalFn,
		setPaymentFiscalFn,
		paymentFiscalFpd,
		setPaymentFiscalFpd,
		paymentFiscalReceiptIssuedAt,
		setPaymentFiscalReceiptIssuedAt,
		paymentFiscalReceiptNumber,
		setPaymentFiscalReceiptNumber,
		paymentFiscalReceiptUrl,
		setPaymentFiscalReceiptUrl,
		paymentPayerBirthDate,
		setPaymentPayerBirthDate,
		paymentPayerFullName,
		setPaymentPayerFullName,
		paymentPayerIdentityDocument,
		setPaymentPayerIdentityDocument,
		paymentPayerInn,
		setPaymentPayerInn,
		paymentPayerRelationship,
		setPaymentPayerRelationship,
		paymentTaxDeductionCode,
		setPaymentTaxDeductionCode,
		selectedPaymentReceiptTotalRub,
		selectedTaxPaymentTotalRub,
	};
}

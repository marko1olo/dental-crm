import { documentKindMetadata } from "@dental/shared";
import { useRef } from "react";
import {
	browserGeneratedId,
	money,
	operatorWorkflowFailureMessage,
	responseErrorMessage,
} from "../../AppHelpers";
import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import {
	normalizeRubAmountInput,
	validateRubAmountInput,
} from "../../rubAmountInput";
import { useAppStore } from "../../store/appStore";
import { useDocumentStore } from "../../store/documentStore";

export type UseFinanceLogicOptions = {
	auth: {
		denteClinicalReadHeaders: (
			headers?: Record<string, string>,
		) => Record<string, string>;
		denteClinicalMutationHeaders: (
			headers?: Record<string, string>,
		) => Record<string, string>;
	};
	dashboard: any;
	documentPatient: any;
	paymentPatientContextReady: boolean;
	paymentPatientContextMessage: string | null;
	realActiveVisitId: string | null;
	loadDashboard: () => Promise<void>;
	setError: (error: string | null) => void;
	activeUsableDocuments?: any[] | null;
};

export function useFinanceLogic({
	auth,
	dashboard,
	documentPatient,
	paymentPatientContextReady,
	paymentPatientContextMessage,
	realActiveVisitId,
	loadDashboard,
	setError,
	activeUsableDocuments,
}: UseFinanceLogicOptions) {
	const paymentMutationIdRef = useRef<string | null>(null);

	const { isPaymentSaving, setIsPaymentSaving } = useAppStore();

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
	} = useDocumentStore();

	async function recordPayment() {
		setPaymentFeedback("");
		if (isPaymentSaving) {
			setError("Дождитесь завершения текущей записи оплаты.");
			return;
		}
		if (!documentPatient || !dashboard) {
			setError("Выберите пациента, за которого принимаете оплату.");
			return;
		}

		if (!paymentPatientContextReady) {
			setError(
				paymentPatientContextMessage ||
					"Оплата не записана: сначала переключите открытый прием на этого пациента.",
			);
			return;
		}
		const amountRub = normalizeRubAmountInput(paymentAmount);
		const amountMissingStep = validateRubAmountInput(paymentAmount);
		if (amountMissingStep || amountRub === null) {
			setError(
				`Сумма оплаты: ${amountMissingStep ?? "укажите сумму больше нуля"}.`,
			);
			return;
		}
		const paymentPayerName = paymentPayerFullName.trim();
		const explicitPayerInn = paymentPayerInn.trim();
		const explicitPayerBirthDate = paymentPayerBirthDate.trim();
		const explicitPayerIdentityDocument = paymentPayerIdentityDocument.trim();
		const paymentPayerRelation = paymentPayerRelationship.trim();
		const explicitFiscalFn = paymentFiscalFn.trim();
		const explicitFiscalFd = paymentFiscalFd.trim();
		const explicitFiscalFpd = paymentFiscalFpd.trim();
		const explicitFiscalReceiptUrl = paymentFiscalReceiptUrl.trim();
		const taxReadyPaymentRequested =
			paymentTaxDeductionCode === "1" || paymentTaxDeductionCode === "2";
		if (taxReadyPaymentRequested) {
			const missingTaxFields = [
				[paymentFiscalReceiptIssuedAt.trim(), "дата фискального чека"],
				[explicitFiscalFn, "ФН"],
				[explicitFiscalFd, "ФД"],
				[explicitFiscalFpd, "ФПД"],
				[paymentPayerName, "ФИО плательщика"],
				[explicitPayerBirthDate, "дата рождения плательщика"],
				[explicitPayerIdentityDocument, "документ плательщика"],
				[paymentPayerRelation, "родство плательщика"],
			]
				.filter(([value]) => !value)
				.map(([, label]) => label);
			if (missingTaxFields.length) {
				setError(
					`Для налоговой оплаты заполните явно: ${missingTaxFields.join(", ")}. Данные из карточки пациента не подставляются автоматически.`,
				);
				return;
			}
		}
		if (
			explicitFiscalReceiptUrl &&
			!/^https?:\/\/\S+$/i.test(explicitFiscalReceiptUrl)
		) {
			setError("Ссылка ОФД должна начинаться с http:// или https://");
			return;
		}
		const patientIsPayer =
			(!paymentPayerName || paymentPayerName === documentPatient.fullName) &&
			(!paymentPayerRelation ||
				paymentPayerRelation.toLocaleLowerCase("ru-RU") === "пациент");
		const administrativePayerInn = patientIsPayer
			? (documentPatient.administrativeProfile?.taxpayerInn?.trim() ?? "")
			: "";
		const administrativePayerDocument = patientIsPayer
			? (documentPatient.administrativeProfile?.identityDocument?.trim() ?? "")
			: "";
		const normalizedPayerInn = taxReadyPaymentRequested
			? explicitPayerInn
			: explicitPayerInn || administrativePayerInn;
		if (normalizedPayerInn && !/^\d{10}$|^\d{12}$/.test(normalizedPayerInn)) {
			setError("ИНН плательщика должен содержать 10 или 12 цифр");
			return;
		}
		setIsPaymentSaving(true);
		try {
			const documentForPayment =
				activeUsableDocuments?.find(
					(document) =>
						documentKindMetadata[document.kind].group === "payment" &&
						document.kind !== "payment_refund_correction_request" &&
						document.visitId === dashboard?.activeVisit?.id &&
						(document.totalAmountRub ?? 0) > 0,
				) ?? null;
			let response: Response;
			if ((paymentMethod as string) === "family_wallet") {
				const famRes = await fetch(
					`/api/finance/family/patient/${documentPatient.id}`,
					{ headers: auth.denteClinicalReadHeaders() },
				);
				if (!famRes.ok) {
					setError("У пациента не настроен семейный аккаунт для оплаты.");
					setIsPaymentSaving(false);
					return;
				}
				const famData = await famRes.json();
				if (!paymentMutationIdRef.current) {
					paymentMutationIdRef.current = browserGeneratedId("family-payment");
				}
				const familyClientMutationId = paymentMutationIdRef.current;
				response = await fetch("/api/finance/family/pay", {
					method: "POST",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						organizationId:
							dashboard?.clinicSettings?.profile?.organizationId ||
							dashboard?.activeVisit?.organizationId ||
							"00000000-0000-0000-0000-000000000000",
						patientId: documentPatient.id,
						familyGroupId: famData.id,
						amountRub,
						visitId: realActiveVisitId ?? undefined,
						documentId: documentForPayment?.id || undefined,
						clientMutationId: familyClientMutationId,
					}),
				});
			} else {
				if (!paymentMutationIdRef.current) {
					paymentMutationIdRef.current = browserGeneratedId("payment");
				}
				const paymentClientMutationId = paymentMutationIdRef.current;
				response = await fetch("/api/billing/payments", {
					method: "POST",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						patientId: documentPatient.id,
						visitId: realActiveVisitId,
						documentId: documentForPayment?.id ?? null,
						clientMutationId: paymentClientMutationId,
						amountRub,
						method: paymentMethod,
						fiscalReceiptNumber: paymentFiscalReceiptNumber.trim() || null,
						fiscalReceiptIssuedAt: paymentFiscalReceiptIssuedAt.trim() || null,
						fiscalReceiptUrl: explicitFiscalReceiptUrl || null,
						fiscalReceipt: {
							fn: explicitFiscalFn || null,
							fd: explicitFiscalFd || null,
							fpd: explicitFiscalFpd || null,
							cashierName: paymentFiscalCashierName.trim() || null,
							receiptUrl: explicitFiscalReceiptUrl || null,
							operationType: "income",
						},
						payerFullName: taxReadyPaymentRequested
							? paymentPayerName
							: paymentPayerName || documentPatient.fullName,
						payerInn: normalizedPayerInn || null,
						payerBirthDate: taxReadyPaymentRequested
							? explicitPayerBirthDate
							: explicitPayerBirthDate || documentPatient.birthDate,
						payerIdentityDocument: taxReadyPaymentRequested
							? explicitPayerIdentityDocument
							: explicitPayerIdentityDocument ||
								administrativePayerDocument ||
								null,
						payerRelationship: taxReadyPaymentRequested
							? paymentPayerRelation
							: paymentPayerRelation || "пациент",
						taxDeductionCode: paymentTaxDeductionCode || null,
						note: "Оплата из рабочего экрана CRM",
					}),
				});
			}
			if (!response.ok) {
				setError(await responseErrorMessage(response, "Оплата не записана"));
				return;
			}
			paymentMutationIdRef.current = null;
			setPaymentAmount("");
			setPaymentFiscalReceiptNumber("");
			setPaymentFiscalReceiptIssuedAt("");
			setPaymentFiscalFn("");
			setPaymentFiscalFd("");
			setPaymentFiscalFpd("");
			setPaymentFiscalCashierName("");
			setPaymentFiscalReceiptUrl("");
			setPaymentPayerFullName("");
			setPaymentPayerInn("");
			setPaymentPayerBirthDate("");
			setPaymentPayerIdentityDocument("");
			setPaymentPayerRelationship("пациент");
			setPaymentTaxDeductionCode("");
			await loadDashboard();
			setPaymentFeedback(
				`Оплата ${money(amountRub)} записана для ${documentPatient.fullName}. Фискальные и налоговые поля очищены для следующего платежа.`,
			);
			setError(null);
		} catch (paymentError) {
			showToast(
				actionFailureToast(
					"Оплата не записана",
					(paymentError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage("Оплата не записана", paymentError),
			);
		} finally {
			setIsPaymentSaving(false);
		}
	}

	return {
		paymentMutationIdRef,
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
		isPaymentSaving,
		recordPayment,
	};
}

import {
	type Dashboard,
	type GeneratedDocument,
	type Patient,
	documentKindMetadata,
	generateUuidV7,
	rublesToKopecks,
} from "@dental/shared";
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
import { StaffActionAuditService } from "../../services/audit/staffActionAuditService";
import { fetchWithHandling } from "../../utils/networkUtils";
import { enqueueOfflinePayment } from "../../offline/offlinePaymentQueue";

export type UseFinanceLogicOptions = {
	auth: {
		denteClinicalReadHeaders: (
			headers?: Record<string, string>,
		) => Record<string, string>;
		denteClinicalMutationHeaders: (
			headers?: Record<string, string>,
		) => Record<string, string>;
	};
	dashboard: Dashboard | null;
	documentPatient: Patient | null;
	paymentPatientContextReady: boolean;
	paymentPatientContextMessage: string | null;
	realActiveVisitId: string | null;
	loadDashboard: () => Promise<void>;
	setError: (error: string | null) => void;
	activeUsableDocuments?: GeneratedDocument[] | null | undefined;
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
		const rawPayerInn = explicitPayerInn || administrativePayerInn;
		const cleanPayerInn = rawPayerInn.replace(/\D/g, "");
		// Мандаты 8e, 8n (54-ФЗ): с физлиц ИНН строго опционален и никогда не блокирует кассу
		const normalizedPayerInn = /^\d{10}$|^\d{12}$/.test(cleanPayerInn) ? cleanPayerInn : null;
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
			if (!paymentMutationIdRef.current) {
				paymentMutationIdRef.current = generateUuidV7();
			}
			const paymentClientMutationId = paymentMutationIdRef.current;
			const familyClientMutationId = paymentClientMutationId;
			const cashboxMethod = (paymentMethod as string) === "family_wallet" || (paymentMethod as string) === "family_balance"
				? "family_wallet"
				: paymentMethod;

			response = await fetchWithHandling("/api/cashbox/payments", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": paymentClientMutationId,
					// Canonical SSOT routing: "Idempotency-Key": familyClientMutationId
				}),
				body: JSON.stringify({
					patientId: documentPatient.id,
					visitId: realActiveVisitId ?? undefined,
					invoiceId: documentForPayment?.id ?? undefined,
					clientMutationId: paymentClientMutationId,
					amountRub,
					amountKopecks: rublesToKopecks(amountRub),
					method: cashboxMethod,
					payerFullName: paymentPayerName || documentPatient.fullName,
					buyerInn: normalizedPayerInn || undefined,
					note: "Оплата из рабочего экрана CRM",
				}),
			});
			if (!response.ok) {
				setError(await responseErrorMessage(response, "Оплата не записана"));
				return;
			}
			paymentMutationIdRef.current = null;
			StaffActionAuditService.logPaymentReceive({
				patientId: documentPatient.id,
				billId: documentForPayment?.id || browserGeneratedId("pay"),
				amountKopecks: rublesToKopecks(amountRub),
				paymentMethod: String(paymentMethod),
				...(paymentFiscalReceiptNumber.trim() ? { fiscalReceiptNumber: paymentFiscalReceiptNumber.trim() } : {}),
			});
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
			const isOfflineOrNetwork =
				(typeof navigator !== "undefined" && !navigator.onLine) ||
				(paymentError instanceof TypeError &&
					paymentError.message.toLowerCase().includes("fetch")) ||
				(paymentError instanceof Error &&
					(paymentError.message.toLowerCase().includes("network") ||
						paymentError.message.toLowerCase().includes("failed to fetch") ||
						paymentError.message.startsWith("HTTP 502") ||
						paymentError.message.startsWith("HTTP 503") ||
						paymentError.message.startsWith("HTTP 504")));

			if (isOfflineOrNetwork) {
				const offlinePayload = {
					patientId: documentPatient.id,
					visitId: realActiveVisitId,
					amountRub,
					method: paymentMethod,
					fiscalReceiptNumber: paymentFiscalReceiptNumber.trim() || null,
					fiscalReceiptIssuedAt: paymentFiscalReceiptIssuedAt.trim() || null,
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
					note: "Оплата принята офлайн: чек добавлен в очередь фоновой фискализации",
				};

				void enqueueOfflinePayment({
					patientId: documentPatient.id,
					patientName: documentPatient.fullName,
					visitId: realActiveVisitId ?? undefined,
					totalKopecks: rublesToKopecks(amountRub),
					paymentType: (paymentMethod === "cash" || paymentMethod === "card") ? paymentMethod : "mixed",
					items: [],
				});

				showToast(
					"Оплата зафиксирована, чек в очереди фискализации",
					"info",
					5000,
				);

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

				setPaymentFeedback(
					`Оплата ${money(amountRub)} зафиксирована локально. Чек поставлен в очередь фискализации и будет отправлен в ОФД при восстановлении сети.`,
				);
				setError(null);
			} else {
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
			}
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

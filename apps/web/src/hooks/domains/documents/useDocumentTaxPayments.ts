import {
	type Dashboard,
	documentKindMetadata,
	type DocumentKind,
	type Patient,
	type Payment,
} from "@dental/shared";
import { useCallback, useEffect, useMemo } from "react";
import {
	loadDocumentPaymentSelection,
	saveDocumentPaymentSelection,
} from "../../../AppHelpers";
import { normalizeRubAmountInput } from "../../../rubAmountInput";
import {
	paymentTaxYearForUi,
	taxPaymentPayerKeyForUi,
	taxPaymentSelectionDocumentKinds,
} from "../../../workspaceUiLabels";

export interface UseDocumentTaxPaymentsProps {
	activePayments: Payment[];
	dashboard: Dashboard | null;
	documentPatient: Patient | null;
	documentLocalPersistenceOrganizationId: string | null;
	taxDocumentYear: number;
	taxDocumentPayerInn: string;
	selectedDocumentKind: DocumentKind;
	selectedTaxPaymentIds: string[];
	setSelectedTaxPaymentIds: (ids: string[]) => void;
	selectedPaymentReceiptIds: string[];
	setSelectedPaymentReceiptIds: (ids: string[]) => void;
	refundSelectedPaymentId: string;
	setRefundSelectedPaymentId: (id: string) => void;
	refundAmountRub: string;
	setRefundAmountRub: (val: string) => void;
	refundRecipientFullName: string;
	setRefundRecipientFullName: (val: string) => void;
	refundRecipientIdentityDocument: string;
	setRefundRecipientIdentityDocument: (val: string) => void;
	setRefundOriginalFiscalReceiptNumber: (val: string) => void;
	taxApplicationForm: string;
	setTaxApplicationForm: (val: any) => void;
}

export function useDocumentTaxPayments({
	activePayments,
	dashboard,
	documentPatient,
	documentLocalPersistenceOrganizationId,
	taxDocumentYear,
	taxDocumentPayerInn,
	selectedDocumentKind,
	selectedTaxPaymentIds,
	setSelectedTaxPaymentIds,
	selectedPaymentReceiptIds,
	setSelectedPaymentReceiptIds,
	refundSelectedPaymentId,
	setRefundSelectedPaymentId,
	refundAmountRub,
	setRefundAmountRub,
	refundRecipientFullName,
	setRefundRecipientFullName,
	refundRecipientIdentityDocument,
	setRefundRecipientIdentityDocument,
	setRefundOriginalFiscalReceiptNumber,
	taxApplicationForm,
	setTaxApplicationForm,
}: UseDocumentTaxPaymentsProps) {
	const taxDocumentPayerOptions = useMemo(() => {
		const optionsByKey = new Map<
			string,
			{
				key: string;
				inn: string;
				label: string;
				amountRub: number;
				paymentCount: number;
			}
		>();
		for (const payment of activePayments) {
			const paymentTaxYear = paymentTaxYearForUi(payment);
			if (payment.status !== "paid" || paymentTaxYear !== taxDocumentYear)
				continue;
			const payerKey = taxPaymentPayerKeyForUi(payment);
			if (!payerKey) continue;
			const payerInn = payment.payerInn?.trim() || "";
			const payerName = payment.payerFullName?.trim() || "Плательщик";
			const payerRelationship = payment.payerRelationship?.trim();
			const payerIdentity = payment.payerIdentityDocument?.trim();
			const existing = optionsByKey.get(payerKey);
			if (existing) {
				existing.amountRub += payment.amountRub;
				existing.paymentCount += 1;
				continue;
			}
			optionsByKey.set(payerKey, {
				key: payerKey,
				inn: payerInn,
				label: payerInn
					? `${payerName} · ИНН ${payerInn}${payerRelationship ? ` · ${payerRelationship}` : ""}`
					: `${payerName} · документ ${payerIdentity || "без ИНН"}${payerRelationship ? ` · ${payerRelationship}` : ""}`,
				amountRub: payment.amountRub,
				paymentCount: 1,
			});
		}
		return Array.from(optionsByKey.values()).sort(
			(left, right) =>
				right.amountRub - left.amountRub ||
				left.label.localeCompare(right.label, "ru"),
		);
	}, [activePayments, taxDocumentYear]);

	const selectedTaxDocumentPayerKey = useMemo(() => {
		if (
			taxDocumentPayerOptions.some(
				(option) => option.key === taxDocumentPayerInn,
			)
		)
			return taxDocumentPayerInn;
		return taxDocumentPayerOptions.length === 1
			? (taxDocumentPayerOptions[0]?.key ?? "")
			: "";
	}, [taxDocumentPayerInn, taxDocumentPayerOptions]);

	const selectedTaxDocumentPayerOption = useMemo(
		() =>
			taxDocumentPayerOptions?.find(
				(option) => option.key === selectedTaxDocumentPayerKey,
			) ?? null,
		[selectedTaxDocumentPayerKey, taxDocumentPayerOptions],
	);

	const selectedTaxDocumentPayerInn = selectedTaxDocumentPayerOption?.inn ?? "";
	const selectedDocumentUsesTaxPaymentSelection =
		taxPaymentSelectionDocumentKinds.has(selectedDocumentKind);
	const _selectedDocumentMetadata = documentKindMetadata[selectedDocumentKind];

	const eligibleTaxPayments = useMemo(() => {
		return activePayments
			.filter(
				(payment) =>
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					paymentTaxYearForUi(payment) === taxDocumentYear &&
					(!selectedTaxDocumentPayerKey ||
						taxPaymentPayerKeyForUi(payment) === selectedTaxDocumentPayerKey),
			)
			.sort((left, right) =>
				(right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(
					left.fiscalReceiptIssuedAt || left.paidAt || "",
				),
			);
	}, [activePayments, selectedTaxDocumentPayerKey, taxDocumentYear]);

	const selectedTaxPaymentIdSet = useMemo(
		() => new Set(selectedTaxPaymentIds),
		[selectedTaxPaymentIds],
	);

	const selectedEligibleTaxPayments = useMemo(
		() =>
			eligibleTaxPayments.filter((payment) =>
				selectedTaxPaymentIdSet.has(payment.id),
			),
		[eligibleTaxPayments, selectedTaxPaymentIdSet],
	);

	const selectedTaxPaymentTotalRub = selectedEligibleTaxPayments.reduce(
		(total, payment) => total + payment.amountRub,
		0,
	);

	const selectedTaxPaymentIdsForCurrentDocument = useCallback(() => {
		const eligibleTaxPaymentIdSet = new Set(
			eligibleTaxPayments.map((payment) => payment.id),
		);
		return selectedTaxPaymentIds.filter((paymentId) =>
			eligibleTaxPaymentIdSet.has(paymentId),
		);
	}, [selectedTaxPaymentIds, eligibleTaxPayments]);

	function selectAllEligibleTaxPaymentsForCurrentDocument(): void {
		const eligiblePaymentIds = eligibleTaxPayments.map((payment) => payment.id);
		setSelectedTaxPaymentIds(eligiblePaymentIds);
	}

	const selectedDocumentUsesPaymentReceiptSelection =
		selectedDocumentKind === "payment_receipt";

	const eligiblePaymentReceiptPayments = useMemo(() => {
		return activePayments
			.filter(
				(payment) =>
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					(!dashboard?.activeVisit?.id ||
						payment.visitId === dashboard?.activeVisit?.id),
			)
			.sort((left, right) =>
				(right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(
					left.fiscalReceiptIssuedAt || left.paidAt || "",
				),
			);
	}, [activePayments, dashboard?.activeVisit?.id]);

	const selectedPaymentReceiptIdSet = useMemo(
		() => new Set(selectedPaymentReceiptIds),
		[selectedPaymentReceiptIds],
	);

	const selectedPaymentReceiptPayments = useMemo(
		() =>
			eligiblePaymentReceiptPayments.filter((payment) =>
				selectedPaymentReceiptIdSet.has(payment.id),
			),
		[eligiblePaymentReceiptPayments, selectedPaymentReceiptIdSet],
	);

	const selectedPaymentReceiptTotalRub = selectedPaymentReceiptPayments.reduce(
		(total, payment) => total + payment.amountRub,
		0,
	);

	const eligibleRefundCorrectionPayments = useMemo(() => {
		return activePayments
			.filter(
				(payment) =>
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					payment.fiscalReceiptNumber?.trim() &&
					(!dashboard?.activeVisit?.id ||
						payment.visitId === dashboard?.activeVisit?.id),
			)
			.sort((left, right) =>
				(right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(
					left.fiscalReceiptIssuedAt || left.paidAt || "",
				),
			);
	}, [activePayments, dashboard?.activeVisit?.id]);

	const _selectedRefundCorrectionPayment = useMemo(
		() =>
			eligibleRefundCorrectionPayments?.find(
				(payment) => payment.id === refundSelectedPaymentId,
			) ?? null,
		[eligibleRefundCorrectionPayments, refundSelectedPaymentId],
	);

	const taxPaymentSelectionPersistenceKey = useMemo(() => {
		if (!documentPatient) return null;
		const organizationId = documentLocalPersistenceOrganizationId ?? "clinic";
		const payerKey = selectedTaxDocumentPayerKey || "all-payers";
		return `tax:${organizationId}:${documentPatient.id}:${taxDocumentYear}:${payerKey}`;
	}, [
		documentLocalPersistenceOrganizationId,
		documentPatient?.id,
		selectedTaxDocumentPayerKey,
		taxDocumentYear,
		documentPatient,
	]);

	const paymentReceiptSelectionPersistenceKey = useMemo(() => {
		if (!documentPatient) return null;
		const organizationId = documentLocalPersistenceOrganizationId ?? "clinic";
		return `receipt:${organizationId}:${documentPatient.id}:${dashboard?.activeVisit?.id ?? "all-visits"}`;
	}, [
		dashboard?.activeVisit?.id,
		documentLocalPersistenceOrganizationId,
		documentPatient?.id,
		documentPatient,
	]);

	function selectRefundOriginalPayment(paymentId: string): void {
		setRefundSelectedPaymentId(paymentId);
		const payment = eligibleRefundCorrectionPayments?.find(
			(candidate) => candidate.id === paymentId,
		);
		if (!payment) return;
		setRefundOriginalFiscalReceiptNumber(
			payment.fiscalReceiptNumber?.trim() || "",
		);
		const currentAmountRub = normalizeRubAmountInput(refundAmountRub);
		if (
			currentAmountRub === null ||
			currentAmountRub <= 0 ||
			currentAmountRub > payment.amountRub
		) {
			setRefundAmountRub(String(payment.amountRub));
		}
		if (!refundRecipientFullName.trim() && payment.payerFullName?.trim()) {
			setRefundRecipientFullName(payment.payerFullName.trim());
		}
		if (
			!refundRecipientIdentityDocument.trim() &&
			payment.payerIdentityDocument?.trim()
		) {
			setRefundRecipientIdentityDocument(payment.payerIdentityDocument.trim());
		}
	}

	useEffect(() => {
		if (!refundSelectedPaymentId) return;
		if (
			eligibleRefundCorrectionPayments.some(
				(payment) => payment.id === refundSelectedPaymentId,
			)
		)
			return;
		setRefundSelectedPaymentId("");
	}, [
		eligibleRefundCorrectionPayments,
		refundSelectedPaymentId,
		setRefundSelectedPaymentId,
	]);

	const selectedTaxApplicationPayment = useMemo(() => {
		if (!selectedTaxDocumentPayerKey) return null;
		return (
			activePayments?.find(
				(payment) =>
					payment.status === "paid" &&
					taxPaymentPayerKeyForUi(payment) === selectedTaxDocumentPayerKey &&
					paymentTaxYearForUi(payment) === taxDocumentYear,
			) ?? null
		);
	}, [activePayments, selectedTaxDocumentPayerKey, taxDocumentYear]);

	useEffect(() => {
		if (taxDocumentYear < 2024 && taxApplicationForm !== "legacy_2021_2023") {
			setTaxApplicationForm("legacy_2021_2023");
			return;
		}
		if (taxDocumentYear >= 2024 && taxApplicationForm === "legacy_2021_2023") {
			setTaxApplicationForm("knd_1151156");
		}
	}, [taxDocumentYear, taxApplicationForm, setTaxApplicationForm]);

	useEffect(() => {
		if (
			!selectedDocumentUsesTaxPaymentSelection ||
			!taxPaymentSelectionPersistenceKey
		) {
			return;
		}
		const eligibleTaxPaymentIdSet = new Set(
			eligibleTaxPayments.map((payment) => payment.id),
		);
		const storedPaymentIds = loadDocumentPaymentSelection(
			documentLocalPersistenceOrganizationId,
			taxPaymentSelectionPersistenceKey,
		);
		const nextPaymentIds = (storedPaymentIds ?? []).filter((paymentId) =>
			eligibleTaxPaymentIdSet.has(paymentId),
		);
		setSelectedTaxPaymentIds(nextPaymentIds);
	}, [
		documentLocalPersistenceOrganizationId,
		selectedDocumentUsesTaxPaymentSelection,
		taxPaymentSelectionPersistenceKey,
		setSelectedTaxPaymentIds,
		eligibleTaxPayments,
	]);

	useEffect(() => {
		if (
			!selectedDocumentUsesTaxPaymentSelection ||
			!taxPaymentSelectionPersistenceKey
		)
			return;
		saveDocumentPaymentSelection(
			documentLocalPersistenceOrganizationId,
			taxPaymentSelectionPersistenceKey,
			selectedTaxPaymentIdsForCurrentDocument(),
		);
	}, [
		documentLocalPersistenceOrganizationId,
		selectedDocumentUsesTaxPaymentSelection,
		taxPaymentSelectionPersistenceKey,
		selectedTaxPaymentIdsForCurrentDocument,
	]);

	useEffect(() => {
		if (
			!selectedDocumentUsesPaymentReceiptSelection ||
			!paymentReceiptSelectionPersistenceKey
		) {
			return;
		}
		const eligiblePaymentReceiptIdSet = new Set(
			eligiblePaymentReceiptPayments.map((payment) => payment.id),
		);
		const storedPaymentIds = loadDocumentPaymentSelection(
			documentLocalPersistenceOrganizationId,
			paymentReceiptSelectionPersistenceKey,
		);
		const defaultPaymentIds = eligiblePaymentReceiptPayments.map(
			(payment) => payment.id,
		);
		const nextPaymentIds = (storedPaymentIds ?? defaultPaymentIds).filter(
			(paymentId) => eligiblePaymentReceiptIdSet.has(paymentId),
		);
		setSelectedPaymentReceiptIds(nextPaymentIds);
	}, [
		documentLocalPersistenceOrganizationId,
		selectedDocumentUsesPaymentReceiptSelection,
		paymentReceiptSelectionPersistenceKey,
		setSelectedPaymentReceiptIds,
		eligiblePaymentReceiptPayments,
	]);

	useEffect(() => {
		if (
			!selectedDocumentUsesPaymentReceiptSelection ||
			!paymentReceiptSelectionPersistenceKey
		)
			return;
		const eligiblePaymentReceiptIdSet = new Set(
			eligiblePaymentReceiptPayments.map((payment) => payment.id),
		);
		saveDocumentPaymentSelection(
			documentLocalPersistenceOrganizationId,
			paymentReceiptSelectionPersistenceKey,
			selectedPaymentReceiptIds.filter((paymentId) =>
				eligiblePaymentReceiptIdSet.has(paymentId),
			),
		);
	}, [
		documentLocalPersistenceOrganizationId,
		paymentReceiptSelectionPersistenceKey,
		selectedDocumentUsesPaymentReceiptSelection,
		selectedPaymentReceiptIds,
		eligiblePaymentReceiptPayments,
	]);

	return {
		taxDocumentPayerOptions,
		selectedTaxDocumentPayerKey,
		selectedTaxDocumentPayerOption,
		selectedTaxDocumentPayerInn,
		selectedDocumentUsesTaxPaymentSelection,
		selectedDocumentMetadata: _selectedDocumentMetadata,
		eligibleTaxPayments,
		selectedTaxPaymentIdSet,
		selectedEligibleTaxPayments,
		selectedTaxPaymentTotalRub,
		selectedTaxPaymentIdsForCurrentDocument,
		selectAllEligibleTaxPaymentsForCurrentDocument,
		selectedDocumentUsesPaymentReceiptSelection,
		eligiblePaymentReceiptPayments,
		selectedPaymentReceiptIdSet,
		selectedPaymentReceiptPayments,
		selectedPaymentReceiptTotalRub,
		eligibleRefundCorrectionPayments,
		selectedRefundCorrectionPayment: _selectedRefundCorrectionPayment,
		taxPaymentSelectionPersistenceKey,
		paymentReceiptSelectionPersistenceKey,
		selectRefundOriginalPayment,
		selectedTaxApplicationPayment,
	};
}

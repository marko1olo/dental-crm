import { useMemo, useEffect, useCallback, useRef } from "react";
import { useDocumentStore } from "../../store/documentStore";
import { taxPaymentSelectionDocumentKinds, taxPaymentPayerKeyForUi, paymentTaxYearForUi } from "../../workspaceUiLabels";
import { 
    toDateInputValue,
    toDateTimeLocalValue,
    loadDocumentPaymentSelection,
    saveDocumentPaymentSelection,
    normalizeTaxApplicationRelationship
} from "../../AppHelpers";

export interface TaxDocumentLogicProps {
    documentPatient: any;
    activePayments: any[];
    documentLocalPersistenceOrganizationId: string | null;
    dashboard: any;
}

export function useTaxDocumentLogic(props: TaxDocumentLogicProps) {
    const { documentPatient, activePayments, documentLocalPersistenceOrganizationId, dashboard } = props;
    
    const documentState = useDocumentStore();
    const {
        selectedDocumentKind,
        taxDocumentYear,
        taxDocumentPayerInn,
        selectedTaxPaymentIds,
        refundSelectedPaymentId,
        setRefundSelectedPaymentId,
        setSelectedTaxPaymentIds,
        setTaxApplicationTaxpayerFullName,
        setTaxApplicationTaxpayerInn,
        setTaxApplicationTaxpayerBirthDate,
        setTaxApplicationTaxpayerIdentityDocument,
        setTaxApplicationRelationship,
        setTaxApplicationContact,
        setTaxApplicationAuthorityDocument,
        setTaxApplicationRequestedAt
    } = documentState;

    const taxPaymentSelectionHydratedKeyRef = useRef<string | null>(null);

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

    const selectedDocumentUsesTaxPaymentSelection =
		taxPaymentSelectionDocumentKinds.has(selectedDocumentKind);

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
		if (
			!selectedDocumentUsesTaxPaymentSelection ||
			!taxPaymentSelectionPersistenceKey
		) {
			taxPaymentSelectionHydratedKeyRef.current = null;
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
		taxPaymentSelectionHydratedKeyRef.current =
			taxPaymentSelectionPersistenceKey;
	}, [
		documentLocalPersistenceOrganizationId,
		selectedDocumentUsesTaxPaymentSelection,
		taxPaymentSelectionPersistenceKey,
		setSelectedTaxPaymentIds,
		eligibleTaxPayments.map,
	]);

    useEffect(() => {
		if (
			!selectedDocumentUsesTaxPaymentSelection ||
			!taxPaymentSelectionPersistenceKey
		)
			return;
		if (
			taxPaymentSelectionHydratedKeyRef.current !==
			taxPaymentSelectionPersistenceKey
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
		if (!documentPatient) return;
		const administrativeProfile = documentPatient.administrativeProfile;
		setTaxApplicationTaxpayerFullName(documentPatient.fullName);
		setTaxApplicationTaxpayerInn(
			administrativeProfile?.taxpayerInn?.trim() || "",
		);
		setTaxApplicationTaxpayerBirthDate(
			toDateInputValue(documentPatient.birthDate),
		);
		setTaxApplicationTaxpayerIdentityDocument(
			administrativeProfile?.identityDocument?.trim() || "",
		);
		setTaxApplicationRelationship("self");
		setTaxApplicationContact(
			administrativeProfile?.preferredDocumentRecipient?.trim() ||
				documentPatient?.phone ||
				documentPatient?.email ||
				documentPatient?.fullName ||
				"",
		);
		setTaxApplicationAuthorityDocument("");
		setTaxApplicationRequestedAt(
			toDateTimeLocalValue(new Date().toISOString()),
		);
	}, [
		documentPatient?.id,
		documentPatient?.phone,
		setTaxApplicationTaxpayerInn,
		setTaxApplicationContact,
		setTaxApplicationTaxpayerFullName,
		setTaxApplicationRequestedAt,
		documentPatient?.fullName,
		documentPatient?.email,
		setTaxApplicationTaxpayerIdentityDocument,
		setTaxApplicationAuthorityDocument,
		documentPatient,
		setTaxApplicationTaxpayerBirthDate,
		setTaxApplicationRelationship,
	]);

    useEffect(() => {
		if (!selectedTaxApplicationPayment) return;
		setTaxApplicationTaxpayerFullName(
			selectedTaxApplicationPayment.payerFullName?.trim() ||
				documentPatient?.fullName ||
				"",
		);
		setTaxApplicationTaxpayerInn(
			selectedTaxApplicationPayment.payerInn?.trim() ||
				documentPatient?.administrativeProfile?.taxpayerInn?.trim() ||
				"",
		);
		setTaxApplicationTaxpayerBirthDate(
			toDateInputValue(
				selectedTaxApplicationPayment.payerBirthDate?.trim() ||
					documentPatient?.birthDate ||
					"",
			),
		);
		setTaxApplicationTaxpayerIdentityDocument(
			selectedTaxApplicationPayment.payerIdentityDocument?.trim() ||
				documentPatient?.administrativeProfile?.identityDocument?.trim() ||
				"",
		);
		setTaxApplicationRelationship(
			normalizeTaxApplicationRelationship(
				selectedTaxApplicationPayment.payerRelationship,
			) ?? "self",
		);
	}, [
		documentPatient,
		selectedTaxApplicationPayment,
		setTaxApplicationTaxpayerFullName,
		setTaxApplicationTaxpayerInn,
		setTaxApplicationTaxpayerIdentityDocument,
		setTaxApplicationTaxpayerBirthDate,
		setTaxApplicationRelationship,
	]);


    return {
        taxDocumentPayerOptions,
        selectedTaxDocumentPayerKey,
        selectedTaxDocumentPayerOption,
        eligibleTaxPayments,
        selectedTaxPaymentIdSet,
        selectedEligibleTaxPayments,
        selectedTaxPaymentTotalRub,
        selectedTaxPaymentIdsForCurrentDocument,
        _selectedRefundCorrectionPayment,
        taxPaymentSelectionPersistenceKey,
        selectedTaxApplicationPayment,
        selectedDocumentUsesTaxPaymentSelection,
        eligibleRefundCorrectionPayments
    };
}

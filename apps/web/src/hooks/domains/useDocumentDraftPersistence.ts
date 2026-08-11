import { useEffect, useRef } from "react";
import {
	loadDocumentPaymentSelection,
	saveDocumentPaymentSelection,
	loadOutpatient025uDocumentDraft,
	saveOutpatient025uDocumentDraft,
	loadMedicalRecordExtractDocumentDraft,
	saveMedicalRecordExtractDocumentDraft,
	emptyOutpatient025uDocumentDraftFields,
	emptyMedicalRecordExtractDocumentDraftFields,
} from "../../AppHelpers";
import {
	type Outpatient025uDocumentDraftFields,
	type MedicalRecordExtractDocumentDraftFields,
} from "../../AppConstants";

export interface DocumentDraftPersistenceProps {
	documentLocalPersistenceOrganizationId: string | null;
	selectedDocumentUsesTaxPaymentSelection: boolean;
	taxPaymentSelectionPersistenceKey: string | null;
	selectedTaxPaymentIdsForCurrentDocument: () => string[];
	eligibleTaxPayments: any[];
	setSelectedTaxPaymentIds: (ids: string[]) => void;
	
	selectedDocumentUsesPaymentReceiptSelection: boolean;
	paymentReceiptSelectionPersistenceKey: string | null;
	eligiblePaymentReceiptPayments: any[];
	setSelectedPaymentReceiptIds: (ids: string[]) => void;
	selectedPaymentReceiptIds: string[];

	selectedDocumentKind: string;
	outpatient025uDraftPersistenceKey: string | null;
	applyOutpatient025uDocumentDraftFields: (fields: Outpatient025uDocumentDraftFields) => void;
	documentPatientId: string | undefined;
	outpatient025uDraftVisitId: string | null;
	currentOutpatient025uDocumentDraftFields: () => Outpatient025uDocumentDraftFields;

	medicalRecordExtractDraftPersistenceKey: string | null;
	applyMedicalRecordExtractDocumentDraftFields: (fields: MedicalRecordExtractDocumentDraftFields) => void;
	medicalRecordExtractDraftVisitId: string | null;
	currentMedicalRecordExtractDocumentDraftFields: () => MedicalRecordExtractDocumentDraftFields;
}

export function useDocumentDraftPersistence({
	documentLocalPersistenceOrganizationId,
	selectedDocumentUsesTaxPaymentSelection,
	taxPaymentSelectionPersistenceKey,
	selectedTaxPaymentIdsForCurrentDocument,
	eligibleTaxPayments,
	setSelectedTaxPaymentIds,
	
	selectedDocumentUsesPaymentReceiptSelection,
	paymentReceiptSelectionPersistenceKey,
	eligiblePaymentReceiptPayments,
	setSelectedPaymentReceiptIds,
	selectedPaymentReceiptIds,

	selectedDocumentKind,
	outpatient025uDraftPersistenceKey,
	applyOutpatient025uDocumentDraftFields,
	documentPatientId,
	outpatient025uDraftVisitId,
	currentOutpatient025uDocumentDraftFields,

	medicalRecordExtractDraftPersistenceKey,
	applyMedicalRecordExtractDocumentDraftFields,
	medicalRecordExtractDraftVisitId,
	currentMedicalRecordExtractDocumentDraftFields,
}: DocumentDraftPersistenceProps) {
	const taxPaymentSelectionHydratedKeyRef = useRef<string | null>(null);
	const paymentReceiptSelectionHydratedKeyRef = useRef<string | null>(null);
	const outpatient025uDraftHydratedKeyRef = useRef<string | null>(null);
	const medicalRecordExtractDraftHydratedKeyRef = useRef<string | null>(null);

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
		const defaultPaymentIds = eligibleTaxPayments.map(
			(payment) => payment.id,
		);
		const nextPaymentIds = (storedPaymentIds ?? defaultPaymentIds).filter(
			(paymentId) => eligibleTaxPaymentIdSet.has(paymentId),
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
		if (
			!selectedDocumentUsesPaymentReceiptSelection ||
			!paymentReceiptSelectionPersistenceKey
		) {
			paymentReceiptSelectionHydratedKeyRef.current = null;
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
		paymentReceiptSelectionHydratedKeyRef.current =
			paymentReceiptSelectionPersistenceKey;
	}, [
		documentLocalPersistenceOrganizationId,
		selectedDocumentUsesPaymentReceiptSelection,
		paymentReceiptSelectionPersistenceKey,
		setSelectedPaymentReceiptIds,
		eligiblePaymentReceiptPayments.map,
	]);

	useEffect(() => {
		if (
			!selectedDocumentUsesPaymentReceiptSelection ||
			!paymentReceiptSelectionPersistenceKey
		)
			return;
		if (
			paymentReceiptSelectionHydratedKeyRef.current !==
			paymentReceiptSelectionPersistenceKey
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
		eligiblePaymentReceiptPayments.map,
	]);

	useEffect(() => {
		if (
			selectedDocumentKind !== "outpatient_medical_card_025u" ||
			!outpatient025uDraftPersistenceKey
		) {
			outpatient025uDraftHydratedKeyRef.current = null;
			return;
		}
		const storedDraft = loadOutpatient025uDocumentDraft(
			documentLocalPersistenceOrganizationId,
			outpatient025uDraftPersistenceKey,
		);
		applyOutpatient025uDocumentDraftFields(
			storedDraft ?? emptyOutpatient025uDocumentDraftFields(),
		);
		outpatient025uDraftHydratedKeyRef.current =
			outpatient025uDraftPersistenceKey;
	}, [
		documentLocalPersistenceOrganizationId,
		outpatient025uDraftPersistenceKey,
		selectedDocumentKind,
		applyOutpatient025uDocumentDraftFields,
	]);

	useEffect(() => {
		if (
			selectedDocumentKind !== "outpatient_medical_card_025u" ||
			!documentPatientId ||
			!outpatient025uDraftPersistenceKey
		)
			return;
		if (
			outpatient025uDraftHydratedKeyRef.current !==
			outpatient025uDraftPersistenceKey
		)
			return;
		saveOutpatient025uDocumentDraft(
			documentLocalPersistenceOrganizationId,
			outpatient025uDraftPersistenceKey,
			documentPatientId,
			outpatient025uDraftVisitId,
			currentOutpatient025uDocumentDraftFields(),
		);
	}, [
		documentPatientId,
		documentLocalPersistenceOrganizationId,
		outpatient025uDraftPersistenceKey,
		outpatient025uDraftVisitId,
		selectedDocumentKind,
		currentOutpatient025uDocumentDraftFields,
	]);

	useEffect(() => {
		if (
			selectedDocumentKind !== "medical_record_extract" ||
			!medicalRecordExtractDraftPersistenceKey
		) {
			medicalRecordExtractDraftHydratedKeyRef.current = null;
			return;
		}
		const storedDraft = loadMedicalRecordExtractDocumentDraft(
			documentLocalPersistenceOrganizationId,
			medicalRecordExtractDraftPersistenceKey,
		);
		applyMedicalRecordExtractDocumentDraftFields(
			storedDraft ?? emptyMedicalRecordExtractDocumentDraftFields(),
		);
		medicalRecordExtractDraftHydratedKeyRef.current =
			medicalRecordExtractDraftPersistenceKey;
	}, [
		documentLocalPersistenceOrganizationId,
		medicalRecordExtractDraftPersistenceKey,
		selectedDocumentKind,
		applyMedicalRecordExtractDocumentDraftFields,
	]);

	useEffect(() => {
		if (
			selectedDocumentKind !== "medical_record_extract" ||
			!documentPatientId ||
			!medicalRecordExtractDraftPersistenceKey
		)
			return;
		if (
			medicalRecordExtractDraftHydratedKeyRef.current !==
			medicalRecordExtractDraftPersistenceKey
		)
			return;
		saveMedicalRecordExtractDocumentDraft(
			documentLocalPersistenceOrganizationId,
			medicalRecordExtractDraftPersistenceKey,
			documentPatientId,
			medicalRecordExtractDraftVisitId,
			currentMedicalRecordExtractDocumentDraftFields(),
		);
	}, [
		documentPatientId,
		documentLocalPersistenceOrganizationId,
		medicalRecordExtractDraftPersistenceKey,
		medicalRecordExtractDraftVisitId,
		selectedDocumentKind,
		currentMedicalRecordExtractDocumentDraftFields,
	]);
}

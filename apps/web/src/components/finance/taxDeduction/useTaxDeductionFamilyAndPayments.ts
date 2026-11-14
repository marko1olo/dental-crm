import { useState, useEffect, useMemo } from "react";
import type { FamilyMemberPayerConfig, TaxDeductionPaymentItem, TaxDeductionRelationship } from "../taxDeductionEngine";
import { extractTaxYearFromDate } from "../taxDeductionEngine";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import type { TaxDeductionCertificateModalProps } from "./types";

interface RawTaxReceipt {
	readonly id: string;
	readonly receiptNumber: string;
	readonly fiscalDocumentNumber?: string;
	readonly serviceName: string;
	readonly receiptDate: string;
	readonly amountRub: number;
	readonly deductionCode?: string;
	readonly isExcluded?: boolean;
}

interface RawFamilyMemberApi {
	readonly id: string;
	readonly relationship?: string;
	readonly fullName?: string;
	readonly inn?: string;
	readonly birthDate?: string;
	readonly identityDocumentSeries?: string;
	readonly identityDocumentNumber?: string;
}

interface AppLogicAuthContext {
	readonly auth?: {
		readonly denteClinicalReadHeaders?: () => Record<string, string>;
	} | undefined;
}

export function useTaxDeductionFamilyAndPayments(props: TaxDeductionCertificateModalProps, appLogic: AppLogicAuthContext | null | undefined, selectedYear: number) {
	const { isOpen, patientId, payments = [] } = props;
	const [fetchedPayments, setFetchedPayments] = useState<readonly TaxDeductionPaymentItem[]>([]);
	const [isLoadingPayments, setIsLoadingPayments] = useState<boolean>(false);
	const [fetchedFamilyMembers, setFetchedFamilyMembers] = useState<FamilyMemberPayerConfig[]>([]);

	useEffect(() => {
		if (isOpen && patientId && payments.length === 0) {
			setIsLoadingPayments(true);
			const headers: Record<string, string> = { ...denteAdminSecretRequestHeaders(), ...(appLogic?.auth?.denteClinicalReadHeaders?.() ?? {}) };
			fetch(`/api/documents/tax-deduction/preview/${encodeURIComponent(patientId)}?year=${selectedYear}`, { headers })
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					if (data?.receipts && Array.isArray(data.receipts)) {
						const mapped: TaxDeductionPaymentItem[] = (data.receipts as readonly RawTaxReceipt[])
							.filter((r) => !r.isExcluded)
							.map((r) => ({ id: r.id, receiptNumber: r.receiptNumber, fiscalDocumentNumber: r.fiscalDocumentNumber || "", fiscalSign: "", serviceName: r.serviceName, dateIso: r.receiptDate, amountRub: r.amountRub, taxCode: r.deductionCode === "2" ? "2" : "1" }));
						setFetchedPayments(mapped);
					}
				})
				.catch((err) => console.warn("Failed to fetch tax preview payments:", err))
				.finally(() => setIsLoadingPayments(false));
		}
	}, [isOpen, patientId, payments.length, selectedYear, appLogic?.auth]);

	useEffect(() => {
		if (isOpen && patientId) {
			const headers = { ...denteAdminSecretRequestHeaders(), ...(appLogic?.auth?.denteClinicalReadHeaders?.() ?? {}) };
			fetch(`/api/finance/family/patient/${encodeURIComponent(patientId)}`, { headers })
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					if (data?.members && Array.isArray(data.members)) {
						const mapped: FamilyMemberPayerConfig[] = (data.members as readonly RawFamilyMemberApi[]).filter((m) => m.id !== patientId).map((m) => ({
							id: m.id, relationship: (m.relationship === "child" ? "child" : m.relationship === "parent" ? "parent" : "spouse") as TaxDeductionRelationship,
							person: { fullName: m.fullName || "Член семьи", inn: m.inn || "", birthDate: m.birthDate ? m.birthDate.slice(0, 10) : "", identityDocumentSeries: m.identityDocumentSeries || "", identityDocumentNumber: m.identityDocumentNumber || "" },
						}));
						if (mapped.length > 0) setFetchedFamilyMembers(mapped);
					}
				})
				.catch((err) => console.warn("[tax-deduction] failed to fetch family members:", err));
		}
	}, [isOpen, patientId, appLogic?.auth]);

	const effectivePayments = useMemo(() => {
		if (payments.length > 0) return payments;
		if (fetchedPayments.length > 0) return fetchedPayments;
		if (isDemoShowcaseMode()) {
			return [
				{ id: "demo-pmt-1", receiptNumber: "ЧЕК-00104", fiscalDocumentNumber: "98124", fiscalSign: "384910291", serviceName: "Лечение кариеса", dateIso: `${selectedYear}-03-15T10:30:00Z`, amountRub: 14500, taxCode: "1" as const },
				{ id: "demo-pmt-2", receiptNumber: "ЧЕК-00142", fiscalDocumentNumber: "98205", fiscalSign: "384910402", serviceName: "Имплантация (код 02)", dateIso: `${selectedYear}-06-20T14:00:00Z`, amountRub: 85000, taxCode: "2" as const },
			];
		}
		return [];
	}, [payments, fetchedPayments, selectedYear]);

	const familyMembers = useMemo<FamilyMemberPayerConfig[]>(() => {
		if (props.familyMembers?.length) return props.familyMembers as FamilyMemberPayerConfig[];
		if (fetchedFamilyMembers.length > 0) return fetchedFamilyMembers;
		if (isDemoShowcaseMode()) {
			return [
				{ id: "demo-fam-spouse", relationship: "spouse", person: { fullName: "Иванова Анна Петровна", inn: "772345678901", birthDate: "1988-04-12", identityDocumentSeries: "4512", identityDocumentNumber: "876543" } },
			];
		}
		return [];
	}, [props.familyMembers, fetchedFamilyMembers, patientId]);

	return { effectivePayments, isLoadingPayments, familyMembers };
}

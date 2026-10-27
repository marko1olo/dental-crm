import { useEffect, useState } from "react";
import { PATIENT_ID_PATTERN, type FamilyTopupMethod } from "./types";
import { useFamilyWalletLoader } from "./useFamilyWalletLoader";
import { useFamilyWalletPayAction } from "./useFamilyWalletPayAction";
import { useFamilyWalletTopupAction } from "./useFamilyWalletTopupAction";
import { useFamilyWalletRefundAction } from "./useFamilyWalletRefundAction";

export interface UseFamilyWalletOptions {
	patientId: string;
	remainingDebtRub: number;
	onPaymentSuccess?: (() => void | Promise<void>) | undefined;
}

export function useFamilyWallet({ patientId, remainingDebtRub, onPaymentSuccess }: UseFamilyWalletOptions) {
	const isPatientDbId = PATIENT_ID_PATTERN.test(patientId);
	const [topupInput, setTopupInput] = useState("");
	const [topupMethod, setTopupMethod] = useState<FamilyTopupMethod>("cash");
	const [amountInput, setAmountInput] = useState("");
	const [targetPatientId, setTargetPatientId] = useState<string>(patientId);
	const [isCombinedBillingModalOpen, setIsCombinedBillingModalOpen] = useState(false);
	const [isLedgerOpen, setIsLedgerOpen] = useState(false);

	useEffect(() => {
		setTargetPatientId(patientId);
		setAmountInput("");
		setTopupInput("");
	}, [patientId]);

	const loader = useFamilyWalletLoader(patientId, isPatientDbId);
	const { family, balanceVal, headFullName, payerName, targetMemberName } = resolveFamilyNames(loader.family, targetPatientId, patientId);
	const debtSuggestionRub = Number.isFinite(remainingDebtRub) ? Math.max(0, Math.round(remainingDebtRub * 100) / 100) : 0;

	const pay = useFamilyWalletPayAction({
		family,
		balanceVal,
		targetPatientId,
		headFullName,
		targetMemberName,
		amountInput,
		setAmountInput,
		onPaymentSuccess,
		loadFamily: loader.loadFamily,
		setLedgerEntries: loader.setLedgerEntries,
	});

	const topup = useFamilyWalletTopupAction({
		family,
		patientId,
		payerName,
		topupInput,
		setTopupInput,
		topupMethod,
		loadFamily: loader.loadFamily,
		setLedgerEntries: loader.setLedgerEntries,
	});

	const refund = useFamilyWalletRefundAction({
		family,
		patientId,
		headFullName,
		loadFamily: loader.loadFamily,
		setLedgerEntries: loader.setLedgerEntries,
		balanceVal,
		ledgerEntries: loader.ledgerEntries,
	});

	return {
		...loader,
		headMember: (family?.members ?? []).find((m) => m.id === family?.headPatientId || m.isHead) || (family?.members ?? [])[0],
		headFullName,
		payerName,
		targetMemberName,
		targetPatientId,
		setTargetPatientId,
		debtSuggestionRub,
		amountInput,
		setAmountInput,
		topupInput,
		setTopupInput,
		topupMethod,
		setTopupMethod,
		isCombinedBillingModalOpen,
		setIsCombinedBillingModalOpen,
		isLedgerOpen,
		setIsLedgerOpen,
		...pay,
		...topup,
		...refund,
	};
}

function resolveFamilyNames(family: any, targetPatientId: string, patientId: string) {
	const parsedBalance = Number(family?.balance ?? 0);
	const balanceVal = Number.isFinite(parsedBalance) ? parsedBalance : 0;
	const headMember = (family?.members ?? []).find((m: any) => m.id === family?.headPatientId || m.isHead) || (family?.members ?? [])[0];
	const headFullName = headMember?.fullName?.trim() || family?.headPatientName?.trim() || "Глава семьи";
	const payerName = (family?.members ?? []).find((m: any) => m.id === targetPatientId)?.fullName?.trim() || (family?.members ?? []).find((m: any) => m.id === patientId)?.fullName?.trim() || headFullName;
	const targetMemberName = (family?.members ?? []).find((m: any) => m.id === targetPatientId)?.fullName?.trim() || payerName;
	return { family, balanceVal, headFullName, payerName, targetMemberName };
}

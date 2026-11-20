/**
 * DENTE Dental CRM — Хук Состояния Студии Лояльности (LOYALTY STATE SSOT)
 * Мандат 8b (Декомпозиция хука <= 280 строк), Мандат 8bm (Целочисленные копейки).
 * Запрет сырых * 100 и / 100 — строго rublesToKopecks и kopecksToRubles.
 */

import { useState, useEffect, useMemo } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { showToast } from "../GlobalToast";
import {
	calculateTierProgression,
	calculateLoyaltyRedemption,
	calculateFamilyPoolBalance,
	exportLoyaltyLedgerToCsv,
	type Fiscal54FzSplitResult,
	type LoyaltyLedgerEntry,
	type FamilyMember,
} from "./loyaltyCatalogData";
import {
	postLoyaltyJson,
	type VerifiedCertState,
	actionApplyPoints,
	actionAccruePoints,
	actionRedeemCertificate,
	actionIssueCertificate,
	actionVerifyCertificate,
} from "./loyaltyStudioActions";

export interface UseLoyaltyStudioStateParams {
	readonly isOpen: boolean;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly initialPointsBalance?: number | undefined;
	readonly initialLifetimeSpentKop?: number | undefined;
	readonly currentInvoiceAmountKop?: number | undefined;
	readonly onRedeemSuccess?: ((redeemedPointsRub: number, fiscalSplit: Fiscal54FzSplitResult) => void) | undefined;
}

interface ApiFamilyMemberResponse {
	readonly id?: string | undefined;
	readonly patientId?: string | undefined;
	readonly fullName?: string | undefined;
	readonly name?: string | undefined;
	readonly roleRu?: string | undefined;
	readonly relation?: string | undefined;
	readonly balancePoints?: number | undefined;
	readonly individualPointsBalance?: number | undefined;
	readonly lifetimeSpentKop?: number | undefined;
}

interface ApiBonusTransactionResponse {
	readonly id?: string | undefined;
	readonly createdAt?: string | Date | undefined;
	readonly type?: string | undefined;
	readonly amountPoints?: number | string | undefined;
	readonly balanceAfterPoints?: number | string | undefined;
	readonly description?: string | undefined;
}

const DEFAULT_FAMILY_MEMBERS: readonly FamilyMember[] = [
	{ patientId: "pat-p1", fullName: "Иванов Иван (Глава семьи)", roleRu: "Глава семьи", individualPointsBalance: 2500, lifetimeSpentKop: 12000000, isBonusSpendingAllowed: true },
	{ patientId: "pat-p2", fullName: "Иванова Ольга (Супруга)", roleRu: "Супруга", individualPointsBalance: 1200, lifetimeSpentKop: 8500000, isBonusSpendingAllowed: true },
	{ patientId: "pat-p3", fullName: "Иванов Артем (Сын)", roleRu: "Ребенок", individualPointsBalance: 300, lifetimeSpentKop: 3200000, isBonusSpendingAllowed: true },
];

export function useLoyaltyStudioState(params: UseLoyaltyStudioStateParams) {
	const {
		isOpen, patientId, patientName = "Пациент", medicalCardNumber = "№ —",
		initialPointsBalance = 0, initialLifetimeSpentKop = 0, currentInvoiceAmountKop = 0, onRedeemSuccess,
	} = params;

	const isDemo = isDemoShowcaseMode();
	const [activeTab, setActiveTab] = useState<"balance" | "family" | "certificates" | "referrals" | "history">("balance");
	const [pointsBalance, setPointsBalance] = useState<number>(initialPointsBalance);
	const [lifetimeSpentKop] = useState<number>(initialLifetimeSpentKop);
	const [nearestExpiringPoints, setNearestExpiringPoints] = useState<number>(0);
	const [nearestExpirationDate, setNearestExpirationDate] = useState<string | null>(null);
	const [daysUntilExpiration, setDaysUntilExpiration] = useState<number | null>(null);
	const [lifetimeExpiredPoints, setLifetimeExpiredPoints] = useState<number>(0);
	const [requestedPointsRub, setRequestedPointsRub] = useState<number>(500);
	const [isDoctorOverride, setIsDoctorOverride] = useState<boolean>(false);
	const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
	const [familyMembers, setFamilyMembers] = useState<readonly FamilyMember[]>(() => isDemo ? DEFAULT_FAMILY_MEMBERS : []);
	const [familyName, setFamilyName] = useState<string>(() => isDemo ? "Семья Ивановых" : "");
	const [hasFamilyGroup, setHasFamilyGroup] = useState<boolean>(() => isDemo);
	const [isCreateFamilyOpen, setIsCreateFamilyOpen] = useState<boolean>(false);
	const [newFamilyGroupName, setNewFamilyGroupName] = useState<string>("");
	const [relativePatientIdInput, setRelativePatientIdInput] = useState<string>(""), [relativeRoleInput, setRelativeRoleInput] = useState<string>("Супруг / Супруга");
	const [certSerial, setCertSerial] = useState<string>(""), [certFeedback, setCertFeedback] = useState<string | null>(null);
	const [verifiedCertificate, setVerifiedCertificate] = useState<VerifiedCertState | null>(null);
	const [refFriendName, setRefFriendName] = useState<string>(""), [refFriendPhone, setRefFriendPhone] = useState<string>("");
	const [accrueInputRub, setAccrueInputRub] = useState<string>(""), [isAccrueOpen, setIsAccrueOpen] = useState<boolean>(false);
	const [ledger, setLedger] = useState<readonly LoyaltyLedgerEntry[]>([]);

	// 1. Live API Data Sync & Family Ecosystem Sync (Мандат 8wy, zero-mocks)
	useEffect(() => {
		if (!isOpen || !patientId) return;
		const currentPatientId: string = patientId;
		let isCancelled = false;
		async function fetchLiveLoyaltyAndFamily() {
			try {
				const headers = denteAdminSecretRequestHeaders();
				const balRes = await fetch(`/api/loyalty/balance/${encodeURIComponent(currentPatientId)}`, { headers });
				if (balRes.ok) {
					const data = await balRes.json();
					if (!isCancelled) {
						if (typeof data.activePoints === "number") setPointsBalance(data.activePoints);
						if (typeof data.nearestExpiringPoints === "number") setNearestExpiringPoints(data.nearestExpiringPoints);
						if (data.nearestExpirationDate) setNearestExpirationDate(data.nearestExpirationDate);
						if (typeof data.daysUntilNearestExpiration === "number") setDaysUntilExpiration(data.daysUntilNearestExpiration);
						if (typeof data.lifetimeExpiredPoints === "number") setLifetimeExpiredPoints(data.lifetimeExpiredPoints);
					}
				}
				const famRes = await fetch(`/api/finance/family/patient/${encodeURIComponent(currentPatientId)}`, { headers });
				if (famRes.ok) {
					const famData = await famRes.json();
					if (!isCancelled && famData?.members?.length > 0) {
						setHasFamilyGroup(true);
						if (famData.name) setFamilyName(famData.name);
						setFamilyMembers(famData.members.map((m: ApiFamilyMemberResponse) => ({
							patientId: m.id || m.patientId || "", fullName: m.fullName || m.name || "Член семьи", roleRu: m.roleRu || m.relation || "Член семьи",
							individualPointsBalance: Number(m.balancePoints ?? m.individualPointsBalance ?? 0), lifetimeSpentKop: Number(m.lifetimeSpentKop ?? 0), isBonusSpendingAllowed: true,
						})));
					} else if (!isCancelled && !isDemoShowcaseMode()) { setHasFamilyGroup(false); setFamilyMembers([]); setFamilyName(""); }
				} else if (!isCancelled && !isDemoShowcaseMode()) { setHasFamilyGroup(false); setFamilyMembers([]); setFamilyName(""); }
				const txRes = await fetch(`/api/loyalty/transactions/${encodeURIComponent(currentPatientId)}`, { headers });
				if (txRes.ok) {
					const data = await txRes.json();
					if (!isCancelled && Array.isArray(data.transactions) && data.transactions.length > 0) {
						setLedger(data.transactions.map((t: ApiBonusTransactionResponse) => ({
							id: t.id || `tx-${Date.now()}`, timestampIso: t.createdAt ? new Date(t.createdAt).toLocaleString("ru-RU") : new Date().toLocaleString("ru-RU"),
							patientId: currentPatientId, patientName, medicalCardNumber, operationType: t.type === "expired" ? "expired" : t.type?.includes("accrual") ? "accrual" : "redemption",
							operationTypeRu: t.type === "expired" ? "Сгорание по сроку" : t.type?.includes("accrual") ? "Начисление бонусов" : "Списание бонусов",
							invoiceAmountKop: 0, pointsDeltaRub: Number(t.amountPoints) || 0, balanceAfterRub: Number(t.balanceAfterPoints) || 0,
							paymentMethodRu: "Бонусный счет", staffNameRu: "Система лояльности", noteRu: t.description || "Операция с баллами",
						})));
					}
				}
			} catch (err) { console.error("[LoyaltyStudioModal] Live loyalty fetch error:", err); }
		}
		void fetchLiveLoyaltyAndFamily();
		return () => { isCancelled = true; };
	}, [isOpen, patientId, patientName, medicalCardNumber]);

	// 2. Progression & Family calculations
	const progression = useMemo(() => calculateTierProgression(lifetimeSpentKop), [lifetimeSpentKop]);
	const familyPool = useMemo(() => calculateFamilyPoolBalance(`fam-${patientId}`, familyName || `Семья ${patientName.split(" ")[0]}`, familyMembers), [patientId, familyName, familyMembers]);
	const activeEffectiveBalanceRub = (hasFamilyGroup && selectedFamilyMemberId) ? familyPool.totalPooledPoints : pointsBalance;

	const redemption = useMemo(() => calculateLoyaltyRedemption({
		grossInvoiceKop: currentInvoiceAmountKop, availablePointsBalanceRub: activeEffectiveBalanceRub,
		requestedPointsRub, tierId: progression.currentTier.id, isDoctorOverride,
	}), [currentInvoiceAmountKop, activeEffectiveBalanceRub, requestedPointsRub, progression.currentTier.id, isDoctorOverride]);

	const patientReferralLink = useMemo(() => {
		const origin = typeof window !== "undefined" ? window.location.origin : "https://dente.pro";
		return `${origin}/invite?ref=${encodeURIComponent(patientId || "")}`;
	}, [patientId]);

	// 3. Handlers
	const handleApplyPoints = () => actionApplyPoints({
		patientId, patientName, medicalCardNumber, currentInvoiceAmountKop,
		activeEffectiveBalanceRub, pointsBalance, isDoctorOverride, hasFamilyGroup,
		selectedFamilyMemberId, familyMembers, familyGroupId: familyPool.familyGroupId,
		familyName: familyPool.familyName, totalPooledPoints: familyPool.totalPooledPoints,
		redemption, progression, setPointsBalance, setLedger, onRedeemSuccess,
	});

	const handleAccruePoints = () => actionAccruePoints({
		patientId, patientName, medicalCardNumber, pointsBalance,
		accrueInputRub, setPointsBalance, setLedger, setAccrueInputRub, setIsAccrueOpen,
	});

	const handleCreateFamilyGroup = async () => {
		const gName = newFamilyGroupName.trim() || `Семья ${patientName.split(" ")[0] || "Пациента"}`;
		try {
			const res = await postLoyaltyJson("/api/finance/family", { name: gName, headPatientId: patientId });
			if (!res.ok) { const errJson = await res.json().catch(() => ({})); showToast(errJson.message || "Не удалось создать семейную группу", "warning"); return; }
			setFamilyName(gName); setHasFamilyGroup(true);
			setFamilyMembers([{ patientId: patientId || "", fullName: `${patientName} (Глава)`, roleRu: "Глава семьи", individualPointsBalance: pointsBalance, lifetimeSpentKop, isBonusSpendingAllowed: true }]);
			setIsCreateFamilyOpen(false); showToast(`Семейный счет «${gName}» активирован`, "success");
		} catch (err) { console.error("[LoyaltyStudioModal] Family creation failed:", err); showToast("Ошибка сети при создании семейной группы", "error"); }
	};

	const handleLinkRelative = async () => {
		const input = relativePatientIdInput.trim();
		if (!input) { showToast("Укажите идентификатор или телефон родственника", "warning"); return; }
		if (input === patientId) { showToast("Нельзя привязать пациента к самому себе", "warning"); return; }
		try {
			const res = await postLoyaltyJson("/api/loyalty/family/link", { primaryPatientId: patientId, relativePatientId: input, relationRole: relativeRoleInput });
			if (!res.ok) { const err = await res.json().catch(() => ({})); showToast(err.message || "Пациент не найден в картотеке клиники", "warning"); return; }
			const data = await res.json(), rel = data.relative;
			setFamilyMembers((prev) => [...prev, { patientId: rel?.id || input, fullName: rel?.fullName || `Родственник (${input})`, roleRu: relativeRoleInput, individualPointsBalance: Number(rel?.individualPointsBalance || 0), lifetimeSpentKop: 0, isBonusSpendingAllowed: true }]);
			setRelativePatientIdInput(""); setIsCreateFamilyOpen(false); showToast(data.message || "Родственник успешно привязан к семейному счету", "success");
		} catch { showToast("Ошибка привязки родственника к семейному счету", "warning"); }
	};

	const handleVerifyCertificate = () => actionVerifyCertificate({ certSerial, currentInvoiceAmountKop, setCertFeedback, setVerifiedCertificate });

	const handleRedeemCertificate = () => actionRedeemCertificate({
		verifiedCertificate, currentInvoiceAmountKop, patientId, patientName,
		medicalCardNumber, pointsBalance, setCertFeedback, setVerifiedCertificate, setCertSerial, setLedger, onRedeemSuccess,
	});

	const handleIssueCertificate = (nominalRub: number, title: string) => actionIssueCertificate({
		nominalRub, title, patientId, patientName, medicalCardNumber, pointsBalance, setCertSerial, setCertFeedback, setLedger,
	});

	const handleCopyReferralLink = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) { navigator.clipboard.writeText(patientReferralLink).catch(() => {}); }
		showToast("Реферальная ссылка скопирована в буфер обмена", "success");
	};

	const handleSendReferralInvite = async () => {
		if (!refFriendName) { showToast("Укажите имя приглашенного друга", "warning"); return; }
		const prevBalance = pointsBalance;
		const entry: LoyaltyLedgerEntry = {
			id: `ref-${Date.now().toString().slice(-4)}`, timestampIso: new Date().toLocaleString("ru-RU"), patientId: patientId || "", patientName, medicalCardNumber,
			operationType: "referral_bonus", operationTypeRu: "Реферальный сертификат", invoiceAmountKop: 0, pointsDeltaRub: 1000, balanceAfterRub: pointsBalance + 1000,
			paymentMethodRu: "Акция «Приведи друга»", staffNameRu: "Администратор", noteRu: `Приглашение друга: ${refFriendName} (${refFriendPhone || "телефон не указан"})`,
		};
		setLedger((prev) => [entry, ...prev]); setPointsBalance((b) => b + 1000);
		try {
			const res = await postLoyaltyJson("/api/loyalty/accrue", { patientId, amountPoints: 1000, description: `Реферальный бонус: ${refFriendName}` });
			if (!res.ok) { const errJson = await res.json().catch(() => ({})); showToast(errJson.message || "Ошибка начисления реферального бонуса", "error"); setPointsBalance(prevBalance); return; }
			showToast("Реферальное приглашение создано. Начислено 1 000 бонусов!", "success");
			setRefFriendName(""); setRefFriendPhone("");
		} catch (err) { console.error("[LoyaltyStudioModal] Referral accrue call failed:", err); showToast("Сетевой сбой при начислении реферального бонуса", "error"); setPointsBalance(prevBalance); }
	};

	const handleDownloadCsv = () => {
		const blob = new Blob([exportLoyaltyLedgerToCsv(ledger)], { type: "text/csv;charset=utf-8;" }), url = URL.createObjectURL(blob), link = document.createElement("a");
		link.href = url; link.setAttribute("download", `loyalty-ledger-${patientId}.csv`);
		document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
		showToast("Выгрузка реестра операций сформирована", "info");
	};

	return {
		activeTab, setActiveTab, pointsBalance, lifetimeSpentKop, nearestExpiringPoints, nearestExpirationDate, daysUntilExpiration, lifetimeExpiredPoints,
		requestedPointsRub, setRequestedPointsRub, isDoctorOverride, setIsDoctorOverride, selectedFamilyMemberId, setSelectedFamilyMemberId,
		familyMembers, familyName, hasFamilyGroup, isCreateFamilyOpen, setIsCreateFamilyOpen, newFamilyGroupName, setNewFamilyGroupName,
		relativePatientIdInput, setRelativePatientIdInput, relativeRoleInput, setRelativeRoleInput, certSerial, setCertSerial, certFeedback,
		verifiedCertificate, refFriendName, setRefFriendName, refFriendPhone, setRefFriendPhone, accrueInputRub, setAccrueInputRub,
		isAccrueOpen, setIsAccrueOpen, ledger, progression, familyPool, activeEffectiveBalanceRub, redemption, patientReferralLink,
		handleApplyPoints, handleAccruePoints, handleCreateFamilyGroup, handleLinkRelative, handleVerifyCertificate,
		handleRedeemCertificate, handleIssueCertificate, handleCopyReferralLink, handleSendReferralInvite, handleDownloadCsv,
	};
}

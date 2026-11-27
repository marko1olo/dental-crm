/**
 * DENTE Dental CRM — Хук Состояния Студии Лояльности (LOYALTY STATE SSOT)
 * Мандат 8b (Декомпозиция хука <= 280 строк), Мандат 8bm (Целочисленные копейки).
 * Запрет сырых * 100 и / 100 — строго rublesToKopecks и kopecksToRubles.
 */

import { useState, useEffect, useMemo } from "react";
import { denteClinicalReadHeaders } from "../../lib/denteRequestHeaders";
import { clientLogger } from "../../services/logging/clientLogger";
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
	readLoyaltyResponseJson,
	unwrapLoyaltyDataRecord,
	extractLoyaltyErrorMessage,
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

export function useLoyaltyStudioState(params: UseLoyaltyStudioStateParams) {
	const {
		isOpen, patientId, patientName = "Пациент", medicalCardNumber = "№ —",
		initialPointsBalance = 0, initialLifetimeSpentKop = 0, currentInvoiceAmountKop = 0, onRedeemSuccess,
	} = params;

	const [activeTab, setActiveTab] = useState<"balance" | "family" | "certificates" | "referrals" | "history">("balance");
	const [pointsBalance, setPointsBalance] = useState<number>(initialPointsBalance);
	const [lifetimeSpentKop, setLifetimeSpentKop] = useState<number>(initialLifetimeSpentKop);
	const [nearestExpiringPoints, setNearestExpiringPoints] = useState<number>(0);
	const [nearestExpirationDate, setNearestExpirationDate] = useState<string | null>(null);
	const [daysUntilExpiration, setDaysUntilExpiration] = useState<number | null>(null);
	const [lifetimeExpiredPoints, setLifetimeExpiredPoints] = useState<number>(0);
	const [requestedPointsRub, setRequestedPointsRub] = useState<number>(500);
	const [isDoctorOverride, setIsDoctorOverride] = useState<boolean>(false);
	const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
	const [familyMembers, setFamilyMembers] = useState<readonly FamilyMember[]>([]);
	const [familyName, setFamilyName] = useState<string>("");
	const [familyGroupId, setFamilyGroupId] = useState<string | null>(null);
	const [hasFamilyGroup, setHasFamilyGroup] = useState<boolean>(false);
	const [isCreateFamilyOpen, setIsCreateFamilyOpen] = useState<boolean>(false);
	const [newFamilyGroupName, setNewFamilyGroupName] = useState<string>("");
	const [relativePatientIdInput, setRelativePatientIdInput] = useState<string>(""), [relativeRoleInput, setRelativeRoleInput] = useState<string>("Супруг / Супруга");
	const [certSerial, setCertSerial] = useState<string>(""), [certFeedback, setCertFeedback] = useState<string | null>(null);
	const [verifiedCertificate, setVerifiedCertificate] = useState<VerifiedCertState | null>(null);
	const [refFriendName, setRefFriendName] = useState<string>(""), [refFriendPhone, setRefFriendPhone] = useState<string>("");
	const [accrueInputRub, setAccrueInputRub] = useState<string>(""), [isAccrueOpen, setIsAccrueOpen] = useState<boolean>(false);
	const [ledger, setLedger] = useState<readonly LoyaltyLedgerEntry[]>([]);

	// Reset draft & loaded patient state on patient change or modal close (Mandate 8bn / 8zq)
	useEffect(() => {
		setActiveTab("balance");
		setPointsBalance(initialPointsBalance);
		setLifetimeSpentKop(initialLifetimeSpentKop);
		setNearestExpiringPoints(0);
		setNearestExpirationDate(null);
		setDaysUntilExpiration(null);
		setLifetimeExpiredPoints(0);
		setRequestedPointsRub(500);
		setIsDoctorOverride(false);
		setSelectedFamilyMemberId(null);
		setFamilyMembers([]);
		setFamilyName("");
		setFamilyGroupId(null);
		setHasFamilyGroup(false);
		setIsCreateFamilyOpen(false);
		setNewFamilyGroupName("");
		setRelativePatientIdInput("");
		setRelativeRoleInput("Супруг / Супруга");
		setCertSerial("");
		setCertFeedback(null);
		setVerifiedCertificate(null);
		setRefFriendName("");
		setRefFriendPhone("");
		setAccrueInputRub("");
		setIsAccrueOpen(false);
		setLedger([]);
	}, [patientId, isOpen, initialPointsBalance, initialLifetimeSpentKop]);

	// 1. Live API Data Sync & Family Ecosystem Sync (Мандат 8wy, zero-mocks)
	useEffect(() => {
		if (!isOpen || !patientId) return;
		const currentPatientId: string = patientId;
		let isCancelled = false;
		async function fetchLiveLoyaltyAndFamily() {
			try {
				const headers = denteClinicalReadHeaders();
				const balRes = await fetch(`/api/loyalty/balance/${encodeURIComponent(currentPatientId)}`, { headers });
				if (balRes.ok) {
					const rawBal = await balRes.json();
					const data = rawBal?.data ?? rawBal;
					if (!isCancelled) {
						if (typeof data.activePoints === "number") setPointsBalance(data.activePoints);
						if (typeof data.nearestExpiringPoints === "number") setNearestExpiringPoints(data.nearestExpiringPoints);
						if (data.nearestExpirationDate) setNearestExpirationDate(data.nearestExpirationDate);
						if (typeof data.daysUntilNearestExpiration === "number") setDaysUntilExpiration(data.daysUntilNearestExpiration);
						if (typeof data.lifetimeExpiredPoints === "number") setLifetimeExpiredPoints(data.lifetimeExpiredPoints);
					}
				}
				const famRes = await fetch(`/api/loyalty/family/${encodeURIComponent(currentPatientId)}`, { headers });
				if (famRes.ok) {
					const rawFam = await famRes.json();
					const famData = rawFam?.data ?? rawFam;
					if (!isCancelled && famData?.hasFamilyGroup && famData?.members?.length > 0) {
						setHasFamilyGroup(true);
						if (famData.familyName) setFamilyName(famData.familyName);
						else if (famData.name) setFamilyName(famData.name);
						if (famData.familyGroupId) setFamilyGroupId(famData.familyGroupId);
						else if (famData.id) setFamilyGroupId(famData.id);
						setFamilyMembers(famData.members.map((m: ApiFamilyMemberResponse) => ({
							patientId: m.patientId || m.id || "", fullName: m.fullName || m.name || "Член семьи", roleRu: m.roleRu || m.relation || "Член семьи",
							individualPointsBalance: Number(m.individualPointsBalance ?? m.balancePoints ?? 0), lifetimeSpentKop: Number(m.lifetimeSpentKop ?? 0), isBonusSpendingAllowed: true,
						})));
					} else if (!isCancelled) { setHasFamilyGroup(false); setFamilyMembers([]); setFamilyName(""); setFamilyGroupId(null); }
				} else if (!isCancelled) { setHasFamilyGroup(false); setFamilyMembers([]); setFamilyName(""); setFamilyGroupId(null); }
				const txRes = await fetch(`/api/loyalty/transactions/${encodeURIComponent(currentPatientId)}`, { headers });
				if (txRes.ok) {
					const rawTx = await txRes.json();
					const data = rawTx?.data ?? rawTx;
					if (!isCancelled && Array.isArray(data.transactions)) {
						setLedger(data.transactions.map((t: ApiBonusTransactionResponse) => ({
							id: t.id || `tx-${Date.now()}`, timestampIso: t.createdAt ? new Date(t.createdAt).toLocaleString("ru-RU") : new Date().toLocaleString("ru-RU"),
							patientId: currentPatientId, patientName, medicalCardNumber, operationType: t.type === "expired" ? "expired" : t.type?.includes("accrual") ? "accrual" : "redemption",
							operationTypeRu: t.type === "expired" ? "Сгорание по сроку" : t.type?.includes("accrual") ? "Начисление бонусов" : "Списание бонусов",
							invoiceAmountKop: 0, pointsDeltaRub: Number(t.amountPoints) || 0, balanceAfterRub: Number(t.balanceAfterPoints) || 0,
							paymentMethodRu: "Бонусный счет", staffNameRu: "Система лояльности", noteRu: t.description || "Операция с баллами",
						})));
					}
				} else if (!isCancelled) {
					setLedger([]);
				}
			} catch (err) {
				clientLogger.error("[LoyaltyStudioModal] Live loyalty fetch error", err, { module: "useLoyaltyStudioState" });
				showToast("Не удалось загрузить данные программы лояльности", "warning");
			}
		}
		void fetchLiveLoyaltyAndFamily();
		return () => { isCancelled = true; };
	}, [isOpen, patientId, patientName, medicalCardNumber]);

	// 2. Progression & Family calculations
	const progression = useMemo(() => calculateTierProgression(lifetimeSpentKop), [lifetimeSpentKop]);
	const effectiveFamilyGroupId = familyGroupId || `fam-${patientId}`;
	const familyPool = useMemo(() => calculateFamilyPoolBalance(effectiveFamilyGroupId, familyName || `Семья ${patientName.split(" ")[0]}`, familyMembers), [effectiveFamilyGroupId, familyName, familyMembers]);
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
			if (!res.ok) {
				const errJson = await readLoyaltyResponseJson(res);
				showToast(extractLoyaltyErrorMessage(errJson, "Не удалось создать семейную группу"), "warning");
				return;
			}
			const rawCreated = await readLoyaltyResponseJson(res);
			const created = unwrapLoyaltyDataRecord(rawCreated);
			if (typeof created.id === "string") setFamilyGroupId(created.id);
			setFamilyName(gName); setHasFamilyGroup(true);
			setFamilyMembers([{ patientId: patientId || "", fullName: `${patientName} (Глава)`, roleRu: "Глава семьи", individualPointsBalance: pointsBalance, lifetimeSpentKop, isBonusSpendingAllowed: true }]);
			setIsCreateFamilyOpen(false); showToast(`Семейный счет «${gName}» активирован`, "success");
		} catch (err) { clientLogger.error("[LoyaltyStudioModal] Family creation failed", err, { module: "useLoyaltyStudioState" }); showToast("Ошибка сети при создании семейной группы", "error"); }
	};

	const handleLinkRelative = async () => {
		const input = relativePatientIdInput.trim();
		if (!input) { showToast("Укажите идентификатор или телефон родственника", "warning"); return; }
		if (input === patientId) { showToast("Нельзя привязать пациента к самому себе", "warning"); return; }
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
		const targetGroupId = familyGroupId && !familyGroupId.startsWith("fam-") ? familyGroupId : null;

		try {
			if (isUuid && targetGroupId) {
				const res = await postLoyaltyJson(`/api/finance/family/${encodeURIComponent(targetGroupId)}/members`, {
					patientId: input,
					canSpendFamilyWallet: true,
				});
				if (!res.ok) {
					const err = await readLoyaltyResponseJson(res);
					showToast(extractLoyaltyErrorMessage(err, "Не удалось добавить родственника в семью"), "warning");
					return;
				}
				setFamilyMembers((prev) => [
					...prev,
					{
						patientId: input,
						fullName: `Член семьи (${input.slice(0, 8)})`,
						roleRu: relativeRoleInput,
						individualPointsBalance: 0,
						lifetimeSpentKop: 0,
						isBonusSpendingAllowed: true,
					},
				]);
				setRelativePatientIdInput("");
				setIsCreateFamilyOpen(false);
				showToast("Родственник успешно привязан к семейному счету", "success");
			} else {
				const res = await postLoyaltyJson("/api/loyalty/family/link", {
					primaryPatientId: patientId,
					relativePatientId: input,
					relationRole: relativeRoleInput,
				});
				if (!res.ok) {
					const err = await readLoyaltyResponseJson(res);
					showToast(extractLoyaltyErrorMessage(err, "Пациент не найден в картотеке клиники"), "warning");
					return;
				}
				const raw = await readLoyaltyResponseJson(res);
				const data = unwrapLoyaltyDataRecord(raw);
				const rel = data.relative as { id?: string; fullName?: string; individualPointsBalance?: number } | undefined;
				if (typeof data.familyGroupId === "string") setFamilyGroupId(data.familyGroupId);
				setHasFamilyGroup(true);
				setFamilyMembers((prev) => [
					...prev,
					{
						patientId: rel?.id || input,
						fullName: rel?.fullName || `Родственник (${input})`,
						roleRu: relativeRoleInput,
						individualPointsBalance: Number(rel?.individualPointsBalance || 0),
						lifetimeSpentKop: 0,
						isBonusSpendingAllowed: true,
					},
				]);
				setRelativePatientIdInput("");
				setIsCreateFamilyOpen(false);
				showToast(typeof data.message === "string" ? data.message : "Родственник успешно привязан к семейному счету", "success");
			}
		} catch (err) {
			clientLogger.warn("[LoyaltyStudioModal] Link relative failed", err, { module: "useLoyaltyStudioState" });
			showToast("Ошибка привязки родственника к семейному счету", "warning");
		}
	};

	const handleVerifyCertificate = () => actionVerifyCertificate({ certSerial, currentInvoiceAmountKop, setCertFeedback, setVerifiedCertificate });

	const handleRedeemCertificate = () => actionRedeemCertificate({
		verifiedCertificate, currentInvoiceAmountKop, patientId, patientName,
		medicalCardNumber, pointsBalance, setCertFeedback, setVerifiedCertificate, setCertSerial, setLedger, onRedeemSuccess,
	});

	const handleIssueCertificate = (nominalKop: number, title: string) => actionIssueCertificate({
		nominalKop, title, patientId, patientName, medicalCardNumber, pointsBalance, setCertSerial, setCertFeedback, setLedger,
	});

	const handleCopyReferralLink = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard
				.writeText(patientReferralLink)
				.then(() => {
					showToast("Реферальная ссылка скопирована в буфер обмена", "success");
				})
				.catch((err) => {
					clientLogger.warn("[LoyaltyStudioModal] Failed to copy referral link", err, { module: "useLoyaltyStudioState" });
					showToast("Не удалось скопировать реферальную ссылку", "warning");
				});
			return;
		}
		showToast("Буфер обмена недоступен", "warning");
	};

	const handleSendReferralInvite = async () => {
		if (!refFriendName) { showToast("Укажите имя приглашенного друга", "warning"); return; }
		if (!patientId) { showToast("Пациент не выбран", "warning"); return; }
		try {
			const res = await postLoyaltyJson("/api/loyalty/referrals/register", {
				referrerPatientId: patientId,
				invitedPatientName: refFriendName,
				invitedPatientPhone: refFriendPhone || undefined,
				rewardRub: 1000,
			});
			if (!res.ok) {
				const errJson = await readLoyaltyResponseJson(res);
				showToast(extractLoyaltyErrorMessage(errJson, "Ошибка регистрации реферального приглашения"), "error");
				return;
			}
			showToast("Реферальное приглашение создано. Бонус 1 000 ₽ будет начислен после первой оплаты лечения", "success");
			setRefFriendName("");
			setRefFriendPhone("");
		} catch (err) {
			clientLogger.error("[LoyaltyStudioModal] Referral register call failed", err, { module: "useLoyaltyStudioState" });
			showToast("Сетевой сбой при регистрации реферального приглашения", "error");
		}
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

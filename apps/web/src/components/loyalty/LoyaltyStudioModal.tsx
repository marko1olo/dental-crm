/**
 * DENTE Dental CRM — Каноническая Студия Управления Программой Лояльности (LOYALTY SSOT)
 * Sweet Spot Архитектура (Мандаты 8b 380–480 строк, 8e, 8n, 8wy, 8ze, 8am).
 * Ровно ОДНА Primary CTA кнопка #0d9488, кнопки НИКОГДА НЕ disabled, 0px горизонтального скролла.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, Users, Award, Gift, FileText, X, Check, Download, Plus, Copy, QrCode } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { showToast } from "../GlobalToast";
import {
	GIFT_CERTIFICATE_CATALOG, REFERRAL_HYGIENE_1000_PRESET, QUICK_REDEMPTION_PRESETS_RUB, calculateTierProgression, calculateLoyaltyRedemption,
	validateGiftCertificateSerial, redeemGiftCertificate, calculateFamilyPoolBalance, debitFamilySharedBalance, exportLoyaltyLedgerToCsv, formatKopecksToRubles,
	type Fiscal54FzSplitResult, type LoyaltyLedgerEntry, type FamilyMember, type GiftCertificate,
} from "./loyaltyCatalogData";
import "./loyaltyStudio.css";

export interface LoyaltyStudioModalProps {
	readonly isOpen: boolean; readonly onClose: () => void; readonly clinicName?: string | undefined;
	readonly patientId?: string | undefined; readonly patientName?: string | undefined; readonly medicalCardNumber?: string | undefined;
	readonly initialPointsBalance?: number | undefined; readonly initialLifetimeSpentKop?: number | undefined; readonly currentInvoiceAmountKop?: number | undefined;
	readonly onRedeemSuccess?: ((redeemedPointsRub: number, fiscalSplit: Fiscal54FzSplitResult) => void) | undefined;
}

interface ApiFamilyMemberResponse {
	readonly id?: string | undefined; readonly patientId?: string | undefined; readonly fullName?: string | undefined; readonly name?: string | undefined;
	readonly roleRu?: string | undefined; readonly relation?: string | undefined; readonly balancePoints?: number | undefined;
	readonly individualPointsBalance?: number | undefined; readonly lifetimeSpentKop?: number | undefined;
}

interface ApiBonusTransactionResponse {
	readonly id?: string | undefined; readonly createdAt?: string | Date | undefined; readonly type?: string | undefined;
	readonly amountPoints?: number | string | undefined; readonly balanceAfterPoints?: number | string | undefined; readonly description?: string | undefined;
}

const DEFAULT_FAMILY_MEMBERS: readonly FamilyMember[] = [
	{ patientId: "pat-p1", fullName: "Иванов Иван (Глава семьи)", roleRu: "Глава семьи", individualPointsBalance: 2500, lifetimeSpentKop: 12000000, isBonusSpendingAllowed: true },
	{ patientId: "pat-p2", fullName: "Иванова Ольга (Супруга)", roleRu: "Супруга", individualPointsBalance: 1200, lifetimeSpentKop: 8500000, isBonusSpendingAllowed: true },
	{ patientId: "pat-p3", fullName: "Иванов Артем (Сын)", roleRu: "Ребенок", individualPointsBalance: 300, lifetimeSpentKop: 3200000, isBonusSpendingAllowed: true },
];

const postLoyaltyJson = (url: string, body: unknown) =>
	fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID(), ...denteAdminSecretRequestHeaders() }, body: JSON.stringify(body) });

export const LoyaltyStudioModal: React.FC<LoyaltyStudioModalProps> = (props) => {
	const {
		isOpen, onClose, clinicName = "ООО «Денте Стоматология»", patientId, patientName = "Пациент",
		medicalCardNumber = "№ —", initialPointsBalance = 0, initialLifetimeSpentKop = 0, currentInvoiceAmountKop = 0, onRedeemSuccess,
	} = props;

	const isDemo = isDemoShowcaseMode();
	const [activeTab, setActiveTab] = useState<"balance" | "family" | "certificates" | "referrals" | "history">("balance");
	const [pointsBalance, setPointsBalance] = useState<number>(initialPointsBalance), [lifetimeSpentKop, setLifetimeSpentKop] = useState<number>(initialLifetimeSpentKop);
	const [nearestExpiringPoints, setNearestExpiringPoints] = useState<number>(0), [nearestExpirationDate, setNearestExpirationDate] = useState<string | null>(null), [daysUntilExpiration, setDaysUntilExpiration] = useState<number | null>(null), [lifetimeExpiredPoints, setLifetimeExpiredPoints] = useState<number>(0);
	const [requestedPointsRub, setRequestedPointsRub] = useState<number>(500), [isDoctorOverride, setIsDoctorOverride] = useState<boolean>(false), [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
	const [familyMembers, setFamilyMembers] = useState<readonly FamilyMember[]>(() => isDemo ? DEFAULT_FAMILY_MEMBERS : []), [familyName, setFamilyName] = useState<string>(() => isDemo ? "Семья Ивановых" : ""), [hasFamilyGroup, setHasFamilyGroup] = useState<boolean>(() => isDemo);
	const [isCreateFamilyOpen, setIsCreateFamilyOpen] = useState<boolean>(false), [newFamilyGroupName, setNewFamilyGroupName] = useState<string>(""), [relativePatientIdInput, setRelativePatientIdInput] = useState<string>(""), [relativeRoleInput, setRelativeRoleInput] = useState<string>("Супруг / Супруга");
	const [certSerial, setCertSerial] = useState<string>(""), [certFeedback, setCertFeedback] = useState<string | null>(null), [verifiedCertificate, setVerifiedCertificate] = useState<{ id: string; serialNumber: string; nominalRub: number; currentBalanceRub: number; currentBalanceKop: number; status: string } | null>(null), [refFriendName, setRefFriendName] = useState<string>(""), [refFriendPhone, setRefFriendPhone] = useState<string>("");
	const [accrueInputRub, setAccrueInputRub] = useState<string>(""), [isAccrueOpen, setIsAccrueOpen] = useState<boolean>(false), [ledger, setLedger] = useState<readonly LoyaltyLedgerEntry[]>([]);

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

	if (!isOpen) return null;
	if (!patientId) {
		return (
			<div className="loyalty-modal-overlay" onClick={onClose}>
				<div data-testid="loyalty-studio-modal" className="loyalty-modal-container" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="loyalty-title">
					<div className="loyalty-modal-drag-handle" />
					<div className="loyalty-modal-header">
						<div className="loyalty-modal-title-wrap"><div className="loyalty-modal-icon"><Award size={20} /></div><div><h2 id="loyalty-title" className="loyalty-modal-title">Программа лояльности и скидок</h2><p className="loyalty-modal-subtitle">{clinicName} • Карточка не выбрана</p></div></div>
						<button type="button" className="loyalty-close-btn" onClick={onClose} aria-label="Закрыть"><X size={18} /></button>
					</div>
					<div className="loyalty-modal-body" style={{ alignItems: "center", justifyContent: "center", padding: "4rem 1.5rem" }}>
						<div className="loyalty-family-empty-state">
							<div className="loyalty-empty-icon-wrap"><Users size={32} /></div><div className="loyalty-empty-text-wrap"><h3 className="loyalty-empty-title">Пациент не выбран</h3><p className="loyalty-toggle-desc" style={{ maxWidth: "480px", textAlign: "center" }}>Для просмотра баланса бонусов и семейного счета выберите пациента в расписании или картотеке.</p></div>
							<button type="button" className="loyalty-secondary-btn" onClick={onClose}>Закрыть окно</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// 3. Handlers with Doctor Autonomy (Мандат 8e: zero disabled buttons)
	const handleApplyPoints = async () => {
		if (redemption.actualRedeemedPointsRub <= 0) {
			if (currentInvoiceAmountKop <= 0) showToast("Сумма счета не указана. Введите чек к оплате", "info");
			else if (activeEffectiveBalanceRub <= 0 && !isDoctorOverride) showToast("На балансе нет бонусов. Включите гарантию врача для 100% покрытия", "info");
			else showToast("Укажите сумму бонусов для списания", "warning");
			return;
		}

		const prevPointsBalance = pointsBalance, prevLedger = ledger;

		if (hasFamilyGroup && selectedFamilyMemberId) {
			const member = familyMembers.find((m) => m.patientId === selectedFamilyMemberId);
			const famResult = debitFamilySharedBalance({
				familyGroupId: familyPool.familyGroupId, familyName: familyPool.familyName, sponsorPatientId: patientId, sponsorFullName: patientName,
				targetPatientId: member?.patientId ?? patientId, targetPatientName: member?.fullName ?? patientName, targetRoleRu: member?.roleRu ?? "Член семьи",
				invoiceAmountKop: currentInvoiceAmountKop, availableFamilyPointsRub: familyPool.totalPooledPoints, requestedPointsRub: redemption.actualRedeemedPointsRub, allowFullCoverage: isDoctorOverride,
			});
			setPointsBalance(famResult.remainingFamilyBalanceRub); setLedger((prev) => [famResult.ledgerEntry, ...prev]);
			try {
				const res = await postLoyaltyJson("/api/loyalty/family/debit", { sponsorPatientId: patientId, targetPatientId: member?.patientId ?? patientId, pointsToDebit: famResult.debitedPointsRub, description: `Списание из семейного кошелька за ${member?.fullName ?? patientName}` });
				if (!res.ok) { const errJson = await res.json().catch(() => ({})); showToast(errJson.message || "Ошибка списания баллов с семейного счета", "error"); setPointsBalance(prevPointsBalance); setLedger(prevLedger); return; }
				showToast(famResult.messageRu, "success");
				if (onRedeemSuccess) onRedeemSuccess(famResult.debitedPointsRub, famResult.fiscal54FzSplit);
			} catch (err) { console.error("[LoyaltyStudioModal] Family debit failed:", err); showToast("Сетевой сбой при списании семейных баллов", "error"); setPointsBalance(prevPointsBalance); setLedger(prevLedger); }
		} else {
			const newBal = pointsBalance - redemption.actualRedeemedPointsRub;
			setPointsBalance(newBal);
			const entry: LoyaltyLedgerEntry = {
				id: `tx-${Date.now().toString().slice(-4)}`, timestampIso: new Date().toLocaleString("ru-RU"), patientId, patientName, medicalCardNumber,
				operationType: "redemption", operationTypeRu: isDoctorOverride ? "Списание (Гарантия врача 100%)" : `Оплата бонусами (${progression.currentTier.nameRu})`,
				invoiceAmountKop: currentInvoiceAmountKop, pointsDeltaRub: -redemption.actualRedeemedPointsRub, balanceAfterRub: newBal,
				paymentMethodRu: "Бонусы + Касса", staffNameRu: "Администратор / Касса", noteRu: `Списание ${redemption.actualRedeemedPointsRub} ₽ бонусов по счету`,
			};
			setLedger((prev) => [entry, ...prev]);
			try {
				const invoiceRub = currentInvoiceAmountKop > 0 ? Math.round(currentInvoiceAmountKop) / 100 : redemption.actualRedeemedPointsRub;
				const amountKop = currentInvoiceAmountKop > 0 ? currentInvoiceAmountKop : Math.round(redemption.actualRedeemedPointsRub * 100);
				const res = await postLoyaltyJson("/api/loyalty/redeem", {patientId, amountKopecks: amountKop, invoiceAmountKopecks: amountKop, invoiceAmountRub: invoiceRub, pointsToRedeem: redemption.actualRedeemedPointsRub, allowFullCoverage: isDoctorOverride});
				if (!res.ok) { const errJson = await res.json().catch(() => ({})); showToast(errJson.message || "Не удалось списать бонусы в базе данных", "error"); setPointsBalance(prevPointsBalance); setLedger(prevLedger); return; }
				const data = await res.json().catch(() => ({}));
				if (typeof data.activePoints === "number") setPointsBalance(data.activePoints);
				showToast(`Успешно списано ${redemption.actualRedeemedPointsRub} бонусов. К оплате: ${formatKopecksToRubles(redemption.remainingPayableKop)}`, "success");
				if (onRedeemSuccess) onRedeemSuccess(redemption.actualRedeemedPointsRub, redemption.fiscal54FzSplit);
			} catch (err) { console.error("[LoyaltyStudioModal] Redeem call failed:", err); showToast("Сетевой сбой при списании бонусов. Проверьте соединение", "error"); setPointsBalance(prevPointsBalance); setLedger(prevLedger); }
		}
	};

	const handleAccruePoints = async () => {
		const amount = Math.max(0, Number(accrueInputRub) || 500);
		if (amount <= 0) { showToast("Укажите сумму бонусов для начисления", "warning"); return; }
		const prevPointsBalance = pointsBalance, prevLedger = ledger, newBal = pointsBalance + amount;
		setPointsBalance(newBal);
		setLedger((prev) => [{ id: `acc-${Date.now().toString().slice(-4)}`, timestampIso: new Date().toLocaleString("ru-RU"), patientId, patientName, medicalCardNumber, operationType: "accrual", operationTypeRu: "Начисление бонусов", invoiceAmountKop: 0, pointsDeltaRub: amount, balanceAfterRub: newBal, paymentMethodRu: "Программа лояльности", staffNameRu: "Администратор / Врач", noteRu: `Начислено ${amount} бонусов пациенту ${patientName}` }, ...prev]);
		try {
			const res = await postLoyaltyJson("/api/loyalty/accrue", {patientId, amountPoints: amount, description: "Ручное начисление бонусов"});
			if (!res.ok) { const errJson = await res.json().catch(() => ({})); showToast(errJson.message || "Ошибка начисления бонусов", "error"); setPointsBalance(prevPointsBalance); setLedger(prevLedger); return; }
			const data = await res.json().catch(() => ({}));
			const actualBal = typeof data.activePoints === "number" ? data.activePoints : newBal;
			if (typeof data.activePoints === "number") setPointsBalance(data.activePoints);
			showToast(`Начислено ${amount} бонусов! Новый баланс: ${actualBal} ₽`, "success");
			setAccrueInputRub(""); setIsAccrueOpen(false);
		} catch (err) { console.error("[LoyaltyStudioModal] Accrue call failed:", err); showToast("Сетевой сбой при начислении бонусов", "error"); setPointsBalance(prevPointsBalance); setLedger(prevLedger); }
	};

	const handleCreateFamilyGroup = async () => {
		const gName = newFamilyGroupName.trim() || `Семья ${patientName.split(" ")[0] || "Пациента"}`;
		try {
			const res = await postLoyaltyJson("/api/finance/family", { name: gName, headPatientId: patientId });
			if (!res.ok) { const errJson = await res.json().catch(() => ({})); showToast(errJson.message || "Не удалось создать семейную группу", "warning"); return; }
			setFamilyName(gName); setHasFamilyGroup(true);
			setFamilyMembers([{ patientId, fullName: `${patientName} (Глава)`, roleRu: "Глава семьи", individualPointsBalance: pointsBalance, lifetimeSpentKop, isBonusSpendingAllowed: true }]);
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

	const handleVerifyCertificate = async () => {
		const serial = certSerial.trim();
		if (!serial) { showToast("Введите номер подарочного сертификата", "warning"); return; }
		if (!validateGiftCertificateSerial(serial)) { setCertFeedback("Номер сертификата недействителен (ошибка контрольной суммы)"); showToast("Ошибка контрольной суммы сертификата", "warning"); return; }
		try {
			const res = await postLoyaltyJson("/api/loyalty/certificates/validate", { serialNumber: serial });
			if (res.ok) {
				const certData = await res.json();
				if (certData.certificate) {
					const cert = certData.certificate;
					if (cert.status === "depleted") { setCertFeedback("Баланс сертификата полностью исчерпан"); showToast("Баланс сертификата исчерпан", "warning"); setVerifiedCertificate(null); return; }
					if (cert.status === "cancelled") { setCertFeedback("Сертификат аннулирован администрацией клиники"); showToast("Сертификат аннулирован", "warning"); setVerifiedCertificate(null); return; }
					if (cert.status === "expired") { setCertFeedback("Срок действия сертификата истек"); showToast("Срок действия сертификата истек", "warning"); setVerifiedCertificate(null); return; }
					const redeemRes = redeemGiftCertificate(cert, currentInvoiceAmountKop);
					const coveredMsg = redeemRes.coveredInvoiceAmountKop > 0 ? `, к зачёту: ${formatKopecksToRubles(redeemRes.coveredInvoiceAmountKop)}` : "";
					setCertFeedback(`Сертификат подтвержден! Номинал: ${formatKopecksToRubles(cert.nominalKop || cert.nominalRub * 100)}, баланс: ${formatKopecksToRubles(cert.currentBalanceKop || cert.currentBalanceRub * 100)}${coveredMsg}`);
					setVerifiedCertificate({
						id: cert.id,
						serialNumber: cert.serialNumber,
						nominalRub: Number(cert.nominalRub || 0),
						currentBalanceRub: Number(cert.currentBalanceRub || 0),
						currentBalanceKop: Number(cert.currentBalanceKop || cert.currentBalanceRub * 100),
						status: cert.status,
					});
					showToast("Сертификат подтвержден через базу клиники", "success"); return;
				}
			}
			const err = await res.json().catch(() => ({}));
			const msg = err.message || "Сертификат не найден в базе клиники или аннулирован";
			setCertFeedback(msg); setVerifiedCertificate(null); showToast(msg, "warning");
		} catch { setCertFeedback("Сертификат не найден в базе клиники или аннулирован"); setVerifiedCertificate(null); showToast("Сертификат не найден в базе клиники или аннулирован", "warning"); }
	};

	const handleRedeemCertificate = async () => {
		if (!verifiedCertificate) return;
		try {
			const invoiceRub = currentInvoiceAmountKop > 0 ? currentInvoiceAmountKop / 100 : verifiedCertificate.currentBalanceRub;
			const amountToRedeemRub = Math.min(verifiedCertificate.currentBalanceRub, invoiceRub);
			const res = await postLoyaltyJson("/api/loyalty/certificates/redeem", {
				serialNumber: verifiedCertificate.serialNumber,
				invoiceAmountRub: invoiceRub,
				amountToRedeemRub,
				patientId,
				description: `Погашение сертификата ${verifiedCertificate.serialNumber} в Студии лояльности`,
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Не удалось списать сертификат", "warning");
				return;
			}
			const data = await res.json();
			showToast(`Сертификат успешно зачтён на сумму ${data.redeemedAmountRub} ₽! (Чек 54-ФЗ тег 1215)`, "success");
			setCertFeedback(`Зачтено ${data.redeemedAmountRub} ₽. Новый остаток: ${data.newBalanceRub} ₽`);
			setVerifiedCertificate(null);
			setCertSerial("");
			setLedger((prev) => [
				{
					id: `redeem-cert-${Date.now().toString().slice(-4)}`,
					timestampIso: new Date().toLocaleString("ru-RU"),
					patientId,
					patientName,
					medicalCardNumber,
					operationType: "redemption",
					operationTypeRu: "Зачёт сертификата",
					invoiceAmountKop: Math.round(data.redeemedAmountRub * 100),
					pointsDeltaRub: 0,
					balanceAfterRub: pointsBalance,
					paymentMethodRu: "Сертификат (аванс 1215)",
					fiscalReceiptNumber: `CERT-${Date.now().toString().slice(-6)}`,
					staffNameRu: "Администратор",
					noteRu: `Погашение сертификата ${verifiedCertificate.serialNumber} на ${data.redeemedAmountRub} ₽`,
				},
				...prev,
			]);
			if (onRedeemSuccess) {
				const certKop = Math.round((Number(data.redeemedAmountRub) || 0) * 100);
				onRedeemSuccess(0, {
					tag1031CashKop: 0,
					tag1081ElectronicCardKop: Math.max(0, currentInvoiceAmountKop - certKop),
					tag1215AdvancePrepaymentBonusKop: certKop,
					tag1043DiscountKop: 0,
					totalGrossKop: currentInvoiceAmountKop || certKop,
					totalNetPayableKop: Math.max(0, currentInvoiceAmountKop - certKop),
				});
			}
		} catch (err) {
			console.error("[LoyaltyStudioModal] Redeem certificate call failed:", err);
			showToast("Ошибка сети при списании сертификата", "error");
		}
	};

	const handleIssueCertificate = async (nominalRub: number, title: string) => {
		try {
			const res = await postLoyaltyJson("/api/loyalty/certificates/issue", { purchaserPatientId: patientId, purchaserName: patientName, nominalRub, expiresInDays: 365, notes: `Продажа сертификата «${title}» для ${patientName}` });
			if (!res.ok) { const errJson = await res.json().catch(() => ({})); showToast(errJson.message || "Не удалось оформить сертификат", "warning"); return; }
			const data = await res.json().catch(() => ({})), serial = data.certificate?.serialNumber || "—";
			setCertSerial(serial); setCertFeedback(`Оформлен сертификат ${serial} на сумму ${nominalRub.toLocaleString("ru-RU")} ₽`);
			showToast(`Сертификат на ${nominalRub.toLocaleString("ru-RU")} ₽ успешно оформлен! Номер: ${serial}`, "success");
			setLedger((prev) => [{ id: `cert-${Date.now().toString().slice(-4)}`, timestampIso: new Date().toLocaleString("ru-RU"), patientId, patientName, medicalCardNumber, operationType: "accrual", operationTypeRu: "Продажа сертификата", invoiceAmountKop: nominalRub * 100, pointsDeltaRub: 0, balanceAfterRub: pointsBalance, paymentMethodRu: "Касса клиники", staffNameRu: "Администратор", noteRu: `Оформлен сертификат ${serial} (${nominalRub.toLocaleString("ru-RU")} ₽)` }, ...prev]);
		} catch (err) { console.error("[LoyaltyStudioModal] Issue certificate call failed:", err); showToast("Ошибка сети при оформлении сертификата", "error"); }
	};

	const handleCopyReferralLink = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) { navigator.clipboard.writeText(patientReferralLink).catch(() => {}); }
		showToast("Реферальная ссылка скопирована в буфер обмена", "success");
	};

	const handleSendReferralInvite = async () => {
		if (!refFriendName) { showToast("Укажите имя приглашенного друга", "warning"); return; }
		const prevBalance = pointsBalance, prevLedger = ledger;
		const entry: LoyaltyLedgerEntry = {
			id: `ref-${Date.now().toString().slice(-4)}`, timestampIso: new Date().toLocaleString("ru-RU"), patientId, patientName, medicalCardNumber,
			operationType: "referral_bonus", operationTypeRu: "Реферальный сертификат", invoiceAmountKop: 0, pointsDeltaRub: 1000, balanceAfterRub: pointsBalance + 1000,
			paymentMethodRu: "Акция «Приведи друга»", staffNameRu: "Администратор", noteRu: `Приглашение друга: ${refFriendName} (${refFriendPhone || "телефон не указан"})`,
		};
		setLedger((prev) => [entry, ...prev]); setPointsBalance((b) => b + 1000);
		try {
			const res = await postLoyaltyJson("/api/loyalty/accrue", { patientId, amountPoints: 1000, description: `Реферальный бонус: ${refFriendName}` });
			if (!res.ok) {
				const errJson = await res.json().catch(() => ({}));
				showToast(errJson.message || "Ошибка начисления реферального бонуса", "error");
				setPointsBalance(prevBalance); setLedger(prevLedger); return;
			}
			showToast("Реферальное приглашение создано. Начислено 1 000 бонусов!", "success");
			setRefFriendName(""); setRefFriendPhone("");
		} catch (err) {
			console.error("[LoyaltyStudioModal] Referral accrue call failed:", err);
			showToast("Сетевой сбой при начислении реферального бонуса", "error");
			setPointsBalance(prevBalance); setLedger(prevLedger);
		}
	};

	const handleDownloadCsv = () => {
		const blob = new Blob([exportLoyaltyLedgerToCsv(ledger)], { type: "text/csv;charset=utf-8;" }), url = URL.createObjectURL(blob), link = document.createElement("a");
		link.href = url; link.setAttribute("download", `loyalty-ledger-${patientId}.csv`);
		document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
		showToast("Выгрузка реестра операций сформирована", "info");
	};

	return (
		<div className="loyalty-modal-overlay" onClick={onClose}>
			<div data-testid="loyalty-studio-modal" className="loyalty-modal-container" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="loyalty-title">
				<div className="loyalty-modal-drag-handle" />
				<div className="loyalty-modal-header">
					<div className="loyalty-modal-title-wrap"><div className="loyalty-modal-icon"><Award size={20} /></div><div><h2 id="loyalty-title" className="loyalty-modal-title">Программа лояльности и скидок</h2><p className="loyalty-modal-subtitle">{clinicName} • {patientName} • Медкарта {medicalCardNumber}</p></div></div>
					<button type="button" className="loyalty-close-btn" onClick={onClose} aria-label="Закрыть"><X size={18} /></button>
				</div>
				<div className="loyalty-tabs-nav">
					<button type="button" className={`loyalty-tab-btn ${activeTab === "balance" ? "active" : ""}`} onClick={() => setActiveTab("balance")}><Sparkles size={16} />Баланс и бонусы</button>
					<button type="button" className={`loyalty-tab-btn ${activeTab === "family" ? "active" : ""}`} onClick={() => setActiveTab("family")}><Users size={16} />Семейный счет</button>
					<button type="button" className={`loyalty-tab-btn ${activeTab === "certificates" ? "active" : ""}`} onClick={() => setActiveTab("certificates")}><Gift size={16} />Сертификаты</button>
					<button type="button" className={`loyalty-tab-btn ${activeTab === "referrals" ? "active" : ""}`} onClick={() => setActiveTab("referrals")}><Award size={16} />Приведи друга</button>
					<button type="button" className={`loyalty-tab-btn ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}><FileText size={16} />История операций</button>
				</div>

				<div className="loyalty-modal-body">
					{activeTab === "balance" && (
						<div className="loyalty-grid-2">
							<div className="loyalty-card">
								<div className="loyalty-card-title"><span>Текущий баланс и статус</span><span className="loyalty-tier-badge" style={{ color: progression.currentTier.accentColor }}>{progression.currentTier.badgeLabelRu}</span></div>
								<div className="loyalty-hero-balance"><span className="loyalty-hero-points">{pointsBalance.toLocaleString("ru-RU")}</span><span className="loyalty-hero-unit">бонусов (1 балл = 1 ₽)</span></div>
								{nearestExpiringPoints > 0 && daysUntilExpiration !== null && (<div className="loyalty-expiring-badge"><span className="loyalty-expiring-dot" /><span>Сгорит {nearestExpiringPoints} бонусов через {daysUntilExpiration} дн. ({new Date(nearestExpirationDate || "").toLocaleDateString("ru-RU")})</span></div>)}
								{lifetimeExpiredPoints > 0 && (<div className="loyalty-expired-stat">Сгорело по сроку за всё время: {lifetimeExpiredPoints.toLocaleString("ru-RU")} бонусов</div>)}
								<p className="loyalty-toggle-desc">{progression.currentTier.descriptionRu}</p>
								<div style={{ display: "flex", gap: "0.5rem" }}><button type="button" className="loyalty-secondary-btn" onClick={() => setIsAccrueOpen(!isAccrueOpen)}><Plus size={16} /> Начислить бонусы</button></div>
								{isAccrueOpen && (
									<div className="loyalty-input-row" style={{ marginTop: "0.25rem" }}>
										<input type="number" className="loyalty-input" value={accrueInputRub} onChange={(e) => setAccrueInputRub(e.target.value)} placeholder="Сумма баллов (напр. 500)" /><button type="button" className="loyalty-secondary-btn" onClick={handleAccruePoints}>Начислить</button>
									</div>
								)}
								{progression.nextTier && (
									<div><div className="loyalty-fiscal-row" style={{ marginBottom: "0.25rem" }}><span>До уровня {progression.nextTier.nameRu}</span><span>{formatKopecksToRubles(progression.remainingToNextTierKop)}</span></div><div className="loyalty-progress-track"><div className="loyalty-progress-bar" style={{ width: `${progression.progressPercent}%` }} /></div></div>
								)}
								<div className="loyalty-toggle-row">
									<div className="loyalty-toggle-label"><span className="loyalty-toggle-title">Врачебная гарантия / скидка 100%</span><span className="loyalty-toggle-desc">Автономия врача: списание бонусов до 100% счета без блокировок</span></div>
									<input type="checkbox" checked={isDoctorOverride} onChange={(e) => setIsDoctorOverride(e.target.checked)} style={{ width: "20px", height: "20px", cursor: "pointer" }} />
								</div>
							</div>
							<div className="loyalty-card">
								<div className="loyalty-card-title"><span>Оплата бонусами на кассе</span><span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Счет: {formatKopecksToRubles(currentInvoiceAmountKop)}</span></div>
								<div className="loyalty-quick-row">{QUICK_REDEMPTION_PRESETS_RUB.map((amt) => (<button key={amt} type="button" className="loyalty-quick-btn" onClick={() => setRequestedPointsRub(amt)}>{amt} ₽</button>))}<button type="button" className="loyalty-quick-btn" onClick={() => setRequestedPointsRub(redemption.maxAllowedRedemptionRub)}>Максимум</button></div>
								<div className="loyalty-input-row"><input type="number" className="loyalty-input" value={requestedPointsRub || ""} onChange={(e) => setRequestedPointsRub(Math.max(0, Number(e.target.value)))} placeholder="Сумма баллов" /><span style={{ fontWeight: 600, color: "var(--muted)" }}>из {activeEffectiveBalanceRub} ₽</span></div>
								<div className="loyalty-fiscal-box">
									<div className="loyalty-fiscal-row"><span>Счет до скидки:</span><span>{formatKopecksToRubles(currentInvoiceAmountKop)}</span></div>
									<div className="loyalty-fiscal-row"><span>Оплата бонусами (Чек кассы):</span><span style={{ color: "var(--teal)", fontWeight: 700 }}>-{redemption.actualRedeemedPointsRub.toLocaleString("ru-RU")} ₽</span></div>
									<div className="loyalty-fiscal-row total"><span>К оплате картой / наличными:</span><span>{formatKopecksToRubles(redemption.remainingPayableKop)}</span></div>
								</div>
								<button type="button" data-testid="loyalty-execute-redemption-btn" className="loyalty-primary-cta" onClick={handleApplyPoints}><Check size={18} /> Применить бонусы к оплате</button>
							</div>
						</div>
					)}

					{activeTab === "family" && (
						<div className="loyalty-card">
							{hasFamilyGroup && familyMembers.length > 0 ? (
								<>
									<div className="loyalty-card-title"><span>Семейный баланс: «{familyPool.familyName}»</span><span className="loyalty-hero-points" style={{ fontSize: "1.5rem" }}>{familyPool.totalPooledPoints.toLocaleString("ru-RU")} бонусов</span></div>
									<p className="loyalty-toggle-desc">Единый кошелек семьи позволяет оплачивать лечение любого родственника без комиссии.</p>
									<div className="loyalty-family-list">
										{familyPool.members.map((m) => (
											<div key={m.patientId} className={`loyalty-family-item ${selectedFamilyMemberId === m.patientId ? "selected" : ""}`} onClick={() => setSelectedFamilyMemberId(selectedFamilyMemberId === m.patientId ? null : m.patientId)}><div><div style={{ fontWeight: 600, color: "var(--ink)" }}>{m.fullName}</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{m.roleRu} • Баланс: {m.individualPointsBalance} ₽</div></div><button type="button" className="loyalty-secondary-btn" style={{ height: "36px", fontSize: "0.75rem" }}>{selectedFamilyMemberId === m.patientId ? "Выбран для списания" : "Выбрать для списания"}</button></div>
										))}
									</div>
									<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}><button type="button" className="loyalty-secondary-btn" onClick={() => setIsCreateFamilyOpen(!isCreateFamilyOpen)}><Plus size={16} /> Привязать родственника</button></div>
									{isCreateFamilyOpen && (
										<div className="loyalty-create-family-form">
											<div className="loyalty-card-title"><span>Привязка родственника</span></div>
											<div className="loyalty-input-row"><input type="text" className="loyalty-input" value={relativePatientIdInput} onChange={(e) => setRelativePatientIdInput(e.target.value)} placeholder="ID или телефон родственника" /><select className="loyalty-input" style={{ maxWidth: "180px" }} value={relativeRoleInput} onChange={(e) => setRelativeRoleInput(e.target.value)}><option value="Супруг / Супруга">Супруг / Супруга</option><option value="Ребенок">Ребенок</option><option value="Родитель">Родитель</option><option value="Член семьи">Член семьи</option></select><button type="button" className="loyalty-secondary-btn" onClick={handleLinkRelative}>Привязать</button></div>
										</div>
									)}
								</>
							) : (
								<div className="loyalty-family-empty-state">
									<div className="loyalty-empty-icon-wrap"><Users size={32} /></div><div className="loyalty-empty-text-wrap"><h3 className="loyalty-empty-title">Пациент не состоит в семейной группе</h3><p className="loyalty-toggle-desc" style={{ maxWidth: "480px", textAlign: "center" }}>Объедините родственников в общий семейный счет, чтобы оплачивать лечение близких с единого накопительного баланса с повышенным кэшбэком 7%.</p></div>
									{!isCreateFamilyOpen ? (
										<button type="button" className="loyalty-secondary-btn" onClick={() => setIsCreateFamilyOpen(true)}><Plus size={16} /> Создать семейный счет / Привязать родственника</button>
									) : (
										<div className="loyalty-create-family-form">
											<div className="loyalty-card-title"><span>Создание семейного счета</span></div>
											<div className="loyalty-input-row"><input type="text" className="loyalty-input" value={newFamilyGroupName} onChange={(e) => setNewFamilyGroupName(e.target.value)} placeholder={`Например: Семья ${patientName.split(" ")[0] || "Пациента"}`} /><button type="button" className="loyalty-secondary-btn" onClick={handleCreateFamilyGroup}>Создать группу</button></div>
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{activeTab === "certificates" && (
						<div className="loyalty-grid-2">
							<div className="loyalty-card">
								<div className="loyalty-card-title"><span>Активация подарочного сертификата</span></div>
								<div className="loyalty-input-row"><input type="text" className="loyalty-input" value={certSerial} onChange={(e) => setCertSerial(e.target.value)} placeholder="7701-XXXX-XXXX-XXXX" /><button type="button" className="loyalty-secondary-btn" onClick={handleVerifyCertificate}>Проверить</button></div>
								{certFeedback && <div style={{ fontSize: "0.8125rem", color: "var(--teal)", fontWeight: 600 }}>{certFeedback}</div>}
								{verifiedCertificate && verifiedCertificate.currentBalanceRub > 0 && (
									<div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--line)" }}>
										<button
											type="button"
											className="loyalty-primary-btn"
											style={{ width: "100%", justifyContent: "center" }}
											onClick={handleRedeemCertificate}
										>
											Зачесть сертификат в счёт ({formatKopecksToRubles(currentInvoiceAmountKop > 0 ? Math.min(verifiedCertificate.currentBalanceKop, currentInvoiceAmountKop) : verifiedCertificate.currentBalanceKop)})
										</button>
										<div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", marginTop: "0.25rem" }}>
											Фискализация по 54-ФЗ (тег 1215: зачёт аванса)
										</div>
									</div>
								)}
							</div>
							<div className="loyalty-card">
								<div className="loyalty-card-title"><span>Номиналы сертификатов в клинике</span></div>
								<p className="loyalty-toggle-desc" style={{ margin: "0 0 0.5rem 0" }}>Оформление продажи сертификата через кассу клиники или прямой API-выпуск.</p>
								<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
									{GIFT_CERTIFICATE_CATALOG.filter((c) => !c.isCustomNominal).slice(0, 4).map((c) => (
										<div key={c.id} className="loyalty-fiscal-row" style={{ padding: "0.5rem 0.75rem", background: "var(--paper)", borderRadius: "8px", border: "1px solid var(--line)", alignItems: "center", justifyContent: "space-between" }}>
											<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.875rem" }}>{c.titleRu}</span><span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{c.descriptionRu}</span></div>
											<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}><span style={{ color: "var(--teal)", fontWeight: 700 }}>{formatKopecksToRubles(c.nominalKop)}</span><button type="button" className="loyalty-secondary-btn" style={{ height: "32px", fontSize: "0.75rem", whiteSpace: "nowrap" }} onClick={() => handleIssueCertificate(c.nominalRub, c.titleRu)}>Оформить</button></div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{activeTab === "referrals" && (
						<div className="loyalty-grid-2">
							<div className="loyalty-card">
								<div className="loyalty-card-title"><span>{REFERRAL_HYGIENE_1000_PRESET.titleRu}</span></div>
								<p className="loyalty-toggle-desc">{REFERRAL_HYGIENE_1000_PRESET.descriptionRu}</p>
								<div className="loyalty-referral-link-box" style={{ marginTop: "0.5rem" }}>
									<span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)" }}>Персональная реферальная ссылка:</span>
									<div className="loyalty-input-row"><input type="text" readOnly className="loyalty-input" value={patientReferralLink} style={{ fontSize: "0.8125rem" }} /><button type="button" className="loyalty-secondary-btn" onClick={handleCopyReferralLink} title="Копировать"><Copy size={16} /></button></div>
								</div>
								<div className="loyalty-qr-card"><div className="loyalty-qr-badge"><QrCode size={36} color="var(--teal)" /></div><div><div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>QR-код рекомендации</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Пациент может отсканировать код прямо с экрана смартфона</div></div></div>
							</div>
							<div className="loyalty-card">
								<div className="loyalty-card-title"><span>Пригласить друга по SMS / WhatsApp</span></div>
								<p className="loyalty-toggle-desc">Подарите другу 1 000 бонусов на комплексную чистку зубов. При первом визите вы получите 1 000 бонусов.</p>
								<div className="loyalty-input-row" style={{ marginTop: "0.5rem" }}><input type="text" className="loyalty-input" value={refFriendName} onChange={(e) => setRefFriendName(e.target.value)} placeholder="Имя друга" /><input type="tel" className="loyalty-input" value={refFriendPhone} onChange={(e) => setRefFriendPhone(e.target.value)} placeholder="+7 (999) 000-00-00" /><button type="button" className="loyalty-secondary-btn" onClick={handleSendReferralInvite}>Подарить</button></div>
							</div>
						</div>
					)}

					{activeTab === "history" && (
						<div className="loyalty-card">
							<div className="loyalty-card-title"><span>Реестр начислений и списаний</span><button type="button" className="loyalty-secondary-btn" style={{ height: "36px" }} onClick={handleDownloadCsv}><Download size={14} />Выгрузить CSV</button></div>
							<div style={{ overflowX: "auto" }}>
								<table className="loyalty-table">
									<thead><tr><th>Дата</th><th>Операция</th><th>Сумма чека</th><th>Баллы</th><th>Баланс</th><th>Примечание</th></tr></thead>
									<tbody>
										{ledger.length === 0 ? (
											<tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>Нет зарегистрированных операций в текущей сессии</td></tr>
										) : (
											ledger.map((tx) => (
												<tr key={tx.id}>
													<td>{tx.timestampIso}</td><td>{tx.operationTypeRu}</td><td>{formatKopecksToRubles(tx.invoiceAmountKop)}</td>
													<td style={{ fontWeight: 700, color: tx.operationType === "expired" ? "var(--danger)" : tx.pointsDeltaRub >= 0 ? "var(--ok-fg)" : "var(--warn-fg)" }}>{tx.pointsDeltaRub >= 0 ? `+${tx.pointsDeltaRub}` : tx.pointsDeltaRub}</td>
													<td>{tx.balanceAfterRub.toLocaleString("ru-RU")} ₽</td><td>{tx.noteRu}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default LoyaltyStudioModal;


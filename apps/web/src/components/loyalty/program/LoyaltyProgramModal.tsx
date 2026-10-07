import React, { useState, useMemo, useEffect } from "react";
import {
	Award,
	Coins,
	Gift,
	Sparkles,
	Tag,
	Users,
	X,
} from "lucide-react";
import {
	calculateFamilyPoolBalance,
	calculateLoyaltyRedemption,
	calculateTierProgression,
	creditReferralBonus,
	debitFamilySharedBalance,
	exportLoyaltyLedgerToCsv,
	type Fiscal54FzSplitResult,
	type LoyaltyLedgerEntry,
	type LoyaltyRedemptionResult,
	type PatientReferralRecord,
} from "./loyaltyEngine";
import {
	REFERRAL_HYGIENE_1000_PRESET,
	type ReferralRewardPreset,
} from "./loyaltyPresets";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { LoyaltyBalanceTab } from "./LoyaltyBalanceTab";
import { LoyaltyFamilyTab } from "./LoyaltyFamilyTab";
import { LoyaltyReferralsTab } from "./LoyaltyReferralsTab";
import { LoyaltyCertificatesTab } from "./LoyaltyCertificatesTab";
import { LoyaltyPromosTab } from "./LoyaltyPromosTab";
import { LoyaltyLedgerTab } from "./LoyaltyLedgerTab";
import { useLoyaltyCertificates } from "./useLoyaltyCertificates";
import { useLoyaltyPromos } from "./useLoyaltyPromos";
import { useLoyaltyFamily } from "./useLoyaltyFamily";
import "./loyaltyProgram.css";

export interface LoyaltyProgramModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly initialPointsBalance?: number | undefined;
	readonly initialLifetimeSpentKop?: number | undefined;
	readonly currentInvoiceAmountKop?: number | undefined;
	readonly onRedeemSuccess?: (
		redeemedPointsRub: number,
		fiscalSplit: Fiscal54FzSplitResult
	) => void;
}

type TabType = "balance" | "family" | "referrals" | "certificates" | "promos" | "ledger";

const EMPTY_LEDGER: readonly LoyaltyLedgerEntry[] = [];

export const LoyaltyProgramModal: React.FC<LoyaltyProgramModalProps> = ({
	isOpen,
	onClose,
	clinicName = "ООО «Денте Стоматология»",
	patientId = "",
	patientName = "Пациент",
	medicalCardNumber = "",
	initialPointsBalance = 0,
	initialLifetimeSpentKop = 0,
	currentInvoiceAmountKop = 0,
	onRedeemSuccess,
}) => {
	const [activeTab, setActiveTab] = useState<TabType>("balance");

	// Cashier Calculator State
	const [invoiceAmountRub, setInvoiceAmountRub] = useState<number>(
		currentInvoiceAmountKop / 100
	);
	const [excludedAmountRub, setExcludedAmountRub] = useState<number>(0);
	const [requestedPointsRub, setRequestedPointsRub] = useState<number>(0);
	const [activePointsBalance, setActivePointsBalance] = useState<number>(initialPointsBalance);
	const [redemptionSuccessMsg, setRedemptionSuccessMsg] = useState<string | null>(null);

	// Doctor Autonomy / Warranty override state (Mandates 8e, 8s)
	const [isDoctorOverride, setIsDoctorOverride] = useState<boolean>(false);

	// Ledger State
	const [ledgerEntries, setLedgerEntries] = useState<readonly LoyaltyLedgerEntry[]>(EMPTY_LEDGER);
	const [ledgerSearch, setLedgerSearch] = useState<string>("");

	// Referral Program State ("Привёл друга / семью" - Mandates 8i, 8s, 8b)
	const [referrals, setReferrals] = useState<readonly PatientReferralRecord[]>([]);
	const [selectedReferralPreset, setSelectedReferralPreset] = useState<ReferralRewardPreset>(
		REFERRAL_HYGIENE_1000_PRESET
	);
	const [newReferralName, setNewReferralName] = useState<string>("");
	const [newReferralPhone, setNewReferralPhone] = useState<string>("");
	const [newReferralNote, setNewReferralNote] = useState<string>("");

	// Family Pool Calculation
	const familyPool = useMemo(() => {
		return calculateFamilyPoolBalance(`fam-${patientId || "group"}`, `Семья (${patientName})`, []);
	}, [patientId, patientName]);

	// Extracted Custom Hooks for Sub-domains
	const familyState = useLoyaltyFamily({
		patientId,
		patientName,
		familyPool,
		setActivePointsBalance,
		setLedgerEntries,
	});

	const certState = useLoyaltyCertificates({
		patientName,
		invoiceAmountRub,
	});

	const promoState = useLoyaltyPromos({
		invoiceAmountRub,
		setInvoiceAmountRub,
		onRedeemSuccess,
		setRedemptionSuccessMsg,
		setActiveTab,
	});

	const isFamilyActiveEffective =
		familyState.isFamilyModeActive || Boolean(familyState.selectedFamilyMemberId);

	// Recalculate family pool with live members
	const computedFamilyPool = useMemo(() => {
		return calculateFamilyPoolBalance(
			`fam-${patientId || "group"}`,
			`Семья (${patientName})`,
			familyState.familyMembers
		);
	}, [patientId, patientName, familyState.familyMembers]);

	// Tier Progression
	const tierProgression = useMemo(() => {
		return calculateTierProgression(initialLifetimeSpentKop, isFamilyActiveEffective);
	}, [initialLifetimeSpentKop, isFamilyActiveEffective]);

	const currentTier = tierProgression.currentTier;

	const effectiveBalanceRub = isFamilyActiveEffective
		? computedFamilyPool.totalPooledPoints
		: activePointsBalance;

	// Real-time Redemption Calculation
	const redemptionCalc: LoyaltyRedemptionResult = useMemo(() => {
		return calculateLoyaltyRedemption({
			grossInvoiceKop: Math.round(invoiceAmountRub * 100),
			discountKop: 0,
			excludedFromRedemptionKop: Math.round(excludedAmountRub * 100),
			availablePointsBalanceRub: effectiveBalanceRub,
			requestedPointsRub,
			tierId: currentTier.id,
			isDoctorOverride,
		});
	}, [invoiceAmountRub, excludedAmountRub, effectiveBalanceRub, requestedPointsRub, currentTier.id, isDoctorOverride]);

	// Live synchronization with PostgreSQL 18 loyalty endpoints (Mandates 8e, 8b, 8n)
	useEffect(() => {
		if (!isOpen || !patientId) return;
		let cancelled = false;

		async function loadLoyaltyData() {
			try {
				const headers = denteAdminSecretRequestHeaders();
				// 1. Fetch live balance & tier
				const balRes = await fetch(`/api/loyalty/balance/${encodeURIComponent(patientId)}`, { headers });
				if (balRes.ok) {
					const data = await balRes.json();
					if (!cancelled && typeof data.activePoints === "number") {
						setActivePointsBalance(data.activePoints);
					}
				}
				// 2. Fetch live transaction ledger
				const txRes = await fetch(`/api/loyalty/transactions/${encodeURIComponent(patientId)}`, { headers });
				if (txRes.ok) {
					const data = await txRes.json();
					if (!cancelled && Array.isArray(data.transactions) && data.transactions.length > 0) {
						const mappedTx: LoyaltyLedgerEntry[] = data.transactions.map((t: any) => ({
							id: t.id || `tx-${Date.now()}`,
							timestampIso: t.createdAt ? new Date(t.createdAt).toLocaleString("ru-RU") : new Date().toLocaleString("ru-RU"),
							patientId,
							patientName,
							medicalCardNumber,
							operationType: t.type?.includes("accrual") ? "accrual" : "redemption",
							operationTypeRu: t.type?.includes("accrual") ? "Начисление бонусов" : "Списание бонусов",
							invoiceAmountKop: 0,
							pointsDeltaRub: Number(t.amountPoints) || 0,
							balanceAfterRub: Number(t.balanceAfterPoints) || 0,
							paymentMethodRu: "Бонусный счет",
							staffNameRu: "Система лояльности",
							noteRu: t.description || "Операция с баллами",
						}));
						setLedgerEntries(mappedTx);
					}
				}
			} catch {
				// Silently fail on network/mock offline mode
			}
		}

		void loadLoyaltyData();
		return () => {
			cancelled = true;
		};
	}, [isOpen, patientId, patientName, medicalCardNumber]);

	if (!isOpen) return null;

	// Handlers
	const handleApplyQuickPoints = (pts: number) => {
		setRequestedPointsRub(pts);
	};

	const handleApplyMaxPoints = () => {
		setRequestedPointsRub(redemptionCalc.maxAllowedRedemptionRub);
	};

	const handleExecuteRedemption = () => {
		if (redemptionCalc.actualRedeemedPointsRub <= 0) {
			if (invoiceAmountRub <= 0) {
				showToast("Сумма счета не указана. Введите сумму к оплате", "warning");
			} else if (effectiveBalanceRub <= 0 && !isDoctorOverride) {
				showToast("На балансе нет бонусов. Включите «Привилегия врача» для гарантийного 100% покрытия", "info");
			} else {
				showToast("Укажите сумму бонусов для списания", "warning");
			}
			return;
		}

		// Mandate 8i, 8n: One wallet per family — parent pays for child/spouse directly
		const selectedTargetMember = familyState.familyMembers.find(
			(m) => m.patientId === familyState.selectedFamilyMemberId
		);
		if (selectedTargetMember) {
			const famResult = debitFamilySharedBalance({
				familyGroupId: `fam-${patientId || "group"}`,
				familyName: computedFamilyPool.familyName,
				sponsorPatientId: patientId,
				sponsorFullName: patientName,
				targetPatientId: selectedTargetMember.patientId,
				targetPatientName: selectedTargetMember.fullName,
				targetRoleRu: selectedTargetMember.roleRu,
				invoiceAmountKop: Math.round(invoiceAmountRub * 100),
				availableFamilyPointsRub: computedFamilyPool.totalPooledPoints,
				requestedPointsRub: redemptionCalc.actualRedeemedPointsRub,
				allowFullCoverage: isDoctorOverride,
				staffNameRu: "Администратор (Касса)",
			});

			setActivePointsBalance(famResult.remainingFamilyBalanceRub);
			setLedgerEntries((prev) => [famResult.ledgerEntry, ...prev]);
			setRedemptionSuccessMsg(famResult.messageRu);
			showToast(famResult.messageRu, "success");

			if (onRedeemSuccess) {
				onRedeemSuccess(famResult.debitedPointsRub, famResult.fiscal54FzSplit);
			}
			return;
		}

		setActivePointsBalance((prev) => prev - redemptionCalc.actualRedeemedPointsRub);
		const newLedgerItem: LoyaltyLedgerEntry = {
			id: `tx-${Date.now().toString().slice(-4)}`,
			timestampIso: new Date().toLocaleString("ru-RU"),
			patientId,
			patientName,
			medicalCardNumber,
			operationType: "redemption",
			operationTypeRu: isDoctorOverride
				? `Списание бонусов: Привилегия врача 100% (${currentTier.nameRu})`
				: `Списание бонусов (${currentTier.nameRu})`,
			invoiceAmountKop: Math.round(invoiceAmountRub * 100),
			pointsDeltaRub: -redemptionCalc.actualRedeemedPointsRub,
			balanceAfterRub: effectiveBalanceRub - redemptionCalc.actualRedeemedPointsRub,
			paymentMethodRu: "Бонусы + Касса",
			staffNameRu: "Администратор (Касса)",
			noteRu: isDoctorOverride
				? `Гарантийное покрытие врача: списание бонусов ${redemptionCalc.actualRedeemedPointsRub} ₽ по счету`
				: `Оплата бонусами ${redemptionCalc.actualRedeemedPointsRub} ₽ по счету`,
		};
		setLedgerEntries((prev) => [newLedgerItem, ...prev]);
		setRedemptionSuccessMsg(
			`Успешно списано ${redemptionCalc.actualRedeemedPointsRub} бонусов. К оплате: ${redemptionCalc.remainingPayableRub.toLocaleString("ru-RU")} ₽`
		);
		showToast(`Успешно списано ${redemptionCalc.actualRedeemedPointsRub} бонусов в чек`, "success");

		// Persist redemption to PostgreSQL 18 ACID endpoint (Mandates 8e, 8b, 8n)
		if (patientId) {
			fetch("/api/loyalty/redeem", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId,
					invoiceAmountRub,
					pointsToRedeem: redemptionCalc.actualRedeemedPointsRub,
					allowFullCoverage: isDoctorOverride,
					description: isDoctorOverride
						? `Гарантийное покрытие врача: списание бонусов ${redemptionCalc.actualRedeemedPointsRub} ₽ по счету`
						: `Списание бонусов ${redemptionCalc.actualRedeemedPointsRub} ₽ по счету`,
				}),
			}).catch((err) => {
				console.warn("[Loyalty] Redemption backend sync error:", err);
			});
		}

		if (onRedeemSuccess) {
			onRedeemSuccess(redemptionCalc.actualRedeemedPointsRub, redemptionCalc.fiscal54FzSplit);
		}
	};

	const handleOneClickRedeemToInvoice = () => {
		if (invoiceAmountRub <= 0) {
			showToast("Сумма счета не указана для списания бонусов", "warning");
			return;
		}
		if (effectiveBalanceRub <= 0 && !isDoctorOverride) {
			showToast("На балансе нет бонусов. Включите «Привилегия врача» для 100% покрытия", "info");
			return;
		}

		const targetCalc = calculateLoyaltyRedemption({
			grossInvoiceKop: Math.round(invoiceAmountRub * 100),
			discountKop: 0,
			excludedFromRedemptionKop: Math.round(excludedAmountRub * 100),
			availablePointsBalanceRub: effectiveBalanceRub,
			requestedPointsRub: isDoctorOverride ? Math.round(invoiceAmountRub) : effectiveBalanceRub,
			tierId: currentTier.id,
			isDoctorOverride,
		});

		if (targetCalc.actualRedeemedPointsRub <= 0) {
			showToast("Нет доступных бонусов для списания по текущему чеку", "warning");
			return;
		}

		// Mandate 8i, 8n: One wallet per family — parent pays for child/spouse
		const selectedTargetMember = familyState.familyMembers.find(
			(m) => m.patientId === familyState.selectedFamilyMemberId
		);
		if (selectedTargetMember) {
			const famResult = debitFamilySharedBalance({
				familyGroupId: `fam-${patientId || "group"}`,
				familyName: computedFamilyPool.familyName,
				sponsorPatientId: patientId,
				sponsorFullName: patientName,
				targetPatientId: selectedTargetMember.patientId,
				targetPatientName: selectedTargetMember.fullName,
				targetRoleRu: selectedTargetMember.roleRu,
				invoiceAmountKop: Math.round(invoiceAmountRub * 100),
				availableFamilyPointsRub: computedFamilyPool.totalPooledPoints,
				requestedPointsRub: targetCalc.actualRedeemedPointsRub,
				allowFullCoverage: isDoctorOverride,
				staffNameRu: "Администратор / Касса",
			});

			setRequestedPointsRub(famResult.debitedPointsRub);
			setActivePointsBalance(famResult.remainingFamilyBalanceRub);
			setLedgerEntries((prev) => [famResult.ledgerEntry, ...prev]);
			setRedemptionSuccessMsg(famResult.messageRu);
			showToast(famResult.messageRu, "success");

			if (onRedeemSuccess) {
				onRedeemSuccess(famResult.debitedPointsRub, famResult.fiscal54FzSplit);
			}
			return;
		}

		setRequestedPointsRub(targetCalc.actualRedeemedPointsRub);
		setActivePointsBalance((prev) => prev - targetCalc.actualRedeemedPointsRub);

		const newLedgerItem: LoyaltyLedgerEntry = {
			id: `tx-${Date.now().toString().slice(-4)}`,
			timestampIso: new Date().toLocaleString("ru-RU"),
			patientId,
			patientName,
			medicalCardNumber,
			operationType: "redemption",
			operationTypeRu: isDoctorOverride
				? `Списание бонусов: Привилегия врача 100% (${currentTier.nameRu})`
				: `Списание бонусов в чек (${currentTier.nameRu})`,
			invoiceAmountKop: Math.round(invoiceAmountRub * 100),
			pointsDeltaRub: -targetCalc.actualRedeemedPointsRub,
			balanceAfterRub: effectiveBalanceRub - targetCalc.actualRedeemedPointsRub,
			paymentMethodRu: "Бонусы + Касса",
			staffNameRu: "Администратор / Врач",
			noteRu: isDoctorOverride
				? `Гарантийное/автономное покрытие счета бонусами ${targetCalc.actualRedeemedPointsRub} ₽`
				: `Списание бонусов ${targetCalc.actualRedeemedPointsRub} ₽ в чек`,
		};

		setLedgerEntries((prev) => [newLedgerItem, ...prev]);
		setRedemptionSuccessMsg(
			`Успешно списано ${targetCalc.actualRedeemedPointsRub} бонусов. К доплате: ${targetCalc.remainingPayableRub.toLocaleString("ru-RU")} ₽`
		);
		showToast(`Списано ${targetCalc.actualRedeemedPointsRub} бонусов в чек`, "success");

		// Persist redemption to PostgreSQL 18 ACID endpoint (Mandates 8e, 8b, 8n)
		if (patientId) {
			fetch("/api/loyalty/redeem", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId,
					invoiceAmountRub,
					pointsToRedeem: targetCalc.actualRedeemedPointsRub,
					allowFullCoverage: isDoctorOverride,
					description: isDoctorOverride
						? `Гарантийное/автономное покрытие счета бонусами ${targetCalc.actualRedeemedPointsRub} ₽`
						: `Списание бонусов ${targetCalc.actualRedeemedPointsRub} ₽ в чек`,
				}),
			}).catch((err) => {
				console.warn("[Loyalty] redemption backend sync error:", err);
			});
		}

		if (onRedeemSuccess) {
			onRedeemSuccess(targetCalc.actualRedeemedPointsRub, targetCalc.fiscal54FzSplit);
		}
	};

	const handleAddReferral = () => {
		if (!newReferralName.trim()) {
			showToast("Укажите ФИО или имя приглашенного друга/родственника", "warning");
			return;
		}
		const newRecord: PatientReferralRecord = {
			id: `ref-${Date.now().toString().slice(-4)}`,
			referrerPatientId: patientId || "pat-current",
			referrerPatientName: patientName,
			invitedPatientName: newReferralName.trim(),
			invitedPatientPhone: newReferralPhone.trim() || undefined,
			createdAtIso: new Date().toISOString(),
			status: "registered",
			rewardPreset: selectedReferralPreset,
			rewardRub: selectedReferralPreset.referrerRewardRub,
			isRewardCredited: false,
			noteRu: newReferralNote.trim() || selectedReferralPreset.descriptionRu,
		};
		setReferrals((prev) => [newRecord, ...prev]);
		setNewReferralName("");
		setNewReferralPhone("");
		setNewReferralNote("");
		showToast(`Рекомендация «${newRecord.invitedPatientName}» успешно зарегистрирована (${selectedReferralPreset.titleRu})`, "success");
	};

	const handleCreditReferral = (refId: string) => {
		const targetRef = referrals.find((r) => r.id === refId);
		if (!targetRef) return;
		if (targetRef.isRewardCredited) {
			showToast("Вознаграждение за эту рекомендацию уже начислено", "info");
			return;
		}

		const credited = creditReferralBonus(targetRef, effectiveBalanceRub);
		setReferrals((prev) => prev.map((r) => (r.id === refId ? credited.updatedReferral : r)));
		setActivePointsBalance((prev) => prev + credited.bonusRub);
		setLedgerEntries((prev) => [credited.ledgerEntry, ...prev]);
		showToast(`Начислено ${credited.bonusRub} ₽ бонусов за рекомендацию «${targetRef.invitedPatientName}»!`, "success");

		// Persist referral accrual to PostgreSQL 18 ACID endpoint (Mandates 8e, 8b, 8n)
		if (patientId) {
			fetch("/api/loyalty/accrue", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId,
					amountPoints: credited.bonusRub,
					description: `Бонус за рекомендацию: ${targetRef.invitedPatientName}`,
				}),
			}).catch((err) => {
				console.warn("[Loyalty] Referral accrual backend sync error:", err);
			});
		}
	};

	const handleExportLedger = () => {
		const csvContent = exportLoyaltyLedgerToCsv(ledgerEntries);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `dente_loyalty_ledger_${patientName.replace(/\s+/g, "_")}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const filteredLedger = ledgerEntries.filter(
		(entry) =>
			entry.patientName.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
			entry.operationTypeRu.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
			entry.noteRu.toLowerCase().includes(ledgerSearch.toLowerCase())
	);

	return (
		<div className="loyalty-modal-overlay" onClick={onClose}>
			<div
				className="loyalty-modal-container"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-labelledby="loyalty-modal-title"
			>
				{/* Modal Header */}
				<header className="loyalty-modal-header">
					<div className="loyalty-modal-title-wrap">
						<div className="loyalty-modal-icon-badge">
							<Sparkles size={22} />
						</div>
						<div>
							<h2 id="loyalty-modal-title" className="loyalty-modal-title">
								Студия лояльности и бонусов • {clinicName}
							</h2>
							<p className="loyalty-modal-subtitle">
								Пациент: <strong>{patientName}</strong> (карта № {medicalCardNumber || "—"}) •
								Программа лояльности без пирамид и криптотокенов
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="loyalty-close-btn"
						aria-label="Закрыть окно программы лояльности"
					>
						<X size={20} />
					</button>
				</header>

				{/* Navigation Tabs */}
				<nav className="loyalty-tabs-nav dente-segmented-bar" aria-label="Разделы программы лояльности">
					<button
						type="button"
						className={`loyalty-tab-btn dente-segmented-item ${activeTab === "balance" ? "active" : ""}`}
						onClick={() => setActiveTab("balance")}
					>
						<Award size={16} />
						Баланс и касса
					</button>
					<button
						type="button"
						className={`loyalty-tab-btn dente-segmented-item ${activeTab === "family" ? "active" : ""}`}
						onClick={() => setActiveTab("family")}
					>
						<Users size={16} />
						Семейный кошелек
					</button>
					<button
						type="button"
						className={`loyalty-tab-btn dente-segmented-item ${activeTab === "referrals" ? "active" : ""}`}
						onClick={() => setActiveTab("referrals")}
						data-testid="loyalty-referrals-tab-btn"
					>
						<Sparkles size={16} />
						Приведи друга
					</button>
					<button
						type="button"
						className={`loyalty-tab-btn dente-segmented-item ${activeTab === "certificates" ? "active" : ""}`}
						onClick={() => setActiveTab("certificates")}
					>
						<Gift size={16} />
						Сертификаты
					</button>
					<button
						type="button"
						className={`loyalty-tab-btn dente-segmented-item ${activeTab === "promos" ? "active" : ""}`}
						onClick={() => setActiveTab("promos")}
					>
						<Tag size={16} />
						Промокоды
					</button>
					<button
						type="button"
						className={`loyalty-tab-btn dente-segmented-item ${activeTab === "ledger" ? "active" : ""}`}
						onClick={() => setActiveTab("ledger")}
					>
						<Coins size={16} />
						История операций
					</button>
				</nav>

				{/* Tab Panels */}
				<main className="loyalty-tab-content">
					{activeTab === "balance" && (
						<LoyaltyBalanceTab
							patientName={patientName}
							currentTier={currentTier}
							effectiveBalanceRub={effectiveBalanceRub}
							tierProgression={tierProgression}
							redemptionSuccessMsg={redemptionSuccessMsg}
							familyMembers={familyState.familyMembers}
							selectedFamilyMemberId={familyState.selectedFamilyMemberId}
							onSelectFamilyMemberId={(id) => {
								familyState.setSelectedFamilyMemberId(id);
								if (id) {
									familyState.setIsFamilyModeActive(true);
								}
							}}
							activePointsBalance={activePointsBalance}
							familyPool={computedFamilyPool}
							invoiceAmountRub={invoiceAmountRub}
							onInvoiceAmountChange={setInvoiceAmountRub}
							excludedAmountRub={excludedAmountRub}
							onExcludedAmountChange={setExcludedAmountRub}
							requestedPointsRub={requestedPointsRub}
							onRequestedPointsChange={setRequestedPointsRub}
							redemptionCalc={redemptionCalc}
							onOneClickRedeem={handleOneClickRedeemToInvoice}
							onApplyQuickPoints={handleApplyQuickPoints}
							onApplyMaxPoints={handleApplyMaxPoints}
							isDoctorOverride={isDoctorOverride}
							onDoctorOverrideChange={setIsDoctorOverride}
							onExecuteRedemption={handleExecuteRedemption}
						/>
					)}

					{activeTab === "family" && (
						<LoyaltyFamilyTab
							familyPool={computedFamilyPool}
							familyMembers={familyState.familyMembers}
							isFamilyModeActive={familyState.isFamilyModeActive}
							onToggleFamilyMode={() => familyState.setIsFamilyModeActive(!familyState.isFamilyModeActive)}
							onCreditFamilyBalance={familyState.handleCreditFamilyBalance}
							onSelectMemberForPayment={(memberId) => {
								familyState.setSelectedFamilyMemberId(memberId);
								familyState.setIsFamilyModeActive(true);
								setActiveTab("balance");
							}}
							onToggleMemberPermission={familyState.handleToggleMemberPermission}
							newMemberName={familyState.newMemberName}
							onNewMemberNameChange={familyState.setNewMemberName}
							newMemberRole={familyState.newMemberRole}
							onNewMemberRoleChange={familyState.setNewMemberRole}
							onAddFamilyMember={familyState.handleAddFamilyMember}
						/>
					)}

					{activeTab === "referrals" && (
						<LoyaltyReferralsTab
							referrals={referrals}
							selectedReferralPreset={selectedReferralPreset}
							onSelectReferralPreset={setSelectedReferralPreset}
							newReferralName={newReferralName}
							onNewReferralNameChange={setNewReferralName}
							newReferralPhone={newReferralPhone}
							onNewReferralPhoneChange={setNewReferralPhone}
							newReferralNote={newReferralNote}
							onNewReferralNoteChange={setNewReferralNote}
							onAddReferral={handleAddReferral}
							onCreditReferral={handleCreditReferral}
						/>
					)}

					{activeTab === "certificates" && (
						<LoyaltyCertificatesTab
							certificateNominalRub={certState.certificateNominalRub}
							onNominalChange={certState.setCertificateNominalRub}
							recipientName={certState.recipientName}
							onRecipientNameChange={certState.setRecipientName}
							activeCertificate={certState.activeCertificate}
							certVerifyInput={certState.certVerifyInput}
							onCertVerifyInputChange={certState.setCertVerifyInput}
							certRedeemFeedback={certState.certRedeemFeedback}
							onGenerateNewCertificate={certState.handleGenerateNewCertificate}
							onVerifyAndRedeemCert={certState.handleVerifyAndRedeemCert}
							clinicName={clinicName}
						/>
					)}

					{activeTab === "promos" && (
						<LoyaltyPromosTab
							promoInput={promoState.promoInput}
							onPromoInputChange={promoState.setPromoInput}
							promoResult={promoState.promoResult}
							onEvaluatePromo={promoState.handleEvaluatePromo}
							onApplyPromoDirectly={promoState.handleApplyPromoDirectly}
							onApplyPromoResultToInvoice={promoState.handleApplyPromoResultToInvoice}
						/>
					)}

					{activeTab === "ledger" && (
						<LoyaltyLedgerTab
							ledgerSearch={ledgerSearch}
							onLedgerSearchChange={setLedgerSearch}
							filteredLedger={filteredLedger}
							onExportLedger={handleExportLedger}
						/>
					)}
				</main>
			</div>
		</div>
	);
};

export default LoyaltyProgramModal;

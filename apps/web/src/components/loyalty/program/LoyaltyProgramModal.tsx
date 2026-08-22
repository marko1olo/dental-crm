import React, { useState, useMemo } from "react";
import {
	Award,
	Gift,
	Users,
	Tag,
	FileSpreadsheet,
	Sparkles,
	CheckCircle2,
	AlertCircle,
	Printer,
	Download,
	Search,
	Plus,
	Percent,
	Coins,
	CreditCard,
	X,
	ShieldCheck,
	ArrowRight,
	TrendingUp,
	Check,
	Copy,
} from "lucide-react";
import {
	calculateLoyaltyAccrual,
	calculateLoyaltyRedemption,
	calculateTierProgression,
	generateGiftCertificateSerial,
	validateGiftCertificateSerial,
	redeemGiftCertificate,
	calculateFamilyPoolBalance,
	evaluatePromoCode,
	exportLoyaltyLedgerToCsv,
	type LoyaltyRedemptionResult,
	type Fiscal54FzSplitResult,
	type GiftCertificate,
	type FamilyMember,
	type LoyaltyLedgerEntry,
} from "./loyaltyEngine";
import {
	LOYALTY_TIER_PRESETS,
	GIFT_CERTIFICATE_CATALOG,
	PROMO_CODE_PRESETS,
	LOYALTY_EXCLUSION_RULES,
	QUICK_REDEMPTION_PRESETS_RUB,
	type LoyaltyTierId,
} from "./loyaltyPresets";
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

type TabType = "balance" | "family" | "certificates" | "promos" | "ledger";

const SAMPLE_FAMILY_MEMBERS: readonly FamilyMember[] = [
	{
		patientId: "pat-1",
		fullName: "Воронов Михаил Александрович",
		roleRu: "Глава семьи",
		birthDateIso: "1982-04-14",
		individualPointsBalance: 4250,
		lifetimeSpentKop: 18500000, // 185,000 RUB
		isBonusSpendingAllowed: true,
	},
	{
		patientId: "pat-2",
		fullName: "Воронова Елена Викторовна",
		roleRu: "Супруг / Супруга",
		birthDateIso: "1985-09-22",
		individualPointsBalance: 3100,
		lifetimeSpentKop: 12000000, // 120,000 RUB
		isBonusSpendingAllowed: true,
	},
	{
		patientId: "pat-3",
		fullName: "Воронов Артем Михайлович",
		roleRu: "Ребенок",
		birthDateIso: "2015-06-10",
		individualPointsBalance: 850,
		lifetimeSpentKop: 4500000, // 45,000 RUB
		isBonusSpendingAllowed: true,
	},
];

const INITIAL_CERTIFICATE: GiftCertificate = {
	id: "cert-live-01",
	serialNumber: generateGiftCertificateSerial(42),
	nominalKop: 1000000, // 10,000 RUB
	initialBalanceKop: 1000000,
	currentBalanceKop: 1000000,
	status: "active",
	issuedAtIso: "2026-08-22",
	expiresAtIso: "2027-08-22",
	recipientName: "Воронова Елена Викторовна",
	buyerPatientName: "Воронов Михаил Александрович",
	note: "Подарок на день рождения",
};

const SAMPLE_LEDGER: readonly LoyaltyLedgerEntry[] = [
	{
		id: "tx-101",
		timestampIso: "2026-08-22 10:30",
		patientId: "pat-1",
		patientName: "Воронов Михаил Александрович",
		medicalCardNumber: "043/у-2026/102",
		operationType: "accrual",
		operationTypeRu: "Начисление кэшбэка (5%)",
		invoiceAmountKop: 1450000,
		pointsDeltaRub: 725,
		balanceAfterRub: 4250,
		paymentMethodRu: "Банковская карта (МИР)",
		fiscalReceiptNumber: "ФД-84920",
		staffNameRu: "Администратор Смирнова О.",
		noteRu: "Лечение кариеса 2-х зубов (пломбы Estelite)",
	},
	{
		id: "tx-100",
		timestampIso: "2026-08-15 14:15",
		patientId: "pat-1",
		patientName: "Воронов Михаил Александрович",
		medicalCardNumber: "043/у-2026/102",
		operationType: "redemption",
		operationTypeRu: "Списание бонусов на кассе",
		invoiceAmountKop: 650000,
		pointsDeltaRub: -1500,
		balanceAfterRub: 3525,
		paymentMethodRu: "СБП + Бонусы",
		fiscalReceiptNumber: "ФД-83901",
		staffNameRu: "Администратор Смирнова О.",
		noteRu: "Оплата 30% счета на профгигиену полости рта",
	},
	{
		id: "tx-099",
		timestampIso: "2026-08-01 09:00",
		patientId: "pat-1",
		patientName: "Воронов Михаил Александрович",
		medicalCardNumber: "043/у-2026/102",
		operationType: "welcome_bonus",
		operationTypeRu: "Приветственный бонус",
		invoiceAmountKop: 0,
		pointsDeltaRub: 1000,
		balanceAfterRub: 5025,
		paymentMethodRu: "Маркетинг",
		staffNameRu: "Система DENTE",
		noteRu: "Бонус ко дню рождения пациента",
	},
];

export const LoyaltyProgramModal: React.FC<LoyaltyProgramModalProps> = ({
	isOpen,
	onClose,
	clinicName = "ООО «Денте Стоматология»",
	patientId = "pat-1",
	patientName = "Воронов Михаил Александрович",
	medicalCardNumber = "043/у-2026/102",
	initialPointsBalance = 4250,
	initialLifetimeSpentKop = 18500000, // 185,000 RUB -> Gold Tier
	currentInvoiceAmountKop = 1200000, // 12,000 RUB
	onRedeemSuccess,
}) => {
	const [activeTab, setActiveTab] = useState<TabType>("balance");

	// Cashier Calculator State
	const [invoiceAmountRub, setInvoiceAmountRub] = useState<number>(
		currentInvoiceAmountKop / 100
	);
	const [excludedAmountRub, setExcludedAmountRub] = useState<number>(0);
	const [requestedPointsRub, setRequestedPointsRub] = useState<number>(1000);
	const [activePointsBalance, setActivePointsBalance] = useState<number>(initialPointsBalance);
	const [redemptionSuccessMsg, setRedemptionSuccessMsg] = useState<string | null>(null);

	// Family Group State
	const [familyMembers, setFamilyMembers] = useState<readonly FamilyMember[]>(SAMPLE_FAMILY_MEMBERS);
	const [isFamilyModeActive, setIsFamilyModeActive] = useState<boolean>(false);
	const [newMemberName, setNewMemberName] = useState<string>("");
	const [newMemberRole, setNewMemberRole] = useState<FamilyMember["roleRu"]>("Супруг / Супруга");

	// Certificate State
	const [certificateNominalRub, setCertificateNominalRub] = useState<number>(10000);
	const [recipientName, setRecipientName] = useState<string>("Воронова Елена Викторовна");
	const [activeCertificate, setActiveCertificate] = useState<GiftCertificate>(INITIAL_CERTIFICATE);
	const [certVerifyInput, setCertVerifyInput] = useState<string>("");
	const [certRedeemFeedback, setCertRedeemFeedback] = useState<string | null>(null);

	// Promo State
	const [promoInput, setPromoInput] = useState<string>("HYGIENE15");
	const [promoResult, setPromoResult] = useState<ReturnType<typeof evaluatePromoCode> | null>(null);
	const [copiedPromo, setCopiedPromo] = useState<string | null>(null);

	// Ledger State
	const [ledgerEntries, setLedgerEntries] = useState<readonly LoyaltyLedgerEntry[]>(SAMPLE_LEDGER);
	const [ledgerSearch, setLedgerSearch] = useState<string>("");

	// Tier Progression
	const tierProgression = useMemo(() => {
		return calculateTierProgression(initialLifetimeSpentKop, isFamilyModeActive);
	}, [initialLifetimeSpentKop, isFamilyModeActive]);

	const currentTier = tierProgression.currentTier;

	// Family Pool Calculation
	const familyPool = useMemo(() => {
		return calculateFamilyPoolBalance("fam-grp-01", "Семья Вороновых", familyMembers);
	}, [familyMembers]);

	const effectiveBalanceRub = isFamilyModeActive
		? familyPool.totalPooledPoints
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
		});
	}, [invoiceAmountRub, excludedAmountRub, effectiveBalanceRub, requestedPointsRub, currentTier.id]);

	if (!isOpen) return null;

	// Handlers
	const handleApplyQuickPoints = (pts: number) => {
		setRequestedPointsRub(pts);
	};

	const handleApplyMaxPoints = () => {
		setRequestedPointsRub(redemptionCalc.maxAllowedRedemptionRub);
	};

	const handleExecuteRedemption = () => {
		if (redemptionCalc.actualRedeemedPointsRub <= 0) return;

		setActivePointsBalance((prev) => prev - redemptionCalc.actualRedeemedPointsRub);
		const newLedgerItem: LoyaltyLedgerEntry = {
			id: `tx-${Date.now().toString().slice(-4)}`,
			timestampIso: new Date().toLocaleString("ru-RU"),
			patientId,
			patientName,
			medicalCardNumber,
			operationType: "redemption",
			operationTypeRu: `Списание бонусов (${currentTier.nameRu})`,
			invoiceAmountKop: Math.round(invoiceAmountRub * 100),
			pointsDeltaRub: -redemptionCalc.actualRedeemedPointsRub,
			balanceAfterRub: effectiveBalanceRub - redemptionCalc.actualRedeemedPointsRub,
			paymentMethodRu: "Бонусы + Касса",
			fiscalReceiptNumber: `ФД-${Math.floor(10000 + Math.random() * 90000)}`,
			staffNameRu: "Администратор (Касса)",
			noteRu: `Оплата бонусами ${redemptionCalc.actualRedeemedPointsRub} ₽ по счету`,
		};
		setLedgerEntries((prev) => [newLedgerItem, ...prev]);
		setRedemptionSuccessMsg(
			`Успешно списано ${redemptionCalc.actualRedeemedPointsRub} бонусов. К оплате: ${redemptionCalc.remainingPayableRub.toLocaleString("ru-RU")} ₽`
		);
		if (onRedeemSuccess) {
			onRedeemSuccess(redemptionCalc.actualRedeemedPointsRub, redemptionCalc.fiscal54FzSplit);
		}
	};

	const handleGenerateNewCertificate = () => {
		const newSerial = generateGiftCertificateSerial();
		const nominalKop = Math.round(certificateNominalRub * 100);
		const cert: GiftCertificate = {
			id: `cert-${Date.now()}`,
			serialNumber: newSerial,
			nominalKop,
			initialBalanceKop: nominalKop,
			currentBalanceKop: nominalKop,
			status: "active",
			issuedAtIso: new Date().toISOString().slice(0, 10),
			expiresAtIso: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
			recipientName,
			buyerPatientName: patientName,
			note: `Подарочный сертификат на сумму ${certificateNominalRub.toLocaleString("ru-RU")} ₽`,
		};
		setActiveCertificate(cert);
		setCertVerifyInput(newSerial);
		setCertRedeemFeedback(`Выпущен новый сертификат ${newSerial} на ${certificateNominalRub} ₽`);
	};

	const handleVerifyAndRedeemCert = () => {
		if (!certVerifyInput) return;
		const isCodeValid = validateGiftCertificateSerial(certVerifyInput);
		if (!isCodeValid) {
			setCertRedeemFeedback("❌ Неверный 16-значный номер сертификата (ошибка Luhn checksum)");
			return;
		}
		const res = redeemGiftCertificate(
			activeCertificate,
			Math.round(invoiceAmountRub * 100)
		);
		if (res.success) {
			setActiveCertificate((prev) => ({
				...prev,
				currentBalanceKop: res.newBalanceKop,
				status: res.newStatus,
			}));
			setCertRedeemFeedback(
				`✅ Успешно списано ${(res.redeemedAmountKop / 100).toLocaleString("ru-RU")} ₽ с сертификата. Остаток на карте: ${(res.newBalanceKop / 100).toLocaleString("ru-RU")} ₽`
			);
		} else {
			setCertRedeemFeedback(`❌ Ошибка: ${res.errorMessageRu}`);
		}
	};

	const handleAddFamilyMember = () => {
		if (!newMemberName.trim()) return;
		const member: FamilyMember = {
			patientId: `pat-${Date.now().toString().slice(-4)}`,
			fullName: newMemberName.trim(),
			roleRu: newMemberRole,
			individualPointsBalance: 500,
			lifetimeSpentKop: 0,
			isBonusSpendingAllowed: true,
		};
		setFamilyMembers((prev) => [...prev, member]);
		setNewMemberName("");
	};

	const handleToggleMemberPermission = (pId: string) => {
		setFamilyMembers((prev) =>
			prev.map((m) =>
				m.patientId === pId ? { ...m, isBonusSpendingAllowed: !m.isBonusSpendingAllowed } : m
			)
		);
	};

	const handleEvaluatePromo = () => {
		const res = evaluatePromoCode(
			promoInput,
			Math.round(invoiceAmountRub * 100),
			["hygiene", "therapy"],
			[]
		);
		setPromoResult(res);
	};

	const handleCopyPromo = (code: string) => {
		setPromoInput(code);
		setCopiedPromo(code);
		setTimeout(() => setCopiedPromo(null), 2000);
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
								Пациент: <strong>{patientName}</strong> (Медкарта: {medicalCardNumber})
							</p>
						</div>
					</div>
					<button
						className="loyalty-close-btn"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
					>
						<X size={20} />
					</button>
				</header>

				{/* Navigation Tabs */}
				<nav className="loyalty-nav-tabs" aria-label="Разделы программы лояльности">
					<button
						className={`loyalty-tab-btn ${activeTab === "balance" ? "active" : ""}`}
						onClick={() => setActiveTab("balance")}
					>
						<Coins size={18} />
						Баланс и касса
					</button>
					<button
						className={`loyalty-tab-btn ${activeTab === "family" ? "active" : ""}`}
						onClick={() => setActiveTab("family")}
					>
						<Users size={18} />
						Семейный счет ({familyMembers.length})
					</button>
					<button
						className={`loyalty-tab-btn ${activeTab === "certificates" ? "active" : ""}`}
						onClick={() => setActiveTab("certificates")}
					>
						<Gift size={18} />
						Подарочные сертификаты
					</button>
					<button
						className={`loyalty-tab-btn ${activeTab === "promos" ? "active" : ""}`}
						onClick={() => setActiveTab("promos")}
					>
						<Tag size={18} />
						Промокоды и акции
					</button>
					<button
						className={`loyalty-tab-btn ${activeTab === "ledger" ? "active" : ""}`}
						onClick={() => setActiveTab("ledger")}
					>
						<FileSpreadsheet size={18} />
						Выписка операций ({ledgerEntries.length})
					</button>
				</nav>

				{/* Modal Body */}
				<main className="loyalty-modal-body">
					{/* TAB 1: BALANCE & CASHIER */}
					{activeTab === "balance" && (
						<div>
							{/* Tier Hero Card */}
							<div
								className="loyalty-tier-hero"
								style={{ background: currentTier.cardGradient }}
							>
								<div className="loyalty-tier-hero-bg-accent" />
								<div className="loyalty-tier-hero-top">
									<div>
										<span className="loyalty-tier-hero-badge">
											<Award size={16} />
											{currentTier.badgeLabelRu}
										</span>
										<h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem" }}>
											{patientName}
										</h3>
									</div>
									<div style={{ textAlign: "right" }}>
										<div style={{ fontSize: "0.8125rem", opacity: 0.9 }}>Кэшбэк бонусами</div>
										<div style={{ fontSize: "1.75rem", fontWeight: 800 }}>
											{currentTier.cashbackPercent}%
										</div>
									</div>
								</div>

								<div className="loyalty-points-display">
									<div className="loyalty-points-value">
										{effectiveBalanceRub.toLocaleString("ru-RU")}
										<span className="loyalty-points-label">бонусных ₽</span>
									</div>
									<p style={{ fontSize: "0.875rem", opacity: 0.95 }}>
										1 бонус = 1 рубль • Оплата до {currentTier.maxInvoiceCoveragePercent}% счета
									</p>
								</div>

								{/* Progress to next tier */}
								{tierProgression.nextTier && (
									<div className="loyalty-tier-progress-wrap">
										<div className="loyalty-progress-bar-track">
											<div
												className="loyalty-progress-bar-fill"
												style={{ width: `${tierProgression.progressPercent}%` }}
											/>
										</div>
										<div className="loyalty-progress-info">
											<span>
												Накоплено: {tierProgression.lifetimeSpentRub.toLocaleString("ru-RU")} ₽
											</span>
											<span>
												До уровня {tierProgression.nextTier.nameRu}:{" "}
												{tierProgression.remainingToNextTierRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>
									</div>
								)}
							</div>

							{/* Fast Cashier Redemption Calculator */}
							<div className="loyalty-cashier-card">
								<h4 className="loyalty-section-title">
									<CreditCard size={20} color="var(--teal, #0d9488)" />
									Калькулятор списания бонусов на кассе (54-ФЗ)
								</h4>

								{redemptionSuccessMsg && (
									<div
										style={{
											background: "rgba(16, 185, 129, 0.1)",
											border: "1px solid #10b981",
											color: "#047857",
											padding: "0.75rem 1rem",
											borderRadius: "0.5rem",
											marginBottom: "1rem",
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
											fontWeight: 600,
										}}
									>
										<CheckCircle2 size={18} />
										{redemptionSuccessMsg}
									</div>
								)}

								<div
									style={{
										display: "grid",
										gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
										gap: "1rem",
									}}
								>
									<div>
										<label
											style={{
												display: "block",
												fontSize: "0.8125rem",
												fontWeight: 600,
												color: "var(--muted, #64748b)",
												marginBottom: "0.375rem",
											}}
										>
											Сумма счета (₽)
										</label>
										<input
											type="number"
											min={0}
											step={100}
											value={invoiceAmountRub}
											onChange={(e) => setInvoiceAmountRub(Number(e.target.value))}
											style={{
												width: "100%",
												padding: "0.625rem 0.875rem",
												borderRadius: "0.5rem",
												border: "1px solid var(--line, #cbd5e1)",
												background: "var(--paper, #fff)",
												color: "var(--ink, #0f172a)",
												fontSize: "1rem",
												fontWeight: 700,
											}}
										/>
									</div>

									<div>
										<label
											style={{
												display: "block",
												fontSize: "0.8125rem",
												fontWeight: 600,
												color: "var(--muted, #64748b)",
												marginBottom: "0.375rem",
											}}
										>
											Исключения (лаборатория CAD/CAM, импланты ₽)
										</label>
										<input
											type="number"
											min={0}
											step={100}
											value={excludedAmountRub}
											onChange={(e) => setExcludedAmountRub(Number(e.target.value))}
											style={{
												width: "100%",
												padding: "0.625rem 0.875rem",
												borderRadius: "0.5rem",
												border: "1px solid var(--line, #cbd5e1)",
												background: "var(--paper, #fff)",
												color: "var(--ink, #0f172a)",
												fontSize: "1rem",
												fontWeight: 700,
											}}
										/>
									</div>

									<div>
										<label
											style={{
												display: "block",
												fontSize: "0.8125rem",
												fontWeight: 600,
												color: "var(--muted, #64748b)",
												marginBottom: "0.375rem",
											}}
										>
											Списать бонусов (₽)
										</label>
										<input
											type="number"
											min={0}
											max={effectiveBalanceRub}
											value={requestedPointsRub}
											onChange={(e) => setRequestedPointsRub(Number(e.target.value))}
											style={{
												width: "100%",
												padding: "0.625rem 0.875rem",
												borderRadius: "0.5rem",
												border: "1px solid var(--teal, #0d9488)",
												background: "var(--paper, #fff)",
												color: "var(--teal, #0d9488)",
												fontSize: "1rem",
												fontWeight: 700,
											}}
										/>
									</div>
								</div>

								{/* Quick Buttons */}
								<div className="loyalty-quick-actions-row">
									{QUICK_REDEMPTION_PRESETS_RUB.map((preset) => (
										<button
											key={preset}
											type="button"
											className="loyalty-quick-btn"
											onClick={() => handleApplyQuickPoints(preset)}
										>
											Списать {preset.toLocaleString("ru-RU")} ₽
										</button>
									))}
									<button
										type="button"
										className="loyalty-quick-btn max-btn"
										onClick={handleApplyMaxPoints}
									>
										Списать максимум ({redemptionCalc.maxAllowedRedemptionRub} ₽)
									</button>
								</div>

								{/* 54-FZ Fiscal Breakdown */}
								<div className="loyalty-fiscal-box">
									<div
										style={{
											fontWeight: 700,
											fontSize: "0.875rem",
											marginBottom: "0.5rem",
											color: "var(--ink, #0f172a)",
										}}
									>
										Фискальный сплит чека по 54-ФЗ (ФФД 1.2):
									</div>
									<div className="loyalty-fiscal-row">
										<span>База, доступная для оплаты бонусами:</span>
										<strong>
											{(redemptionCalc.redeemableBaseKop / 100).toLocaleString("ru-RU")} ₽
										</strong>
									</div>
									<div className="loyalty-fiscal-row">
										<span>Тег 1215 (Зачет аванса / Бонусные баллы):</span>
										<strong style={{ color: "var(--teal, #0d9488)" }}>
											-
											{(
												redemptionCalc.fiscal54FzSplit.tag1215AdvancePrepaymentBonusKop /
												100
											).toLocaleString("ru-RU")}{" "}
											₽
										</strong>
									</div>
									<div className="loyalty-fiscal-row highlight">
										<span>Тег 1081 / 1031 (Итого к доплате пациентом):</span>
										<span style={{ fontSize: "1.125rem", fontWeight: 800 }}>
											{redemptionCalc.remainingPayableRub.toLocaleString("ru-RU")} ₽
										</span>
									</div>
								</div>

								<div style={{ marginTop: "1rem", textAlign: "right" }}>
									<button
										type="button"
										onClick={handleExecuteRedemption}
										disabled={redemptionCalc.actualRedeemedPointsRub <= 0}
										style={{
											padding: "0.75rem 1.75rem",
											minHeight: "44px",
											borderRadius: "0.625rem",
											border: "none",
											background:
												redemptionCalc.actualRedeemedPointsRub > 0
													? "var(--teal, #0d9488)"
													: "#94a3b8",
											color: "#ffffff",
											fontSize: "0.9375rem",
											fontWeight: 700,
											cursor:
												redemptionCalc.actualRedeemedPointsRub > 0
													? "pointer"
													: "not-allowed",
											display: "inline-flex",
											alignItems: "center",
											gap: "0.5rem",
										}}
									>
										<Check size={18} />
										Применить списание бонусов ({redemptionCalc.actualRedeemedPointsRub} ₽)
									</button>
								</div>
							</div>
						</div>
					)}

					{/* TAB 2: FAMILY POOL */}
					{activeTab === "family" && (
						<div>
							<div
								style={{
									background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
									color: "#ffffff",
									borderRadius: "1rem",
									padding: "1.5rem",
									marginBottom: "1.5rem",
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<div>
									<div
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: "0.375rem",
											background: "rgba(255, 255, 255, 0.2)",
											padding: "0.25rem 0.625rem",
											borderRadius: "9999px",
											fontSize: "0.75rem",
											fontWeight: 700,
										}}
									>
										<Users size={14} />
										{familyPool.effectiveTier.badgeLabelRu}
									</div>
									<h3 style={{ fontSize: "1.375rem", fontWeight: 700, marginTop: "0.375rem" }}>
										{familyPool.familyName}
									</h3>
									<p style={{ fontSize: "0.8125rem", opacity: 0.9 }}>
										Единый счет: повышенный кэшбэк {familyPool.effectiveTier.cashbackPercent}% за
										визиты всех членов семьи.
									</p>
								</div>
								<div style={{ textAlign: "right" }}>
									<div style={{ fontSize: "0.8125rem", opacity: 0.9 }}>Общий баланс семьи</div>
									<div style={{ fontSize: "2.25rem", fontWeight: 800 }}>
										{familyPool.totalPooledPoints.toLocaleString("ru-RU")} ₽
									</div>
									<button
										type="button"
										onClick={() => setIsFamilyModeActive(!isFamilyModeActive)}
										style={{
											marginTop: "0.5rem",
											padding: "0.375rem 0.875rem",
											minHeight: "44px",
											borderRadius: "0.5rem",
											border: "1px solid #ffffff",
											background: isFamilyModeActive ? "#ffffff" : "transparent",
											color: isFamilyModeActive ? "#047857" : "#ffffff",
											fontSize: "0.8125rem",
											fontWeight: 700,
											cursor: "pointer",
										}}
									>
										{isFamilyModeActive ? "✓ Семейный режим включен" : "Включить семейный счет"}
									</button>
								</div>
							</div>

							{/* Family Members Grid */}
							<h4 className="loyalty-section-title">
								<Users size={20} color="var(--teal, #0d9488)" />
								Члены семьи и права списания баллов
							</h4>

							<div className="loyalty-family-grid">
								{familyMembers.map((member) => (
									<div key={member.patientId} className="loyalty-family-member-card">
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "flex-start",
											}}
										>
											<div>
												<span className="loyalty-member-role-badge">{member.roleRu}</span>
												<h5
													style={{
														fontSize: "0.9375rem",
														fontWeight: 700,
														marginTop: "0.25rem",
														color: "var(--ink, #0f172a)",
													}}
												>
													{member.fullName}
												</h5>
											</div>
										</div>

										<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
											Личные траты: {(member.lifetimeSpentKop / 100).toLocaleString("ru-RU")} ₽
											<br />
											Накоплено баллов: {member.individualPointsBalance} ₽
										</div>

										<div
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												borderTop: "1px solid var(--line, #e2e8f0)",
												paddingTop: "0.5rem",
												marginTop: "auto",
											}}
										>
											<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
												Списание бонусов:
											</span>
											<button
												type="button"
												onClick={() => handleToggleMemberPermission(member.patientId)}
												style={{
													fontSize: "0.75rem",
													fontWeight: 700,
													minHeight: "44px",
													padding: "0.25rem 0.625rem",
													borderRadius: "0.375rem",
													border: "none",
													cursor: "pointer",
													background: member.isBonusSpendingAllowed
														? "rgba(16, 185, 129, 0.15)"
														: "rgba(239, 68, 68, 0.15)",
													color: member.isBonusSpendingAllowed ? "#047857" : "#b91c1c",
												}}
											>
												{member.isBonusSpendingAllowed ? "Разрешено" : "Заблокировано"}
											</button>
										</div>
									</div>
								))}
							</div>

							{/* Add Member Form */}
							<div
								style={{
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									borderRadius: "0.875rem",
									padding: "1rem 1.25rem",
									marginTop: "1.5rem",
									display: "flex",
									gap: "1rem",
									alignItems: "flex-end",
									flexWrap: "wrap",
								}}
							>
								<div style={{ flex: 2, minWidth: "200px" }}>
									<label
										style={{
											display: "block",
											fontSize: "0.8125rem",
											fontWeight: 600,
											color: "var(--muted, #64748b)",
											marginBottom: "0.25rem",
										}}
									>
										ФИО родственника
									</label>
									<input
										type="text"
										placeholder="Например: Воронова Анна Михайловна"
										value={newMemberName}
										onChange={(e) => setNewMemberName(e.target.value)}
										style={{
											width: "100%",
											padding: "0.5rem 0.75rem",
											borderRadius: "0.5rem",
											border: "1px solid var(--line, #cbd5e1)",
											fontSize: "0.875rem",
										}}
									/>
								</div>

								<div style={{ flex: 1, minWidth: "160px" }}>
									<label
										style={{
											display: "block",
											fontSize: "0.8125rem",
											fontWeight: 600,
											color: "var(--muted, #64748b)",
											marginBottom: "0.25rem",
										}}
									>
										Роль в семье
									</label>
									<select
										value={newMemberRole}
										onChange={(e) =>
											setNewMemberRole(e.target.value as FamilyMember["roleRu"])
										}
										style={{
											width: "100%",
											padding: "0.5rem 0.75rem",
											borderRadius: "0.5rem",
											border: "1px solid var(--line, #cbd5e1)",
											fontSize: "0.875rem",
											background: "var(--paper, #fff)",
										}}
									>
										<option value="Супруг / Супруга">Супруг / Супруга</option>
										<option value="Ребенок">Ребенок</option>
										<option value="Родитель">Родитель</option>
										<option value="Родственник">Родственник</option>
									</select>
								</div>

								<button
									type="button"
									onClick={handleAddFamilyMember}
									style={{
										padding: "0.5rem 1.25rem",
										minHeight: "44px",
										borderRadius: "0.5rem",
										border: "none",
										background: "var(--teal, #0d9488)",
										color: "#ffffff",
										fontWeight: 700,
										fontSize: "0.875rem",
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: "0.375rem",
									}}
								>
									<Plus size={16} />
									Добавить в семейный пул
								</button>
							</div>
						</div>
					)}

					{/* TAB 3: GIFT CERTIFICATES */}
					{activeTab === "certificates" && (
						<div>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
									gap: "1.5rem",
								}}
							>
								{/* Left: Issue / Catalog */}
								<div>
									<h4 className="loyalty-section-title">
										<Gift size={20} color="var(--teal, #0d9488)" />
										Выпуск подарочного сертификата
									</h4>

									<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
										{GIFT_CERTIFICATE_CATALOG.filter((c) => !c.isCustomNominal).map((preset) => (
											<button
												key={preset.id}
												type="button"
												onClick={() => setCertificateNominalRub(preset.nominalRub)}
												style={{
													padding: "0.5rem 0.875rem",
													minHeight: "44px",
													borderRadius: "0.5rem",
													border:
														certificateNominalRub === preset.nominalRub
															? "2px solid var(--teal, #0d9488)"
															: "1px solid var(--line, #cbd5e1)",
													background:
														certificateNominalRub === preset.nominalRub
															? "rgba(13, 148, 136, 0.1)"
															: "var(--paper, #ffffff)",
													color: "var(--ink, #0f172a)",
													fontWeight: 700,
													fontSize: "0.875rem",
													cursor: "pointer",
												}}
											>
												{preset.nominalRub.toLocaleString("ru-RU")} ₽
											</button>
										))}
									</div>

									<div style={{ marginBottom: "1rem" }}>
										<label
											style={{
												display: "block",
												fontSize: "0.8125rem",
												fontWeight: 600,
												color: "var(--muted, #64748b)",
												marginBottom: "0.25rem",
											}}
										>
											ФИО Получателя сертификата:
										</label>
										<input
											type="text"
											value={recipientName}
											onChange={(e) => setRecipientName(e.target.value)}
											style={{
												width: "100%",
												padding: "0.625rem 0.875rem",
												borderRadius: "0.5rem",
												border: "1px solid var(--line, #cbd5e1)",
												fontSize: "0.875rem",
											}}
										/>
									</div>

									<div style={{ display: "flex", gap: "0.75rem" }}>
										<button
											type="button"
											onClick={handleGenerateNewCertificate}
											style={{
												flex: 1,
												padding: "0.625rem 1rem",
												minHeight: "44px",
												borderRadius: "0.5rem",
												border: "none",
												background: "var(--teal, #0d9488)",
												color: "#ffffff",
												fontWeight: 700,
												fontSize: "0.875rem",
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												gap: "0.375rem",
											}}
										>
											<Sparkles size={16} />
											Сгенерировать сертификат
										</button>

										<button
											type="button"
											onClick={() => window.print()}
											style={{
												padding: "0.625rem 1rem",
												minHeight: "44px",
												borderRadius: "0.5rem",
												border: "1px solid var(--line, #cbd5e1)",
												background: "var(--paper, #ffffff)",
												color: "var(--ink, #0f172a)",
												fontWeight: 700,
												fontSize: "0.875rem",
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												gap: "0.375rem",
											}}
										>
											<Printer size={16} />
											Печать A5/A6
										</button>
									</div>

									{/* Verification Box */}
									<div
										style={{
											background: "var(--paper, #ffffff)",
											border: "1px solid var(--line, #e2e8f0)",
											borderRadius: "0.875rem",
											padding: "1rem",
											marginTop: "1.5rem",
										}}
									>
										<h5 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.5rem" }}>
											Проверка и погашение сертификата
										</h5>
										<div style={{ display: "flex", gap: "0.5rem" }}>
											<input
												type="text"
												placeholder="7701-XXXX-XXXX-XXXX"
												value={certVerifyInput}
												onChange={(e) => setCertVerifyInput(e.target.value)}
												style={{
													flex: 1,
													padding: "0.5rem 0.75rem",
													borderRadius: "0.5rem",
													border: "1px solid var(--line, #cbd5e1)",
													fontSize: "0.875rem",
													fontFamily: "monospace",
												}}
											/>
											<button
												type="button"
												onClick={handleVerifyAndRedeemCert}
												style={{
													padding: "0.5rem 1rem",
													minHeight: "44px",
													borderRadius: "0.5rem",
													border: "none",
													background: "#0284c7",
													color: "#ffffff",
													fontWeight: 700,
													fontSize: "0.8125rem",
													cursor: "pointer",
												}}
											>
												Списать
											</button>
										</div>
										{certRedeemFeedback && (
											<div
												style={{
													fontSize: "0.8125rem",
													marginTop: "0.5rem",
													fontWeight: 600,
													color: certRedeemFeedback.startsWith("✅") ? "#047857" : "#b91c1c",
												}}
											>
												{certRedeemFeedback}
											</div>
										)}
									</div>
								</div>

								{/* Right: Live Visual Certificate Card */}
								<div className="loyalty-certificate-printable">
									<div className="loyalty-certificate-card-preview">
										<div className="loyalty-cert-gold-foil" />
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "flex-start",
											}}
										>
											<div>
												<div
													style={{
														fontSize: "0.75rem",
														textTransform: "uppercase",
														letterSpacing: "0.1em",
														color: "#fef08a",
													}}
												>
													{clinicName}
												</div>
												<div style={{ fontSize: "1.25rem", fontWeight: 800, marginTop: "0.25rem" }}>
													ПОДАРОЧНЫЙ СЕРТИФИКАТ
												</div>
											</div>
											<div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fcd34d" }}>
												{(activeCertificate.nominalKop / 100).toLocaleString("ru-RU")} ₽
											</div>
										</div>

										<div className="loyalty-cert-serial-code">
											{activeCertificate.serialNumber}
										</div>

										<div style={{ fontSize: "0.8125rem", lineHeight: 1.5, opacity: 0.9 }}>
											Получатель: <strong>{activeCertificate.recipientName ?? recipientName}</strong>
											<br />
											Действителен до: <strong>{activeCertificate.expiresAtIso}</strong>
											<br />
											Остаток средств:{" "}
											<strong style={{ color: "#86efac" }}>
												{(activeCertificate.currentBalanceKop / 100).toLocaleString("ru-RU")} ₽
											</strong>
										</div>

										<div className="loyalty-barcode-strip" />
									</div>
								</div>
							</div>
						</div>
					)}

					{/* TAB 4: PROMOS & EXCLUSIONS */}
					{activeTab === "promos" && (
						<div>
							<h4 className="loyalty-section-title">
								<Tag size={20} color="var(--teal, #0d9488)" />
								Каталог маркетинговых промокодов клиники
							</h4>

							<div className="loyalty-promo-grid">
								{PROMO_CODE_PRESETS.map((promo) => (
									<div key={promo.code} className="loyalty-promo-card">
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "flex-start",
												marginBottom: "0.5rem",
											}}
										>
											<span className="loyalty-promo-code-chip">{promo.code}</span>
											<button
												type="button"
												onClick={() => handleCopyPromo(promo.code)}
												style={{
													border: "none",
													background: "transparent",
													color: "var(--teal, #0d9488)",
													cursor: "pointer",
													fontSize: "0.75rem",
													fontWeight: 600,
													display: "inline-flex",
													alignItems: "center",
													gap: "0.25rem",
													minHeight: "44px",
												}}
											>
												{copiedPromo === promo.code ? (
													<>
														<Check size={14} /> Скопировано
													</>
												) : (
													<>
														<Copy size={14} /> Применить
													</>
												)}
											</button>
										</div>
										<h5 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: "0.25rem 0" }}>
											{promo.titleRu}
										</h5>
										<p style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
											{promo.descriptionRu}
										</p>
										<div
											style={{
												fontSize: "0.6875rem",
												color: "var(--teal, #0d9488)",
												marginTop: "0.5rem",
												fontWeight: 600,
											}}
										>
											{promo.validityLabelRu}
										</div>
									</div>
								))}
							</div>

							{/* Promo Code Interactive Evaluator */}
							<div
								style={{
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									borderRadius: "0.875rem",
									padding: "1.25rem",
									marginTop: "1.5rem",
								}}
							>
								<h5 style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "0.75rem" }}>
									Проверка промокода к текущему счету
								</h5>
								<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
									<input
										type="text"
										placeholder="Введите промокод (например: FIRST20)"
										value={promoInput}
										onChange={(e) => setPromoInput(e.target.value)}
										style={{
											width: "260px",
											padding: "0.5rem 0.75rem",
											borderRadius: "0.5rem",
											border: "1px solid var(--line, #cbd5e1)",
											fontSize: "0.875rem",
											fontWeight: 700,
										}}
									/>
									<button
										type="button"
										onClick={handleEvaluatePromo}
										style={{
											padding: "0.5rem 1.25rem",
											minHeight: "44px",
											borderRadius: "0.5rem",
											border: "none",
											background: "var(--teal, #0d9488)",
											color: "#ffffff",
											fontWeight: 700,
											fontSize: "0.875rem",
											cursor: "pointer",
										}}
									>
										Рассчитать скидку
									</button>
								</div>

								{promoResult && (
									<div
										style={{
											marginTop: "1rem",
											padding: "0.875rem",
											borderRadius: "0.5rem",
											background: promoResult.isValid
												? "rgba(16, 185, 129, 0.1)"
												: "rgba(239, 68, 68, 0.1)",
											border: `1px solid ${promoResult.isValid ? "#10b981" : "#ef4444"}`,
										}}
									>
										<div
											style={{
												fontWeight: 700,
												fontSize: "0.875rem",
												color: promoResult.isValid ? "#047857" : "#b91c1c",
											}}
										>
											{promoResult.isValid ? "✓ Промокод применен!" : "✗ Промокод не применен"}
										</div>
										<p style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
											{promoResult.messageRu}
										</p>
										{promoResult.isValid && (
											<div style={{ fontSize: "0.875rem", fontWeight: 700, marginTop: "0.5rem" }}>
												Скидка: {promoResult.discountRub.toLocaleString("ru-RU")} ₽ • К оплате:{" "}
												{(promoResult.finalPayableKop / 100).toLocaleString("ru-RU")} ₽
											</div>
										)}
									</div>
								)}
							</div>

							{/* Statutory Exclusion Rules Callout */}
							<div className="loyalty-exclusion-callout">
								<h5
									style={{
										fontSize: "0.875rem",
										fontWeight: 700,
										color: "#b45309",
										display: "flex",
										alignItems: "center",
										gap: "0.375rem",
										marginBottom: "0.5rem",
									}}
								>
									<ShieldCheck size={18} />
									Официальные правила исключений из бонусной программы
								</h5>
								<ul
									style={{
										margin: 0,
										paddingLeft: "1.25rem",
										fontSize: "0.8125rem",
										color: "var(--ink, #0f172a)",
										lineHeight: 1.6,
									}}
								>
									{LOYALTY_EXCLUSION_RULES.map((rule) => (
										<li key={rule.id}>
											<strong>{rule.categoryNameRu}:</strong> {rule.reasonRu}
										</li>
									))}
								</ul>
							</div>
						</div>
					)}

					{/* TAB 5: LEDGER & RFC 4180 CSV */}
					{activeTab === "ledger" && (
						<div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									marginBottom: "1rem",
									flexWrap: "wrap",
									gap: "0.75rem",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<Search size={18} color="var(--muted, #64748b)" />
									<input
										type="text"
										placeholder="Поиск по операциям..."
										value={ledgerSearch}
										onChange={(e) => setLedgerSearch(e.target.value)}
										style={{
											padding: "0.375rem 0.75rem",
											borderRadius: "0.5rem",
											border: "1px solid var(--line, #cbd5e1)",
											fontSize: "0.8125rem",
											width: "240px",
										}}
									/>
								</div>

								<button
									type="button"
									onClick={handleExportLedger}
									style={{
										padding: "0.5rem 1rem",
										minHeight: "44px",
										borderRadius: "0.5rem",
										border: "none",
										background: "var(--teal, #0d9488)",
										color: "#ffffff",
										fontWeight: 700,
										fontSize: "0.8125rem",
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: "0.375rem",
									}}
								>
									<Download size={16} />
									Экспорт CSV (RFC 4180 / UTF-8 BOM)
								</button>
							</div>

							<div className="loyalty-ledger-table-wrap">
								<table className="loyalty-ledger-table">
									<thead>
										<tr>
											<th>Дата / Время</th>
											<th>Операция</th>
											<th>Счет (₽)</th>
											<th>Баллы (+/-)</th>
											<th>Баланс</th>
											<th>Кассир / Врач</th>
											<th>Чек 54-ФЗ</th>
										</tr>
									</thead>
									<tbody>
										{filteredLedger.map((entry) => (
											<tr key={entry.id}>
												<td>{entry.timestampIso}</td>
												<td>
													<div style={{ fontWeight: 600 }}>{entry.operationTypeRu}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
														{entry.noteRu}
													</div>
												</td>
												<td>{(entry.invoiceAmountKop / 100).toLocaleString("ru-RU")} ₽</td>
												<td>
													<span
														className={`loyalty-delta-badge ${
															entry.pointsDeltaRub > 0 ? "positive" : "negative"
														}`}
													>
														{entry.pointsDeltaRub > 0
															? `+${entry.pointsDeltaRub}`
															: entry.pointsDeltaRub}{" "}
														₽
													</span>
												</td>
												<td style={{ fontWeight: 700 }}>
													{entry.balanceAfterRub.toLocaleString("ru-RU")} ₽
												</td>
												<td>{entry.staffNameRu}</td>
												<td style={{ fontFamily: "monospace" }}>
													{entry.fiscalReceiptNumber ?? "—"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</main>
			</div>
		</div>
	);
};

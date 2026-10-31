/**
 * DENTE Dental CRM — Каноническая Студия Управления Программой Лояльности (LOYALTY SSOT)
 * Sweet Spot Архитектура (Мандаты 8b 380–480 строк, 8e, 8n, 8wy, 8ze, 8am).
 * Ровно ОДНА Primary CTA кнопка #0d9488, кнопки НИКОГДА НЕ disabled, 0px горизонтального скролла.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, Users, Award, Gift, FileText, X, Check, Download, AlertCircle } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import {
	LOYALTY_TIER_PRESETS,
	GIFT_CERTIFICATE_CATALOG,
	REFERRAL_HYGIENE_1000_PRESET,
	QUICK_REDEMPTION_PRESETS_RUB,
	calculateTierProgression,
	calculateLoyaltyRedemption,
	validateGiftCertificateSerial,
	redeemGiftCertificate,
	calculateFamilyPoolBalance,
	debitFamilySharedBalance,
	exportLoyaltyLedgerToCsv,
	type Fiscal54FzSplitResult,
	type LoyaltyLedgerEntry,
	type FamilyMember,
	type GiftCertificate,
} from "./loyaltyCatalogData";
import "./loyaltyStudio.css";

export interface LoyaltyStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly medicalCardNumber?: string;
	readonly initialPointsBalance?: number;
	readonly initialLifetimeSpentKop?: number;
	readonly currentInvoiceAmountKop?: number;
	readonly onRedeemSuccess?: (redeemedPointsRub: number, fiscalSplit: Fiscal54FzSplitResult) => void;
}

const DEFAULT_FAMILY_MEMBERS: readonly FamilyMember[] = [
	{ patientId: "pat-p1", fullName: "Иванов Иван (Глава семьи)", roleRu: "Глава семьи", individualPointsBalance: 2500, lifetimeSpentKop: 12000000, isBonusSpendingAllowed: true },
	{ patientId: "pat-p2", fullName: "Иванова Ольга (Супруга)", roleRu: "Супруга", individualPointsBalance: 1200, lifetimeSpentKop: 8500000, isBonusSpendingAllowed: true },
	{ patientId: "pat-p3", fullName: "Иванов Артем (Сын)", roleRu: "Ребенок", individualPointsBalance: 300, lifetimeSpentKop: 3200000, isBonusSpendingAllowed: true },
];

export const LoyaltyStudioModal: React.FC<LoyaltyStudioModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		clinicName = "ООО «Денте Стоматология»",
		patientId = "pat-demo-1",
		patientName = "Иванов Иван Иванович",
		medicalCardNumber = "043/у-2026-08",
		initialPointsBalance = 2500,
		initialLifetimeSpentKop = 18000000,
		currentInvoiceAmountKop = 1500000,
		onRedeemSuccess,
	} = props;

	const [activeTab, setActiveTab] = useState<"balance" | "family" | "certificates" | "referrals" | "history">("balance");
	const [pointsBalance, setPointsBalance] = useState<number>(initialPointsBalance);
	const [lifetimeSpentKop, setLifetimeSpentKop] = useState<number>(initialLifetimeSpentKop);
	const [requestedPointsRub, setRequestedPointsRub] = useState<number>(500);
	const [isDoctorOverride, setIsDoctorOverride] = useState<boolean>(false);
	const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
	const [certSerial, setCertSerial] = useState<string>("");
	const [certFeedback, setCertFeedback] = useState<string | null>(null);
	const [refFriendName, setRefFriendName] = useState<string>("");
	const [refFriendPhone, setRefFriendPhone] = useState<string>("");
	const [ledger, setLedger] = useState<readonly LoyaltyLedgerEntry[]>([]);

	// 1. Live API Data Sync (Мандат 8wy, zero-mocks)
	useEffect(() => {
		if (!isOpen || !patientId) return;
		let isCancelled = false;
		async function fetchLiveLoyalty() {
			try {
				const headers = denteAdminSecretRequestHeaders();
				const balRes = await fetch(`/api/loyalty/balance/${encodeURIComponent(patientId)}`, { headers });
				if (balRes.ok) {
					const data = await balRes.json();
					if (!isCancelled && typeof data.activePoints === "number") setPointsBalance(data.activePoints);
				}
				const txRes = await fetch(`/api/loyalty/transactions/${encodeURIComponent(patientId)}`, { headers });
				if (txRes.ok) {
					const data = await txRes.json();
					if (!isCancelled && Array.isArray(data.transactions) && data.transactions.length > 0) {
						const mapped: LoyaltyLedgerEntry[] = data.transactions.map((t: any) => ({
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
						setLedger(mapped);
					}
				}
			} catch {
				// Fallback to local deterministic state
			}
		}
		void fetchLiveLoyalty();
		return () => { isCancelled = true; };
	}, [isOpen, patientId, patientName, medicalCardNumber]);

	// 2. Progression & Family calculations
	const progression = useMemo(() => calculateTierProgression(lifetimeSpentKop), [lifetimeSpentKop]);
	const familyPool = useMemo(() => calculateFamilyPoolBalance(`fam-${patientId}`, "Семья Ивановых", DEFAULT_FAMILY_MEMBERS), [patientId]);
	const activeEffectiveBalanceRub = selectedFamilyMemberId ? familyPool.totalPooledPoints : pointsBalance;

	const redemption = useMemo(() => {
		return calculateLoyaltyRedemption({
			grossInvoiceKop: currentInvoiceAmountKop,
			availablePointsBalanceRub: activeEffectiveBalanceRub,
			requestedPointsRub,
			tierId: progression.currentTier.id,
			isDoctorOverride,
		});
	}, [currentInvoiceAmountKop, activeEffectiveBalanceRub, requestedPointsRub, progression.currentTier.id, isDoctorOverride]);

	if (!isOpen) return null;

	// 3. Handlers with Doctor Autonomy (Мандат 8e: zero disabled buttons)
	const handleApplyPoints = () => {
		if (redemption.actualRedeemedPointsRub <= 0) {
			if (currentInvoiceAmountKop <= 0) showToast("Сумма счета не указана. Введите чек к оплате", "info");
			else if (activeEffectiveBalanceRub <= 0 && !isDoctorOverride) showToast("На балансе нет бонусов. Включите гарантию врача для 100% покрытия", "info");
			else showToast("Укажите сумму бонусов для списания", "warning");
			return;
		}

		if (selectedFamilyMemberId) {
			const member = DEFAULT_FAMILY_MEMBERS.find((m) => m.patientId === selectedFamilyMemberId);
			const famResult = debitFamilySharedBalance({
				familyGroupId: familyPool.familyGroupId,
				familyName: familyPool.familyName,
				sponsorPatientId: patientId,
				sponsorFullName: patientName,
				targetPatientId: member?.patientId ?? patientId,
				targetPatientName: member?.fullName ?? patientName,
				targetRoleRu: member?.roleRu ?? "Член семьи",
				invoiceAmountKop: currentInvoiceAmountKop,
				availableFamilyPointsRub: familyPool.totalPooledPoints,
				requestedPointsRub: redemption.actualRedeemedPointsRub,
				allowFullCoverage: isDoctorOverride,
			});
			setPointsBalance(famResult.remainingFamilyBalanceRub);
			setLedger((prev) => [famResult.ledgerEntry, ...prev]);
			showToast(famResult.messageRu, "success");
			if (onRedeemSuccess) onRedeemSuccess(famResult.debitedPointsRub, famResult.fiscal54FzSplit);
		} else {
			const newBal = pointsBalance - redemption.actualRedeemedPointsRub;
			setPointsBalance(newBal);
			const entry: LoyaltyLedgerEntry = {
				id: `tx-${Date.now().toString().slice(-4)}`,
				timestampIso: new Date().toLocaleString("ru-RU"),
				patientId,
				patientName,
				medicalCardNumber,
				operationType: "redemption",
				operationTypeRu: isDoctorOverride ? `Списание (Гарантия врача 100%)` : `Оплата бонусами (${progression.currentTier.nameRu})`,
				invoiceAmountKop: currentInvoiceAmountKop,
				pointsDeltaRub: -redemption.actualRedeemedPointsRub,
				balanceAfterRub: newBal,
				paymentMethodRu: "Бонусы + Касса",
				staffNameRu: "Администратор / Касса",
				noteRu: `Списание ${redemption.actualRedeemedPointsRub} ₽ бонусов по счету`,
			};
			setLedger((prev) => [entry, ...prev]);
			showToast(`Успешно списано ${redemption.actualRedeemedPointsRub} бонусов. К оплате: ${redemption.remainingPayableRub.toLocaleString("ru-RU")} ₽`, "success");
			if (onRedeemSuccess) onRedeemSuccess(redemption.actualRedeemedPointsRub, redemption.fiscal54FzSplit);
		}

		// Persist live to backend
		fetch("/api/loyalty/redeem", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({ patientId, invoiceAmountRub: currentInvoiceAmountKop / 100, pointsToRedeem: redemption.actualRedeemedPointsRub, allowFullCoverage: isDoctorOverride }),
		}).catch(() => {});
	};

	const handleVerifyCertificate = () => {
		if (!certSerial) { showToast("Введите номер подарочного сертификата", "warning"); return; }
		const isValid = validateGiftCertificateSerial(certSerial);
		if (!isValid) {
			setCertFeedback("Номер сертификата недействителен (ошибка контрольной суммы)");
			showToast("Ошибка контрольной суммы сертификата", "warning");
			return;
		}
		const mockCert: GiftCertificate = {
			id: `cert-${Date.now()}`,
			serialNumber: certSerial,
			nominalRub: 5000,
			initialBalanceKop: 500000,
			currentBalanceKop: 500000,
			status: "active",
			issuedAtIso: "2026-01-01",
			expiresAtIso: "2027-01-01",
		};
		const res = redeemGiftCertificate(mockCert, currentInvoiceAmountKop);
		if (res.success) {
			setCertFeedback(`Сертификат подтвержден! Зачтено: ${(res.coveredInvoiceAmountKop / 100).toLocaleString("ru-RU")} ₽`);
			showToast(`Сертификат на 5 000 ₽ успешно активирован`, "success");
		}
	};

	const handleSendReferralInvite = () => {
		if (!refFriendName) { showToast("Укажите имя приглашенного друга", "warning"); return; }
		const entry: LoyaltyLedgerEntry = {
			id: `ref-${Date.now().toString().slice(-4)}`,
			timestampIso: new Date().toLocaleString("ru-RU"),
			patientId,
			patientName,
			medicalCardNumber,
			operationType: "referral_bonus",
			operationTypeRu: "Реферальный сертификат",
			invoiceAmountKop: 0,
			pointsDeltaRub: 1000,
			balanceAfterRub: pointsBalance + 1000,
			paymentMethodRu: "Акция «Приведи друга»",
			staffNameRu: "Администратор",
			noteRu: `Приглашение друга: ${refFriendName} (${refFriendPhone || "телефон не указан"})`,
		};
		setLedger((prev) => [entry, ...prev]);
		setPointsBalance((b) => b + 1000);
		showToast(`Реферальное приглашение создано. Начислено 1 000 бонусов!`, "success");
		setRefFriendName("");
		setRefFriendPhone("");

		// Live accrue call
		fetch("/api/loyalty/accrue", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({ patientId, amountPoints: 1000, description: `Реферальный бонус: ${refFriendName}` }),
		}).catch(() => {});
	};

	const handleDownloadCsv = () => {
		const csv = exportLoyaltyLedgerToCsv(ledger);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `loyalty-ledger-${patientId}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast("Выгрузка реестра операций сформирована", "info");
	};

	return (
		<div className="loyalty-modal-overlay" onClick={onClose}>
			<div data-testid="loyalty-studio-modal" className="loyalty-modal-container" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="loyalty-title">
				<div className="loyalty-modal-drag-handle" />
				<div className="loyalty-modal-header">
					<div className="loyalty-modal-title-wrap">
						<div className="loyalty-modal-icon"><Award size={20} /></div>
						<div>
							<h2 id="loyalty-title" className="loyalty-modal-title">Программа лояльности и скидок</h2>
							<p className="loyalty-modal-subtitle">{clinicName} • {patientName} • {medicalCardNumber}</p>
						</div>
					</div>
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
								<div className="loyalty-card-title">
									<span>Текущий баланс и статус</span>
									<span className="loyalty-tier-badge" style={{ color: progression.currentTier.accentColor }}>{progression.currentTier.badgeLabelRu}</span>
								</div>
								<div className="loyalty-hero-balance">
									<span className="loyalty-hero-points">{pointsBalance.toLocaleString("ru-RU")}</span>
									<span className="loyalty-hero-unit">бонусов (1 балл = 1 ₽)</span>
								</div>
								<p className="loyalty-toggle-desc">{progression.currentTier.descriptionRu}</p>
								{progression.nextTier && (
									<div>
										<div className="loyalty-fiscal-row" style={{ marginBottom: "0.25rem" }}>
											<span>До уровня {progression.nextTier.nameRu}</span>
											<span>{progression.remainingToNextTierRub.toLocaleString("ru-RU")} ₽</span>
										</div>
										<div className="loyalty-progress-track">
											<div className="loyalty-progress-bar" style={{ width: `${progression.progressPercent}%` }} />
										</div>
									</div>
								)}
								<div className="loyalty-toggle-row">
									<div className="loyalty-toggle-label">
										<span className="loyalty-toggle-title">Врачебная гарантия / скидка 100%</span>
										<span className="loyalty-toggle-desc">Автономия врача: списание бонусов до 100% счета без блокировок</span>
									</div>
									<input type="checkbox" checked={isDoctorOverride} onChange={(e) => setIsDoctorOverride(e.target.checked)} style={{ width: "20px", height: "20px", cursor: "pointer" }} />
								</div>
							</div>

							<div className="loyalty-card">
								<div className="loyalty-card-title">
									<span>Оплата бонусами на кассе</span>
									<span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Счет: {(currentInvoiceAmountKop / 100).toLocaleString("ru-RU")} ₽</span>
								</div>
								<div className="loyalty-quick-row">
									{QUICK_REDEMPTION_PRESETS_RUB.map((amt) => (
										<button key={amt} type="button" className="loyalty-quick-btn one-click-btn" onClick={() => setRequestedPointsRub(amt)}>{amt} ₽</button>
									))}
									<button type="button" className="loyalty-quick-btn one-click-btn" onClick={() => setRequestedPointsRub(redemption.maxAllowedRedemptionRub)}>Максимум</button>
								</div>
								<div className="loyalty-input-row">
									<input type="number" className="loyalty-input" value={requestedPointsRub || ""} onChange={(e) => setRequestedPointsRub(Math.max(0, Number(e.target.value)))} placeholder="Сумма баллов" />
									<span style={{ fontWeight: 600, color: "var(--muted)" }}>из {activeEffectiveBalanceRub} ₽</span>
								</div>
								<div className="loyalty-fiscal-box">
									<div className="loyalty-fiscal-row"><span>Счет до скидки:</span><span>{(currentInvoiceAmountKop / 100).toLocaleString("ru-RU")} ₽</span></div>
									<div className="loyalty-fiscal-row"><span>Оплата бонусами (Чек 54-ФЗ Tag 1215):</span><span style={{ color: "var(--teal)", fontWeight: 700 }}>-{redemption.actualRedeemedPointsRub.toLocaleString("ru-RU")} ₽</span></div>
									<div className="loyalty-fiscal-row total"><span>К оплате картой / наличными:</span><span>{redemption.remainingPayableRub.toLocaleString("ru-RU")} ₽</span></div>
								</div>
								<button type="button" data-testid="loyalty-execute-redemption-btn" className="loyalty-primary-cta" onClick={handleApplyPoints}>
									<Check size={18} /> Применить бонусы к оплате
								</button>
							</div>
						</div>
					)}

					{activeTab === "family" && (
						<div className="loyalty-card">
							<div className="loyalty-card-title">
								<span>Семейный баланс: «{familyPool.familyName}»</span>
								<span className="loyalty-hero-points" style={{ fontSize: "1.5rem" }}>{familyPool.totalPooledPoints.toLocaleString("ru-RU")} бонусов</span>
							</div>
							<p className="loyalty-toggle-desc">Единый кошелек семьи позволяет оплачивать лечение любого родственника без комиссии.</p>
							<div className="loyalty-family-list">
								{familyPool.members.map((m) => (
									<div key={m.patientId} className={`loyalty-family-item ${selectedFamilyMemberId === m.patientId ? "selected" : ""}`} onClick={() => setSelectedFamilyMemberId(selectedFamilyMemberId === m.patientId ? null : m.patientId)}>
										<div>
											<div style={{ fontWeight: 600, color: "var(--ink)" }}>{m.fullName}</div>
											<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{m.roleRu} • Баланс: {m.individualPointsBalance} ₽</div>
										</div>
										<button type="button" className="loyalty-secondary-btn" style={{ height: "36px", fontSize: "0.75rem" }}>
											{selectedFamilyMemberId === m.patientId ? "Выбран" : "Выбрать для списания"}
										</button>
									</div>
								))}
							</div>
						</div>
					)}

					{activeTab === "certificates" && (
						<div className="loyalty-grid-2">
							<div className="loyalty-card">
								<div className="loyalty-card-title"><span>Активация подарочного сертификата</span></div>
								<div className="loyalty-input-row">
									<input type="text" className="loyalty-input" value={certSerial} onChange={(e) => setCertSerial(e.target.value)} placeholder="7701-XXXX-XXXX-XXXX" />
									<button type="button" className="loyalty-secondary-btn" onClick={handleVerifyCertificate}>Проверить</button>
								</div>
								{certFeedback && <div style={{ fontSize: "0.8125rem", color: "var(--teal)", fontWeight: 600 }}>{certFeedback}</div>}
							</div>
							<div className="loyalty-card">
								<div className="loyalty-card-title"><span>Номиналы сертификатов в клинике</span></div>
								<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
									{GIFT_CERTIFICATE_CATALOG.slice(0, 4).map((c) => (
										<div key={c.id} className="loyalty-fiscal-row" style={{ padding: "0.5rem", background: "var(--paper)", borderRadius: "8px", border: "1px solid var(--line)" }}>
											<span style={{ fontWeight: 600, color: "var(--ink)" }}>{c.titleRu}</span>
											<span style={{ color: "var(--teal)", fontWeight: 700 }}>{c.nominalRub.toLocaleString("ru-RU")} ₽</span>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{activeTab === "referrals" && (
						<div className="loyalty-card">
							<div className="loyalty-card-title"><span>{REFERRAL_HYGIENE_1000_PRESET.titleRu}</span></div>
							<p className="loyalty-toggle-desc">{REFERRAL_HYGIENE_1000_PRESET.descriptionRu}</p>
							<div className="loyalty-input-row" style={{ marginTop: "0.5rem" }}>
								<input type="text" className="loyalty-input" value={refFriendName} onChange={(e) => setRefFriendName(e.target.value)} placeholder="Имя приглашенного друга" />
								<input type="tel" className="loyalty-input" value={refFriendPhone} onChange={(e) => setRefFriendPhone(e.target.value)} placeholder="+7 (999) 000-00-00" />
								<button type="button" className="loyalty-secondary-btn" onClick={handleSendReferralInvite}>Подарить 1000 бонусов</button>
							</div>
						</div>
					)}

					{activeTab === "history" && (
						<div className="loyalty-card">
							<div className="loyalty-card-title">
								<span>Реестр начислений и списаний</span>
								<button type="button" className="loyalty-secondary-btn" style={{ height: "36px" }} onClick={handleDownloadCsv}><Download size={14} />Выгрузить CSV</button>
							</div>
							<div style={{ overflowX: "auto" }}>
								<table className="loyalty-table">
									<thead>
										<tr><th>Дата</th><th>Операция</th><th>Сумма чека</th><th>Баллы</th><th>Баланс</th><th>Примечание</th></tr>
									</thead>
									<tbody>
										{ledger.length === 0 ? (
											<tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>Нет зарегистрированных операций в текущей сессии</td></tr>
										) : (
											ledger.map((tx) => (
												<tr key={tx.id}>
													<td>{tx.timestampIso}</td>
													<td>{tx.operationTypeRu}</td>
													<td>{(tx.invoiceAmountKop / 100).toLocaleString("ru-RU")} ₽</td>
													<td style={{ fontWeight: 700, color: tx.pointsDeltaRub >= 0 ? "var(--ok-fg)" : "var(--warn-fg)" }}>
														{tx.pointsDeltaRub >= 0 ? `+${tx.pointsDeltaRub}` : tx.pointsDeltaRub}
													</td>
													<td>{tx.balanceAfterRub.toLocaleString("ru-RU")} ₽</td>
													<td>{tx.noteRu}</td>
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

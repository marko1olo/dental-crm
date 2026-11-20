/**
 * DENTE Dental CRM — Каноническая Студия Управления Программой Лояльности (LOYALTY SSOT)
 * Sweet Spot Архитектура (Мандаты 8b <= 250 строк, 8e, 8n, 8wy, 8ze, 8am, 8bm).
 * Ровно ОДНА Primary CTA кнопка #0d9488, кнопки НИКОГДА НЕ disabled, 0px горизонтального скролла.
 */

import React from "react";
import { Sparkles, Users, Award, Gift, FileText, X, Check, Download, Plus, Copy, QrCode } from "lucide-react";
import {
	GIFT_CERTIFICATE_CATALOG, REFERRAL_HYGIENE_1000_PRESET, QUICK_REDEMPTION_PRESETS_RUB,
	formatKopecksToRubles, type Fiscal54FzSplitResult,
} from "./loyaltyCatalogData";
import { useLoyaltyStudioState } from "./useLoyaltyStudioState";
import "./loyaltyStudio.css";

export interface LoyaltyStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly initialPointsBalance?: number | undefined;
	readonly initialLifetimeSpentKop?: number | undefined;
	readonly currentInvoiceAmountKop?: number | undefined;
	readonly onRedeemSuccess?: ((redeemedPointsRub: number, fiscalSplit: Fiscal54FzSplitResult) => void) | undefined;
}

export const LoyaltyStudioModal: React.FC<LoyaltyStudioModalProps> = (props) => {
	const {
		isOpen, onClose, clinicName = "ООО «Денте Стоматология»", patientId,
		patientName = "Пациент", medicalCardNumber = "№ —", currentInvoiceAmountKop = 0,
	} = props;

	const state = useLoyaltyStudioState(props);

	if (!isOpen) return null;
	if (!patientId) {
		return (
			<div className="loyalty-modal-overlay" onClick={onClose}>
				<div data-testid="loyalty-studio-modal" className="loyalty-modal-container" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="loyalty-title">
					<div className="loyalty-modal-drag-handle" />
					<div className="loyalty-modal-header">
						<div className="loyalty-modal-title-wrap">
							<div className="loyalty-modal-icon"><Award size={20} /></div>
							<div>
								<h2 id="loyalty-title" className="loyalty-modal-title">Программа лояльности и скидок</h2>
								<p className="loyalty-modal-subtitle">{clinicName} • Карточка не выбрана</p>
							</div>
						</div>
						<button type="button" className="loyalty-close-btn" onClick={onClose} aria-label="Закрыть"><X size={18} /></button>
					</div>
					<div className="loyalty-modal-body" style={{ alignItems: "center", justifyContent: "center", padding: "4rem 1.5rem" }}>
						<div className="loyalty-family-empty-state">
							<div className="loyalty-empty-icon-wrap"><Users size={32} /></div>
							<div className="loyalty-empty-text-wrap">
								<h3 className="loyalty-empty-title">Пациент не выбран</h3>
								<p className="loyalty-toggle-desc" style={{ maxWidth: "480px", textAlign: "center" }}>Для просмотра баланса бонусов и семейного счета выберите пациента в расписании или картотеке.</p>
							</div>
							<button type="button" className="loyalty-secondary-btn" onClick={onClose}>Закрыть окно</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="loyalty-modal-overlay" onClick={onClose}>
			<div data-testid="loyalty-studio-modal" className="loyalty-modal-container" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="loyalty-title">
				<div className="loyalty-modal-drag-handle" />
				<div className="loyalty-modal-header">
					<div className="loyalty-modal-title-wrap">
						<div className="loyalty-modal-icon"><Award size={20} /></div>
						<div>
							<h2 id="loyalty-title" className="loyalty-modal-title">Программа лояльности и скидок</h2>
							<p className="loyalty-modal-subtitle">{clinicName} • {patientName} • Медкарта {medicalCardNumber}</p>
						</div>
					</div>
					<button type="button" className="loyalty-close-btn" onClick={onClose} aria-label="Закрыть"><X size={18} /></button>
				</div>
				<div className="loyalty-tabs-nav">
					<button type="button" className={`loyalty-tab-btn ${state.activeTab === "balance" ? "active" : ""}`} onClick={() => state.setActiveTab("balance")}><Sparkles size={16} />Баланс и бонусы</button>
					<button type="button" className={`loyalty-tab-btn ${state.activeTab === "family" ? "active" : ""}`} onClick={() => state.setActiveTab("family")}><Users size={16} />Семейный счет</button>
					<button type="button" className={`loyalty-tab-btn ${state.activeTab === "certificates" ? "active" : ""}`} onClick={() => state.setActiveTab("certificates")}><Gift size={16} />Сертификаты</button>
					<button type="button" className={`loyalty-tab-btn ${state.activeTab === "referrals" ? "active" : ""}`} onClick={() => state.setActiveTab("referrals")}><Award size={16} />Приведи друга</button>
					<button type="button" className={`loyalty-tab-btn ${state.activeTab === "history" ? "active" : ""}`} onClick={() => state.setActiveTab("history")}><FileText size={16} />История операций</button>
				</div>

				<div className="loyalty-modal-body">
					{state.activeTab === "balance" && (
						<div className="loyalty-grid-2">
							<div className="loyalty-card">
								<div className="loyalty-card-title"><span>Текущий баланс и статус</span><span className="loyalty-tier-badge" style={{ color: state.progression.currentTier.accentColor }}>{state.progression.currentTier.badgeLabelRu}</span></div>
								<div className="loyalty-hero-balance"><span className="loyalty-hero-points">{state.pointsBalance.toLocaleString("ru-RU")}</span><span className="loyalty-hero-unit">бонусов (1 балл = 1 ₽)</span></div>
								{state.nearestExpiringPoints > 0 && state.daysUntilExpiration !== null && (<div className="loyalty-expiring-badge"><span className="loyalty-expiring-dot" /><span>Сгорит {state.nearestExpiringPoints} бонусов через {state.daysUntilExpiration} дн. ({new Date(state.nearestExpirationDate || "").toLocaleDateString("ru-RU")})</span></div>)}
								{state.lifetimeExpiredPoints > 0 && (<div className="loyalty-expired-stat">Сгорело по сроку за всё время: {state.lifetimeExpiredPoints.toLocaleString("ru-RU")} бонусов</div>)}
								<p className="loyalty-toggle-desc">{state.progression.currentTier.descriptionRu}</p>
								<div style={{ display: "flex", gap: "0.5rem" }}><button type="button" className="loyalty-secondary-btn" onClick={() => state.setIsAccrueOpen(!state.isAccrueOpen)}><Plus size={16} /> Начислить бонусы</button></div>
								{state.isAccrueOpen && (
									<div className="loyalty-input-row" style={{ marginTop: "0.25rem" }}>
										<input type="number" className="loyalty-input" value={state.accrueInputRub} onChange={(e) => state.setAccrueInputRub(e.target.value)} placeholder="Сумма баллов (напр. 500)" /><button type="button" className="loyalty-secondary-btn" onClick={state.handleAccruePoints}>Начислить</button>
									</div>
								)}
								{state.progression.nextTier && (
									<div><div className="loyalty-fiscal-row" style={{ marginBottom: "0.25rem" }}><span>До уровня {state.progression.nextTier.nameRu}</span><span>{formatKopecksToRubles(state.progression.remainingToNextTierKop)}</span></div><div className="loyalty-progress-track"><div className="loyalty-progress-bar" style={{ width: `${state.progression.progressPercent}%` }} /></div></div>
								)}
								<div className="loyalty-toggle-row">
									<div className="loyalty-toggle-label"><span className="loyalty-toggle-title">Врачебная гарантия / скидка 100%</span><span className="loyalty-toggle-desc">Автономия врача: списание бонусов до 100% счета без блокировок</span></div>
									<input type="checkbox" checked={state.isDoctorOverride} onChange={(e) => state.setIsDoctorOverride(e.target.checked)} style={{ width: "20px", height: "20px", cursor: "pointer" }} />
								</div>
							</div>
							<div className="loyalty-card">
								<div className="loyalty-card-title"><span>Оплата бонусами на кассе</span><span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Счет: {formatKopecksToRubles(currentInvoiceAmountKop)}</span></div>
								<div className="loyalty-quick-row">{QUICK_REDEMPTION_PRESETS_RUB.map((amt) => (<button key={amt} type="button" className="loyalty-quick-btn" onClick={() => state.setRequestedPointsRub(amt)}>{amt} ₽</button>))}<button type="button" className="loyalty-quick-btn" onClick={() => state.setRequestedPointsRub(state.redemption.maxAllowedRedemptionRub)}>Максимум</button></div>
								<div className="loyalty-input-row"><input type="number" className="loyalty-input" value={state.requestedPointsRub || ""} onChange={(e) => state.setRequestedPointsRub(Math.max(0, Number(e.target.value)))} placeholder="Сумма баллов" /><span style={{ fontWeight: 600, color: "var(--muted)" }}>из {state.activeEffectiveBalanceRub} ₽</span></div>
								<div className="loyalty-fiscal-box">
									<div className="loyalty-fiscal-row"><span>Счет до скидки:</span><span>{formatKopecksToRubles(currentInvoiceAmountKop)}</span></div>
									<div className="loyalty-fiscal-row"><span>Оплата бонусами (Чек кассы):</span><span style={{ color: "var(--teal)", fontWeight: 700 }}>-{state.redemption.actualRedeemedPointsRub.toLocaleString("ru-RU")} ₽</span></div>
									<div className="loyalty-fiscal-row total"><span>К оплате картой / наличными:</span><span>{formatKopecksToRubles(state.redemption.remainingPayableKop)}</span></div>
								</div>
								<button type="button" data-testid="loyalty-execute-redemption-btn" className="loyalty-primary-cta" onClick={state.handleApplyPoints}><Check size={18} /> Применить бонусы к оплате</button>
							</div>
						</div>
					)}

					{state.activeTab === "family" && (
						<div className="loyalty-card">
							{state.hasFamilyGroup && state.familyMembers.length > 0 ? (
								<>
									<div className="loyalty-card-title"><span>Семейный баланс: «{state.familyPool.familyName}»</span><span className="loyalty-hero-points" style={{ fontSize: "1.5rem" }}>{state.familyPool.totalPooledPoints.toLocaleString("ru-RU")} бонусов</span></div>
									<p className="loyalty-toggle-desc">Единый кошелек семьи позволяет оплачивать лечение любого родственника без комиссии.</p>
									<div className="loyalty-family-list">
										{state.familyPool.members.map((m) => (
											<div key={m.patientId} className={`loyalty-family-item ${state.selectedFamilyMemberId === m.patientId ? "selected" : ""}`} onClick={() => state.setSelectedFamilyMemberId(state.selectedFamilyMemberId === m.patientId ? null : m.patientId)}><div><div style={{ fontWeight: 600, color: "var(--ink)" }}>{m.fullName}</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{m.roleRu} • Баланс: {m.individualPointsBalance} ₽</div></div><button type="button" className="loyalty-secondary-btn" style={{ height: "36px", fontSize: "0.75rem" }}>{state.selectedFamilyMemberId === m.patientId ? "Выбран для списания" : "Выбрать для списания"}</button></div>
										))}
									</div>
									<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}><button type="button" className="loyalty-secondary-btn" onClick={() => state.setIsCreateFamilyOpen(!state.isCreateFamilyOpen)}><Plus size={16} /> Привязать родственника</button></div>
									{state.isCreateFamilyOpen && (
										<div className="loyalty-create-family-form">
											<div className="loyalty-card-title"><span>Привязка родственника</span></div>
											<div className="loyalty-input-row"><input type="text" className="loyalty-input" value={state.relativePatientIdInput} onChange={(e) => state.setRelativePatientIdInput(e.target.value)} placeholder="ID или телефон родственника" /><select className="loyalty-input" style={{ maxWidth: "180px" }} value={state.relativeRoleInput} onChange={(e) => state.setRelativeRoleInput(e.target.value)}><option value="Супруг / Супруга">Супруг / Супруга</option><option value="Ребенок">Ребенок</option><option value="Родитель">Родитель</option><option value="Член семьи">Член семьи</option></select><button type="button" className="loyalty-secondary-btn" onClick={state.handleLinkRelative}>Привязать</button></div>
										</div>
									)}
								</>
							) : (
								<div className="loyalty-family-empty-state">
									<div className="loyalty-empty-icon-wrap"><Users size={32} /></div><div className="loyalty-empty-text-wrap"><h3 className="loyalty-empty-title">Пациент не состоит в семейной группе</h3><p className="loyalty-toggle-desc" style={{ maxWidth: "480px", textAlign: "center" }}>Объедините родственников в общий семейный счет, чтобы оплачивать лечение близких с единого накопительного баланса с повышенным кэшбэком 7%.</p></div>
									{!state.isCreateFamilyOpen ? (
										<button type="button" className="loyalty-secondary-btn" onClick={() => state.setIsCreateFamilyOpen(true)}><Plus size={16} /> Создать семейный счет / Привязать родственника</button>
									) : (
										<div className="loyalty-create-family-form">
											<div className="loyalty-card-title"><span>Создание семейного счета</span></div>
											<div className="loyalty-input-row"><input type="text" className="loyalty-input" value={state.newFamilyGroupName} onChange={(e) => state.setNewFamilyGroupName(e.target.value)} placeholder={`Например: Семья ${patientName.split(" ")[0] || "Пациента"}`} /><button type="button" className="loyalty-secondary-btn" onClick={state.handleCreateFamilyGroup}>Создать группу</button></div>
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{state.activeTab === "certificates" && (
						<div className="loyalty-grid-2">
							<div className="loyalty-card">
								<div className="loyalty-card-title"><span>Активация подарочного сертификата</span></div>
								<div className="loyalty-input-row"><input type="text" className="loyalty-input" value={state.certSerial} onChange={(e) => state.setCertSerial(e.target.value)} placeholder="7701-XXXX-XXXX-XXXX" /><button type="button" className="loyalty-secondary-btn" onClick={state.handleVerifyCertificate}>Проверить</button></div>
								{state.certFeedback && <div style={{ fontSize: "0.8125rem", color: "var(--teal)", fontWeight: 600 }}>{state.certFeedback}</div>}
								{state.verifiedCertificate && state.verifiedCertificate.currentBalanceRub > 0 && (
									<div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--line)" }}>
										<button
											type="button"
											className="loyalty-primary-btn"
											style={{ width: "100%", justifyContent: "center" }}
											onClick={state.handleRedeemCertificate}
										>
											Зачесть сертификат в счёт ({formatKopecksToRubles(currentInvoiceAmountKop > 0 ? Math.min(state.verifiedCertificate.currentBalanceKop, currentInvoiceAmountKop) : state.verifiedCertificate.currentBalanceKop)})
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
											<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}><span style={{ color: "var(--teal)", fontWeight: 700 }}>{formatKopecksToRubles(c.nominalKop)}</span><button type="button" className="loyalty-secondary-btn" style={{ height: "32px", fontSize: "0.75rem", whiteSpace: "nowrap" }} onClick={() => state.handleIssueCertificate(c.nominalRub, c.titleRu)}>Оформить</button></div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{state.activeTab === "referrals" && (
						<div className="loyalty-grid-2">
							<div className="loyalty-card">
								<div className="loyalty-card-title"><span>{REFERRAL_HYGIENE_1000_PRESET.titleRu}</span></div>
								<p className="loyalty-toggle-desc">{REFERRAL_HYGIENE_1000_PRESET.descriptionRu}</p>
								<div className="loyalty-referral-link-box" style={{ marginTop: "0.5rem" }}>
									<span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)" }}>Персональная реферальная ссылка:</span>
									<div className="loyalty-input-row"><input type="text" readOnly className="loyalty-input" value={state.patientReferralLink} style={{ fontSize: "0.8125rem" }} /><button type="button" className="loyalty-secondary-btn" onClick={state.handleCopyReferralLink} title="Копировать"><Copy size={16} /></button></div>
								</div>
								<div className="loyalty-qr-card"><div className="loyalty-qr-badge"><QrCode size={36} color="var(--teal)" /></div><div><div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>QR-код рекомендации</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Пациент может отсканировать код прямо с экрана смартфона</div></div></div>
							</div>
							<div className="loyalty-card">
								<div className="loyalty-card-title"><span>Пригласить друга по SMS / WhatsApp</span></div>
								<p className="loyalty-toggle-desc">Подарите другу 1 000 бонусов на комплексную чистку зубов. При первом визите вы получите 1 000 бонусов.</p>
								<div className="loyalty-input-row" style={{ marginTop: "0.5rem" }}><input type="text" className="loyalty-input" value={state.refFriendName} onChange={(e) => state.setRefFriendName(e.target.value)} placeholder="Имя друга" /><input type="tel" className="loyalty-input" value={state.refFriendPhone} onChange={(e) => state.setRefFriendPhone(e.target.value)} placeholder="+7 (999) 000-00-00" /><button type="button" className="loyalty-secondary-btn" onClick={state.handleSendReferralInvite}>Подарить</button></div>
							</div>
						</div>
					)}

					{state.activeTab === "history" && (
						<div className="loyalty-card">
							<div className="loyalty-card-title"><span>Реестр начислений и списаний</span><button type="button" className="loyalty-secondary-btn" style={{ height: "36px" }} onClick={state.handleDownloadCsv}><Download size={14} />Выгрузить CSV</button></div>
							<div style={{ overflowX: "auto" }}>
								<table className="loyalty-table">
									<thead><tr><th>Дата</th><th>Операция</th><th>Сумма чека</th><th>Баллы</th><th>Баланс</th><th>Примечание</th></tr></thead>
									<tbody>
										{state.ledger.length === 0 ? (
											<tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>Нет зарегистрированных операций в текущей сессии</td></tr>
										) : (
											state.ledger.map((tx) => (
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

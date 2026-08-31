/**
 * Treatment Plan Multi-Variant Comparator & Patient Presentation Studio Modal
 * (DOMAIN: PLAN COMPARATOR)
 *
 * Интерактивная 3-колоночная студия презентации планов лечения пациенту:
 * - Наглядное сравнение вариантов (Премиум / Стандартный / Базовый)
 * - Дифференциальный анализ стоимости и долговечности
 * - Интерактивный таймлайн клинических этапов
 * - График платежей (скидка 5%, этапы 30/40/30, рассрочка 0-0-12/24, вычет НДФЛ 13%)
 * - 1-Click печать персональной презентационной брошюры для пациента
 * - Зафиксированный подвал (sticky bottom-0) с кнопками «Согласовать план», «Рассрочка», «Печать договора»
 */

import type React from "react";
import { useMemo, useState } from "react";
import {
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	CreditCard,
	FileText,
	HeartPulse,
	HelpCircle,
	Percent,
	Printer,
	Shield,
	Sparkles,
	Star,
	TrendingUp,
	Wallet,
	X,
} from "lucide-react";
import {
	DEFAULT_TREATMENT_PLAN_PRESETS,
	type ComprehensivePlanVariant,
	type PlanTierCode,
} from "./planPresentationPresets";
import {
	calculatePlanDifferential,
	generate3TierComparisonSummary,
	generatePaymentSchedules,
	getPlanCategoryBreakdown,
} from "./planComparatorEngine";
import "./planComparator.css";

export interface TreatmentPlanComparatorModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly customVariants?: Readonly<Record<PlanTierCode, ComprehensivePlanVariant>> | undefined;
	readonly onPlanSelected?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
	readonly onApproveAndSign?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
	readonly onOpenInstallment?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
	readonly onPrintContract?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
}

export const TreatmentPlanComparatorModal: React.FC<TreatmentPlanComparatorModalProps> = ({
	isOpen = true,
	onClose,
	patientName = "Иванов Иван Иванович",
	doctorName = "Д-р Смирнов А. В. (Хирург-имплантолог, Ортопед)",
	clinicName = "Стоматологическая клиника DENTE",
	customVariants,
	onPlanSelected,
	onApproveAndSign,
	onOpenInstallment,
	onPrintContract,
}) => {
	const variants = customVariants || DEFAULT_TREATMENT_PLAN_PRESETS;

	const [selectedTier, setSelectedTier] = useState<PlanTierCode>("standard_recommended");
	const [activePaymentTab, setActivePaymentTab] = useState<"staged" | "discount" | "installments" | "ndfl">("staged");
	const [statusNotice, setStatusNotice] = useState<string | null>(null);

	// Сводный 3-Tier анализ
	const summary = useMemo(() => {
		return generate3TierComparisonSummary(variants);
	}, [variants]);

	const currentVariant = variants[selectedTier];
	const currentBreakdown = useMemo(() => getPlanCategoryBreakdown(currentVariant), [currentVariant]);
	const currentPayments = useMemo(
		() => generatePaymentSchedules(currentVariant.totalCostRub, currentVariant.isCode02HighCostSurgery),
		[currentVariant],
	);

	// Дифференциалы относительно выбранного плана
	const diffAgainstOptimum = useMemo(
		() => calculatePlanDifferential(currentVariant, variants.optimum_vip),
		[currentVariant, variants.optimum_vip],
	);
	const diffAgainstEconomy = useMemo(
		() => calculatePlanDifferential(currentVariant, variants.economy_basic),
		[currentVariant, variants.economy_basic],
	);

	const handleSelectPlan = (tier: PlanTierCode) => {
		setSelectedTier(tier);
		onPlanSelected?.(tier, variants[tier]);
	};

	const handleConfirmChoice = () => {
		if (onApproveAndSign) {
			onApproveAndSign(selectedTier, currentVariant);
		} else if (onPlanSelected) {
			onPlanSelected(selectedTier, currentVariant);
		}
		setStatusNotice(`План «${currentVariant.title}» выбран для пациента ${patientName}.`);
		setTimeout(() => setStatusNotice(null), 3000);
	};

	const handleInstallmentAction = () => {
		if (onOpenInstallment) {
			onOpenInstallment(selectedTier, currentVariant);
		} else {
			setActivePaymentTab("installments");
		}
	};

	const handlePrintBrochure = () => {
		if (onPrintContract) {
			onPrintContract(selectedTier, currentVariant);
		} else {
			window.print();
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="plan-comparator-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="plan-comparator-title"
		>
			<div className="plan-comparator-modal" data-testid="plan-comparator-modal">
				{/* Header */}
				<header className="plan-comparator-header">
					<div className="plan-comparator-header-info">
						<div className="plan-header-icon" aria-hidden="true">
							<Sparkles size={20} />
						</div>
						<div className="min-w-0 flex-1">
							<h2 id="plan-comparator-title" className="plan-header-title text-sm sm:text-lg font-bold break-words leading-snug">
								Студия сравнения планов лечения &mdash; {patientName}
							</h2>
							<p className="plan-header-subtitle text-xs sm:text-sm text-[var(--muted,#64748b)] break-words mt-0.5">
								Врач: {doctorName} | {clinicName}
							</p>
						</div>
					</div>

					<div className="plan-header-actions">
						<button
							type="button"
							className="plan-btn-icon"
							onClick={handlePrintBrochure}
							title="Распечатать брошюру для пациента"
							aria-label="Печать брошюры"
						>
							<Printer size={16} />
						</button>
						{onClose ? (
							<button
								type="button"
								className="plan-btn-icon"
								onClick={onClose}
								aria-label="Закрыть окно"
							>
								<X size={18} />
							</button>
						) : null}
					</div>
				</header>

				{/* Notice Banner */}
				{statusNotice ? (
					<div
						style={{
							background: "var(--plan-success-light)",
							color: "var(--plan-success)",
							padding: "6px 20px",
							fontSize: "0.8125rem",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<CheckCircle2 size={16} />
						<span>{statusNotice}</span>
					</div>
				) : null}

				{/* Scrollable Body */}
				<div className="plan-comparator-body">
					{/* 3-Column Plan Cards Grid */}
					<div className="plan-cards-grid">
						{(["optimum_vip", "standard_recommended", "economy_basic"] as PlanTierCode[]).map((tierKey) => {
							const v = variants[tierKey];
							const isSelected = selectedTier === tierKey;

							return (
								<div
									key={tierKey}
									className={`plan-card ${isSelected ? "selected" : ""}`}
									onClick={() => handleSelectPlan(tierKey)}
									data-testid={`plan-card-${tierKey}`}
								>
									<span className={`plan-card-badge ${v.badgeType}`}>
										{v.badgeText}
									</span>

									<div>
										<h3 className="plan-card-title">{v.title}</h3>
										<p style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)", margin: "2px 0 0 0" }}>
											{v.implantSystem}
										</p>
									</div>

									<div className="plan-card-cost">
										<span>{v.totalCostRub.toLocaleString("ru-RU")} ₽</span>
										<span className="plan-card-cost-sub">
											/ {v.totalVisitsCount} виз. ({v.totalDurationWeeks} нед.)
										</span>
									</div>

									{/* Metrics */}
									<div className="plan-metric-group">
										<div>
											<div className="plan-metric-row">
												<span>Эстетический индекс:</span>
												<strong>{v.aestheticScore} / 10</strong>
											</div>
											<div className="plan-metric-bar-bg">
												<div
													className="plan-metric-bar-fill"
													style={{ width: `${v.aestheticScore * 10}%` }}
												/>
											</div>
										</div>

										<div style={{ marginTop: "2px" }}>
											<div className="plan-metric-row">
												<span>Прогноз службы:</span>
												<strong>{v.estimatedServiceLifeYears} лет (гарантия {v.warrantyYears} г.)</strong>
											</div>
											<div className="plan-metric-bar-bg">
												<div
													className="plan-metric-bar-fill"
													style={{ width: `${Math.min(100, (v.estimatedServiceLifeYears / 25) * 100)}%` }}
												/>
											</div>
										</div>

										<div style={{ marginTop: "2px" }}>
											<div className="plan-metric-row">
												<span>Стоимость за 1 год службы:</span>
												<strong style={{ color: "var(--plan-primary)" }}>
													{Math.round(v.totalCostRub / v.estimatedServiceLifeYears).toLocaleString("ru-RU")} ₽/год
												</strong>
											</div>
										</div>
									</div>

									{/* Key Advantages */}
									<ul className="plan-feature-list">
										{v.keyAdvantages.slice(0, 3).map((adv, idx) => (
											<li key={idx} className="plan-feature-item">
												<Check size={14} className="plan-feature-icon" />
												<span>{adv}</span>
											</li>
										))}
									</ul>

									<button
										type="button"
										className={isSelected ? "plan-action-btn-primary" : "plan-action-btn-secondary"}
										style={{ marginTop: "auto", width: "100%" }}
										onClick={(e) => {
											e.stopPropagation();
											handleSelectPlan(tierKey);
										}}
									>
										{isSelected ? (
											<>
												<Check size={14} />
												<span>Выбранный вариант</span>
											</>
										) : (
											<span>Выбрать этот план</span>
										)}
									</button>
								</div>
							);
						})}
					</div>

					{/* Stage-by-Stage Interactive Roadmap for Selected Plan */}
					<section className="plan-roadmap-section">
						<h4 className="plan-roadmap-title">
							<Clock size={16} style={{ color: "var(--plan-primary)" }} />
							<span>Клинический маршрут лечения: {currentVariant.title} ({currentVariant.totalDurationWeeks} недель)</span>
						</h4>

						<div className="plan-roadmap-stages">
							{currentVariant.stages.map((stage) => (
								<div key={stage.stageIndex} className="plan-stage-step">
									<div className="plan-stage-header">
										<span className="plan-stage-num">Этап {stage.stageIndex}</span>
										<span className="plan-stage-cost">{stage.costRub.toLocaleString("ru-RU")} ₽</span>
									</div>

									<div>
										<strong style={{ fontSize: "0.8125rem" }}>{stage.title}</strong>
										<p style={{ fontSize: "0.6875rem", color: "var(--plan-text-muted)", margin: "2px 0 0 0" }}>
											{stage.subtitle} &bull; {stage.visitsCount} визита (~{stage.durationWeeks} нед.)
										</p>
									</div>

									<div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "2px", overflowY: "auto", maxHeight: "110px" }}>
										{stage.keyProcedures.map((proc, pIdx) => (
											<span key={pIdx} className="plan-proc-tag">
												&bull; {proc}
											</span>
										))}
									</div>
								</div>
							))}
						</div>
					</section>

					{/* Payment Options & Tax Deduction Studio */}
					<section className="plan-roadmap-section">
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
							<h4 className="plan-roadmap-title" style={{ margin: 0 }}>
								<Wallet size={16} style={{ color: "var(--plan-primary)" }} />
								<span>Финансовый калькулятор и график оплат ({currentVariant.totalCostRub.toLocaleString("ru-RU")} ₽)</span>
							</h4>

							<div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
								<button
									type="button"
									className={`plan-proc-tag ${activePaymentTab === "staged" ? "plan-stage-num" : ""}`}
									style={{ cursor: "pointer", border: "none", minHeight: "28px", padding: "2px 8px" }}
									onClick={() => setActivePaymentTab("staged")}
								>
									Поэтапно (30/40/30)
								</button>
								<button
									type="button"
									className={`plan-proc-tag ${activePaymentTab === "discount" ? "plan-stage-num" : ""}`}
									style={{ cursor: "pointer", border: "none", minHeight: "28px", padding: "2px 8px" }}
									onClick={() => setActivePaymentTab("discount")}
								>
									Разово (-5%)
								</button>
								<button
									type="button"
									className={`plan-proc-tag ${activePaymentTab === "installments" ? "plan-stage-num" : ""}`}
									style={{ cursor: "pointer", border: "none", minHeight: "28px", padding: "2px 8px" }}
									onClick={() => setActivePaymentTab("installments")}
								>
									Рассрочка 0-0-12
								</button>
								<button
									type="button"
									className={`plan-proc-tag ${activePaymentTab === "ndfl" ? "plan-stage-num" : ""}`}
									style={{ cursor: "pointer", border: "none", minHeight: "28px", padding: "2px 8px" }}
									onClick={() => setActivePaymentTab("ndfl")}
								>
									Вычет НДФЛ 13%
								</button>
							</div>
						</div>

						{/* Payment Tab Contents */}
						<div className="plan-payment-grid">
							{activePaymentTab === "staged" && (
								<>
									<div className="plan-payment-card active">
										<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>1. Диагностика и аванс (30%)</span>
										<strong style={{ fontSize: "1rem", color: "var(--plan-text-main)" }}>
											{currentPayments.stagedPayment.stage1DiagnosticRub.toLocaleString("ru-RU")} ₽
										</strong>
										<span style={{ fontSize: "0.6875rem" }}>При заключении договора</span>
									</div>

									<div className="plan-payment-card active">
										<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>2. Хирургический этап (40%)</span>
										<strong style={{ fontSize: "1rem", color: "var(--plan-text-main)" }}>
											{currentPayments.stagedPayment.stage2SurgeryRub.toLocaleString("ru-RU")} ₽
										</strong>
										<span style={{ fontSize: "0.6875rem" }}>В день операции имплантации</span>
									</div>

									<div className="plan-payment-card active">
										<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>3. Ортопедический этап (30%)</span>
										<strong style={{ fontSize: "1rem", color: "var(--plan-text-main)" }}>
											{currentPayments.stagedPayment.stage3OrthopedicsRub.toLocaleString("ru-RU")} ₽
										</strong>
										<span style={{ fontSize: "0.6875rem" }}>При постоянной фиксации коронок</span>
									</div>
								</>
							)}

							{activePaymentTab === "discount" && (
								<>
									<div className="plan-payment-card active">
										<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>Скидка за единовременную оплату</span>
										<strong style={{ fontSize: "1rem", color: "var(--plan-success)" }}>
											- {currentPayments.singlePaymentWith5PctDiscount.discountRub.toLocaleString("ru-RU")} ₽ (5%)
										</strong>
										<span style={{ fontSize: "0.6875rem" }}>Экономия бюджета пациента</span>
									</div>

									<div className="plan-payment-card active" style={{ gridColumn: "span 2" }}>
										<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>Итого к оплате со скидкой</span>
										<strong style={{ fontSize: "1.125rem", color: "var(--plan-primary)" }}>
											{currentPayments.singlePaymentWith5PctDiscount.finalPayableRub.toLocaleString("ru-RU")} ₽
										</strong>
										<span style={{ fontSize: "0.6875rem" }}>100% предоплата перед началом лечения</span>
									</div>
								</>
							)}

							{activePaymentTab === "installments" && (
								<>
									{currentPayments.installments.map((inst) => (
										<div key={inst.months} className="plan-payment-card active">
											<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>
												Рассрочка на {inst.months} месяцев {inst.provider === "clinic_internal" ? "(Клиника)" : "(Банк)"}
											</span>
											<strong style={{ fontSize: "1.125rem", color: "var(--plan-primary)" }}>
												{inst.monthlyPaymentRub.toLocaleString("ru-RU")} ₽/мес.
											</strong>
											<span style={{ fontSize: "0.6875rem", color: "var(--plan-success)" }}>
												Переплата 0% &bull; Без первого взноса
											</span>
										</div>
									))}
								</>
							)}

							{activePaymentTab === "ndfl" && (
								<>
									<div className="plan-payment-card active" style={{ gridColumn: "span 3" }}>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
											<div>
												<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>
													{currentPayments.ndflRefund.codeNameRu}
												</span>
												<div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--plan-success)", marginTop: "2px" }}>
													Возврат НДФЛ: +{currentPayments.ndflRefund.refundAmountRub.toLocaleString("ru-RU")} ₽
												</div>
											</div>
											<div style={{ textAlign: "right" }}>
												<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>Реальная стоимость с учетом возврата:</span>
												<div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--plan-primary)" }}>
													{currentPayments.ndflRefund.effectiveNetCostRub.toLocaleString("ru-RU")} ₽
												</div>
											</div>
										</div>
									</div>
								</>
							)}
						</div>
					</section>
				</div>

				{/* Sticky Bottom Footer Actions */}
				<footer className="plan-comparator-footer">
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<div style={{ fontSize: "0.8125rem", color: "var(--plan-text-main)" }}>
							Выбран план: <strong>{currentVariant.title}</strong> (
							<span style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--plan-primary)" }}>
								{currentVariant.totalCostRub.toLocaleString("ru-RU")} ₽
							</span>
							)
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
						<button
							type="button"
							className="plan-action-btn-secondary"
							onClick={handleInstallmentAction}
							title="Оформить рассрочку 0%"
						>
							<CreditCard size={14} />
							<span>Рассрочка 0%</span>
						</button>

						<button
							type="button"
							className="plan-action-btn-secondary"
							onClick={handlePrintBrochure}
							title="Печать брошюры / договора"
						>
							<Printer size={14} />
							<span>Печать брошюры</span>
						</button>

						<button
							type="button"
							className="plan-action-btn-primary"
							onClick={handleConfirmChoice}
							data-testid="confirm-plan-choice-btn"
						>
							<CheckCircle2 size={16} />
							<span>Согласовать план с пациентом</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export const TreatmentPlanComparisonModal = TreatmentPlanComparatorModal;
export type TreatmentPlanComparisonModalProps = TreatmentPlanComparatorModalProps;
export default TreatmentPlanComparatorModal;

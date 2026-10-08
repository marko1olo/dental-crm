/**
 * PlanScenarioComparisonModal.tsx — 3-колоночная презентационная студия сравнения планов лечения (B2C & Doctor Autonomy)
 *
 * ВОЗМОЖНОСТИ:
 * 1. 3 прозрачных сценария («Оптимальный / Премиум», «Стандартный / Рекомендуемый», «Базовый / Эконом»).
 * 2. Роскошная 3-колоночная сетка на экране 1440px без сжатия и без горизонтального скролла.
 * 3. Крупная цена 26-28px bold font-mono, наглядные сроки («3-4 месяца») и гарантии.
 * 4. 1-кликовое утверждение плана («Выбрать этот сценарий»): диспатчит события в CRM и привязывает к будущим визитам в расписании.
 * 5. Гибкий калькулятор скидок (5%, 10%, 15% или произвольная сумма/процент) в целых копейках.
 * 6. Рассрочка 0% без переплат (6, 12, 24 мес), поэтапная оплата (30/40/30) и 13% возврат НДФЛ.
 * 7. Чистая печать и экспорт в PDF без серых плашек (Закон Святости Бланков).
 * 8. Закон Анти-Матрёшки: глубина модалки строго 1.
 * 9. Полное соответствие WCAG AAA Dark & Light Mode.
 */

import React, { useMemo, useState } from "react";
import {
	Check,
	CheckCircle2,
	Clock,
	Coins,
	CreditCard,
	Percent,
	Printer,
	ShieldCheck,
	Sparkles,
	Wallet,
	X,
} from "lucide-react";
import {
	DEFAULT_TREATMENT_PLAN_PRESETS,
	type ComprehensivePlanVariant,
	type PlanTierCode,
} from "./comparator/planPresentationPresets";
import { generatePaymentSchedules } from "./comparator/planComparatorEngine";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import "./comparator/planComparator.css";

export interface PlanScenarioComparisonModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly planAgeDays?: number | undefined;
	readonly planCreatedAtIso?: string | undefined;
	readonly isDemoMode?: boolean | undefined;
	readonly customVariants?: Readonly<Record<PlanTierCode, ComprehensivePlanVariant>> | undefined;
	readonly onPlanSelected?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
	readonly onSelectScenario?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
	readonly onApproveAndSign?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
	readonly onOpenInstallment?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
	readonly onPrintContract?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
	readonly initialSelectedTier?: PlanTierCode | undefined;
	readonly initialPaymentTab?: "staged" | "discount" | "installments" | "ndfl" | undefined;
}

export const PlanScenarioComparisonModal: React.FC<PlanScenarioComparisonModalProps> = ({
	isOpen = true,
	onClose,
	patientName = "Пациент",
	doctorName = "Лечащий врач",
	clinicName = "Стоматологическая клиника DENTE",
	planAgeDays,
	planCreatedAtIso,
	isDemoMode,
	customVariants,
	onPlanSelected,
	onSelectScenario,
	onApproveAndSign,
	onOpenInstallment,
	onPrintContract,
	initialSelectedTier = "standard_recommended",
	initialPaymentTab = "staged",
}) => {
	const isDemo = isDemoMode !== undefined ? isDemoMode : isDemoShowcaseMode();
	const variants = customVariants || (isDemo ? DEFAULT_TREATMENT_PLAN_PRESETS : null);

	const [selectedTier, setSelectedTier] = useState<PlanTierCode>(initialSelectedTier);
	const [activePaymentTab, setActivePaymentTab] = useState<"staged" | "discount" | "installments" | "ndfl">(initialPaymentTab);
	const [discountMode, setDiscountMode] = useState<"percent" | "fixed">("percent");
	const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(5);
	const [customDiscountRubInput, setCustomDiscountRubInput] = useState<number>(15000);
	const [statusNotice, setStatusNotice] = useState<string | null>(null);

	const effectivePlanAgeDays =
		typeof planAgeDays === "number"
			? planAgeDays
			: planCreatedAtIso
				? Math.floor((Date.now() - new Date(planCreatedAtIso).getTime()) / (1000 * 60 * 60 * 24))
				: 0;

	const currentVariant = variants ? variants[selectedTier] : null;

	const currentPayments = useMemo(
		() =>
			currentVariant
				? generatePaymentSchedules(currentVariant.totalCostRub, currentVariant.isCode02HighCostSurgery)
				: null,
		[currentVariant],
	);

	// Калькулятор произвольной скидки без ошибок округления (в целых рублях)
	const dynamicDiscount = useMemo(() => {
		if (!currentVariant) {
			return { discountRub: 0, finalPayableRub: 0, percentEffective: 0 };
		}
		const total = currentVariant.totalCostRub;
		let discount = 0;
		if (discountMode === "percent") {
			const pct = Math.max(0, Math.min(100, customDiscountPercent));
			discount = Math.round((total * pct) / 100);
		} else {
			discount = Math.max(0, Math.min(total, customDiscountRubInput));
		}
		const finalPayable = Math.max(0, total - discount);
		const effPct = total > 0 ? Math.round((discount / total) * 100) : 0;
		return {
			discountRub: discount,
			finalPayableRub: finalPayable,
			percentEffective: effPct,
		};
	}, [currentVariant, discountMode, customDiscountPercent, customDiscountRubInput]);

	const handleSelectPlan = (tier: PlanTierCode) => {
		setSelectedTier(tier);
		if (variants) {
			const v = variants[tier];
			onPlanSelected?.(tier, v);
			onSelectScenario?.(tier, v);
		}
	};

	const handleConfirmChoice = () => {
		if (!currentVariant) return;

		// 1-кликовое утверждение плана
		onApproveAndSign?.(selectedTier, currentVariant);
		onPlanSelected?.(selectedTier, currentVariant);
		onSelectScenario?.(selectedTier, currentVariant);

		// Автоматическая привязка к расписанию и будущим визитам (Мандат 8e)
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-treatment-plan-scenario-approved", {
					detail: {
						tierCode: selectedTier,
						variant: currentVariant,
						patientName,
						doctorName,
						clinicName,
						planTitle: currentVariant.title,
						totalCostRub: currentVariant.totalCostRub,
						stages: currentVariant.stages,
						discountRub: dynamicDiscount.discountRub,
						finalPayableRub: dynamicDiscount.finalPayableRub,
					},
				}),
			);

			// Если есть первый этап, отправляем событие бронирования слота в расписании
			const firstStage = currentVariant.stages[0];
			if (firstStage) {
				window.dispatchEvent(
					new CustomEvent("dente-book-stage-appointment", {
						detail: {
							planTitle: currentVariant.title,
							stageNumber: firstStage.stageIndex,
							stageTitle: firstStage.title,
							patientName,
							doctorName,
							estimatedDurationMinutes: Math.min(120, Math.max(45, firstStage.visitsCount * 30)),
						},
					}),
				);
			}

			window.dispatchEvent(new CustomEvent("dente-treatment-plans-reload"));
		}

		setStatusNotice(`План «${currentVariant.title}» утвержден и привязан к графику визитов пациента.`);
		setTimeout(() => setStatusNotice(null), 3500);
	};

	const handleInstallmentAction = () => {
		if (!currentVariant) return;
		if (onOpenInstallment) {
			onOpenInstallment(selectedTier, currentVariant);
		} else {
			setActivePaymentTab("installments");
		}
	};

	const handlePrintBrochure = () => {
		if (!currentVariant) return;
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
			aria-labelledby="scenario-comparator-title"
			data-testid="plan-scenario-comparison-modal"
		>
			<div className="plan-comparator-modal" data-testid="plan-scenario-modal-container">
				{/* Header */}
				<header className="plan-comparator-header">
					<div className="plan-comparator-header-info">
						<div className="plan-header-icon" aria-hidden="true">
							<Sparkles size={20} />
						</div>
						<div className="min-w-0 flex-1">
							<h2 id="scenario-comparator-title" className="plan-header-title text-base sm:text-lg font-bold">
								Сравнение 3 сценариев лечения &mdash; {patientName}
							</h2>
							<p className="plan-header-subtitle text-xs text-[var(--muted,#64748b)]">
								Врач: {doctorName} | {clinicName}
							</p>
						</div>
					</div>

					<div className="plan-header-actions">
						<button
							type="button"
							className="plan-btn-icon"
							onClick={handlePrintBrochure}
							title="Печать брошюры для пациента"
							aria-label="Печать брошюры"
							data-testid="btn-print-scenarios"
						>
							<Printer size={16} />
						</button>
						{onClose && (
							<button
								type="button"
								className="plan-btn-icon"
								onClick={onClose}
								aria-label="Закрыть окно"
								data-testid="btn-close-scenarios"
							>
								<X size={18} />
							</button>
						)}
					</div>
				</header>

				{/* 30-Day Plan Age Unblocked Notice (Mandate 8e) */}
				{effectivePlanAgeDays > 30 && (
					<div
						style={{
							background: "rgba(245, 158, 11, 0.12)",
							borderBottom: "1px solid rgba(245, 158, 11, 0.3)",
							color: "var(--amber, #d97706)",
							padding: "8px 20px",
							fontSize: "0.8125rem",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
						data-testid="scenario-expired-unblocked-badge"
					>
						<Clock size={15} style={{ color: "var(--amber, #d97706)", flexShrink: 0 }} />
						<span>
							План составлен более 30 дней назад ({effectivePlanAgeDays} дн.). Цены согласованы с врачом, запись и оплата доступны без ограничений.
						</span>
					</div>
				)}

				{/* Notice Banner */}
				{statusNotice && (
					<div
						style={{
							background: "var(--plan-success-light)",
							color: "var(--plan-success)",
							padding: "8px 20px",
							fontSize: "0.8125rem",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
						data-testid="scenario-status-notice"
					>
						<CheckCircle2 size={16} />
						<span>{statusNotice}</span>
					</div>
				)}

				{!variants || !currentVariant || !currentPayments ? (
					<div
						className="plan-comparator-empty-state"
						data-testid="scenario-empty-state"
						style={{
							padding: "4rem 2rem",
							textAlign: "center",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							gap: "1rem",
							minHeight: "360px",
						}}
					>
						<Sparkles size={48} style={{ opacity: 0.3, color: "var(--teal, #0d9488)" }} />
						<div style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--plan-text-main, #0f172a)" }}>
							Сценарии планов лечения ещё не сформированы
						</div>
						<p style={{ maxWidth: "480px", fontSize: "0.875rem", color: "var(--plan-text-muted, #64748b)", lineHeight: 1.5 }}>
							Для наглядного сравнения добавьте патологии в одонтограмму или включите демонстрационный режим витрины.
						</p>
						<button
							type="button"
							onClick={onClose}
							className="plan-action-btn-secondary"
							data-testid="btn-scenario-empty-close"
						>
							<span>Вернуться к карте пациента</span>
						</button>
					</div>
				) : (
					<>
						{/* Scrollable Content */}
						<div className="plan-comparator-body">
							{/* Mobile Segmented Control */}
							<div className="plan-comparator-segmented-control" data-testid="scenario-segmented-control">
								{(["optimum_vip", "standard_recommended", "economy_basic"] as PlanTierCode[]).map((tierKey) => {
									const v = variants[tierKey];
									const isSelected = selectedTier === tierKey;
									return (
										<button
											key={tierKey}
											type="button"
											className={`plan-segmented-tab ${isSelected ? "active" : ""}`}
											onClick={() => handleSelectPlan(tierKey)}
											data-testid={`scenario-tab-${tierKey}`}
										>
											<span className="plan-segmented-tab-title">{v.title.split("(")[0]?.trim()}</span>
											<span className="plan-segmented-tab-price">{v.totalCostRub.toLocaleString("ru-RU")} ₽</span>
										</button>
									);
								})}
							</div>

							{/* 3-Column Comparison Table / Cards */}
							<div className="plan-cards-grid" data-testid="scenario-cards-grid">
								{(["optimum_vip", "standard_recommended", "economy_basic"] as PlanTierCode[]).map((tierKey) => {
									const v = variants[tierKey];
									const isSelected = selectedTier === tierKey;

									return (
										<div
											key={tierKey}
											className={`plan-card ${isSelected ? "selected" : ""}`}
											onClick={() => handleSelectPlan(tierKey)}
											data-testid={`scenario-card-${tierKey}`}
										>
											<span className={`plan-card-badge ${v.badgeType}`}>
												{v.badgeText}
											</span>

											<div>
												<h3 className="plan-card-title">{v.title}</h3>
												<p style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)", margin: "3px 0 0 0" }}>
													{v.implantSystem}
												</p>
											</div>

											{/* Price large 26px bold font-mono */}
											<div className="plan-card-cost" data-testid={`scenario-cost-${tierKey}`}>
												<span>{v.totalCostRub.toLocaleString("ru-RU")} ₽</span>
												<span className="plan-card-cost-sub">
													/ {v.totalVisitsCount} виз. (~{v.totalDurationWeeks} нед.)
												</span>
											</div>

											{/* Treatment duration & warranty chip */}
											<div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "0.75rem" }}>
												<span
													style={{
														background: "var(--paper-soft)",
														border: "1px solid var(--line)",
														padding: "2px 8px",
														borderRadius: "6px",
														display: "inline-flex",
														alignItems: "center",
														gap: "4px",
														fontWeight: 600,
													}}
												>
													<Clock size={12} style={{ color: "var(--teal)" }} />
													{v.totalDurationWeeks >= 12
														? `~${Math.round(v.totalDurationWeeks / 4)} мес.`
														: `${v.totalDurationWeeks} нед.`}
												</span>
												<span
													style={{
														background: "var(--paper-soft)",
														border: "1px solid var(--line)",
														padding: "2px 8px",
														borderRadius: "6px",
														display: "inline-flex",
														alignItems: "center",
														gap: "4px",
														fontWeight: 600,
													}}
												>
													<ShieldCheck size={12} style={{ color: "var(--ok-fg)" }} />
													Гарантия {v.warrantyYears} г. ({v.estimatedServiceLifeYears} лет службы)
												</span>
											</div>

											{/* Aesthetic and Longevity Metrics */}
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

												<div>
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
												data-testid={`btn-select-tier-${tierKey}`}
											>
												{isSelected ? (
													<>
														<Check size={14} />
														<span>Выбранный вариант</span>
													</>
												) : (
													<span>Выбрать этот сценарий</span>
												)}
											</button>
										</div>
									);
								})}
							</div>

							{/* Clinical Roadmap Timeline for Selected Scenario */}
							<section className="plan-roadmap-section" data-testid="scenario-roadmap-section">
								<h4 className="plan-roadmap-title">
									<Clock size={16} style={{ color: "var(--plan-primary)" }} />
									<span>
										Клинический маршрут: {currentVariant.title} ({currentVariant.totalDurationWeeks} недель, {currentVariant.totalVisitsCount} визитов)
									</span>
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
													{stage.subtitle} &bull; {stage.visitsCount} виз. (~{stage.durationWeeks} нед.)
												</p>
											</div>

											<div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "2px", overflowY: "auto", maxHeight: "110px", minWidth: 0 }}>
												{stage.keyProcedures.map((proc, pIdx) => (
													<span key={pIdx} className="plan-proc-tag" title={proc}>
														&bull; {proc}
													</span>
												))}
											</div>
										</div>
									))}
								</div>
							</section>

							{/* Financial Calculator: Installments, Staged, Discount & Tax Deduction */}
							<section className="plan-roadmap-section" data-testid="scenario-finance-section">
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
									<h4 className="plan-roadmap-title" style={{ margin: 0 }}>
										<Wallet size={16} style={{ color: "var(--plan-primary)" }} />
										<span>
											Финансовый калькулятор &mdash; {currentVariant.totalCostRub.toLocaleString("ru-RU")} ₽
										</span>
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
											Скидка (разово)
										</button>
										<button
											type="button"
											className={`plan-proc-tag ${activePaymentTab === "installments" ? "plan-stage-num" : ""}`}
											style={{ cursor: "pointer", border: "none", minHeight: "28px", padding: "2px 8px" }}
											onClick={() => setActivePaymentTab("installments")}
										>
											Рассрочка 0%
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
											<div className="plan-payment-card active" style={{ gridColumn: "span 3", display: "flex", flexDirection: "column", gap: "8px" }}>
												<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
													<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
														<span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>Пресеты скидки врача:</span>
														{[5, 10, 15].map((pct) => (
															<button
																key={pct}
																type="button"
																onClick={() => {
																	setDiscountMode("percent");
																	setCustomDiscountPercent(pct);
																}}
																style={{
																	padding: "3px 10px",
																	borderRadius: "6px",
																	fontSize: "0.75rem",
																	fontWeight: 700,
																	cursor: "pointer",
																	border: "1px solid var(--line)",
																	background: discountMode === "percent" && customDiscountPercent === pct ? "var(--teal)" : "var(--paper)",
																	color: discountMode === "percent" && customDiscountPercent === pct ? "#ffffff" : "var(--ink)",
																}}
																data-testid={`btn-discount-${pct}`}
															>
																{pct}%
															</button>
														))}
													</div>

													<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
														<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Ввести вручную:</span>
														<input
															type="number"
															min={0}
															max={100}
															value={customDiscountPercent}
															onChange={(e) => {
																setDiscountMode("percent");
																setCustomDiscountPercent(Number(e.target.value) || 0);
															}}
															style={{
																width: "55px",
																padding: "3px 6px",
																fontSize: "0.75rem",
																fontWeight: 700,
																borderRadius: "6px",
																border: "1px solid var(--line)",
																background: "var(--paper)",
																color: "var(--ink)",
															}}
															data-testid="input-discount-percent"
														/>
														<span style={{ fontSize: "0.75rem", fontWeight: 700 }}>%</span>
													</div>
												</div>

												<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", paddingTop: "6px", borderTop: "1px dashed var(--line)" }}>
													<div>
														<div style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>Экономия пациента:</div>
														<div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--plan-success)" }} data-testid="discount-amount-rub">
															- {dynamicDiscount.discountRub.toLocaleString("ru-RU")} ₽ ({dynamicDiscount.percentEffective}%)
														</div>
													</div>
													<div style={{ textAlign: "right" }}>
														<div style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>Итого к оплате с учетом скидки:</div>
														<div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--plan-primary)", fontFamily: "monospace" }} data-testid="discounted-total-rub">
															{dynamicDiscount.finalPayableRub.toLocaleString("ru-RU")} ₽
														</div>
													</div>
												</div>
											</div>
										</>
									)}

									{activePaymentTab === "installments" && (
										<>
											{currentPayments.installments.map((inst) => (
												<div key={inst.months} className="plan-payment-card active" data-testid={`installment-card-${inst.months}`}>
													<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>
														Рассрочка 0% на {inst.months} мес. ({inst.provider === "clinic_internal" ? "Клиника" : "Банк"})
													</span>
													<strong style={{ fontSize: "1.125rem", color: "var(--plan-primary)", fontFamily: "monospace" }}>
														{inst.monthlyPaymentRub.toLocaleString("ru-RU")} ₽/мес.
													</strong>
													<span style={{ fontSize: "0.6875rem", color: "var(--plan-success)", fontWeight: 600 }}>
														Переплата 0% &bull; Без первого взноса
													</span>
												</div>
											))}
										</>
									)}

									{activePaymentTab === "ndfl" && (
										<div className="plan-payment-card active" style={{ gridColumn: "span 3" }}>
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
												<div>
													<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>
														{currentPayments.ndflRefund.codeNameRu}
													</span>
													<div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--plan-success)", marginTop: "2px" }} data-testid="ndfl-refund-amount">
														Возврат НДФЛ: +{currentPayments.ndflRefund.refundAmountRub.toLocaleString("ru-RU")} ₽
													</div>
												</div>
												<div style={{ textAlign: "right" }}>
													<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>Реальная стоимость с возвратом:</span>
													<div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--plan-primary)" }} data-testid="ndfl-net-cost">
														{currentPayments.ndflRefund.effectiveNetCostRub.toLocaleString("ru-RU")} ₽
													</div>
												</div>
											</div>
										</div>
									)}
								</div>
							</section>
						</div>

						{/* Sticky Footer Actions */}
						<footer className="plan-comparator-footer" data-testid="scenario-modal-footer">
							<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
								<div style={{ fontSize: "0.8125rem", color: "var(--plan-text-main)" }}>
									Выбран сценарий: <strong>{currentVariant.title}</strong> (
									<span style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--plan-primary)" }}>
										{currentVariant.totalCostRub.toLocaleString("ru-RU")} ₽
									</span>
									)
								</div>
							</div>

							<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
								<button
									type="button"
									className="plan-action-btn-secondary"
									onClick={handleInstallmentAction}
									data-testid="btn-scenario-installment"
								>
									<CreditCard size={14} />
									<span>Рассрочка 0%</span>
								</button>

								<button
									type="button"
									className="plan-action-btn-primary"
									onClick={handleConfirmChoice}
									data-testid="btn-approve-scenario"
								>
									<CheckCircle2 size={16} />
									<span>Выбрать этот сценарий</span>
								</button>
							</div>
						</footer>
					</>
				)}
			</div>
		</div>
	);
};

export default PlanScenarioComparisonModal;

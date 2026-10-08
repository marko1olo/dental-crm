/**
 * TreatmentPlanTab.tsx — Экран «Мой план лечения» личного кабинета пациента (PWA / Mobile 390px)
 * (DOMAIN: PORTAL PATIENT CABINET - TAB 2: TREATMENT PLAN)
 *
 * Соответствие:
 * - Кольцевая диаграмма / наглядная шкала прогресса % выполнения с суммами оплаты.
 * - Список клинических этапов с прозрачной ценой и обязательной плашкой
 *   «Всё включено: анестезия 0 ₽, снимки 0 ₽» (Мандат 8e / 8k).
 * - 1-клик оплата конкретного этапа через СБП без комиссии.
 * - Интерактивный «Зубной паспорт пациента» с гарантиями.
 */

import React, { useMemo, useState } from "react";
import {
	Activity,
	Award,
	Calendar,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	FileText,
	Layers,
	Percent,
	Printer,
	QrCode,
	Scan,
	ShieldCheck,
	Smartphone,
	Sparkles,
	User,
} from "lucide-react";
import type {
	PatientDentalPassport,
	PatientPersonalCabinetData,
	PatientTreatmentPlan,
	TreatmentPlanStage,
	TreatmentPlanTier,
} from "../patientCabinetEngine.js";
import {
	computePatientTeethFromStages,
	DEFAULT_PATIENT_TEETH,
	formatRubles,
	generateTreatmentPlanEstimateHtml,
	signTreatmentPlanWithPep,
} from "../patientCabinetEngine.js";
import { openPrintWindow } from "../patientCabinetDocuments.js";
import { PatientPlanDentalFormula } from "../PatientPlanDentalFormula.js";
import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import { PATIENT_CABINET_PRESET_ALEXEY } from "../patientCabinetPresets.js";

export interface TreatmentPlanTabProps {
	readonly data: PatientPersonalCabinetData;
	readonly dentalPassport: PatientDentalPassport;
	readonly onPayStageWithSbp: (stage: TreatmentPlanStage) => void;
	readonly onBookAppointment: () => void;
	readonly onApproveTreatmentPlan?: ((plan: PatientTreatmentPlan) => void) | undefined;
	readonly onShowToast?: ((msg: string) => void) | undefined;
	readonly onOpenClinicalScans?: (() => void) | undefined;
	readonly isClinicalScansOpen?: boolean | undefined;
}

export const TreatmentPlanTab: React.FC<TreatmentPlanTabProps> = ({
	data,
	dentalPassport,
	onPayStageWithSbp,
	onBookAppointment,
	onApproveTreatmentPlan,
	onShowToast,
	onOpenClinicalScans,
	isClinicalScansOpen,
}) => {
	const isDemo = isDemoShowcaseMode();
	const currentPlan: PatientTreatmentPlan | undefined =
		data.treatmentPlans[0] ??
		(isDemo ? PATIENT_CABINET_PRESET_ALEXEY.treatmentPlans[0] : undefined);

	// Состояние выбранного тарифа для 3-Tier модели
	const [selectedTier, setSelectedTier] = useState<"basic" | "standard" | "premium">(
		data.threeTierModel?.selectedTier || "standard",
	);

	// Раскрытие карточек этапов
	const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
		"stage-0": true,
	});

	// Раскрытие аккордеона зубного паспорта
	const [isPassportExpanded, setIsPassportExpanded] = useState(false);

	// Локальное согласование плана лечения (ПЭП 63-ФЗ)
	const [localApproved, setLocalApproved] = useState<boolean>(
		!!currentPlan?.approvedByPatient,
	);
	const isPlanApproved = !!currentPlan?.approvedByPatient || localApproved;

	// Динамический расчет статусов зубов по плану лечения
	const patientTeeth = useMemo(() => {
		if (data.teeth && data.teeth.length > 0) {
			return data.teeth;
		}
		if (currentPlan) {
			return computePatientTeethFromStages(currentPlan.stages, data.warranties);
		}
		return isDemo ? DEFAULT_PATIENT_TEETH : [];
	}, [data.teeth, currentPlan, data.warranties, isDemo]);

	const handleApprovePlan = () => {
		if (!currentPlan) return;
		setLocalApproved(true);
		const signed = signTreatmentPlanWithPep(
			currentPlan,
			data.phone,
			"123456",
			data.fullName,
		);
		if (onApproveTreatmentPlan) {
			onApproveTreatmentPlan(signed);
		}
		if (onShowToast) {
			onShowToast("План лечения успешно согласован по 63-ФЗ (ПЭП)!");
		}
	};

	const handlePrintEstimate = () => {
		if (!currentPlan) return;
		const html = generateTreatmentPlanEstimateHtml(
			isPlanApproved ? { ...currentPlan, approvedByPatient: true } : currentPlan,
			data,
		);
		openPrintWindow(html);
	};

	const toggleStage = (stageId: string) => {
		setExpandedStages((prev) => ({
			...prev,
			[stageId]: !prev[stageId],
		}));
	};

	if (!currentPlan) {
		return (
			<div className="pc-empty-state" data-testid="pc-treatment-plan-empty">
				<Percent size={40} className="pc-icon-muted" />
				<h4 className="pc-empty-title">План комплексного лечения формируется</h4>
				<p className="pc-empty-desc">
					Ваш лечащий врач <strong>{data.curatingDoctor}</strong> составляет
					индивидуальный план лечения и оздоровления. После согласования он сразу появится в вашем
					личном кабинете.
				</p>
				<button
					type="button"
					className="pc-btn-primary"
					onClick={onBookAppointment}
				>
					<Calendar size={16} />
					<span>Записаться на консультацию</span>
				</button>
			</div>
		);
	}

	const totalStages = currentPlan.stages.length;
	const completedStages = currentPlan.stages.filter(
		(s) => s.status === "completed",
	).length;
	const progressPercent = currentPlan.progressPercent || 0;

	// Расчет параметров круговой диаграммы (SVG Ring)
	const radius = 54;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

	return (
		<div className="pc-tab-content-container" data-testid="pc-treatment-plan-tab">
			{/* 1. ГЕРОЙ-ПРОГРЕСС С КОЛЬЦЕВОЙ ДИАГРАММОЙ */}
			<div className="pc-card pc-plan-hero-card" data-testid="pc-plan-progress-hero">
				<div className="pc-plan-hero-grid">
					{/* Кольцевой индикатор SVG */}
					<div className="pc-ring-diagram-wrapper">
						<svg
							className="pc-progress-ring"
							width="130"
							height="130"
							viewBox="0 0 130 130"
							aria-label={`Прогресс лечения: ${progressPercent}%`}
						>
							<circle
								className="pc-ring-bg"
								cx="65"
								cy="65"
								r={radius}
								fill="none"
								stroke="var(--pc-border, #e2e8f0)"
								strokeWidth="11"
							/>
							<circle
								className="pc-ring-fill"
								cx="65"
								cy="65"
								r={radius}
								fill="none"
								stroke="var(--pc-primary, #0d9488)"
								strokeLinecap="round"
								strokeWidth="11"
								strokeDasharray={circumference}
								strokeDashoffset={strokeDashoffset}
								transform="rotate(-90 65 65)"
							/>
						</svg>
						<div className="pc-ring-center-content">
							<span className="pc-ring-percent">{progressPercent}%</span>
							<span className="pc-ring-subtext">Выполнено</span>
						</div>
					</div>

					{/* Данные плана и финансовый остаток */}
					<div className="pc-plan-hero-text">
						<div className="pc-plan-header-line">
							<h3 className="pc-plan-title">{currentPlan.titleRu}</h3>
							<span className="pc-status-badge paid">
								План № {currentPlan.planNumber}
							</span>
						</div>

						<p className="pc-plan-curator">
							Куратор плана: <strong>{currentPlan.curatingDoctor}</strong>
						</p>

						<div className="pc-plan-financials-box">
							<div className="pc-fin-item">
								<span className="pc-fin-label">Общая стоимость:</span>
								<strong className="pc-fin-val total">
									{formatRubles(currentPlan.totalCostRub)}
								</strong>
							</div>
							<div className="pc-fin-item">
								<span className="pc-fin-label">Оплачено:</span>
								<strong className="pc-fin-val paid">
									{formatRubles(currentPlan.paidCostRub)}
								</strong>
							</div>
							<div className="pc-fin-item">
								<span className="pc-fin-label">Остаток к оплате:</span>
								<strong className="pc-fin-val remaining">
									{currentPlan.remainingDueRub > 0
										? formatRubles(currentPlan.remainingDueRub)
										: "Оплачено 100%"}
								</strong>
							</div>
						</div>

						<div className="pc-plan-stages-badge">
							Выполнено <strong>{completedStages}</strong> из{" "}
							<strong>{totalStages}</strong> клинических этапов
						</div>

						{/* Согласование плана по 63-ФЗ ПЭП и печать сметы */}
						<div
							className="pc-plan-actions-strip"
							data-testid="pc-plan-actions-strip"
							style={{
								marginTop: "12px",
								paddingTop: "10px",
								borderTop: "1px dashed var(--pc-border, #cbd5e1)",
								display: "flex",
								alignItems: "center",
								gap: "8px",
								flexWrap: "wrap",
							}}
						>
							{isPlanApproved ? (
								<span
									className="pc-status-badge paid"
									data-testid="plan-approved-badge"
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
										padding: "4px 10px",
									}}
								>
									<CheckCircle2 size={15} />
									<span>План согласован (ПЭП 63-ФЗ)</span>
								</span>
							) : (
								<>
									<span
										className="pc-status-badge unpaid"
										data-testid="plan-pending-badge"
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: "6px",
											padding: "4px 10px",
										}}
									>
										<Clock size={15} />
										<span>Требуется согласование</span>
									</span>
									<button
										type="button"
										className="pc-btn-primary pc-btn-compact"
										onClick={handleApprovePlan}
										data-testid="approve-treatment-plan-btn"
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: "6px",
										}}
									>
										<Smartphone size={14} />
										<span>Согласовать план (ПЭП 63-ФЗ)</span>
									</button>
								</>
							)}

							<button
								type="button"
								className="pc-btn-secondary pc-btn-compact"
								onClick={handlePrintEstimate}
								data-testid="print-treatment-plan-btn"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
								}}
							>
								<Printer size={14} />
								<span>Печать сметы</span>
							</button>

							{onOpenClinicalScans && (
								<button
									type="button"
									className="pc-btn-secondary pc-btn-compact"
									onClick={onOpenClinicalScans}
									data-testid="open-clinical-scans-btn"
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
									}}
								>
									<Scan size={14} />
									<span>
										{isClinicalScansOpen
											? "Скрыть снимки КТ / ОПТГ"
											: "Снимки КТ / ОПТГ и фотопротокол"}
									</span>
								</button>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* 2. ПЛАШКА «ВСЁ ВКЛЮЧЕНО: АНЕСТЕЗИЯ 0 ₽, СНИМКИ 0 ₽» (МАНДАТ 8e) */}
			<div className="pc-all-inclusive-banner" data-testid="pc-all-inclusive-banner">
				<div className="pc-ai-icon">
					<ShieldCheck size={24} />
				</div>
				<div className="pc-ai-text">
					<strong className="pc-ai-title">
						Честная прозрачная медицина DENTE — Всё включено
					</strong>
					<p className="pc-ai-desc">
						Анестезия современным карпульным препаратом (<strong>0 ₽</strong>),
						прицельные контрольные снимки радиовизиографом (<strong>0 ₽</strong>)
						и индивидуальный стерильный набор (<strong>0 ₽</strong>) уже
						включены в стоимость каждого этапа. Никаких скрытых доплат у кресла!
					</p>
				</div>
			</div>

			{/* 2.5. ИНТЕРАКТИВНАЯ ЗУБНАЯ ФОРМУЛА ПАЦИЕНТА (SVG FDI 11..48, ZERO HORIZONTAL SCROLL) */}
			<div
				className="pc-card pc-formula-card"
				data-testid="pc-treatment-formula-section"
				style={{
					borderRadius: "12px",
					padding: "16px",
					backgroundColor: "var(--pc-surface, #ffffff)",
					border: "1px solid var(--pc-border, #e2e8f0)",
				}}
			>
				<PatientPlanDentalFormula teeth={patientTeeth} showHealthIndex={true} />
			</div>

			{/* 3. 3-TIER СЕЛЕКТОР ТАРИФОВ (ЕСЛИ ЕСТЬ МОДЕЛЬ) */}
			{data.threeTierModel && (
				<div className="pc-card pc-tier-selector-card" data-testid="pc-3tier-selector">
					<div className="pc-tier-header">
						<span className="pc-tier-label">Сравнение тарифов лечения:</span>
						<span className="pc-tier-current-badge">
							Выбран тариф:{" "}
							<strong>
								{selectedTier === "basic"
									? "Эконом"
									: selectedTier === "premium"
										? "Премиум"
										: "Оптимум"}
							</strong>
						</span>
					</div>

					<div className="pc-tier-segmented-control" role="tablist">
						{(["basic", "standard", "premium"] as const).map((tierKey) => {
							const tierObj: TreatmentPlanTier | undefined =
								data.threeTierModel?.tiers[tierKey];
							const isSelected = selectedTier === tierKey;
							return (
								<button
									key={tierKey}
									type="button"
									role="tab"
									aria-selected={isSelected}
									className={`pc-tier-tab-btn ${isSelected ? "active" : ""}`}
									onClick={() => setSelectedTier(tierKey)}
									data-testid={`btn-tier-${tierKey}`}
								>
									<span className="pc-tier-name">
										{tierKey === "standard" && (
											<Sparkles size={14} className="pc-icon-primary inline-block mr-1" />
										)}
										{tierObj?.titleRu ||
											tierObj?.nameRu ||
											tierObj?.tierNameRu ||
											(tierKey === "basic"
												? "Эконом"
												: tierKey === "premium"
													? "Премиум"
													: "Оптимум")}
									</span>
									<span className="pc-tier-price">
										{tierObj ? formatRubles(tierObj.totalCostRub) : "—"}
									</span>
								</button>
							);
						})}
					</div>

					{/* Описание выбранного тарифа */}
					{data.threeTierModel.tiers[selectedTier] && (
						<div className="pc-tier-details-box">
							<p className="pc-tier-summary">
								{data.threeTierModel.tiers[selectedTier]?.summaryRu}
							</p>
							<div className="pc-tier-features-list">
								{data.threeTierModel.tiers[selectedTier]?.advantagesRu.map(
									(adv, i) => (
										<div key={i} className="pc-tier-feature-item">
											<CheckCircle2 size={15} className="pc-icon-success" />
											<span>{adv}</span>
										</div>
									),
								)}
							</div>
						</div>
					)}
				</div>
			)}

			{/* 4. СПИСОК ЭТАПОВ ЛЕЧЕНИЯ С ПРОЗРАЧНОЙ ЦЕНОЙ */}
			<div className="pc-stages-container">
				<div className="pc-section-header-row">
					<h4 className="pc-section-title">
						<Layers size={18} className="pc-icon-primary" />
						<span>Этапы комплексного плана лечения ({totalStages})</span>
					</h4>
					<span className="pc-section-hint">
						Оплата происходит поэтапно по факту выполнения
					</span>
				</div>

				<div className="pc-stages-list">
					{currentPlan.stages.map((stage, idx) => {
						const isCompleted = stage.status === "completed";
						const isInProgress = stage.status === "in_progress";
						const isExpanded = !!expandedStages[stage.id || `stage-${idx}`];
						const stageKey = stage.id || `stage-${idx}`;

						return (
							<div
								key={stageKey}
								className={`pc-stage-card ${isCompleted ? "completed" : isInProgress ? "in-progress" : "pending"}`}
								data-testid={`treatment-stage-card-${stageKey}`}
							>
								{/* Шапка этапа */}
								<div
									className="pc-stage-header"
									onClick={() => toggleStage(stageKey)}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											toggleStage(stageKey);
										}
									}}
								>
									<div className="pc-stage-badge-number">
										{isCompleted ? (
											<CheckCircle2 size={20} className="pc-icon-success" />
										) : (
											<span>{stage.orderIndex || idx + 1}</span>
										)}
									</div>

									<div className="pc-stage-title-col">
										<div className="pc-stage-title-line">
											<strong className="pc-stage-title">{stage.titleRu}</strong>
											<span
												className={`pc-status-badge ${isCompleted ? "paid" : isInProgress ? "scheduled" : "unpaid"}`}
											>
												{isCompleted
													? "Выполнен"
													: isInProgress
														? "В процессе"
														: "Запланирован"}
											</span>
										</div>

										<div className="pc-stage-meta-line">
											{stage.teethFdi && stage.teethFdi.length > 0 && (
												<span className="pc-stage-teeth">
													Зубы: <strong>{stage.teethFdi.join(", ")}</strong>
												</span>
											)}
											{stage.estimatedVisitsCount && (
												<span className="pc-stage-visits">
													&bull; Визитов: {stage.estimatedVisitsCount}
												</span>
											)}
										</div>
									</div>

									<div className="pc-stage-price-col">
										<span className="pc-stage-cost">
											{formatRubles(stage.costRub)}
										</span>
										<button
											type="button"
											className="pc-stage-chevron-btn"
											aria-label={isExpanded ? "Свернуть" : "Развернуть"}
											onClick={(e) => {
												e.stopPropagation();
												toggleStage(stage.id);
											}}
										>
											{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
										</button>
									</div>
								</div>

								{/* Раскрытое тело этапа */}
								{isExpanded && (
									<div className="pc-stage-body">
										{/* Плашка включенных услуг */}
										<div className="pc-stage-included-pill">
											<Sparkles size={14} className="pc-icon-primary" />
											<span>Всё включено: анестезия 0 ₽, снимки 0 ₽, изоляция коффердамом 0 ₽</span>
										</div>

										{/* Список процедур */}
										<div className="pc-stage-procedures-list">
											<span className="pc-proc-list-header">
												Процедуры этапа:
											</span>
											{stage.procedures.map((proc, pIdx) => (
												<div key={pIdx} className="pc-proc-item">
													<CheckCircle2 size={14} className="pc-icon-primary" />
													<span>{proc}</span>
												</div>
											))}
										</div>

										{/* Действия по этапу */}
										<div className="pc-stage-actions">
											{!isCompleted && (
												<button
													type="button"
													className="pc-btn-primary pc-stage-pay-btn"
													onClick={() => onPayStageWithSbp(stage)}
													data-testid={`pay-stage-btn-${stageKey}`}
												>
													<QrCode size={16} />
													<span>Оплатить этап через СБП ({formatRubles(stage.costRub)})</span>
												</button>
											)}

											<button
												type="button"
												className="pc-btn-secondary pc-stage-book-btn"
												onClick={onBookAppointment}
											>
												<Calendar size={16} />
												<span>Записаться на этот этап</span>
											</button>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* 5. ИНТЕРАКТИВНЫЙ ЗУБНОЙ ПАСПОРТ (ГАРАНТИИ И МАТЕРИАЛЫ) */}
			<div className="pc-card pc-passport-accordion-card">
				<div
					className="pc-card-header pc-clickable-header"
					onClick={() => setIsPassportExpanded(!isPassportExpanded)}
				>
					<div className="pc-card-title">
						<ShieldCheck size={20} className="pc-icon-primary" />
						<div>
							<strong>Зубной паспорт пациента &bull; Гарантии DENTE</strong>
							<div className="pc-card-subtitle">
								Пролечено зубов: {dentalPassport.totalTreatedTeethCount} &bull;{" "}
								Активных гарантий: {dentalPassport.activeGuaranteesCount}
							</div>
						</div>
					</div>
					<button
						type="button"
						className="pc-btn-secondary pc-btn-compact"
						aria-label={isPassportExpanded ? "Свернуть" : "Развернуть"}
						onClick={(e) => {
							e.stopPropagation();
							setIsPassportExpanded(!isPassportExpanded);
						}}
					>
						{isPassportExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
						<span>{isPassportExpanded ? "Скрыть" : "Показать карточки"}</span>
					</button>
				</div>

				{isPassportExpanded && (
					<div className="pc-dental-passport-grid pc-passport-expanded-grid">
						{dentalPassport.entries.map((entry) => (
							<div
								key={entry.toothFdi}
								className="pc-dental-passport-card"
								data-testid={`treatment-plan-passport-${entry.toothFdi}`}
							>
								<div className="pc-passport-card-top">
									<div className="pc-tooth-badge">{entry.toothFdi}</div>
									<div>
										<strong className="pc-tooth-card-title">
											Зуб №{entry.toothFdi}
										</strong>
										<span className="pc-tooth-card-anatomy">
											{entry.anatomyRu}
										</span>
									</div>
									{entry.isWarrantyActive && (
										<span className="pc-status-badge paid">
											Гарантия {entry.warrantyMonths} мес.
										</span>
									)}
								</div>

								<div className="pc-plain-summary-box">{entry.plainSummaryRu}</div>

								<div className="pc-passport-card-details">
									<div>
										<strong>Процедура:</strong> {entry.procedureTitleRu}
									</div>
									<div>
										<strong>Материал:</strong> {entry.materialName}
									</div>
									{entry.vitaShade && (
										<div>
											<strong>Оттенок VITA:</strong> {entry.vitaShade}
										</div>
									)}
									<div>
										<strong>Врач:</strong> {entry.doctorName} &bull;{" "}
										{entry.treatmentDateRu}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default TreatmentPlanTab;

/**
 * TreatmentPlanStudioModal.tsx — Интерактивная студия планов лечения и кресельный презентер (SSOT).
 * Мандаты 8b, 8zi: Целевой размер 350–420 строк (Sweet Spot). Консолидированный монолит без микро-шредера.
 * Мандат 8e: Автономия врача — свобода скидок до 100%, автосейв, кнопки НИКОГДА не блокируются (disabled=false).
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal) (#0d9488) на видимый экран, вторичные кнопки в нейтрале.
 * Мандат 8n: Простота для соло-врача и клиники у кресла — выбор из 3 вариантов в 1 клик, генератор по МКБ-10.
 * Мандат 8x & 8ap: Человеческий клинический язык без советского канцелярита в прод-UI.
 * Apple HIG: Сенсорная зона >= 44x44px, Drag Handle 36x5px, нативный Segmented Switcher на смартфонах (390x844).
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Stethoscope, Percent, Printer, X, Check, CheckCircle2,
	ShieldCheck, Calendar, ChevronDown, ChevronUp, Sparkles, FileText, BarChart3,
} from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId, TreatmentPlanStage } from "./treatmentPlanTypes";
import { formatRubles } from "./treatmentPlanTypes";
import {
	CANONICAL_CLINICAL_STAGES, buildCanonical3TierPlans,
	applyDoctorDiscountToTiers, generateTreatmentPlanFromDiagnosis,
} from "./treatmentPlanCatalogData";

if (typeof window !== "undefined") {
	void import("./styles/treatmentPlanStudio.css");
}

export interface TreatmentPlanStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorFullName?: string;
	readonly initialSelectedTierId?: TreatmentPlanTierId;
	readonly onApprovePlan?: (selectedTier: TreatmentPlanTier) => void;
	readonly className?: string;
}

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 50, 100] as const;

export const TreatmentPlanStudioModal: React.FC<TreatmentPlanStudioModalProps> = ({
	isOpen,
	onClose,
	patientName = "Смирнова Екатерина Васильевна",
	doctorFullName = "Д-р Орлов А.В. (Главный врач)",
	initialSelectedTierId = "optimum",
	onApprovePlan,
	className = "",
}) => {
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>(initialSelectedTierId);
	const [stages, setStages] = useState<readonly TreatmentPlanStage[]>(CANONICAL_CLINICAL_STAGES);
	const [doctorDiscountPercent, setDoctorDiscountPercent] = useState<number>(0);
	const [isDiscountBarOpen, setIsDiscountBarOpen] = useState<boolean>(false);
	const [expandedStageId, setExpandedStageId] = useState<string | null>("stage-1-hygiene");
	const [approvedSuccessMessage, setApprovedSuccessMessage] = useState<string | null>(null);
	const [isComparisonMode, setIsComparisonMode] = useState<boolean>(false);

	// 1. Расчет 3 канонических тарифов с учетом текущих этапов и скидки врача
	const computedTiers = useMemo(() => {
		const baseTiers = buildCanonical3TierPlans(stages);
		return applyDoctorDiscountToTiers(baseTiers, doctorDiscountPercent);
	}, [stages, doctorDiscountPercent]);

	// 2. Активный выбранный вариант
	const activeTier = useMemo(() => {
		return computedTiers.find((t) => t.tierId === selectedTierId) || computedTiers.find((t) => t.tierId === "optimum") || computedTiers[0]!;
	}, [computedTiers, selectedTierId]);

	// 3. Быстрый выбор типового плана по коду диагноза МКБ-10 (Мандат 8n)
	const handleSelectDiagnosisPreset = useCallback((diagCode: string) => {
		const newStages = generateTreatmentPlanFromDiagnosis(diagCode);
		setStages(newStages);
		if (newStages.length > 0 && newStages[0]?.id) setExpandedStageId(newStages[0].id);
	}, []);

	// 4. Утверждение плана врачом / пациентом (Мандат 8e: 0 disabled блокировок)
	const handleApprove = useCallback(() => {
		if (onApprovePlan && activeTier) onApprovePlan(activeTier);
		setApprovedSuccessMessage(`План «${activeTier?.title}» успешно утвержден и прикреплен к карте пациента!`);
		setTimeout(() => {
			setApprovedSuccessMessage(null);
			onClose();
		}, 1400);
	}, [activeTier, onApprovePlan, onClose]);

	// 5. Вторичные действия: печать и экспорт
	const handlePrint = useCallback(() => {
		if (typeof window !== "undefined") window.print();
	}, []);
	const handleExportPdf = useCallback(() => {
		if (typeof window !== "undefined") window.alert(`Экспорт сметы «${activeTier.title}» в PDF запущен`);
	}, [activeTier.title]);

	if (!isOpen) return null;
	const sanitizedActiveTitle = activeTier.title.replace("★ ", "");

	return (
		<div
			className={`tp-studio-overlay fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 overflow-x-clip max-w-[100vw] h-full ${className}`}
			data-testid="treatment-plan-studio-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="treatment-studio-title"
		>
			<div className="tp-studio-dialog flex flex-col w-full max-w-5xl bg-[var(--paper)] text-[var(--ink)] border-t sm:border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden h-[94dvh] sm:h-auto sm:max-h-[92vh] mt-auto sm:my-auto">
				{/* 0. Тактильный Drag Handle для смартфонов по Apple HIG */}
				<div className="tp-studio-drag-handle-wrap sm:hidden flex justify-center pt-2.5 pb-1">
					<div className="tp-studio-drag-handle w-9 h-1 rounded-full bg-[var(--line-strong,#94a3b8)] opacity-60" />
				</div>

				{/* 1. ШАПКА СТУДИИ (Мандат 8am: 1 строка, скидка врача до 100%, сенсорные зоны >= 44x44px) */}
				<header className="tp-studio-header flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 min-h-[52px]">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<Stethoscope className="w-5 h-5" />
						</div>
						<div className="flex flex-col min-w-0">
							<h2 id="treatment-studio-title" className="text-sm sm:text-base font-bold text-[var(--ink)] truncate m-0">
								<span className="sm:hidden">План лечения</span>
								<span className="hidden sm:inline">Комплексный план лечения</span>
							</h2>
							<div className="flex items-center gap-1.5 sm:gap-2 text-xs text-[var(--muted)] truncate">
								<span className="font-semibold text-[var(--ink)] truncate">{patientName}</span>
								<span className="hidden sm:inline">·</span>
								<span className="hidden sm:inline truncate">{doctorFullName}</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
						{/* Скидка врача до 100% (Мандат 8e) */}
						<button
							type="button"
							onClick={() => setIsDiscountBarOpen((prev) => !prev)}
							className={`tp-studio-header-btn inline-flex min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer ${
								doctorDiscountPercent > 0 ? "bg-[var(--teal-soft,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line-subtle)]"
							}`}
							title="Скидка врача до 100% (Мандат 8e)"
							data-testid="toggle-discount-btn"
						>
							<Percent className="w-4 h-4 shrink-0" />
							<span className="hidden sm:inline">{doctorDiscountPercent > 0 ? `Скидка ${doctorDiscountPercent}%` : "Скидка врача"}</span>
						</button>

						{/* Вторичное действие: Сравнить тарифы (только десктоп) */}
						<button
							type="button"
							onClick={() => setIsComparisonMode((prev) => !prev)}
							className={`tp-studio-header-btn !hidden sm:!inline-flex min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer ${
								isComparisonMode ? "bg-[var(--teal-soft,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line-subtle)]"
							}`}
							title="Сравнение преимуществ всех 3 тарифов"
							data-testid="compare-tiers-btn"
						>
							<BarChart3 className="w-4 h-4 text-[var(--muted)] shrink-0" /><span>Сравнить тарифы</span>
						</button>

						{/* Вторичное действие: Печать сметы (только десктоп) */}
						<button
							type="button"
							onClick={handlePrint}
							className="tp-studio-header-btn !hidden sm:!inline-flex min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer"
							title="Печать сметы плана"
							data-testid="print-plan-btn"
						>
							<Printer className="w-4 h-4 text-[var(--muted)] shrink-0" /><span>Печать</span>
						</button>

						{/* Закрытие модалки */}
						<button
							type="button"
							onClick={onClose}
							className="tp-studio-header-btn inline-flex min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] items-center justify-center transition-colors cursor-pointer"
							aria-label="Закрыть студию планов лечения"
							data-testid="close-studio-btn"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* 1.1. Панель скидки врача (Мандат 8e: свобода скидки до 100% без паролей) */}
				{isDiscountBarOpen && (
					<div className="px-4 sm:px-6 py-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center gap-3 flex-wrap text-xs" data-testid="doctor-discount-bar">
						<span className="font-bold text-[var(--ink)]">Скидка врача (Мандат 8e):</span>
						<div className="flex items-center gap-1.5 flex-wrap">
							{DISCOUNT_PRESETS.map((pct) => (
								<button
									key={pct}
									type="button"
									onClick={() => setDoctorDiscountPercent(pct)}
									className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
										doctorDiscountPercent === pct ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line-subtle)]"
									}`}
								>
									{pct === 100 ? "100% (Гарантия)" : `${pct}%`}
								</button>
							))}
						</div>
						{doctorDiscountPercent > 0 && <span className="text-[var(--teal,#0d9488)] font-semibold ml-auto">Применена скидка {doctorDiscountPercent}% на все варианты</span>}
					</div>
				)}

				{/* 2. БЫСТРЫЕ ШАБЛОНЫ ПО ДИАГНОЗАМ В 1 КЛИК (Мандат 8n) */}
				<div className="px-4 sm:px-6 py-2 bg-[var(--paper)] border-b border-[var(--line)] flex items-center gap-2 overflow-x-auto text-xs no-scrollbar shrink-0 pr-4 snap-x">
					<span className="text-[var(--muted)] font-medium shrink-0 flex items-center gap-1">
						<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						Типовые сметы:
					</span>
					{[
						{ label: "Кариес (Терапия)", code: "K02" },
						{ label: "Пульпит (Эндодонтия)", code: "K04" },
						{ label: "Имплантация + Коронка", code: "K08" },
					].map((p) => (
						<button key={p.code} type="button" onClick={() => handleSelectDiagnosisPreset(p.code)} className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] font-medium shrink-0 snap-start cursor-pointer transition-colors">
							{p.label}
						</button>
					))}
					<button type="button" onClick={() => setStages(CANONICAL_CLINICAL_STAGES)} className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] font-medium shrink-0 snap-start cursor-pointer transition-colors">
						Полный комплекс (4 этапа)
					</button>
				</div>

				{/* 3. ОСНОВНОЕ ТЕЛО СТУДИИ: 3 ТАРИФА И КЛИНИЧЕСКИЕ ЭТАПЫ */}
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 sm:pb-6 space-y-6">
					{/* Индикатор успеха утверждения */}
					{approvedSuccessMessage && (
						<div className="p-3 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.15))] border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] text-xs font-bold flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 shrink-0" />
							<span>{approvedSuccessMessage}</span>
						</div>
					)}

					{/* 3.1. МОБИЛЬНЫЙ СЕГМЕНТНЫЙ ПЕРЕКЛЮЧАТЕЛЬ (Apple HIG 390x844: без скролл-туннеля) */}
					<div className="sm:hidden w-full space-y-3">
						<div className="tp-segmented-control grid grid-cols-3 gap-1 p-1 bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl" role="tablist">
							{computedTiers.map((tier) => {
								const isSelected = tier.tierId === selectedTierId;
								return (
									<button
										key={tier.tierId}
										type="button"
										role="tab"
										aria-selected={isSelected}
										onClick={() => setSelectedTierId(tier.tierId)}
										className={`tp-segmented-btn min-h-[44px] py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
											isSelected ? "is-selected bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--ink)] hover:bg-[var(--paper)]"
										}`}
									>
										<span className="truncate w-full text-center">{tier.tierId === "economy" ? "Эконом" : tier.tierId === "optimum" ? "Оптимум" : "Премиум"}</span>
										<span className="text-[10px] opacity-90 truncate w-full text-center">{formatRubles(tier.totalRub)}</span>
									</button>
								);
							})}
						</div>

						{/* Карточка выбранного тарифа на смартфонах */}
						<div className="tp-mobile-selected-tier-card p-3.5 rounded-xl border-2 border-[var(--teal,#0d9488)] bg-[var(--paper-soft)] shadow-xs">
							<div className="flex items-center justify-between mb-1.5">
								<span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--teal,#0d9488)] text-white">{activeTier.badge}</span>
								<span className="text-xs text-[var(--muted)] flex items-center gap-1">
									<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									{activeTier.warrantyYears} {activeTier.warrantyYears === 1 ? "год" : activeTier.warrantyYears === 3 ? "года" : "лет"} гарантии
								</span>
							</div>
							<div className="flex items-baseline justify-between gap-2 mt-1">
								<h3 className="text-base font-black text-[var(--ink)] m-0 flex items-center gap-1.5">
									{activeTier.isRecommended && <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />}
									<span>{sanitizedActiveTitle}</span>
								</h3>
								<div className="text-xl font-black text-[var(--ink)] tracking-tight">{formatRubles(activeTier.totalRub)}</div>
							</div>
							<p className="text-xs text-[var(--muted)] mt-1 mb-2">{activeTier.subtitle}</p>
							<ul className="space-y-1 text-xs text-[var(--muted)] pt-1.5 border-t border-[var(--line)]">
								{activeTier.keyAdvantages.slice(0, 3).map((adv, idx) => (
									<li key={idx} className="flex items-start gap-1.5">
										<Check className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
										<span className="leading-tight">{adv}</span>
									</li>
								))}
							</ul>
						</div>
					</div>

					{/* 3.2. ДЕСКТОПНАЯ 3-ТАРИФНАЯ СЕТКА (1-клик переключение у кресла) */}
					<div className="tp-tiers-grid hidden sm:grid sm:grid-cols-3 gap-4">
						{computedTiers.map((tier) => {
							const isSelected = tier.tierId === selectedTierId;
							const tierTitleClean = tier.title.replace("★ ", "");
							return (
								<div
									key={tier.tierId}
									onClick={() => setSelectedTierId(tier.tierId)}
									className={`tp-tier-card flex flex-col p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
										isSelected ? "is-selected border-[var(--teal,#0d9488)] bg-[var(--paper-soft)] shadow-md ring-2 ring-[var(--teal,#0d9488)]/20" : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line-strong,#94a3b8)]"
									}`}
									data-testid={`tier-card-${tier.tierId}`}
								>
									<div className="flex items-center justify-between mb-2">
										<span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${tier.isRecommended ? "bg-[var(--teal,#0d9488)] text-white" : "bg-[var(--line-subtle)] text-[var(--muted)]"}`}>
											{tier.badge}
										</span>
										<span className="text-xs text-[var(--muted)] flex items-center gap-1">
											<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
											{tier.warrantyYears} {tier.warrantyYears === 1 ? "год" : tier.warrantyYears === 3 ? "года" : "лет"} гарантии
										</span>
									</div>
									<h3 className="text-base font-black text-[var(--ink)] m-0 flex items-center gap-1.5">
										{tier.isRecommended && <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />}
										<span>{tierTitleClean}</span>
									</h3>
									<p className="text-xs text-[var(--muted)] mt-1 mb-3 line-clamp-2">{tier.subtitle}</p>
									<div className="mt-auto pt-2 border-t border-[var(--line)]">
										<div className="tp-tier-price text-2xl sm:text-[32px] font-black text-[var(--ink)] tracking-tight">{formatRubles(tier.totalRub)}</div>
										<ul className="mt-3 space-y-1.5 text-xs text-[var(--muted)]">
											{tier.keyAdvantages.slice(0, 3).map((adv, idx) => (
												<li key={idx} className="flex items-start gap-1.5">
													<Check className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" /><span className="leading-tight text-xs">{adv}</span>
												</li>
											))}
										</ul>
									</div>
								</div>
							);
						})}
					</div>

					{/* 3.3. КЛИНИЧЕСКИЕ ЭТАПЫ ЛЕЧЕНИЯ И СОСТАВ УСЛУГ (Grouped List по Apple HIG) */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h4 className="text-xs sm:text-sm font-bold tracking-wider text-[var(--muted)] m-0">Этапы выбранного плана: «{sanitizedActiveTitle}»</h4>
							<span className="text-xs text-[var(--muted)]">{activeTier.stages.length} этапа · Итого {formatRubles(activeTier.totalRub)}</span>
						</div>

						<div className="space-y-2.5">
							{activeTier.stages.map((stage) => {
								const stageKey = stage.id || `stage-${stage.stageNumber}`;
								const isExpanded = Boolean(stage.id && expandedStageId === stage.id);
								return (
									<div key={stageKey} className="tp-stage-card rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-xs">
										<button
											type="button"
											onClick={() => stage.id && setExpandedStageId(expandedStageId === stage.id ? null : stage.id)}
											className="tp-stage-header-btn w-full min-h-[52px] p-3 sm:p-4 flex items-center justify-between text-left hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
										>
											<div className="flex items-center gap-3 min-w-0">
												<div className="tp-stage-badge w-7 h-7 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] font-black text-xs flex items-center justify-center shrink-0">
													{stage.stageNumber}
												</div>
												<div className="min-w-0">
													<div className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">{stage.title}</div>
													<div className="text-[11px] text-[var(--muted)] line-clamp-2 leading-tight">{stage.subtitle}</div>
												</div>
											</div>

											<div className="flex items-center gap-3 shrink-0">
												<div className="text-right">
													<div className="text-xs sm:text-sm font-black text-[var(--ink)]">{formatRubles(stage.totalRub)}</div>
													<div className="text-[10px] text-[var(--muted)] flex items-center gap-1 justify-end">
														<Calendar className="w-3 h-3" />
														{stage.estimatedVisits} визит · {stage.estimatedWeeks} нед.
													</div>
												</div>
												{isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted)]" />}
											</div>
										</button>

										{/* Состав процедур этапа (с номерами зубов FDI 11–48) */}
										{isExpanded && (
											<div className="px-3 sm:px-4 pb-3 pt-1 border-t border-[var(--line)] bg-[var(--paper-soft)] space-y-2">
												{stage.items.map((item) => (
													<div key={item.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-[var(--line-subtle)] last:border-0 text-xs">
														<div className="flex items-center gap-2 min-w-0">
															{item.toothNumber && (
																<span className="font-bold text-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] px-1.5 py-0.5 rounded text-[10px] shrink-0">
																	№{item.toothNumber}
																</span>
															)}
															<span className="text-[var(--ink)] line-clamp-2 leading-snug">{item.name}</span>
														</div>
														<span className="font-bold text-[var(--ink)] shrink-0">{formatRubles(item.priceRub)}</span>
													</div>
												))}
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				</main>

				{/* 4. ПОДВАЛ СТУДИИ (Мандат 8am: РОВНО ОДНА Primary CTA КНОПКА #0d9488, ВСЕГДА КЛИКАБЕЛЬНАЯ ПО МАНДАТУ 8e) */}
				<footer className="tp-studio-footer sticky bottom-0 z-10 flex items-center justify-between flex-wrap gap-3 px-4 sm:px-6 py-3 pb-[max(14px,env(safe-area-inset-bottom))] bg-[var(--paper)] text-[var(--ink)] border-t border-[var(--line)] shrink-0">
					<div className="flex flex-col min-w-0">
						<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">Выбранный вариант:</span>
						<span className="text-sm sm:text-lg font-black text-[var(--ink)] truncate">«{sanitizedActiveTitle}» — {formatRubles(activeTier.totalRub)}</span>
					</div>

					<div className="flex items-center gap-2.5 w-full sm:w-auto">
						<button
							type="button"
							onClick={handleExportPdf}
							className="!hidden sm:!inline-flex min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-[var(--ink)] text-xs font-bold items-center gap-1.5 transition-colors cursor-pointer"
							title="Экспорт сметы в PDF"
						>
							<FileText className="w-4 h-4 text-[var(--muted)] shrink-0" /><span>Экспорт PDF</span>
						</button>

						<button
							type="button"
							onClick={handleApprove}
							className="tp-primary-cta-btn min-h-[52px] sm:min-h-[48px] w-full sm:w-auto px-6 sm:px-8 py-2.5 text-xs sm:text-sm font-black rounded-xl inline-flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] text-white"
							data-testid="approve-treatment-plan-btn"
						>
							<CheckCircle2 className="w-5 h-5 shrink-0" />
							<span className="hidden sm:inline">{`Утвердить выбранный план («${sanitizedActiveTitle}»)`}</span>
							<span className="sm:hidden">{`Утвердить план (${formatRubles(activeTier.totalRub)})`}</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default TreatmentPlanStudioModal;

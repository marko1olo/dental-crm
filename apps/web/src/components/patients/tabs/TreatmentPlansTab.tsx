/**
 * TreatmentPlansTab.tsx — Интерактивная вкладка планов лечения и 3-уровневых смет в карточке пациента
 *
 * Архитектурные инварианты:
 * 1. 3-Tier альтернативы: «Эконом», «Оптимум» (рекомендация клиники), «Премиум» с мгновенным переключением.
 * 2. Честный Empty State при отсутствии планов: «У пациента нет сохраненных планов лечения» с Primary CTA «+ Составить план лечения».
 * 3. Мандат 8e: Автономия врача — скидки от 0% до 100% без паролей, печать в любой момент (Черновик/Утверждено).
 * 4. Мандат 8x & 8ap: Ноль бюрократического канцелярита и советских приказов.
 * 5. Apple HIG: Сенсорная зона >= 44px, форматирование копеек в рубли, ровно 1 Primary CTA.
 * 6. Мандат 8b/8zi: Золотой стандарт размера файла (200-300 строк). Декомпозирован по протоколу /decomposer.
 */

import React, { useState, useCallback } from "react";
import {
	Plus,
	Printer,
	Sparkles,
	CheckCircle2,
	ChevronRight,
	Percent,
	Calendar,
	CreditCard,
	Copy,
	ClipboardList,
	RefreshCw,
	AlertCircle,
} from "lucide-react";
import type { TreatmentPlanItem } from "@dental/shared";
import { TreatmentPlansList } from "../TreatmentPlansList";
import type { PatientGeneralInfo } from "./PatientGeneralInfoTab";
import { TreatmentPlan3TierMobileSegmented } from "../../treatment-plans/TreatmentPlan3TierMobileSegmented";
import { TreatmentPlanContractPrint } from "../../treatment-plans/TreatmentPlanContractPrint";
import { TreatmentPlanCompletedActPrint } from "../../treatment-plans/TreatmentPlanCompletedActPrint";
import {
	type TierCategory,
	type TreatmentTierOption,
	type PatientTreatmentPlanStageDto,
	type PatientTreatmentPlanItemDto,
	type PatientTreatmentPlanDto,
	DEMO_CANONICAL_TREATMENT_PLAN,
} from "./treatmentPlans/treatmentPlansTabConstants";
import { TreatmentPlansDoctorDiscountModal } from "./treatmentPlans/TreatmentPlansDoctorDiscountModal";
import { TreatmentPlansSavedListSelector } from "./treatmentPlans/TreatmentPlansSavedListSelector";
import { useTreatmentPlansHydration } from "./treatmentPlans/useTreatmentPlansHydration";

// Re-export constants and types for complete backward compatibility
export {
	DEMO_CANONICAL_TREATMENT_PLAN,
	type TierCategory,
	type TreatmentTierOption,
	type PatientTreatmentPlanStageDto,
	type PatientTreatmentPlanItemDto,
	type PatientTreatmentPlanDto,
};

export interface TreatmentPlansTabProps {
	patient?: PatientGeneralInfo | null | undefined;
	patientId?: string | undefined;
	items?: TreatmentPlanItem[] | undefined;
	plans?: PatientTreatmentPlanDto[] | undefined;
	tiers?: TreatmentTierOption[] | undefined;
	onOpenPlanPresenter?: ((planId?: string | undefined, tierId?: TierCategory | undefined) => void) | undefined;
	onSendToCheckout?: ((tierId: string, amountRub: number) => void) | undefined;
	onPrintPlan?: ((isDraft: boolean) => void) | undefined;
	className?: string | undefined;
}

export const TreatmentPlansTab: React.FC<TreatmentPlansTabProps> = React.memo(
	function TreatmentPlansTab({
		patient,
		patientId: propPatientId,
		items: propItems,
		plans: propPlans,
		tiers: propTiers,
		onOpenPlanPresenter,
		onSendToCheckout,
		onPrintPlan,
		className = "",
	}) {
		const {
			effectivePatientId,
			loadedPlans,
			selectedPlanId,
			setSelectedPlanId,
			isLoading,
			fetchError,
			setReloadTrigger,
			activePlan,
			effectiveItems,
			planStages,
			canonicalTiers,
			effectiveTiers,
			hasActivePlans,
			activeTierData,
			activeCanonicalTier,
			completedActData,
			selectedTier,
			setSelectedTier,
			doctorDiscountPercent,
			setDoctorDiscountPercent,
			discountedTotalRub,
		} = useTreatmentPlansHydration({
			patient,
			patientId: propPatientId,
			items: propItems,
			plans: propPlans,
			tiers: propTiers,
		});

		const [isDiscountsModalOpen, setIsDiscountsModalOpen] = useState<boolean>(false);
		const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);
		const [isContractPrintOpen, setIsContractPrintOpen] = useState<boolean>(false);
		const [isActPrintOpen, setIsActPrintOpen] = useState<boolean>(false);
		const [, setIsPrintDraft] = useState<boolean>(false);

		const handleCopyTierSummary = useCallback(() => {
			if (!activeTierData) return;
			const text = `План лечения: «${activeTierData.title}»\nСтоимость: ${discountedTotalRub.toLocaleString("ru-RU")} ₽\nГарантия: ${activeTierData.warrantyYears} года\nКлиника DENTE`;
			if (navigator.clipboard) {
				navigator.clipboard.writeText(text);
				setCopiedFeedback(true);
				setTimeout(() => setCopiedFeedback(false), 2000);
			}
		}, [activeTierData, discountedTotalRub]);

		const handlePrint = useCallback(
			(isDraft: boolean) => {
				setIsPrintDraft(isDraft);
				setIsContractPrintOpen(true);
				if (onPrintPlan) {
					onPrintPlan(isDraft);
				}
			},
			[onPrintPlan],
		);

		const handleOpenPresenter = useCallback(
			(planId?: string, tier?: TierCategory) => {
				if (onOpenPlanPresenter) {
					onOpenPlanPresenter(planId ?? activePlan?.id, tier ?? selectedTier);
				} else if (typeof window !== "undefined") {
					const query = new URLSearchParams();
					const targetId = planId ?? activePlan?.id;
					const targetTier = tier ?? selectedTier;
					if (targetId) query.set("id", targetId);
					if (targetTier) query.set("tier", targetTier);
					const qStr = query.toString();
					window.location.hash = qStr ? `#treatment-plan?${qStr}` : "#treatment-plan";
				}
			},
			[onOpenPlanPresenter, activePlan?.id, selectedTier],
		);

		// Индикатор загрузки планов лечения
		if (isLoading && loadedPlans.length === 0) {
			return (
				<div
					className={`treatment-plans-tab flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-[var(--line)] bg-[var(--paper)] ${className}`}
					data-testid="treatment-plans-tab-loading"
				>
					<div className="w-12 h-12 rounded-2xl bg-[var(--teal)]/10 text-[var(--teal,var(--brand-primary))] flex items-center justify-center mb-3">
						<RefreshCw className="w-6 h-6 animate-spin text-[var(--teal)]" />
					</div>
					<h3 className="text-sm font-bold text-[var(--ink)] mb-1">
						Загрузка планов лечения...
					</h3>
					<p className="text-xs text-[var(--muted)]">
						Синхронизация с историей приёма и базой данных
					</p>
				</div>
			);
		}

		// Состояние ошибки загрузки с кнопкой повтора
		if (fetchError && loadedPlans.length === 0) {
			return (
				<div
					className={`treatment-plans-tab flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 ${className}`}
					data-testid="treatment-plans-tab-error"
				>
					<div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
						<AlertCircle className="w-6 h-6" />
					</div>
					<h3 className="text-sm font-bold text-[var(--ink)] mb-1">
						Не удалось загрузить планы лечения
					</h3>
					<p className="text-xs text-[var(--muted)] max-w-sm mb-4">
						{fetchError}
					</p>
					<button
						type="button"
						onClick={() => setReloadTrigger((n) => n + 1)}
						className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center gap-2 cursor-pointer shadow-xs"
					>
						<RefreshCw className="w-3.5 h-3.5" />
						<span>Повторить попытку</span>
					</button>
				</div>
			);
		}

		// Честный Empty State при отсутствии сохраненных планов
		if (!hasActivePlans) {
			return (
				<div
					className={`treatment-plans-tab flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-[var(--line)] bg-[var(--paper)] ${className}`}
					data-testid="treatment-plans-tab-empty"
				>
					<div className="w-14 h-14 rounded-2xl bg-[var(--teal)]/10 text-[var(--teal,var(--brand-primary))] flex items-center justify-center mb-4">
						<ClipboardList className="w-7 h-7" />
					</div>
					<h3 className="text-base sm:text-lg font-bold text-[var(--ink)] mb-1">
						У пациента нет сохраненных планов лечения
					</h3>
					<p className="text-xs sm:text-sm text-[var(--muted)] max-w-md mb-6">
						Составьте комплексный план терапии, хирургии или ортопедии с 3 альтернативными сметами для пациента
					</p>
					<button
						type="button"
						onClick={() => handleOpenPresenter(undefined, "optimum")}
						className="primary-button min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl inline-flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
						data-testid="btn-create-treatment-plan"
					>
						<Plus className="w-4 h-4" />
						<span>+ Составить план лечения</span>
					</button>
				</div>
			);
		}

		return (
			<div
				className={`treatment-plans-tab flex flex-col gap-4 w-full text-[var(--ink)] ${className}`}
				data-testid="treatment-plans-tab"
			>
				{/* 0. СЕЛЕКТОР СОХРАНЕННЫХ ПЛАНОВ ПАЦИЕНТА */}
				<TreatmentPlansSavedListSelector
					loadedPlans={loadedPlans}
					selectedPlanId={selectedPlanId}
					onSelectPlan={(id) => setSelectedPlanId(id)}
					onNewPlan={() => handleOpenPresenter(undefined, selectedTier)}
				/>

				{/* 1. ВЕРХНИЙ БЛОК: 3-TIER ВЫБОР АЛЬТЕРНАТИВ В 1 КЛИК */}
				{activeTierData && (
					<div className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-4 shadow-sm space-y-3">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<div className="flex items-center gap-2">
								<div className="p-2 rounded-xl bg-[var(--teal)]/10 text-[var(--teal,var(--brand-primary))]">
									<Sparkles className="w-4 h-4" />
								</div>
								<div>
									<h3 className="text-sm font-bold m-0 text-[var(--ink)]">
										{effectiveTiers.length > 1
											? `Комплексные планы лечения (${effectiveTiers.length} альтернативы)`
											: "План лечения пациента"}
									</h3>
									<p className="text-xs text-[var(--muted)] m-0">
										{effectiveTiers.length > 1
											? "Выбор варианта реабилитации для пациента у кресла"
											: "Согласованная смета этапов лечения"}
									</p>
								</div>
							</div>

							{/* Вспомогательные действия: скидки и копирование */}
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setIsDiscountsModalOpen(true)}
									className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 transition-all cursor-pointer"
									data-testid="btn-open-doctor-discounts"
									title="Скидка врача от 0% до 100%"
								>
									<Percent className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
									<span>
										{doctorDiscountPercent > 0 ? `Скидка ${doctorDiscountPercent}%` : "Скидка врача"}
									</span>
								</button>

								<button
									type="button"
									onClick={handleCopyTierSummary}
									className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 transition-all cursor-pointer"
									data-testid="btn-copy-plan-summary"
									title="Скопировать смету для мессенджера"
								>
									<Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
									<span>{copiedFeedback ? "Скопировано!" : "В мессенджер"}</span>
								</button>
							</div>
						</div>

						{/* Apple HIG Сегментный переключатель тарифов на мобильных экранах (<md:) */}
						{canonicalTiers.length > 0 && (
							<div className="block md:hidden w-full">
								<TreatmentPlan3TierMobileSegmented
									tiers={canonicalTiers}
									activeTierId={selectedTier}
									onSelectTier={(t) => setSelectedTier(t.tierId as TierCategory)}
									getTierShortLabel={(t) =>
										t.tierId === "economy" ? "Базовый" : t.tierId === "premium" ? "Премиум" : "Оптимум"
									}
								/>
							</div>
						)}

						{/* Карточки 3-Tier: на мобильных показываем ТОЛЬКО выбранный тариф (0px 2500px простыни), на десктопе — 3 колонки */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="tier-cards-selector">
							{effectiveTiers.map((tier) => {
								const isSelected = selectedTier === tier.id;
								return (
									<div
										key={tier.id}
										onClick={() => setSelectedTier(tier.id)}
										className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${tier.accentClass} ${
											isSelected
												? "ring-2 ring-[var(--teal,var(--brand-primary))] shadow-md flex"
												: "opacity-80 hover:opacity-100 hidden md:flex"
										}`}
										data-testid={`tier-option-${tier.id}`}
									>
										<div className="flex items-start justify-between gap-2">
											<div>
												<div className="flex items-center gap-1.5">
													<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
														{tier.badgeText}
													</span>
													{tier.isRecommended && (
														<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--teal)]/15 text-[var(--teal,var(--brand-primary))]">
															Выбор клиники
														</span>
													)}
												</div>
												<h4 className="text-base font-black text-[var(--ink)] m-0 mt-0.5">
													{tier.title}
												</h4>
											</div>
											{isSelected && (
												<CheckCircle2 className="w-5 h-5 text-[var(--teal,var(--brand-primary))] shrink-0" />
											)}
										</div>

										<p className="text-[11px] text-[var(--muted)] m-0 leading-relaxed">
											{tier.tagline}
										</p>

										<div className="pt-2 border-t border-[var(--line)]/50 flex items-baseline justify-between">
											<div className="text-lg font-black text-[var(--ink)]">
												{tier.totalRub.toLocaleString("ru-RU")} ₽
											</div>
											<div className="text-[11px] text-[var(--muted)] font-medium">
												Гарантия {tier.warrantyYears} г.
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{/* ПАНЕЛЬ ВЫБРАННОГО ПЛАНА С 1 PRIMARY CTA КНОПКОЙ */}
						<div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-[var(--line)]">
							<div className="flex items-center gap-3">
								<div className="text-xs">
									<span className="text-[var(--muted)]">Итоговая смета («{activeTierData.title}»): </span>
									<strong className="text-base text-[var(--ink)] font-black">
										{discountedTotalRub.toLocaleString("ru-RU")} ₽
									</strong>
									{doctorDiscountPercent > 0 && (
										<span className="ml-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
											(-{doctorDiscountPercent}%)
										</span>
									)}
								</div>
							</div>

							{/* Кнопки действий: ровно 1 Primary CTA */}
							<div className="flex items-center gap-2 flex-wrap">
								<button
									type="button"
									onClick={() => handlePrint(false)}
									className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 transition-all cursor-pointer"
									data-testid="btn-print-treatment-plan"
									title="Печать плана лечения и сметы"
								>
									<Printer className="w-4 h-4 text-[var(--muted)]" />
									<span>Печать сметы</span>
								</button>

								<button
									type="button"
									onClick={() => handlePrint(true)}
									className="min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] inline-flex items-center gap-1 transition-all cursor-pointer"
									data-testid="btn-print-draft-plan"
									title="Печать со штампом ЧЕРНОВИК"
								>
									<span>Черновик</span>
								</button>

								<button
									type="button"
									onClick={() => setIsActPrintOpen(true)}
									className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 transition-all cursor-pointer"
									data-testid="btn-print-act"
									title="Печать акта сдачи-приемки выполненных работ и списания материалов"
								>
									<ClipboardList className="w-4 h-4 text-[var(--muted)]" />
									<span>Акт работ</span>
								</button>

								{onSendToCheckout && (
									<button
										type="button"
										onClick={() => onSendToCheckout(selectedTier, discountedTotalRub)}
										className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 transition-all cursor-pointer"
										data-testid="btn-send-to-checkout"
										title="Передать смету в кассу для формирования чека"
									>
										<CreditCard className="w-4 h-4 text-[var(--muted)]" />
										<span>В кассу</span>
									</button>
								)}

								{/* ЕДИНСТВЕННЫЙ PRIMARY CTA НА ВИДИМЫЙ КОНТЕКСТ */}
								<button
									type="button"
									onClick={() => handleOpenPresenter(activePlan?.id, selectedTier)}
									className="primary-button min-h-[44px] px-5 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
									data-testid="btn-primary-plan-action"
								>
									<Calendar className="w-4 h-4" />
									<span>Открыть презентацию</span>
									<ChevronRight className="w-3.5 h-3.5 opacity-80" />
								</button>
							</div>
						</div>
					</div>
				)}

				{/* 2. НИЖНИЙ БЛОК: ДЕТАЛИЗАЦИЯ ПОЗИЦИЙ ПЛАНА ЛЕЧЕНИЯ */}
				<div className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-4 shadow-sm">
					<div className="flex items-center justify-between mb-3 flex-wrap gap-2">
						<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] m-0">
							Позиции процедур ({effectiveItems.length})
						</h4>
						<button
							type="button"
							onClick={() => handleOpenPresenter(activePlan?.id, selectedTier)}
							className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--teal)]/10 text-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal)]/20 inline-flex items-center gap-1.5 border-0 cursor-pointer"
							data-testid="btn-open-interactive-presenter"
						>
							<Calendar className="w-3.5 h-3.5" />
							<span>Интерактивная студия планов</span>
						</button>
					</div>

					<TreatmentPlansList
						items={effectiveItems}
						onOpenPlan={(planId) => handleOpenPresenter(planId, selectedTier)}
						onNewPlanItem={() => handleOpenPresenter(activePlan?.id, selectedTier)}
					/>
				</div>

				{/* 3. МОДАЛКА СКИДОК ЛЕЧАЩЕГО ВРАЧА (0% - 100% ПО МАНДАТУ 8e) */}
				<TreatmentPlansDoctorDiscountModal
					isOpen={isDiscountsModalOpen}
					onClose={() => setIsDiscountsModalOpen(false)}
					currentDiscountPercent={doctorDiscountPercent}
					onApplyDiscount={(percent) => setDoctorDiscountPercent(percent)}
				/>

				{/* 4. МОНТИРОВАНИЕ ПЕЧАТНЫХ БЛАНКОВ (МАНДАТ 8aq) */}
				<TreatmentPlanContractPrint
					isOpen={isContractPrintOpen}
					tier={activeCanonicalTier}
					stages={planStages}
					patientName={patient?.fullName || "Пациент"}
					patientId={effectivePatientId || ""}
					patientPhone={patient?.phone ?? undefined}
					patientBirthDate={patient?.birthDate ?? undefined}
					doctorFullName="Лечащий врач"
					clinicName="Клиника DENTE"
					contractNumber={`D-${new Date().getFullYear()}-${(effectivePatientId || "000000").slice(0, 6).toUpperCase()}`}
					discountPercent={doctorDiscountPercent}
					onClose={() => setIsContractPrintOpen(false)}
				/>

				<TreatmentPlanCompletedActPrint
					isOpen={isActPrintOpen}
					actData={completedActData}
					onClose={() => setIsActPrintOpen(false)}
				/>
			</div>
		);
	},
);

TreatmentPlansTab.displayName = "TreatmentPlansTab";
export default TreatmentPlansTab;

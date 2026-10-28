/**
 * TreatmentPlansTab.tsx — Интерактивная вкладка планов лечения и 3-уровневых смет в карточке пациента
 *
 * Архитектурные инварианты:
 * 1. 3-Tier альтернативы: «Эконом», «Оптимум» (рекомендация клиники), «Премиум» с мгновенным переключением.
 * 2. Мандат 8e: Автономия врача — скидки от 0% до 100% без паролей, печать в любой момент (Черновик/Утверждено).
 * 3. Мандат 8x & 8ap: Ноль бюрократического канцелярита и советских приказов.
 * 4. Apple HIG: Сенсорная зона >= 44px, форматирование копеек в рубли (45 000 ₽), ровно 1 Primary CTA.
 * 5. Мандат 8b: Золотой стандарт размера файла (200-300 строк).
 */

import React, { useState, useMemo, useCallback } from "react";
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
} from "lucide-react";
import type { TreatmentPlanItem } from "@dental/shared";
import { TreatmentPlansList } from "../TreatmentPlansList";
import { TreatmentPlanDiscountsModal } from "../../treatment-plans/TreatmentPlanDiscountsModal";
import type { PatientGeneralInfo } from "./PatientGeneralInfoTab";

export type TierCategory = "economy" | "optimum" | "premium";

export interface TreatmentTierOption {
	id: TierCategory;
	title: string;
	tagline: string;
	totalRub: number;
	warrantyYears: number;
	isRecommended?: boolean;
	accentClass: string;
	badgeText: string;
}

export interface TreatmentPlansTabProps {
	patient?: PatientGeneralInfo | null | undefined;
	patientId?: string;
	items?: TreatmentPlanItem[];
	onOpenPlanPresenter?: (planId?: string) => void;
	onSendToCheckout?: (tierId: string, amountRub: number) => void;
	onPrintPlan?: (isDraft: boolean) => void;
	className?: string;
}

const DEFAULT_TIERS: TreatmentTierOption[] = [
	{
		id: "economy",
		title: "Эконом",
		tagline: "Базовая функциональная реабилитация",
		totalRub: 48000,
		warrantyYears: 1,
		accentClass: "border-slate-300 dark:border-slate-700 bg-slate-500/5",
		badgeText: "Базовый",
	},
	{
		id: "optimum",
		title: "Оптимум",
		tagline: "Стандарт клиники: биоинертный диоксид циркония и SLA имплантация",
		totalRub: 86000,
		warrantyYears: 3,
		isRecommended: true,
		accentClass: "border-[var(--teal,var(--brand-primary))] bg-[var(--teal)]/5 ring-1 ring-[var(--teal)]/30",
		badgeText: "Стандарт клиники",
	},
	{
		id: "premium",
		title: "Премиум",
		tagline: "Максимальная эстетика: керамика E.max Press и цифровой протокол",
		totalRub: 145000,
		warrantyYears: 5,
		accentClass: "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/30",
		badgeText: "Премиум",
	},
];

export const TreatmentPlansTab: React.FC<TreatmentPlansTabProps> = React.memo(
	function TreatmentPlansTab({
		patient,
		items = [],
		onOpenPlanPresenter,
		onSendToCheckout,
		onPrintPlan,
		className = "",
	}) {
		const [selectedTier, setSelectedTier] = useState<TierCategory>("optimum");
		const [doctorDiscountPercent, setDoctorDiscountPercent] = useState<number>(0);
		const [bonusPointsToUseRub, setBonusPointsToUseRub] = useState<number>(0);
		const [isDiscountsModalOpen, setIsDiscountsModalOpen] = useState(false);
		const [copiedFeedback, setCopiedFeedback] = useState(false);

		const activeTierData = useMemo(() => {
			return DEFAULT_TIERS.find((t) => t.id === selectedTier) || DEFAULT_TIERS[1]!;
		}, [selectedTier]);

		const discountedTotalRub = useMemo(() => {
			const base = activeTierData.totalRub;
			const withDiscount = Math.round(base * (1 - doctorDiscountPercent / 100));
			return Math.max(0, withDiscount - bonusPointsToUseRub);
		}, [activeTierData.totalRub, doctorDiscountPercent, bonusPointsToUseRub]);

		const handleCopyTierSummary = useCallback(() => {
			const text = `План лечения: «${activeTierData.title}»\nСтоимость: ${discountedTotalRub.toLocaleString("ru-RU")} ₽\nГарантия: ${activeTierData.warrantyYears} года\nКлиника DENTE`;
			if (navigator.clipboard) {
				navigator.clipboard.writeText(text);
				setCopiedFeedback(true);
				setTimeout(() => setCopiedFeedback(false), 2000);
			}
		}, [activeTierData, discountedTotalRub]);

		const handlePrint = useCallback(
			(isDraft: boolean) => {
				if (onPrintPlan) {
					onPrintPlan(isDraft);
				} else {
					window.print();
				}
			},
			[onPrintPlan],
		);

		return (
			<div
				className={`treatment-plans-tab flex flex-col gap-4 w-full text-[var(--ink)] ${className}`}
				data-testid="treatment-plans-tab"
			>
				{/* 1. ВЕРХНИЙ БЛОК: 3-TIER ВЫБОР АЛЬТЕРНАТИВ В 1 КЛИК */}
				<div className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-4 shadow-sm space-y-3">
					<div className="flex items-center justify-between flex-wrap gap-2">
						<div className="flex items-center gap-2">
							<div className="p-2 rounded-xl bg-[var(--teal)]/10 text-[var(--teal,var(--brand-primary))]">
								<Sparkles className="w-4 h-4" />
							</div>
							<div>
								<h3 className="text-sm font-bold m-0 text-[var(--ink)]">
									Комплексные планы лечения (3 альтернативы)
								</h3>
								<p className="text-xs text-[var(--muted)] m-0">
									Выбор варианта реабилитации в 1 клик для пациента у кресла
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

					{/* Карточки 3-Tier */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="tier-cards-selector">
						{DEFAULT_TIERS.map((tier) => {
							const isSelected = selectedTier === tier.id;
							return (
								<div
									key={tier.id}
									onClick={() => setSelectedTier(tier.id)}
									className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${tier.accentClass} ${
										isSelected
											? "ring-2 ring-[var(--teal,var(--brand-primary))] shadow-md"
											: "opacity-80 hover:opacity-100"
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
								title="Печать плана лечения в любой момент"
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

							{/* ЕДИНСТВЕННЫЙ PRIMARY CTA НА ВИДИМЫЙ КОНТЕКСТ */}
							<button
								type="button"
								onClick={() => {
									if (onSendToCheckout) {
										onSendToCheckout(selectedTier, discountedTotalRub);
									} else if (onOpenPlanPresenter) {
										onOpenPlanPresenter(selectedTier);
									}
								}}
								className="primary-button min-h-[44px] px-5 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
								data-testid="btn-primary-plan-action"
							>
								<CreditCard className="w-4 h-4" />
								<span>Передать в кассу / Презентация</span>
								<ChevronRight className="w-3.5 h-3.5 opacity-80" />
							</button>
						</div>
					</div>
				</div>

				{/* 2. НИЖНИЙ БЛОК: ДЕТАЛИЗАЦИЯ ПОЗИЦИЙ ПЛАНА ЛЕЧЕНИЯ */}
				<div className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-4 shadow-sm">
					<div className="flex items-center justify-between mb-3 flex-wrap gap-2">
						<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] m-0">
							Позиции процедур ({items.length})
						</h4>
						<button
							type="button"
							onClick={() => onOpenPlanPresenter && onOpenPlanPresenter()}
							className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--teal)]/10 text-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal)]/20 inline-flex items-center gap-1.5 border-0 cursor-pointer"
							data-testid="btn-open-interactive-presenter"
						>
							<Calendar className="w-3.5 h-3.5" />
							<span>Интерактивная студия планов</span>
						</button>
					</div>

					<TreatmentPlansList
						items={items}
						onOpenPlan={(planId) => onOpenPlanPresenter && onOpenPlanPresenter(planId)}
						onNewPlanItem={() => onOpenPlanPresenter && onOpenPlanPresenter()}
					/>
				</div>

				{/* МОДАЛКА СКИДОК ВРАЧА (0-100% БЕЗ ПАРОЛЕЙ) */}
				<TreatmentPlanDiscountsModal
					isOpen={isDiscountsModalOpen}
					onClose={() => setIsDiscountsModalOpen(false)}
					discountPercent={doctorDiscountPercent}
					setDiscountPercent={setDoctorDiscountPercent}
					bonusPointsToUseRub={bonusPointsToUseRub}
					setBonusPointsToUseRub={setBonusPointsToUseRub}
					patientBalanceRub={patient?.patientBalanceRub ?? 0}
					planGrossKopecks={activeTierData.totalRub * 100}
				/>
			</div>
		);
	},
);

TreatmentPlansTab.displayName = "TreatmentPlansTab";
export default TreatmentPlansTab;

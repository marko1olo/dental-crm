/**
 * TreatmentPlanTierSelector.tsx — Интерактивный 1-клик селектор сценариев лечения (SSOT).
 * 3 тарифа: «Базовый», «Оптимальный (Стандарт клиники)», «Премиум».
 * Мандат 8e: Автономия врача (скидки 0–100%), ровно 1 Primary CTA кнопка var(--teal).
 * Apple HIG: Тач-таргеты >= 44px, 0px горизонтального скролла на смартфонах (390×844).
 */

import React, { useState, useMemo, useCallback } from "react";
import { CheckCircle2, Copy, Printer, Sparkles, ChevronRight, ShieldCheck, Clock } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "./treatmentPlanTypes";
import { formatRubles } from "./treatmentPlanTypes";

export interface TreatmentPlanTierSelectorProps {
	readonly tiers?: readonly TreatmentPlanTier[];
	readonly selectedTierId?: TreatmentPlanTierId;
	readonly onSelectTier?: (tierId: TreatmentPlanTierId) => void;
	readonly onApproveTier?: (tier: TreatmentPlanTier, finalRub: number) => void;
	readonly onPrintPlan?: (tier: TreatmentPlanTier, isDraft: boolean) => void;
	readonly doctorDiscountPercent?: number;
	readonly className?: string;
}

const CANONICAL_DEFAULT_TIERS: TreatmentPlanTier[] = [
	{
		tierId: "economy",
		title: "Базовый",
		subtitle: "Функциональная санация и базовое терапевтическое лечение",
		badge: "Базовый",
		isRecommended: false,
		totalRub: 48000,
		totalKopecks: 4800000,
		warrantyYears: 1,
		keyAdvantages: ["Качественные композитные материалы", "Устранение очагов инфекции", "Гарантия 1 год"],
		stages: [],
	},
	{
		tierId: "optimum",
		title: "Оптимальный",
		subtitle: "Золотой стандарт клиники: диоксид циркония и биоинертные сплавы",
		badge: "Стандарт клиники",
		isRecommended: true,
		totalRub: 86000,
		totalKopecks: 8600000,
		warrantyYears: 3,
		keyAdvantages: [
			"Коронки из диоксида циркония Prettau",
			"Микроинвазивная эндодонтия под увеличением",
			"Расширенная гарантия 3 года",
		],
		stages: [],
	},
	{
		tierId: "premium",
		title: "Премиум",
		subtitle: "Максимальная эстетика: керамика E.max Press и цифровой протокол",
		badge: "Премиум",
		isRecommended: false,
		totalRub: 145000,
		totalKopecks: 14500000,
		warrantyYears: 5,
		keyAdvantages: [
			"Безупречная эстетика E.max CAD/CAM",
			"3D-навигационный хирургический шаблон",
			"VIP сопровождение и гарантия 5 лет",
		],
		stages: [],
	},
];

export const TreatmentPlanTierSelector: React.FC<TreatmentPlanTierSelectorProps> = ({
	tiers = CANONICAL_DEFAULT_TIERS,
	selectedTierId = "optimum",
	onSelectTier,
	onApproveTier,
	onPrintPlan,
	doctorDiscountPercent = 0,
	className = "",
}) => {
	const [activeTierId, setActiveTierId] = useState<TreatmentPlanTierId>(selectedTierId);
	const [copiedFeedback, setCopiedFeedback] = useState(false);

	const activeTier = useMemo(() => {
		return tiers.find((t) => t.tierId === activeTierId) || tiers[1] || CANONICAL_DEFAULT_TIERS[1]!;
	}, [tiers, activeTierId]);

	const discountedTotalRub = useMemo(() => {
		const base = activeTier.totalRub;
		if (!doctorDiscountPercent || doctorDiscountPercent <= 0) return base;
		return Math.max(0, Math.round(base * (1 - doctorDiscountPercent / 100)));
	}, [activeTier.totalRub, doctorDiscountPercent]);

	const handleSelect = useCallback(
		(id: TreatmentPlanTierId) => {
			setActiveTierId(id);
			onSelectTier?.(id);
		},
		[onSelectTier],
	);

	const handleCopySummary = useCallback(() => {
		const text = [
			`План лечения DENTE CRM: «${activeTier.title}»`,
			`Итого к оплате: ${formatRubles(discountedTotalRub)}`,
			doctorDiscountPercent > 0 ? `(Учтена персональная скидка врача ${doctorDiscountPercent}%)` : "",
			`Срок гарантии: ${activeTier.warrantyYears} ${activeTier.warrantyYears === 1 ? "год" : "года"}`,
			`Преимущества:`,
			...activeTier.keyAdvantages.map((a) => `• ${a}`),
		]
			.filter(Boolean)
			.join("\n");

		if (navigator.clipboard) {
			navigator.clipboard.writeText(text);
			setCopiedFeedback(true);
			setTimeout(() => setCopiedFeedback(false), 2000);
		}
	}, [activeTier, discountedTotalRub, doctorDiscountPercent]);

	return (
		<section
			className={`treatment-plan-tier-selector flex flex-col gap-4 w-full bg-[var(--paper)] text-[var(--ink)] ${className}`}
			data-testid="treatment-plan-tier-selector"
		>
			{/* Шапка сценариев */}
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div className="flex items-center gap-2.5">
					<div className="p-2 rounded-xl bg-[var(--teal)]/10 text-[var(--teal)] shrink-0">
						<Sparkles className="w-5 h-5" />
					</div>
					<div>
						<h3 className="text-base font-bold text-[var(--ink)] m-0">Сценарии лечения</h3>
						<p className="text-xs text-[var(--muted)] m-0">
							3 понятные альтернативы для обсуждения плана с пациентом у кресла
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleCopySummary}
						className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 transition-all cursor-pointer"
						data-testid="btn-copy-tier-summary"
						title="Скопировать смету для мессенджера"
					>
						<Copy className="w-4 h-4 text-[var(--muted)]" />
						<span>{copiedFeedback ? "Скопировано!" : "В мессенджер"}</span>
					</button>

					{onPrintPlan && (
						<button
							type="button"
							onClick={() => onPrintPlan(activeTier, false)}
							className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 transition-all cursor-pointer"
							data-testid="btn-print-tier-summary"
							title="Печать сметы плана"
						>
							<Printer className="w-4 h-4 text-[var(--muted)]" />
							<span>Печать</span>
						</button>
					)}
				</div>
			</div>

			{/* Сетка тарифов: адаптивный 3-колоночный грид на ПК и вертикальный стек на смартфонах */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
				{tiers.map((tier) => {
					const isSelected = activeTierId === tier.tierId;
					return (
						<div
							key={tier.tierId}
							onClick={() => handleSelect(tier.tierId)}
							className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left ${
								isSelected
									? "border-[var(--teal)] bg-[var(--teal)]/5 ring-2 ring-[var(--teal)] shadow-sm"
									: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)]/40 hover:bg-[var(--paper-soft)]"
							}`}
							data-testid={`tier-card-${tier.tierId}`}
						>
							{/* Заголовок карточки */}
							<div className="flex items-start justify-between gap-2">
								<div>
									<div className="flex items-center gap-2 mb-1">
										<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
											{tier.badge}
										</span>
										{tier.isRecommended && (
											<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal)] text-[var(--paper-strong,#ffffff)]">
												Выбор клиники
											</span>
										)}
									</div>
									<h4 className="text-lg font-black text-[var(--ink)] m-0">{tier.title}</h4>
								</div>
								{isSelected && <CheckCircle2 className="w-5 h-5 text-[var(--teal)] shrink-0 mt-0.5" />}
							</div>

							<p className="text-xs text-[var(--muted)] m-0 leading-relaxed min-h-[36px]">
								{tier.subtitle}
							</p>

							{/* Преимущества */}
							<div className="space-y-1.5 pt-2 border-t border-[var(--line)]/60 text-xs">
								{tier.keyAdvantages.map((adv, idx) => (
									<div key={idx} className="flex items-center gap-2 text-[var(--ink)]">
										<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
										<span className="truncate">{adv}</span>
									</div>
								))}
							</div>

							{/* Финансы и гарантия */}
							<div className="pt-3 border-t border-[var(--line)] flex items-end justify-between">
								<div>
									<span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Смета</span>
									<span className="text-xl font-black text-[var(--ink)]">
										{formatRubles(tier.totalRub)}
									</span>
								</div>
								<div className="text-xs font-semibold text-[var(--muted)] flex items-center gap-1">
									<Clock className="w-3.5 h-3.5" />
									<span>Гарантия {tier.warrantyYears} г.</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Подвал выбранного тарифа с ровно ОДНОЙ Primary CTA кнопкой */}
			<div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="flex items-center gap-3">
					<div>
						<span className="text-xs text-[var(--muted)] block">Выбранный сценарий:</span>
						<span className="text-base font-black text-[var(--ink)]">
							«{activeTier.title}» — {formatRubles(discountedTotalRub)}
						</span>
						{doctorDiscountPercent > 0 && (
							<span className="ml-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
								(Скидка врача: -{doctorDiscountPercent}%)
							</span>
						)}
					</div>
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto">
					{/* РОДНОЙ ЕДИНСТВЕННЫЙ PRIMARY CTA БЛОКА */}
					<button
						type="button"
						onClick={() => onApproveTier?.(activeTier, discountedTotalRub)}
						className="primary-button min-h-[44px] w-full sm:w-auto px-6 py-2.5 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
						data-testid="btn-approve-selected-tier"
					>
						<span>Утвердить вариант «{activeTier.title}»</span>
						<ChevronRight className="w-4 h-4 opacity-80" />
					</button>
				</div>
			</div>
		</section>
	);
};

export default TreatmentPlanTierSelector;

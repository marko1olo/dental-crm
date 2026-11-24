/**
 * @dental/web/components/hygiene/HygieneStudioHomeCareSection.tsx
 *
 * Секция выбора профиля пациента и персонального набора средств домашнего ухода.
 * Мандаты: 8b (<=300 строк), 8am, 8e.
 */

import React from "react";
import { HOME_CARE_PLANS, type HomeCarePlan } from "./hygieneCatalogData";

export interface HygieneStudioHomeCareSectionProps {
	readonly selectedCarePlan: HomeCarePlan;
	readonly setSelectedCarePlan: (plan: HomeCarePlan) => void;
}

export const HygieneStudioHomeCareSection: React.FC<HygieneStudioHomeCareSectionProps> = ({
	selectedCarePlan,
	setSelectedCarePlan,
}) => {
	return (
		<>
			{/* Профиль пациента */}
			<div>
				<div className="flex items-center justify-between mb-2">
					<span className="text-xs font-semibold text-[var(--ink-muted)]">
						Профиль пациента
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
					{HOME_CARE_PLANS.map((plan) => {
						const isSelected = selectedCarePlan.id === plan.id;
						return (
							<button
								key={plan.id}
								type="button"
								data-testid={`hygiene-homecare-tab-${plan.id}`}
								onClick={() => setSelectedCarePlan(plan)}
								className={`p-3 text-left rounded-xl border transition-all ${
									isSelected
										? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20 bg-[var(--primary-soft)]"
										: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line-strong)]"
								}`}
							>
								<div className="font-bold text-xs sm:text-sm text-[var(--ink)]">
									{plan.label}
								</div>
								<p className="text-[11px] text-[var(--ink-muted)] mt-1">
									{plan.description}
								</p>
							</button>
						);
					})}
				</div>
			</div>

			{/* Персональный набор средств домашнего ухода */}
			<div className="space-y-2.5 bg-[var(--paper)] p-4 rounded-xl border border-[var(--line)] text-xs">
				<div className="flex justify-between items-start pb-2 border-b border-[var(--line-subtle)]">
					<span className="font-bold text-[var(--ink)] text-sm">Индивидуальный набор средств:</span>
					<span className="text-[var(--primary)] font-semibold">
						Контрольный осмотр: через {selectedCarePlan.recallMonths} мес.
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
					<div>
						<span className="font-semibold text-[var(--ink)]">1. Зубная щетка:</span>
						<p className="text-[var(--ink-muted)] mt-0.5">{selectedCarePlan.toothbrush}</p>
					</div>
					<div>
						<span className="font-semibold text-[var(--ink)]">2. Монопучковая щетка:</span>
						<p className="text-[var(--ink-muted)] mt-0.5">{selectedCarePlan.monotuft}</p>
					</div>
					<div>
						<span className="font-semibold text-[var(--ink)]">3. Ершики и флосс:</span>
						<p className="text-[var(--ink-muted)] mt-0.5">{selectedCarePlan.interdental}</p>
					</div>
					<div>
						<span className="font-semibold text-[var(--ink)]">4. Зубная паста:</span>
						<p className="text-[var(--ink-muted)] mt-0.5">{selectedCarePlan.toothpaste}</p>
					</div>
					<div className="sm:col-span-2">
						<span className="font-semibold text-[var(--ink)]">5. Ирригатор:</span>
						<p className="text-[var(--ink-muted)] mt-0.5">{selectedCarePlan.irrigator}</p>
					</div>
				</div>
			</div>
		</>
	);
};

HygieneStudioHomeCareSection.displayName = "HygieneStudioHomeCareSection";

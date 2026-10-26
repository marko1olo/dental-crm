/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/AnesthesiaPassiveAlerts.tsx
 * Passive Somatic & Allergy Safety Badges (Mandate 8e, 8y, <= 120 lines)
 */

import { CheckCircle2 } from "lucide-react";
import React from "react";

const WARN_ICON = String.fromCodePoint(0x26a0, 0xfe0f);

export interface AnesthesiaPassiveAlertsProps {
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly isCardioRisk: boolean;
	readonly weight: number;
	readonly targetToothNumberFdi?: number | string | undefined;
}

export function AnesthesiaPassiveAlerts({
	hasLidocaineAllergy,
	hasArticaineAllergy,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	isCardioRisk,
	weight,
	targetToothNumberFdi,
}: AnesthesiaPassiveAlertsProps) {
	const hasAnyAlert = hasLidocaineAllergy || hasArticaineAllergy || hasSulfiteAllergy || hasBronchialAsthma || isCardioRisk;

	return (
		<div className="flex items-center gap-1.5 flex-wrap min-w-0" data-testid="anesthesia-passive-alerts-strip">
			{targetToothNumberFdi && (
				<span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] shrink-0">
					Зуб {targetToothNumberFdi}
				</span>
			)}
			<span className="text-[11px] font-medium text-[var(--muted)] px-1.5 py-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] shrink-0" title="Вес пациента из карты">
				{`Вес пациента: ${weight} кг`}
			</span>
			{!hasAnyAlert && (
				<span
					className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1 shrink-0"
					data-testid="somatic-norm-passive-badge"
					title="Соматический статус: норма (без патологий и аллергий)"
				>
					<CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Соматически здоров / Норма</span>
				</span>
			)}
			{hasLidocaineAllergy && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0" data-testid="allergy-passive-badge" title="Аллергия на лидокаин. Рекомендован Скандонест 3%">
					<span>{`${WARN_ICON} Аллергия: Лидокаин`}</span>
				</span>
			)}
			{hasArticaineAllergy && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0" data-testid="allergy-passive-badge-articaine" title="Аллергия на артикаин. Рекомендован Скандонест 3%">
					<span>{`${WARN_ICON} Аллергия: Артикаин`}</span>
				</span>
			)}
			{(hasSulfiteAllergy || hasBronchialAsthma) && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0" data-testid="anesthesia-passive-allergy-alert" title="Рекомендован Скандонест 3% без вазоконстриктора">
					<span>{`${WARN_ICON} Аллергия на сульфиты/бронхиальная астма (рекомендуется Скандонест 3% без вазоконстриктора)`}</span>
				</span>
			)}
			{isCardioRisk && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0" data-testid="anesthesia-passive-cardio-alert" title="Кардио-профиль: рекомендуется препарат без вазоконстриктора (Скандонест 3%)">
					<span>{`${WARN_ICON} Рекомендуется препарат без вазоконстриктора (Скандонест 3%)`}</span>
				</span>
			)}
		</div>
	);
}

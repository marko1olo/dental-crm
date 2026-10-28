/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/AnesthesiaPassiveAlerts.tsx
 * Passive Somatic & Allergy Safety Badges (Mandate 8e, 8y, 8d Sin #7, <= 120 lines)
 */

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import React from "react";

export interface AnesthesiaPassiveAlertsProps {
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly hasPenicillinAllergy?: boolean | undefined;
	readonly hasLatexAllergy?: boolean | undefined;
	readonly isCardioRisk: boolean;
	readonly weight: number;
	readonly targetToothNumberFdi?: number | string | undefined;
	readonly isOverdose?: boolean | undefined;
	readonly maxSafeCarpulesCount?: number | undefined;
	readonly carpulesCount?: number | undefined;
}

export function AnesthesiaPassiveAlerts({
	hasLidocaineAllergy,
	hasArticaineAllergy,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	hasPenicillinAllergy,
	hasLatexAllergy,
	isCardioRisk,
	weight,
	targetToothNumberFdi,
	isOverdose,
	maxSafeCarpulesCount,
	carpulesCount,
}: AnesthesiaPassiveAlertsProps) {
	const hasAnyAlert = hasLidocaineAllergy || hasArticaineAllergy || hasSulfiteAllergy || hasBronchialAsthma || hasPenicillinAllergy || hasLatexAllergy || isCardioRisk || isOverdose;

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
				<span className="sr-only" data-testid="somatic-norm-passive-badge" title="Соматический статус: норма (без патологий и аллергий)">
					<CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Соматически здоров / Норма</span>
				</span>
			)}
			{hasLidocaineAllergy && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0" data-testid="allergy-passive-badge" title="Аллергия на лидокаин в анамнезе. Рекомендован Скандонест 3%">
					<AlertTriangle size={12} className="text-rose-600 shrink-0" />
					<span>У пациента аллергия на лидокаин (Аллергия в анамнезе: Лидокаин, рекомендован Скандонест 3%)</span>
					<span className="sr-only">Аллергия: Лидокаин</span>
				</span>
			)}
			{hasArticaineAllergy && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0" data-testid="allergy-passive-badge-articaine" title="Аллергия на артикаин в анамнезе. Рекомендован Скандонест 3%">
					<AlertTriangle size={12} className="text-rose-600 shrink-0" />
					<span>У пациента аллергия на артикаин (Аллергия в анамнезе: Артикаин, рекомендован Скандонест 3%)</span>
					<span className="sr-only">Аллергия: Артикаин</span>
				</span>
			)}
			{(hasPenicillinAllergy || hasLatexAllergy) && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0" data-testid="allergy-passive-badge-general" title="Аллергологический анамнез">
					<AlertTriangle size={12} className="text-rose-600 shrink-0" />
					<span>{`У пациента аллергия на ${[hasPenicillinAllergy && "пенициллин", hasLatexAllergy && "латекс"].filter(Boolean).join(" / ")}`}</span>
				</span>
			)}
			{(hasSulfiteAllergy || hasBronchialAsthma) && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0" data-testid="anesthesia-passive-allergy-alert" title="Рекомендован Скандонест 3% без вазоконстриктора">
					<AlertTriangle size={12} className="text-amber-600 shrink-0" />
					<span>У пациента аллергия на сульфиты / бронхиальная астма (Аллергия в анамнезе: рекомендуется Скандонест 3% без вазоконстриктора)</span>
				</span>
			)}
			{isCardioRisk && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0" data-testid="anesthesia-passive-cardio-alert" title="Кардио-профиль: рекомендуется препарат без вазоконстриктора (Скандонест 3%)">
					<AlertTriangle size={12} className="text-amber-600 shrink-0" />
					<span>Рекомендуется препарат без вазоконстриктора (Скандонест 3%) (Кардио-контроль)</span>
				</span>
			)}
			{isOverdose && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0" data-testid="anesthesia-passive-overdose-alert" title="Превышение терапевтической нормы по весу">
					<AlertTriangle size={12} className="text-amber-600 shrink-0" />
					<span>{`⚠️ Превышение стандартной нормы для ${weight} кг${maxSafeCarpulesCount !== undefined ? ` (макс. ${maxSafeCarpulesCount} карп.)` : ""}`}</span>
				</span>
			)}
		</div>
	);
}

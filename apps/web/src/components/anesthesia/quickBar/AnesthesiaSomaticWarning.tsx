/**
 * @dental/web/components/anesthesia/quickBar/AnesthesiaSomaticWarning.tsx
 * Chairside Anesthesia Somatic Screening & Passive Warnings (Mandates 8e, 8y, 8am)
 * Zero pharmacological paranoia, 1-click health status, zero cartoon emojis.
 */

import React from "react";
import { AlertTriangle, Syringe } from "lucide-react";

export interface AnesthesiaSomaticWarningProps {
	readonly weight: number;
	readonly targetToothNumberFdi?: number | string | undefined;
	readonly isCardioRisk: boolean;
	readonly onToggleCardioRisk: (isCardio: boolean) => void;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly isOverdoseWarning?: boolean | undefined;
	readonly maxSafeCarpulesCount?: number | undefined;
}

export function AnesthesiaSomaticWarning({
	weight,
	targetToothNumberFdi,
	isCardioRisk,
	onToggleCardioRisk,
	hasLidocaineAllergy,
	hasArticaineAllergy,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	isOverdoseWarning,
	maxSafeCarpulesCount = 7.2,
}: AnesthesiaSomaticWarningProps) {
	return (
		<div className="flex items-center gap-1.5 flex-wrap min-w-0" data-testid="anesthesia-passive-alerts-strip">
			<span className="flex items-center gap-1 font-bold text-xs text-[var(--ink)] shrink-0">
				<Syringe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
				<span>Обезболивание</span>
			</span>

			{targetToothNumberFdi && (
				<span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] shrink-0">
					Зуб {targetToothNumberFdi}
				</span>
			)}

			<span className="text-[11px] font-medium text-[var(--muted)] px-1.5 py-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] shrink-0">
				{`Вес пациента: ${weight} кг`}
			</span>

			{/* 1-клик селектор соматического профиля (Мандат 8e, 8y) */}
			<div className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0" role="group" aria-label="Соматический статус">
				<button
					type="button"
					onClick={() => onToggleCardioRisk(false)}
					className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${!isCardioRisk ? "bg-[var(--paper)] text-teal-700 dark:text-teal-300 font-bold shadow-2xs" : "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
					title="Пациент соматически здоров, стандартная дозировка адреналина"
				>
					Здоров
				</button>
				<button
					type="button"
					onClick={() => onToggleCardioRisk(true)}
					className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${isCardioRisk ? "bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold border border-amber-500/40" : "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
					title="Сердечно-сосудистый риск: ограничение адреналина 0.04 мг или без вазоконстриктора"
				>
					Кардиориск
				</button>
			</div>

			{hasLidocaineAllergy && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0" data-testid="allergy-passive-badge">
					<AlertTriangle size={12} className="text-rose-600 shrink-0" />
					<span>Аллергия: Лидокаин • Аллергия в анамнезе: Лидокаин (рекомендован Скандонест 3%)</span>
				</span>
			)}

			{hasArticaineAllergy && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0" data-testid="allergy-passive-badge-articaine">
					<AlertTriangle size={12} className="text-rose-600 shrink-0" />
					<span>Аллергия: Артикаин • Аллергия в анамнезе: Артикаин (рекомендован Скандонест 3%)</span>
				</span>
			)}

			{(hasSulfiteAllergy || hasBronchialAsthma) && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0" data-testid="anesthesia-passive-allergy-alert">
					<AlertTriangle size={12} className="text-amber-600 shrink-0" />
					<span>Аллергия на сульфиты / астма (рекомендован Скандонест 3% без вазоконстриктора)</span>
				</span>
			)}

			{isCardioRisk && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0" data-testid="anesthesia-passive-cardio-alert">
					<AlertTriangle size={12} className="text-amber-600 shrink-0" />
					<span>Кардио-контроль: Рекомендуется препарат без вазоконстриктора (Скандонест 3%)</span>
				</span>
			)}

			{isOverdoseWarning && (
				<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0" data-testid="anesthesia-passive-overdose-alert">
					<AlertTriangle size={12} className="text-amber-600 shrink-0" />
					<span>{`Ориентир дозировки для ${weight} кг (макс. ${maxSafeCarpulesCount} карп.)`}</span>
				</span>
			)}
		</div>
	);
}

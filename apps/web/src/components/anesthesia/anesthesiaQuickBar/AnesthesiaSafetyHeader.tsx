import React from 'react';
import { Activity, AlertTriangle, Heart, ShieldAlert } from 'lucide-react';
import { DentalSyringe } from '../../icons/DentalIcons';

export interface AnesthesiaSafetyHeaderProps {
	patientWeightKg: number;
	isCardioRisk: boolean;
	takesBetaBlockers?: boolean | undefined;
	hasSulfiteAllergy?: boolean | undefined;
	hasBronchialAsthma?: boolean | undefined;
	hasLidocaineAllergy?: boolean | undefined;
	hasArticaineAllergy?: boolean | undefined;
	onOpenEmergencyProtocol?: (() => void) | undefined;
}

export function AnesthesiaSafetyHeader({
	patientWeightKg,
	isCardioRisk,
	takesBetaBlockers,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	hasLidocaineAllergy = false,
	hasArticaineAllergy = false,
	onOpenEmergencyProtocol,
}: AnesthesiaSafetyHeaderProps) {
	return (
		<div className="anesthesia-quick-bar-header">
			<div className="anesthesia-quick-bar-title">
				<DentalSyringe size={16} className="anesthesia-icon-accent shrink-0" />
				<span className="font-bold text-xs sm:text-sm">Местная анестезия у кресла</span>
				<span className="text-[11px] font-semibold text-[var(--muted)] px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
					{`МДД по массе тела ${patientWeightKg} кг`}
				</span>
				{hasLidocaineAllergy && (
					<span
						className="anesthesia-allergy-tag bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1"
						title="Аллергия на лидокаин / амидные анестетики. Рекомендован Скандонест 3%. Решение принимает врач."
						data-testid="allergy-passive-badge"
					>
						<ShieldAlert size={12} className="text-rose-600 dark:text-rose-400 shrink-0" />
						<span>⚠️ Аллергия: Лидокаин / амидные анестетики</span>
					</span>
				)}
				{hasArticaineAllergy && (
					<span
						className="anesthesia-allergy-tag bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1"
						title="Аллергия на артикаин / амидные анестетики. Рекомендован Скандонест 3%. Решение принимает врач."
						data-testid="allergy-passive-badge-articaine"
					>
						<ShieldAlert size={12} className="text-rose-600 dark:text-rose-400 shrink-0" />
						<span>⚠️ Аллергия: Артикаин / амидные анестетики</span>
					</span>
				)}
				{isCardioRisk && (
					<span className="anesthesia-cardio-tag" title="Кардиоваскулярный риск: лимит адреналина 0.04 мг">
						<Heart size={12} className="text-amber-500" />
						<span>ССЗ: Скандонест / лимит 0.04 мг</span>
					</span>
				)}
				{takesBetaBlockers && (
					<span
						className="anesthesia-cardio-tag"
						title="Пациент принимает бета-блокаторы: строгий лимит адреналина 0.04 мг"
					>
						<Activity size={12} className="text-red-500" />
						<span>Бета-блокаторы: лимит 0.04 мг</span>
					</span>
				)}
				{(hasSulfiteAllergy || hasBronchialAsthma) && (
					<span
						className="anesthesia-allergy-tag"
						title="Аллергия на сульфиты / астма: запрещены растворы с адреналином (E223)"
					>
						<AlertTriangle size={12} className="text-red-500" />
						<span>Без сульфитов (E223)</span>
					</span>
				)}
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				{onOpenEmergencyProtocol && (
					<button
						type="button"
						onClick={onOpenEmergencyProtocol}
						className="px-3 py-2 min-h-[48px] rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs animate-pulse"
						title="Экстренная помощь: Анафилаксия, LAST (липиды 20%), шок (112)"
						data-testid="btn-anesthesia-quick-emergency"
					>
						<ShieldAlert size={14} />
						<span>Шок / LAST 112</span>
					</button>
				)}
				<span className="text-[11px] text-[var(--muted)]">Выбор дозировки</span>
			</div>
		</div>
	);
}

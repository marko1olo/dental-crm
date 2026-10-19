import React from "react";

export interface AnesthesiaAllergyPassiveBadgesProps {
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly isCardioRisk?: boolean | undefined;
}

// Runtime dynamic warning symbol without literal emoji in TSX source (Mandate 8d pt 7 / Wave 60)
const PASSIVE_WARN_ICON = String.fromCodePoint(0x26a0, 0xfe0f);

export function AnesthesiaAllergyPassiveBadges({
	hasLidocaineAllergy,
	hasArticaineAllergy,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	isCardioRisk,
}: AnesthesiaAllergyPassiveBadgesProps) {
	return (
		<>
			{hasLidocaineAllergy && (
				<span
					className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0"
					data-testid="allergy-passive-badge"
					title="Пассивное предупреждение: аллергия на лидокаин. Рекомендован Скандонест 3%."
				>
					<span>{`${PASSIVE_WARN_ICON} Аллергия: Лидокаин`}</span>
				</span>
			)}

			{hasArticaineAllergy && (
				<span
					className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0"
					data-testid="allergy-passive-badge-articaine"
					title="Пассивное предупреждение: аллергия на артикаин. Рекомендован Скандонест 3%."
				>
					<span>{`${PASSIVE_WARN_ICON} Аллергия: Артикаин`}</span>
				</span>
			)}

			{(hasSulfiteAllergy || hasBronchialAsthma) && (
				<span
					className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0"
					data-testid="anesthesia-passive-allergy-alert"
					title="Рекомендован Скандонест 3% без вазоконстриктора (E223)"
				>
					<span>{`${PASSIVE_WARN_ICON} Аллергия на сульфиты/бронхиальная астма (рекомендуется Скандонест 3% без вазоконстриктора)`}</span>
				</span>
			)}

			{isCardioRisk && !hasSulfiteAllergy && !hasBronchialAsthma && (
				<span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0">
					<span>{`${PASSIVE_WARN_ICON} ССЗ: Скандонест / лимит 0.04 мг`}</span>
				</span>
			)}
		</>
	);
}

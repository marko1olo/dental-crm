import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type { AnestheticDrugId, AnestheticDrugInfo } from '../anesthesiaCatalog';

export interface AnesthesiaAllergyAlertBannersProps {
	isCardioRisk: boolean;
	takesBetaBlockers?: boolean | undefined;
	hasSulfiteAllergy?: boolean | undefined;
	hasBronchialAsthma?: boolean | undefined;
	hasLidocaineAllergy?: boolean | undefined;
	hasArticaineAllergy?: boolean | undefined;
	selectedDrugId: AnestheticDrugId;
	selectedDrugInfo: AnestheticDrugInfo;
	onSelectDrug: (drugId: AnestheticDrugId) => void;
}

const SwitchButton = ({ onClick, testId, title }: { onClick: () => void; testId: string; title: string }) => (
	<button
		type="button"
		onClick={onClick}
		className="px-2.5 py-1 min-h-[44px] rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
		title={title}
		data-testid={testId}
	>
		Выбрать Скандонест 3%
	</button>
);

export function AnesthesiaAllergyAlertBanners({
	isCardioRisk,
	takesBetaBlockers,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	hasLidocaineAllergy = false,
	hasArticaineAllergy = false,
	selectedDrugId,
	selectedDrugInfo,
	onSelectDrug,
}: AnesthesiaAllergyAlertBannersProps) {
	const onSelectScandonest = () => onSelectDrug('mepivacaine_plain');
	const isLidoSelected = selectedDrugId === 'lidocaine_1_100k' || selectedDrugId === 'lidocaine_plain';
	const isArticaineSelected = selectedDrugId === 'articaine_1_100k' || selectedDrugId === 'articaine_1_200k' || selectedDrugId === 'septanest_1_100k';
	const isCardio100kSelected = (isCardioRisk || takesBetaBlockers) && (selectedDrugId === 'articaine_1_100k' || selectedDrugId === 'septanest_1_100k' || selectedDrugId === 'lidocaine_1_100k');
	const isSulfiteRisk = (hasSulfiteAllergy || hasBronchialAsthma) && !selectedDrugInfo.isAdrenalineFree;

	return (
		<>
			{hasLidocaineAllergy && isLidoSelected && (
				<div className="flex items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-rose-600/15 border border-rose-600/50 text-rose-950 dark:text-rose-100 text-xs font-medium animate-pulse" role="alert" data-testid="anesthesia-lidocaine-allergy-warning-badge">
					<div className="flex items-center gap-2">
						<ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
						<span><strong>Внимание! Аллергия на Лидокаин!</strong> Высокий риск анафилаксии. Рекомендован <strong>Мепивакаин 3% (Скандонест) без адреналина</strong>.</span>
					</div>
					<SwitchButton onClick={onSelectScandonest} testId="btn-switch-to-scandonest-safe" title="Переключиться на Мепивакаин 3% (Скандонест без адреналина)" />
				</div>
			)}
			{hasArticaineAllergy && isArticaineSelected && (
				<div className="flex items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-rose-600/15 border border-rose-600/50 text-rose-950 dark:text-rose-100 text-xs font-medium animate-pulse" role="alert" data-testid="anesthesia-articaine-allergy-warning-badge">
					<div className="flex items-center gap-2">
						<ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
						<span><strong>Внимание! Аллергия на Артикаин!</strong> Риск анафилаксии. Рекомендован <strong>Мепивакаин 3% (Скандонест) без адреналина</strong>.</span>
					</div>
					<SwitchButton onClick={onSelectScandonest} testId="btn-switch-to-mepivacaine-articaine-safe" title="Переключиться на Мепивакаин 3% (Скандонест)" />
				</div>
			)}
			{isCardio100kSelected && (
				<div className="flex items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-medium" role="alert" data-testid="anesthesia-cardio-100k-warning-badge">
					<div className="flex items-center gap-2">
						<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<span><strong>Внимание, кардио-риск!</strong> Адреналин 1:100 000. Рекомендован Скандонест (Мепивакаин 3% без адреналина). Решение принимает лечащий врач.</span>
					</div>
					<SwitchButton onClick={onSelectScandonest} testId="btn-switch-to-mepivacaine" title="Переключиться на Мепивакаин 3% (Скандонест без адреналина)" />
				</div>
			)}
			{isSulfiteRisk && (
				<div className="flex items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-rose-600/15 border border-rose-600/50 text-rose-950 dark:text-rose-100 text-xs font-medium animate-pulse" role="alert" data-testid="anesthesia-sulfite-allergy-warning-badge">
					<div className="flex items-center gap-2">
						<ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
						<span><strong>Внимание! Аллергия на сульфиты (E223) / астма.</strong> В растворах с адреналином содержится метабисульфит. Рекомендован <strong>Мепивакаин 3% без адреналина</strong>.</span>
					</div>
					<SwitchButton onClick={onSelectScandonest} testId="btn-switch-to-mepivacaine-sulfite-safe" title="Переключиться на Мепивакаин 3% (Скандонест без адреналина)" />
				</div>
			)}
		</>
	);
}

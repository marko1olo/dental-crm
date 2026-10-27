/**
 * apps/web/src/components/visit/anamnesisTab/SomaticSafetyBanner.tsx
 *
 * Информационно-предупредительный баннер клинической безопасности у кресла (Мандаты 8e, 8y).
 */

import React from "react";
import { AlertCircle, AlertOctagon } from "lucide-react";

export interface SomaticSafetyBannerProps {
	readonly totalCriticalAlerts: boolean;
	readonly selectedRisks: readonly string[];
	readonly selectedAllergies: Record<string, string>;
	readonly selectedAllergyCount: number;
}

export const SomaticSafetyBanner: React.FC<SomaticSafetyBannerProps> = ({
	totalCriticalAlerts,
	selectedRisks,
	selectedAllergies,
	selectedAllergyCount,
}) => {
	if (totalCriticalAlerts) {
		const allergyStr = selectedAllergyCount > 0
			? `Аллергии: ${Object.entries(selectedAllergies).map(([a, r]) => `${a} (${r})`).join(", ")}. `
			: "";
		const risksStr = selectedRisks.length > 0 ? `Соматические риски: ${selectedRisks.join(", ")}. ` : "";

		return (
			<div
				className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-2 border-[#ef4444] text-rose-950 dark:text-rose-100 text-xs shadow-xs select-none"
				data-testid="visit-anamnesis-critical-alert"
				role="alert"
				title="Клинические стоп-факторы безопасности у кресла (Медицинская карта приёма)"
			>
				<AlertOctagon className="w-5 h-5 text-[#ef4444] shrink-0" />
				<div className="flex flex-col gap-0.5 min-w-0">
					<span className="font-bold text-[#ef4444]">
						Клинические стоп-факторы безопасности у кресла:
					</span>
					<span className="text-[11.5px] text-rose-900 dark:text-rose-200">
						{allergyStr}{risksStr}Обязательна коррекция местного анестетика, профилактика анафилаксии, оценка риска кровотечения и остеонекроза челюсти (БОНЧ).
					</span>
				</div>
			</div>
		);
	}

	if (selectedRisks.length > 0 || selectedAllergyCount > 0) {
		const allergySuffix = selectedAllergyCount > 0 ? `; Аллергии: ${Object.keys(selectedAllergies).join(", ")}` : "";
		return (
			<div
				className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 text-xs font-semibold"
				data-testid="visit-anamnesis-alert-banner"
			>
				<AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
				<span>
					Отмечены соматические особенности: {selectedRisks.join(", ")}{allergySuffix}. Учитывать при премедикации и выборе концентрации вазоконстриктора.
				</span>
			</div>
		);
	}

	return null;
};

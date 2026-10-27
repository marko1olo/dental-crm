/**
 * apps/web/src/components/visit/anamnesisTab/AnamnesisBottomBar.tsx
 *
 * Нижняя панель действий анамнеза: 0 заблокированных кнопок (Мандат 8e).
 */

import React from "react";
import { Activity, RotateCcw, Save } from "lucide-react";

export interface AnamnesisBottomBarProps {
	readonly onApplyPhysiologicalNorm: () => void;
	readonly onApplyToDiary: () => void;
}

export const AnamnesisBottomBar: React.FC<AnamnesisBottomBarProps> = ({
	onApplyPhysiologicalNorm,
	onApplyToDiary,
}) => {
	return (
		<div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex-wrap">
			<button
				type="button"
				onClick={onApplyPhysiologicalNorm}
				className="anamnesis-top-btn anamnesis-top-btn--secondary"
				title="Сбросить все риски до физиологической нормы"
			>
				<RotateCcw className="w-3.5 h-3.5 text-slate-500" />
				<span>Сброс в норму</span>
			</button>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onApplyToDiary}
					className="anamnesis-top-btn anamnesis-top-btn--secondary"
					data-testid="sync-anamnesis-btn"
					title="Перенести текущие данные анамнеза в дневник приёма"
				>
					<Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>В дневник приёма</span>
				</button>

				<button
					type="button"
					onClick={onApplyToDiary}
					className="anamnesis-top-btn anamnesis-top-btn--primary"
					data-testid="btn-save-anamnesis-to-patient"
					title="Сохранить анамнез и аллергии в медицинскую карту пациента"
				>
					<Save className="w-3.5 h-3.5" />
					<span>Сохранить в медкарту</span>
				</button>
			</div>
		</div>
	);
};

import React from "react";
import { formatKopecksRu } from "@dental/shared";
import type { MilestoneStage } from "../stagePaymentEngine.js";

export interface StageActFormInputsProps {
	readonly stages: readonly MilestoneStage[];
	readonly selectedStageForActId: string;
	readonly onSelectStageForAct: (stageId: string) => void;
	readonly actNumberInput: string;
	readonly onActNumberChange: (value: string) => void;
	readonly actSignDate: string;
	readonly onActSignDateChange: (value: string) => void;
}

export const StageActFormInputs: React.FC<StageActFormInputsProps> = ({
	stages,
	selectedStageForActId,
	onSelectStageForAct,
	actNumberInput,
	onActNumberChange,
	actSignDate,
	onActSignDateChange,
}) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div>
				<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
					Выберите закрываемый этап:
				</label>
				<select
					value={selectedStageForActId}
					onChange={(e) => onSelectStageForAct(e.target.value)}
					className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-sm text-[var(--ink,#0f172a)] font-medium focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
				>
					{stages.map((s) => (
						<option key={s.id} value={s.id}>
							Этап №{s.stageNumber}: {s.title} ({formatKopecksRu(s.totalKopecks)})
						</option>
					))}
				</select>
			</div>

			<div>
				<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
					Номер Акта:
				</label>
				<input
					type="text"
					value={actNumberInput}
					onChange={(e) => onActNumberChange(e.target.value)}
					className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-sm text-[var(--ink,#0f172a)] font-medium focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
				/>
			</div>

			<div>
				<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
					Дата подписания:
				</label>
				<input
					type="date"
					value={actSignDate}
					onChange={(e) => onActSignDateChange(e.target.value)}
					className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-sm text-[var(--ink,#0f172a)] font-medium focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
				/>
			</div>
		</div>
	);
};

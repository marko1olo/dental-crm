/**
 * StagePaymentActTab.tsx — Вкладка закрытия этапа актом выполненных работ (DENTE CRM).
 *
 * Содержит:
 * 1. Форму выбора этапа, номера акта и даты подписания (ст. 720 ГК РФ).
 * 2. Детальную карточку выбранного этапа (суммы, аванс, замороженный эскроу, прямые затраты).
 * 3. Кнопку подписания Акта и перевода эскроу в признанную выручку клиники.
 */

import React from "react";
import { FileCheck } from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import type { MilestoneStage } from "./stagePaymentEngine.js";

export interface StagePaymentActTabProps {
	readonly stages: readonly MilestoneStage[];
	readonly selectedStageForActId: string;
	readonly onSelectStageForAct: (stageId: string) => void;
	readonly actNumberInput: string;
	readonly onActNumberChange: (value: string) => void;
	readonly actSignDate: string;
	readonly onActSignDateChange: (value: string) => void;
	readonly doctorFullName: string;
	readonly onSignStageAct: () => void;
}

export const StagePaymentActTab: React.FC<StagePaymentActTabProps> = ({
	stages,
	selectedStageForActId,
	onSelectStageForAct,
	actNumberInput,
	onActNumberChange,
	actSignDate,
	onActSignDateChange,
	doctorFullName,
	onSignStageAct,
}) => {
	const selectedStage = stages.find((s) => s.id === selectedStageForActId);

	return (
		<div className="flex flex-col gap-6">
			<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 flex flex-col gap-5">
				<div className="flex items-center justify-between">
					<h3 className="font-bold text-base text-[var(--ink,#0f172a)] flex items-center gap-2">
						<FileCheck className="h-5 w-5 text-[var(--teal,var(--brand-primary))]" />
						Оформление Акта сдачи-приемки выполненных работ (ст. 720 ГК РФ)
					</h3>
					<span className="text-xs text-[var(--muted,#64748b)]">
						Врач: {doctorFullName}
					</span>
				</div>

				{/* Stage Selector */}
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

				{/* Selected Stage Detail Card */}
				{selectedStage && (
					<div className="rounded-xl border border-[var(--border,#cbd5e1)] bg-slate-50 dark:bg-slate-900/40 p-4 text-xs flex flex-col gap-3">
						<div className="flex justify-between items-center">
							<span className="font-bold text-sm text-[var(--ink,#0f172a)]">
								{selectedStage.title}
							</span>
							<span className="font-extrabold text-sm text-[var(--teal,var(--brand-primary))]">
								{formatKopecksRu(selectedStage.totalKopecks)}
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[var(--muted,#64748b)]">
							<div>
								<span>Внесено аванса: </span>
								<strong className="text-[var(--ink,#0f172a)]">
									{formatKopecksRu(selectedStage.advancePaidKopecks)}
								</strong>
							</div>
							<div>
								<span>Заблокировано в эскроу: </span>
								<strong className="text-[var(--teal,var(--brand-primary))]">
									{formatKopecksRu(selectedStage.escrowLockedKopecks)}
								</strong>
							</div>
							<div>
								<span>Прямые затраты (Lab/BOM): </span>
								<strong className="text-[var(--ink,#0f172a)]">
									{formatKopecksRu(
										selectedStage.directExpensesKopecks.labKopecks +
											selectedStage.directExpensesKopecks.materialsKopecks +
											selectedStage.directExpensesKopecks.otherKopecks,
									)}
								</strong>
							</div>
						</div>

						<div className="border-t border-[var(--border,#cbd5e1)] pt-2 text-[11px] text-[var(--muted,#64748b)]">
							При подписании Акта средства из эскроу ({formatKopecksRu(selectedStage.escrowLockedKopecks)}) переводятся в признанную выручку клиники, а гарантийные обязательства вступают в силу.
						</div>
					</div>
				)}

				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={onSignStageAct}
						className="stage-action-btn primary"
					>
						<FileCheck className="h-4 w-4" />
						<span>Подписать Акт сдачи-приемки и разблокировать эскроу</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default StagePaymentActTab;

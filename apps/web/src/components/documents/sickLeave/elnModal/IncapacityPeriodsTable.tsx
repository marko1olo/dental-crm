import React from "react";
import { Calendar, Plus, Clock } from "lucide-react";
import type { SickLeaveFormState, IncapacityPeriod } from "../sickLeaveElnEngine";
import { IncapacityPeriodCard } from "./IncapacityPeriodCard";

interface Props {
	formState: SickLeaveFormState;
	setFormState: React.Dispatch<React.SetStateAction<SickLeaveFormState>>;
	handleAddPeriod: () => void;
	handleRemovePeriod: (index: number) => void;
	handlePeriodDateChange: (index: number, field: 'dateFrom' | 'dateTo', value: string) => void;
	onQuickSetDays?: ((days: number) => void) | undefined;
}

export function IncapacityPeriodsTable({
	formState,
	setFormState,
	handleAddPeriod,
	handleRemovePeriod,
	handlePeriodDateChange,
	onQuickSetDays
}: Props) {
	const handleFioChange = (index: number, fio: string) => {
		const existing = formState.periods[index];
		if (!existing) return;
		const updated = [...formState.periods];
		updated[index] = { ...existing, doctorFio: fio };
		setFormState((prev) => ({ ...prev, periods: updated }));
	};

	const handleRoleChange = (index: number, role: 'attending' | 'vk_member') => {
		const existing = formState.periods[index];
		if (!existing) return;
		const updated = [...formState.periods];
		updated[index] = { ...existing, doctorRole: role };
		setFormState((prev) => ({ ...prev, periods: updated }));
	};

	return (
		<div className="sick-leave-section">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<h4 className="sick-leave-section-title">
					<Calendar size={16} />
					Периоды освобождения от работы
				</h4>
				<div className="flex items-center gap-1.5 flex-wrap">
					{onQuickSetDays && (
						<div className="flex items-center gap-1 text-xs text-[var(--muted)] mr-2">
							<Clock size={13} />
							<span>Быстрый срок:</span>
							{[3, 5, 10, 14].map((d) => (
								<button
									key={d}
									type="button"
									onClick={() => onQuickSetDays(d)}
									className="px-2 py-0.5 text-xs font-semibold rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] cursor-pointer"
								>
									{d} дн.
								</button>
							))}
						</div>
					)}
					<button type="button" className="sick-leave-add-period-btn" onClick={handleAddPeriod}>
						<Plus size={14} />
						Добавить продление
					</button>
				</div>
			</div>

			<div className="sick-leave-periods-list">
				{formState.periods.map((period, index) => (
					<IncapacityPeriodCard
						key={period.id}
						period={period}
						index={index}
						totalPeriods={formState.periods.length}
						onRemove={handleRemovePeriod}
						onDateChange={handlePeriodDateChange}
						onFioChange={handleFioChange}
						onRoleChange={handleRoleChange}
					/>
				))}
			</div>
		</div>
	);
}

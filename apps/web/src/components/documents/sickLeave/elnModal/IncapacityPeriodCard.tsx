import React from "react";
import { Trash2 } from "lucide-react";
import { IncapacityPeriod, calculateDaysBetween, formatDateRu } from "../sickLeaveElnEngine";

interface Props {
	period: IncapacityPeriod;
	index: number;
	totalPeriods: number;
	onRemove: (index: number) => void;
	onDateChange: (index: number, field: 'dateFrom' | 'dateTo', value: string) => void;
	onFioChange: (index: number, fio: string) => void;
	onRoleChange: (index: number, role: 'attending' | 'vk_member') => void;
}

export function IncapacityPeriodCard({
	period,
	index,
	totalPeriods,
	onRemove,
	onDateChange,
	onFioChange,
	onRoleChange
}: Props) {
	const pDays = calculateDaysBetween(period.dateFrom, period.dateTo);

	return (
		<div className="sick-leave-period-card">
			<div className="sick-leave-period-header">
				<span>Период №{index + 1}: с {formatDateRu(period.dateFrom)} по {formatDateRu(period.dateTo)} ({pDays} кал. дн.)</span>
				{totalPeriods > 1 && (
					<button type="button" onClick={() => onRemove(index)} className="sick-leave-delete-period-btn" title="Удалить период" aria-label="Удалить период">
						<Trash2 size={16} />
					</button>
				)}
			</div>
			<div className="sick-leave-grid-4">
				<div className="sick-leave-field">
					<label className="sick-leave-label">Дата с</label>
					<input type="date" className="sick-leave-input" value={period.dateFrom} onChange={(e) => onDateChange(index, 'dateFrom', e.target.value)} />
				</div>
				<div className="sick-leave-field">
					<label className="sick-leave-label">Дата по</label>
					<input type="date" className="sick-leave-input" value={period.dateTo} onChange={(e) => onDateChange(index, 'dateTo', e.target.value)} />
				</div>
				<div className="sick-leave-field">
					<label className="sick-leave-label">Врач</label>
					<input type="text" className="sick-leave-input" value={period.doctorFio} placeholder="Лечащий врач" onChange={(e) => onFioChange(index, e.target.value)} />
				</div>
				<div className="sick-leave-field">
					<label className="sick-leave-label">Полномочие</label>
					<select className="sick-leave-select" value={period.doctorRole} onChange={(e) => onRoleChange(index, e.target.value as 'attending' | 'vk_member')}>
						<option value="attending">Лечащий врач</option>
						<option value="vk_member">Согласовано с главным врачом</option>
					</select>
				</div>
			</div>
		</div>
	);
}

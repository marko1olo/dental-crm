import React from "react";
import type { RetroactiveDayRecord } from "./retroactiveSanpinEngine";
import { RetroactiveDisplayRow } from "./retroactive/RetroactiveDisplayRow";
import { RetroactiveEditingRow } from "./retroactive/RetroactiveEditingRow";

export interface RetroactiveBatchTableProps {
	readonly filteredDays: RetroactiveDayRecord[];
	readonly editingDayId: string | null;
	readonly editFormData: Partial<RetroactiveDayRecord>;
	readonly setEditFormData: React.Dispatch<React.SetStateAction<Partial<RetroactiveDayRecord>>>;
	readonly onStartEditing: (day: RetroactiveDayRecord) => void;
	readonly onSaveEditing: (dayId: string) => void;
	readonly onCancelEditing: () => void;
	readonly onRequestDeleteDay: (dayId: string) => void;
	readonly onConfirmDeleteDay: (dayId: string) => void;
	readonly onCancelDeleteDay: () => void;
	readonly pendingDeleteDayId: string | null;
}

export function RetroactiveBatchTable({
	filteredDays,
	editingDayId,
	editFormData,
	setEditFormData,
	onStartEditing,
	onSaveEditing,
	onCancelEditing,
	onRequestDeleteDay,
	onConfirmDeleteDay,
	onCancelDeleteDay,
	pendingDeleteDayId,
}: RetroactiveBatchTableProps) {
	return (
		<div className="sanpin-table-wrapper">
			<table className="sanpin-table">
				<thead>
					<tr>
						<th style={{ width: "40px" }}>№</th>
						<th style={{ minWidth: "110px" }}>Дата / День</th>
						<th style={{ minWidth: "140px" }}>Кабинеты</th>
						<th style={{ minWidth: "110px" }}>Лотков / Приемов</th>
						<th style={{ minWidth: "120px" }}>Очистка (Азопирам)</th>
						<th style={{ minWidth: "150px" }}>Автоклавирование</th>
						<th style={{ minWidth: "120px" }}>Рециркуляторы</th>
						<th style={{ minWidth: "130px" }}>Уборка</th>
						<th style={{ minWidth: "100px" }}>Статус</th>
						<th style={{ minWidth: "120px" }}>Штамп ЭЦП</th>
						<th style={{ minWidth: "80px", textAlign: "center" }}>Действия</th>
					</tr>
				</thead>
				<tbody>
					{filteredDays.length === 0 ? (
						<tr>
							<td colSpan={11} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
								Записи не найдены. Нажмите «Заполнить все журналы стерилизации за период» для расчета.
							</td>
						</tr>
					) : (
						filteredDays.map((day, idx) =>
							editingDayId === day.id ? (
								<RetroactiveEditingRow
									key={day.id}
									day={day}
									idx={idx}
									editFormData={editFormData}
									setEditFormData={setEditFormData}
									onSaveEditing={onSaveEditing}
									onCancelEditing={onCancelEditing}
								/>
							) : (
								<RetroactiveDisplayRow
									key={day.id}
									day={day}
									idx={idx}
									onStartEditing={onStartEditing}
									onRequestDeleteDay={onRequestDeleteDay}
									onConfirmDeleteDay={onConfirmDeleteDay}
									onCancelDeleteDay={onCancelDeleteDay}
									pendingDeleteDayId={pendingDeleteDayId}
								/>
							),
						)
					)}
				</tbody>
			</table>
		</div>
	);
}

export { RetroactiveDisplayRow } from "./retroactive/RetroactiveDisplayRow";
export { RetroactiveEditingRow } from "./retroactive/RetroactiveEditingRow";

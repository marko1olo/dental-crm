import React from "react";
import type { Form257Record } from "../autoclaveLogEngine.js";
import { JournalTabRow } from "./JournalTabRow";
import { JournalTabEmptyState } from "./JournalTabEmptyState";

export interface JournalTabTableProps {
	readonly records: readonly Form257Record[];
	readonly filteredRecords: readonly Form257Record[];
	readonly headNurseName?: string | undefined;
	readonly onVerifyRecord?: ((id: string, headNurseName: string) => void) | undefined;
	readonly onDeleteRecord?: ((id: string) => void) | undefined;
	readonly onOpenNewCycle?: (() => void) | undefined;
}

export const JournalTabTable: React.FC<JournalTabTableProps> = ({
	records, filteredRecords, headNurseName, onVerifyRecord, onDeleteRecord, onOpenNewCycle,
}) => {
	if (records.length === 0) {
		return <JournalTabEmptyState isFiltered={false} onOpenNewCycle={onOpenNewCycle} />;
	}

	if (filteredRecords.length === 0) {
		return <JournalTabEmptyState isFiltered={true} onOpenNewCycle={onOpenNewCycle} />;
	}

	return (
		<div className="journal257-table-wrapper">
			<table className="journal257-table">
				<thead>
					<tr>
						<th>Дата / Цикл</th>
						<th>Аппарат</th>
						<th>Стерилизуемые изделия</th>
						<th>Упаковка / Кол-во</th>
						<th>Режим (T°, P, время)</th>
						<th>Хим. тест (5 точек)</th>
						<th>Результат</th>
						<th>Сотрудник ЦСО</th>
						<th>Контроль</th>
						<th>Действия</th>
					</tr>
				</thead>
				<tbody>
					{filteredRecords.map((rec) => (
						<JournalTabRow
							key={rec.id}
							record={rec}
							headNurseName={headNurseName}
							onVerify={onVerifyRecord}
							onDelete={onDeleteRecord}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
};

import type { MedicalWasteLog } from "@dental/shared";
import React from "react";
import { MedicalWasteMovementRow } from "./MedicalWasteMovementRow";

interface MedicalWasteMovementsTableProps {
	loading: boolean;
	logs: MedicalWasteLog[];
}

export function MedicalWasteMovementsTable({ loading, logs }: MedicalWasteMovementsTableProps) {
	return (
		<div className="sanpin-table-wrapper">
			<table className="sanpin-table">
				<thead>
					<tr>
						<th>Дата операции</th>
						<th>Класс отходов</th>
						<th>Состав / Описание</th>
						<th>Упаковка (тип/кол-во)</th>
						<th>Масса (кг)</th>
						<th>Обеззараживание на месте</th>
						<th>Вывоз / Организация</th>
						<th>Ответственный</th>
						<th style={{ textAlign: "center" }}>Этикетка</th>
					</tr>
				</thead>
				<tbody>
					{loading ? (
						<tr>
							<td colSpan={9} style={{ textAlign: "center", padding: "2rem" }}>
								Загрузка журнала отходов...
							</td>
						</tr>
					) : logs.length === 0 ? (
						<tr>
							<td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
								Записи движения отходов не найдены.
							</td>
						</tr>
					) : (
						logs.map((log) => <MedicalWasteMovementRow key={log.id} log={log} />)
					)}
				</tbody>
			</table>
		</div>
	);
}

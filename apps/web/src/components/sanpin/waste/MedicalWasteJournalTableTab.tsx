import { FileSpreadsheet, ShieldCheck } from "lucide-react";
import React from "react";
import type { MedicalWasteJournalRecord } from "./medicalWasteEngine.js";
import { MedicalWasteJournalRow } from "./MedicalWasteJournalRow.js";

export interface MedicalWasteJournalTableTabProps {
	readonly records: MedicalWasteJournalRecord[];
	readonly onExportCsv: () => void;
	readonly onPrintThermalSticker: (record: MedicalWasteJournalRecord) => void;
}

export function MedicalWasteJournalTableTab({
	records,
	onExportCsv,
	onPrintThermalSticker,
}: MedicalWasteJournalTableTabProps) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<div className="font-bold text-sm text-ink">
					Записи технологического журнала отходов подразделения
				</div>
				<button
					type="button"
					onClick={onExportCsv}
					className="waste-btn waste-btn-secondary h-9 text-xs"
				>
					<FileSpreadsheet size={16} /> Экспорт журнала (CSV)
				</button>
			</div>

			<div className="waste-table-wrapper">
				<table className="waste-table">
					<thead>
						<tr>
							<th>Дата / Время</th>
							<th>Класс</th>
							<th>Тара</th>
							<th className="text-center">Мест</th>
							<th className="text-right">Нетто (кг)</th>
							<th>Пломба</th>
							<th>Метод обеззараживания</th>
							<th>Хранение / Срок</th>
							<th>Статус</th>
							<th className="text-center">Этикетка</th>
						</tr>
					</thead>
					<tbody>
						{records.length === 0 ? (
							<tr>
								<td colSpan={10} className="text-center py-8 text-muted">
									<div className="flex flex-col items-center gap-2">
										<ShieldCheck size={32} className="text-muted opacity-50" />
										<div className="font-semibold text-ink text-sm">В журнале пока нет записей медотходов</div>
										<div className="text-xs text-muted max-w-sm">
											Зафиксируйте первый пакет или емкость с отходами классов А, Б, В или Г на вкладке «Фиксация отходов».
										</div>
									</div>
								</td>
							</tr>
						) : (
							records.map((r) => (
								<MedicalWasteJournalRow
									key={r.id}
									record={r}
									onPrintThermalSticker={onPrintThermalSticker}
								/>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

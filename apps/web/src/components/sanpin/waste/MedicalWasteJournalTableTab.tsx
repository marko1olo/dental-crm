import {
	AlertTriangle,
	Clock,
	FileSpreadsheet,
	Printer,
	ShieldCheck,
} from "lucide-react";
import React from "react";
import {
	type MedicalWasteJournalRecord,
	validateStorageDuration,
} from "./medicalWasteEngine.js";
import {
	getDecontaminationMethod,
	getMedicalWasteClass,
	getMedicalWastePackaging,
} from "./medicalWastePresets.js";

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
							records.map((r) => {
								const classDef = getMedicalWasteClass(r.wasteClass);
								const storageCheck = validateStorageDuration(r.timestamp, r.storageLocation);

								return (
									<tr
										key={r.id}
										className="sanpin-log-row"
										style={{
											minHeight: "44px",
											contentVisibility: "auto",
											containIntrinsicSize: "1px 44px",
											contain: "content",
										}}
									>
										<td className="whitespace-nowrap font-medium">{r.timestamp}</td>
										<td>
											<span
												className="waste-badge"
												style={{
													backgroundColor: classDef.colorTheme.hexBadgeBg,
													color: classDef.colorTheme.hexBadgeFg,
													border: `1px solid ${classDef.colorTheme.hexBorder}`,
												}}
											>
												Класс {classDef.letterCode}
											</span>
										</td>
										<td className="text-xs">{getMedicalWastePackaging(r.packageType).nameRu}</td>
										<td className="text-center font-bold">{r.packageCount}</td>
										<td className="text-right font-black text-ink">{r.netWeightKg.toFixed(2)}</td>
										<td className="font-mono text-xs font-semibold text-muted">{r.sealNumber || "—"}</td>
										<td className="text-xs">{getDecontaminationMethod(r.decontaminationMethod).nameRu}</td>
										<td>
											{storageCheck.isExpired ? (
												<span className="text-xs font-bold text-bad-fg flex items-center gap-1">
													<AlertTriangle size={14} /> Истек ({Math.abs(storageCheck.hoursRemaining)} ч)
												</span>
											) : (
												<span className="text-xs font-semibold text-ok-fg flex items-center gap-1">
													<Clock size={14} /> {storageCheck.hoursRemaining} ч
												</span>
											)}
										</td>
										<td>
											{r.status === "accumulating" ? (
												<span className="text-xs font-bold text-amber bg-amber-soft px-2 py-0.5 rounded-full">
													Накопление
												</span>
											) : (
												<span className="text-xs font-bold text-ok-fg bg-ok-bg px-2 py-0.5 rounded-full">
													Вывезено ({r.transferActNumber})
												</span>
											)}
										</td>
										<td className="text-center">
											<button
												type="button"
												onClick={() => onPrintThermalSticker(r)}
												className="waste-btn waste-btn-secondary min-h-[38px] px-2.5 py-1 text-xs font-bold whitespace-nowrap cursor-pointer hover:border-[var(--teal,#0d9488)]"
												title="Печать термоэтикетки со штрихкодом 58x40 мм для бака/пакета"
												data-testid={`print-sticker-${r.id}`}
											>
												<Printer size={13} className="text-[var(--teal,#0d9488)]" />
												<span>58×40 мм</span>
											</button>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

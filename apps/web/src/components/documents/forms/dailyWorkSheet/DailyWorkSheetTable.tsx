import React from "react";
import type { DailyWorkSheetTableProps } from "./DailyWorkSheetTypes";

export const DailyWorkSheetTable: React.FC<DailyWorkSheetTableProps> = ({
	records,
	onUpdateRecord,
	onAddPatient,
	disabled = false,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex justify-between items-center mb-1">
				<h4 className="text-xs font-bold text-[var(--ink)] m-0">Журнал принятых пациентов ({records.length})</h4>
				<button
					type="button"
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal,#0d9488)] transition-colors inline-flex items-center gap-1.5 text-xs cursor-pointer"
					onClick={onAddPatient}
				>
					+ Добавить пациента
				</button>
			</div>

			<div className="overflow-x-auto rounded-xl border border-[var(--line)]">
				<table className="w-full text-xs text-left border-collapse">
					<thead>
						<tr className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--muted)]">
							<th className="p-2 w-10 text-center">№</th>
							<th className="p-2">ФИО пациента</th>
							<th className="p-2 w-24">МКБ-10</th>
							<th className="p-2">Оказанные процедуры</th>
							<th className="p-2 w-16 text-right">УЕТ</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line)]">
						{records.length === 0 ? (
							<tr>
								<td colSpan={5} className="text-center p-4 text-[var(--muted)]">
									Пациенты за смену ещё не добавлены. Нажмите «+ Добавить пациента»
								</td>
							</tr>
						) : (
							records.map((r, idx) => (
								<tr key={idx} className="hover:bg-[var(--paper-soft)]/50 transition-colors">
									<td className="p-2 text-center text-[var(--muted)]">{r.sequenceNumber}</td>
									<td className="p-2">
										<input
											type="text"
											className="w-full rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 py-1 text-xs"
											placeholder="ФИО пациента"
											value={r.patientFullName}
											disabled={disabled}
											onChange={(e) => onUpdateRecord(idx, { patientFullName: e.target.value })}
										/>
									</td>
									<td className="p-2">
										<input
											type="text"
											className="w-full rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 py-1 text-xs"
											value={r.diagnosisIcd10}
											disabled={disabled}
											onChange={(e) => onUpdateRecord(idx, { diagnosisIcd10: e.target.value })}
										/>
									</td>
									<td className="p-2">
										<input
											type="text"
											className="w-full rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 py-1 text-xs"
											value={r.performedProceduresSummary}
											disabled={disabled}
											onChange={(e) => onUpdateRecord(idx, { performedProceduresSummary: e.target.value })}
										/>
									</td>
									<td className="p-2 text-right font-bold text-[var(--ink)]">
										{r.totalUetForVisit.toFixed(1)}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

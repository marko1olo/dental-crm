/**
 * Таблица когортного анализа возвращаемости (Recall 6/12 месяцев).
 */

import React from "react";
import {
	calculateRecallRates,
	formatKopecksToRub,
	type RecallCohortData,
} from "./analyticsWidgetData.js";

export interface LostPatientsRecallCohortsTableProps {
	readonly recallCohorts: RecallCohortData[];
}

export const LostPatientsRecallCohortsTable: React.FC<
	LostPatientsRecallCohortsTableProps
> = ({ recallCohorts }) => {
	if (recallCohorts.length === 0) {
		return (
			<div className="py-8 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-lg border border-dashed border-[var(--line)]">
				Когортных данных по санации и имплантации пока не накоплено.
				Данные формируются автоматически по завершённым планам лечения.
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-lg border border-[var(--line)]">
			<table className="w-full text-xs text-left">
				<thead className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--muted)] font-semibold">
					<tr>
						<th className="p-2.5">Когорта (Месяц)</th>
						<th className="p-2.5">Профиль лечения</th>
						<th className="p-2.5 text-center">Всего пациентов</th>
						<th className="p-2.5 text-center">Возврат 6 мес (Гигиена)</th>
						<th className="p-2.5 text-center">Возврат 12 мес (Контроль)</th>
						<th className="p-2.5 text-right">Выручка возврата (₽)</th>
						<th className="p-2.5 text-center">Состояние когорты</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-[var(--line)] bg-[var(--paper)] text-[var(--ink)]">
					{recallCohorts.map((cohort) => {
						const rates = calculateRecallRates(cohort);
						return (
							<tr
								key={`${cohort.cohortMonth}-${cohort.category}`}
								className="hover:bg-[var(--paper-soft)]/50 transition-colors"
							>
								<td className="p-2.5 font-bold">
									{cohort.cohortMonth}
								</td>
								<td className="p-2.5">
									<span className="px-2 py-0.5 rounded border text-[11px] bg-[var(--paper-soft)] border-[var(--line)]">
										{cohort.category === "sanitation"
											? "Санация полости рта"
											: "Имплантация"}
									</span>
								</td>
								<td className="p-2.5 text-center font-semibold">
									{cohort.totalPatients}
								</td>
								<td className="p-2.5 text-center">
									<span
										className={`px-2 py-0.5 rounded font-bold ${
											rates.rate6m >= 65
												? "text-[var(--ok-fg)]"
												: rates.rate6m > 0
													? "text-[var(--warn-fg)]"
													: "text-[var(--muted)]"
										}`}
									>
										{rates.rate6m}% ({cohort.returned6m})
									</span>
								</td>
								<td className="p-2.5 text-center">
									<span
										className={`px-2 py-0.5 rounded font-bold ${
											rates.rate12m >= 60
												? "text-[var(--ok-fg)]"
												: rates.rate12m > 0
													? "text-[var(--warn-fg)]"
													: "text-[var(--muted)]"
										}`}
									>
										{rates.rate12m}% ({cohort.returned12m})
									</span>
								</td>
								<td className="p-2.5 text-right font-semibold text-[var(--ok-fg)]">
									{formatKopecksToRub(
										cohort.recallRevenueKopecks,
										false,
									)}
								</td>
								<td className="p-2.5 text-center">
									<span
										className={`px-2 py-0.5 rounded text-[10px] font-bold ${
											rates.healthTone === "ok"
												? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
												: rates.healthTone === "warn"
													? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
													: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
										}`}
									>
										{rates.healthTone === "ok"
											? "В норме"
											: rates.healthTone === "warn"
												? "Внимание"
												: "Отток"}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};

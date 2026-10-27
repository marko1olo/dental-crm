/**
 * apps/web/src/pages/payoutDashboard/PayoutLimitationsNotes.tsx
 * Methodological notes, calculation period and limitations for doctor payout.
 * Mandates 8b, 8e, 8x. File <= 120 lines.
 */

import React from "react";
import { countLabel, money } from "../../AppHelpers";
import type { DoctorPayoutReport } from "./types";

export function PayoutLimitationsNotes({
	report,
	isOwnScope,
	canEditRates,
}: {
	readonly report: DoctorPayoutReport;
	readonly isOwnScope: boolean;
	readonly canEditRates: boolean;
}) {
	return (
		<>
			{report.totals.doctorsWithoutRate > 0 ? (
				<p className="ops-hint ops-hint--weak">
					Итог посчитан по {countLabel(report.totals.doctorsCounted, "врачу", "врачам", "врачам")} из {report.rows.length}: у {report.totals.doctorsWithoutRate} нет пригодной ставки, и сумму к выплате им считать не из чего. Это отсутствие расчёта, а не ноль к выплате. {canEditRates ? "Нажмите «Задать ставку» в колонке «Ставка» напротив врача — итог пересчитается сразу." : "Ставку задаёт тот, кому сервер открывает выплаты всей клиники."}
				</p>
			) : null}

			{!isOwnScope && report.totals.unattributedRevenueRub > 0 ? (
				<p className="ops-hint">
					Не отнесено ни к одному врачу: {money(report.totals.unattributedRevenueRub)} из {money(report.totals.revenueRub)}. Такая оплата не связана с приёмом, поэтому в выплату не попадает: оформляйте оплату из визита, созданного из записи в расписании.
				</p>
			) : null}

			<p className="ops-hint">
				Период: {new Date(report.period.from).toLocaleDateString("ru-RU")} — {new Date(report.period.to).toLocaleDateString("ru-RU")}. {report.methodNote}
			</p>

			{(report?.limitations ?? []).length > 0 ? (
				<ul className="ops-bars">
					{(report?.limitations ?? []).map((limitation) => (
						<li className="ops-hint" key={limitation}>
							{limitation}
						</li>
					))}
				</ul>
			) : null}

			{isOwnScope ? (
				<p className="ops-hint">
					Показаны только ваши выплаты: чужую зарплату сервер не отдаёт.
				</p>
			) : null}
		</>
	);
}

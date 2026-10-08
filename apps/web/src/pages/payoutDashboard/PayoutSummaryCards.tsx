/**
 * Layer 1 / Layer 4: Summary Cards and Clinic Totals for Doctor Payout Dashboard.
 * Renders clinic revenue, accruals, material/lab deductions, net payouts, and limitation hints.
 */

import React from "react";
import { countLabel, money } from "../../AppHelpers";
import type { DoctorPayoutReport } from "./types";

export interface PayoutSummaryCardsProps {
	readonly report: DoctorPayoutReport;
	readonly isOwnScope: boolean;
	readonly ownVisible: { revenueRub: number; paymentCount: number };
	readonly canEditRates: boolean;
}

export function PayoutSummaryCards({
	report,
	isOwnScope,
	ownVisible,
	canEditRates,
}: PayoutSummaryCardsProps) {
	/*
	 * Ни одного врача с пригодной ставкой: итоговые суммы складывать не из чего.
	 * Это не «ноль к выплате» — это отсутствие расчёта, и в итогах оно должно
	 * выглядеть прочерком, а не цифрой.
	 */
	const nothingComputed = report.totals.doctorsCounted === 0;

	return (
		<>
			{/* ── Итог ────────────────────────────────────────────────── */}
			{/*
				ПОЧЕМУ ПРОЧЕРК, А НЕ «0 ₽», КОГДА НЕ ПОСЧИТАН НИ ОДИН ВРАЧ.
				`totals` складываются только по врачам с пригодной ставкой. Если
				таких нет, все три суммы — структурный ноль: не «платить нечего»,
				а «не посчитано ничего». Крупная плитка «0 ₽ к выплате всего» при
				кассе 67 400 ₽ — это готовое основание не выплатить зарплату, и
				подпись под ней прочитают уже после решения. Тот же принцип, что
				у прочерка в колонке «Маржа» соседнего отчёта: отсутствие расчёта
				и ноль — разные утверждения.
			*/}
			<ul className="ops-metrics">
				<li
					className={`ops-metric ops-metric--primary ${
						nothingComputed || report.totals.payoutRub < 0
							? "ops-metric--danger"
							: ""
					}`}
				>
					<span className="ops-metric__value">
						{nothingComputed ? "—" : money(report.totals.payoutRub)}
					</span>
					<span className="ops-metric__label">
						{nothingComputed
							? isOwnScope
								? "к выплате: не посчитано"
								: "к выплате: не посчитано ни по одному врачу"
							: isOwnScope
								? "к выплате мне"
								: "к выплате всего"}
					</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value">
						{nothingComputed ? "—" : money(report.totals.accruedRub)}
					</span>
					<span className="ops-metric__label">начислено процентом</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value">
						{nothingComputed
							? "—"
							: money(report.totals.withheldMaterialRub)}
					</span>
					<span className="ops-metric__label">удержано за материалы</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value">
						{nothingComputed
							? "—"
							: money(report.totals.withheldLabRub ?? 0)}
					</span>
					<span className="ops-metric__label">удержано за ЗТЛ (Лаборатория)</span>
				</li>
				<li className="ops-metric">
					{/*
						В режиме «только свои» касса складывается по видимым строкам,
						чтобы подпись «моя касса за месяц» подтверждалась ровно теми
						строками, что напечатаны выше (см. пояснение к `ownVisible`).
					*/}
					<span className="ops-metric__value">
						{money(
							isOwnScope
								? ownVisible.revenueRub
								: report.totals.revenueRub,
						)}
					</span>
					<span className="ops-metric__label">
						{isOwnScope ? "моя касса за месяц" : "касса клиники за месяц"}
					</span>
				</li>
			</ul>

			{/*
				Итог посчитан НЕ ПО ВСЕМ врачам, и об этом надо сказать рядом с
				числом. Иначе «к выплате всего 0 ₽» при кассе 67 400 ₽ прочитают
				как «платить некому», а не как «процент врача не задан».
			*/}
			{report.totals.doctorsWithoutRate > 0 ? (
				<p className="ops-hint ops-hint--weak">
					Итог посчитан по{" "}
					{countLabel(
						report.totals.doctorsCounted,
						"врачу",
						"врачам",
						"врачам",
					)}{" "}
					из {report.rows.length}: у {report.totals.doctorsWithoutRate}{" "}
					нет пригодной ставки, и сумму к выплате им считать не из чего.
					Это отсутствие расчёта, а не ноль к выплате.{" "}
					{canEditRates
						? "Нажмите «Задать ставку» в колонке «Ставка» напротив врача — итог пересчитается сразу."
						: "Ставку задаёт тот, кому сервер открывает выплаты всей клиники."}
				</p>
			) : null}

			{!isOwnScope && report.totals.unattributedRevenueRub > 0 ? (
				<p className="ops-hint">
					Не отнесено ни к одному врачу:{" "}
					{money(report.totals.unattributedRevenueRub)} из{" "}
					{money(report.totals.revenueRub)}. Такая оплата не связана с
					приёмом, поэтому в выплату не попадает: оформляйте оплату из
					визита, созданного из записи в расписании.
				</p>
			) : null}

			<p className="ops-hint">
				Период: {new Date(report.period.from).toLocaleDateString("ru-RU")}{" "}
				— {new Date(report.period.to).toLocaleDateString("ru-RU")}.{" "}
				{report.methodNote}
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

import { Printer, Users } from "lucide-react";
import { money } from "../../AppHelpers";
import { EmptyState } from "../../components/EmptyState.js";
import {
	formatCompletionRate,
	formatMarginCell,
	formatRub,
	metricToneClass,
} from "../analyticsDoctorMetrics.js";
import type { AnalyticsDoctorsTableProps, DoctorProfitabilityRow } from "./types";

/**
 * Таблица «Эффективность врачей».
 *
 * БЫЛО: колонка «Прибыль» печаталась как `+{formatRub(doc.margin)}` с классом
 * `.margin-positive` (зашитый `#10b981`), то есть при `margin === null` экран
 * показывал строку «+null ₽» зелёным цветом прибыли. Колонка «Успешность»
 * печатала «null%», и поскольку `null >= 80` и `null >= 60` одинаково ложны,
 * значение красилось красным — выдуманная плохая оценка врача.
 *
 * Решение о подписи и тоне вынесено в чистые функции (analyticsDoctorMetrics.ts)
 * и закрыто тестом: раньше проверить это можно было только глазами.
 */
export function DoctorProfitabilityTable({
	rows,
}: {
	rows: readonly DoctorProfitabilityRow[];
}) {
	const hasUnknownMetric = (rows ?? []).some(
		(row) => row?.margin === null || row?.completionRate === null,
	);

	return (
		<div className="analytics-table-wrapper pb-6 pr-2">
			<table className="analytics-leaderboard-table">
				<thead>
					<tr>
						<th scope="col" className="whitespace-nowrap">Врач</th>
						<th scope="col" className="whitespace-nowrap">Выручка</th>
						<th scope="col" className="whitespace-nowrap min-w-[110px]">Прибыль</th>
						<th scope="col" className="whitespace-nowrap">Успешность</th>
						<th scope="col" className="whitespace-nowrap">Услуг</th>
						<th scope="col" className="whitespace-nowrap">Нарядов ЗТЛ</th>
					</tr>
				</thead>
				<tbody>
					{(rows ?? []).map((doc) => {
						const margin = formatMarginCell(doc?.margin);
						const completion = formatCompletionRate(doc?.completionRate);
						const marginTitle =
							doc?.clinicMarginRub !== undefined && doc?.clinicMarginRub !== null
								? `Маржа клиники: ${money(doc.clinicMarginRub)}${doc.doctorPayrollRub ? ` • Зарплатная ведомость: ${money(doc.doctorPayrollRub)}` : ""}`
								: margin.title;
						return (
							<tr key={doc?.name ?? "unknown"}>
								<td className="font-medium whitespace-nowrap">{doc?.name ?? "—"}</td>
								{/* Таблица — точная сумма с копейками, а не короткий вид плитки. */}
								<td className="whitespace-nowrap">{money(doc?.revenue ?? 0)}</td>
								<td
									className={`font-semibold whitespace-nowrap min-w-[110px] ${metricToneClass(margin.tone)}`}
									title={marginTitle}
								>
									{margin.text}
								</td>
								<td className="whitespace-nowrap">
									<span
										className={`font-semibold ${metricToneClass(completion.tone)}`}
										title={completion.title}
									>
										{completion.text}
									</span>
								</td>
								<td className="whitespace-nowrap font-medium text-center">
									{doc?.services804nCount ?? 0}
								</td>
								<td
									className="whitespace-nowrap font-medium text-center"
									title={(doc?.labOrdersCostRub ?? 0) > 0 ? `Списания ЗТЛ: ${money(doc?.labOrdersCostRub ?? 0)}` : undefined}
								>
									{doc?.labOrdersCount ?? 0}
									{(doc?.labOrdersCostRub ?? 0) > 0 && (
										<span className="block text-xs text-[var(--muted)] font-normal">
											{formatRub(doc?.labOrdersCostRub ?? 0)}
										</span>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			{hasUnknownMetric ? (
				<p className="mt-2.5 text-xs leading-relaxed text-[var(--muted)]">
					Прочерк — величина не рассчитывается, а не ноль. Прибыль и комиссия рассчитываются по фактически полученной выручке за вычетом прямых списаний ЗТЛ и сдельной ставки врача (Расчет зарплаты врачей). Выручка — только фактически полученные платежи.
				</p>
			) : (
				<p className="mt-2.5 text-xs leading-relaxed text-[var(--muted)]">
					Прибыль и комиссия рассчитываются по фактически полученной выручке за вычетом прямых списаний нарядов ЗТЛ и сдельной ставки врача (Расчет зарплаты врачей). Выручка — только фактически полученные платежи на кассе.
				</p>
			)}
		</div>
	);
}

export function AnalyticsDoctorsTable({ rows }: AnalyticsDoctorsTableProps) {
	return (
		<article className="glass-widget">
			<div className="glass-widget-header">
				<h3 title="Выработка врачей по завершённым визитам">
					<Users className="w-4 h-4 text-[var(--teal)]" aria-hidden="true" />
					<span>Эффективность врачей</span>
				</h3>
				<div className="glass-widget-actions">
					<button
						type="button"
						className="glass-action-btn"
						onClick={() => window.print()}
						title="Распечатать ведомость выработки врачей"
					>
						<Printer size={13} aria-hidden="true" />
						<span>Печать</span>
					</button>
				</div>
			</div>
			<div className="analytics-chart-container analytics-table-container">
				{Array.isArray(rows) &&
				(rows ?? []).filter(
					(x) =>
						(x?.revenue ?? 0) > 0 ||
						(x?.services804nCount ?? 0) > 0 ||
						(x?.labOrdersCount ?? 0) > 0 ||
						(x?.appointmentsCount ?? 0) > 0,
				).length > 0 ? (
					<DoctorProfitabilityTable rows={rows ?? []} />
				) : (
					<EmptyState
						glass={false}
						icon={<Users size={24} aria-hidden="true" />}
						title="Закрытых приёмов пока нет"
						description="Эффективность считается по завершённым визитам. Закройте приём в разделе «Приём» — врач появится в этом списке."
						className="analytics-chart-empty"
					/>
				)}
			</div>
		</article>
	);
}

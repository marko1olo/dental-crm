/**
 * Отчёты руководителю: выручка, врачи, кресла, потери, дебиторка.
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ПАНЕЛЬ. Существующий экран аналитики показывает воронку по
 * статусам, доли кресел и когорты. Того, по чему владелец клиники принимает
 * решения, там не было: динамики выручки, доли неявок, дебиторки и того, что
 * именно продаётся. Всё это теперь считает /api/reports/*.
 *
 * ЧТО ЗДЕСЬ ПРИНЦИПИАЛЬНО
 *
 * 1. Рядом с процентом занятости печатается база расчёта. «Загрузка 42 %» без
 *    указания, от чего считали, — не показатель, а повод для неверного решения.
 *
 * 2. Прочерк вместо выдуманного числа. Маржа не считается, потому что
 *    себестоимости материалов и процента врача в базе нет; здесь стоит «—», а
 *    не правдоподобные 35 %.
 *
 * 3. Пустой период подписан словами. Нули, выданные за данные, читают как
 *    «клиника ничего не заработала».
 *
 * Диаграммы нарисованы полосками на CSS: сторонняя библиотека графиков здесь
 * ничего не добавляет, а её оформление ведут в другом месте.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

type RevenuePoint = { bucket: string; revenueRub: number; paymentCount: number; payingPatients: number };

type DoctorRow = {
	doctorUserId: string | null;
	doctorName: string;
	revenueRub: number;
	appointmentsTotal: number;
	appointmentsCompleted: number;
	appointmentsCancelled: number;
	appointmentsNoShow: number;
	completionRate: number | null;
	noShowRate: number | null;
	averageTicketRub: number | null;
	marginRub: null;
};

type ChairRow = {
	chairId: string | null;
	chairName: string;
	appointments: number;
	bookedMinutes: number;
	utilization: number | null;
};

type ReportsSummary = {
	period: { from: string; to: string };
	revenue: { granularity: string; points: RevenuePoint[]; totalRub: number; isEmpty: boolean };
	doctors: { rows: DoctorRow[]; unattributedRevenueRub: number; attributionNote: string; isEmpty: boolean };
	chairs: {
		rows: ChairRow[];
		basis: { workingDays: number; minutesPerDay: number; totalMinutesPerChair: number; note: string };
		isEmpty: boolean;
	};
	appointments: {
		byStatus: Record<string, number>;
		total: number;
		arrivalRate: number | null;
		completionRate: number | null;
		cancellationRate: number | null;
		noShowRate: number | null;
		lostAppointments: number;
		isEmpty: boolean;
	};
	patientFlow: { points: { bucket: string; newPatients: number; returningPatients: number }[]; newTotal: number; returningTotal: number };
	receivables: { totalDebtRub: number; byBucket: Record<string, number>; debtors: number };
	isEmpty: boolean;
};

const bucketLabels: Record<string, string> = {
	current: "до недели",
	up_to_30: "до 30 дней",
	up_to_90: "до 90 дней",
	over_90: "больше 90 дней",
	undated: "дата не определена"
};

const weekdayNames = ["", "пн", "вт", "ср", "чт", "пт", "сб", "вс"];

function formatRub(value: number): string {
	return `${value.toLocaleString("ru-RU")} ₽`;
}

function formatPercent(value: number | null): string {
	// Прочерк, а не «0 %»: отсутствие данных и ноль — разные утверждения.
	return value === null ? "—" : `${Math.round(value * 100)} %`;
}

function formatHours(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const rest = Math.round(minutes % 60);
	return rest > 0 ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

async function readJson<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch(() => null)) as unknown;
	if (!response.ok) {
		const message =
			payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
				? payload.message
				: `Сервер ответил ${response.status}`;
		throw new Error(message);
	}
	return payload as T;
}

/** Начало и конец месяца в виде YYYY-MM-DD для полей ввода. */
function monthBounds(now = new Date()): { from: string; to: string } {
	const first = new Date(now.getFullYear(), now.getMonth(), 1);
	const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	const iso = (date: Date) =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	return { from: iso(first), to: iso(last) };
}

export function ManagerReportsPanel() {
	const initial = useMemo(() => monthBounds(), []);
	const [from, setFrom] = useState(initial.from);
	const [to, setTo] = useState(initial.to);
	const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
	const [summary, setSummary] = useState<ReportsSummary | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const query = new URLSearchParams({
				from: new Date(`${from}T00:00:00`).toISOString(),
				to: new Date(`${to}T23:59:59`).toISOString(),
				granularity
			});
			const response = await fetch(`/api/reports/summary?${query.toString()}`);
			setSummary(await readJson<ReportsSummary>(response));
		} catch (loadError) {
			setSummary(null);
			setError(loadError instanceof Error ? loadError.message : String(loadError));
		} finally {
			setLoading(false);
		}
	}, [from, to, granularity]);

	useEffect(() => {
		void load();
	}, [load]);

	const maxRevenue = useMemo(
		() => summary?.revenue.points.reduce((peak, point) => Math.max(peak, point.revenueRub), 0) ?? 0,
		[summary]
	);

	return (
		<section className="panel" data-testid="manager-reports-panel">
			<div className="panel-heading">
				<h2>Отчёты руководителю</h2>
			</div>

			<div className="quick-chips-row" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
				<span>
					<label htmlFor="report-from">С</label>
					<input id="report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
				</span>
				<span>
					<label htmlFor="report-to">по</label>
					<input id="report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
				</span>
				<span>
					<label htmlFor="report-granularity">Детализация</label>
					<select
						id="report-granularity"
						value={granularity}
						onChange={(event) => setGranularity(event.target.value as "day" | "week" | "month")}
					>
						<option value="day">по дням</option>
						<option value="week">по неделям</option>
						<option value="month">по месяцам</option>
					</select>
				</span>
				<button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>
					Обновить
				</button>
			</div>

			{error ? (
				<p role="alert">
					Отчёт не построен: {error}
				</p>
			) : null}

			{loading && summary === null ? <p>Считаю…</p> : null}

			{summary ? (
				summary.isEmpty ? (
					<p>За выбранный период данных нет: ни платежей, ни приёмов. Это не нулевые показатели, а отсутствие записей.</p>
				) : (
					<>
						{/* ── Главные числа ─────────────────────────────────────── */}
						<h3>Итоги периода</h3>
						<ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: "16px" }}>
							<li>
								<strong>{formatRub(summary.revenue.totalRub)}</strong>
								<br />
								<small>получено</small>
							</li>
							<li>
								<strong>{summary.appointments.total}</strong>
								<br />
								<small>приёмов</small>
							</li>
							<li>
								<strong>{summary.appointments.lostAppointments}</strong>
								<br />
								{/* Именно этот показатель уменьшают напоминаниями. */}
								<small>потеряно: отмены и неявки</small>
							</li>
							<li>
								<strong>{formatPercent(summary.appointments.noShowRate)}</strong>
								<br />
								<small>доля неявок</small>
							</li>
							<li>
								<strong>{formatRub(summary.receivables.totalDebtRub)}</strong>
								<br />
								<small>долг, {summary.receivables.debtors} пациент(ов)</small>
							</li>
							<li>
								<strong>
									{summary.patientFlow.newTotal} / {summary.patientFlow.returningTotal}
								</strong>
								<br />
								<small>первичные / повторные</small>
							</li>
						</ul>

						{/* ── Динамика выручки ──────────────────────────────────── */}
						<h3>Выручка</h3>
						{summary.revenue.isEmpty ? (
							<p>Платежей за период не было.</p>
						) : (
							<ul style={{ listStyle: "none", padding: 0 }}>
								{summary.revenue.points.map((point) => (
									<li key={point.bucket} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
										<span style={{ minWidth: "90px" }}>
											<small>{point.bucket}</small>
										</span>
										<span
											aria-hidden="true"
											style={{
												display: "inline-block",
												height: "10px",
												width: `${maxRevenue > 0 ? Math.max(2, Math.round((point.revenueRub / maxRevenue) * 240)) : 2}px`,
												background: "var(--teal-soft, #99f6e4)",
												borderRadius: "4px"
											}}
										/>
										<span>{formatRub(point.revenueRub)}</span>
										<small>
											· {point.paymentCount} платеж(ей), {point.payingPatients} пациент(ов)
										</small>
									</li>
								))}
							</ul>
						)}

						{/* ── Врачи ─────────────────────────────────────────────── */}
						<h3>Врачи</h3>
						{summary.doctors.isEmpty ? (
							<p>Выработки за период нет.</p>
						) : (
							<>
								<table>
									<thead>
										<tr>
											<th scope="col">Врач</th>
											<th scope="col">Получено</th>
											<th scope="col">Приёмов</th>
											<th scope="col">Завершено</th>
											<th scope="col">Неявки</th>
											<th scope="col">Средний чек</th>
											<th scope="col">Маржа</th>
										</tr>
									</thead>
									<tbody>
										{summary.doctors.rows.map((row) => (
											<tr key={row.doctorUserId ?? row.doctorName}>
												<td>{row.doctorName}</td>
												<td>{formatRub(row.revenueRub)}</td>
												<td>{row.appointmentsTotal}</td>
												<td>
													{row.appointmentsCompleted} ({formatPercent(row.completionRate)})
												</td>
												<td>
													{row.appointmentsNoShow} ({formatPercent(row.noShowRate)})
												</td>
												<td>{row.averageTicketRub === null ? "—" : formatRub(row.averageTicketRub)}</td>
												{/* Себестоимости и процента врача в базе нет — прочерк осознанный. */}
												<td title="Себестоимость материалов и процент врача в системе не заданы">—</td>
											</tr>
										))}
									</tbody>
								</table>
								{summary.doctors.unattributedRevenueRub > 0 ? (
									<p>
										<small>
											Не отнесено к врачу: {formatRub(summary.doctors.unattributedRevenueRub)}.{" "}
											{summary.doctors.attributionNote}
										</small>
									</p>
								) : null}
							</>
						)}

						{/* ── Кресла ────────────────────────────────────────────── */}
						<h3>Занятость кресел</h3>
						{summary.chairs.isEmpty ? (
							<p>Приёмов за период не было.</p>
						) : (
							<>
								<table>
									<thead>
										<tr>
											<th scope="col">Кресло</th>
											<th scope="col">Занято</th>
											<th scope="col">Приёмов</th>
											<th scope="col">Занятость</th>
										</tr>
									</thead>
									<tbody>
										{summary.chairs.rows.map((row) => (
											<tr key={row.chairId ?? row.chairName}>
												<td>{row.chairName}</td>
												<td>{formatHours(row.bookedMinutes)}</td>
												<td>{row.appointments}</td>
												<td>{formatPercent(row.utilization)}</td>
											</tr>
										))}
									</tbody>
								</table>
								{/* База расчёта обязана стоять рядом с процентом. */}
								<p>
									<small>{summary.chairs.basis.note}</small>
								</p>
							</>
						)}

						{/* ── Приёмы ────────────────────────────────────────────── */}
						<h3>Приёмы</h3>
						<p>
							Дошли до кресла: {formatPercent(summary.appointments.arrivalRate)} · завершено:{" "}
							{formatPercent(summary.appointments.completionRate)} · отменено:{" "}
							{formatPercent(summary.appointments.cancellationRate)} · неявки:{" "}
							{formatPercent(summary.appointments.noShowRate)}
						</p>

						{/* ── Дебиторка ─────────────────────────────────────────── */}
						<h3>Дебиторка</h3>
						{summary.receivables.totalDebtRub === 0 ? (
							<p>Долгов нет.</p>
						) : (
							<ul style={{ listStyle: "none", padding: 0 }}>
								{Object.entries(summary.receivables.byBucket)
									.filter(([, amount]) => amount > 0)
									.map(([bucket, amount]) => (
										<li key={bucket}>
											{bucketLabels[bucket] ?? bucket}: <strong>{formatRub(amount)}</strong>
										</li>
									))}
							</ul>
						)}

						<p>
							<small>
								Период: {new Date(summary.period.from).toLocaleDateString("ru-RU")} —{" "}
								{new Date(summary.period.to).toLocaleDateString("ru-RU")}. В выручку входят только полученные
								платежи; назначенные и возвращённые не учитываются.
							</small>
						</p>
					</>
				)
			) : null}
		</section>
	);
}

export default ManagerReportsPanel;

/** Подписи дней недели для отчёта загрузки — вынесены для повторного использования. */
export { weekdayNames };

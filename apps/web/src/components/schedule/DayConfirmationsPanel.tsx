/**
 * Утренний обзвон: кому звонить, а кому не нужно.
 *
 * ЗАЧЕМ ЭТА ПАНЕЛЬ
 * Подтверждение приёма по ссылке уже работает, но его результата администратор
 * нигде не видел — и продолжал обзванивать всех подряд. Половина звонков зря,
 * половина нужных пропущена, потому что неизвестно, до кого напоминание не
 * дошло.
 *
 * УСТРОЙСТВО ЭКРАНА ПОДЧИНЕНО ОДНОМУ ВОПРОСУ: кому звонить. Поэтому список по
 * умолчанию показывает только таких пациентов, а не всех записанных: полный
 * список есть в расписании, а здесь нужна работа на утро. Переключатель
 * «показать всех» рядом.
 *
 * Звонить нужно тому, кто не подтвердил И до кого напоминание не дошло.
 * Доставленное напоминание без ответа поводом для звонка не является: у
 * пациента был выбор, и это решение принято на стороне сервера, а не здесь.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

type ReminderState = "not_queued" | "queued" | "sent" | "delivered" | "failed" | "suppressed" | "cancelled";

type ConfirmationRow = {
	appointmentId: string;
	startsAt: string;
	status: string;
	patientId: string | null;
	patientName: string;
	phone: string | null;
	doctorName: string | null;
	reminder: { state: ReminderState; channel: string | null; at: string | null; detail: string | null };
	patientClickedAt: string | null;
	needsCall: boolean;
};

type DayConfirmations = {
	date: string;
	timeZone: string;
	summary: {
		total: number;
		confirmed: number;
		awaiting: number;
		cancelled: number;
		noShow: number;
		needsCall: number;
		withoutPhone: number;
	};
	rows: ConfirmationRow[];
	isEmpty: boolean;
};

const reminderLabels: Record<ReminderState, string> = {
	not_queued: "не отправлялось",
	queued: "в очереди",
	sent: "отправлено",
	delivered: "доставлено",
	failed: "не доставлено",
	suppressed: "не отправлено",
	cancelled: "снято"
};

const appointmentStatusLabels: Record<string, string> = {
	planned: "Запланирован",
	confirmed: "Подтверждён",
	arrived: "Пришёл",
	in_treatment: "На лечении",
	completed: "Завершён",
	cancelled: "Отменён",
	no_show: "Не пришёл"
};

function tomorrowIsoDate(): string {
	const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
}

function formatTime(value: string, timeZone: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "—";
	try {
		return new Intl.DateTimeFormat("ru-RU", { timeZone, hour: "2-digit", minute: "2-digit" }).format(parsed);
	} catch {
		return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(parsed);
	}
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

export function DayConfirmationsPanel() {
	const [date, setDate] = useState(tomorrowIsoDate);
	const [data, setData] = useState<DayConfirmations | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [showAll, setShowAll] = useState(false);
	const [handled, setHandled] = useState<Set<string>>(new Set());

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/schedule/day-confirmations?date=${encodeURIComponent(date)}`);
			setData(await readJson<DayConfirmations>(response));
			// Отметки «обзвонил» относятся к загруженному дню и при смене даты
			// сбрасываются: иначе они переносятся на другой список.
			setHandled(new Set());
		} catch (loadError) {
			setData(null);
			setError(loadError instanceof Error ? loadError.message : String(loadError));
		} finally {
			setLoading(false);
		}
	}, [date]);

	useEffect(() => {
		void load();
	}, [load]);

	const visibleRows = useMemo(() => {
		if (!data) return [];
		return showAll ? data.rows : data.rows.filter((row) => row.needsCall);
	}, [data, showAll]);

	function toggleHandled(appointmentId: string) {
		setHandled((previous) => {
			const next = new Set(previous);
			if (next.has(appointmentId)) next.delete(appointmentId);
			else next.add(appointmentId);
			return next;
		});
	}

	return (
		<section className="panel" data-testid="day-confirmations-panel">
			<div className="panel-heading">
				<h2>Обзвон и подтверждения</h2>
				<span>
					<label htmlFor="confirmations-date">День</label>
					<input
						id="confirmations-date"
						type="date"
						value={date}
						onChange={(event) => setDate(event.target.value)}
					/>
					<button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>
						Обновить
					</button>
				</span>
			</div>

			{error ? <p role="alert">Список не построен: {error}</p> : null}
			{loading && data === null ? <p>Загружаю…</p> : null}

			{data ? (
				data.isEmpty ? (
					<p>На этот день приёмов нет.</p>
				) : (
					<>
						<ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: "16px" }}>
							<li>
								{/* Главное число экрана: сколько звонков реально нужно сделать. */}
								<strong>{data.summary.needsCall}</strong>
								<br />
								<small>нужен звонок</small>
							</li>
							<li>
								<strong>{data.summary.confirmed}</strong>
								<br />
								<small>подтвердили сами</small>
							</li>
							<li>
								<strong>{data.summary.awaiting}</strong>
								<br />
								<small>ждут подтверждения</small>
							</li>
							<li>
								<strong>{data.summary.total}</strong>
								<br />
								<small>всего приёмов</small>
							</li>
							{data.summary.withoutPhone > 0 ? (
								<li>
									<strong>{data.summary.withoutPhone}</strong>
									<br />
									<small>без телефона</small>
								</li>
							) : null}
						</ul>

						<div className="quick-chips-row">
							<button
								type="button"
								className={`quick-chip ${showAll ? "" : "selected"}`}
								onClick={() => setShowAll(false)}
							>
								Только нужные звонки
							</button>
							<button
								type="button"
								className={`quick-chip ${showAll ? "selected" : ""}`}
								onClick={() => setShowAll(true)}
							>
								Все приёмы дня
							</button>
						</div>

						{visibleRows.length === 0 ? (
							<p>
								{/* Лучший возможный итог: обзвон не нужен вовсе. */}
								Звонить никому не нужно: все либо подтвердили, либо получили напоминание.
							</p>
						) : (
							<table>
								<thead>
									<tr>
										<th scope="col">Время</th>
										<th scope="col">Пациент</th>
										<th scope="col">Телефон</th>
										<th scope="col">Врач</th>
										<th scope="col">Запись</th>
										<th scope="col">Напоминание</th>
										<th scope="col">Обзвон</th>
									</tr>
								</thead>
								<tbody>
									{visibleRows.map((row) => (
										<tr key={row.appointmentId} style={handled.has(row.appointmentId) ? { opacity: 0.55 } : undefined}>
											<td>{formatTime(row.startsAt, data.timeZone)}</td>
											<td>{row.patientName}</td>
											<td>
												{row.phone ? (
													// Ссылка tel: — на планшете регистратуры звонок в одно касание.
													<a href={`tel:${row.phone.replace(/[^\d+]/g, "")}`}>{row.phone}</a>
												) : (
													<span title="У пациента не указан телефон — позвонить некуда">телефона нет</span>
												)}
											</td>
											<td>{row.doctorName ?? "—"}</td>
											<td>
												<span className={`status-pill status-${row.status}`}>
													{appointmentStatusLabels[row.status] ?? row.status}
												</span>
												{row.patientClickedAt ? (
													<>
														<br />
														<small>ответил сам</small>
													</>
												) : null}
											</td>
											<td>
												{reminderLabels[row.reminder.state]}
												{row.reminder.detail ? (
													<>
														<br />
														{/* Причина недоставки прямо в строке: администратор должен
														    понимать, почему пациент ничего не знает. */}
														<small>{row.reminder.detail}</small>
													</>
												) : null}
											</td>
											<td>
												{row.needsCall ? (
													<button
														className={handled.has(row.appointmentId) ? "secondary-button" : "primary-button"}
														type="button"
														onClick={() => toggleHandled(row.appointmentId)}
													>
														{handled.has(row.appointmentId) ? "Вернуть в список" : "Позвонил"}
													</button>
												) : (
													"не требуется"
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}

						<p>
							<small>
								Звонок нужен тому, кто не подтвердил и до кого напоминание не дошло. Доставленное напоминание без
								ответа поводом для звонка не считается: у пациента был выбор. Отметка «Позвонил» живёт до
								обновления страницы — это рабочий след на утро, а не запись в карточке.
							</small>
						</p>
					</>
				)
			) : null}
		</section>
	);
}

export default DayConfirmationsPanel;

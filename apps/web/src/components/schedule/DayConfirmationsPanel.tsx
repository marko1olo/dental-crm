import { showToast } from "../GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
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
 * умолчанию показывает только таких пациентов: полный список есть в расписании,
 * а здесь нужна работа на утро.
 *
 * Решение «звонить или нет» принимает сервер (поле needsCall), а не разметка:
 * доставленное напоминание без ответа поводом для звонка не является — у
 * пациента был выбор.
 *
 * ОФОРМЛЕНИЕ. Ни одного зашитого цвета: всё на переменных темы через
 * styles/dente-operations.css, поэтому светлая, тёмная и ночная темы работают
 * одинаково. Цифры моноширинные — время и суммы стоят разряд под разрядом.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

type ReminderState =
	| "not_queued"
	| "queued"
	| "sent"
	| "delivered"
	| "failed"
	| "suppressed"
	| "cancelled";

type ConfirmationRow = {
	appointmentId: string;
	startsAt: string;
	status: string;
	patientId: string | null;
	patientName: string;
	phone: string | null;
	doctorName: string | null;
	reminder: {
		state: ReminderState;
		channel: string | null;
		at: string | null;
		detail: string | null;
	};
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

/** Подпись и вид состояния напоминания. Вид несёт смысл вместе с текстом. */
const reminderPresentation: Record<
	ReminderState,
	{ label: string; tone: "ok" | "warn" | "bad" | "info" | "muted" }
> = {
	delivered: { label: "доставлено", tone: "ok" },
	sent: { label: "отправлено", tone: "info" },
	queued: { label: "в очереди", tone: "info" },
	failed: { label: "не доставлено", tone: "bad" },
	suppressed: { label: "не отправлено", tone: "warn" },
	cancelled: { label: "снято", tone: "muted" },
	not_queued: { label: "не отправлялось", tone: "muted" },
};

const appointmentStatusLabels: Record<string, string> = {
	planned: "Запланирован",
	confirmed: "Подтверждён",
	arrived: "Пришёл",
	in_treatment: "На лечении",
	completed: "Завершён",
	cancelled: "Отменён",
	no_show: "Не пришёл",
};

/**
 * Адрес запроса за днём. Пустая просьба означает «день назови сам».
 *
 * ЧТО БЫЛО СЛОМАНО, И ПОЧЕМУ ЭТО ХУЖЕ, ЧЕМ ВЫГЛЯДЕЛО. Здесь стояла своя функция
 * tomorrowIsoDate: к текущему моменту прибавлялись 24 часа, и результат
 * раскладывался местными полями Date. Две ошибки в четырёх строках.
 *
 * Первая — сутки не всегда равны 24 часам. В день перехода на зимнее время их
 * 25, и прибавленные 24 часа НЕ доводят до следующей календарной даты: список
 * «на завтра» молча становится списком на сегодня.
 *
 * Вторая — день считался в поясе БРАУЗЕРА, а не в поясе клиники. Планшет
 * регистратуры с неверно выставленным поясом давал не тот день без единого
 * сообщения на экране.
 *
 * И главное: панель ВСЕГДА посылала явную дату, поэтому серверный расчёт
 * «даты нет — считаю завтра в поясе клиники» (routes/dayConfirmations.ts,
 * tomorrowInTimeZone) в рабочем пути не исполнялся ни разу. Правильный ответ на
 * сервере был, а администратор получал посчитанный браузером.
 *
 * Теперь день для начальной загрузки клиент не считает вообще: за первым
 * запросом даты нет, и сервер отвечает днём, посчитанным календарно в поясе
 * клиники. Второй ответ на тот же вопрос не нужен.
 */
export function dayConfirmationsRequestPath(requestedDate: string): string {
	const base = "/api/schedule/day-confirmations";
	const trimmed = requestedDate.trim();
	return trimmed ? `${base}?date=${encodeURIComponent(trimmed)}` : base;
}

/**
 * Какой день показать в поле ввода: выбранный человеком, а пока никто не выбрал
 * — тот, который назвал сервер. Пустое поле возвращает управление серверу, то
 * есть снова к завтрашнему дню клиники.
 */
export function dayConfirmationsShownDay(
	requestedDate: string,
	loaded: { date: string } | null,
): string {
	return requestedDate.trim() || loaded?.date || "";
}

function formatTime(value: string, timeZone: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "—";
	try {
		return new Intl.DateTimeFormat("ru-RU", {
			timeZone,
			hour: "2-digit",
			minute: "2-digit",
		}).format(parsed);
	} catch {
		return new Intl.DateTimeFormat("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
		}).format(parsed);
	}
}

async function readJson<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch(() => null)) as unknown;
	if (!response.ok) {
		const message =
			payload &&
			typeof payload === "object" &&
			"message" in payload &&
			typeof payload.message === "string"
				? payload.message
				: `Сервер ответил ${response.status}`;
		throw new Error(message);
	}
	return payload as T;
}

export function DayConfirmationsPanel() {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const authRef = useRef(auth);
	authRef.current = auth;

	// Пусто — день ещё не выбирали, его назовёт сервер в поясе клиники.
	const [requestedDate, setRequestedDate] = useState("");
	const [data, setData] = useState<DayConfirmations | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [showAll, setShowAll] = useState(false);
	const [handled, setHandled] = useState<Set<string>>(new Set());
	const liveRegion = useRef<HTMLParagraphElement | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const headers = authRef.current
				? authRef.current.denteClinicalReadHeaders()
				: {};
			const response = await fetch(dayConfirmationsRequestPath(requestedDate), {
				headers,
			});
			setData(await readJson<DayConfirmations>(response));
			// Отметки «обзвонил» относятся к загруженному дню и при смене даты
			// сбрасываются: иначе они переносятся на другой список.
			setHandled(new Set());
		} catch (loadError) {
			showToast(actionFailureToast("Ошибка выполнения операции", (loadError as { status?: number })?.status ?? null), "error");
			setData(null);
			setError(
				loadError instanceof Error ? loadError.message : String(loadError),
			);
		} finally {
			setLoading(false);
		}
	}, [requestedDate]);

	useEffect(() => {
		void load();
	}, [load]);

	const visibleRows = useMemo(() => {
		if (!data) return [];
		return showAll ? data.rows : data.rows.filter((row) => row.needsCall);
	}, [data, showAll]);

	const callProgress = useMemo(() => {
		if (!data) return { done: 0, total: 0 };
		const total = data.summary.needsCall;
		const done = data.rows.filter(
			(row) => row.needsCall && handled.has(row.appointmentId),
		).length;
		return { done, total };
	}, [data, handled]);

	function toggleHandled(row: ConfirmationRow) {
		setHandled((previous) => {
			const next = new Set(previous);
			if (next.has(row.appointmentId)) next.delete(row.appointmentId);
			else next.add(row.appointmentId);
			return next;
		});
		// Читалка экрана должна сообщить об изменении: список визуально гаснет,
		// но незрячему администратору это ничего не говорит.
		if (liveRegion.current) {
			liveRegion.current.textContent = handled.has(row.appointmentId)
				? `${row.patientName} возвращён в список обзвона`
				: `${row.patientName} отмечен как обзвоненный`;
		}
	}

	return (
		<section className="panel ops-panel" data-testid="day-confirmations-panel">
			<div className="panel-heading">
				<h2>Обзвон и подтверждения</h2>
				{data && data.summary.needsCall > 0 ? (
					<span className="status-pill status-arrived">
						обзвонено {callProgress.done} из {callProgress.total}
					</span>
				) : null}
			</div>

			<div className="ops-toolbar">
				<span className="ops-field">
					<label htmlFor="confirmations-date">День</label>
					{/* До первой загрузки поле пусто: день назовёт сервер в поясе клиники. */}
					<input
						id="confirmations-date"
						type="date"
						value={dayConfirmationsShownDay(requestedDate, data)}
						onChange={(event) => setRequestedDate(event.target.value)}
					/>
				</span>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void load()}
					disabled={loading}
				>
					{loading ? "Обновляю…" : "Обновить"}
				</button>
			</div>

			{error ? (
				<p className="ops-notice ops-notice--error" role="alert">
					Список не построен: {error}
				</p>
			) : null}

			{/* Скелет занимает место данных — кнопка не уезжает из-под пальца. */}
			{loading && data === null ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			<p
				className="sr-only"
				role="status"
				aria-live="polite"
				ref={liveRegion}
			/>

			{data ? (
				data.isEmpty ? (
					<p className="ops-empty">На этот день приёмов нет.</p>
				) : (
					<>
						<ul className="ops-metrics">
							<li
								className={`ops-metric ${data.summary.needsCall > 0 ? "ops-metric--primary" : ""}`}
							>
								{/* Главное число экрана: сколько звонков реально нужно сделать. */}
								<span className="ops-metric__value">
									{data.summary.needsCall}
								</span>
								<span className="ops-metric__label">нужен звонок</span>
							</li>
							<li className="ops-metric">
								<span className="ops-metric__value">
									{data.summary.confirmed}
								</span>
								<span className="ops-metric__label">подтвердили сами</span>
							</li>
							<li className="ops-metric">
								<span className="ops-metric__value">
									{data.summary.awaiting}
								</span>
								<span className="ops-metric__label">ждут подтверждения</span>
							</li>
							<li className="ops-metric">
								<span className="ops-metric__value">{data.summary.total}</span>
								<span className="ops-metric__label">всего приёмов</span>
							</li>
							{data.summary.withoutPhone > 0 ? (
								<li className="ops-metric ops-metric--danger">
									<span className="ops-metric__value">
										{data.summary.withoutPhone}
									</span>
									<span className="ops-metric__label">без телефона</span>
								</li>
							) : null}
						</ul>

						<fieldset
							className="quick-chips-row"
							aria-label="Что показывать в списке"
							style={{ border: "none", padding: 0, margin: 0 }}
						>
							<legend className="sr-only">Что показывать в списке</legend>
							<button
								type="button"
								className={`quick-chip ${showAll ? "" : "selected"}`}
								aria-pressed={!showAll}
								onClick={() => setShowAll(false)}
							>
								Только нужные звонки
							</button>
							<button
								type="button"
								className={`quick-chip ${showAll ? "selected" : ""}`}
								aria-pressed={showAll}
								onClick={() => setShowAll(true)}
							>
								Все приёмы дня
							</button>
						</fieldset>

						{visibleRows.length === 0 ? (
							<p className="ops-empty ops-empty--good">
								{/* Лучший возможный итог — и выглядеть он должен как успех, а не как пустота. */}
								Звонить никому не нужно: все либо подтвердили, либо получили
								напоминание.
							</p>
						) : (
							<div className="ops-table-wrap">
								<table className="ops-table">
									<caption className="sr-only">
										Приёмы на {data.date}. Отмечены те, кому нужен звонок.
									</caption>
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
										{visibleRows.map((row) => {
											const isHandled = handled.has(row.appointmentId);
											const reminder = reminderPresentation[row.reminder.state];
											return (
												<tr
													key={row.appointmentId}
													className={`${row.needsCall && !isHandled ? "ops-row--action" : ""} ${isHandled ? "ops-row--done" : ""}`}
												>
													<td className="ops-time" data-label="Время">
														{formatTime(row.startsAt, data.timeZone)}
													</td>
													<td className="ops-strong" data-label="Пациент">
														{row.patientName}
													</td>
													<td data-label="Телефон">
														{row.phone ? (
															// tel: — на планшете регистратуры звонок в одно касание.
															<a
																href={`tel:${row.phone.replace(/[^\d+]/g, "")}`}
															>
																{row.phone}
															</a>
														) : (
															<span className="ops-state ops-state--bad">
																телефона нет
															</span>
														)}
													</td>
													<td data-label="Врач" data-compact="">
														{row.doctorName ?? "—"}
													</td>
													<td data-label="Запись" data-compact="">
														<span
															className={`status-pill status-${row.status}`}
														>
															{appointmentStatusLabels[row.status] ??
																row.status}
														</span>
														{row.patientClickedAt ? (
															<span className="ops-note">ответил сам</span>
														) : null}
													</td>
													<td data-label="Напоминание" data-compact="">
														<span
															className={`ops-state ops-state--${reminder.tone}`}
														>
															{reminder.label}
														</span>
														{row.reminder.detail ? (
															// Причина недоставки прямо в строке: администратор должен
															// понимать, почему пациент ничего не знает.
															<span className="ops-note">
																{row.reminder.detail}
															</span>
														) : null}
													</td>
													<td data-label="Обзвон">
														{row.needsCall ? (
															<button
																className={
																	isHandled
																		? "secondary-button"
																		: "primary-button"
																}
																type="button"
																aria-pressed={isHandled}
																onClick={() => toggleHandled(row)}
															>
																{isHandled ? "Вернуть" : "Позвонил"}
															</button>
														) : (
															<span className="ops-note">не требуется</span>
														)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}

						<p className="ops-hint">
							Звонок нужен тому, кто не подтвердил и до кого напоминание не
							дошло. Доставленное напоминание без ответа поводом для звонка не
							считается: у пациента был выбор. Отметка «Позвонил» живёт до
							обновления страницы — это рабочий след на утро, а не запись в
							карточке.
						</p>
					</>
				)
			) : null}
		</section>
	);
}

export default DayConfirmationsPanel;

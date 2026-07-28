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
 *
 * ОФОРМЛЕНИЕ. Всё на переменных темы через styles/dente-operations.css — в
 * первой версии панель рисовалась голыми <table> и <ul> с оформлением в
 * атрибуте style и зашитым цветом полосы, который ломался в тёмной теме.
 * Цифры моноширинные: суммы в колонке стоят разряд под разрядом.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { money } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { hasCapability, type ClinicMode } from "../../lib/clinicCapabilities";
import { formatRub as shortRub } from "../../pages/analyticsDoctorMetrics.js";
import { DoctorPayoutDashboard } from "../../pages/DoctorPayoutDashboard.js";

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
	reminderEffect: {
		reminded: ReminderGroup;
		notReminded: ReminderGroup;
		lostRateDifference: number | null;
		caveat: string;
		smallestGroupSize: number;
		enoughData: boolean;
		isEmpty: boolean;
	};
	patientFlow: { points: { bucket: string; newPatients: number; returningPatients: number }[]; newTotal: number; returningTotal: number };
	receivables: {
		totalDebtRub: number;
		byBucket: Record<string, number>;
		debtors: number;
		/*
		 * Переплаты приходят из /api/reports/summary с 2026-07-28. Поля
		 * необязательные: старый ответ сервера (клиника обновляет веб раньше API)
		 * их не содержит, и блок переплат тогда просто не выводится — вместо
		 * «клиника должна вернуть undefined ₽».
		 */
		totalPrepaidRub?: number;
		prepayments?: { patientId: string; patientName: string; prepaidRub: number }[];
	};
	isEmpty: boolean;
};

/** Группа приёмов в сравнении «дошло напоминание или нет». */
type ReminderGroup = {
	appointments: number;
	completed: number;
	cancelled: number;
	noShow: number;
	lost: number;
	lostRate: number | null;
};

const bucketLabels: Record<string, string> = {
	current: "до недели",
	up_to_30: "до 30 дней",
	up_to_90: "до 90 дней",
	over_90: "больше 90 дней",
	undated: "дата не определена"
};

const weekdayNames = ["", "пн", "вт", "ср", "чт", "пт", "сб", "вс"];

/*
 * Денежных форматов в проекте два, и оба общие: короткий `shortRub`
 * («1,4 тыс. ₽», pages/analyticsDoctorMetrics.ts) — для плиток и полос, где
 * длинное число не читается и ломает вёрстку, и полный `money` («1 500,50 ₽»,
 * AppHelpers.tsx) — для таблиц и итоговых приписок, где нужна точная сумма.
 *
 * БЫЛО: здесь стоял третий, местный формат `${value.toLocaleString("ru-RU")} ₽`
 * без ограничения дробной части. Суммы приходят с копейками, поэтому средний чек
 * 3416.666666666667 печатался в таблице как «3 416,666666666667 ₽», а те же
 * деньги на экране аналитики выглядели иначе — два формата в одном продукте.
 */

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

export type ManagerReportsPanelProps = {
	/**
	 * Режим клиники. Определяет, какие разрезы уместны: занятость единственного
	 * кресла — всегда одно и то же число, а выработка единственного врача — одна
	 * строка. Не передан — показывается всё (см. lib/clinicCapabilities.ts).
	 */
	readonly clinicMode?: ClinicMode | null;
};

export function ManagerReportsPanel({ clinicMode = null }: ManagerReportsPanelProps = {}) {
	/*
	 * ПОЧЕМУ У ЗАПРОСА СВОДКИ ЕСТЬ ЗАГОЛОВКИ. Раздел был мёртв у заказчика целиком,
	 * и увидеть это на машине разработчика нельзя.
	 *
	 * /api/reports/summary закрыт охраной `apps/api/src/accessGuard.ts`: обработчик
	 * зовёт местную обёртку `scopeFor` (routes/reports.ts:79), а та —
	 * `requireClinicalReadContext`. Без заголовка `x-dente-admin-secret` охрана
	 * отвечает 403 даже при действительных токенах кабинета и сотрудника — проверено
	 * живьём на отдельном экземпляре API с заданным секретом и выключенными
	 * лазейками. Панель звала адрес голым fetch, поэтому вместо выручки, врачей,
	 * кресел, потерь и дебиторки владелец клиники видел одну строку «Отчёт не
	 * построен: Сервер ответил 403».
	 *
	 * Локально этого не видно: в корневом `.env` секрет закомментирован, зато
	 * включены лазейки DENTE_CLINICAL_ALLOW_UNGUARDED_READS/MUTATIONS, и живут они
	 * только пока NODE_ENV !== "production". Ни типы, ни тесты, ни глаза на этой
	 * машине такую поломку не показывают — её ловит `npm run check:guarded-headers`.
	 *
	 * `auth` берётся ТОЛЬКО из useAppLogicContext(): одноимённые функции из
	 * AppHelpers.tsx (около строки 6142) сеансовый секрет НЕ подставляют — с ними код
	 * компилируется, гейт замолкает, а клиника по-прежнему получает 403. Контекстные
	 * подставляют `clinicalAdminSecretSession` (hooks/domains/useAuthLogic.ts:135).
	 */
	const appLogic = useAppLogicContext();
	/*
	 * СЕКРЕТ ЧИТАЕТСЯ ЧЕРЕЗ ref, А НЕ ИЗ ЗАМЫКАНИЯ И НЕ ЧЕРЕЗ ЗАВИСИМОСТЬ. Оба
	 * «прямых» способа здесь ломаются, каждый по-своему:
	 *   — взять `auth` в замыкание `load` нельзя: функция мемоизирована по
	 *     [from, to, granularity], и `auth` застыл бы на том отрисовывании, когда
	 *     секрета в сеансе ещё не было (он появляется после разблокировки раздела) —
	 *     то есть 403 держался бы до перезагрузки страницы;
	 *   — дописать `auth` в зависимости `load` нельзя: useAuthLogic возвращает НОВЫЙ
	 *     объект на каждом отрисовывании (useAppLogic.tsx:2395, без useMemo), поэтому
	 *     `load` менялся бы каждый раз, а `useEffect(..., [load])` ниже отправлял бы
	 *     запрос на каждом отрисовывании — бесконечный поток запросов к серверу.
	 * Ref остаётся одним и тем же объектом, а значение в нём всегда свежее: даже
	 * мемоизированный `load` прочитает секрет, появившийся уже после него.
	 */
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;
	const showDoctorBreakdown = hasCapability(clinicMode, "doctorBreakdown");
	const showChairUtilisation = hasCapability(clinicMode, "chairUtilisation");
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
			/*
			 * Заголовки собираются в момент запроса, а не при создании `load`:
			 * см. пояснение к authRef выше. Проверка на `auth` — не
			 * перестраховка: useAppLogicContext() вне провайдера возвращает
			 * пустой объект (contexts/AppLogicContext.tsx:21), и тогда обращение
			 * к функции уронило бы весь раздел вместо показа отказа.
			 */
			const auth = authRef.current;
			const readHeaders =
				auth && typeof auth.denteClinicalReadHeaders === "function" ? auth.denteClinicalReadHeaders() : {};
			const response = await fetch(`/api/reports/summary?${query.toString()}`, { headers: readHeaders });
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
		<section className="panel ops-panel" data-testid="manager-reports-panel">
			<div className="panel-heading">
				<h2>Отчёты руководителю</h2>
			</div>

			<div className="ops-toolbar">
				<span className="ops-field">
					<label htmlFor="report-from">Период с</label>
					<input id="report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
				</span>
				<span className="ops-field">
					<label htmlFor="report-to">по</label>
					<input id="report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
				</span>
				<span className="ops-field">
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
					{loading ? "Считаю…" : "Обновить"}
				</button>
			</div>

			{error ? (
				<p className="ops-notice ops-notice--error" role="alert">
					Отчёт не построен: {error}
				</p>
			) : null}

			{/* Скелет держит высоту: без него содержимое прыгает при каждой смене периода. */}
			{loading && summary === null ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			{summary ? (
				summary.isEmpty ? (
					<p className="ops-empty">За выбранный период данных нет: ни платежей, ни приёмов. Это не нулевые показатели, а отсутствие записей.</p>
				) : (
					<>
						{/* ── Главные числа ─────────────────────────────────────── */}
						<h3 className="ops-section-title">Итоги периода</h3>
						<ul className="ops-metrics">
							<li className="ops-metric ops-metric--primary">
								<span className="ops-metric__value" title={money(summary.revenue.totalRub)}>{shortRub(summary.revenue.totalRub)}</span>
								<span className="ops-metric__label">получено</span>
							</li>
							<li className="ops-metric">
								<span className="ops-metric__value">{summary.appointments.total}</span>
								<span className="ops-metric__label">приёмов</span>
							</li>
							<li className={`ops-metric ${summary.appointments.lostAppointments > 0 ? "ops-metric--danger" : ""}`}>
								<span className="ops-metric__value">{summary.appointments.lostAppointments}</span>
								{/* Именно этот показатель уменьшают напоминаниями. */}
								<span className="ops-metric__label">потеряно: отмены и неявки</span>
							</li>
							<li className="ops-metric">
								<span className="ops-metric__value">{formatPercent(summary.appointments.noShowRate)}</span>
								<span className="ops-metric__label">доля неявок</span>
							</li>
							<li className={`ops-metric ${summary.receivables.totalDebtRub > 0 ? "ops-metric--danger" : ""}`}>
								<span className="ops-metric__value" title={money(summary.receivables.totalDebtRub)}>{shortRub(summary.receivables.totalDebtRub)}</span>
								<span className="ops-metric__label">долг, {summary.receivables.debtors} пациент(ов)</span>
							</li>
							<li className="ops-metric">
								<span className="ops-metric__value">
									{summary.patientFlow.newTotal} / {summary.patientFlow.returningTotal}
								</span>
								{/*
									Подпись называет единицу измерения. Было просто «первичные /
									повторные», и рядом стояла плитка «22 приёмов» — на экране
									получалось «7 / 0» против «22», то есть видимое противоречие.
									На деле это разные вещи: здесь считаются УНИКАЛЬНЫЕ ПАЦИЕНТЫ,
									дошедшие до кресла, а там — все записи любого состояния,
									включая ещё не состоявшиеся и отменённые. Цифра была верной,
									врала подпись.
								*/}
								<span className="ops-metric__label">пациентов: первичные / повторные</span>
							</li>
						</ul>

						{/* ── Динамика выручки ──────────────────────────────────── */}
						<h3 className="ops-section-title">Выручка</h3>
						{summary.revenue.isEmpty ? (
							<p className="ops-empty">Платежей за период не было.</p>
						) : (
							<ul className="ops-bars">
								{summary.revenue.points.map((point) => (
									<li className="ops-bar" key={point.bucket}>
										<span className="ops-bar__label">{point.bucket}</span>
										{/*
											Ширина в процентах, а не в пикселях: колонка отчёта на
											планшете и на широком мониторе разной ширины, и полоса в
											240 пикселей на узком экране вылезала за край.
										*/}
										<span
											className="ops-bar__track"
											title={`${point.paymentCount} платеж(ей), ${point.payingPatients} пациент(ов)`}
										>
											<span
												className="ops-bar__fill"
												style={{
													width: `${maxRevenue > 0 ? Math.max(2, Math.round((point.revenueRub / maxRevenue) * 100)) : 2}%`
												}}
											/>
										</span>
										{/* Полоса узкая: короткий вид, точная сумма — в подсказке. */}
										<span className="ops-bar__value" title={money(point.revenueRub)}>{shortRub(point.revenueRub)}</span>
									</li>
								))}
							</ul>
						)}

						{/* ── Врачи ─────────────────────────────────────────────── */}
						{/*
							У отдельного врача этот разрез — одна строка с его же фамилией.
							Прячем не потому, что пусто, а потому что сравнивать не с кем.
						*/}
						{showDoctorBreakdown ? (
							<>
						<h3 className="ops-section-title">Врачи</h3>
						{summary.doctors.isEmpty ? (
							<p className="ops-empty">Выработки за период нет.</p>
						) : (
							<>
								<div className="ops-table-wrap">
								<table className="ops-table">
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
												<td className="ops-strong" data-label="Врач">
													{row.doctorName}
												</td>
												<td className="ops-num" data-label="Получено">
													{money(row.revenueRub)}
												</td>
												<td className="ops-num" data-label="Приёмов">
													{row.appointmentsTotal}
												</td>
												<td className="ops-num" data-label="Завершено">
													{row.appointmentsCompleted} ({formatPercent(row.completionRate)})
												</td>
												<td className="ops-num" data-label="Неявки">
													{row.appointmentsNoShow} ({formatPercent(row.noShowRate)})
												</td>
												<td className="ops-num" data-label="Средний чек">
													{row.averageTicketRub === null ? "—" : money(row.averageTicketRub)}
												</td>
												{/*
													Прочерк осознанный, но теперь он не тупик: расчёт врачебной
													выплаты живёт в блоке «Выплаты врачам» ниже, у него свой
													зарплатный месяц и свои правила округления до копейки.

													ПОДПИСЬ ИСПРАВЛЕНА. Было «Себестоимость материалов и процент
													врача в системе не заданы» — про процент это уже неверно:
													колонка `doctor_commissions.commission_pct` существует, и у
													неё два живых писателя (подпись дневника визита и профиль
													рабочего кабинета). Отсутствуют не поля, а строки, и
													заполняются они в другом месте — подсказка должна вести
													туда, а не утверждать, что возможности нет.
												*/}
												<td
													className="ops-num"
													data-label="Маржа"
													title="Маржа по врачу не считается здесь: смотрите блок «Выплаты врачам» ниже — там касса, ставка врача и удержание за материалы за выбранный зарплатный месяц"
												>
													—
												</td>
											</tr>
										))}
									</tbody>
								</table>
								</div>
								{summary.doctors.unattributedRevenueRub > 0 ? (
									<p className="ops-hint">
										Не отнесено к врачу: {money(summary.doctors.unattributedRevenueRub)}.{" "}
										{summary.doctors.attributionNote}
									</p>
								) : null}
							</>
						)}
						</>
						) : null}

						{/* ── Кресла ────────────────────────────────────────────── */}
						{/*
							При одном кресле процент занятости — всегда одно и то же число:
							смотреть там нечего, а строка на экране остаётся.
						*/}
						{showChairUtilisation ? (
							<>
						<h3 className="ops-section-title">Занятость кресел</h3>
						{summary.chairs.isEmpty ? (
							<p className="ops-empty">Приёмов за период не было.</p>
						) : (
							<>
								<div className="ops-table-wrap">
								<table className="ops-table">
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
												<td className="ops-strong" data-label="Кресло">
													{row.chairName}
												</td>
												<td className="ops-num" data-label="Занято">
													{formatHours(row.bookedMinutes)}
												</td>
												<td className="ops-num" data-label="Приёмов">
													{row.appointments}
												</td>
												<td className="ops-num" data-label="Занятость">
													{formatPercent(row.utilization)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
								</div>
								{/* База расчёта обязана стоять рядом с процентом. */}
								<p className="ops-hint">{summary.chairs.basis.note}</p>
							</>
						)}
						</>
						) : null}

						{/* ── Приёмы ────────────────────────────────────────────── */}
						<h3 className="ops-section-title">Приёмы</h3>
						<p>
							Дошли до кресла: {formatPercent(summary.appointments.arrivalRate)} · завершено:{" "}
							{formatPercent(summary.appointments.completionRate)} · отменено:{" "}
							{formatPercent(summary.appointments.cancellationRate)} · неявки:{" "}
							{formatPercent(summary.appointments.noShowRate)}
						</p>
						{/*
							Доли считаются от ВСЕХ записей периода, включая ещё не
							состоявшиеся, поэтому в сумме они меньше ста процентов. Без этой
							строки экран выглядел как ошибка подсчёта: 45 + 14 + 9 = 68, и
							куда делись остальные — непонятно.
						*/}
						<p className="ops-hint">
							Доли считаются от всех {summary.appointments.total} записей периода. Остаток до 100 % — приёмы,
							которые ещё не состоялись: они назначены на будущее или ждут подтверждения.
						</p>

						{/*
							── Работают ли напоминания ──────────────────────────────
							Клиника платит за каждое SMS и должна видеть, окупается ли
							это. Показываются ОБА состава групп, а не только разница:
							по разнице долей нельзя понять, что она посчитана на трёх
							приёмах. Когда данных мало, вывод помечается прямо, а не
							подаётся как результат.
						*/}
						<h3 className="ops-section-title">Работают ли напоминания</h3>
						{summary.reminderEffect.isEmpty ? (
							<p className="ops-empty">Приёмов за период нет — сравнивать нечего.</p>
						) : (
							<>
								<div className="ops-table-wrap">
									<table className="ops-table">
										<caption className="sr-only">Потери приёмов в зависимости от того, дошло ли напоминание</caption>
										<thead>
											<tr>
												<th scope="col">Приёмы</th>
												<th scope="col">Всего</th>
												<th scope="col">Отмены</th>
												<th scope="col">Неявки</th>
												<th scope="col">Потеряно</th>
												<th scope="col">Доля потерь</th>
											</tr>
										</thead>
										<tbody>
											{(
												[
													["Напоминание дошло", summary.reminderEffect.reminded],
													["Напоминание не дошло", summary.reminderEffect.notReminded]
												] as const
											).map(([label, group]) => (
												<tr key={label}>
													<td className="ops-strong" data-label="Приёмы">
														{label}
													</td>
													<td className="ops-num" data-label="Всего">
														{group.appointments}
													</td>
													<td className="ops-num" data-label="Отмены">
														{group.cancelled}
													</td>
													<td className="ops-num" data-label="Неявки">
														{group.noShow}
													</td>
													<td className="ops-num" data-label="Потеряно">
														{group.lost}
													</td>
													<td className="ops-num ops-strong" data-label="Доля потерь">
														{formatPercent(group.lostRate)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>

								{summary.reminderEffect.lostRateDifference !== null ? (
									<p className={summary.reminderEffect.enoughData ? "ops-hint" : "ops-hint ops-hint--weak"}>
										{summary.reminderEffect.enoughData ? (
											<>
												Без напоминания теряется на{" "}
												<strong>{Math.round(summary.reminderEffect.lostRateDifference * 100)} п. п.</strong> больше.{" "}
											</>
										) : null}
										{summary.reminderEffect.caveat}
									</p>
								) : (
									<p className="ops-hint">
										Одна из групп пуста — сравнивать не с чем. {summary.reminderEffect.caveat}
									</p>
								)}
							</>
						)}

						{/* ── Дебиторка ─────────────────────────────────────────── */}
						<h3 className="ops-section-title">Дебиторка</h3>
						{summary.receivables.totalDebtRub === 0 ? (
							<p className="ops-empty ops-empty--good">Долгов нет.</p>
						) : (
							<ul className="ops-bars">
								{Object.entries(summary.receivables.byBucket)
									.filter(([, amount]) => amount > 0)
									.map(([bucket, amount]) => (
										<li className="ops-bar" key={bucket}>
											<span className="ops-bar__label">{bucketLabels[bucket] ?? bucket}</span>
											<span className="ops-bar__track">
												<span
													className="ops-bar__fill"
													style={{
														width: `${Math.max(2, Math.round((amount / summary.receivables.totalDebtRub) * 100))}%`
													}}
												/>
											</span>
											<span className="ops-bar__value" title={money(amount)}>{shortRub(amount)}</span>
										</li>
									))}
							</ul>
						)}

						{/* ── Переплаты: клиника должна вернуть ────────────────────── */}
						{(summary.receivables.totalPrepaidRub ?? 0) > 0 && (
							<>
								<h3 className="ops-section-title">Переплаты: клиника должна вернуть</h3>
								{/*
								  * Разметка — та же таблица, что у врачей и кресел выше
								  * (`ops-table` в styles/dente-operations.css), с `data-label`
								  * для узких экранов. Своих классов здесь нет намеренно:
								  * придуманный `ops-list__row` в таблице стилей не описан и
								  * дал бы неоформленный блок.
								  */}
								<div className="ops-table-wrap">
									<table className="ops-table">
										<thead>
											<tr>
												<th scope="col">Пациент</th>
												<th scope="col">Переплата</th>
											</tr>
										</thead>
										<tbody>
											{(summary.receivables.prepayments ?? []).map((row) => (
												<tr key={row.patientId}>
													<td className="ops-strong" data-label="Пациент">
														{row.patientName}
													</td>
													<td className="ops-num" data-label="Переплата">
														{money(row.prepaidRub)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
								<p className="ops-hint">
									Эти пациенты заплатили больше назначенного — всего{" "}
									{money(summary.receivables.totalPrepaidRub ?? 0)}. На главном экране сумма к оплате считается
									по всей клинике одним вычитанием, поэтому переплата там уже зачтена в долг других пациентов:
									долг {money(summary.receivables.totalDebtRub)} минус переплаты{" "}
									{money(summary.receivables.totalPrepaidRub ?? 0)} и есть та сумма, которую показывает главный
									экран. Верните деньги или зачтите их в счёт следующего приёма — иначе долг клиники
									продолжит выглядеть меньше, чем он есть.
								</p>
							</>
						)}

						<p className="ops-hint">
							Период: {new Date(summary.period.from).toLocaleDateString("ru-RU")} —{" "}
							{new Date(summary.period.to).toLocaleDateString("ru-RU")}. В выручку входят только полученные
							платежи; назначенные и возвращённые не учитываются.
						</p>
					</>
				)
			) : null}

			{/*
				── Выплаты врачам ────────────────────────────────────────────────
				Расчёт зарплаты врача: касса врача за месяц, ставка, удержание за
				материалы, сумма к выплате. Раньше этой таблицы не видел никто —
				единственный экран, который её рендерил, не импортировал ни один
				файл (страж scripts/check-component-mount-reachability.mjs называл
				его сиротой), и владелец считал зарплату в тетради.

				ПОЧЕМУ ЗДЕСЬ. Это тот же вопрос, что и разрез по врачам выше, и
				ровно то, чего ждал прочерк в колонке «Маржа». Отдельный экран не
				нужен: владелец приходит сюда за месячными итогами, а зарплату
				считают тем же походом.

				ПОЧЕМУ СНАРУЖИ ВЕТКИ `summary`, А НЕ ВНУТРИ РАЗДЕЛА «ВРАЧИ».
				Внутри она была бы видна только когда отчёт УЖЕ построился и в его
				периоде есть записи: при `summary.isEmpty` и при любой ошибке
				/api/reports/summary блок исчезал бы вместе с ней. Зарплата к
				этому отчёту не относится — у неё свой запрос и свой зарплатный
				месяц, и пропадать она не должна ни в тихую неделю, ни когда
				сводка не загрузилась.

				ПОЧЕМУ ПОД ТЕМ ЖЕ ПРИЗНАКОМ, ЧТО И РАЗРЕЗ ПО ВРАЧАМ. Правило уже
				сформулировано в lib/clinicCapabilities.ts: `doctorBreakdown` нет
				у режима solo_doctor. Отдельный врач получает всю выручку сам —
				делить её с собой по проценту незачем, и объяснение пропажи уже
				написано (describeHiddenCapabilities). Второй признак про то же
				самое разъехался бы с первым.

				КОМУ ВИДНО. Решает СЕРВЕР: `payroll.read` и `payroll.read.own` в
				apps/api/src/security/permissions.ts. Роль в шапке — настройка
				интерфейса, её меняет сам пользователь, и прятать по ней зарплату
				значило бы охранять её кнопкой. Компонент исчезает, когда сервер
				ответил 403, и матрицу прав на клиенте не повторяет.
			*/}
			{showDoctorBreakdown ? <DoctorPayoutDashboard /> : null}
		</section>
	);
}

export default ManagerReportsPanel;

/** Подписи дней недели для отчёта загрузки — вынесены для повторного использования. */
export { weekdayNames };

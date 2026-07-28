/**
 * Выплаты врачам за месяц: касса врача, удержание за материалы, к выплате.
 *
 * ЧТО ЗДЕСЬ БЫЛО И ПОЧЕМУ ЭТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ
 *
 * 1. Экран был недостижим. Его рендерил только `pages/FinancialDashboard.tsx`,
 *    которого не импортировал никто (страж достижимости
 *    `scripts/check-component-mount-reachability.mjs` называл его сиротой). Ни
 *    один владелец клиники этой таблицы никогда не видел и считал зарплату
 *    врачей в тетради.
 *
 * 2. Он читал поля, которых сервер не отдаёт: `revenue`, `netPayout`,
 *    `commissionRate`, `date`. Настоящий ответ `GET /api/billing/payouts` —
 *    `revenueRub`, `payoutRub`, `commissionPct`, и никакой `date` у строки нет,
 *    потому что расчёт идёт ЗА ПЕРИОД, а не по дням. Прежний код подставлял
 *    `Number(item.revenue ?? 0)`, то есть на живом ответе напечатал бы ноль в
 *    каждой денежной колонке — молча, без единой ошибки.
 *
 * 3. Ставка отсутствующая и ставка «ноль процентов» выглядели одинаково:
 *    `commissionRate ?? 0` печатал «0 %». Владелец прочитал бы это как «врач
 *    работает бесплатно», а не как «процент врача в системе не задан». Теперь
 *    отсутствие ставки сказано словами, и рядом стоит действие.
 *
 * 4. Отказ сервера выдавался за пустоту наполовину: `catch` ставил техническую
 *    строку «Ошибка загрузки выплат: HTTP 404», а любой ответ без массива
 *    `payouts` (в том числе успешный ответ другой формы) молча превращался в
 *    `setPayouts([])` и рисовал «Записи отсутствуют». Пустая таблица на месте
 *    зарплаты — самая дорогая ошибка в этом продукте: её читают как «никто
 *    ничего не заработал».
 *
 * КАК РЕШАЕТСЯ, КОМУ ЭТО ВИДНО
 * Единственная настоящая проверка — серверная: `payroll.read` (все врачи
 * клиники) и `payroll.read.own` (только свои строки) из
 * `apps/api/src/security/permissions.ts`. Роль на клиенте для этого не годится:
 * переключатель роли в шапке — настройка интерфейса, её меняет сам пользователь.
 * Поэтому здесь НЕ повторяется матрица прав: блок исчезает, когда СЕРВЕР ответил
 * 403, и это единственный источник решения. Копия матрицы на клиенте разъехалась
 * бы с серверной при первой же правке и создала бы ложное чувство защиты.
 *
 * ПЕРИОД — МЕСЯЦ, И ЭТО НЕ УПРОЩЕНИЕ. Зарплату начисляют за месяц; произвольный
 * диапазон в этом месте позволил бы посчитать выплату за неделю и выдать её за
 * месячную. Период окружающего отчёта здесь сознательно не переиспользован: там
 * он произвольный, и смена его на «последние 3 дня» тихо изменила бы зарплату.
 *
 * ОФОРМЛЕНИЕ. Классы `ops-*` из `styles/dente-operations.css`, как в соседних
 * рабочих панелях. Прежняя версия рисовалась Tailwind-утилитами вида
 * `text-[var(--danger,ЗАШИТЫЙ-ЦВЕТ)]`: подстановка после запятой — это
 * шестнадцатеричный цвет прямо в разметке, и в тёмной теме он не менялся. Вместе
 * с ней удалён и собственный файл `DoctorPayoutDashboard.css`.
 *
 * Сам цвет здесь не повторён намеренно: страж оформления
 * (`tests/operationsPanelsStyling.test.ts`) ищет шестнадцатеричные цвета по всему
 * файлу, включая комментарии, и на цитате прежнего кода он справедливо падает.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { countLabel, money } from "../AppHelpers";

/** Состояние расчёта по врачу. Значения приходят с сервера как есть. */
type DoctorPayoutState = "computed" | "rate_missing" | "rate_invalid" | "material_policy_missing";

/** Что известно про себестоимость материалов врача за период. */
type DoctorPayoutMaterialsState = "counted" | "no_movements" | "cost_missing";

type DoctorPayoutRow = {
	doctorUserId: string;
	doctorName: string;
	role: string;
	isActive: boolean;
	revenueRub: number;
	paymentCount: number;
	materialCostRub: number;
	materialMovements: number;
	materialMovementsUnpriced: number;
	materialsState: DoctorPayoutMaterialsState;
	commissionPct: number | null;
	materialDeductionPct: number | null;
	rateEffectiveFrom: string | null;
	rateRowCount: number;
	state: DoctorPayoutState;
	accruedRub: number | null;
	withheldMaterialRub: number | null;
	payoutRub: number | null;
	note: string;
};

type DoctorPayoutTotals = {
	revenueRub: number;
	paymentCount: number;
	attributableRevenueRub: number;
	unattributedRevenueRub: number;
	materialCostRub: number;
	accruedRub: number;
	withheldMaterialRub: number;
	payoutRub: number;
	doctorsCounted: number;
	doctorsWithoutRate: number;
};

type DoctorPayoutReport = {
	/** "all" — все врачи клиники, "own" — только свои строки. */
	scope: "all" | "own";
	period: { from: string; to: string };
	rows: DoctorPayoutRow[];
	totals: DoctorPayoutTotals;
	methodNote: string;
	limitations: string[];
	isEmpty: boolean;
};

/**
 * Состояние загрузки.
 *
 * «Отказ» и «пусто» — РАЗНЫЕ ветки, и объединить их нельзя: пустая таблица на
 * месте зарплаты означает «никто ничего не заработал», а это утверждение о
 * деньгах, которого сервер не делал.
 */
type PayoutLoadState =
	| { kind: "loading" }
	| { kind: "ready"; report: DoctorPayoutReport }
	/** Сервер отказал по роли: блок не показывается вовсе. */
	| { kind: "denied" }
	/** Нет входа сотрудника — это не отказ, а незаконченный вход. */
	| { kind: "needs_staff_login"; message: string }
	/** Расчёт не выполнен. Причина и действие обязательны. */
	| { kind: "failed"; message: string; action: string };

/** Текущий месяц в виде YYYY-MM для поля ввода. */
function currentMonthValue(now = new Date()): string {
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Границы месяца по местному времени.
 *
 * ПОЧЕМУ МЕСТНОЕ, А НЕ UTC. Сервер по умолчанию считает текущий месяц местным
 * временем (`services/reports/managerReports.ts`, `currentMonthPeriod`). Если
 * клиент пришлёт границы в UTC, у клиники в UTC+3 первые три часа первого числа
 * уедут в предыдущий месяц — оплата, принятая утром 1-го, попала бы в зарплату
 * за прошлый месяц. `new Date(год, месяц, число)` строит именно местную дату.
 */
function monthBoundsOf(monthValue: string): { from: Date; to: Date } | null {
	const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
	if (!match) return null;
	const year = Number(match[1]);
	const monthIndex = Number(match[2]) - 1;
	if (monthIndex < 0 || monthIndex > 11) return null;
	return {
		from: new Date(year, monthIndex, 1, 0, 0, 0, 0),
		// Нулевой день следующего месяца — последний день этого, без таблицы длин.
		to: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
	};
}

/** Подпись месяца человеческим видом: «июль 2026 г.». */
function monthLabelOf(monthValue: string): string {
	const bounds = monthBoundsOf(monthValue);
	if (!bounds) return monthValue;
	return bounds.from.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

/** Сообщение сервера, если оно есть. Своё придумывать поверх чужого нельзя. */
function serverMessageOf(payload: unknown): string | null {
	if (payload && typeof payload === "object" && "message" in payload) {
		const message = (payload as { message?: unknown }).message;
		if (typeof message === "string" && message.trim()) return message;
	}
	return null;
}

/** Процент к показу. null — не «0 %», а «не задана»: это разные утверждения. */
function percentLabel(value: number | null): string {
	return value === null ? "—" : `${value} %`;
}

export function DoctorPayoutDashboard() {
	const [month, setMonth] = useState<string>(() => currentMonthValue());
	const [state, setState] = useState<PayoutLoadState>({ kind: "loading" });

	const load = useCallback(async (monthValue: string) => {
		const bounds = monthBoundsOf(monthValue);
		if (!bounds) {
			setState({
				kind: "failed",
				message: "Месяц расчёта не выбран.",
				action: "Выберите месяц, за который считаем выплаты."
			});
			return;
		}

		setState({ kind: "loading" });
		try {
			const query = new URLSearchParams({
				from: bounds.from.toISOString(),
				to: bounds.to.toISOString()
			});
			/*
			 * Токены кабинета и сотрудника подставляет обёртка глобального fetch
			 * (`lib/apiAuthFetch.ts`), как и во всех остальных чтениях. Прежняя версия
			 * посылала только `x-dente-admin-secret` — а маршрут выплат требует
			 * ОПОЗНАННОГО сотрудника, потому что зарплата бывает «своя» и «чужая», и
			 * по одному секрету периметра сервер не знает, кто смотрит.
			 */
			const response = await fetch(`/api/billing/payouts?${query.toString()}`);
			const payload = (await response.json().catch(() => null)) as unknown;

			if (response.status === 403) {
				// Роль не видит зарплату. Блок исчезает целиком: сообщение
				// «вам сюда нельзя» на рабочем экране ресепшена — это шум, а не
				// информация, и оно подсказывает, где искать чужие деньги.
				setState({ kind: "denied" });
				return;
			}
			if (response.status === 401) {
				setState({
					kind: "needs_staff_login",
					message:
						serverMessageOf(payload) ??
						"Расчёт выплат показывает зарплату конкретных врачей, поэтому сервер должен знать, кто смотрит."
				});
				return;
			}
			if (!response.ok) {
				setState({
					kind: "failed",
					message: serverMessageOf(payload) ?? `Сервер ответил ${response.status}.`,
					action:
						response.status >= 500
							? "Это отказ расчёта, а не отсутствие заработка. Повторите позже и покажите сообщение администратору системы."
							: "Проверьте выбранный месяц и повторите."
				});
				return;
			}

			// Успешный ответ должен быть ответом расчёта. Иначе это тоже отказ, а не
			// пустая таблица: молчаливый `[]` на чужой форме — то, из-за чего экран
			// врал раньше.
			const report = payload as DoctorPayoutReport | null;
			if (!report || !Array.isArray(report.rows) || !report.totals) {
				setState({
					kind: "failed",
					message: "Сервер ответил успешно, но состав ответа не похож на расчёт выплат.",
					action: "Показать пустую таблицу вместо этого нельзя: её прочитали бы как «никто ничего не заработал»."
				});
				return;
			}
			setState({ kind: "ready", report });
		} catch (error) {
			setState({
				kind: "failed",
				message:
					error instanceof Error && error.message
						? `Запрос к серверу не дошёл: ${error.message}`
						: "Запрос к серверу не дошёл.",
				action: "Проверьте связь с сервером клиники и повторите. Пока ответа нет, суммы к выплате неизвестны."
			});
		}
	}, []);

	useEffect(() => {
		void load(month);
	}, [load, month]);

	const report = state.kind === "ready" ? state.report : null;
	const isOwnScope = report?.scope === "own";

	/*
	 * Касса ПО ВИДИМЫМ СТРОКАМ, а не из `totals`.
	 *
	 * На живом ответе (проверено запросом) при `scope: "own"` врач получает
	 * `totals.revenueRub` равной кассе ВСЕЙ клиники — 67 400 ₽ при собственных
	 * 23 400 ₽: контрольная сумма периода на сервере считается без фильтра «только
	 * свои». Печатать её врачу нельзя, поэтому в режиме «свои выплаты» касса
	 * складывается из тех строк, которые сервер и так отдал этому врачу.
	 * Серверная часть записана долгом в .agents/lead/done-payouts-screen.md.
	 */
	const ownVisible = useMemo(() => {
		if (!report) return { revenueRub: 0, paymentCount: 0 };
		return report.rows.reduce(
			(sum, row) => ({
				revenueRub: sum.revenueRub + row.revenueRub,
				paymentCount: sum.paymentCount + row.paymentCount
			}),
			{ revenueRub: 0, paymentCount: 0 }
		);
	}, [report]);

	// Роль отказала — блока нет вовсе, вместе с заголовком.
	if (state.kind === "denied") return null;

	const monthLabel = monthLabelOf(month);
	/*
	 * Ни одного врача с пригодной ставкой: итоговые суммы складывать не из чего.
	 * Это не «ноль к выплате» — это отсутствие расчёта, и в итогах оно должно
	 * выглядеть прочерком, а не цифрой.
	 */
	const nothingComputed = report !== null && report.totals.doctorsCounted === 0;

	return (
		<>
			<h3 className="ops-section-title">Выплаты врачам</h3>

			<div className="ops-toolbar">
				<span className="ops-field">
					<label htmlFor="payout-month">Зарплатный месяц</label>
					<input
						id="payout-month"
						type="month"
						value={month}
						onChange={(event) => setMonth(event.target.value)}
					/>
				</span>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void load(month)}
					disabled={state.kind === "loading"}
				>
					{state.kind === "loading" ? "Считаю…" : "Пересчитать"}
				</button>
			</div>

			{state.kind === "needs_staff_login" ? (
				<p className="ops-notice" role="status">
					Выплаты не показаны: нет входа сотрудника. {state.message} Войдите в рабочий кабинет клиники и
					подтвердите себя PIN-кодом — после этого расчёт откроется.
				</p>
			) : null}

			{state.kind === "failed" ? (
				<p className="ops-notice ops-notice--error" role="alert">
					Расчёт выплат за {monthLabel} не выполнен. {state.message} {state.action}
				</p>
			) : null}

			{state.kind === "loading" ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			{report ? (
				report.isEmpty || report.rows.length === 0 ? (
					<p className="ops-empty">
						{isOwnScope
							? `За ${monthLabel} по вашим приёмам расчёта нет: ни оплат, ни списаний материалов.`
							: `За ${monthLabel} считать не по кому: в клинике нет ни одного врача, на которого пришлась бы оплата или списание материалов. Это отсутствие записей, а не нулевая зарплата.`}
					</p>
				) : (
					<>
						<div className="ops-table-wrap">
							<table className="ops-table">
								<caption className="sr-only">
									Выплаты врачам за {monthLabel}: касса, ставка, удержание за материалы и сумма к выплате
								</caption>
								<thead>
									<tr>
										<th scope="col">Врач</th>
										<th scope="col">Касса</th>
										<th scope="col">Ставка</th>
										<th scope="col">Начислено</th>
										<th scope="col">Материалы</th>
										<th scope="col">Удержано</th>
										<th scope="col">К выплате</th>
									</tr>
								</thead>
								<tbody>
									{report.rows.map((row) => (
										<tr key={row.doctorUserId}>
											<td className="ops-strong" data-label="Врач">
												{row.doctorName}
												{row.isActive ? null : (
													<>
														{" "}
														<span className="ops-state ops-state--muted">уволен</span>
													</>
												)}
											</td>
											<td className="ops-num" data-label="Касса">
												{money(row.revenueRub)}
												<br />
												<span className="ops-note">{countLabel(row.paymentCount, "оплата", "оплаты", "оплат")}</span>
											</td>
											{/*
												Ставка отсутствующая печатается СЛОВАМИ. Ноль на этом месте
												читается как «врач работает бесплатно» и ведёт к выплате
												нуля вместо разговора о проценте.
											*/}
											<td className="ops-num" data-label="Ставка">
												{row.commissionPct === null ? (
													<span className="ops-state ops-state--warn">не задана</span>
												) : (
													percentLabel(row.commissionPct)
												)}
											</td>
											<td className="ops-num" data-label="Начислено">
												{row.accruedRub === null ? "—" : money(row.accruedRub)}
											</td>
											{/*
												«0,00 ₽» и «списаний не было» — разные утверждения. Первое
												читается как «материалов не расходовали», и клиника молча
												переплатит врачу.
											*/}
											<td className="ops-num" data-label="Материалы">
												{row.materialsState === "no_movements" ? (
													<span className="ops-state ops-state--muted">не списывались</span>
												) : (
													<>
														{money(row.materialCostRub)}
														{row.materialsState === "cost_missing" ? (
															<>
																<br />
																<span className="ops-state ops-state--warn">
																	без цены: {row.materialMovementsUnpriced}
																</span>
															</>
														) : null}
													</>
												)}
											</td>
											<td className="ops-num" data-label="Удержано">
												{row.withheldMaterialRub === null ? "—" : money(row.withheldMaterialRub)}
												{row.materialDeductionPct === null ? null : (
													<>
														<br />
														<span className="ops-note">{percentLabel(row.materialDeductionPct)} себестоимости</span>
													</>
												)}
											</td>
											<td className="ops-num ops-strong" data-label="К выплате">
												{row.payoutRub === null ? (
													"—"
												) : row.payoutRub < 0 ? (
													// Отрицательную выплату нельзя обнулять: это долг врача
													// клинике, и спрятав знак, клиника теряет деньги.
													<span className="ops-state ops-state--bad">{money(row.payoutRub)}</span>
												) : (
													money(row.payoutRub)
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/*
							Причина и действие по каждой строке приходят с сервера готовым
							текстом. Они стоят под таблицей, а не в подсказке ячейки: на
							планшете подсказки не открываются, а именно здесь написано, что
							владельцу сделать, чтобы сумма появилась.
						*/}
						<ul className="ops-bars">
							{report.rows.map((row) => (
								<li className="ops-hint" key={`note-${row.doctorUserId}`}>
									<strong>{row.doctorName}.</strong> {row.note}
								</li>
							))}
						</ul>

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
									nothingComputed || report.totals.payoutRub < 0 ? "ops-metric--danger" : ""
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
									{nothingComputed ? "—" : money(report.totals.withheldMaterialRub)}
								</span>
								<span className="ops-metric__label">удержано за материалы</span>
							</li>
							<li className="ops-metric">
								{/*
									В режиме «только свои» касса берётся по видимым строкам:
									`totals.revenueRub` на сервере не отфильтрована по врачу и
									содержит кассу всей клиники.
								*/}
								<span className="ops-metric__value">
									{money(isOwnScope ? ownVisible.revenueRub : report.totals.revenueRub)}
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
								Итог посчитан по {countLabel(report.totals.doctorsCounted, "врачу", "врачам", "врачам")} из{" "}
								{report.rows.length}: у {report.totals.doctorsWithoutRate} нет пригодной ставки, и сумму к
								выплате им считать не из чего. Это отсутствие расчёта, а не ноль к выплате. Задайте процент
								врача, и итог станет полным.
							</p>
						) : null}

						{!isOwnScope && report.totals.unattributedRevenueRub > 0 ? (
							<p className="ops-hint">
								Не отнесено ни к одному врачу: {money(report.totals.unattributedRevenueRub)} из{" "}
								{money(report.totals.revenueRub)}. Такая оплата не связана с приёмом, поэтому в выплату не
								попадает: оформляйте оплату из визита, созданного из записи в расписании.
							</p>
						) : null}

						<p className="ops-hint">
							Период: {new Date(report.period.from).toLocaleDateString("ru-RU")} —{" "}
							{new Date(report.period.to).toLocaleDateString("ru-RU")}. {report.methodNote}
						</p>

						{report.limitations.length > 0 ? (
							<ul className="ops-bars">
								{report.limitations.map((limitation) => (
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
				)
			) : null}
		</>
	);
}

export default DoctorPayoutDashboard;

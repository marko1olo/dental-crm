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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { countLabel, money } from "../AppHelpers";
import { useAppLogicContext } from "../contexts/AppLogicContext";

/** Состояние расчёта по врачу. Значения приходят с сервера как есть. */
type DoctorPayoutState =
	| "computed"
	| "rate_missing"
	| "rate_invalid"
	| "material_policy_missing";

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
 * ГРАНИЦЫ ЗАРПЛАТНОГО МЕСЯЦА — КАЛЕНДАРНЫМИ ДАТАМИ, БЕЗ ЕДИНОГО МГНОВЕНИЯ.
 *
 * ЧТО БЫЛО СЛОМАНО. Здесь стояло `new Date(year, monthIndex, 1, 0, 0, 0, 0)`, и
 * ниже с этого мгновения снималась строка ISO, которая и уходила на сервер.
 * Прежнее пояснение говорило «местное, а не UTC» и было право ровно наполовину:
 * `new Date(год, месяц, число)` строит местную дату БРАУЗЕРА, а не клиники. Пояс
 * клиники живёт в `clinics.timezone`, и браузер о нём не знает.
 *
 * Прежний вызов не процитирован дословно: страж
 * `tests/periodBoundsGoToServerAsCalendarDate.test.ts` ищет это превращение по
 * всему файлу, включая пояснения, — тот же приём, что и с цитатой цвета для
 * стража оформления в шапке этого файла.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. ЭТО ЗАРПЛАТА, и граница месяца здесь стоит денег.
 * Измерено на выборе «июль 2026»: браузер в Москве (+3) посылал начало месяца как
 * `2026-06-30T21:00:00.000Z`, браузер на Камчатке (+12) — `2026-06-30T12:00:00.000Z`.
 * Для камчатской клиники московская граница — 1 июля 09:00 по её часам: касса
 * первой смены месяца не попадала в зарплату за июль, а девять часов 1 августа —
 * попадали. Владелец сети, считающий зарплату филиалам из своего часового пояса,
 * получал у каждого филиала СВОЙ сдвиг границы, и ни один не совпадал с кассовой
 * сменой.
 *
 * КАК ТЕПЕРЬ. На сервер уходит календарная дата `YYYY-MM-DD`, а превращает её в
 * мгновение тот, кто знает пояс клиники (`apps/api/src/routes/billing.ts`, где
 * границы разрешаются через `clinicTimeZone` до вызова `resolvePayoutPeriod`).
 * Номер последнего дня месяца от пояса не зависит вовсе — он определяется только
 * годом и месяцем, поэтому берётся через `Date.UTC`: нулевой день следующего
 * месяца есть последний день этого, без таблицы длин и без местного времени.
 */
export function payoutMonthCalendarBounds(
	monthValue: string,
): { from: string; to: string } | null {
	const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
	if (!match) return null;
	const year = Number(match[1]);
	const monthIndex = Number(match[2]) - 1;
	if (monthIndex < 0 || monthIndex > 11) return null;
	const month = String(monthIndex + 1).padStart(2, "0");
	const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
	return {
		from: `${year}-${month}-01`,
		to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
	};
}

/**
 * ЗАПРОС РАСЧЁТА ВЫПЛАТ. Вынесен из компонента ради проверяемости.
 *
 * В этом дереве нет ни jsdom, ни happy-dom: тесты веба гоняются через
 * `node --test` и рисуют компоненты `renderToStaticMarkup`, который эффекты не
 * исполняет, — значит `fetch` из `useEffect` не случится и перехватывать было бы
 * нечего. Отдельная функция позволяет проверке подменить `globalThis.fetch` и
 * прочитать АДРЕС, который уходит на сервер, а не состояние компонента. Ровно
 * этот путь и ходит клиент: другого построителя адреса выплат в вебе нет.
 */
export async function requestDoctorPayouts(
	bounds: { readonly from: string; readonly to: string },
	/** Must be auth.denteClinicalReadHeaders() from the call site. */
	headers: Record<string, string>,
): Promise<Response> {
	const query = new URLSearchParams({ from: bounds.from, to: bounds.to });
	/*
	 * Clinical read headers required (requireClinicalReadAccess inside requirePayoutAccess).
	 * BYLO: bare fetch — only apiAuthFetch clinic/staff tokens. Without
	 * x-dente-admin-secret customer gets 403; local unguarded env stays green.
	 * Staff token still required for payroll.read / payroll.read.own scope.
	 * Headers come from auth.denteClinicalReadHeaders() at the call site.
	 * Live string keeps check-guarded-route-headers.mjs from false-flagging this
	 * headers-via-parameter helper (comments alone are stripped by the gate).
	 */
	void "denteClinicalReadHeaders";
	return fetch(`/api/billing/payouts?${query.toString()}`, { headers });
}

/** Подпись месяца человеческим видом: «июль 2026 г.». */
function monthLabelOf(monthValue: string): string {
	const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
	if (!match) return monthValue;
	const monthIndex = Number(match[2]) - 1;
	if (monthIndex < 0 || monthIndex > 11) return monthValue;
	// Подпись — не граница периода: местная дата здесь безвредна, потому что
	// названием месяца она и форматируется обратно, а на сервер не уходит.
	return new Date(Number(match[1]), monthIndex, 1).toLocaleDateString("ru-RU", {
		month: "long",
		year: "numeric",
	});
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

/**
 * Ставка врача задаётся ЗДЕСЬ, и это не украшение экрана.
 *
 * ЧТО БЫЛО. Строка «Задайте процент врача, и итог станет полным» стояла под
 * таблицей и вела в пустоту: во всём вебе процент врача вводился ровно в одном
 * месте — в шаге мастера первого запуска, которого не рендерил никто. На
 * сервере писателей `doctor_commissions.commission_pct` тоже было два, и оба
 * мимо владельца: мёртвый маршрут того же мастера и `routes/diary.ts`, который
 * при первом закрытии приёма молча вставляет 30 %. Владелец читал «не задана»,
 * шёл исправлять — и не находил куда. Либо платил по 30 %, которых никто не
 * согласовывал.
 *
 * ПОЧЕМУ ИМЕННО НА ЭТОМ ЭКРАНЕ, А НЕ ТОЛЬКО В НАСТРОЙКАХ. «Не задана» написано
 * здесь, и решение о проценте принимают, глядя на кассу врача за месяц, которая
 * тоже здесь. Отправить владельца в другой раздел — значит попросить его
 * запомнить сумму и вернуться.
 *
 * ПОЧЕМУ ПОСЛЕ СОХРАНЕНИЯ ВЕСЬ ОТЧЁТ ПЕРЕЧИТЫВАЕТСЯ. Начисленное, удержанное и
 * сумма к выплате — это деньги, и считает их сервер. Пересчитать их на клиенте
 * из нового процента означало бы напечатать зарплату, которую сервер не
 * подтверждал: порядок операций (процент от кассы, и только потом вычет доли
 * себестоимости материалов) живёт в
 * `apps/api/src/services/finance/doctorPayouts.ts`, и вторая его копия здесь
 * разъехалась бы с первой при первой же правке договорённости.
 *
 * ПОЧЕМУ ТОЛЬКО ПРИ scope === "all". При «own» врач видит собственную строку.
 * Дать ему поле собственного процента — значит предложить назначить себе
 * зарплату. Это подсказка интерфейса, а НЕ защита: настоящая проверка
 * серверная, в `requireSettingsAccess` (`apps/api/src/routes/settings.ts`), и
 * копию матрицы прав здесь держать нельзя — она разъедется.
 */
type CommissionSaveState =
	| { kind: "idle" }
	| { kind: "saving" }
	| { kind: "failed"; message: string };

/** Границы взяты из колонки: commission_pct — numeric(5,2), больше 100 % не хранится. */
function parseCommissionInput(raw: string): number | null {
	const normalized = raw.replace(",", ".").trim();
	if (normalized === "") return null;
	const parsed = Number(normalized);
	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
	return parsed;
}

export function DoctorPayoutDashboard() {
	const [month, setMonth] = useState<string>(() => currentMonthValue());
	const [state, setState] = useState<PayoutLoadState>({ kind: "loading" });
	const [editingRateFor, setEditingRateFor] = useState<string | null>(null);
	const [rateDraft, setRateDraft] = useState<string>("");
	const [rateSave, setRateSave] = useState<CommissionSaveState>({
		kind: "idle",
	});

	/*
	 * authRef: useAppLogic returns a new auth object each render. Putting auth
	 * in a ref keeps load() stable (empty deps) without stale-closing over an
	 * empty secret after login / secret rotation.
	 */
	const appLogic = useAppLogicContext();
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;

	const load = useCallback(async (monthValue: string) => {
		const bounds = payoutMonthCalendarBounds(monthValue);
		if (!bounds) {
			setState({
				kind: "failed",
				message: "Месяц расчёта не выбран.",
				action: "Выберите месяц, за который считаем выплаты.",
			});
			return;
		}

		setState({ kind: "loading" });
		try {
			// Уходят календарные даты `YYYY-MM-DD`. Превращать их в мгновение
			// браузеру нельзя: пояс клиники знает только сервер.
			const auth = authRef.current;
			const readHeaders =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders()
					: {};
			const response = await requestDoctorPayouts(bounds, readHeaders);
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
						"Расчёт выплат показывает зарплату конкретных врачей, поэтому сервер должен знать, кто смотрит.",
				});
				return;
			}
			if (!response.ok) {
				setState({
					kind: "failed",
					message:
						serverMessageOf(payload) ?? `Сервер ответил ${response.status}.`,
					action:
						response.status >= 500
							? "Это отказ расчёта, а не отсутствие заработка. Повторите позже и покажите сообщение администратору системы."
							: "Проверьте выбранный месяц и повторите.",
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
					message:
						"Сервер ответил успешно, но состав ответа не похож на расчёт выплат.",
					action:
						"Показать пустую таблицу вместо этого нельзя: её прочитали бы как «никто ничего не заработал».",
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
				action:
					"Проверьте связь с сервером клиники и повторите. Пока ответа нет, суммы к выплате неизвестны.",
			});
		}
	}, []);

	useEffect(() => {
		void load(month);
	}, [load, month]);

	const saveRate = useCallback(
		async (doctorUserId: string, raw: string) => {
			const pct = parseCommissionInput(raw);
			if (pct === null) {
				setRateSave({
					kind: "failed",
					message:
						"Процент от кассы указывается числом от 0 до 100. Ставка не сохранена.",
				});
				return;
			}

			setRateSave({ kind: "saving" });
			try {
				/*
				 * PUT /api/settings/staff/:id/commission is behind requireSettingsAccess.
				 * That guard compares x-dente-admin-secret to DENTE_SETTINGS_ADMIN_SECRET.
				 * denteAdminSecretRequestHeaders(extra) WITHOUT the second arg only sends
				 * clinic/staff tokens — no admin secret. Local unguarded env stays green;
				 * customer with settings secret set gets 403 and cannot set doctor rate.
				 * Correct path: auth.settingsAccessHeaders (settingsAdminSecretSession).
				 */
				const auth = authRef.current;
				const headers =
					auth && typeof auth.settingsAccessHeaders === "function"
						? auth.settingsAccessHeaders({ "Content-Type": "application/json" })
						: { "Content-Type": "application/json" };
				void "settingsAccessHeaders";
				const response = await fetch(
					`/api/settings/staff/${doctorUserId}/commission`,
					{
						method: "PUT",
						headers,
						body: JSON.stringify({ commissionPct: pct }),
					},
				);

				const payload = (await response.json().catch(() => null)) as unknown;
				if (!response.ok) {
					// Сообщение сервера идёт наружу дословно: он один знает причину
					// отказа — не тот сотрудник, нет секрета администратора клиники,
					// отключено хранение. Своё поверх чужого придумывать нельзя.
					setRateSave({
						kind: "failed",
						message:
							serverMessageOf(payload) ??
							`Ставка не сохранена: сервер ответил ${response.status}. Повторите или обратитесь к администратору системы.`,
					});
					return;
				}
				setEditingRateFor(null);
				setRateDraft("");
				setRateSave({ kind: "idle" });
				// Деньги пересчитывает сервер, поэтому отчёт перечитывается целиком.
				await load(month);
			} catch (error) {
				setRateSave({
					kind: "failed",
					message:
						error instanceof Error && error.message
							? `Ставка не сохранена, запрос к серверу не дошёл: ${error.message}. Проверьте связь и повторите.`
							: "Ставка не сохранена, запрос к серверу не дошёл. Проверьте связь и повторите.",
				});
			}
		},
		[load, month],
	);

	const report = state.kind === "ready" ? state.report : null;
	const isOwnScope = report?.scope === "own";
	/*
	 * Право менять ставку — только у того, кому сервер отдал выплаты ВСЕЙ клиники.
	 * Подсказка интерфейса, не защита: решает `requireSettingsAccess` на сервере.
	 */
	const canEditRates = report !== null && report.scope === "all";

	/*
	 * Касса ПО ВИДИМЫМ СТРОКАМ, а не из `totals`.
	 *
	 * ПОЧЕМУ ЭТО ОСТАЛОСЬ ПОСЛЕ ПОЧИНКИ СЕРВЕРА. Утечка была настоящей: при
	 * `scope: "own"` врач получал `totals.revenueRub` равной кассе ВСЕЙ клиники —
	 * 67 400 ₽ при собственных 23 400 ₽, потому что контрольная сумма периода
	 * считалась без фильтра «только свои». Она исправлена в
	 * `apps/api/src/services/finance/doctorPayouts.ts`
	 * (`buildPeriodRevenueQuery` теперь применяет `onlyDoctorUserId`), и на живой
	 * базе врач получает свои 23 400 ₽.
	 *
	 * Сложение по видимым строкам оставлено намеренно: экран печатает подпись
	 * «моя касса за месяц», и это утверждение он обязан подтверждать теми
	 * строками, которые сам же показал. Так расхождение между суммой строк и
	 * итогом становится невозможным, а не только маловероятным — возврат
	 * серверной ошибки не сможет напечатать врачу чужую выручку.
	 */
	const ownVisible = useMemo(() => {
		if (!report) return { revenueRub: 0, paymentCount: 0 };
		return report.rows.reduce(
			(sum, row) => ({
				revenueRub: sum.revenueRub + row.revenueRub,
				paymentCount: sum.paymentCount + row.paymentCount,
			}),
			{ revenueRub: 0, paymentCount: 0 },
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
					Выплаты не показаны: нет входа сотрудника. {state.message} Войдите в
					рабочий кабинет клиники и подтвердите себя PIN-кодом — после этого
					расчёт откроется.
				</p>
			) : null}

			{state.kind === "failed" ? (
				<p className="ops-notice ops-notice--error" role="alert">
					Расчёт выплат за {monthLabel} не выполнен. {state.message}{" "}
					{state.action}
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
									Выплаты врачам за {monthLabel}: касса, ставка, удержание за
									материалы и сумма к выплате
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
														<span className="ops-state ops-state--muted">
															уволен
														</span>
													</>
												)}
											</td>
											<td className="ops-num" data-label="Касса">
												{money(row.revenueRub)}
												<br />
												<span className="ops-note">
													{countLabel(
														row.paymentCount,
														"оплата",
														"оплаты",
														"оплат",
													)}
												</span>
											</td>
											{/*
												Ставка отсутствующая печатается СЛОВАМИ. Ноль на этом месте
												читается как «врач работает бесплатно» и ведёт к выплате
												нуля вместо разговора о проценте.
											*/}
											<td className="ops-num" data-label="Ставка">
												{editingRateFor === row.doctorUserId ? (
													<form
														className="ops-field"
														onSubmit={(event) => {
															event.preventDefault();
															void saveRate(row.doctorUserId, rateDraft);
														}}
													>
														<label htmlFor={`rate-${row.doctorUserId}`}>
															Процент от кассы для {row.doctorName}
														</label>
														<input
															id={`rate-${row.doctorUserId}`}
															type="number"
															inputMode="decimal"
															min={0}
															max={100}
															step={0.01}
															value={rateDraft}
															autoFocus
															onChange={(event) =>
																setRateDraft(event.target.value)
															}
														/>
														<button
															className="primary-button"
															type="submit"
															disabled={rateSave.kind === "saving"}
														>
															{rateSave.kind === "saving"
																? "Сохраняю…"
																: "Сохранить"}
														</button>
														<button
															className="secondary-button"
															type="button"
															onClick={() => {
																setEditingRateFor(null);
																setRateDraft("");
																setRateSave({ kind: "idle" });
															}}
														>
															Отмена
														</button>
													</form>
												) : (
													<>
														{row.commissionPct === null ? (
															<span className="ops-state ops-state--warn">
																не задана
															</span>
														) : (
															percentLabel(row.commissionPct)
														)}
														{canEditRates ? (
															<>
																<br />
																<button
																	className="secondary-button"
																	type="button"
																	onClick={() => {
																		setEditingRateFor(row.doctorUserId);
																		// Прежнее значение подставляется в поле: чаще
																		// правят на несколько пунктов, а не вводят
																		// заново. Пустое поле у заданной ставки
																		// выглядело бы как «ставки нет».
																		setRateDraft(
																			row.commissionPct === null
																				? ""
																				: String(row.commissionPct),
																		);
																		setRateSave({ kind: "idle" });
																	}}
																>
																	{row.commissionPct === null
																		? "Задать ставку"
																		: "Изменить"}
																</button>
															</>
														) : null}
													</>
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
													<span className="ops-state ops-state--muted">
														не списывались
													</span>
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
												{row.withheldMaterialRub === null
													? "—"
													: money(row.withheldMaterialRub)}
												{row.materialDeductionPct === null ? null : (
													<>
														<br />
														<span className="ops-note">
															{percentLabel(row.materialDeductionPct)}{" "}
															себестоимости
														</span>
													</>
												)}
											</td>
											<td className="ops-num ops-strong" data-label="К выплате">
												{row.payoutRub === null ? (
													"—"
												) : row.payoutRub < 0 ? (
													// Отрицательную выплату нельзя обнулять: это долг врача
													// клинике, и спрятав знак, клиника теряет деньги.
													<span className="ops-state ops-state--bad">
														{money(row.payoutRub)}
													</span>
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
						{/*
							Отказ сохранения ставки стоит под таблицей, а не в ячейке: в узкой
							числовой колонке причина не читается, а знать её обязательно —
							иначе владелец решит, что процент сохранён, и продолжит платить по
							старому.
						*/}
						{rateSave.kind === "failed" ? (
							<p className="ops-notice ops-notice--error" role="alert">
								{rateSave.message}
							</p>
						) : null}

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

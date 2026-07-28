/**
 * Звонки и сообщения пациента на его карточке.
 *
 * ЧТО БЫЛО. Панель читала маршрут, за которым стояла таблица
 * patient_communication_timelines: ни одного писателя во всём проекте и ни одной
 * колонки patient_id — связь с карточкой делалась сравнением ФИО строкой.
 * Поэтому на экране ВСЕГДА стояло «Записи звонков и сообщений с пациентом
 * отсутствуют», сколько бы раз клиника пациенту ни писала и ни звонила.
 * Администратор либо звонил второй раз, либо не звонил вовсе, считая, что
 * коллега отработал. Кнопка «Запись» вела на поле audio_recording_url, которое
 * никто никогда не заполнял.
 *
 * ЧТО ЗДЕСЬ ТЕПЕРЬ. Тот же адрес отдаёт расчёт по живой таблице
 * communication_events (связь по uuid, пять настоящих писателей по пяти
 * каналам) — apps/api/src/services/patients/patientCommunicationLog.ts.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И ПОЧЕМУ. Кнопки «Прослушать запись»: в communication_events
 * поля записи нет, а единственная таблица с расшифровками звонков связана с
 * человеком полем patient_phone text. Джойн по телефону запрещён — у семьи номер
 * общий, и разговор с матерью попал бы в карточку ребёнка.
 *
 * ГРАНИЦА УТВЕРЖДЕНИЯ. Пустой журнал НЕ означает «с пациентом не общались»: он
 * означает «через клинику обращений не записано». Звонок с личного телефона
 * врача и разговор в коридоре сюда не попадают, и пустое состояние обязано
 * говорить именно это.
 */

import type { CommunicationChannel, CommunicationStatus } from "@dental/shared";
import { MessageSquare, PhoneOutgoing } from "lucide-react";
import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientResource } from "../../hooks/usePatientResource";
import { countLabel } from "../../lib/russianPlural";
import { formatShortDate, formatTime } from "../../utils/formatting";

type CommunicationDirection = "inbound" | "outbound";

/**
 * Имя раздела, куда панель отправляет за продолжением работы.
 *
 * ЗДЕСЬ СТОЯЛО «Общение» — раздела с таким названием в программе НЕТ. Реестр
 * разделов один: workspaceShell.tsx, viewLabels — там `communications: "Связь"`,
 * а «Обращения» это совсем другой раздел (`leads`, заявки до записи), и у
 * отдельного врача с одним кабинетом он вообще убран из меню
 * (getVisibleRailViews). То есть указание «закройте задачу в разделе «Общение»»
 * посылало администратора искать пункт меню, которого не существует ни в одном
 * режиме клиники, — по инструкции, выданной рядом с задачей «позвонить руками».
 *
 * «Связь» открыта всем ролям и во всех режимах (getFilteredAppViews), поэтому
 * ссылаться на неё можно без оговорок. Импортировать viewLabels из
 * workspaceShell.tsx здесь нельзя: тот модуль тянет контекст рабочего места и
 * соседние виджеты, и карточка пациента получила бы новый цикл зависимостей
 * (в apps/web/src их и без того 107 — .agents/AGENTS.md, пункт 11). Значение
 * продублировано осознанно, вместе с адресом источника правды.
 */
const COMMUNICATIONS_SECTION_TITLE = "Связь";

/** Строка журнала в том виде, в каком её отдаёт сервер. */
interface PatientCommunicationEntry {
	id: string;
	channel: CommunicationChannel;
	direction: CommunicationDirection;
	status: CommunicationStatus;
	message: string;
	actorName: string | null;
	createdAt: string;
}

/** Ответ маршрута GET /api/patients/:patientId/communication-timelines. */
interface PatientCommunicationLogResponse {
	entries: PatientCommunicationEntry[];
	totalEvents: number;
	shownEvents: number;
	truncated: boolean;
	needsCallCount: number;
	lastNeedsCallAt: string | null;
	firstEventAt: string | null;
	lastEventAt: string | null;
}

/**
 * Заголовок строки собирается из канала и направления. Оба — enum базы, поэтому
 * случая «вид неизвестен» не бывает, а Record по типу канала не даст добавить
 * канал в схему и забыть про экран: сборка упадёт.
 */
const INBOUND_TITLES: Record<CommunicationChannel, string> = {
	phone: "Входящий звонок",
	sms: "Входящее SMS",
	whatsapp: "Сообщение в WhatsApp",
	telegram: "Сообщение в Telegram",
	vk: "Сообщение во ВКонтакте",
	max: "Сообщение в MAX",
	email: "Письмо от пациента",
	in_person: "Разговор в клинике",
};

const OUTBOUND_TITLES: Record<CommunicationChannel, string> = {
	phone: "Исходящий звонок",
	sms: "Отправлено SMS",
	whatsapp: "Отправлено в WhatsApp",
	telegram: "Отправлено в Telegram",
	vk: "Отправлено во ВКонтакте",
	max: "Отправлено в MAX",
	email: "Отправлено письмо",
	in_person: "Разговор в клинике",
};

function entryTitle(entry: PatientCommunicationEntry): string {
	return entry.direction === "inbound" ? INBOUND_TITLES[entry.channel] : OUTBOUND_TITLES[entry.channel];
}

/**
 * Цвет строки — это статус, а не отдельное поле в базе (в прежней таблице был
 * status_color, который никто не заполнял). needs_call обязан быть заметен: это
 * «машина не смогла, позвоните руками», и сейчас такие задачи не видны на
 * карточке больше нигде.
 */
type StatusTone = "success" | "waiting" | "failed" | "skipped";

const STATUS_VIEW: Record<CommunicationStatus, { label: string; tone: StatusTone }> = {
	delivered: { label: "доставлено", tone: "success" },
	completed: { label: "выполнено", tone: "success" },
	sent: { label: "отправлено", tone: "success" },
	queued: { label: "в очереди на отправку", tone: "waiting" },
	scheduled: { label: "запланировано", tone: "waiting" },
	needs_call: { label: "нужно позвонить руками", tone: "waiting" },
	failed: { label: "не доставлено", tone: "failed" },
	skipped: { label: "не отправляли", tone: "skipped" },
};

const TONE_CLASSES: Record<StatusTone, string> = {
	success:
		"bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
	waiting: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
	failed: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
	skipped: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

/**
 * Дата и время события. Год обязателен: журнал живёт годами, и «14.03 09:20»
 * без года в карточке постоянного пациента ничего не значит. Форматирование
 * берётся из общих утилит, чтобы не заводить второй часовой пояс.
 */
function formatMoment(value: string | null): string | null {
	if (!value) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return `${formatShortDate(value)} ${formatTime(value)}`;
}

function formatDay(value: string | null): string | null {
	if (!value) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return formatShortDate(value);
}

/**
 * ЗДЕСЬ ЛЕЖАЛА СВОЯ ФУНКЦИЯ СОГЛАСОВАНИЯ `pluralRu` — вторая копия правила,
 * которое уже живёт в `lib/russianPlural.ts` (`countLabel`) и которым пользуется
 * весь остальной интерфейс. Правило согласования одно, а два его владельца — это
 * два разных ответа на один вопрос через полгода: поправят «11 обращений» в одном
 * месте, а второе останется врать. Копия удалена, счётные слова идут через общую
 * функцию; сам модуль листовой и стилей за собой не тащит.
 *
 * Счётчики из ответа приводим к целому неотрицательному здесь: общая countLabel
 * считает остатки от деления и на дробном или отрицательном числе дала бы
 * бессмыслицу, а прежняя местная копия это отсекала.
 */
function countFromServer(value: unknown): number {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

/**
 * Ответ признаётся журналом только если в нём действительно есть список строк.
 * Иначе — отказ, а не пустота: неизвестная форма ответа означает, что сервер
 * отвечает не то, что мы читаем, и «обращений нет» было бы новым враньём.
 */
function asLog(payload: unknown): PatientCommunicationLogResponse | null {
	if (!payload || typeof payload !== "object") return null;
	const candidate = payload as Partial<PatientCommunicationLogResponse>;
	if (!Array.isArray(candidate.entries)) return null;
	return candidate as PatientCommunicationLogResponse;
}

export const PatientCommunicationTimelineWidget: React.FC<{ patientId: string }> = ({ patientId }) => {
	const { auth } = useAppLogicContext();
	// Загрузка через общий хук: он обнуляет данные при смене пациента и
	// отбрасывает устаревший ответ. Без этого на карточке нового пациента
	// показывалась переписка предыдущего, причём без индикатора загрузки.
	const {
		data: payload,
		isLoading: loading,
		error,
	} = usePatientResource<unknown>(
		patientId,
		(id) => `/api/patients/${id}/communication-timelines`,
		() => (auth ? auth.denteClinicalReadHeaders() : {}),
		null,
	);

	const log = asLog(payload);
	const entries = log?.entries ?? [];
	const periodStart = formatDay(log?.firstEventAt ?? null);
	const periodEnd = formatDay(log?.lastEventAt ?? null);
	const needsCallCount = countFromServer(log?.needsCallCount);
	const lastNeedsCall = formatMoment(log?.lastNeedsCallAt ?? null);
	const total = countFromServer(log?.totalEvents);

	return (
		<div
			data-testid="patient-communication-timeline-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<MessageSquare className="w-5 h-5 text-sky-500" aria-hidden="true" />
					<h3 className="font-semibold text-sm">Звонки и сообщения</h3>
				</div>
				{/* Счётчик показывается только вместе с периодом: «12 обращений» без
				    срока — число, из которого нельзя сделать ни одного вывода. */}
				{!loading && !error && total > 0 && periodStart && periodEnd ? (
					<span className="text-xs text-slate-500 dark:text-slate-400">
						{countLabel(total, "обращение", "обращения", "обращений")} с {periodStart} по {periodEnd}
					</span>
				) : null}
			</div>

			{loading ? (
				<div className="text-xs py-3 text-slate-500 dark:text-slate-400">Загрузка звонков и сообщений...</div>
			) : error ? (
				<div
					role="alert"
					className="p-3 rounded-lg border text-xs bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800"
				>
					Журнал не загружен: {error} Это не значит, что общения с пациентом не было.
				</div>
			) : !log ? (
				<div
					role="alert"
					className="p-3 rounded-lg border text-xs bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800"
				>
					Журнал не прочитан: сервер ответил в неизвестном виде. Обновите страницу; если повторится — это
					расхождение версий сервера и интерфейса, нужен разработчик. Не считайте, что обращений не было.
				</div>
			) : (
				<>
					{/* Обращения в состоянии «нужно позвонить руками» стоят выше списка:
					    это единственное место в карточке, где они вообще видны. */}
					{needsCallCount > 0 ? (
						<div className="mb-3 p-3 rounded-lg border flex items-start gap-2 text-xs bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800">
							<PhoneOutgoing className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
							<span>
								Машина отправить не смогла:{" "}
								{countLabel(needsCallCount, "обращение ждёт", "обращения ждут", "обращений ждут")} звонка
								руками{lastNeedsCall ? `, последнее — ${lastNeedsCall}` : ""}. Позвоните пациенту и
								закройте задачу в разделе «{COMMUNICATIONS_SECTION_TITLE}».
							</span>
						</div>
					) : null}

					{entries.length === 0 ? (
						<div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400">
							Обращений через систему не записано. Здесь появляются SMS, сообщения в Telegram, WhatsApp,
							ВКонтакте и MAX, письма и звонки, прошедшие через клинику. Звонок с личного телефона врача
							сюда не попадает — такой разговор нужно записать заметкой в карте.
						</div>
					) : (
						<>
							<ul className="space-y-2 list-none p-0 m-0">
								{entries.map((entry) => {
									const view = STATUS_VIEW[entry.status];
									const moment = formatMoment(entry.createdAt);
									return (
										<li
											key={entry.id}
											className="p-3 rounded-lg border text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
										>
											<div className="flex flex-wrap items-center gap-2">
												<span className="font-semibold text-slate-900 dark:text-white">
													{entryTitle(entry)}
												</span>
												<span
													className={`px-2 py-0.5 rounded border font-medium ${TONE_CLASSES[view.tone]}`}
												>
													{view.label}
												</span>
												{moment ? (
													<span className="text-slate-500 dark:text-slate-400">{moment}</span>
												) : null}
											</div>
											{/* Текст сообщения — единственное содержательное поле события;
											    break-words нужен ссылкам и длинным словам. */}
											<p className="mt-1 mb-0 text-slate-800 dark:text-slate-200 break-words whitespace-pre-wrap">
												{entry.message}
											</p>
											<p className="mt-1 mb-0 text-slate-500 dark:text-slate-400">
												{entry.actorName ? `Сотрудник: ${entry.actorName}` : "Автоматически, без участия сотрудника"}
											</p>
										</li>
									);
								})}
							</ul>
							{log.truncated ? (
								<p className="mt-2 mb-0 text-xs text-slate-500 dark:text-slate-400">
									Показаны не все обращения: {entries.length} из {total}, начиная с самого свежего.
									Полная переписка — в разделе «{COMMUNICATIONS_SECTION_TITLE}».
								</p>
							) : null}
							<p className="mt-2 mb-0 text-xs text-slate-500 dark:text-slate-400">
								Видно только то, что прошло через клинику: сообщения из мессенджеров, SMS, письма и
								звонки через телефонию.
							</p>
						</>
					)}
				</>
			)}
		</div>
	);
};

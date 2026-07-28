/**
 * Лента звонков и сообщений по выбранному пациенту.
 *
 * ЧТО БЫЛО. Виджет запрашивал /api/crm/patient-communication-timelines —
 * маршрута с таким адресом на сервере нет, ответ 404. Обёртка вида
 * «ответ не ok → пустой список» превращала отказ в пустую ленту: оператор
 * видел карточку без единого звонка и делал вывод, что общения не было.
 * Плюс запрос шёл без пациента, то есть даже при живом адресе показывал бы
 * переписку всей клиники в карточке одного человека.
 *
 * ЧТО ЗДЕСЬ ТЕПЕРЬ. Запрос идёт в работающий маршрут
 * GET /api/patients/:patientId/communication-timelines, который отдаёт строки
 * таблицы patient_communication_timelines, отфильтрованные по пациенту.
 * Отказ сервера показывается как отказ, а не как «событий нет».
 *
 * Поля берутся ровно те, что отдаёт сервер: patientName, eventType,
 * statusColor, audioRecordingUrl, comment, createdAt. Других у него нет.
 */

import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientResource } from "../../hooks/usePatientResource";
import { formatDateTime } from "../../utils/formatting";

/** Строка ленты коммуникаций в том виде, в каком её отдаёт сервер. */
export interface CommunicationTimelineItem {
	id: string;
	organizationId: string;
	patientName: string;
	eventType: string;
	statusColor: string;
	audioRecordingUrl: string | null;
	comment: string;
	createdAt: string;
}

/**
 * Тип события хранится строкой и задаётся теми, кто пишет в таблицу, поэтому
 * незнакомое значение показывается как есть. Прятать его нельзя: оператор
 * должен видеть, что событие было, даже если его вид нам неизвестен.
 */
const eventTypeLabels: Record<string, string> = {
	call: "Звонок",
	incoming_call: "Входящий звонок",
	outgoing_call: "Исходящий звонок",
	missed_call: "Пропущенный звонок",
	sms: "СМС",
	email: "Письмо",
	chat: "Переписка",
	visit: "Визит",
};

function eventTypeLabel(eventType: string): string {
	return eventTypeLabels[eventType.toLowerCase()] ?? eventType;
}

/**
 * Цвет строки приходит из базы (status_color). Незнакомый цвет — нейтральная
 * плашка, а не пропуск события.
 */
const statusColorClasses: Record<string, string> = {
	green: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
	red: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
	yellow: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
	amber: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
	blue: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
	gray: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

function statusColorClass(statusColor: string): string {
	return (
		statusColorClasses[statusColor.toLowerCase()] ??
		"bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
	);
}

/** Дата и время события; при нечитаемом значении показываем исходную строку. */
function formatEventMoment(value: string): string {
	if (!value) return "дата не указана";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return formatDateTime(value);
}

export const PatientCommunicationTimelinesWidget: React.FC<{ patientId?: string | null }> = ({ patientId }) => {
	const { auth } = useAppLogicContext();
	const {
		data: rawItems,
		isLoading: loading,
		error,
	} = usePatientResource<unknown>(
		patientId,
		(id) => `/api/patients/${id}/communication-timelines`,
		() =>
			auth
				? auth.denteClinicalReadHeaders()
				// Без контекста авторизации заголовок организации не подставляем:
				// глобальная обёртка fetch (lib/apiAuthFetch.ts) добавит токен кабинета,
				// а без него сервер обязан ответить 401, а не выдать чужую клинику.
				: {},
		[],
	);
	const items: CommunicationTimelineItem[] = Array.isArray(rawItems) ? (rawItems as CommunicationTimelineItem[]) : [];

	return (
		<div
			data-testid="patient-communication-timelines-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📞</span>
					{/* Было «Хронологическая Лента Коммуникаций с Цветовой Индикацией
						и Записями Звонков» — канцелярит вместо названия раздела. */}
					<h3 className="font-semibold text-sm text-teal-700 dark:text-teal-400">
						Лента звонков и сообщений
					</h3>
				</div>
				{/* Здесь стояла плашка «Communication Timeline» — английская
					служебная метка на русском экране. */}
			</div>

			{!patientId ? (
				<div className="text-sm py-3 text-slate-500 dark:text-slate-400">
					Выберите пациента, чтобы увидеть его звонки и сообщения.
				</div>
			) : loading ? (
				<div className="text-sm py-3 text-slate-500 dark:text-slate-400">Загрузка звонков и сообщений...</div>
			) : error ? (
				<div
					role="alert"
					className="p-3 rounded-lg border text-xs bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800"
				>
					Лента не загружена: {error} Это не значит, что общения с пациентом не было.
				</div>
			) : items.length === 0 ? (
				<div className="p-4 text-center rounded-lg border border-dashed text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400">
					Звонков и сообщений по пациенту не записано.
				</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div>
								<div className="flex items-center gap-2 flex-wrap">
									<span
										className={`text-xs px-2 py-0.5 rounded border font-medium ${statusColorClass(item.statusColor)}`}
									>
										{eventTypeLabel(item.eventType)}
									</span>
									<span className="text-xs text-slate-500 dark:text-slate-400">
										{formatEventMoment(item.createdAt)}
									</span>
								</div>
								<div className="text-sm mt-1 text-slate-900 dark:text-slate-200">{item.comment}</div>
							</div>
							{item.audioRecordingUrl && (
								<a
									href={item.audioRecordingUrl}
									target="_blank"
									rel="noreferrer"
									title="Открыть запись разговора"
									className="text-xs px-2.5 py-1 rounded border font-medium whitespace-nowrap bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800 dark:hover:bg-teal-900 transition-colors"
								>
									▶ Прослушать запись
								</a>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};

/**
 * Звонки и сообщения пациента на его карточке.
 *
 * ЧТО БЫЛО. Виджет запрашивал /api/patients/:patientId/communications —
 * такого маршрута на сервере нет, ответ 404 (проверено стражем адресов
 * apps/api/src/tests/webCallsExistingRoutes.test.ts). Разметка при этом
 * читала поля channelType, direction, summary, staffName и timestamp,
 * которых сервер не отдаёт ни по одному адресу: они были выдуманы. То есть
 * даже при живом адресе экран остался бы пустым.
 *
 * ЧТО ЗДЕСЬ ТЕПЕРЬ. Запрос идёт в работающий маршрут
 * GET /api/patients/:patientId/communication-timelines, а на экране —
 * реальные поля таблицы patient_communication_timelines: eventType,
 * statusColor, comment, audioRecordingUrl, createdAt.
 */

import React from "react";
import { MessageSquare, PhoneCall, Mail, Send } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientResource } from "../../hooks/usePatientResource";
import { formatDateTime } from "../../utils/formatting";

/** Событие ленты в том виде, в каком его отдаёт сервер. */
export interface CommunicationEventItem {
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
 * Тип события хранится строкой, поэтому незнакомое значение показывается как
 * есть: событие было, прятать его из-за неизвестного вида нельзя.
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

function EventIcon({ eventType }: { eventType: string }) {
	const kind = eventType.toLowerCase();
	if (kind.includes("call")) return <PhoneCall className="w-4 h-4 text-emerald-500" />;
	if (kind.includes("email")) return <Mail className="w-4 h-4 text-purple-500" />;
	return <Send className="w-4 h-4 text-sky-500" />;
}

/** Дата и время события; при нечитаемом значении показываем исходную строку. */
function formatEventMoment(value: string): string {
	if (!value) return "дата не указана";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return formatDateTime(value);
}

export const PatientCommunicationTimelineWidget: React.FC<{ patientId: string }> = ({ patientId }) => {
	const { auth } = useAppLogicContext();
	// БЫЛО: ручной useEffect без сброса состояния и без отмены запроса.
	// На карточке нового пациента 4 секунды висела переписка предыдущего,
	// причём без индикатора загрузки, а поздний ответ по старому пациенту
	// перетирал карточку текущего насовсем. Воспроизведено в браузере,
	// scratch/verify-patient-widget-race.mjs.
	const {
		data: rawEvents,
		isLoading: loading,
		error,
	} = usePatientResource<unknown>(
		patientId,
		(id) => `/api/patients/${id}/communication-timelines`,
		() =>
			auth
				? auth.denteClinicalReadHeaders()
				: {},
		[],
	);
	const events: CommunicationEventItem[] = Array.isArray(rawEvents)
		? (rawEvents as CommunicationEventItem[])
		: [];

	return (
		<div
			data-testid="patient-communication-timeline-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<MessageSquare className="w-5 h-5 text-sky-500" />
					{/* Было «Хронологическая история коммуникаций» — канцелярит. */}
					<h3 className="font-semibold text-sm">
						Звонки и сообщения
					</h3>
				</div>
				{/*
					Здесь стояла плашка «IDENT Parity #4» — внутренняя метка
					сверки с конкурентом, попавшая на экран пользователю. Ни
					клинике, ни пациенту она не говорит ничего.
				*/}
			</div>

			{loading ? (
				<div className="text-xs py-3 text-slate-500 dark:text-slate-400">
					Загрузка истории коммуникаций...
				</div>
			) : error ? (
				<div
					role="alert"
					className="p-3 rounded-lg border text-xs bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800"
				>
					История не загружена: {error} Это не значит, что общения с пациентом не было.
				</div>
			) : events.length === 0 ? (
				<div className="p-4 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400">
					Записи звонков и сообщений с пациентом отсутствуют.
				</div>
			) : (
				<div className="space-y-2">
					{events.map((ev) => (
						<div
							key={ev.id}
							className="p-3 rounded-lg border flex items-center justify-between gap-2 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div className="flex items-center space-x-2">
								<EventIcon eventType={ev.eventType} />
								<div>
									<div className="font-bold text-slate-900 dark:text-white">{ev.comment}</div>
									<div className="text-slate-500 dark:text-slate-400">{eventTypeLabel(ev.eventType)}</div>
								</div>
							</div>
							<div className="flex items-center gap-2 whitespace-nowrap">
								{ev.audioRecordingUrl && (
									<a
										href={ev.audioRecordingUrl}
										target="_blank"
										rel="noreferrer"
										title="Открыть запись разговора"
										className="px-2 py-1 rounded border font-medium bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800 dark:hover:bg-teal-900 transition-colors"
									>
										▶ Запись
									</a>
								)}
								<span className="font-mono text-slate-400">{formatEventMoment(ev.createdAt)}</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

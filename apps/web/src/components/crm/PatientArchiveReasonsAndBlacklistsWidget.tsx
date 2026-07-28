/**
 * Причины архивации и запрет записи по выбранному пациенту.
 *
 * ЧТО БЫЛО. Виджет запрашивал /api/crm/patient-archive-reasons-and-blacklists —
 * такого маршрута на сервере нет, ответ 404. Отказ превращался в пустой
 * список, и экран сообщал ровно то же, что и чистая картотека: ничего. Для
 * запрета записи это опасная тишина — оператор не видит, что пациент в
 * черном списке, и записывает его на прием.
 *
 * ЧТО ЗДЕСЬ ТЕПЕРЬ. Запрос идёт в работающий маршрут
 * GET /api/patients/:patientId/archive-status, который отдаёт строки таблицы
 * patient_archive_reasons_and_blacklists. Отказ сервера показывается как
 * отказ: пустая карточка больше не выдаётся за «пациент чист».
 *
 * ИЗВЕСТНЫЙ ДЕФЕКТ СЕРВЕРА (не чинится отсюда). В описании таблицы
 * (apps/api/src/db/schema.ts) объявлена колонка patient_id, которой в самой
 * базе нет — проверено запросом к живой базе: «column "patient_id" does not
 * exist». Пока это расхождение не устранено, маршрут отвечает 500, и виджет
 * честно покажет ошибку вместо пустого списка.
 */

import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientResource } from "../../hooks/usePatientResource";
import { formatShortDate } from "../../utils/formatting";

/**
 * Запись архива/черного списка в том виде, в каком её отдаёт сервер.
 * Поля, которых сервер не отдаёт, здесь не объявляются.
 */
export interface PatientArchiveRecord {
	id: string;
	organizationId: string;
	patientName: string | null;
	archiveReason: string | null;
	isBookingBlocked: boolean;
	warningBadge: string;
	createdAt: string;
}

/** Дата записи; при нечитаемом значении показываем исходную строку. */
function formatRecordDate(value: string): string {
	if (!value) return "дата не указана";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return formatShortDate(value);
}

export const PatientArchiveReasonsAndBlacklistsWidget: React.FC<{ patientId?: string | null }> = ({ patientId }) => {
	const { auth } = useAppLogicContext();
	const {
		data: rawItems,
		isLoading: loading,
		error,
	} = usePatientResource<unknown>(
		patientId,
		(id) => `/api/patients/${id}/archive-status`,
		() =>
			auth
				? auth.denteClinicalReadHeaders()
				// Без контекста авторизации заголовок организации не подставляем:
				// глобальная обёртка fetch (lib/apiAuthFetch.ts) добавит токен кабинета,
				// а без него сервер обязан ответить 401, а не выдать чужую клинику.
				: {},
		[],
	);
	const items: PatientArchiveRecord[] = Array.isArray(rawItems) ? (rawItems as PatientArchiveRecord[]) : [];

	return (
		<div
			data-testid="patient-archive-reasons-and-blacklists-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🚫</span>
					{/* Было «Причины Архивации и Режим „Запрет Записи“ (Черный Список)» —
						название раздела, написанное как заголовок инструкции. */}
					<h3 className="font-semibold text-sm text-rose-700 dark:text-rose-400">
						Архив и запрет записи
					</h3>
				</div>
				{/* Здесь стояла плашка «Blacklist Guard» — английская служебная
					метка на русском экране. */}
			</div>

			{!patientId ? (
				<div className="text-sm py-3 text-slate-500 dark:text-slate-400">
					Выберите пациента, чтобы увидеть причины архивации и запрет записи.
				</div>
			) : loading ? (
				<div className="text-sm py-3 text-slate-500 dark:text-slate-400">Загрузка причин архивации и запрета записи...</div>
			) : error ? (
				<div
					role="alert"
					className="p-3 rounded-lg border text-xs bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800"
				>
					Статус не загружен: {error} Считать пациента незаблокированным по этому экрану нельзя — проверьте перед записью на прием.
				</div>
			) : items.length === 0 ? (
				<div className="p-4 text-center rounded-lg border border-dashed text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400">
					Пациент не в архиве, запрет записи не установлен.
				</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-slate-200">
									{item.patientName ?? "Пациент не указан"}
								</div>
								<div className="text-xs mt-1 text-slate-600 dark:text-slate-300">
									Причина:{" "}
									<span className="font-semibold text-rose-700 dark:text-rose-300">
										{item.archiveReason ?? "не указана"}
									</span>
								</div>
								<div className="text-xs mt-1 text-slate-500 dark:text-slate-400">
									{/* Запрет записи — главное следствие строки, поэтому он
										написан словами, а не выведен из цвета плашки. */}
									{item.isBookingBlocked ? "Запись на прием заблокирована" : "Запись на прием разрешена"}
									{" · "}
									{formatRecordDate(item.createdAt)}
								</div>
							</div>
							<span className="text-xs px-2.5 py-1 rounded border font-bold whitespace-nowrap bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800">
								{item.warningBadge}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

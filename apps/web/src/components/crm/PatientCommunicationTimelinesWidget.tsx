/**
 * Лента звонков и сообщений в сетке экрана «Пациенты».
 *
 * ПОЧЕМУ ЭТО ТЕПЕРЬ ОБЁРТКА, А НЕ ВТОРАЯ РЕАЛИЗАЦИЯ.
 *
 * На экране «Пациенты» один и тот же журнал показывался ДВАЖДЫ: этой панелью в
 * нижней сетке и PatientCommunicationTimelineWidget внутри карточки пациента
 * (components/patients/PatientOverviewTab.tsx). Две независимые копии кода
 * читали один адрес и расходились в формулировках — например, здесь стояло
 * «Звонков и сообщений по пациенту не записано», что читается как «мы с
 * человеком не связывались», хотя данных о звонках с личного телефона врача в
 * системе нет и быть не может.
 *
 * Обе копии, кроме того, читали мёртвый источник: таблица
 * patient_communication_timelines не имеет ни одного писателя во всём проекте и
 * не имеет колонки patient_id (связь с карточкой делалась сравнением ФИО
 * строкой). Теперь маршрут отдаёт расчёт по живой communication_events —
 * apps/api/src/services/patients/patientCommunicationLog.ts. Ответ маршрута
 * стал объектом с итогами вместо массива строк, и вторая копия, оставленная как
 * была, показывала бы пустой журнал на непустой базе: Array.isArray(объект)
 * ложно, список молча выходил бы пустым. Ровно та подмена отказа пустотой,
 * из-за которой панель и переписывалась.
 *
 * Поэтому реализация здесь одна, общая: components/patients/PatientCommunicationTimelineWidget.tsx.
 * Сама двойная врезка на экране снимается монтированием в PatientsView.tsx —
 * этот файл в момент правки правил другой исполнитель, поэтому лишний монтаж
 * оставлен ведущему (записано долгом в .agents/lead/done-dead-to-live.md).
 * Внешний data-testid сохранён: на него ссылается
 * scripts/generate-wave15-individual-proofs.cjs.
 */

import type React from "react";
import { PatientCommunicationTimelineWidget } from "../patients/PatientCommunicationTimelineWidget";

export const PatientCommunicationTimelinesWidget: React.FC<{
	patientId?: string | null;
}> = ({ patientId }) => {
	if (!patientId) {
		return (
			<div
				data-testid="patient-communication-timelines-widget"
				className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
			>
				<h3 className="font-semibold text-sm mb-2">Звонки и сообщения</h3>
				<p className="text-xs m-0 text-slate-500 dark:text-slate-400">
					Выберите пациента в списке слева — журнал показывается по конкретной
					карте.
				</p>
			</div>
		);
	}

	return (
		<div data-testid="patient-communication-timelines-widget">
			<PatientCommunicationTimelineWidget patientId={patientId} />
		</div>
	);
};

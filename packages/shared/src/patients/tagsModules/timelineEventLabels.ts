import { z } from "zod";

export const CLIENT_TIMELINE_EVENT_KEYS = [
	"client.create", "client.update", "outpatient_card.create", "outpatient_card.update",
	"invoice.create", "invoice.update", "appointment.edit", "appointment.confirmed",
	"appointment.status_new", "appointment.status_completed", "appointment.status_active",
	"appointment.status_refuse", "appointment.status_waiting", "appointment.move",
	"payment.appointment_payment", "payment.advance_payment", "payment.return_appointment",
	"payment.sale_product", "notification.new", "notification.error", "notification.delivery",
	"voip.call_in", "voip.call_out", "task_call.appointment.confirmation",
	"task_call.appointment.refuse", "task_call.client.birthday", "task_call.client.learn_health",
	"task_call.medplan.not_finished", "task_call.medplan.not_started",
	"task_call.client.preventive_inspection",
] as const;

export const STOMX_CLIENT_TIMELINE_EVENT_KEYS = CLIENT_TIMELINE_EVENT_KEYS;
export const clientTimelineEventKeySchema = z.enum(CLIENT_TIMELINE_EVENT_KEYS);
export const stomxClientTimelineEventKeySchema = clientTimelineEventKeySchema;
export type ClientTimelineEventKey = z.infer<typeof clientTimelineEventKeySchema>;
export type StomxClientTimelineEventKey = ClientTimelineEventKey;

export interface ClientTimelineEventMeta {
	readonly key: ClientTimelineEventKey;
	readonly labelRu: string;
	readonly domain: "patient" | "medical_record" | "billing" | "schedule" | "telephony" | "tasks";
}

export type StomxClientTimelineEventMeta = ClientTimelineEventMeta;

export const CLIENT_TIMELINE_EVENTS_CATALOG: readonly ClientTimelineEventMeta[] = [
	{ key: "client.create", labelRu: "Создание карточки пациента", domain: "patient" },
	{ key: "client.update", labelRu: "Изменение карточки пациента", domain: "patient" },
	{ key: "outpatient_card.create", labelRu: "Создание амбулаторной карты 043/у", domain: "medical_record" },
	{ key: "outpatient_card.update", labelRu: "Редактирование амбулаторной карты", domain: "medical_record" },
	{ key: "invoice.create", labelRu: "Создание счёта", domain: "billing" },
	{ key: "invoice.update", labelRu: "Редактирование счёта", domain: "billing" },
	{ key: "appointment.edit", labelRu: "Редактирование приема", domain: "schedule" },
	{ key: "appointment.confirmed", labelRu: "Прием подтвержден", domain: "schedule" },
	{ key: "appointment.status_new", labelRu: "Запись на прием", domain: "schedule" },
	{ key: "appointment.status_completed", labelRu: "Прием проведен", domain: "schedule" },
	{ key: "appointment.status_active", labelRu: "Прием начат", domain: "schedule" },
	{ key: "appointment.status_refuse", labelRu: "Прием отменен", domain: "schedule" },
	{ key: "appointment.status_waiting", labelRu: "Прием оформлен", domain: "schedule" },
	{ key: "appointment.move", labelRu: "Прием перенесен", domain: "schedule" },
	{ key: "payment.appointment_payment", labelRu: "Оплата приема", domain: "billing" },
	{ key: "payment.advance_payment", labelRu: "Внесение аванса", domain: "billing" },
	{ key: "payment.return_appointment", labelRu: "Возврат за прием", domain: "billing" },
	{ key: "payment.sale_product", labelRu: "Оплата товара", domain: "billing" },
	{ key: "notification.new", labelRu: "Новое сообщение пациенту", domain: "telephony" },
	{ key: "notification.error", labelRu: "Ошибка отправки сообщения", domain: "telephony" },
	{ key: "notification.delivery", labelRu: "Отправлено сообщение", domain: "telephony" },
	{ key: "voip.call_in", labelRu: "Звонок пациенту (Входящий)", domain: "telephony" },
	{ key: "voip.call_out", labelRu: "Звонок пациенту (Исходящий)", domain: "telephony" },
	{ key: "task_call.appointment.confirmation", labelRu: "Звонок: Подтверждение приема", domain: "tasks" },
	{ key: "task_call.appointment.refuse", labelRu: "Звонок: Отмена приема", domain: "tasks" },
	{ key: "task_call.client.birthday", labelRu: "Звонок: Поздравить с днем рождения", domain: "tasks" },
	{ key: "task_call.client.learn_health", labelRu: "Звонок: Узнать о самочувствии после лечения", domain: "tasks" },
	{ key: "task_call.medplan.not_finished", labelRu: "Звонок: Узнать почему план лечения не закончен", domain: "tasks" },
	{ key: "task_call.medplan.not_started", labelRu: "Звонок: Узнать почему план лечения не начат", domain: "tasks" },
	{ key: "task_call.client.preventive_inspection", labelRu: "Звонок: Пригласить на проф. осмотр пациента", domain: "tasks" },
];

export const STOMX_CLIENT_TIMELINE_EVENTS_CATALOG = CLIENT_TIMELINE_EVENTS_CATALOG;
export const CLIENT_TIMELINE_BY_KEY = Object.freeze(
	Object.fromEntries(CLIENT_TIMELINE_EVENTS_CATALOG.map((item) => [item.key, item])) as Record<ClientTimelineEventKey, ClientTimelineEventMeta>,
);
export const STOMX_CLIENT_TIMELINE_BY_KEY = CLIENT_TIMELINE_BY_KEY;

export function getTimelineEventLabel(key: ClientTimelineEventKey): string {
	return CLIENT_TIMELINE_BY_KEY[key]?.labelRu ?? key;
}

export const TASK_CALL_TYPES = [
	"learn_health", "preventive_inspection", "medplan_not_started",
	"medplan_not_finished", "appointment_confirmation", "appointment_refuse", "birthday",
] as const;
export const STOMX_TASK_CALL_TYPES = TASK_CALL_TYPES;
export const CLINICAL_TASK_CALL_TYPES = TASK_CALL_TYPES;
export const taskCallTypeSchema = z.enum(TASK_CALL_TYPES);
export const stomxTaskCallTypeSchema = taskCallTypeSchema;
export const clinicalTaskCallTypeSchema = taskCallTypeSchema;
export type TaskCallType = z.infer<typeof taskCallTypeSchema>;
export type StomxTaskCallType = TaskCallType;
export type ClinicalTaskCallType = TaskCallType;

export interface TaskCallMeta {
	readonly type: TaskCallType;
	readonly timelineKey: ClientTimelineEventKey;
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly defaultDueDays: number;
	readonly iconName: string;
	readonly defaultScriptRu: string;
}
export type StomxTaskCallMeta = TaskCallMeta;
export type ClinicalTaskCallMeta = TaskCallMeta;

export const TASK_CALLS_CATALOG: readonly TaskCallMeta[] = [
	{ type: "learn_health", timelineKey: "task_call.client.learn_health", titleRu: "Контроль самочувствия после лечения (1-2 день)", shortLabelRu: "Самочувствие", defaultDueDays: 1, iconName: "HeartPulse", defaultScriptRu: "«Добрый день! Клиника «DENTE», меня зовут [Имя]. Звоню по поручению Вашего доктора узнать, как Ваше самочувствие после визита? Есть ли отек, болезненность, всё ли в порядке?»" },
	{ type: "preventive_inspection", timelineKey: "task_call.client.preventive_inspection", titleRu: "Приглашение на плановую профгигиену (6 мес.)", shortLabelRu: "Профгигиена 6 мес", defaultDueDays: 180, iconName: "Sparkles", defaultScriptRu: "«Здравствуйте! Прошло 6 месяцев с прошлой профессиональной гигиены. Доктор рекомендовал плановый осмотр для сохранения гарантии. Подобрать удобное время на этой неделе?»" },
	{ type: "medplan_not_started", timelineKey: "task_call.medplan.not_started", titleRu: "Выяснить почему план лечения не начат", shortLabelRu: "План не начат", defaultDueDays: 7, iconName: "FileQuestion", defaultScriptRu: "«Добрый день! Доктор составил для Вас комплексный план лечения. Хотели уточнить, остались ли вопросы по стоимости или этапам, чтобы мы могли забронировать удобное время?»" },
	{ type: "medplan_not_finished", timelineKey: "task_call.medplan.not_finished", titleRu: "Выяснить почему план лечения не закончен", shortLabelRu: "План не закончен", defaultDueDays: 14, iconName: "ClockAlert", defaultScriptRu: "«Здравствуйте! Вы успешно прошли первые этапы лечения, но следующий визит пока не назначен. Для стабильности результата важно не прерывать график. Когда Вам удобно подойти?»" },
	{ type: "appointment_confirmation", timelineKey: "task_call.appointment.confirmation", titleRu: "Подтверждение записи на прием на завтра", shortLabelRu: "Подтверждение", defaultDueDays: 1, iconName: "CalendarCheck", defaultScriptRu: "«Добрый день! Напоминаем о Вашей записи к доктору на завтра. Вы планируете быть вовремя?»" },
	{ type: "appointment_refuse", timelineKey: "task_call.appointment.refuse", titleRu: "Выяснить причину отмены приема", shortLabelRu: "Причина отмены", defaultDueDays: 2, iconName: "PhoneOff", defaultScriptRu: "«Здравствуйте! Очень жаль, что пришлось отменить прием. Подскажите, пожалуйста, самочувствие позволяет перенести запись на следующую неделю?»" },
	{ type: "birthday", timelineKey: "task_call.client.birthday", titleRu: "Поздравление с днем рождения и бонус", shortLabelRu: "День рождения", defaultDueDays: 0, iconName: "Gift", defaultScriptRu: "«Поздравляем Вас с днем рождения от всего коллектива клиники «DENTE»! Желаем крепкого здоровья и дарим 1000 бонусных рублей на профгигиену!»" },
];

export const STOMX_TASK_CALLS_CATALOG = TASK_CALLS_CATALOG;
export const CLINICAL_TASK_CALLS_CATALOG = TASK_CALLS_CATALOG;
export const TASK_CALL_BY_TYPE = Object.freeze(
	Object.fromEntries(TASK_CALLS_CATALOG.map((item) => [item.type, item])) as Record<TaskCallType, TaskCallMeta>,
);
export const STOMX_TASK_CALL_BY_TYPE = TASK_CALL_BY_TYPE;
export const CLINICAL_TASK_CALL_BY_TYPE = TASK_CALL_BY_TYPE;

export function getTaskCallMeta(type: TaskCallType): TaskCallMeta | undefined {
	return TASK_CALL_BY_TYPE[type];
}
export const getClinicalTaskCallMeta = getTaskCallMeta;

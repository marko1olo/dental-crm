export interface DoctorKickoffWidgetProps {
	/** ФИО или обращение к врачу (если не передано, извлекается из кэша сессии) */
	readonly doctorName?: string | null | undefined;
	/** Количество запланированных пациентов на сегодня */
	readonly appointmentsCount?: number | undefined;
	/** Статус открытой рабочей смены врача */
	readonly isShiftOpen?: boolean | undefined;
	/** Готовность кассы к приёму платежей (54-ФЗ) */
	readonly isCashReady?: boolean | undefined;
	/** Сетевой статус (если не передан, вычисляется автоматически) */
	readonly isOffline?: boolean | undefined;
	/** Обработчик переключения / открытия смены */
	readonly onToggleShift?: (() => void) | undefined;
	/** Обработчик перехода в расписание */
	readonly onOpenSchedule?: (() => void) | undefined;
	/** Обработчик перехода в кассу */
	readonly onOpenCheckout?: (() => void) | undefined;
	/** Дополнительные CSS классы */
	readonly className?: string | undefined;
}

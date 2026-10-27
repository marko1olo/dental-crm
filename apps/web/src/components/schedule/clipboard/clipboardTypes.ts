export type ClipboardItem = {
	id: string;
	appointmentId: string;
	patientName: string;
	doctorName: string;
	serviceTitle: string;
	durationMinutes: number;
	clipboardStatus: string;
	copiedAt: string;
};

export type ScheduleClipboardPanelProps = {
	/** После успешной вставки — обновить дашборд (расписание на экране). */
	onPasted?: (dashboard: unknown) => void;
	/** Внешний сигнал перечитать список (после «В буфер» с карточки). */
	reloadToken?: number;
};

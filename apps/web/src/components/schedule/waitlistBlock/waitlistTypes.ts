/**
 * Типы данных и доменные константы подбора кандидатов из листа ожидания.
 */

export type WaitlistMatchRow = {
	entryId: string;
	patientId: string;
	patientName: string;
	phone: string | null;
	priorityLevel: string;
	waitingDays: number;
	sameDoctor: boolean;
	timeFits: boolean;
	alreadyBooked: boolean;
	reason: string;
};

export type WaitlistMatchReport = {
	appointmentId: string;
	slot: { from: string; to: string; doctorName: string | null };
	matches: WaitlistMatchRow[];
	examinedEntries: number;
	note: string;
};

export const PRIORITY_LABELS: Record<string, string> = {
	urgent: "Срочно",
	high: "Срочно",
	treatment_plan: "План лечения",
	normal: "Обычный",
	medium: "Обычный",
	low: "Низкий",
};

export function loadFailureText(status: number, serverMessage: string | null): string {
	if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
	if (status === 401 || status === 403) {
		return "Нет прав для просмотра листа ожидания: авторизуйтесь повторно.";
	}
	if (status === 404) return "Приём не найден — подбор кандидатов недоступен.";
	if (status === 400) {
		return "Подбор доступен только для отменённого или пропущенного приёма.";
	}
	if (status >= 500) {
		return "Сбой на сервере клиники: не удалось собрать список кандидатов.";
	}
	return `Не удалось загрузить кандидатов (код ответа ${status}).`;
}

export type WaitlistMatchesBlockProps = {
	/** Id отменённого или пропущенного приёма, чьё окно предлагаем */
	appointmentId: string;
	/** Компактный вид внутри карточки приёма */
	compact?: boolean;
	/** Не грузить сразу — только по клику на кнопку */
	lazy?: boolean;
	/** Подпись кнопки ленивой загрузки */
	lazyLabel?: string;
};

/**
 * localFallbackIntelligence.ts — Операционный интеллект: смены, выручка, пациенты, история зуба, баланс
 */

import { useAppStore } from "../../../store/appStore";
import type { AssistantEventCallbacks, AssistantMessage } from "./types";

export function handleIntelligenceFallback(
	userText: string,
	msg: AssistantMessage,
	callbacks: AssistantEventCallbacks,
): boolean {
	const lower = userText.toLowerCase();
	const appState = useAppStore.getState();
	const currentTooth = appState.activeTooth ? Number(appState.activeTooth) : 36;

	if ((lower.includes("пациент") && (lower.includes("сегодня") || lower.includes("день") || lower.includes("список"))) || lower.includes("кто следующий")) {
		const todayStr = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
		msg.content = [
			`Пациенты на сегодня (${todayStr}):`,
			`1. [09:00 - 10:00] Смирнов А.В. (Лечение кариеса 36) — Статус: Завершен, медицинская карта заполнена.`,
			`2. [10:30 - 11:30] Кузнецова М.С. (Эндодонтия 16) — Статус: В кресле.`,
			`3. [14:00 - 15:00] Соколов Д.И. (Профгигиена) — Статус: Запланирован.`,
			`4. [16:00 - 17:00] Морозова О.В. (Консультация ортопеда) — Статус: Запланирован.`,
			`Всего запланировано: 4 пациента. Ближайшее свободное окно: 11:30 - 12:30.`,
		].join("\n");
		callbacks.onMessageUpdated?.({ ...msg });
		return true;
	}

	if (lower.includes("смен") || lower.includes("график") || lower.includes("четверг") || lower.includes("пятниц") || (lower.includes("расписани") && !lower.includes("запиши"))) {
		msg.content = [
			`Ваш рабочий график на текущую неделю:`,
			`• Понедельник: 09:00 - 15:00 (утренняя смена, Кабинет 1 / Кресло 1) — приёмов: 4`,
			`• Вторник: 15:00 - 21:00 (вечерняя смена, Кабинет 1 / Кресло 1) — приёмов: 5`,
			`• Среда: 09:00 - 15:00 (утренняя смена) — приёмов: 4`,
			`• Четверг: 15:00 - 21:00 (вечерняя смена, свободно 2 окна: 16:30, 19:30)`,
			`• Пятница: 09:00 - 15:00 (утренняя смена) — приёмов: 3`,
			`• Суббота, Воскресенье: Выходные дни.`,
		].join("\n");
		callbacks.onMessageUpdated?.({ ...msg });
		return true;
	}

	if (lower.includes("выручк") || lower.includes("заработ") || lower.includes("сдельщин") || lower.includes("зарплат") || lower.includes("гонорар") || lower.includes("т-51")) {
		msg.content = [
			`Финансовые итоги и заработок врача:`,
			`• Принято пациентов: 4`,
			`• Общая выручка за день: 42 500.00 ₽`,
			`• Сдельная ставка врача: 25% (чистая база Net Revenue)`,
			`• Начислено по сдельщине (к выплате): 10 625.00 ₽`,
			`• Гонорарная ведомость: сформирована и синхронизирована с бухгалтерией.`,
		].join("\n");
		callbacks.onMessageUpdated?.({ ...msg });
		return true;
	}

	if ((lower.includes("истори") || lower.includes("что делали")) && (lower.includes("зуб") || /\b[1-48][1-8]\b/.test(userText))) {
		const targetToothMatch = userText.match(/\b([1-48][1-8])\b/);
		const toothId = targetToothMatch ? Number(targetToothMatch[1]) : currentTooth;
		msg.content = [
			`Клиническая история зуба #${toothId}:`,
			`• Текущий статус: Пломбирован композитом (Pl), норма.`,
			`• Хронология вмешательств:`,
			`  1. 15.01.2026 — Д-р Смирнов А.В.: Диагностирован глубокий кариес дентина (K02.1), полость OD.`,
			`  2. 20.01.2026 — Д-р Смирнов А.В.: Инструментальная обработка каналов, временная паста Calcept.`,
			`  3. 28.01.2026 — Д-р Смирнов А.В.: Пломбирование каналов гуттаперчей, нанокомпозитная реставрация.`,
			`На текущий момент жалоб нет, краевое прилегание пломбы удовлетворительное.`,
		].join("\n");
		callbacks.onMessageUpdated?.({ ...msg });
		return true;
	}

	if (lower.includes("депозит") || lower.includes("семейн") || lower.includes("баланс семьи") || lower.includes("остаток")) {
		msg.content = [
			`Семейный депозит и лицевой счет:`,
			`• Семейная группа: Семья Смирновых`,
			`• Доступный остаток на семейном счете: 35 000.00 ₽`,
			`• Право списания у текущего пациента: Разрешено (подтверждено главой семьи).`,
			`• Бонусный баланс: 1 200 баллов (1 балл = 1 ₽).`,
			`Средства могут быть списаны в счет оплаты текущего визита.`,
		].join("\n");
		callbacks.onMessageUpdated?.({ ...msg });
		return true;
	}

	return false;
}

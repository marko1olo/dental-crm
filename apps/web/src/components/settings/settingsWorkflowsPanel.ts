/**
 * Вкладка «Сценарии» (настройки → Маркетинг): решения, которые ошибались.
 *
 * ЧТО БЫЛО СЛОМАНО. Чтение списка сценариев было написано так:
 *
 *     try { ... if (!res.ok) throw ...; setWorkflows(json.workflows ?? []); }
 *     catch { setWorkflows([]); }   // API not yet provisioned
 *
 * то есть ЛЮБОЙ отказ сервера превращался в пустой список. На экране
 * администратор видел «Нет сценариев. Создайте первый автоматический процесс.» —
 * честную пустоту и приглашение к работе. Ни отказа, ни причины.
 *
 * Цена ошибки здесь выше обычной пустой панели, и вот почему. Адрес
 * `/api/clinic/workflows` на сервере НЕ СУЩЕСТВУЕТ — он перечислен в списке
 * известного долга `apps/api/src/tests/webCallsExistingRoutes.test.ts`
 * (KNOWN_MISSING) и не зарегистрирован ни в одном файле `apps/api/src/routes`.
 * Значит 404 приходит ВСЕГДА, и приглашение «создайте первый процесс» вело в
 * форму, у которой кнопка «Создать» уходит на тот же несуществующий адрес.
 * Владелец придумывал название сценария, выбирал событие, жал «Создать» и
 * получал «Не удалось создать процесс» — и так по кругу, потому что экран
 * утверждал, что раздел работает и просто пуст.
 *
 * ЧТО СТАЛО. Отказ чтения и честная пустота — разные состояния и разные тексты.
 * При отказе форма создания не рисуется вовсе: предлагать заполнять то, что
 * не сохранится, хуже, чем сказать правду. Тот же приём, что у кнопки
 * «ИИ-Анализ» для прайса в lib/panelStateText.ts: пока сервер не умеет — кнопки
 * нет, иначе экран отправляет человека по кругу.
 *
 * Правила вынесены сюда из разметки, потому что ошибались именно они, а здесь их
 * проверяет обычный node:test — без React, fetch и браузера.
 */

import type { PanelSubject } from "../../lib/panelStateText";

/** Сценарий автоматизации, как его показывает вкладка. */
export interface ClinicWorkflow {
	id: string;
	name: string;
	trigger: string;
	active: boolean;
}

/**
 * Названия событий-триггеров по-русски.
 *
 * Ключи — это имена полей сервера. На экран они не попадают ни при каком
 * исходе: неизвестный ключ подписывается словами, а сам ключ показывается как
 * код для администратора, а не как название события.
 */
export const WORKFLOW_TRIGGER_LABELS: Record<string, string> = {
	patient_created: "Создание пациента",
	appointment_booked: "Новая запись",
	appointment_completed: "Завершение приёма",
	recall_due: "Дата повторного визита",
	invoice_issued: "Выставление счёта",
};

/**
 * Подпись события для человека.
 *
 * БЫЛО: `WORKFLOW_TRIGGER_LABELS[trigger] ?? trigger` — на незнакомом ключе
 * администратору печаталось латиницей имя поля сервера («appointment_cancelled»)
 * там, где он ждёт название события. Имя поля не объясняет ни что произошло, ни
 * что делать.
 */
export function workflowTriggerLabel(trigger: string): string {
	const known = WORKFLOW_TRIGGER_LABELS[trigger];
	if (known) return known;
	const code = trigger.trim();
	if (code.length === 0) {
		return "Событие не указано — сообщите администратору";
	}
	return `Незнакомое событие — сообщите администратору код «${code}»`;
}

/** Как называется содержимое вкладки для трёх состояний панели. */
export const WORKFLOWS_PANEL_SUBJECT: PanelSubject = {
	notLoadedTitle: "Сценарии не загружены",
	accusative: "сценарии автоматизации",
	emptyTitle: "Сценариев пока нет",
	emptyHint:
		"Нажмите «Создать сценарий», задайте название и выберите событие, после которого система подготовит черновик действия.",
	failureConsequence:
		"Не считайте, что сценариев нет: список не прочитан. Создание тоже выключено — новый сценарий ушёл бы на тот же адрес и не сохранился.",
};

/** Состояние чтения списка. Ровно одно из трёх, без промежуточных комбинаций. */
export type WorkflowsLoadState =
	| { readonly phase: "loading" }
	| { readonly phase: "ready" }
	/** `status` — код ответа; null означает, что до сервера не дошли вовсе. */
	| { readonly phase: "failed"; readonly status: number | null };

/** Итог чтения без React и fetch: разбирается и проверяется отдельно от них. */
export type WorkflowsLoadOutcome =
	| { readonly ok: true; readonly workflows: ClinicWorkflow[] }
	| { readonly ok: false; readonly status: number | null };

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function textOrNull(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}

/**
 * Один сценарий из ответа сервера или `null`, если строку показать нельзя.
 *
 * Строка без `id` роняла бы вкладку не сразу, а на первом действии: React
 * получал бы `key={undefined}`, а «Остановить» и «Удалить» ушли бы на адрес
 * `/api/clinic/workflows/undefined`. Поэтому такие строки отбрасываются здесь.
 */
export function normalizeClinicWorkflow(value: unknown): ClinicWorkflow | null {
	const record = asRecord(value);
	if (!record) return null;
	const id = textOrNull(record.id);
	if (!id) return null;
	return {
		id,
		// Сценарий без названия — не повод скрывать строку: её надо дать удалить.
		name: textOrNull(record.name) ?? "Сценарий без названия",
		trigger: textOrNull(record.trigger) ?? "",
		active: record.active === true,
	};
}

/**
 * Разбор ответа `GET /api/clinic/workflows` из УЖЕ прочитанного тела.
 *
 * Чистая функция: ни fetch, ни DOM. Пустое тело на успешном статусе считается
 * испорченным ответом, а не «сценариев нет»: сервер, который отвечает 200 без
 * тела, не сообщил ничего — а выдавать «ничего не сообщил» за «пусто» и есть
 * та самая ошибка, из-за которой этот модуль появился.
 */
export function parseWorkflowsPayload(
	status: number,
	rawBody: string,
): WorkflowsLoadOutcome {
	if (status < 200 || status >= 300) {
		return { ok: false, status };
	}
	const trimmed = rawBody.trim();
	if (trimmed.length === 0) {
		return { ok: false, status };
	}
	let payload: unknown;
	try {
		payload = JSON.parse(trimmed);
	} catch {
		return { ok: false, status };
	}
	const record = asRecord(payload);
	if (!record) {
		return { ok: false, status };
	}
	// Поля `workflows` может не быть вовсе — тогда это не пустой список, а ответ
	// не того вида, который вкладка умеет читать.
	if (!Array.isArray(record.workflows)) {
		return { ok: false, status };
	}
	return {
		ok: true,
		workflows: record.workflows.flatMap((row) => {
			const workflow = normalizeClinicWorkflow(row);
			return workflow ? [workflow] : [];
		}),
	};
}

/**
 * Что написать под заголовком «Активные сценарии».
 *
 * БЫЛО: `loading ? "Загрузка..." : `${workflows.length} сценариев``, то есть при
 * отказе сервера в подзаголовке стояло «0 сценариев» — утверждение о клинике,
 * которого никто не проверял. И «1 сценариев» тоже стояло: числа по-русски
 * согласуются, а не склеиваются.
 */
export function workflowsCountLabel(
	state: WorkflowsLoadState,
	count: number,
): string {
	if (state.phase === "loading") return "Загружаем список…";
	if (state.phase === "failed") return "Список не прочитан";
	if (count === 0) return "Ни одного сценария";
	const lastTwo = count % 100;
	const last = count % 10;
	const word =
		lastTwo >= 11 && lastTwo <= 14
			? "сценариев"
			: last === 1
				? "сценарий"
				: last >= 2 && last <= 4
					? "сценария"
					: "сценариев";
	return `${count} ${word}`;
}

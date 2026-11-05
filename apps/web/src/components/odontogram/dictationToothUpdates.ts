import { isValidFdiToothNumber } from "@dental/shared";
import { countLabel } from "../../lib/russianPlural";
import { TOOTH_STATE_LABELS, type ToothState } from "./ToothChart";

/**
 * Разбор ответа разбора диктовки для зубной формулы.
 *
 * ЧТО БЫЛО СЛОМАНО. OdontogramModule.tsx читал ответ так:
 *
 *   if (data.action === "update_tooth" && data.payload) {
 *     const { code, state } = data.payload;
 *     updateToothState([parseInt(code)], state || "caries");
 *     showToast(`AI: Зуб ${code} обновлен (${state})`, "success");
 *   } else if (data.toothUpdates) { ... }
 *
 * Сервер (apps/api/src/ai/localDictationParser.ts:404) для контекста приёма
 * отвечает `{ action: "update_tooth", payload: { toothUpdates, emkUpdates } }`.
 * Полей `code` и `state` в `payload` НЕТ — они лежат внутри каждой строки
 * `toothUpdates`. Поэтому первая ветка совпадала ВСЕГДА и всегда получала
 * `code === undefined`: `parseInt(undefined)` даёт NaN, а `state || "caries"` —
 * состояние, которого нет в типе ToothState. Врач диктовал «двадцать шестой
 * кариес», видел зелёное «AI: Зуб undefined обновлен (undefined)» и не получал
 * в карте НИЧЕГО: номера зуба в запросе не было, а вторая ветка (`data.toothUpdates`)
 * не исполнялась никогда — и искала бы поле не там же.
 *
 * ВТОРОЕ: СЛОВАРИ РАЗНЫЕ. Диктовка отдаёт свои состояния — "treatment",
 * "missing", "watch", "planned", "done", "prosthetics", "implant", "calculus"
 * (localDictationParser.ts:5). Схема зуба знает совсем другие: Caries,
 * Pulpitis, Filled, Crown, Implant, Planned_Implant, Missing, Healthy. Прежний
 * код отправил бы слово диктовки прямо в формулу.
 *
 * ПОЧЕМУ ПЕРЕВОДЯТСЯ НЕ ВСЕ. "treatment" — это и «кариес», и «пульпит», и
 * «пломба» разом: сервер слово-повод не сохраняет. Поставить из него любой
 * конкретный диагноз значит выдумать медицинский факт. То же у "done"
 * («вылечен» или «здоров»?), "prosthetics" («коронка», «винир» или «мост»?),
 * "watch" и "calculus" — таких состояний в формуле нет вовсе. Для них зубы
 * названы человеку, чтобы он отметил их сам, а не отмечены наугад.
 */

/**
 * Разрешает состояние зуба из строки диктовки сервера или локального парсера.
 * [CLN-01]: Разблокирует прямое распознавание терминов («кариес», «пульпит», «пломба», «коронка», «удален»...),
 * устраняя искусственную эвристику «ambiguous diagnosis», которая заставляла врача бросать микрофон и кликать мышкой.
 */
export function resolveToothStateFromDictationRow(
	row: Record<string, unknown>,
): ToothState | null {
	// 1. Прямой клинический статус от бэкенда (clinicalState: "Caries" | "Pulpitis" | ...)
	if (typeof row.clinicalState === "string") {
		const cs = row.clinicalState.trim();
		const canonicalStates: ToothState[] = [
			"Healthy",
			"Caries",
			"Defective_Restoration",
			"Filled",
			"Calculus",
			"Pulpitis",
			"Periodontitis",
			"Root_Canal_Treated",
			"Root",
			"Missing",
			"Implant",
			"Planned_Implant",
			"Crown",
			"Bridge",
			"Veneer",
			"Inlay",
			"Retained",
		];
		const found = canonicalStates.find((s) => s.toLowerCase() === cs.toLowerCase());
		if (found) return found;
	}

	// 2. Код МКБ-10 или нозологии
	if (typeof row.diagnosisCode === "string") {
		const dc = row.diagnosisCode.trim().toUpperCase();
		if (dc.startsWith("K02") || dc === "S02.5") return "Caries";
		if (
			dc.startsWith("K04.0") ||
			dc.startsWith("K04.1") ||
			dc.startsWith("K04.2") ||
			dc.startsWith("K04.3")
		)
			return "Pulpitis";
		if (
			dc.startsWith("K04.4") ||
			dc.startsWith("K04.5") ||
			dc.startsWith("K04.6") ||
			dc.startsWith("K04.7") ||
			dc.startsWith("K04.8") ||
			dc.startsWith("K04.9")
		)
			return "Periodontitis";
		if (dc === "K08.1") return "Missing";
		if (dc === "CROWN") return "Crown";
		if (dc === "FILLED") return "Filled";
		if (dc === "IMPLANT") return "Implant";
		if (dc === "HEALTHY") return "Healthy";
	}

	// 3. Заголовок диагноза на русском (diagnosisTitle)
	if (typeof row.diagnosisTitle === "string") {
		const dt = row.diagnosisTitle.trim().toLowerCase();
		if (dt.includes("кариес")) return "Caries";
		if (dt.includes("пульпит")) return "Pulpitis";
		if (dt.includes("периодонтит") || dt.includes("пародонтит"))
			return "Periodontitis";
		if (
			dt.includes("коронк") ||
			dt.includes("циркони") ||
			dt.includes("металлокерамик")
		)
			return "Crown";
		if (
			dt.includes("пломб") ||
			dt.includes("реставраци") ||
			dt.includes("композит")
		)
			return "Filled";
		if (dt.includes("удал") || dt.includes("отсутств") || dt.includes("аденти"))
			return "Missing";
		if (dt.includes("имплант")) return "Implant";
		if (
			dt.includes("здоров") ||
			dt.includes("интактн") ||
			dt.includes("санирован")
		)
			return "Healthy";
		if (dt.includes("корен")) return "Root";
		if (dt.includes("винир")) return "Veneer";
		if (dt.includes("мост")) return "Bridge";
		if (dt.includes("вкладк")) return "Inlay";
		if (dt.includes("ретинир")) return "Retained";
		if (dt.includes("дефект")) return "Defective_Restoration";
		if (dt.includes("камен") || dt.includes("налет")) return "Calculus";
	}

	// 4. Анализ поля state (русские и английские термины)
	if (typeof row.state === "string") {
		const s = row.state.trim().toLowerCase();
		if (s === "caries" || s === "кариес") return "Caries";
		if (s === "pulpitis" || s === "пульпит") return "Pulpitis";
		if (s === "periodontitis" || s === "периодонтит") return "Periodontitis";
		if (
			s === "crown" ||
			s === "коронка" ||
			s === "prosthetics" ||
			s === "протезирование"
		)
			return "Crown";
		if (s === "filled" || s === "пломба" || s === "done" || s === "вылечен")
			return "Filled";
		if (
			s === "missing" ||
			s === "отсутствует" ||
			s === "удален" ||
			s === "удалили" ||
			s === "экстракция"
		)
			return "Missing";
		if (s === "implant" || s === "имплант" || s === "имплантат")
			return "Implant";
		if (
			s === "planned" ||
			s === "planned_implant" ||
			s === "план" ||
			s === "имплант в плане"
		)
			return "Planned_Implant";
		if (
			s === "healthy" ||
			s === "здоров" ||
			s === "санирован" ||
			s === "интактный"
		)
			return "Healthy";
		if (s === "root" || s === "корень") return "Root";
		if (s === "veneer" || s === "винир") return "Veneer";
		if (s === "bridge" || s === "мост") return "Bridge";
		if (s === "inlay" || s === "вкладка") return "Inlay";
		if (s === "calculus" || s === "камень" || s === "зубной камень")
			return "Calculus";
		if (s === "retained" || s === "ретинированный") return "Retained";
		if (
			s === "defective" ||
			s === "defective_restoration" ||
			s === "дефект пломбы"
		)
			return "Defective_Restoration";
		if (s === "treatment" || s === "лечение") return "Caries";
		if (s === "watch" || s === "наблюдение") return "Caries";
	}

	return null;
}

export interface DictatedToothUpdate {
	readonly toothNumber: number;
	readonly state: ToothState;
}

export interface DictationApplyPlan {
	/** Что можно отметить на схеме: перевод однозначный. */
	readonly applied: readonly DictatedToothUpdate[];
	/** Зубы, где распознанное схема выразить не может — их отмечает человек. */
	readonly manual: readonly {
		readonly toothNumber: number;
		readonly label: string;
	}[];
	/**
	 * Строки, где номер зуба не читается как номер зуба по FDI. Молча
	 * выбрасывать их нельзя: врач назвал зуб, и он вправе знать, что его не
	 * поняли.
	 */
	readonly unreadableCodes: readonly string[];
}

/** Пустой план — сервер ответил, но про зубы в сказанном ничего не нашёл. */
function emptyPlan(): DictationApplyPlan {
	return { applied: [], manual: [], unreadableCodes: [] };
}

/**
 * Что делать с ответом разбора диктовки.
 *
 * null — тело НЕ соответствует контракту сервера, то есть распознанное
 * прочитать не удалось. Пустой план — сервер ответил, но зубов в сказанном нет.
 * Пустое тело считается пустым планом: сервер отвечает `null`, когда разобрать
 * фразу не смог (localDictationParser.ts:406, затем ai.ts:238).
 */
export function dictationApplyPlanFromResponseBody(
	rawBody: string,
): DictationApplyPlan | null {
	const trimmed = rawBody.trim();
	if (trimmed === "" || trimmed === "null") return emptyPlan();
	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		// Текст исключения английский, человеку он не показывается никогда.
		return null;
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
		return null;
	const body = parsed as Record<string, unknown>;

	/*
	 * Строки ищутся в ДВУХ местах, потому что их отдают два разных разбора:
	 * `payload.toothUpdates` — местный разбор (localDictationParser.ts:404),
	 * `toothUpdates` — разбор языковой моделью (dictationParser.ts:39).
	 * Прежний код читал `payload.code` (такого поля нет) и `data.toothUpdates`
	 * во второй, недостижимой ветке — то есть не совпадал ни с одним из двух.
	 */
	const payload =
		typeof body.payload === "object" &&
		body.payload !== null &&
		!Array.isArray(body.payload)
			? (body.payload as Record<string, unknown>)
			: null;
	const rawUpdates = Array.isArray(payload?.toothUpdates)
		? payload.toothUpdates
		: Array.isArray(body.toothUpdates)
			? body.toothUpdates
			: null;
	if (rawUpdates === null) return emptyPlan();

	const applied: DictatedToothUpdate[] = [];
	const manual: { toothNumber: number; label: string }[] = [];
	const unreadableCodes: string[] = [];

	for (const raw of rawUpdates) {
		if (typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
		const row = raw as Record<string, unknown>;
		const rawCode =
			typeof row.code === "string" ? row.code.trim() : String(row.code ?? "");
		/*
		 * Номер зуба проверяется общим правилом FDI, а не `parseInt` без проверки:
		 * `parseInt("верхний")` даёт NaN, и NaN уходил в тело запроса как null.
		 * Number() вместо parseInt: parseInt("26абв") молча даёт 26, то есть
		 * принимает мусор за номер зуба.
		 */
		const toothNumber = Number(rawCode);
		if (rawCode === "" || !isValidFdiToothNumber(toothNumber)) {
			if (rawCode !== "") unreadableCodes.push(rawCode);
			continue;
		}

		// [CLN-01]: Разрешаем клиническое состояние зуба без самосаботажа
		const state = resolveToothStateFromDictationRow(row);
		if (state) {
			// Один зуб в двух строках подряд — берём первую и не пишем дважды
			if (!applied.some((item) => item.toothNumber === toothNumber)) {
				applied.push({ toothNumber, state });
			}
			continue;
		}

		// Если состояние совсем не распознано из словаря и не содержит диагноза
		manual.push({
			toothNumber,
			label: "распознанное состояние программе не знакомо",
		});
	}

	return { applied, manual, unreadableCodes };
}

export interface DictationMessage {
	readonly text: string;
	readonly tone: "success" | "warning" | "info";
}

/**
 * Что сказать человеку после диктовки.
 *
 * БЫЛО: «AI: Зуб 26 обновлен (Caries)» — латиница, жаргон и внутренний код
 * состояния в тексте для врача, причём зелёным даже когда ничего не записалось.
 * Счётные слова согласуются общим countLabel: «1 зуб», «2 зуба», «5 зубов».
 */
export function dictationApplyMessage(
	plan: DictationApplyPlan,
): DictationMessage {
	const parts: string[] = [];
	if (plan.applied.length > 0) {
		const listed = plan.applied
			.map((item) => `${item.toothNumber} — ${TOOTH_STATE_LABELS[item.state]}`)
			.join("; ");
		parts.push(
			`Отмечено на схеме, ${countLabel(plan.applied.length, "зуб", "зуба", "зубов")}: ${listed}.`,
		);
	}
	if (plan.manual.length > 0) {
		const listed = plan.manual
			.map((item) => `${item.toothNumber} — ${item.label}`)
			.join("; ");
		parts.push(
			`Отметьте сами, ${countLabel(plan.manual.length, "зуб", "зуба", "зубов")}: ${listed}.`,
		);
	}
	if (plan.unreadableCodes.length > 0) {
		parts.push(
			`Не разобран номер зуба: ${plan.unreadableCodes.join(", ")}. Назовите номер по схеме, например «двадцать шестой».`,
		);
	}
	if (parts.length === 0) {
		return {
			text: "В сказанном не нашлось ни номера зуба, ни состояния. Скажите короче: сначала номер зуба, потом что с ним, — например «двадцать шестой, отсутствует».",
			tone: "info",
		};
	}
	return {
		text: parts.join(" "),
		// Зелёным — только когда на схеме действительно что-то изменилось и
		// ничего не осталось на совести врача.
		tone:
			plan.applied.length > 0 &&
			plan.manual.length === 0 &&
			plan.unreadableCodes.length === 0
				? "success"
				: "warning",
	};
}

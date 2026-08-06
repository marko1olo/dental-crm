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

/** Состояния, которыми отвечает разбор диктовки (localDictationParser.ts). */
const DICTATION_STATES = [
	"treatment",
	"missing",
	"watch",
	"planned",
	"done",
	"prosthetics",
	"implant",
	"calculus",
] as const;

type DictationState = (typeof DICTATION_STATES)[number];

/**
 * Однозначные переводы в состояния схемы. Только те, где слово диктовки и
 * состояние формулы означают ровно одно и то же.
 */
const UNAMBIGUOUS_STATE: Partial<Record<DictationState, ToothState>> = {
	missing: "Missing",
	implant: "Implant",
	planned: "Planned_Implant",
};

/**
 * Как назвать распознанное человеку, когда отметить его на схеме нельзя.
 * Формулировка — словами врача, а не кодом разбора.
 */
const AMBIGUOUS_LABEL: Partial<Record<DictationState, string>> = {
	treatment:
		"лечение (кариес, пульпит или пломба — программа не знает, что именно)",
	done: "«вылечен» или «здоров» — программа не знает, что именно",
	prosthetics:
		"протезирование (коронка, винир или мост — программа не знает, что именно)",
	watch: "наблюдение — такого состояния на схеме нет",
	calculus: "налёт или зубной камень — такого состояния на схеме нет",
};

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

function dictationStateOf(value: unknown): DictationState | null {
	if (typeof value !== "string") return null;
	const normalized = value.trim().toLowerCase();
	return (DICTATION_STATES as readonly string[]).includes(normalized)
		? (normalized as DictationState)
		: null;
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
		const dictated = dictationStateOf(row.state);
		if (dictated === null) {
			// Слово состояния не из словаря сервера: придумывать диагноз нельзя.
			manual.push({
				toothNumber,
				label: "распознанное состояние программе не знакомо",
			});
			continue;
		}
		const state = UNAMBIGUOUS_STATE[dictated];
		if (state) {
			// Один зуб в двух строках подряд — берём первую и не пишем дважды.
			if (!applied.some((item) => item.toothNumber === toothNumber)) {
				applied.push({ toothNumber, state });
			}
			continue;
		}
		manual.push({
			toothNumber,
			label:
				AMBIGUOUS_LABEL[dictated] ??
				"распознанное состояние на схеме не выразить",
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

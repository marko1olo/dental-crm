import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	type BuildPanoramicArchOptions,
	buildPanoramicArch,
	type PanoramicArchResult,
} from "./panoramicArch";

/**
 * ПЛАНИРОВАНИЕ ИМПЛАНТАЦИИ ПЕРЕСТАЁТ УМИРАТЬ ВМЕСТЕ С ЭКРАНОМ.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ
 *
 * Врач открывал КЛКТ, включал «Дуга (Spline)» и обводил зубную дугу по
 * аксиальному срезу — это разметка, по которой строится ОПТГ и вокруг которой
 * планируется имплантация. Обведённая дуга жила ровно в двух местах, и оба
 * умирали при уходе с экрана:
 *   • в хранилище аннотаций cornerstone, которое `Cornerstone3DViewer`
 *     уничтожает своей же очисткой эффекта (`destroyToolGroup`, а рядом
 *     `cache.purgeCache()`);
 *   • в `useState` компонента — производная кривая развёртки и список имплантов.
 * Серверная половина при этом была дописана до конца: таблица
 * `patient_ct_plannings`, отбор по организации, upsert по паре
 * пациент + исследование. Адреса `/api/imaging/planning/save` и
 * `/api/imaging/planning/load` не упоминались в клиенте НИ РАЗУ — замерено
 * поиском по всему дереву. То есть врач размечал канал перед имплантацией,
 * уходил на другой экран и возвращался к пустому снимку.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ ОТДЕЛЬНО ОТ КОМПОНЕНТА
 *
 * Ровно по причине, записанной в `tests/periodBoundsGoToServerAsCalendarDate.test.ts`:
 * в дереве нет ни jsdom, ни happy-dom, тесты веба гоняются через `node --test`, а
 * `renderToStaticMarkup` эффекты не исполняет — значит `fetch` из `useEffect`
 * не случится и перехватывать было бы нечего. Поэтому и адрес, и заголовки, и
 * тело запроса собираются здесь, и это можно проверить перехватом
 * `globalThis.fetch`. Компонент остаётся местом, где решается КОГДА сохранять.
 *
 * Модуль не импортирует ни cornerstone, ни gl-matrix, ни `AppHelpers.tsx`: он
 * должен запускаться в node без браузера. Формы cornerstone описаны структурно —
 * тот же приём и та же причина, что в `panoramicArch.ts`.
 */

/** Адрес сохранения. Совпадает с `apps/api/src/routes/imaging_planning.ts`. */
export const CT_PLANNING_SAVE_URL = "/api/imaging/planning/save";

/** Адрес загрузки, без строки запроса. */
export const CT_PLANNING_LOAD_PATH = "/api/imaging/planning/load";

/**
 * ВНИМАНИЕ НА НЕСИММЕТРИЧНЫЕ ИМЕНА ПОЛЕЙ. Сохранение принимает исследование под
 * именем `studyInstanceUid` (в теле), а загрузка — под именем `studyUid` (в
 * строке запроса): `imaging_planning.ts:10` против `:17`. Это не опечатка здесь,
 * а живой контракт сервера, и клиент обязан соблюдать оба имени дословно.
 * Единственное место, где эта разница записана, — эта функция.
 */
export function ctPlanningLoadUrl(
	patientId: string,
	studyInstanceUid: string,
): string {
	const query = new URLSearchParams({ studyUid: studyInstanceUid, patientId });
	return `${CT_PLANNING_LOAD_PATH}?${query.toString()}`;
}

/** Точка разметки в МИРОВЫХ миллиметрах — та же система, что у cornerstone. */
export interface WorldPoint3 {
	x: number;
	y: number;
	z: number;
}

/**
 * Имплант в виде, пригодном для записи в базу.
 *
 * ПОЧЕМУ НЕ `ImplantData` КОМПОНЕНТА КАК ЕСТЬ. Там `startWorld`/`endWorld` —
 * это `vec3` из gl-matrix, то есть `Float32Array`. Замерено:
 * `JSON.stringify(vec3.fromValues(10,20,-50))` даёт `{"0":10,"1":20,"2":-50}` —
 * ОБЪЕКТ, а не массив, и `JSON.parse` от него возвращает объект со строковыми
 * ключами, а не вектор. Наивная запись компонентного состояния в базу сохранила
 * бы координаты импланта в форме, из которой вектор обратно не собирается.
 * Поэтому здесь тройки чисел, а превращение в `vec3` и обратно живёт в
 * компоненте, рядом с gl-matrix.
 */
export interface StoredImplant {
	id: string;
	fdiCode: string;
	diameter: number;
	length: number;
	startWorld: [number, number, number];
	endWorld: [number, number, number];
	boneDensity: { averageHU: number; classification: string };
	distanceToNerve: number;
}

/**
 * Вся разметка планирования одного исследования одного пациента.
 *
 * `nervePoints` СЕГОДНЯ ВСЕГДА ПУСТ, и это факт о компоненте, а не о базе:
 * инструмента обводки нижнечелюстного канала в `Cornerstone3DViewer` нет вовсе.
 * То, что выглядит как канал нерва в `simulateImplantPlacement`, — две вшитые
 * координаты внутри функции, не состояние и не разметка врача. Поле сохранено в
 * форме, потому что колонка и контракт сервера его ждут, и потому что появление
 * инструмента не должно требовать правки формата.
 */
export interface CtPlanningMarkup {
	/** Точки, которые врач поставил инструментом «Дуга (Spline)». */
	splinePoints: WorldPoint3[];
	/** Обводка нижнечелюстного канала. Инструмента для неё пока нет. */
	nervePoints: WorldPoint3[];
	implants: StoredImplant[];
}

export function emptyCtPlanningMarkup(): CtPlanningMarkup {
	return { splinePoints: [], nervePoints: [], implants: [] };
}

/** Пустая разметка не отправляется: незачем заводить строку ни о чём. */
export function ctPlanningMarkupIsEmpty(markup: CtPlanningMarkup): boolean {
	return (
		markup.splinePoints.length === 0 &&
		markup.nervePoints.length === 0 &&
		markup.implants.length === 0
	);
}

function finiteNumber(value: unknown): number | null {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return value;
}

/**
 * Тройка мировых координат из чего угодно, что могло оказаться в колонке.
 *
 * Принимает и массив/`Float32Array` (`[x,y,z]`), и объект с ключами `0/1/2` —
 * именно так выглядит `Float32Array`, прошедший через `JSON.stringify`. Второй
 * случай в базе появиться уже не должен, но строки могли быть записаны раньше
 * или другим клиентом, и разбор обязан их узнавать, а не тихо терять имплант.
 */
export function worldTriple(value: unknown): [number, number, number] | null {
	const source: unknown[] | null = Array.isArray(value)
		? value
		: value && typeof value === "object"
			? [
					(value as Record<string, unknown>)["0"],
					(value as Record<string, unknown>)["1"],
					(value as Record<string, unknown>)["2"],
				]
			: null;
	if (!source) return null;
	const x = finiteNumber(source[0]);
	const y = finiteNumber(source[1]);
	const z = finiteNumber(source[2]);
	if (x === null || y === null || z === null) return null;
	return [x, y, z];
}

/** Мировая точка cornerstone (`ArrayLike<number>`) в форму для записи. */
export function worldPointOf(value: unknown): WorldPoint3 | null {
	const triple = worldTriple(
		value &&
			typeof value === "object" &&
			"length" in (value as ArrayLike<number>)
			? Array.from(value as ArrayLike<number>)
			: value,
	);
	if (!triple) return null;
	return { x: triple[0], y: triple[1], z: triple[2] };
}

/**
 * Точки, которые врач поставил, из аннотации cornerstone.
 *
 * Читается `data.handles.points` — редактируемые точки врача, а НЕ
 * `data.contour.polyline`. Полилиния это плотная кривая, которую cornerstone
 * отрисовал по этим точкам: тысячи значений, из которых обратно не собрать то,
 * что можно двигать, и у замкнутого контура в ней есть лишний сегмент
 * (разобрано в `panoramicArch.ts`). В базу идёт то, что врач поставил руками.
 */
export function archControlPointsOf(
	annotations: readonly {
		data?:
			| { handles?: { points?: readonly unknown[] | undefined } | undefined }
			| undefined;
	}[],
): WorldPoint3[] {
	for (let i = annotations.length - 1; i >= 0; i--) {
		const raw = annotations[i]?.data?.handles?.points ?? [];
		const points: WorldPoint3[] = [];
		for (const candidate of raw) {
			const point = worldPointOf(candidate);
			if (point) points.push(point);
		}
		// Побеждает последняя пригодная аннотация — тот же порядок, что у
		// buildPanoramicArch: cornerstone дописывает новые в конец, значит врач
		// работает с последней.
		if (points.length > 0) return points;
	}
	return [];
}

/**
 * Дуга из СОХРАНЁННЫХ точек, без обращения к cornerstone.
 *
 * Это то, что делает восстановление полезным, а не декоративным: врач вернулся
 * на снимок, в хранилище аннотаций пусто, но развёртку можно построить по
 * прочитанной из базы разметке, не обводя дугу заново. Геометрия не
 * дублируется — точки заворачиваются в ту же структурную форму аннотации и
 * уходят в тот же `buildPanoramicArch`, который уже проверен своими тестами.
 */
export function archFromStoredControlPoints(
	points: readonly WorldPoint3[],
	options: BuildPanoramicArchOptions = {},
): PanoramicArchResult {
	return buildPanoramicArch(
		[
			{
				data: {
					handles: {
						points: points.map((point) => [point.x, point.y, point.z]),
					},
				},
			},
		],
		options,
	);
}

/** Тело запроса сохранения ровно в той форме, которую разбирает сервер. */
export interface CtPlanningSaveBody {
	patientId: string;
	studyInstanceUid: string;
	splinePointsJson: string;
	nervePointsJson: string;
	implantsJson: string;
}

export function ctPlanningSaveBody(
	patientId: string,
	studyInstanceUid: string,
	markup: CtPlanningMarkup,
): CtPlanningSaveBody {
	return {
		patientId,
		studyInstanceUid,
		// Сервер объявляет эти три поля строками (`z.string()`), а не массивами:
		// в колонках лежит текст. Строка собирается здесь, чтобы компонент не
		// решал за контракт.
		splinePointsJson: JSON.stringify(markup.splinePoints),
		nervePointsJson: JSON.stringify(markup.nervePoints),
		implantsJson: JSON.stringify(markup.implants),
	};
}

function parseJsonArray(value: unknown): unknown[] {
	// Колонка объявлена текстом, но прочитать можно и уже разобранный массив:
	// значение по умолчанию у колонки — '[]', и оно доходит до клиента массивом.
	if (Array.isArray(value)) return value;
	if (typeof value !== "string") return [];
	try {
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		// Битую строку молча считаем отсутствием разметки: показать врачу пустой
		// снимок честнее, чем уронить экран на разборе чужой записи.
		return [];
	}
}

function storedImplantOf(value: unknown): StoredImplant | null {
	if (!value || typeof value !== "object") return null;
	const raw = value as Record<string, unknown>;
	const startWorld = worldTriple(raw.startWorld);
	const endWorld = worldTriple(raw.endWorld);
	if (!startWorld || !endWorld) return null;
	const density = (raw.boneDensity ?? {}) as Record<string, unknown>;
	return {
		id:
			typeof raw.id === "string" && raw.id
				? raw.id
				: `restored-${startWorld.join("-")}`,
		fdiCode: typeof raw.fdiCode === "string" ? raw.fdiCode : "",
		diameter: finiteNumber(raw.diameter) ?? 0,
		length: finiteNumber(raw.length) ?? 0,
		startWorld,
		endWorld,
		boneDensity: {
			averageHU: finiteNumber(density.averageHU) ?? 0,
			classification:
				typeof density.classification === "string"
					? density.classification
					: "",
		},
		distanceToNerve: finiteNumber(raw.distanceToNerve) ?? 0,
	};
}

function worldPointsOf(value: unknown): WorldPoint3[] {
	const out: WorldPoint3[] = [];
	for (const candidate of parseJsonArray(value)) {
		const point =
			candidate && typeof candidate === "object" && !Array.isArray(candidate)
				? (() => {
						const raw = candidate as Record<string, unknown>;
						const x = finiteNumber(raw.x);
						const y = finiteNumber(raw.y);
						const z = finiteNumber(raw.z);
						return x === null || y === null || z === null
							? worldPointOf(candidate)
							: { x, y, z };
					})()
				: worldPointOf(candidate);
		if (point) out.push(point);
	}
	return out;
}

/** Строка `patient_ct_plannings`, как её отдаёт маршрут загрузки. */
export function parseCtPlanningMarkup(planning: unknown): CtPlanningMarkup {
	if (!planning || typeof planning !== "object") return emptyCtPlanningMarkup();
	const row = planning as Record<string, unknown>;
	const implants: StoredImplant[] = [];
	for (const candidate of parseJsonArray(row.implantsJson)) {
		const implant = storedImplantOf(candidate);
		if (implant) implants.push(implant);
	}
	return {
		splinePoints: worldPointsOf(row.splinePointsJson),
		nervePoints: worldPointsOf(row.nervePointsJson),
		implants,
	};
}

/**
 * Текст отказа для врача: что произошло, почему, что делать.
 *
 * ПОЧЕМУ ПРОВЕРКА «ПОНЯТНО ЛИ ЧЕЛОВЕКУ» ЗДЕСЬ СВОЯ. Каноническая живёт в
 * `AppHelpers.tsx` (`operatorReadableErrorDetail`), но это файл на шесть тысяч
 * строк, тянущий за собой всё приложение, а этот модуль обязан запускаться в
 * node без браузера — ровно за этим он и отделён от компонента. Условие взято
 * одно и то же: без русских букв текст сервера не показывается.
 */
function serverMessageForOperator(body: unknown): string | null {
	if (!body || typeof body !== "object") return null;
	const message = (body as Record<string, unknown>).message;
	if (typeof message !== "string") return null;
	const trimmed = message.trim();
	if (!trimmed || !/[А-Яа-яЁё]/.test(trimmed)) return null;
	return trimmed;
}

/**
 * Отказ сохранения. Врач в этот момент уже обвёл дугу, поэтому первое, что он
 * обязан услышать, — что обведённое не потеряно.
 */
export function ctPlanningSaveRefusalText(
	status: number | null,
	body: unknown,
): string {
	const fromServer = serverMessageForOperator(body);
	if (fromServer) return fromServer;
	if (status === null) {
		return (
			"Разметка не сохранена — сервер не ответил. Проверьте связь с сервером клиники и " +
			"нажмите «Сохранить разметку», обведённая дуга остаётся на экране."
		);
	}
	if (status === 401 || status === 403) {
		return (
			"Разметка не сохранена — рабочий кабинет клиники не определён. Вход в кабинет либо не " +
			"выполнен, либо его срок истёк. Войдите в кабинет клиники заново и нажмите «Сохранить " +
			"разметку», обведённая дуга остаётся на экране."
		);
	}
	if (status === 404) {
		return (
			"Разметка не сохранена — карточка пациента в этой клинике не найдена. Откройте снимок из " +
			"карточки пациента и нажмите «Сохранить разметку» снова."
		);
	}
	return (
		"Разметка не сохранена — сервер не смог её записать. Повторите через минуту, обведённая дуга " +
		"остаётся на экране."
	);
}

/** Отказ чтения. Пустой снимок без объяснения врач читает как потерю разметки. */
export function ctPlanningLoadRefusalText(
	status: number | null,
	body: unknown,
): string {
	const fromServer = serverMessageForOperator(body);
	if (fromServer) return fromServer;
	if (status === null) {
		return (
			"Сохранённую разметку не удалось прочитать — сервер не ответил. Проверьте связь с сервером " +
			"клиники и откройте снимок заново."
		);
	}
	if (status === 401 || status === 403) {
		return (
			"Сохранённую разметку не удалось прочитать — рабочий кабинет клиники не определён. Вход в " +
			"кабинет либо не выполнен, либо его срок истёк. Войдите в кабинет клиники заново и откройте " +
			"снимок ещё раз."
		);
	}
	if (status === 404) {
		return (
			"Сохранённую разметку не удалось прочитать — карточка пациента в этой клинике не найдена. " +
			"Откройте снимок из карточки пациента."
		);
	}
	return (
		"Сохранённую разметку не удалось прочитать — сервер ответил ошибкой. Откройте снимок заново " +
		"через минуту."
	);
}

export type CtPlanningSaveOutcome =
	| { status: "saved" }
	| { status: "refused"; message: string };

export type CtPlanningLoadOutcome =
	| { status: "loaded"; markup: CtPlanningMarkup; hadRow: boolean }
	| { status: "refused"; message: string };

async function jsonBodyOf(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

/**
 * ЗАГОЛОВКИ. Собираются `denteAdminSecretRequestHeaders` — тем же способом, что и
 * остальной клиент. Запрос без них молча получает 401, экран при этом выглядит
 * пустым, а не сломанным, и этот класс дефекта в дереве ловили многократно.
 * Подмена глобального `fetch` из `lib/apiAuthFetch.ts` те же токены тоже
 * подставляет, но полагаться только на неё нельзя: она идемпотентна по
 * `headers.has`, поэтому явные заголовки ничего не ломают, а вот её отсутствие
 * (другая точка входа, тест, будущий рефактор) оставило бы запрос без токена.
 */
export async function saveCtPlanningMarkup(
	patientId: string,
	studyInstanceUid: string,
	markup: CtPlanningMarkup,
): Promise<CtPlanningSaveOutcome> {
	let response: Response;
	try {
		response = await fetch(CT_PLANNING_SAVE_URL, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify(
				ctPlanningSaveBody(patientId, studyInstanceUid, markup),
			),
		});
	} catch {
		return {
			status: "refused",
			message: ctPlanningSaveRefusalText(null, null),
		};
	}
	if (!response.ok) {
		const body = await jsonBodyOf(response);
		return {
			status: "refused",
			message: ctPlanningSaveRefusalText(response.status, body),
		};
	}
	return { status: "saved" };
}

export async function loadCtPlanningMarkup(
	patientId: string,
	studyInstanceUid: string,
): Promise<CtPlanningLoadOutcome> {
	let response: Response;
	try {
		response = await fetch(ctPlanningLoadUrl(patientId, studyInstanceUid), {
			headers: denteAdminSecretRequestHeaders(),
		});
	} catch {
		return {
			status: "refused",
			message: ctPlanningLoadRefusalText(null, null),
		};
	}
	const body = await jsonBodyOf(response);
	if (!response.ok) {
		return {
			status: "refused",
			message: ctPlanningLoadRefusalText(response.status, body),
		};
	}
	const planning = (body as { planning?: unknown } | null)?.planning ?? null;
	return {
		status: "loaded",
		markup: parseCtPlanningMarkup(planning),
		hadRow: planning !== null,
	};
}

/**
 * Русская сводка того, что прочитано из базы. Восстановление, о котором врач не
 * узнал, равно отсутствию восстановления: он обведёт дугу заново.
 */
export function ctPlanningRestoredLabel(
	markup: CtPlanningMarkup,
): string | null {
	if (ctPlanningMarkupIsEmpty(markup)) return null;
	const parts: string[] = [];
	if (markup.splinePoints.length > 0)
		parts.push(`точек дуги ${markup.splinePoints.length}`);
	if (markup.nervePoints.length > 0)
		parts.push(`точек канала ${markup.nervePoints.length}`);
	if (markup.implants.length > 0)
		parts.push(`имплантов ${markup.implants.length}`);
	return `Разметка этого снимка восстановлена из базы: ${parts.join(", ")}.`;
}

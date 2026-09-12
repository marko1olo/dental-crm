import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * РАЗМЕТКА ПЛАНИРОВАНИЯ ИМПЛАНТАЦИИ ДОХОДИТ ДО СЕРВЕРА — И С ЗАГОЛОВКАМИ.
 *
 * Запуск (из apps/web):
 *   node --import tsx --import ./testCssStub.mjs --test \
 *     src/tests/ctPlanningMarkupReachesServer.test.ts
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Врач открывал КЛКТ, включал «Дуга (Spline)» и
 * обводил зубную дугу — разметку, вокруг которой планируется имплантация, — уходил
 * с экрана и возвращался к пустому снимку. Обведённое жило в хранилище аннотаций
 * cornerstone и в `useState`, и то и другое умирало при размонтировании
 * компонента. Серверная половина была дописана до конца: таблица
 * `patient_ct_plannings`, отбор по организации, upsert по паре
 * пациент + исследование. Адреса `/api/imaging/planning/save` и
 * `/api/imaging/planning/load` не упоминались в клиенте НИ РАЗУ.
 *
 * ПОЧЕМУ ПРОВЕРЯЕТСЯ ЗАПРОС, А НЕ СОСТОЯНИЕ КОМПОНЕНТА. В этом дереве самый
 * дорогой класс дефекта — «работа сделана, закоммичена и НЕДОСТИЖИМА»: три
 * починки диктовки не дошли до врача, потому что экран не открывался; панель
 * обзвона всегда посылала `?date=` и отменяла серверный расчёт; фотографии
 * лечения не открывались никогда, потому что `<img src>` уходил без заголовков и
 * получал 401. Зелёный тест на маршруте не доказывает работу пути, которым ходит
 * клиент. Поэтому здесь подменяется `globalThis.fetch` и читается то, что
 * УХОДИТ: адрес, способ, заголовки, тело.
 *
 * ПОЧЕМУ НЕ ЧЕРЕЗ ОТРИСОВКУ КОМПОНЕНТА. В дереве нет ни jsdom, ни happy-dom,
 * тесты веба гоняются через `node --test`, а `renderToStaticMarkup` эффекты не
 * исполняет — значит `fetch` из `useEffect` не случится и перехватывать было бы
 * нечего. Ровно та же причина записана в
 * `periodBoundsGoToServerAsCalendarDate.test.ts`. Поэтому запрос собирают
 * отдельные функции в `components/dicom/ctPlanningPersistence.ts`, а последние
 * проверки этого файла держат СВЯЗЬ: что компонент их действительно вызывает, что
 * пациент действительно доезжает до компонента, и что адреса не собираются больше
 * нигде.
 */

const webSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webSrc, "..", "..", "..");
const readWeb = (relative: string) =>
	readFileSync(path.join(webSrc, relative), "utf8");
const readApi = (relative: string) =>
	readFileSync(path.join(repoRoot, "apps", "api", "src", relative), "utf8");

/*
 * Значения токенов НАРОЧНО из латиницы и цифр, как настоящие подписанные токены.
 * Кириллица здесь ломает не проверку, а сам запрос: значение заголовка HTTP
 * обязано укладываться в ISO-8859-1, и `new Headers()` на русской строке бросает
 * TypeError. Первый вариант этого файла на этом и попался — запрос не уходил
 * вовсе, а отказ выглядел как «сервер не ответил».
 */
const CLINIC_TOKEN = "clinic-token-ct-planning-0001";
const STAFF_TOKEN = "staff-token-ct-planning-0001";
const PATIENT_ID = "c7000000-0000-4000-8000-00000000e001";
const STUDY_UID = "1.2.840.113619.2.55.3.604688.9.1755193200.1";

/**
 * `denteAdminSecretRequestHeaders` читает `localStorage` напрямую (без
 * `window.` префикса) под охраной `typeof window !== "undefined"`, поэтому в Node
 * нужны оба глобала. Токены здесь непустые именно для того, чтобы отсутствие
 * заголовка в запросе было видно как отсутствие, а не как пустое хранилище.
 */
before(() => {
	const store = new Map<string, string>([
		["dente_clinic_token", CLINIC_TOKEN],
		["dente_staff_token", STAFF_TOKEN],
	]);
	const localStorage = {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => void store.set(key, value),
	};
	const globalWithBrowser = globalThis as {
		window?: unknown;
		localStorage?: unknown;
	};
	globalWithBrowser.localStorage = localStorage;
	if (typeof globalWithBrowser.window === "undefined") {
		globalWithBrowser.window = {
			location: { origin: "https://crm.example.ru" },
			localStorage,
		};
	}
});

/**
 * Код без комментариев: замки ниже считают ВЫЗОВЫ, и упоминание имени в пояснении
 * не должно сходить за вызов — иначе тест зеленел бы на собственном объяснении
 * дефекта.
 *
 * ПОРЯДОК ЗДЕСЬ ОБРАТНЫЙ ТОМУ, ЧТО В `protectedApiFilesReachTheBrowser.test.ts`,
 * и это измерено, а не выбрано. Там строчные комментарии снимаются раньше
 * блочных; на этом файле такой порядок съел живой код. Причина: фильтр строк
 * выбрасывает строки, начинающиеся с `*`, а закрывающая строка блока JSDoc — это
 * ровно `*` со слэшем. Открывающая `/**` остаётся без своей закрывающей, и
 * нежадный поиск дотягивается до следующей закрывающей далеко ниже, унося с
 * собой всё между ними. Замерено: после такого снятия в исходнике оставался
 * ОДИН `saveMarkupNow(` из шести, и замок краснел на исправном коде.
 *
 * Поэтому блочные комментарии снимаются ПЕРВЫМИ, целиком со своей закрывающей, а
 * строчные — после.
 */
function withoutComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.split(/\r?\n/)
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}

interface CapturedRequest {
	url: string;
	method: string;
	headers: Record<string, string>;
	body: unknown;
}

/**
 * Перехват настоящего `globalThis.fetch`. Восстанавливается в `finally`:
 * оставленный перехват увёл бы запросы остальных проверок в пустоту.
 */
async function capturedRequestOf(
	run: () => Promise<unknown>,
	response: { status?: number; body?: unknown } = {},
): Promise<{ requests: CapturedRequest[]; result: unknown }> {
	const realFetch = globalThis.fetch;
	const requests: CapturedRequest[] = [];
	let result: unknown;

	globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
		const headers: Record<string, string> = {};
		new Headers(init?.headers ?? {}).forEach((value, key) => {
			headers[key.toLowerCase()] = value;
		});
		requests.push({
			url: typeof input === "string" ? input : String(input),
			method: init?.method ?? "GET",
			headers,
			body:
				typeof init?.body === "string"
					? JSON.parse(init.body)
					: (init?.body ?? null),
		});
		return new Response(JSON.stringify(response.body ?? { success: true }), {
			status: response.status ?? 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof globalThis.fetch;

	try {
		result = await run();
	} finally {
		globalThis.fetch = realFetch;
	}
	return { requests, result };
}

const MARKUP = {
	splinePoints: [
		{ x: -31.457, y: 12.004, z: -48.5 },
		{ x: 33.0625, y: 9.5, z: -48.5 },
	],
	nervePoints: [],
	implants: [
		{
			id: "impl-36",
			fdiCode: "36",
			diameter: 4,
			length: 10,
			startWorld: [10, 20, -50] as [number, number, number],
			endWorld: [10, 20, -60] as [number, number, number],
			boneDensity: { averageHU: 650, classification: "D2" },
			distanceToNerve: 2.236,
		},
	],
};

describe("разметка планирования имплантации уходит на сервер по нужному адресу и с токеном", () => {
	test("сохранение бьёт в тот адрес, который обслуживает сервер", async () => {
		const { saveCtPlanningMarkup, CT_PLANNING_SAVE_URL } = await import(
			"../components/dicom/ctPlanningPersistence.js"
		);

		// Адрес вынимается из живого исходника маршрута, а не из памяти: если
		// сервер его переименует, красный тест обязан говорить о НОВОМ адресе.
		const route = readApi(path.join("routes", "imaging_planning.ts"));
		const served = [...route.matchAll(/app\.(?:post|get)\("([^"]+)"/g)].map(
			(m) => m[1] ?? "",
		);
		assert.ok(
			served.includes(CT_PLANNING_SAVE_URL),
			`клиент просит ${CT_PLANNING_SAVE_URL}, а сервер обслуживает ${served.join(", ")}`,
		);

		const { requests } = await capturedRequestOf(() =>
			saveCtPlanningMarkup(PATIENT_ID, STUDY_UID, MARKUP),
		);
		assert.equal(
			requests.length,
			1,
			`ожидался ровно один запрос, случилось ${requests.length}`,
		);
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const request = requests[0]!;
		assert.equal(request.url, CT_PLANNING_SAVE_URL);
		assert.equal(request.method, "POST");
	});

	test("запрос сохранения несёт токены кабинета и сотрудника", async () => {
		const { saveCtPlanningMarkup } = await import(
			"../components/dicom/ctPlanningPersistence.js"
		);
		const { requests } = await capturedRequestOf(() =>
			saveCtPlanningMarkup(PATIENT_ID, STUDY_UID, MARKUP),
		);
		const headers = requests[0]?.headers ?? {};

		// БЕЗ ЭТИХ ЗАГОЛОВКОВ запрос молча получает 401, а экран выглядит пустым,
		// а не сломанным — этот класс дефекта в дереве ловили многократно.
		assert.equal(
			headers["x-dente-clinic-token"],
			CLINIC_TOKEN,
			`запрос ушёл без токена кабинета: ${JSON.stringify(headers)}`,
		);
		assert.equal(
			headers["x-dente-staff-token"],
			STAFF_TOKEN,
			`запрос ушёл без токена сотрудника: ${JSON.stringify(headers)}`,
		);
		assert.match(String(headers["content-type"] ?? ""), /application\/json/);
	});

	test("в теле уходят ровно те поля, которые разбирает сервер", async () => {
		const { saveCtPlanningMarkup } = await import(
			"../components/dicom/ctPlanningPersistence.js"
		);
		const { requests } = await capturedRequestOf(() =>
			saveCtPlanningMarkup(PATIENT_ID, STUDY_UID, MARKUP),
		);
		const body = requests[0]?.body as Record<string, unknown>;

		assert.deepEqual(
			Object.keys(body).sort(),
			[
				"implantsJson",
				"nervePointsJson",
				"patientId",
				"splinePointsJson",
				"studyInstanceUid",
			],
			"состав тела запроса разошёлся со схемой сервера",
		);
		assert.equal(body.patientId, PATIENT_ID);
		assert.equal(body.studyInstanceUid, STUDY_UID);
		// Сервер объявил эти три поля строками (`z.string()`), а не массивами.
		assert.equal(typeof body.splinePointsJson, "string");
		assert.equal(typeof body.nervePointsJson, "string");
		assert.equal(typeof body.implantsJson, "string");
		assert.deepEqual(
			JSON.parse(String(body.splinePointsJson)),
			MARKUP.splinePoints,
		);
		assert.deepEqual(JSON.parse(String(body.implantsJson)), MARKUP.implants);
	});

	test("чтение спрашивает исследование именем studyUid, а не studyInstanceUid", async () => {
		const { loadCtPlanningMarkup, CT_PLANNING_LOAD_PATH } = await import(
			"../components/dicom/ctPlanningPersistence.js"
		);
		const { requests } = await capturedRequestOf(
			() => loadCtPlanningMarkup(PATIENT_ID, STUDY_UID),
			{ body: { success: true, planning: null } },
		);
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const request = requests[0]!;

		/*
		 * НЕСИММЕТРИЧНЫЙ КОНТРАКТ СЕРВЕРА, и он проверяется живым исходником, а не
		 * памятью: сохранение принимает `studyInstanceUid` в теле, а чтение —
		 * `studyUid` в строке запроса (`imaging_planning.ts`). Промах здесь дал бы
		 * 400 и пустой снимок у врача, который только что всё разметил.
		 */
		const route = readApi(path.join("routes", "imaging_planning.ts"));
		assert.match(
			route,
			/loadPlanningQuerySchema\s*=\s*z\.object\(\{\s*studyUid:/,
		);

		const url = new URL(request.url, "https://crm.example.ru");
		assert.equal(url.pathname, CT_PLANNING_LOAD_PATH);
		assert.equal(url.searchParams.get("studyUid"), STUDY_UID);
		assert.equal(url.searchParams.get("patientId"), PATIENT_ID);
		assert.equal(url.searchParams.get("studyInstanceUid"), null);
		assert.equal(requests[0]?.headers["x-dente-clinic-token"], CLINIC_TOKEN);
	});

	test("круг замыкается: то, что ушло, разбирается обратно тем же", async () => {
		const { ctPlanningSaveBody, parseCtPlanningMarkup } = await import(
			"../components/dicom/ctPlanningPersistence.js"
		);
		const body = ctPlanningSaveBody(PATIENT_ID, STUDY_UID, MARKUP);
		// Сервер отдаёт обратно те же три строки — это доказано
		// apps/api/src/tests/routes/ctPlanningMarkupPersists.test.ts.
		const parsed = parseCtPlanningMarkup({
			splinePointsJson: body.splinePointsJson,
			nervePointsJson: body.nervePointsJson,
			implantsJson: body.implantsJson,
		});
		assert.deepEqual(parsed.splinePoints, MARKUP.splinePoints);
		assert.deepEqual(parsed.implants, MARKUP.implants);
		assert.deepEqual(parsed.nervePoints, []);
	});

	test("координаты импланта не превращаются в объект с ключами 0/1/2", async () => {
		const { ctPlanningSaveBody, parseCtPlanningMarkup, worldTriple } =
			await import("../components/dicom/ctPlanningPersistence.js");

		/*
		 * ЗАМЕРЕНО: `vec3` из gl-matrix — это `Float32Array`, и
		 * `JSON.stringify(vec3.fromValues(10,20,-50))` даёт `{"0":10,"1":20,"2":-50}`,
		 * то есть ОБЪЕКТ. Наивная запись состояния компонента сохранила бы координаты
		 * импланта в форме, из которой вектор обратно не собирается. Поэтому в тело
		 * запроса обязаны уходить массивы.
		 */
		const fromFloat32 = worldTriple(
			Array.from(new Float32Array([10, 20, -50])),
		);
		assert.deepEqual(fromFloat32, [10, 20, -50]);

		const body = ctPlanningSaveBody(PATIENT_ID, STUDY_UID, MARKUP);
		assert.ok(
			/"startWorld":\[10,20,-50\]/.test(body.implantsJson),
			`координаты импланта ушли не массивом: ${body.implantsJson}`,
		);

		// И обратный разбор терпит старую форму объекта, если она где-то осталась.
		const legacy = parseCtPlanningMarkup({
			implantsJson: JSON.stringify([
				{
					...MARKUP.implants[0],
					startWorld: { 0: 1, 1: 2, 2: 3 },
					endWorld: { 0: 4, 1: 5, 2: 6 },
				},
			]),
		});
		assert.deepEqual(legacy.implants[0]?.startWorld, [1, 2, 3]);
	});

	test("отказ сервера превращается в русский текст с причиной и действием", async () => {
		const { saveCtPlanningMarkup, loadCtPlanningMarkup } = await import(
			"../components/dicom/ctPlanningPersistence.js"
		);

		for (const status of [401, 404, 500]) {
			const { result } = await capturedRequestOf(
				() => saveCtPlanningMarkup(PATIENT_ID, STUDY_UID, MARKUP),
				{ status, body: { error: "Nope" } },
			);
			const outcome = result as { status: string; message?: string };
			assert.equal(
				outcome.status,
				"refused",
				`отказ ${status} принят за успех`,
			);
			const message = String(outcome.message ?? "");
			assert.ok(
				/[А-Яа-яЁё]/.test(message),
				`отказ ${status} без русского текста: ${message}`,
			);
			// Третья часть текста — что делать дальше. Отказ без неё это код ответа
			// русскими словами, то есть тот же дефект.
			assert.ok(
				/Войдите|Откройте|Повторите|нажмите/.test(message),
				`в отказе ${status} нет действия: ${message}`,
			);
			// И обещание, что обведённое не потеряно: без него врач бросает работу.
			assert.ok(/остаётся на экране|Откройте снимок/.test(message), message);
		}

		// Человеческий текст сервера главнее своего: он знает причину точнее.
		const { result: withServerText } = await capturedRequestOf(
			() => saveCtPlanningMarkup(PATIENT_ID, STUDY_UID, MARKUP),
			{
				status: 404,
				body: { error: "Patient not found", message: "Карточки пациента нет." },
			},
		);
		assert.equal(
			(withServerText as { message: string }).message,
			"Карточки пациента нет.",
		);

		// Латиница без русских букв гасится — интерфейс такой текст не показывает.
		const { result: technical } = await capturedRequestOf(
			() => loadCtPlanningMarkup(PATIENT_ID, STUDY_UID),
			{ status: 500, body: { message: "Internal server error" } },
		);
		const message = (technical as { message: string }).message;
		assert.ok(
			!message.includes("Internal"),
			`технический текст сервера дошёл до врача: ${message}`,
		);
		assert.ok(/[А-Яа-яЁё]/.test(message));
	});

	test("сеть молчит — врач получает текст, а не пустой экран", async () => {
		const { saveCtPlanningMarkup } = await import(
			"../components/dicom/ctPlanningPersistence.js"
		);
		const realFetch = globalThis.fetch;
		globalThis.fetch = (async () => {
			throw new TypeError("Failed to fetch");
		}) as typeof globalThis.fetch;
		try {
			const outcome = await saveCtPlanningMarkup(PATIENT_ID, STUDY_UID, MARKUP);
			assert.equal(outcome.status, "refused");
			assert.ok(
				/[А-Яа-яЁё]/.test(outcome.status === "refused" ? outcome.message : ""),
			);
		} finally {
			globalThis.fetch = realFetch;
		}
	});

	/**
	 * ЗАМОК НА ВЫЗЫВАЮЩЕГО. Проверки выше держат функции запроса. Если компонент
	 * перестанет их звать — а именно так этот дефект и выглядел: серверная половина
	 * дописана, клиент не вызывает её НИ РАЗУ, — все проверки выше останутся
	 * зелёными, а разметка снова начнёт умирать вместе с экраном. Граница ставится
	 * здесь.
	 *
	 * СЧИТАЮТСЯ ИМЕННО ВЫЗОВЫ, А НЕ УПОМИНАНИЯ. Первая версия этой проверки искала
	 * `viewer.includes("saveCtPlanningMarkup")` — и осталась ЗЕЛЁНОЙ после того, как
	 * из компонента были вырезаны ВСЕ вызовы сохранения: имя всё ещё встречалось в
	 * импорте и в объявлении обёртки. Это тот же дефект достижимости, только теперь
	 * в собственном тесте, поэтому здесь снимаются комментарии и пересчитываются
	 * места вызова.
	 */
	test("просмотрщик КЛКТ действительно сохраняет и читает разметку", () => {
		const viewer = withoutComments(
			readWeb(path.join("components", "dicom", "Cornerstone3DViewer.tsx")),
		);

		assert.match(
			viewer,
			/await saveCtPlanningMarkup\(/,
			"Cornerstone3DViewer больше не зовёт saveCtPlanningMarkup: разметка снова умирает вместе с экраном",
		);
		assert.match(
			viewer,
			/loadCtPlanningMarkup\(\s*patientId\s*,/,
			"Cornerstone3DViewer больше не читает сохранённую разметку при открытии снимка",
		);

		/*
		 * МОМЕНТЫ ЗАПИСИ, каждый — законченное действие врача. Пересчитываются
		 * ВЫЗОВЫ обёртки `saveMarkupNow(...)` без её объявления: завершение обвода,
		 * отложенная запись правки, постановка импланта, уход с экрана и кнопка.
		 * Меньше пяти означает, что какой-то момент записи потерян, и разметка,
		 * сделанная в этот момент, до базы не доедет.
		 */
		/*
		 * Объявление считается отдельно и в число вызовов НЕ входит: оно записано
		 * как `const saveMarkupNow = async (...)`, то есть за именем стоит пробел с
		 * равенством, а не скобка. Первая версия вычитала объявление из числа
		 * вхождений `saveMarkupNow(` и поэтому недосчитывала один живой вызов —
		 * замок краснел на исправном коде.
		 */
		const invocations = (viewer.match(/saveMarkupNow\(/g) ?? []).length;
		assert.equal(
			(viewer.match(/const saveMarkupNow\s*=/g) ?? []).length,
			1,
			"обёртка сохранения объявлена не один раз",
		);
		assert.ok(
			invocations >= 5,
			`мест записи разметки осталось ${invocations}, было пять: ` +
				"завершение обвода, отложенная правка, постановка импланта, уход с экрана, кнопка",
		);

		// Завершение обвода и правка уже обведённого — оба должны быть подписаны.
		assert.match(
			viewer,
			/addEventListener\(\s*cornerstoneTools\.Enums\.Events\.ANNOTATION_COMPLETED/,
			"пропала запись по завершению обвода дуги — основной момент сохранения",
		);
		assert.match(
			viewer,
			/addEventListener\(\s*cornerstoneTools\.Enums\.Events\.ANNOTATION_MODIFIED/,
			"пропала запись правки уже обведённой дуги — врач теряет исправления",
		);
		// И задержка перед записью правки: без неё перетаскивание точки уйдёт в
		// базу десятками запросов в секунду.
		assert.match(
			viewer,
			/setTimeout\(/,
			"пропала задержка записи: правка дуги зальёт базу запросами",
		);

		// Код исследования обязан читаться из метаданных DICOM. У этого загрузчика
		// studyInstanceUID лежит в generalSeriesModule, и это единственный
		// устойчивый ключ разметки: imageId вида `dicomfile:<n>` живёт одну сессию.
		assert.match(
			viewer,
			/metaData\.get\(\s*"generalSeriesModule"/,
			"код исследования больше не читается из метаданных: ключ разметки стал неустойчивым",
		);
	});

	test("пациент доезжает из экрана снимков до просмотрщика", () => {
		const imagingView = readWeb("ImagingView.tsx");
		const mount = imagingView.match(/<Cornerstone3DViewer[^>]*\/>/);
		assert.ok(mount, "просмотрщик КЛКТ больше не смонтирован из ImagingView");
		assert.match(
			mount[0],
			/patientId=/,
			"пациент перестал доезжать до просмотрщика: разметку некуда сохранять, " +
				`строка монтирования ${mount[0]}`,
		);
	});

	test("адреса разметки собираются ровно в одном месте", () => {
		const viewer = readWeb(
			path.join("components", "dicom", "Cornerstone3DViewer.tsx"),
		);
		// Обход собственных адресов мимо модуля вернул бы запрос без заголовков —
		// ровно тот дефект, который здесь закрывается.
		assert.ok(
			!viewer.includes("/api/imaging/planning"),
			"адрес разметки снова собирается в компоненте: заголовки собираются не там",
		);
	});
});

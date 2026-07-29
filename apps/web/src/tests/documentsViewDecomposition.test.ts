import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * ЧЕМ ВРЕДИТ ИМЕННО ВЫНОС КОДА, А НЕ ОБЫЧНАЯ ПРАВКА: ВТОРОЙ ВЛАДЕЛЕЦ ОДНОГО ИМЕНИ.
 *
 * Запуск: из apps/web
 *   node --import tsx --test src/tests/documentsViewDecomposition.test.ts
 *
 * Файл отдельный от documentPayloadForms.test.ts намеренно. Там формы рисуются
 * по-настоящему, поэтому туда тянется весь граф импортов приложения — вплоть до
 * AppHelpers и оболочки рабочего пространства. Достаточно одному файлу в этом
 * графе импортировать .css, и под tsx гаснет ВЕСЬ тест-файл, вместе с дешёвыми
 * проверками исходников, которым никакой граф не нужен. Здесь нет ни одного
 * импорта из приложения: только чтение текста. Такую проверку нельзя погасить
 * чужой правкой в соседнем модуле.
 *
 * Проверяется два следствия выноса семи форм документов:
 *  1. родитель продолжал объявлять состояние форм, которых больше не рисует —
 *     173 имени из 814, вынутых из хранилища документов, не читались в файле
 *     нигде. Компилятор такое не ловит: `noUnusedLocals` в tsconfig.base.json не
 *     включён, а `npm run lint` сводится к typecheck. Имя поля жило в двух
 *     местах, и правка доходила до одного из них;
 *  2. вынесенный файл, которого не импортирует никто, — не прогресс, а вторая
 *     копия правды. Ровно так уже лежал forms/TaxDeductionApplicationForm.tsx,
 *     пока экран рисовал его копию внутри себя.
 */

const here = dirname(fileURLToPath(import.meta.url));
const webSrc = join(here, "..");
const read = (relativePath: string) => readFileSync(join(webSrc, relativePath), "utf8");

const documentsView = read("DocumentsView.tsx");

/**
 * Код без комментариев. Порядок важен и один раз уже соврал: в строчном
 * комментарии DocumentsView.tsx стоит путь до каталога вынесенных форм со
 * звёздочками, и в нём есть открывающая последовательность блочного
 * комментария. Снятие блочных комментариев первым съедало 870 строк живого кода
 * до ближайшей закрывающей последовательности, после чего четыре используемых
 * поля объявлялись мёртвыми. Поэтому строчные комментарии снимаются раньше
 * блочных. Хвостовой комментарий в одной строке с кодом остаётся: упоминание
 * имени в нём сойдёт за использование — проверка от этого слабее, зато никогда
 * не краснеет на пустом месте.
 */
function withoutComments(source: string): string {
	return source
		.split(/\r?\n/)
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n")
		.replace(/\/\*[\s\S]*?\*\//g, " ");
}

interface DestructureBlock {
	body: string;
	start: number;
	end: number;
}

/** Блоки `const { … } = useDocumentStore();` вместе с их границами в тексте. */
function storeDestructureBlocks(code: string): DestructureBlock[] {
	const marker = "= useDocumentStore();";
	const blocks: DestructureBlock[] = [];
	let searchFrom = 0;
	for (;;) {
		const markerAt = code.indexOf(marker, searchFrom);
		if (markerAt < 0) break;
		searchFrom = markerAt + marker.length;
		const openAt = code.lastIndexOf("const {", markerAt);
		const closeAt = code.lastIndexOf("}", markerAt);
		if (openAt < 0 || closeAt < openAt) continue;
		blocks.push({ body: code.slice(openAt + "const {".length, closeAt), start: openAt, end: searchFrom });
	}
	return blocks;
}

/** Код без самих блоков разбора: остаётся только то, что к полям действительно обращается. */
function sourceWithoutBlocks(code: string, blocks: DestructureBlock[]): string {
	let rest = code;
	for (const block of [...blocks].sort((a, b) => b.start - a.start)) {
		rest = rest.slice(0, block.start) + rest.slice(block.end);
	}
	return rest;
}

function destructuredNames(blocks: DestructureBlock[]): string[] {
	const names: string[] = [];
	for (const block of blocks) {
		for (const line of block.body.split(/\r?\n/)) {
			const trimmed = line.trim().replace(/,$/, "");
			if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) names.push(trimmed);
		}
	}
	return names;
}

describe("экран не объявляет состояние форм, которых не рисует", () => {
	const documentsViewCode = withoutComments(documentsView);
	const blocks = storeDestructureBlocks(documentsViewCode);

	it("оба разбора хранилища документов найдены", () => {
		assert.equal(
			blocks.length,
			2,
			`в DocumentsView.tsx найдено ${blocks.length} разборов useDocumentStore(), а не 2 — проверка ниже смотрела бы не туда`,
		);
	});

	it("разбор читается целиком: ни одной строки проверка не пропускает молча", () => {
		const unparsed: string[] = [];
		for (const block of blocks) {
			for (const line of block.body.split(/\r?\n/)) {
				const trimmed = line.trim().replace(/,$/, "");
				if (!trimmed || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
				if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) unparsed.push(trimmed);
			}
		}
		assert.deepEqual(
			unparsed,
			[],
			`в разборе хранилища появилась запись другого вида (${unparsed.join(", ")}) — она обошла бы проверку молча, дополните разбор`,
		);
	});

	it("каждое вынутое из хранилища поле экран действительно читает", () => {
		const names = destructuredNames(blocks);
		assert.ok(names.length > 600, `разобрано всего ${names.length} полей — похоже, сломался разбор, а не экран`);

		const rest = sourceWithoutBlocks(documentsViewCode, blocks);
		const unused = names.filter((name) => !new RegExp(`\\b${name}\\b`).test(rest));
		assert.deepEqual(
			unused,
			[],
			`DocumentsView.tsx объявляет ${unused.length} полей хранилища, которых не читает (${unused.slice(0, 8).join(", ")}). Это второй владелец одного имени: правка дойдёт до формы и молча минует экран`,
		);
	});

	it("все восемь кнопок-подсказок дописывают текст одной функцией", () => {
		assert.equal(
			documentsView.match(/appendChipToText\(/g)?.length,
			4,
			"в DocumentsView.tsx должно остаться ровно четыре вызова appendChipToText: договор оказания услуг и три поля сметы",
		);
		assert.ok(
			!/const current = \w+\.trim\(\);/.test(documentsView),
			"в DocumentsView.tsx снова появилась своя копия дописывания формулировки вместо appendChipToText",
		);
		const refusal = read("components/documents/forms/MedicalInterventionRefusalForm.tsx");
		assert.equal(
			refusal.match(/appendChipToText\(/g)?.length,
			4,
			"в форме отказа четыре ряда кнопок-подсказок, и все должны идти через appendChipToText",
		);
	});
});

/**
 * Файлы каталога документов, до которых пользователь пока не может добраться.
 * Список пустой = сирот нет. Каждая запись — заявленный долг, а не тихая находка.
 */
const knownUnwiredDocumentComponents: readonly string[] = [
	/*
	 * СПИСОК ПУСТ: сирот в каталоге документов больше нет.
	 *
	 * Здесь стояла кнопка подписания УКЭП (DocumentUkepSignButton.tsx), и обе
	 * прежние редакции этой записи говорили о сервере неправду в разные стороны.
	 * Сначала — «Путь на сервере рабочий», из чего следовало, что осталось только
	 * смонтировать; это утверждение однажды завело разбор не туда. Потом поправка:
	 * маршрута нет, потому что register в documents/signUkep.ts не вызывал никто, и
	 * монтировать нельзя, пока apps/api не проведёт его до Fastify.
	 *
	 * ТЕПЕРЬ ПРОВЕДЁН, И ЭТО ЗАМЕРЕНО В ПРОЦЕССЕ, А НЕ ВЫЧИТАНО ГЛАЗАМИ.
	 * registerDocumentRoutes зовёт registerSignUkep, а проб
	 * apps/api/src/tests/routes/documentUkepSignProof.ts ходит через app.inject по
	 * живой PostgreSQL: 401 без токена сотрудника (до регистрации на этом месте был
	 * HTTP 404 с телом Fastify «Route POST:/api/documents/<…>/sign-ukep not found»),
	 * 400 на пустую подпись, 200 на подписание, подпись читается из колонки
	 * независимым SQL, 409 на повторное подписание с непотёртой первой подписью,
	 * 404 на попытку из чужой клиники.
	 *
	 * Кнопка смонтирована в DocumentsView.tsx, в ячейке «Подписание» паспорта
	 * выдачи документа — она открывается для одного документа, и это обязательное
	 * свойство места: у списка сертификатов постоянный идентификатор
	 * ukep-cert-select, а компонент при появлении читает хранилище КриптоПро.
	 * Разбор целиком — в src/tests/panelsAreMounted.test.ts, на месте строки долга.
	 */
];

describe("в каталоге документов нет незамеченных сирот", () => {
	function sourceFiles(directory: string, relative = ""): string[] {
		const found: string[] = [];
		for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
			const next = relative ? `${relative}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				found.push(...sourceFiles(join(directory, entry.name), next));
				continue;
			}
			if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) found.push(next);
		}
		return found;
	}

	const documentFiles = sourceFiles(join(webSrc, "components", "documents"));
	/** Импорт ищется по всему apps/web/src: компонент документов вправе подключить любой экран. */
	const allWebFiles = sourceFiles(webSrc).filter((file) => !file.includes("/tests/") && !file.startsWith("tests/"));

	it("каталог документов найден и виден целиком", () => {
		assert.ok(
			documentFiles.length >= 13,
			`в components/documents найдено ${documentFiles.length} файлов исходников — ожидалось не меньше 13`,
		);
		assert.ok(allWebFiles.length > 100, `по apps/web/src найдено ${allWebFiles.length} файлов — обход сломался`);
	});

	for (const file of documentFiles) {
		const baseName = file.slice(file.lastIndexOf("/") + 1);
		const moduleName = baseName.replace(/\.tsx?$/, "");
		const declaredUnwired = knownUnwiredDocumentComponents.includes(baseName);

		it(`${file}: ${declaredUnwired ? "заявленный долг, подключения нет" : "его кто-то импортирует"}`, () => {
			const selfPath = `components/documents/${file}`;
			const importPattern = new RegExp(`(?:from|import) "[^"]*${moduleName}"`);
			const importers = allWebFiles.filter((other) => other !== selfPath && importPattern.test(read(other)));

			if (declaredUnwired) {
				assert.deepEqual(
					importers,
					[],
					`${file} наконец подключили (${importers.join(", ")}) — уберите её из knownUnwiredDocumentComponents, долга больше нет`,
				);
				return;
			}
			assert.ok(
				importers.length > 0,
				`${file} не импортирует никто: это сирота. Либо подключите её, либо удалите файл — иначе вторая копия правды молча разойдётся с живым экраном`,
			);
		});
	}
});

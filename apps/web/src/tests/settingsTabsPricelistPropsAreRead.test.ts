import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * ПРОПС, КОТОРЫЙ ВЫНУЛИ И НЕ ПРОЧИТАЛИ, — ЭТО НЕ ЛИШНЯЯ СТРОКА, А ВТОРОЙ ВЛАДЕЛЕЦ ИМЕНИ.
 *
 * Запуск: из apps/web
 *   node --import tsx --import ./testCssStub.mjs --test src/tests/settingsTabsPricelistPropsAreRead.test.ts
 *
 * Разбор прайса считает материал, бренд, тип реставрации и складывает коды
 * предупреждений (apps/api/src/pricelist/analyzer.ts). Пока три вкладки настроек
 * вынимали из общего мешка подписи к этим полям и НЕ рисовали их, отказ разбора
 * выглядел на экране как молчаливая потеря цены: analyzer жаловался на поле,
 * которого клиника не видела нигде. Признак ровно такой — имя встречается в файле
 * РОВНО ОДИН раз, в строке деструктуризации, и обрывается на ней.
 *
 * Компилятор этого не ловит: `noUnusedLocals` в tsconfig.base.json не включён, а
 * `npm run lint` сводится к typecheck. Обе тяжёлые вкладки к тому же объявлены как
 * `props: Record<string, any>` и получают мешок через `{...settingsProps}` — со
 * стороны родителя тоже никакой типовой сигнал не приходит.
 *
 * Проверка нарочно не смотрит, ЧТО именно нарисовано: решений два и оба законны —
 * вкладка рисует значение сама либо не берёт его вовсе. Незаконен ровно третий
 * исход, «вынули и бросили», и он единственный, который здесь краснеет.
 *
 * Импортов из приложения в файле нет, только чтение текста: граф импортов
 * настроек тянет .css, и под tsx один такой импорт гасит весь тест-файл.
 */

const here = dirname(fileURLToPath(import.meta.url));
const settingsDir = join(here, "..", "components", "settings");

/**
 * Код без комментариев. Порядок важен: строчные комментарии снимаются раньше
 * блочных, иначе `/*` внутри строки-пути съел бы живой код до ближайшего
 * закрывателя. Приём и обоснование — из documentsViewDecomposition.test.ts.
 *
 * Для этой проверки снятие комментариев обязательно, а не косметика: объяснение
 * «почему имя убрано» законно называет соседние живые функции, и без снятия
 * комментариев упоминание в прозе сошло бы за чтение значения.
 */
function withoutComments(source: string): string {
	return source
		.split(/\r?\n/)
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n")
		.replace(/\/\*[\s\S]*?\*\//g, " ");
}

interface TabUnderTest {
	/** Файл вкладки в components/settings. */
	readonly file: string;
	/** Источник мешка значений: `= props;` или `= mergedProps;`. */
	readonly bagName: string;
	/**
	 * Нижняя граница числа разобранных имён. Нужна, чтобы поломка разбора
	 * блока не выглядела как «дефектов нет»: пустой список имён проходит любую
	 * проверку на мёртвые имена молча.
	 */
	readonly minimumDestructuredNames: number;
	/**
	 * Требовать чистоты по ВСЕМ именам вкладки, а не только по прайсовым.
	 * Включено там, где это уже достигнуто; см. объявленный долг ниже.
	 */
	readonly everyNameMustBeRead: boolean;
	/**
	 * ХРАПОВИК ОБЪЯВЛЕННОГО ДОЛГА: замеренное число мёртвых имён на этой правке.
	 *
	 * Без него `everyNameMustBeRead: false` — просто способ сделать проверку
	 * зелёной: долг объявлен, и дальше в него можно доливать сколько угодно.
	 * Число работает в обе стороны. Вырос долг — красный, потому что появился
	 * новый мёртвый пропс. Упал до нуля — тоже красный, потому что запись о долге
	 * начала врать читателю, и её место занимает `everyNameMustBeRead: true`.
	 * Идиом взят у declaredMissingUi в scripts/smoke-pricelist-analyzer.mjs, где
	 * незакрытая запись о СДЕЛАННОМ пропуске уже стоила кампании красного HEAD.
	 *
	 * Для вкладки с полной чистотой это ноль, и храповик совпадает с общей
	 * проверкой — так и должно быть.
	 */
	readonly measuredDeadNames: number;
}

const tabsUnderTest: readonly TabUnderTest[] = [
	{
		file: "SettingsPricesTab.tsx",
		bagName: "mergedProps",
		minimumDestructuredNames: 20,
		everyNameMustBeRead: true,
		measuredDeadNames: 0,
	},
	{
		file: "SettingsAuditTab.tsx",
		bagName: "props",
		minimumDestructuredNames: 400,
		/*
		 * ОБЪЯВЛЕННЫЙ ДОЛГ, А НЕ ПОСЛАБЛЕНИЕ ПОД ЗЕЛЁНЫЙ ЦВЕТ.
		 *
		 * Замерено на этой правке (обход блока деструктуризации, комментарии
		 * сняты): SettingsAuditTab вынимает 478 имён и не читает 338 из них,
		 * SettingsImportsTab — 481 и 251. Прайсовых среди них больше нет ни
		 * одного, и это то, что проверка держит. Остальные 338 и 251 — след того
		 * же разбора монолита настроек на вкладки: мешок скопировали целиком.
		 * Снимать их одним заходом здесь нельзя, это отдельный предмет размером
		 * с обе вкладки; поставить сюда true, не сняв их, — способ сделать
		 * проверку красной и перестать её читать.
		 */
		everyNameMustBeRead: false,
		measuredDeadNames: 338,
	},
	{
		file: "SettingsImportsTab.tsx",
		bagName: "props",
		minimumDestructuredNames: 400,
		everyNameMustBeRead: false,
		measuredDeadNames: 251,
	},
];

/**
 * Пропсы, которые App.tsx передавал в <SettingsView …> и которые там не читались.
 *
 * Проверка узкая нарочно: она сторожит ровно снятое здесь, а не общее правило.
 * Общее правило нарушено гораздо шире, и это замерено, а не предположено: в
 * <SettingsView …> передаётся 493 пропса, а SettingsView.tsx разбирает из них
 * РОВНО один — activeStaffUser (SettingsView.tsx:367), всё остальное читает сам из
 * useAppLogicContext(), хранилища настроек и производных значений. Остальные 492
 * пропса выбрасываются, и молчит компилятор из-за индексной подписи
 * [key: string]: any в SettingsViewProps. Снимать 492 строки — отдельный предмет
 * размером с App.tsx, и записывать его сюда числом-храповиком нельзя: пока правило
 * нарушено почти повсеместно, храповик стерёг бы не дефект, а его размер.
 */
const namesThatMustNotBePassedToSettingsView = [
	"pricelistWarningsText",
	"pricelistImageNote",
	"pricelistItemMaterialText",
	"pricelistMaterialSummaryText",
	"pricelistImageName",
	"pricelistParserModeLabels",
] as const;

/**
 * Имена, ради которых проверка написана: они доезжали до трёх вкладок и в каждой
 * обрывались на строке деструктуризации. Список перечислен, а не выведен из
 * файла: имя, исчезнувшее из вкладки вместе с проверкой, обошло бы вывод молча.
 */
const namesThatWereDeadInEveryTab = [
	"pricelistWarningsText",
	"pricelistImageNote",
	"pricelistItemMaterialText",
	"pricelistMaterialSummaryText",
	"pricelistImageName",
	"pricelistParserModeLabels",
] as const;

interface TabReading {
	readonly tab: TabUnderTest;
	/** Имена из блока деструктуризации мешка. */
	readonly destructuredNames: readonly string[];
	/** Строки блока, которые разбор не понял: молча пропускать их нельзя. */
	readonly unparsedLines: readonly string[];
	/** Код вкладки без блока деструктуризации — только настоящие обращения. */
	readonly codeOutsideBag: string;
}

function readTab(tab: TabUnderTest): TabReading {
	const code = withoutComments(readFileSync(join(settingsDir, tab.file), "utf8"));
	const needle = `= ${tab.bagName};`;
	const bagAt = code.indexOf(needle);
	assert.ok(
		bagAt > 0,
		`в ${tab.file} не найден разбор мешка значений «${needle}» — проверка ниже смотрела бы не туда`,
	);
	const openAt = code.lastIndexOf("const {", bagAt);
	const closeAt = code.lastIndexOf("}", bagAt);
	assert.ok(
		openAt > 0 && closeAt > openAt,
		`в ${tab.file} границы блока деструктуризации не найдены (const { … } ${needle})`,
	);

	const destructuredNames: string[] = [];
	const unparsedLines: string[] = [];
	for (const line of code.slice(openAt + "const {".length, closeAt).split(/\r?\n/)) {
		const trimmed = line.trim().replace(/,$/, "");
		if (!trimmed) continue;
		if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) destructuredNames.push(trimmed);
		else unparsedLines.push(trimmed);
	}

	return {
		tab,
		destructuredNames,
		unparsedLines,
		codeOutsideBag: code.slice(0, openAt) + code.slice(bagAt + needle.length),
	};
}

/** Имена мешка, к которым вкладка ниже не обращается ни разу. */
function namesNeverRead(reading: TabReading): string[] {
	return reading.destructuredNames.filter(
		(name) => !new RegExp(`\\b${name}\\b`).test(reading.codeOutsideBag),
	);
}

const readings = tabsUnderTest.map(readTab);

describe("вкладки настроек не держат мёртвых пропсов разбора прайса", () => {
	for (const reading of readings) {
		const { file } = reading.tab;

		it(`${file}: блок деструктуризации разобран целиком`, () => {
			assert.ok(
				reading.destructuredNames.length >= reading.tab.minimumDestructuredNames,
				`в ${file} разобрано ${reading.destructuredNames.length} имён при ожидаемых ${reading.tab.minimumDestructuredNames}+ — сломался разбор блока, а не вкладка`,
			);
			assert.deepEqual(
				reading.unparsedLines.filter((line) => !line.includes(":")),
				[],
				`в ${file} появилась запись мешка другого вида (${reading.unparsedLines.join(", ")}) — она обошла бы проверку молча`,
			);
		});

		it(`${file}: ни одно прайсовое имя не обрывается на строке деструктуризации`, () => {
			const deadPricelistNames = namesNeverRead(reading).filter((name) =>
				/pricelist/i.test(name),
			);
			assert.deepEqual(
				deadPricelistNames,
				[],
				`${file} вынимает из мешка ${deadPricelistNames.length} имён разбора прайса и не читает ни одно (${deadPricelistNames.join(", ")}). Решений два: рисовать значение здесь или не брать его вовсе — «вынули и бросили» превращает отказ разбора в молчаливую потерю данных`,
			);
		});

		for (const name of namesThatWereDeadInEveryTab) {
			it(`${file}: ${name} либо читается, либо не вынимается`, () => {
				const occurrences =
					reading.destructuredNames.filter((candidate) => candidate === name).length;
				if (occurrences === 0) return;
				assert.ok(
					new RegExp(`\\b${name}\\b`).test(reading.codeOutsideBag),
					`${file} снова вынимает ${name} из мешка и не читает его нигде ниже — это тот самый дефект, из-за которого предупреждения разбора прайса не доходили до экрана`,
				);
			});
		}

		if (reading.tab.everyNameMustBeRead) {
			it(`${file}: мешок вычищен полностью, мёртвых имён нет вовсе`, () => {
				assert.deepEqual(
					namesNeverRead(reading),
					[],
					`${file} вынимает из мешка имена, которых не читает (${namesNeverRead(reading).slice(0, 10).join(", ")})`,
				);
			});
		} else {
			it(`${file}: объявленный долг по мёртвым именам не растёт и не врёт`, () => {
				const deadNow = namesNeverRead(reading).length;
				assert.ok(
					deadNow <= reading.tab.measuredDeadNames,
					`в ${file} мёртвых имён стало ${deadNow} против замеренных ${reading.tab.measuredDeadNames} — в мешок долили новый пропс, который вынимают и не читают`,
				);
				assert.notEqual(
					deadNow,
					0,
					`в ${file} мёртвых имён больше нет — снимите объявленный долг и поставьте everyNameMustBeRead: true, иначе запись о долге начнёт врать следующему читателю`,
				);
			});
		}
	}

	it("родитель действительно рисует снятые с вкладок подписи, а не потерял их", () => {
		/*
		 * Обратная сторона решения «снять имя»: если поверхность не нарисована
		 * НИГДЕ, чистая вкладка означает не починку, а тихое удаление функции.
		 * Поэтому у каждой из четырёх подписей проверяется живой вызов в родителе
		 * — SettingsView.tsx рисует их четырьмя блоками над <SettingsPricesTab />.
		 */
		const parent = withoutComments(readFileSync(join(here, "..", "SettingsView.tsx"), "utf8"));
		for (const call of [
			"pricelistWarningsText([warning])",
			"pricelistWarningsText(item.warnings)",
			"pricelistItemMaterialText(item)",
			"pricelistMaterialSummaryText(summary)",
			"Фото прайса: {pricelistImageNote}",
		]) {
			assert.ok(
				parent.includes(call),
				`SettingsView.tsx больше не содержит «${call}» — подпись снята с вкладок и потеряна совсем, а не перенесена`,
			);
		}
	});

	it("App.tsx не пробрасывает эти имена в <SettingsView …>", () => {
		/*
		 * Второй конец той же цепочки. Снять имя из вкладки и оставить проброс в
		 * родителя — не починка: пропс продолжают передавать, и никто не принимает.
		 * Разбор идёт по блоку самого элемента, а не по всему файлу: те же имена
		 * законно живут в App.tsx для других мест.
		 */
		const app = withoutComments(readFileSync(join(here, "..", "App.tsx"), "utf8"));
		const openAt = app.indexOf("<SettingsView");
		assert.ok(openAt > 0, "в App.tsx не найден элемент <SettingsView …> — проверка смотрела бы не туда");
		const closeAt = app.indexOf("/>", openAt);
		assert.ok(closeAt > openAt, "в App.tsx не найден конец элемента <SettingsView …>");
		const element = app.slice(openAt, closeAt);
		const stillPassed = namesThatMustNotBePassedToSettingsView.filter((name) =>
			element.includes(`${name}={`),
		);
		assert.deepEqual(
			stillPassed,
			[],
			`App.tsx снова передаёт в <SettingsView …> пропсы, которых тот не принимает (${stillPassed.join(", ")}): SettingsView разбирает из пропсов только activeStaffUser`,
		);
	});
});

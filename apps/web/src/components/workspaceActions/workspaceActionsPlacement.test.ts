import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	VOICE_GLOW_MAX_PX,
	VOICE_GLOW_MIN_PX,
	VOICE_METER_BARS,
	VOICE_METER_FLOOR_SHARE,
	voiceGlowRadiusPx,
	voiceMeterHeights,
} from "./voiceMeter.js";
import { workspaceActionsLabels } from "./workspaceActionsLabels.js";
import {
	resolveWorkspaceActionPlacement,
	WORKSPACE_ACTION_BAR_SLOTS,
	WORKSPACE_ACTION_HOST_ID,
	WORKSPACE_ACTION_NAV_SELECTOR,
	WORKSPACE_ACTION_PRIMARY,
	WORKSPACE_ACTION_SLOTS,
	type WorkspaceActionBarSlotId,
	workspaceActionBarOrder,
} from "./workspaceActionsPlacement.js";

/**
 * ЧТО ЗДЕСЬ ПРОВЕРЯЕТСЯ, И ПОЧЕМУ ЭТО НЕ ТЕ ЖЕ ТЕСТЫ, ЧТО БЫЛИ.
 *
 * Предыдущий набор (`floatingCorner/cornerDockLayout.test.ts`, 54 теста) почти
 * целиком проверял ГЕОМЕТРИЮ плавающего угла: площадь пересечения, долю
 * накрытия мишени, подъём, предел подъёма, компактный режим, частоту проходов на
 * прокрутке, резерв пустого низа. Этой геометрии больше нет — она удалена вместе
 * с механизмом, потому что порог уступки арифметически недостижим (обоснование —
 * `workspaceActionsPlacement.ts`). Поэтому те тесты удалены ВМЕСТЕ с кодом,
 * который они описывали: тест, переживший свой механизм, охраняет пустоту.
 *
 * Осталось три вещи, которые действительно можно сломать:
 *   1. Раскладка и порядок кнопок — чистые функции.
 *   2. Обещание §3: у каждого действия есть ВИДИМАЯ подпись, а не только `title`.
 *   3. Структурное обещание пакета: ничто не плавает, резерва нет, а группа
 *      действительно смонтирована в топбар и в нижнюю навигацию. Пункт 3
 *      проверяется чтением настоящих файлов, потому что jsdom в проекте нет
 *      (зависимости: только `playwright`, у которого ни конфига, ни спеков), а
 *      осиротевший компонент — не гипотеза: ровно так этот пакет однажды и
 *      закончился — четыре готовых файла, которые никто не импортировал.
 */

const sourceDir = fileURLToPath(new URL(".", import.meta.url));
const webSrcDir = fileURLToPath(new URL("../..", import.meta.url));

function readSource(relativePath: string): string {
	return readFileSync(join(webSrcDir, relativePath), "utf8");
}

/** CSS без комментариев: упоминание правила в комментарии не есть правило. */
function stripCssComments(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function collectCssFiles(): string[] {
	const files: string[] = [];
	const stack = [join(webSrcDir, "styles"), sourceDir];
	for (const dir of stack) {
		for (const name of readdirSync(dir)) {
			if (name.endsWith(".css")) files.push(join(dir, name));
		}
	}
	return files;
}

describe("куда садится группа действий", () => {
	it("нижняя навигация отрисована — группа идёт в навигацию", () => {
		assert.equal(
			resolveWorkspaceActionPlacement({ bottomNavDisplayed: true }),
			"nav",
		);
	});

	it("навигации нет — группа идёт в топбар", () => {
		assert.equal(
			resolveWorkspaceActionPlacement({ bottomNavDisplayed: false }),
			"header",
		);
	});

	/**
	 * Топбар есть на всех ширинах, нижняя навигация — нет. Поэтому неизвестность
	 * обязана разрешаться в топбар: в противном случае группа исчезла бы с экрана
	 * целиком, а не встала бы не туда.
	 */
	it("топбар — безопасное значение по умолчанию", () => {
		assert.equal(
			resolveWorkspaceActionPlacement({ bottomNavDisplayed: false }),
			"header",
		);
	});
});

describe("порядок кнопок в строке", () => {
	it("в топбаре — порядок объявления слотов", () => {
		assert.deepEqual(workspaceActionBarOrder("header"), [
			"search",
			"voice",
			"help",
		]);
	});

	it("в навигации первым идёт главное действие", () => {
		const order = workspaceActionBarOrder("nav");
		assert.equal(order[0], WORKSPACE_ACTION_PRIMARY);
		assert.deepEqual(order, ["voice", "search", "help"]);
	});

	/**
	 * Оба порядка ВЫВЕДЕНЫ из одного списка, а не переписаны рядом. Скопированный
	 * руками союз в этом проекте уже разъезжался с источником и ломал сборку
	 * (`LazyWorkspaceView` против `appViews`), поэтому свойство проверяется, а не
	 * обещается комментарием.
	 */
	it("ни один слот не теряется ни в одной раскладке", () => {
		for (const placement of ["header", "nav"] as const) {
			const order = workspaceActionBarOrder(placement);
			assert.equal(
				order.length,
				WORKSPACE_ACTION_BAR_SLOTS.length,
				`раскладка ${placement} потеряла слот`,
			);
			assert.deepEqual(
				[...order].sort(),
				[...WORKSPACE_ACTION_BAR_SLOTS].sort(),
				`раскладка ${placement} — не перестановка списка слотов`,
			);
		}
	});

	it("накладка не входит в строку кнопок, а слоты — в список", () => {
		assert.ok(
			!(WORKSPACE_ACTION_BAR_SLOTS as readonly string[]).includes("notice"),
			"временная накладка не кнопка и в строке стоять не должна",
		);
		assert.deepEqual(
			[...WORKSPACE_ACTION_SLOTS],
			["notice", "search", "voice", "help"],
		);
	});
});

describe("§3: у каждого действия есть видимая подпись", () => {
	/**
	 * Раньше справка и микрофон были круглыми кнопками без текста: смысл жил
	 * только в атрибуте `title`, то есть на телефоне не существовал вообще. Кнопка
	 * без подписи рядом с пятью подписанными пунктами навигации — потеря ясности.
	 * Новый слот без подписи должен ронять тест, а не тихо уезжать в продукт.
	 */
	it("у каждой кнопки строки есть видимая подпись, объяснение и подсказка", () => {
		/*
		 * Подсказка для курсора у кнопки голоса ЗАВИСИТ ОТ СОСТОЯНИЯ: «удерживайте
		 * для записи» против «нажмите для завершения». Единого `title` у неё
		 * поэтому нет и быть не должно — одна строка на два состояния соврала бы
		 * человеку в одном из них. Проверяется наличие хотя бы одной подсказки из
		 * допустимых имён, а не наличие конкретно `title`.
		 */
		const cursorHintKeys = ["title", "idle", "listening"] as const;
		for (const slot of WORKSPACE_ACTION_BAR_SLOTS) {
			const entry = (
				workspaceActionsLabels as Record<
					WorkspaceActionBarSlotId,
					Record<string, string | undefined>
				>
			)[slot];
			assert.ok(entry, `у слота ${slot} нет словарной статьи`);
			assert.ok(
				entry.label && entry.label.trim().length > 0,
				`у слота ${slot} нет видимой подписи`,
			);
			assert.ok(
				entry.hint && entry.hint.trim().length > 0,
				`у слота ${slot} нет объяснения простыми словами`,
			);
			const hints = cursorHintKeys.filter(
				(key) => (entry[key] ?? "").trim().length > 0,
			);
			assert.ok(
				hints.length > 0,
				`у слота ${slot} нет ни одной подсказки для курсора (${cursorHintKeys.join(" | ")})`,
			);
		}
	});

	it("пункт навигации подписан словом, как и его соседи", () => {
		assert.equal(
			workspaceActionsLabels.navTrigger.label.trim().length > 0,
			true,
		);
		assert.notEqual(
			workspaceActionsLabels.navTrigger.titleClosed,
			workspaceActionsLabels.navTrigger.titleOpen,
			"открытое и закрытое состояние должны говорить разное",
		);
	});

	it("русский текст живёт в словаре, а не в JSX", () => {
		const cyrillicInJsx = /[а-яА-ЯёЁ]/u;
		const owner = readSource(
			"components/workspaceActions/WorkspaceActions.tsx",
		);
		const withoutComments = owner
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.replace(/\/\/[^\n]*/g, "");
		const jsxText = withoutComments.match(/>\s*[^<>{}\s][^<>{}]*</g) ?? [];
		for (const chunk of jsxText) {
			assert.ok(
				!cyrillicInJsx.test(chunk),
				`русский текст записан прямо в JSX: ${chunk.trim()}`,
			);
		}
	});
});

describe("ничто больше не плавает над контентом", () => {
	it("в CSS группы нет ни одного position: fixed", () => {
		const css = stripCssComments(
			readSource("components/workspaceActions/workspaceActions.css"),
		);
		assert.ok(
			!/position\s*:\s*fixed/.test(css),
			"группа снова прибита к экрану — это и есть удалённый дефект",
		);
	});

	/**
	 * Резерв существовал только для того, чтобы контент можно было прокрутить
	 * выше ПЛАВАЮЩЕЙ панели. Панель не плавает — резервировать нечего, и
	 * переменной не должно остаться ни в одном файле стилей: мёртвая эвристика,
	 * оставленная в дереве, — ловушка для следующего агента.
	 */
	it("переменной резерва пустого низа не осталось ни в одном стиле", () => {
		const consumers: string[] = [];
		for (const file of collectCssFiles()) {
			const css = stripCssComments(readFileSync(file, "utf8"));
			for (const line of css.split("\n")) {
				if (line.includes("--corner-dock-reserve-block")) {
					consumers.push(`${basename(file)}: ${line.trim()}`);
				}
			}
		}
		assert.deepEqual(
			consumers,
			[],
			`резерв удалён вместе с плаванием, найдено:\n${consumers.join("\n")}`,
		);
	});

	it("модуль-владелец не опрашивает DOM геометрией", () => {
		const owner = readSource(
			"components/workspaceActions/WorkspaceActions.tsx",
		);
		const code = owner
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.replace(/\/\/[^\n]*/g, "");
		for (const forbidden of [
			"elementsFromPoint",
			"elementFromPoint",
			"getBoundingClientRect",
			'addEventListener("scroll"',
			"ResizeObserver",
			"requestAnimationFrame",
		]) {
			assert.ok(
				!code.includes(forbidden),
				`вернулась машинерия плавающего угла: ${forbidden}`,
			);
		}
	});

	it("файлов плавающего угла больше нет в дереве", () => {
		assert.throws(
			() => readdirSync(join(webSrcDir, "components", "floatingCorner")),
			"каталог floatingCorner должен быть удалён вместе с механизмом",
		);
	});
});

describe("группа действительно смонтирована, а не осиротела", () => {
	/**
	 * ЭТО ГЛАВНАЯ ПРОВЕРКА ПАКЕТА. Компоненты, которые никто не импортирует,
	 * компилируются, проходят типизацию и не рисуют НИЧЕГО. Ровно так этот пакет
	 * однажды и закончился: четыре готовых файла, ноль импортов.
	 */
	it("точка монтажа стоит в строке действий топбара", () => {
		const shell = readSource("workspaceShell.tsx");
		assert.match(
			shell,
			/import \{ WorkspaceActionsMount \} from "\.\/components\/workspaceActions\/WorkspaceActions"/,
			"workspaceShell.tsx не импортирует точку монтажа",
		);
		const topActions = shell.slice(
			shell.indexOf('<div className="top-actions">'),
		);
		assert.ok(
			topActions.indexOf("<WorkspaceActionsMount />") > -1,
			"точка монтажа не отрисована внутри .top-actions",
		);
		assert.ok(
			topActions.indexOf("<WorkspaceActionsMount />") <
				topActions.indexOf("</div>") ||
				topActions.indexOf("<WorkspaceActionsMount />") <
					topActions.indexOf('className="primary-button"'),
			"точка монтажа должна стоять до главной кнопки «Запись»",
		);
	});

	it("на узком экране группа въезжает в живую нижнюю навигацию", () => {
		const owner = readSource(
			"components/workspaceActions/WorkspaceActions.tsx",
		);
		assert.match(
			owner,
			/querySelector\(WORKSPACE_ACTION_NAV_SELECTOR\)/,
			"владелец не ищет нижнюю навигацию",
		);
		assert.match(
			owner,
			/nav\.append\(navSlotDom\)/,
			"контейнер не вставляется в навигацию",
		);
		assert.match(
			owner,
			/createPortal\(<WorkspaceActionsNavSheet \/>, navSlot\)/,
		);
		assert.equal(WORKSPACE_ACTION_NAV_SELECTOR, ".dnt-bottom-nav");
	});

	/**
	 * Порог ширины принадлежит CSS и НЕ должен появиться числом в TypeScript:
	 * продублированный порог в этом углу уже разъезжался (`52.5rem` против
	 * `840px`).
	 */
	it("порог ширины не продублирован числом в логике раскладки", () => {
		const placement = readSource(
			"components/workspaceActions/workspaceActionsPlacement.ts",
		);
		const code = placement
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.replace(/\/\/[^\n]*/g, "");
		assert.ok(
			!/840|52\.5rem|matchMedia/.test(code),
			"порог продублирован в коде",
		);
	});

	it("селектор навигации в CSS и в логике — один и тот же", () => {
		const css = stripCssComments(readSource("styles/dente-redesign.css"));
		assert.ok(
			css.includes(WORKSPACE_ACTION_NAV_SELECTOR),
			"селектор навигации из логики не встречается в стилях оболочки",
		);
	});

	it("жильцы переехали на слоты группы", () => {
		for (const file of [
			"components/VoiceAssistantUI.tsx",
			"components/Omnibar.tsx",
		]) {
			const source = readSource(file);
			assert.match(
				source,
				/WorkspaceActionsSlot/,
				`${file} не поселён в группе действий`,
			);
			assert.ok(
				!source.includes("floatingCorner"),
				`${file} всё ещё импортирует удалённый плавающий угол`,
			);
		}
	});

	it("идентификатор хоста один и он не пуст", () => {
		assert.equal(WORKSPACE_ACTION_HOST_ID, "dnt-workspace-actions");
		const owner = readSource(
			"components/workspaceActions/WorkspaceActions.tsx",
		);
		assert.equal(
			owner.split("WORKSPACE_ACTION_HOST_ID").length - 1,
			2,
			"идентификатор хоста должен читаться из одного места",
		);
	});
});

describe("индикатор уровня записи", () => {
	it("в тишине все полоски на полу шкалы, а не пляшут", () => {
		const heights = voiceMeterHeights(0);
		assert.equal(heights.length, VOICE_METER_BARS);
		const floor = Math.round(VOICE_METER_FLOOR_SHARE * 1000) / 10;
		for (const height of heights) assert.equal(height, floor);
	});

	it("одинаковый уровень даёт одинаковый силуэт", () => {
		assert.deepEqual(voiceMeterHeights(120), voiceMeterHeights(120));
	});

	it("центр реагирует на уровень сильнее краёв", () => {
		const heights = voiceMeterHeights(255);
		const first = heights[0];
		const middle = heights[Math.floor(VOICE_METER_BARS / 2)];
		assert.ok(first !== undefined && middle !== undefined);
		assert.ok(middle > first, `центр ${middle} не выше края ${first}`);
		assert.ok(middle <= 100, `центр ${middle} вышел за 100%`);
	});

	it("рост уровня поднимает полоски", () => {
		const quiet = voiceMeterHeights(40)[6];
		const loud = voiceMeterHeights(200)[6];
		assert.ok(quiet !== undefined && loud !== undefined);
		assert.ok(loud > quiet, `${loud} не выше ${quiet}`);
	});

	it("значения вне шкалы и NaN не ломают индикатор", () => {
		const floor = Math.round(VOICE_METER_FLOOR_SHARE * 1000) / 10;
		for (const height of voiceMeterHeights(Number.NaN)) {
			assert.equal(height, floor);
		}
		for (const height of voiceMeterHeights(-50)) assert.equal(height, floor);
		for (const height of voiceMeterHeights(4000)) assert.ok(height <= 100);
	});

	/**
	 * Радиус свечения переехал из JSX в модуль вместе с индикатором. Раньше он
	 * считался инлайном выражением `Math.min(100, Math.max(20, volume/255*100))`,
	 * то есть проверить его было нечем.
	 */
	it("радиус свечения не выходит из своих границ", () => {
		assert.equal(voiceGlowRadiusPx(0), VOICE_GLOW_MIN_PX);
		assert.equal(voiceGlowRadiusPx(255), VOICE_GLOW_MAX_PX);
		assert.equal(voiceGlowRadiusPx(Number.NaN), VOICE_GLOW_MIN_PX);
		assert.equal(voiceGlowRadiusPx(-1), VOICE_GLOW_MIN_PX);
		assert.equal(voiceGlowRadiusPx(100_000), VOICE_GLOW_MAX_PX);
		const mid = voiceGlowRadiusPx(128);
		assert.ok(
			mid > VOICE_GLOW_MIN_PX && mid < VOICE_GLOW_MAX_PX,
			`середина шкалы дала ${mid}`,
		);
	});
});

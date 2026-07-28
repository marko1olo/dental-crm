import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * Страж: панель или раздел, которых никто не отрисовывает, — это несделанная работа.
 *
 * ЧТО СЛУЧИЛОСЬ В ПЕРВЫЙ РАЗ. Панель утреннего обзвона и панель отчётов
 * руководителю были добавлены в AppRouter.tsx. Файл выглядел как маршрутизатор
 * приложения: импортировал представления, переключал их по currentView, лежал
 * рядом с App.tsx. Его НЕ ИМПОРТИРОВАЛ НИКТО — разделы отрисовывает App.tsx.
 * Обе панели прошли typecheck, прошли сборку, прошли тесты оформления — и не
 * появлялись на экране вообще. Выяснилось только на снимке живого приложения,
 * то есть могло не выясниться никогда.
 *
 * ЧТО СЛУЧИЛОСЬ ВО ВТОРОЙ РАЗ, ХОТЯ ЭТОТ ФАЙЛ УЖЕ СУЩЕСТВОВАЛ. Той же дорогой
 * ушли три целых раздела: склад (1487 строк), журнал стерилизации и воронка
 * обращений. Они были подключены только в том же мёртвом AppRouter.tsx, а в
 * реестре workspaceShell.appViews их не было — значит, и по адресу #inventory
 * приложение откатывалось на «Смену». Первая редакция этого стража проверяла
 * поимённый список панелей и охраняла пометку в шапке мёртвого файла, но не
 * связку «раздел объявлен → раздел отрисован». Теперь проверяется связка.
 *
 * Раздел живёт ровно в трёх местах, и все три обязательны:
 *   workspaceShell.appViews  — иначе viewFromHash() не пустит по адресу;
 *   App.tsx currentView === — иначе открывать нечего;
 *   workspacePreload.ts      — иначе Vite грузит модуль на лету, с прыжком вёрстки.
 *
 * Проверка дешёвая и текстовая: она смотрит, что раздел упомянут в модулях, до
 * которых выполнение действительно доходит от main.tsx.
 */

const webSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Панели верхнего уровня и место, где они обязаны быть отрисованы. */
const MOUNTED_PANELS = [
	{ component: "DayConfirmationsPanel", file: "components/schedule/DayConfirmationsPanel.tsx" },
	{ component: "ManagerReportsPanel", file: "components/reports/ManagerReportsPanel.tsx" },
	{ component: "MessageDeliveryConsole", file: "components/communications/MessageDeliveryConsole.tsx" },
	{ component: "CampaignPanel", file: "components/communications/CampaignPanel.tsx" },
	{ component: "PatientDuplicateAlert", file: "components/patients/PatientDuplicateAlert.tsx" },
	{ component: "RecallListPanel", file: "components/patients/RecallListPanel.tsx" },
	{ component: "FreedSlotsPanel", file: "components/schedule/FreedSlotsPanel.tsx" }
];

/**
 * Каталоги карточки пациента и плана лечения обходятся ЦЕЛИКОМ, а не по списку.
 *
 * ПОЧЕМУ ОБХОД, А НЕ ЕЩЁ ОДИН СПИСОК. Проверка MOUNTED_PANELS выше — поимённый
 * перечень семи названных панелей. Она структурно не способна заметить файл,
 * которого в перечне нет, и именно так карточка пациента получила сирот:
 * PR #409 вынес из PatientsView.tsx пять форм, в тот же день их удалили как
 * мёртвый код, а на следующий слепой «chore: sync final local updates» вернул
 * в дерево два файла из пяти. Оба прошли typecheck, сборку и все тесты — искать
 * было нечего, перечень этих имён не знал. Одна из вернувшихся форм оказалась
 * НАДМНОЖЕСТВОМ смонтированной: пять полей реквизитов пациента существовали в
 * схеме, в колонке, в черновике, в запросе и в валидаторе, а ввести их было
 * нечем ни на одном экране.
 *
 * Обход каталога такое видит. Любой .tsx в этих каталогах обязан либо
 * отрисовываться из достижимого модуля, либо стоять в списке заявленных долгов
 * с причиной. Третьего состояния — «лежит в дереве и молчит» — больше нет.
 */
const CLINICAL_COMPONENT_DIRECTORIES = [
	"components/patient",
	"components/plan",
	"components/odontogram"
];

/**
 * Заявленные долги: файл в дереве, и его сознательно никто не отрисовывает.
 *
 * Запись здесь — НЕ разрешение и не «подключим потом». Она означает: причина
 * проверена и записана, а подключение — отдельная работа с отдельным решением.
 * Общая причина вроде «нужно доработать» здесь хуже, чем отсутствие записи:
 * она гасит стража, ничего не сообщая. Минимальная длина причины проверяется
 * тестом ниже.
 */
const KNOWN_UNMOUNTED_CLINICAL_COMPONENTS: ReadonlyArray<{
	readonly file: string;
	readonly reason: string;
}> = [
	{
		file: "components/plan/ComparativePlannerDashboard.tsx",
		reason:
			"Сравнительный конструктор смет: несколько альтернативных планов рядом, " +
			"покрытие ДМС, жизненный цикл «утвердить / архивировать / восстановить», " +
			"печать и выгрузка CSV. Адреса на сервере рабочие, но подключать его " +
			"нельзя — против этих адресов он не работает ни в одном сценарии, и на " +
			"экран клиники это выйдет как ошибки в деньгах:\n" +
			"1. Прайс клиники читается по полю priceRub, которого у позиции прайса " +
			"нет — и в схеме (serviceCatalogItemSchema), и в колонке цена называется " +
			"basePriceRub. В выпадающем списке услуг стоит «undefined ₽», в поле цены " +
			"строка «undefined», а строка без разобранной цены молча вылетает из " +
			"плана: врач нажимает «Создать план» и получает план без этой услуги.\n" +
			"2. Для услуги, набранной вручную, уходит priceId: null, а сервер требует " +
			"непустую ссылку на прайс, поэтому весь запрос отбивается ошибкой " +
			"валидации.\n" +
			"3. Смена статуса плана отправляет запрос без названия — сервер " +
			"подставляет название по умолчанию и ПЕРЕИМЕНОВЫВАЕТ план; сам статус в " +
			"схему запроса не входит и не сохраняется вообще.\n" +
			"4. Статусы сервер отдаёт строчными («draft»), а экран сравнивает с " +
			"«Draft», поэтому у загруженного плана не видно ни подписи статуса, ни " +
			"кнопок жизненного цикла.\n" +
			"5. Полис ДМС берётся первым из списка договоров клиники и применяется " +
			"любому пациенту, хотя связи «пациент → договор» в схеме нет: пациенту " +
			"могут назвать скидку по чужому полису.\n" +
			"Это починка денежного экрана, а не перестановка кода. Вдобавок точка " +
			"монтирования и POST-адрес общие с TreatmentEstimator, который уже " +
			"смонтирован в одонтограмме, — разграничение двух планировщиков решает " +
			"ведущий, а не этот файл."
	}
];

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrc, relativePath), "utf8");
}

/** Все .ts/.tsx исходники приложения, кроме тестов. */
function collectSources(directory = webSrc, collected: string[] = []): string[] {
	for (const entry of readdirSync(directory)) {
		const full = path.join(directory, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "tests" || entry === "__tests__" || entry === "node_modules") continue;
			collectSources(full, collected);
			continue;
		}
		if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) collected.push(full);
	}
	return collected;
}

/**
 * Модули, до которых доходит выполнение от main.tsx. Обход по строкам импорта:
 * полноценного разбора здесь не нужно, а связность файлов он показывает.
 */
function reachableFromEntry(): Set<string> {
	const sources = collectSources();
	const byBaseName = new Map<string, string>();
	for (const file of sources) {
		byBaseName.set(path.basename(file).replace(/\.tsx?$/, ""), file);
	}

	const reachable = new Set<string>();
	const queue = [path.join(webSrc, "main.tsx")];

	while (queue.length > 0) {
		const current = queue.pop();
		if (!current || reachable.has(current)) continue;
		reachable.add(current);

		let source: string;
		try {
			source = readFileSync(current, "utf8");
		} catch {
			continue;
		}

		// Статические импорты и ленивые import("...") — обе формы в проекте есть.
		for (const match of source.matchAll(/from\s+["'](\.[^"']+)["']|import\(\s*["'](\.[^"']+)["']\s*\)/g)) {
			const specifier = match[1] ?? match[2];
			if (!specifier) continue;
			const base = path.basename(specifier).replace(/\.(js|jsx|ts|tsx)$/, "");
			const resolved = byBaseName.get(base);
			if (resolved && !reachable.has(resolved)) queue.push(resolved);
		}
	}

	return reachable;
}

/**
 * Файлы-компоненты в клинических каталогах: `.tsx`, имя с заглавной буквы.
 * Обход рекурсивный — подкаталог не должен становиться слепой зоной.
 * Пути возвращаются в том же виде, в каком записаны заявленные долги.
 */
function clinicalComponentFiles(
	relativeDirectory: string,
	collected: string[] = []
): string[] {
	const absolute = path.join(webSrc, relativeDirectory);
	for (const entry of readdirSync(absolute)) {
		const full = path.join(absolute, entry);
		if (statSync(full).isDirectory()) {
			clinicalComponentFiles(`${relativeDirectory}/${entry}`, collected);
			continue;
		}
		if (!/^[A-Z][A-Za-z0-9]*\.tsx$/.test(entry)) continue;
		if (/\.test\.tsx$/.test(entry)) continue;
		collected.push(`${relativeDirectory}/${entry}`);
	}
	return collected;
}

/**
 * Модули, которые отрисовывают компонент: достижимые от main.tsx файлы, где
 * встречается `<Имя`. Сам файл компонента не считается — он рисует себя.
 */
function renderersOf(component: string, reachable: Set<string>, ownFileName: string): string[] {
	const found: string[] = [];
	for (const file of reachable) {
		if (path.basename(file) === ownFileName) continue;
		if (readFileSync(file, "utf8").includes(`<${component}`)) found.push(file);
	}
	return found;
}

/**
 * Реестр разделов читается из исходника, а не импортируется: страж обязан
 * работать и тогда, когда workspaceShell.tsx не собирается — именно в такой
 * момент в него и добавляют раздел наугад.
 */
function registeredAppViews(): string[] {
	const source = readSource("workspaceShell.tsx");
	const declaration = /export const appViews = \[([^\]]*)\] as const;/.exec(source)?.[1] ?? "";
	assert.ok(
		declaration,
		"В workspaceShell.tsx не найдено объявление `export const appViews = [...] as const;` — " +
			"реестр разделов переехал или переименован, и этот страж больше ничего не охраняет",
	);
	const views = [...declaration.matchAll(/"([^"]+)"/g)].map((match) => match[1] as string);
	assert.ok(views.length >= 11, `реестр разделов разобран неполно: ${views.length} записей`);
	return views;
}

test("каждая рабочая панель отрисовывается из живого модуля", () => {
	const reachable = reachableFromEntry();
	const reachableNames = new Set([...reachable].map((file) => path.basename(file)));

	for (const panel of MOUNTED_PANELS) {
		// Сам файл панели должен быть достижим от точки входа.
		assert.ok(
			reachableNames.has(path.basename(panel.file)),
			`${panel.component}: файл не достижим от main.tsx — панель не попадёт на экран`,
		);

		// И кто-то из достижимых модулей должен её действительно отрисовывать.
		const renderers = [...reachable].filter((file) => {
			if (path.basename(file) === path.basename(panel.file)) return false;
			const source = readFileSync(file, "utf8");
			return source.includes(`<${panel.component}`);
		});

		assert.ok(
			renderers.length > 0,
			`${panel.component}: ни один достижимый модуль не содержит <${panel.component} />. ` +
				"Панель добавлена в файл, который никто не импортирует.",
		);
	}
});

test("каждый раздел из реестра отрисовывается в App.tsx", () => {
	const appSource = readSource("App.tsx");
	const missing = registeredAppViews().filter(
		(view) => !appSource.includes(`currentView === "${view}"`),
	);

	assert.deepEqual(
		missing,
		[],
		`Разделы объявлены в workspaceShell.appViews, но App.tsx их не отрисовывает: ${missing.join(", ")}. ` +
			"Такой раздел открывается по адресу и показывает пустую рабочую область — " +
			"ровно так пропали склад, стерилизация и воронка обращений.",
	);
});

test("каждый раздел из реестра умеет предзагружаться", () => {
	const preloadSource = readSource("workspacePreload.ts");
	const missing = registeredAppViews().filter(
		(view) => !new RegExp(`\\b${view}: \\(\\) => import\\(`).test(preloadSource),
	);

	assert.deepEqual(
		missing,
		[],
		`Разделы объявлены в workspaceShell.appViews, но не зарегистрированы в workspacePreload.ts: ${missing.join(", ")}. ` +
			"Vite будет грузить их модуль на лету, с прыжком вёрстки при первом открытии " +
			"(правило записано в .agents/UI_STANDARDS.md).",
	);
});

test("модуль каждого предзагружаемого раздела действительно существует", () => {
	const preloadSource = readSource("workspacePreload.ts");
	const reachable = reachableFromEntry();
	const reachableNames = new Set([...reachable].map((file) => path.basename(file)));

	const broken: string[] = [];
	for (const match of preloadSource.matchAll(/(\w+): \(\) => import\("(\.[^"]+)"\)/g)) {
		const view = match[1] as string;
		const specifier = match[2] as string;
		const base = path.basename(specifier);
		if (!reachableNames.has(`${base}.tsx`) && !reachableNames.has(`${base}.ts`)) {
			broken.push(`${view} → ${specifier}`);
		}
	}

	assert.deepEqual(
		broken,
		[],
		"Предзагрузчик ссылается на модуль, до которого выполнение от main.tsx не доходит: " +
			`${broken.join(", ")}. Опечатка в пути молчит: import() внутри void-вызова только отклоняет промис.`,
	);
});

test("второго маршрутизатора рядом с App.tsx больше нет", () => {
	/*
	 * AppRouter.tsx удалён вместе с двумя разделами-пустышками, которые в нём
	 * лежали (зарплаты и омниканальный инбокс — их адреса на сервере отвечают
	 * 404). Файл вернуть нельзя: пока он не импортирован, всё добавленное в него
	 * не отрисовывается, а выглядит подключённым — на этом уже дважды потеряли
	 * готовую работу. Разделы объявляются в workspaceShell.appViews и
	 * отрисовываются в App.tsx, и это закрыто тестами выше.
	 */
	assert.equal(
		existsSync(path.join(webSrc, "AppRouter.tsx")),
		false,
		"AppRouter.tsx создан заново. Второй файл с цепочкой по currentView не участвует в отрисовке: " +
			"добавьте раздел в workspaceShell.appViews и ветку в App.tsx.",
	);
});

test("в карточке пациента и плане лечения нет незаявленных сирот", () => {
	const reachable = reachableFromEntry();
	const reachableNames = new Set([...reachable].map((file) => path.basename(file)));
	const declared = new Set(KNOWN_UNMOUNTED_CLINICAL_COMPONENTS.map((debt) => debt.file));

	const orphans: string[] = [];
	for (const directory of CLINICAL_COMPONENT_DIRECTORIES) {
		for (const relative of clinicalComponentFiles(directory)) {
			if (declared.has(relative)) continue;
			const fileName = path.basename(relative);
			const component = fileName.replace(/\.tsx$/, "");
			const rendered =
				reachableNames.has(fileName) &&
				renderersOf(component, reachable, fileName).length > 0;
			if (!rendered) orphans.push(relative);
		}
	}

	assert.deepEqual(
		orphans,
		[],
		`Компонент лежит в дереве, и его никто не отрисовывает: ${orphans.join(", ")}. ` +
			"Такой файл проходит typecheck, сборку и все остальные тесты, а на экране его нет — " +
			"так карточка пациента полтора дня хранила форму реквизитов, которая умела больше " +
			"смонтированной. Либо отрисуйте его из достижимого от main.tsx модуля, либо внесите " +
			"в KNOWN_UNMOUNTED_CLINICAL_COMPONENTS вместе с проверенной причиной.",
	);
});

test("заявленные несмонтированные компоненты не устарели и объяснены", () => {
	const reachable = reachableFromEntry();

	const missingFiles: string[] = [];
	const staleEntries: string[] = [];
	const emptyReasons: string[] = [];

	for (const debt of KNOWN_UNMOUNTED_CLINICAL_COMPONENTS) {
		if (!existsSync(path.join(webSrc, debt.file))) {
			missingFiles.push(debt.file);
			continue;
		}
		const fileName = path.basename(debt.file);
		const component = fileName.replace(/\.tsx$/, "");
		if (renderersOf(component, reachable, fileName).length > 0) staleEntries.push(debt.file);
		// Причина короче двух строк — это отписка, а не причина.
		if (debt.reason.trim().length < 120) emptyReasons.push(debt.file);
	}

	assert.deepEqual(
		missingFiles,
		[],
		`Долг заявлен на файл, которого в дереве нет: ${missingFiles.join(", ")}. ` +
			"Файл удалён — удалите и запись, иначе список долгов начинает врать о составе дерева.",
	);
	assert.deepEqual(
		staleEntries,
		[],
		`Компонент заявлен как несмонтированный, но его уже отрисовывают: ${staleEntries.join(", ")}. ` +
			"Уберите запись из KNOWN_UNMOUNTED_CLINICAL_COMPONENTS — пока она там, страж не следит " +
			"за этим файлом и следующая поломка монтирования пройдёт молча.",
	);
	assert.deepEqual(
		emptyReasons,
		[],
		`Долг заявлен без внятной причины: ${emptyReasons.join(", ")}. ` +
			"Причина обязана называть, что именно мешает подключению и чем это подтверждено, " +
			"иначе запись просто гасит проверку.",
	);
});

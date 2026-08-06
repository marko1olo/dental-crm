import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { webSrcRoot } from "./utils/componentReachability";

/**
 * Страж: поле, которое сервер хранит и отдаёт, обязано иметь ввод на достижимом
 * экране — иначе клиника платит за колонку, которую нечем заполнить.
 *
 * ЧТО БЫЛО. Телефон сотрудника проходил ВЕСЬ путь, кроме экрана:
 *   packages/shared createStaffMemberSchema.phone   — запрос его принимает;
 *   apps/api/src/db/settingsQuery.ts createStaffMemberInDb — создание его пишет;
 *   apps/api/src/db/settingsQuery.ts updateStaffMemberProfileInDb — правка пишет;
 *   apps/api/src/db/settingsQuery.ts getClinicSettingsFromDb — чтение отдаёт.
 * Поля ввода не было ни в одном файле веба. Единственным местом, где номер
 * когда-либо вводился руками, был шаг «Сотрудники» семишагового мастера первого
 * запуска — а тот мастер не отрисовывался нигде и затем был удалён. Врача было
 * не дозвониться: замена в смене, срочный пациент, опоздание.
 *
 * ПОЧЕМУ СТРАЖ ПРОВЕРЯЕТ ТРИ ВЕЩИ, А НЕ ОДНУ. Возможность состоит из трёх
 * частей, и любая одна без остальных бесполезна:
 *   ввести при заведении — иначе номер негде взять;
 *   УВИДЕТЬ на карточке — иначе запись невидима, и через неделю никто не знает,
 *     заполнена ли она; ровно так поле и потерялось в первый раз;
 *   исправить у уже заведённого — иначе клиника с пятью сотрудниками остаётся
 *     без номеров навсегда, сколько бы полей ни было в форме создания.
 *
 * Страж проверяет ИМЕННО смонтированную вкладку. Файл берётся один, и его
 * монтирование закреплено соседним прогоном panelsAreMounted.test.ts: без этого
 * та же правка могла уйти в копию вкладки, как это уже случалось в этом дереве
 * трижды.
 *
 * ПОЧЕМУ НЕ assert.match. Он печатает в отказе всю проверяемую строку — то есть
 * весь файл вкладки, десять тысяч знаков, среди которых причину отказа не
 * видно. Здесь проверка через assert.ok, и в выводе остаётся только сообщение.
 */

const STAFF_TAB = join(
	webSrcRoot,
	"components",
	"settings",
	"SettingsStaffTab.tsx",
);
const SETTINGS_VIEW = join(webSrcRoot, "SettingsView.tsx");

/** Отказ печатает причину, а не содержимое файла. */
function expectSource(source: string, pattern: RegExp, message: string): void {
	assert.ok(pattern.test(source), message);
}

/** Код вкладки без строк комментариев: разбор в комментарии за код не считается. */
function staffTabCode(): string {
	const source = readFileSync(STAFF_TAB, "utf8");
	assert.ok(
		source.length > 4000,
		"SettingsStaffTab.tsx выродился — страж проверяет не тот файл или файл опустел",
	);
	return source
		.split(/\r?\n/)
		.filter((line) => {
			const trimmed = line.trimStart();
			return (
				!trimmed.startsWith("*") &&
				!trimmed.startsWith("//") &&
				!trimmed.startsWith("/*")
			);
		})
		.join("\n");
}

test("вкладка «Сотрудники» вообще смонтирована", () => {
	expectSource(
		readFileSync(SETTINGS_VIEW, "utf8"),
		/SettingsStaffTab/,
		"SettingsView.tsx больше не отрисовывает SettingsStaffTab — правки телефона до людей не доходят",
	);
});

test("телефон сотрудника можно ввести при заведении", () => {
	const code = staffTabCode();
	expectSource(
		code,
		/newStaffPhone.*useState|useState.*newStaffPhone/,
		"В форме заведения сотрудника нет состояния телефона",
	);
	expectSource(
		code,
		/type="tel"/,
		'В форме заведения сотрудника нет поля ввода телефона (type="tel")',
	);
	expectSource(
		code,
		/Телефон/,
		"Поле телефона без подписи «Телефон» — человек не найдёт его глазами",
	);
	expectSource(
		code,
		/phone:\s*newStaffPhone\.trim\(\)\s*\|\|\s*null/,
		"Введённый телефон не попадает в тело запроса POST /api/settings/staff — экран собирал бы его в пустоту",
	);
});

test("телефон сотрудника видно на его карточке", () => {
	const code = staffTabCode();
	expectSource(
		code,
		/member\.phone/,
		"Карточка сотрудника не читает member.phone — сохранённый номер остаётся невидимым",
	);
	/*
	 * Именно ВЫВОД значения, а не проверка на истинность. Первая редакция стража
	 * требовала лишь упоминания member.phone — и оставалась зелёной, когда
	 * карточку сломали до `{member.phone ? <span>номер есть</span> : …}`:
	 * условие читало номер, а на экран он не попадал. Клиника видела «номер
	 * есть» и не знала какой.
	 */
	expectSource(
		code,
		/\{member\.phone\}/,
		"Карточка проверяет member.phone, но САМ НОМЕР не выводит — на экране «номер есть» вместо номера",
	);
	expectSource(
		code,
		/телефон не указан/,
		"Отсутствие номера не названо словами: пустое место на карточке неотличимо от «поля не существует»",
	);
});

test("телефон уже заведённого сотрудника можно исправить", () => {
	const code = staffTabCode();
	expectSource(
		code,
		/handleUpdatePhone/,
		"Обработчика правки телефона нет — страж потерял цель проверки",
	);
	expectSource(
		code,
		/method:\s*"PUT"/,
		"Вкладка не делает ни одного PUT — карточку сотрудника нечем исправить",
	);
	expectSource(
		code,
		/\/api\/settings\/staff\/\$\{staffId\}/,
		"Правка не адресована PUT /api/settings/staff/:staffId — единственному маршруту правки карточки",
	);
	expectSource(
		code,
		/phone:\s*phoneDraft\.trim\(\)\s*\|\|\s*null/,
		"Правка не отправляет телефон, либо пустое поле уходит пустой строкой вместо null: " +
			"колонка nullable, и «номер стёрли» обязано храниться пустотой",
	);
});

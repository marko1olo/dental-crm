/**
 * Сторож экрана входа в программу: «сотрудников нет» и «список не прочитан» —
 * разные состояния и разные тексты.
 *
 * ЧТО СЛОМАЛОСЬ 29.07.2026. В программу нельзя было войти вообще. Экран
 * разблокировки смены сообщал «В клинике пока нет ни одного действующего
 * сотрудника. Добавьте людей в разделе «Настройки → Кадры» — без сотрудника
 * смену открыть нельзя», хотя в базе было трое действующих сотрудников. Дальше
 * этого экрана пути нет: без сотрудника смену не открыть, значит недоступен ни
 * один раздел — для клиники это «программа не запускается».
 *
 * Корень был на сервере (см. apps/api/src/tests/routes/dashboardOrphanClinicSession.test.ts),
 * но экран сделал корень невидимым: `App.tsx` передавал список выражением
 * `dashboard.clinicSettings?.staff ?? []`, и `?? []` превращал «не прочитано» в
 * «прочитано и пусто». Тот же класс, что `response.ok ? json : []` в панелях,
 * только на самом входе.
 *
 * ЗДЕСЬ ОХРАНЯЕТСЯ ДВА УТВЕРЖДЕНИЯ:
 *   1. Решение о состоянии списка (`resolveStaffUnlockListState`) различает
 *      «не прочитан», «пусто» и «есть кого выбрать».
 *   2. Разметка входа этого различия не теряет: `App.tsx` не подменяет
 *      непрочитанный список пустым массивом, а `StaffPinPad.tsx` показывает при
 *      отказе общий компонент отказа, а не свой текст.
 *
 * Второе проверяется по тексту исходников намеренно. Оба места — это разметка
 * React, у неё нет возвращаемого значения, которое можно сравнить; а дефект
 * приходит именно правкой этих двух строк.
 *
 * ЗАПУСК: cd apps/web && npx tsx --test src/tests/staffUnlockListState.test.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
	resolveStaffUnlockListState,
	resolveStaffUnlockPhase,
	STAFF_UNLOCK_LIST_SUBJECT,
} from "../components/auth/staffUnlockState.js";
import { panelStateText } from "../lib/panelStateText.js";

const webSrc = path.resolve(import.meta.dirname, "..");
const readSource = (relativePath: string): string =>
	readFileSync(path.join(webSrc, relativePath), "utf8");

const active = (id: string, fullName: string) => ({
	id,
	fullName,
	role: "doctor",
	active: true,
});

describe("resolveStaffUnlockListState: непрочитанный список не выдаётся за пустой", () => {
	it("список не пришёл вовсе — это отказ, а не пустота", () => {
		assert.equal(resolveStaffUnlockListState(undefined).phase, "failed");
		assert.equal(resolveStaffUnlockListState(null).phase, "failed");
	});

	it("вместо массива пришёл объект или строка — тоже отказ", () => {
		assert.equal(resolveStaffUnlockListState({ staff: [] }).phase, "failed");
		assert.equal(resolveStaffUnlockListState("").phase, "failed");
		assert.equal(resolveStaffUnlockListState(0).phase, "failed");
	});

	it("пустой массив — честная пустота, а не отказ", () => {
		assert.equal(resolveStaffUnlockListState([]).phase, "empty");
	});

	it("все сотрудники отключены — тоже пустота", () => {
		const state = resolveStaffUnlockListState([
			{ id: "u1", fullName: "Уволенный врач", role: "doctor", active: false },
			{
				id: "u2",
				fullName: "Уволенный администратор",
				role: "administrator",
				active: false,
			},
		]);
		assert.equal(state.phase, "empty");
	});

	it("есть действующие — отдаёт только их", () => {
		const state = resolveStaffUnlockListState([
			active("u1", "Смирнова Елена Владимировна"),
			{ id: "u2", fullName: "Уволенный врач", role: "doctor", active: false },
			active("u3", "Администратор клиники"),
		]);
		assert.equal(state.phase, "ready");
		assert.deepEqual(
			state.phase === "ready"
				? state.activeStaff.map((member) => member.id)
				: [],
			["u1", "u3"],
		);
	});

	it("запись без поля active показывается: одно отсутствующее поле не закрывает смену всей клинике", () => {
		const state = resolveStaffUnlockListState([
			{ id: "u1", fullName: "Врач без признака", role: "doctor" },
		]);
		assert.equal(state.phase, "ready");
	});

	it("мусор в списке не превращается в кнопку без имени", () => {
		// null проходил прежний фильтр `m?.active ?? true` и рисовался кнопкой,
		// нажатие на которую отправляло на сервер userId: undefined.
		const state = resolveStaffUnlockListState([
			null,
			undefined,
			{},
			{ id: "   " },
			active("u1", "Настоящий врач"),
		]);
		assert.equal(state.phase, "ready");
		assert.deepEqual(
			state.phase === "ready"
				? state.activeStaff.map((member) => member.id)
				: [],
			["u1"],
		);
	});

	it("непрочитанный список даёт текст с причиной и действием, а не совет заводить кадры", () => {
		const failed = panelStateText(STAFF_UNLOCK_LIST_SUBJECT, {
			phase: "failed",
			status: 401,
		});
		assert.match(failed.title, /Список сотрудников не прочитан/);
		assert.doesNotMatch(failed.title, /нет ни одного действующего сотрудника/);
		assert.doesNotMatch(failed.hint, /Настройки → Кадры/);
		assert.match(failed.hint, /список не прочитан/i);
		// Отказ по доступу лечится входом заново — кнопка обязана это говорить.
		assert.equal(failed.retryLabel, "Я вошёл — прочитать снова");
		// Кода ответа человеку не показываем ни в заголовке, ни в подсказке.
		assert.doesNotMatch(`${failed.title} ${failed.hint}`, /\b401\b/);
	});

	it("честная пустота по-прежнему ведёт в «Настройки → Кадры»", () => {
		const empty = panelStateText(STAFF_UNLOCK_LIST_SUBJECT, { phase: "empty" });
		assert.match(empty.title, /нет ни одного действующего сотрудника/);
		assert.match(empty.hint, /Настройки → Кадры/);
	});
});

describe("resolveStaffUnlockPhase: загрузка не выдаётся за отказ, а данные — за загрузку", () => {
	it("сводка ещё едет — это загрузка, а не отказ", () => {
		const phase = resolveStaffUnlockPhase({
			isLoading: true,
			list: resolveStaffUnlockListState(undefined),
		});
		assert.equal(phase, "loading");
	});

	it("загрузка кончилась, списка нет — отказ", () => {
		const phase = resolveStaffUnlockPhase({
			isLoading: false,
			list: resolveStaffUnlockListState(undefined),
		});
		assert.equal(phase, "failed");
	});

	it("загрузка кончилась, список пуст — честная пустота", () => {
		assert.equal(
			resolveStaffUnlockPhase({
				isLoading: false,
				list: resolveStaffUnlockListState([]),
			}),
			"empty",
		);
	});

	it("люди уже пришли — кнопки не гасятся обновлением", () => {
		const list = resolveStaffUnlockListState([
			active("u1", "Смирнова Елена Владимировна"),
		]);
		assert.equal(resolveStaffUnlockPhase({ isLoading: true, list }), "ready");
		assert.equal(resolveStaffUnlockPhase({ isLoading: false, list }), "ready");
	});
});

describe("разметка входа не теряет различия", () => {
	it("App.tsx не подменяет непрочитанный список сотрудников пустым массивом", () => {
		const source = readSource("App.tsx");
		const pinPadCall = source.slice(source.indexOf("<StaffPinPad"));
		assert.ok(
			pinPadCall.startsWith("<StaffPinPad"),
			"В App.tsx не найден вызов StaffPinPad.",
		);
		const staffProp = /staffMembers=\{([^}]*)\}/.exec(pinPadCall);
		assert.ok(
			staffProp,
			"В App.tsx не найдено свойство staffMembers у StaffPinPad.",
		);
		assert.doesNotMatch(
			String(staffProp[1]),
			/\?\?\s*\[\]/,
			"App.tsx снова передаёт `?? []` в staffMembers. Это превращает непрочитанный список в пустой, " +
				"и экран смены сообщает «сотрудников нет» вместо причины отказа — в программу нельзя войти. " +
				`Найдено: staffMembers={${String(staffProp[1]).trim()}}`,
		);
	});

	it("StaffPinPad показывает при отказе общий компонент, а не свой текст", () => {
		const source = readSource("components/auth/StaffPinPad.tsx");
		assert.match(
			source,
			/PanelLoadFailure/,
			"StaffPinPad больше не показывает общий компонент отказа панели. Второй язык ошибок на экране входа " +
				"путает сильнее самого отказа.",
		);
		assert.match(
			source,
			/resolveStaffUnlockListState/,
			"StaffPinPad решает состояние списка сам, минуя resolveStaffUnlockListState, — значит различие " +
				"«пусто» и «не прочитано» снова живёт в разметке и ничем не охраняется.",
		);
	});
});

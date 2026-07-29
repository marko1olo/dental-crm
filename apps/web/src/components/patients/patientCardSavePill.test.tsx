/**
 * СТОРОЖ: ЭКРАН НЕ ИМЕЕТ ПРАВА УТВЕРЖДАТЬ «Сохранено», НИЧЕГО НЕ СОХРАНИВ.
 *
 * Запуск (рабочий каталог важен — jsx настроен в apps/web/tsconfig.json):
 *   cd apps/web && node --import tsx --import ./testCssStub.mjs --test \
 *     src/components/patients/patientCardSavePill.test.tsx
 *
 * ЧТО ЗДЕСЬ ОХРАНЯЕТСЯ. В PatientsView.tsx плашка состояния карточки была
 * цепочкой условий с БЕЗУСЛОВНОЙ последней ветвью: не сохраняется, не сломалось,
 * не изменено — значит «Сохранено». Ни выбранный пациент, ни факт хотя бы одного
 * успешного сохранения в условие не входили, поэтому свежая картотека без
 * выбранного пациента показывала зелёную плашку «Сохранено» рядом с пустым полем
 * ФИО. Регистратор, вернувшийся к заполненной и не сохранённой карточке, видел
 * ровно ту же надпись.
 *
 * Первый прогон ниже поднимает НАСТОЯЩИЙ экран картотеки, а не только правило:
 * дефект жил в разметке, и проверка одного лишь чистого модуля пропустила бы
 * возврат безусловной ветки прямо в JSX.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Patient } from "@dental/shared";
import { AppLogicProvider, type AppLogicContextType } from "../../contexts/AppLogicContext";
import { PatientsView } from "../../PatientsView";
import { usePatientStore } from "../../store/patientStore";
import {
	PatientCardSavePill,
	patientCardSavePill,
	type PatientSectionSaveState,
} from "./patientCardSavePill";

const here = dirname(fileURLToPath(import.meta.url));

/** Свежая картотека: пациент не выбран, ничего не введено, ничего не сохранялось. */
function resetPatientStore(): void {
	const store = usePatientStore.getState();
	store.setSelectedPatientId(null);
	store.setPatientCoreSaveState("idle");
	store.setPatientCoreDirty(false);
	store.setPatientAdministrativeProfileSaveState("idle");
	store.setPatientAdministrativeProfileDirty(false);
	store.setNewPatientName("");
	store.setNewPatientPhone("");
	store.setNewPatientBirthDate("");
}

/**
 * Свойства экрана задаются здесь целиком, а не берутся из контекста: всё, что
 * рисуется, приходит отсюда.
 *
 * ПОЧЕМУ ВОКРУГ СТОИТ ПРОВАЙДЕР С ПУСТЫМ ЗНАЧЕНИЕМ. Прежде экран поднимался
 * вовсе без провайдера: `useAppLogicContext()` тогда возвращал
 * `{} as AppLogicContextType` — выдуманный пустой объект вместо отказа, — и
 * сторож этим молча пользовался. Теперь хук вне провайдера бросает исключение
 * (contexts/AppLogicContext.tsx), потому что отсутствие провайдера — дефект
 * сборки дерева, а не состояние данных. Поблажки в продукте ради теста быть не
 * может, поэтому отсутствие данных сказано вслух ЗДЕСЬ: провайдер есть, значение
 * в нём пустое, приведение стоит в тесте. Проверяемое поведение от этого не
 * меняется — экран и раньше читал из контекста пустоту.
 */
const emptyAppLogicValue = {} as AppLogicContextType;

function patientsViewMarkup(options: {
	readonly selectedPatient?: Patient | null;
	readonly patientAdministrativeProfileValidationMessage?: string | null;
}): string {
	return renderToStaticMarkup(
		<AppLogicProvider value={emptyAppLogicValue}>
		<PatientsView
			createPatient={() => undefined}
			filteredPatients={[]}
			money={(amountRub: number) => `${amountRub} ₽`}
			normalizeOptionalWorkingDaysDraft={(days: number[]) => days}
			patientAdministrativeProfileValidationMessage={
				options.patientAdministrativeProfileValidationMessage ?? null
			}
			patientInsightById={new Map()}
			patientInsightRiskLabels={{ low: "спокойно", watch: "контроль", high: "риск" }}
			query=""
			savePatientAdministrativeProfile={() => undefined}
			savePatientCore={() => undefined}
			selectedPatient={options.selectedPatient ?? null}
			setQuery={() => undefined}
			updatePatientAdministrativeProfileDraft={() => undefined}
			updatePatientCoreDraft={() => undefined}
			weekdayOptions={[{ label: "Пн", value: 1 }]}
		/>
		</AppLogicProvider>,
	);
}


/**
 * ВЫРЕЗАНИЕ КОММЕНТАРИЕВ ПЕРЕД ПОИСКОМ СЛОВ ПЛАШКИ.
 *
 * Без него проверка ниже краснеет на ОБЪЯСНЕНИИ: в PatientsView.tsx три
 * комментария рассказывают, почему безусловная ветка «Сохранено» была ложью и
 * почему «Заполнено» утверждало внесённые паспорт, ИНН и СНИЛС у пустых
 * реквизитов. Требовать стереть этот текст значит стереть единственное место, где
 * объяснена причина правки. В этом дереве сторож краснел на объяснении уже трижды —
 * проверка оформления панелей, храповик адресов и хук запрета подписи инструмента.
 *
 * Форма JSX `{/* … *\/}` покрывается тем же правилом блочного комментария;
 * оставшиеся одинокие фигурные скобки поиску слов не мешают.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("плашка сохранения на живом экране картотеки", () => {
	test("пациент не выбран и ничего не сохранялось — «Сохранено» не отрисовано", () => {
		resetPatientStore();
		const markup = patientsViewMarkup({ selectedPatient: null });

		// Экран действительно отрисовался, а не свернулся в пустую строку:
		// иначе проверка отсутствия надписи прошла бы на пустом месте.
		assert.ok(
			markup.includes('id="patients"'),
			"экран картотеки не отрисовался — проверка отсутствия надписи ничего не значит",
		);
		assert.ok(
			markup.includes("Карточка пациента"),
			"заголовок карточки не отрисовался — плашка рисуется рядом с ним, проверять нечего",
		);
		assert.ok(
			!markup.includes("Сохранено"),
			"на экране без выбранного пациента и без единого сохранения отрисовано «Сохранено» — " +
				"это утверждение о записи, которой не было. Ровно из-за него регистратор уходит от " +
				"заполненной и не сохранённой карточки",
		);
		assert.ok(
			!markup.includes("save-pill"),
			"плашка состояния сохранения отрисована при невыбранном пациенте — состояние сохранения " +
				"к незаполненной карточке не относится",
		);
	});

	/*
	 * ПОЧЕМУ СЛУЧАЙ С ВЫБРАННЫМ ПАЦИЕНТОМ ЗДЕСЬ НЕ ПОДНИМАЕТСЯ ЦЕЛИКОМ. При
	 * выбранном пациенте экран монтирует зубную формулу
	 * (components/odontogram/OdontogramModule.tsx:294), а она читает
	 * `import.meta.env.VITE_WS_URL` — расширение Vite, которого в node нет вовсе:
	 * `import.meta.env` там undefined, и разметка падает ещё до карточки. Чинить
	 * это подменой окружения в стороже нельзя: сторож начал бы охранять свою
	 * заглушку. Поэтому состояния с выбранным пациентом проверяются на самой
	 * плашке ниже, а связь экрана с ней — переписью его исходника: без неё
	 * прогон выше остался бы зелёным и на экране, из которого плашку просто
	 * удалили.
	 */
	test("экран монтирует плашку в оба места и не держит своей копии правила", () => {
		const rawSource = readFileSync(join(here, "..", "..", "PatientsView.tsx"), "utf8");
		// Слова плашки ищутся в коде, а не в объяснениях: см. stripComments выше.
		const source = stripComments(rawSource);
		const mounts = source.match(/<PatientCardSavePill/g) ?? [];
		assert.equal(
			mounts.length,
			2,
			"плашек состояния сохранения на экране картотеки две — у заголовка карточки и у блока " +
				`паспортных данных; в разметке найдено ${mounts.length}`,
		);
		const guarded = source.match(/hasSelectedPatient=\{Boolean\(selectedPatient\)\}/g) ?? [];
		assert.equal(
			guarded.length,
			2,
			"обе плашки обязаны получать факт выбранного пациента: без него состояние сохранения " +
				"снова начнёт рисоваться у пустой карточки",
		);
		assert.ok(
			!source.includes("status-pill"),
			"на экране картотеки снова появился класс из словаря статусов ПРИЁМА",
		);
		/*
		 * СЛОВА, А НЕ ТРИ ТОЧНЫЕ ФОРМЫ ЗАПИСИ.
		 *
		 * Прежняя проверка запрещала ровно три написания (`status-pill`,
		 * `: "Сохранено"`, `: "Заполнено"`) и обходилась четвёртым. Приёмка
		 * доказала замером: дописали `{selectedPatient && <span
		 * className="save-pill save-pill-saved">Сохранено</span>}` — то есть
		 * безусловное «Сохранено» у каждого выбранного пациента, — и охрана дала
		 * восемь из восьми зелёных.
		 *
		 * Инвариант теперь жёстче и не зависит от формы: слова, которыми владеет
		 * плашка, на экране не встречаются вовсе. Правило живёт в одном месте.
		 */
		for (const word of ["Сохранено", "Не сохранено", "Заполнено", "save-pill"]) {
			assert.ok(
				!source.includes(word),
				`в разметку экрана вернулось слово «${word}»: правило состояния сохранения живёт в одном месте, ` +
					"patientCardSavePill.tsx, и прогоняется. Прежняя проверка запрещала ТРИ ТОЧНЫЕ формы записи " +
					"и обходилась четвёртой: приёмка дописала <span className=\"save-pill save-pill-saved\">Сохранено</span> " +
					"внутри области выбранного пациента, и охрана осталась зелёной.",
			);
		}
	});
});

describe("правило плашки сохранения", () => {
	const idle = { dirty: false, saveState: "idle" as PatientSectionSaveState };

	test("без выбранного пациента плашки нет ни в одном состоянии", () => {
		for (const saveState of ["idle", "saving", "saved", "error"] as const) {
			for (const dirty of [false, true]) {
				assert.equal(
					patientCardSavePill({
						hasSelectedPatient: false,
						sections: [{ dirty, saveState }],
					}),
					null,
					`состояние ${saveState}/${dirty ? "изменено" : "чисто"} дало плашку без пациента`,
				);
			}
		}
	});

	test("«Сохранено» только при состоянии saved, а не по умолчанию", () => {
		assert.equal(
			patientCardSavePill({ hasSelectedPatient: true, sections: [idle] }),
			null,
			"пациент выбран, ничего не сохранялось и не изменено — плашке сказать нечего",
		);
		assert.equal(
			patientCardSavePill({
				hasSelectedPatient: true,
				sections: [{ dirty: false, saveState: "saved" }],
			})?.label,
			"Сохранено",
		);
	});

	test("несохранённая правка перебивает состоявшееся сохранение другого блока", () => {
		const pill = patientCardSavePill({
			hasSelectedPatient: true,
			sections: [
				{ dirty: false, saveState: "saved" },
				{ dirty: true, saveState: "idle" },
			],
		});
		assert.equal(pill?.label, "Не сохранено");
		assert.equal(pill?.tone, "dirty");
	});

	test("незакрытая ошибка не прячется за надписью о ходе сохранения", () => {
		// Достижимо: сохранение реквизитов упало, регистратор правит основные данные
		// и жмёт «Сохранить данные». Правка сбрасывает в "idle" только своё
		// состояние, ошибка реквизитов остаётся, а часть введённого на сервер не
		// попала — это важнее сообщения о ходе работы, которое разрешится само.
		const pill = patientCardSavePill({
			hasSelectedPatient: true,
			sections: [
				{ dirty: false, saveState: "saving" },
				{ dirty: false, saveState: "error" },
			],
		});
		assert.equal(pill?.label, "Ошибка");
	});

	test("отказ валидации до запроса — тоже ошибка, а не «нет изменений»", () => {
		assert.equal(
			patientCardSavePill({
				hasSelectedPatient: true,
				sections: [
					{
						dirty: false,
						saveState: "idle",
						validationMessage: "Укажите конец удобного времени приема или очистите начало.",
					},
				],
			})?.label,
			"Ошибка",
		);
		// Пустая строка — не сообщение: иначе плашка встанет в «Ошибка» на ровном месте.
		assert.equal(
			patientCardSavePill({
				hasSelectedPatient: true,
				sections: [{ dirty: false, saveState: "idle", validationMessage: "" }],
			}),
			null,
		);
	});

	test("каждое состояние красится своим классом, и ни одно — словарём статусов приёма", () => {
		const rendered = [
			{ dirty: false, saveState: "saving" as PatientSectionSaveState, expect: "save-pill-saving" },
			{ dirty: true, saveState: "idle" as PatientSectionSaveState, expect: "save-pill-dirty" },
			{ dirty: false, saveState: "error" as PatientSectionSaveState, expect: "save-pill-error" },
			{ dirty: false, saveState: "saved" as PatientSectionSaveState, expect: "save-pill-saved" },
		];
		for (const state of rendered) {
			const markup = renderToStaticMarkup(
				createElement(PatientCardSavePill, {
					hasSelectedPatient: true,
					sections: [{ dirty: state.dirty, saveState: state.saveState }],
				}),
			);
			assert.ok(markup.includes(state.expect), `${state.expect} не отрисован: ${markup}`);
			assert.ok(!markup.includes("status-"), `плашка тянет чужой словарь: ${markup}`);
			// Пояснение обязательно: сама надпись из двух слов не говорит, что делать.
			assert.match(markup, /title="[^"]{20,}"/);
		}
	});
});

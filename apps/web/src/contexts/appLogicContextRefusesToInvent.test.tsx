/**
 * СТОРОЖ: КОНТЕКСТ НЕ ИМЕЕТ ПРАВА ВЫДУМЫВАТЬ ЗНАЧЕНИЕ ВМЕСТО ОТКАЗА.
 *
 * Запуск (рабочий каталог важен — jsx настроен в apps/web/tsconfig.json):
 *   cd apps/web && node --import tsx --import ./testCssStub.mjs --test \
 *     "src/contexts/*.test.tsx"
 *
 * ЧТО ЗДЕСЬ ОХРАНЯЕТСЯ. `useAppLogicContext()` при отсутствии провайдера
 * возвращал `{} as AppLogicContextType`. Приведение обещало компилятору полный
 * объект, а во время работы отдавало пустой: каждое поле `undefined`, ошибки
 * нет, предупреждения в консоли нет. Экран, собранный выше провайдера, рисовал
 * пустое место — и это читается как «данных пока нет», а не как поломка. Один
 * раз это уже стоило клинике 59 молча пустующих потребителей: провайдер стоял
 * только вокруг настроек.
 *
 * ПОЧЕМУ ОДНОГО ПРОГОНА ПРАВИЛА МАЛО. Первый блок ниже поднимает НАСТОЯЩИЙ
 * экран картотеки (PatientsView — потребитель контекста), а не только хук:
 * подмена жила в возвращаемом значении хука, и проверка хука в отрыве от
 * компонента не показала бы, что именно видит человек. Второй блок проверяет
 * сам хук — что отказ ясен, называет провайдера и говорит, что делать.
 *
 * ЧТО ЭТОТ ФАЙЛ НЕ ПРОВЕРЯЕТ. Он не утверждает, что в дереве нет потребителей
 * вне провайдера, — это свойство разметки, и его считает
 * tests/panelsAreMounted.test.ts со своей стороны. Здесь охраняется одно: если
 * провайдера нет, ответ — отказ, а не значение.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientsView } from "../PatientsView";
import { usePatientStore } from "../store/patientStore";
import { AppLogicProvider, type AppLogicContextType, useAppLogicContext } from "./AppLogicContext";

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
 * Пропсы экрана задаются целиком здесь. Приведение стоит в ТЕСТЕ, а не в
 * продукте: сторожу нужен провайдер, у которого внутри пусто, — иначе он не
 * отличит «провайдер есть, данных нет» от «провайдера нет».
 */
const emptyProviderValue = {} as AppLogicContextType;

const patientsViewElement = () => (
	<PatientsView
		createPatient={() => undefined}
		filteredPatients={[]}
		money={(amountRub: number) => `${amountRub} ₽`}
		normalizeOptionalWorkingDaysDraft={(days: number[]) => days}
		patientAdministrativeProfileValidationMessage={null}
		patientInsightById={new Map()}
		patientInsightRiskLabels={{ low: "спокойно", watch: "контроль", high: "риск" }}
		query=""
		savePatientAdministrativeProfile={() => undefined}
		savePatientCore={() => undefined}
		selectedPatient={null}
		setQuery={() => undefined}
		updatePatientAdministrativeProfileDraft={() => undefined}
		updatePatientCoreDraft={() => undefined}
		weekdayOptions={[{ label: "Пн", value: 1 }]}
	/>
);

describe("потребитель контекста вне провайдера", () => {
	test("живой экран картотеки без провайдера ОТКАЗЫВАЕТ, а не рисует пустоту", () => {
		resetPatientStore();

		let thrown: unknown = null;
		let markup: string | null = null;
		try {
			markup = renderToStaticMarkup(patientsViewElement());
		} catch (error) {
			thrown = error;
		}

		assert.ok(
			thrown instanceof Error,
			"экран картотеки поднялся ВНЕ <AppLogicProvider> и не отказал. Значит контекст снова " +
				"выдаёт значение вместо отказа, и следующая ветка, собранная выше провайдера, будет " +
				`молча пустовать. Отрисовано: ${String(markup).slice(0, 200)}`,
		);
	});

	test("текст отказа называет хук, провайдера и следующий шаг", () => {
		let message = "";
		try {
			renderToStaticMarkup(patientsViewElement());
		} catch (error) {
			message = error instanceof Error ? error.message : String(error);
		}

		// Слова, без которых отказ не помогает: по нему должно быть видно, ЧТО
		// сломано и ЧЕМ починить, без чтения исходников контекста.
		for (const needle of ["useAppLogicContext", "AppLogicProvider"]) {
			assert.ok(
				message.includes(needle),
				`в тексте отказа нет «${needle}»; отказ без имени хука и провайдера отправляет ` +
					`разработчика искать причину вслепую. Текст: ${message}`,
			);
		}
		assert.ok(
			message.length >= 80,
			`отказ из ${message.length} символов слишком краток, чтобы объяснить, что делать: ${message}`,
		);
		// Отказ обязан быть на языке остальной системы: сообщения читает тот же
		// человек, что и надписи в интерфейсе.
		assert.match(message, /[А-я]/, `текст отказа не по-русски: ${message}`);
	});

	test("тот же экран внутри провайдера поднимается", () => {
		resetPatientStore();
		const markup = renderToStaticMarkup(
			<AppLogicProvider value={emptyProviderValue}>{patientsViewElement()}</AppLogicProvider>,
		);
		assert.ok(
			markup.includes('id="patients"'),
			"экран картотеки не отрисовался даже с провайдером — тогда проверка отказа выше ничего " +
				`не доказывает: падать могло по любой другой причине. Отрисовано: ${markup.slice(0, 200)}`,
		);
	});
});

describe("хук в отрыве от экрана", () => {
	function HookProbe() {
		useAppLogicContext();
		return createElement("i", null, "готово");
	}

	test("без провайдера — исключение, ни в каком виде не пустой объект", () => {
		assert.throws(
			() => renderToStaticMarkup(createElement(HookProbe)),
			/useAppLogicContext/,
			"хук без провайдера не бросил исключение с внятным текстом",
		);
	});

	test("с провайдером хук отдаёт РОВНО переданное значение", () => {
		// Отдельная проверка, потому что бросок легко «пройти» хуком, который
		// бросает всегда: тогда провайдер перестал бы работать вовсе.
		const marker = { serviceTitle: "проверка провайдера" } as unknown as AppLogicContextType;
		let seen: unknown = null;
		function ValueProbe() {
			seen = useAppLogicContext();
			return createElement("i", null, "готово");
		}
		renderToStaticMarkup(
			createElement(AppLogicProvider, { value: marker, children: createElement(ValueProbe) }),
		);
		assert.equal(seen, marker, "внутри провайдера хук вернул не переданное значение");
	});
});

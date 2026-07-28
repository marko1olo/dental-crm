/**
 * Формы документов обязаны обнуляться при смене пациента.
 *
 * ЧТО БЫЛО СЛОМАНО. `store/documentStore.ts` — одно глобальное хранилище примерно
 * на восемьсот полей на все виды документов, и функции сброса в нём не было
 * вовсе. Пер-пациентный черновик заведён ровно у двух видов из тридцати
 * (`documentPayloadDraftKey`: `outpatient_medical_card_025u` и
 * `medical_record_extract`), остальные формы о пациенте не знают ничего —
 * `PhotoVideoConsentForm.tsx` не упоминает пациента ни разу.
 *
 * Что видел администратор: заполнил согласие на фото и видео пациенту А, включая
 * отметку «разрешена узнаваемая публикация», открыл карточку пациента Б — и
 * согласие Б стоит с ответами А. Дальше документ печатается и подписывается, то
 * есть юридический документ уходит с чужими ответами.
 *
 * Здесь проверяется сам механизм сброса, а не отрисовка: значение, записанное в
 * стор, обязано исчезнуть после сброса, а признак «что-то набрано» обязан
 * отличать заполненную форму от чистой. Без второго сброс либо молча теряет
 * набранное, либо показывает предупреждение всегда — и тогда его перестают читать.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	documentFormHasEntries,
	documentFormInitialValues,
	useDocumentStore,
} from "../store/documentStore";

describe("сброс форм документов при смене пациента", () => {
	test("исходные значения собираются и не содержат функций", () => {
		const initial = documentFormInitialValues() as Record<string, unknown>;
		const keys = Object.keys(initial);
		/*
		 * Порог намеренно грубый и низкий: он ловит вырождение сборки в пустой
		 * объект (тогда сброс не сбрасывал бы ничего), а не фиксирует число полей,
		 * которое меняется от каждой новой формы.
		 */
		assert.ok(
			keys.length > 100,
			`полей в исходных значениях всего ${keys.length} — сборка срезов выродилась, сброс перестал бы что-либо сбрасывать`,
		);
		const functions = keys.filter((key) => typeof initial[key] === "function");
		assert.deepEqual(
			functions,
			[],
			"в исходные значения попали функции-сеттеры: сброс затёр бы сеттеры стора и сломал бы все формы",
		);
	});

	test("чистый стор не считается заполненным", () => {
		useDocumentStore.getState().resetDocumentForms();
		assert.equal(
			documentFormHasEntries(useDocumentStore.getState() as unknown as Record<string, unknown>),
			false,
			"чистая форма считается заполненной — предупреждение о выброшенном черновике показывалось бы всегда",
		);
	});

	test("набранное видно, сброс его убирает", () => {
		useDocumentStore.getState().resetDocumentForms();
		const before = useDocumentStore.getState().intakeAllergyStatus;

		useDocumentStore.setState({
			intakeAllergyStatus: "аллергия на артикаин, отёк Квинке",
		});
		assert.equal(
			useDocumentStore.getState().intakeAllergyStatus,
			"аллергия на артикаин, отёк Квинке",
			"значение не записалось — дальше проверять нечего",
		);
		assert.equal(
			documentFormHasEntries(useDocumentStore.getState() as unknown as Record<string, unknown>),
			true,
			"заполненная форма не опознана: администратор не узнал бы, что его текст выброшен",
		);

		useDocumentStore.getState().resetDocumentForms();
		/*
		 * КОНТРОЛЬ ОТКАТОМ. Именно это и было сломано: без сброса аллергоанамнез
		 * пациента А оставался в форме пациента Б. Если строка ниже когда-нибудь
		 * начнёт проходить при выключенном сбросе — значит сброс перестал работать.
		 */
		assert.equal(
			useDocumentStore.getState().intakeAllergyStatus,
			before,
			"аллергоанамнез прежнего пациента остался в форме следующего — это и есть чужие данные в документе",
		);
		assert.equal(
			documentFormHasEntries(useDocumentStore.getState() as unknown as Record<string, unknown>),
			false,
			"после сброса форма всё ещё считается заполненной",
		);
	});

	test("сброс не уносит с собой сеттеры стора", () => {
		useDocumentStore.getState().resetDocumentForms();
		const state = useDocumentStore.getState();
		assert.equal(
			typeof state.setIntakeAllergyStatus,
			"function",
			"сеттер пропал после сброса — форма перестала бы принимать ввод вообще",
		);
		assert.equal(
			typeof state.resetDocumentForms,
			"function",
			"сам сброс исчез после первого применения — второй смены пациента он бы не отработал",
		);
	});
});

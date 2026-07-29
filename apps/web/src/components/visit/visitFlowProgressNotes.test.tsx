import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
	VisitFlowDocumentsStepResult,
	VisitFlowDraftStepResult,
	VisitFlowPlanStepResult,
	VisitFlowRecommendationsStepResult,
	VisitFlowResult,
	VisitFlowStepStatus,
} from "@dental/shared";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitFlowProgress } from "./VisitFlowProgress";

/**
 * ПРИЧИНА ОТКАЗА ШАГА РАЗБОРА ДОЛЖНА ДОХОДИТЬ ДО ВРАЧА СЛОВАМИ.
 *
 * Запуск: из apps/web
 *   node --import tsx --import ./testCssStub.mjs --test \
 *     src/components/visit/visitFlowProgressNotes.test.tsx
 * (рабочий каталог важен: tsx берёт настройку jsx из apps/web/tsconfig.json;
 * стаб нужен потому, что компонент импортирует свой .css.)
 *
 * Что охраняет этот файл. Панель «Ассистент обработки приема» показывала шаг
 * янтарной или красной точкой без единого знака и без подписи: отметка
 * рисовалась только для running и success, а `message` трёх шагов из четырёх
 * выбрасывался жёстким `msg: null`. Сервер эти причины отдаёт готовыми
 * по-русски (apps/api/src/ai/visitFlowOrchestrator.ts), и схема их описывает
 * (visitFlowStepResultSchema в packages/shared). Для врача «пропущено, потому
 * что выключено в настройках» выглядело так же, как «ещё считается», и так же,
 * как отказ: он ждал результата, которого не будет.
 */

/*
 * Шаги собираются ПО ВИДУ, а не одной безымянной заготовкой.
 *
 * Раньше здесь стояла одна функция `step(status, message, data: unknown)`, и это
 * было точным отражением контракта: `data` объявлялся `z.unknown()`, вид шага в
 * ответе не назывался, а какому шагу какое содержимое принадлежит, знали только
 * сервер и экран. Теперь у каждого шага свой тип, и фикстура обязана его назвать
 * — фикстура, которая собирает шаг «плана» из полей «черновика», больше не
 * соберётся.
 */
const draftStep = (status: VisitFlowStepStatus, message: string | null = null): VisitFlowDraftStepResult => ({
	step: "draft",
	status,
	message,
	data: null,
});
const planStep = (status: VisitFlowStepStatus, message: string | null = null): VisitFlowPlanStepResult => ({
	step: "plan",
	status,
	message,
	data: null,
});
const recommendationsStep = (
	status: VisitFlowStepStatus,
	message: string | null = null,
): VisitFlowRecommendationsStepResult => ({ step: "recommendations", status, message, data: null });
const documentsStep = (
	status: VisitFlowStepStatus,
	message: string | null = null,
): VisitFlowDocumentsStepResult => ({ step: "documents", status, message, data: null });

describe("VisitFlowProgress: причины отказа шагов", () => {
	it("пропущенный шаг называет причину целиком, а не обрезком", () => {
		const markup = renderToStaticMarkup(
			createElement(VisitFlowProgress, {
				result: {
					draft: draftStep("success"),
					plan: planStep("skipped", "Отключено в настройках клиники"),
					recommendations: recommendationsStep("skipped", "Нет оснований для рекомендаций"),
					documents: documentsStep("success"),
					overallStatus: "partial",
				},
			}),
		);

		// Ровно эти строки приходят с сервера; обрезка до «Отключено в…» — то,
		// из-за чего врач не мог понять, что шаг вообще не запускался.
		assert.match(markup, /План лечения — пропущено: Отключено в настройках клиники/);
		assert.match(markup, /Рекомендации — пропущено: Нет оснований для рекомендаций/);
		// И подсказка, что делать дальше: включить в настройках либо заполнить руками.
		assert.match(markup, /настройках клиники/);
		assert.match(markup, /заполните поля руками/);
	});

	it("отказавший шаг помечен знаком и объяснён", () => {
		const markup = renderToStaticMarkup(
			createElement(VisitFlowProgress, {
				result: {
					draft: draftStep("error", "Ошибка генерации черновика"),
					plan: planStep("pending"),
					recommendations: recommendationsStep("pending"),
					documents: documentsStep("pending"),
					overallStatus: "error",
				},
			}),
		);

		assert.match(markup, /Распознавание — не выполнено: Ошибка генерации черновика/);
		// Крестик у шага: раньше отказ отличался от «ещё идёт» только цветом точки.
		assert.match(markup, /Шаг не выполнен/);
		// Врач не должен решить, что диктовка пропала вместе с разбором.
		assert.match(markup, /поля ЭМК остались на месте/);
	});

	it("удачный разбор не выводит блок причин", () => {
		const markup = renderToStaticMarkup(
			createElement(VisitFlowProgress, {
				result: {
					draft: draftStep("success"),
					plan: planStep("success"),
					recommendations: recommendationsStep("success"),
					documents: documentsStep("success"),
					overallStatus: "success",
				},
			}),
		);

		assert.doesNotMatch(markup, /Что сообщил разбор/);
		assert.match(markup, /Готово/);
	});

	it("неполный ответ сервера не роняет панель: шаги читаются как ожидающие", () => {
		/*
		 * Ответ /api/ai/visit-flow типом только ОБЪЯВЛЕН, разбором схемы он не
		 * проходит, поэтому панель обязана выдерживать 200 с пустым телом — падение
		 * здесь гасит весь раздел «Прием», а врач в этот момент уже продиктовал
		 * приём.
		 *
		 * Приведение здесь — ЕДИНСТВЕННОЕ в файле и оно и есть предмет проверки:
		 * значение СОЗНАТЕЛЬНО выведено за контракт, потому что именно такое
		 * значение приходит с провода. Это не обход слабого типа у потребителя, а
		 * подделка испорченного ответа: без приведения такой ответ не собрать,
		 * ровно потому что контракт теперь его запрещает.
		 */
		const malformedWireResponse = { overallStatus: undefined } as unknown as VisitFlowResult;
		const markup = renderToStaticMarkup(
			createElement(VisitFlowProgress, { result: malformedWireResponse }),
		);

		assert.match(markup, /Идет разбор/);
		assert.doesNotMatch(markup, /Что сообщил разбор/);
	});
});

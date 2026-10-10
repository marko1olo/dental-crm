/**
 * apps/web/src/tests/emkAndVisitRedTeamInquisition.test.ts
 *
 * RED TEAM INQUISITOR EPSILON:
 * ЭМК Форма 043/у, клинический протокол и приём у кресла.
 *
 * Проверяемые инварианты:
 * 1. Искоренение птичьего языка (Грех №1, Мандат 8y): Диагнозы с клиническим русским описанием, 0 голых технических кодов на кнопках.
 * 2. Ноль мультяшных эмодзи (Мандат 8d, Грех №7): 0 эмодзи (🦷, 💉, 🩺, 📝) в медицинских бланках, протоколах и актах.
 * 3. Закон Анти-Матрёшки (Грех №6): Глубина модалок строго 1 (ранний возврат для дочерних диалогов).
 * 4. Автономия врача (Мандат 8e): 0 заблокированных кнопок «Завершить прием» из-за второстепенных полей.
 * 5. Сквозная связность: Оказанные услуги автоматически попадают в биллинг и кассу приёма.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

describe("RED TEAM INQUISITION: ЭМК Форма 043/у, Клинические протоколы и Приём у кресла", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const repoRoot = path.resolve(__dirname, "../../../..");
	const webSrc = path.join(repoRoot, "apps/web/src");

	const readSrcFile = (relPath: string) => {
		const fullPath = path.join(webSrc, relPath);
		assert.ok(fs.existsSync(fullPath), `Target file must exist: ${relPath}`);
		return fs.readFileSync(fullPath, "utf-8");
	};

	it("1. Искоренение птичьего языка и ликвидация дубликатов: в ClinicalQuickPresetsBar нет голых кодов МКБ и ликвидированы дубли норм", () => {
		const code = readSrcFile("components/visit/ClinicalQuickPresetsBar.tsx");
		const somaticCode = readSrcFile("components/clinical/SomaticAnamnesisCard.tsx");

		// Запрещены голые технические шифры на кнопках пресетов
		assert.ok(
			!code.includes("<span>Соматически здоров / Норма Z01.2</span>"),
			"Кнопка нормы не должна содержать технический шифр Z01.2 в видимом тексте",
		);
		assert.ok(
			!code.includes("<span>Норма Ортопедия Z46.3</span>"),
			"Кнопка ортопедии не должна содержать технический шифр Z46.3 в видимом тексте",
		);
		assert.ok(
			!code.includes("<span>Норма Хирургия Z09.0</span>"),
			"Кнопка хирургии не должна содержать технический шифр Z09.0 в видимом тексте",
		);

		// В ClinicalQuickPresetsBar ликвидированы паразитные дубликаты норм (Мандат 8p, 8s)
		assert.ok(
			!code.includes("btn-norm-healthy-quick"),
			"В ClinicalQuickPresetsBar не должно быть дублирующей кнопки соматической нормы",
		);

		// Каноническая норма находится в SomaticAnamnesisCard без птичьего языка
		assert.ok(
			somaticCode.includes("Соматически здоров"),
			"В SomaticAnamnesisCard норма должна называться по-человечески: 'Соматически здоров'",
		);
	});

	it("2. Искоренение птичьего языка: в EmkDiaryProtocolSection диагнозы сопровождаются развернутым клиническим названием", () => {
		const code = readSrcFile("components/visit/emk/EmkDiaryProtocolSection.tsx");

		// Проверяем наличие развернутых русских клинических названий
		assert.ok(
			code.includes("Кариес дентина (K02.1)") || code.includes("K02.1 Кариес дентина"),
			"Кариес должен выводиться с русским клиническим описанием",
		);
		assert.ok(
			code.includes("Острый пульпит (K04.0)") || code.includes("K04.0 Пульпит"),
			"Пульпит должен выводиться с русским клиническим описанием",
		);
		assert.ok(
			code.includes("Хронический периодонтит (K04.5)") || code.includes("K04.5 Хронический"),
			"Периодонтит должен выводиться с русским клиническим описанием",
		);
		assert.ok(
			code.includes("Профгигиена полости рта (K05.1)") || code.includes("K05.1 Хронический катаральный гингивит"),
			"Гигиена/пародонтология должна выводиться с русским клиническим описанием",
		);
	});

	it("3. Ноль мультяшных эмодзи (Мандат 8d, Грех №7): отсутствие мультяшных эмодзи в ключевых компонентах ЭМК", () => {
		const targetFiles = [
			"components/visit/VisitEmkTab.tsx",
			"components/visit/VisitSummaryModal.tsx",
			"components/visit/view/VisitHeaderMonolith.tsx",
			"components/visit/emk/EmkToolbar.tsx",
			"components/visit/emk/EmkComplaintsSection.tsx",
			"components/visit/emk/EmkObjectiveStatusSection.tsx",
			"components/visit/emk/EmkDiaryProtocolSection.tsx",
			"components/visit/emk/EmkServicesSection.tsx",
			"components/visit/emk/EmkPrintableForm043.tsx",
		];

		const forbiddenEmojis = ["🦷", "💉", "🩺", "📝", "🏥", "💊", "🚨"];

		for (const relPath of targetFiles) {
			const content = readSrcFile(relPath);
			for (const emoji of forbiddenEmojis) {
				assert.ok(
					!content.includes(emoji),
					`Файл ${relPath} не должен содержать мультяшный эмодзи ${emoji} (Мандат 8d: строго Lucide SVG)`,
				);
			}
		}
	});

	it("4. Закон Анти-Матрёшки (Грех №6): в VisitSummaryModal глубина модалок строго 1 (ранний возврат)", () => {
		const code = readSrcFile("components/visit/VisitSummaryModal.tsx");

		// Проверяем последовательный рендеринг модалок (depth = 1)
		assert.ok(
			code.includes("if (isProtocolGeneratorOpen)"),
			"Генератор протоколов должен рендериться последовательно через early return",
		);
		assert.ok(
			code.includes("if (isNextStageModalOpen)"),
			"Модалка следующего этапа должна рендериться последовательно через early return",
		);
		assert.ok(
			code.includes("if (isPaymentModalOpen)"),
			"Модалка оплаты в кресле должна рендериться последовательно через early return",
		);
	});

	it("5. Автономия врача (Мандат 8e): 0 заблокированных кнопок «Завершить приём» по второстепенным полям", () => {
		const headerCode = fs.existsSync(path.join(webSrc, "components/visit/view/visitHeader/VisitActionButtonsToolbar.tsx"))
			? readSrcFile("components/visit/view/visitHeader/VisitActionButtonsToolbar.tsx")
			: readSrcFile("components/visit/view/VisitHeaderMonolith.tsx");
		// Кнопка Завершить приём в шапке
		assert.ok(
			headerCode.includes('data-testid="btn-complete-visit-header"'),
			"Кнопка 'btn-complete-visit-header' должна присутствовать в шапке",
		);
		assert.ok(
			!headerCode.includes('disabled={!isNoteFormValid}'),
			"Кнопка завершения приёма не должна блокироваться проверкой полей формы",
		);

		const summaryCode = readSrcFile("components/visit/VisitSummaryModal.tsx");
		// Кнопка Завершить приём в сводке
		assert.ok(
			summaryCode.includes('data-testid="summary-complete-visit-btn"'),
			"Кнопка 'summary-complete-visit-btn' должна присутствовать в модалке сводки",
		);
		// Блокировка разрешена только во время активного сохранения (isCompleting)
		assert.ok(
			summaryCode.includes("disabled={isCompleting}"),
			"Кнопка завершения блокируется строго на время сетевого запроса, а не из-за незаполненных полей",
		);

		const emkToolbarCode = readSrcFile("components/visit/emk/EmkToolbar.tsx");
		// Кнопка нормы доступна в 1 клик
		assert.ok(
			emkToolbarCode.includes('data-testid="btn-chairside-physiological-norm"'),
			"Кнопка физиологической нормы должна присутствовать на тулбаре ЭМК",
		);
	});

	it("6. Сквозная связность: оказанные в приёме услуги автоматически попадают в виджет биллинга и кассу", () => {
		const emkCode = readSrcFile("components/visit/VisitEmkTab.tsx");
		assert.ok(
			emkCode.includes("infer804nServiceFromStamp"),
			"VisitEmkTab должен выводить услугу по номенклатуре из выбранной патологии",
		);
		assert.ok(
			emkCode.includes('window.dispatchEvent(\n\t\t\t\t\t\tnew CustomEvent("dente-add-services-to-invoice"'),
			"VisitEmkTab должен передавать услуги в биллинг через событие dente-add-services-to-invoice",
		);

		const billingCode = readSrcFile("components/visit/VisitServiceBillingWidget.tsx");
		assert.ok(
			billingCode.includes('window.addEventListener("dente-add-services-to-invoice"'),
			"VisitServiceBillingWidget должен слушать событие dente-add-services-to-invoice",
		);

		const summaryCode = readSrcFile("components/visit/VisitSummaryModal.tsx");
		assert.ok(
			summaryCode.includes('data-testid="chairside-pos-block"'),
			"VisitSummaryModal должен содержать блок мгновенной оплаты приёма в кресле",
		);
		assert.ok(
			summaryCode.includes('data-testid="chairside-pay-sbp-qr-btn"'),
			"VisitSummaryModal должен содержать кнопку быстрой оплаты СБП по QR",
		);
	});
});

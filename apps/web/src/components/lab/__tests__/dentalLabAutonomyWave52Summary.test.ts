import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildLabOrderMessengerSummary,
	type LabOrderMessengerParams,
} from "../DentalLabOrderModal";

describe("Wave 52 — Dental Lab Messenger Summary", () => {
	it("1. buildLabOrderMessengerSummary correctly formats order summary with all fields and zero emojis", () => {
		const fullParams: LabOrderMessengerParams = {
			clinicName: "Денте Премиум",
			clinicPhone: "+7 (495) 777-88-99",
			gostOrderNumber: "ЗТЛ-2026-0908-4421",
			patientName: "Алексеев Владимир Сергеевич",
			doctorName: "Др. Коновалов И. П.",
			teethOrJaw: "Зуб 24",
			constructionTypeTitle: "Одиночная коронка",
			materialTitle: "Диоксид циркония Multi-layer (Katana HTML)",
			shade: "A2",
			dueDate: "15.09.2026",
			frameworkTrialDate: "11.09.2026",
			ceramicTrialDate: "13.09.2026",
			clinicalNotes: "Индивидуальная эстетика, легкая текстура, без выраженных мамелонов",
		};

		const text = buildLabOrderMessengerSummary(fullParams);

		assert.ok(text.includes("Заказ-наряд в зуботехническую лабораторию (клиника «Денте Премиум»):"));
		assert.ok(text.includes("Наряд: ЗТЛ-2026-0908-4421"));
		assert.ok(text.includes("Пациент: Алексеев Владимир Сергеевич"));
		assert.ok(text.includes("Лечащий врач: Др. Коновалов И. П."));
		assert.ok(text.includes("Область: Зуб 24"));
		assert.ok(text.includes("Конструкция: Одиночная коронка"));
		assert.ok(text.includes("Материал: Диоксид циркония Multi-layer (Katana HTML)"));
		assert.ok(text.includes("Цвет: A2"));
		assert.ok(text.includes("Срок готовности: 15.09.2026"));
		assert.ok(text.includes("Примерка каркаса: 11.09.2026"));
		assert.ok(text.includes("Примерка керамики: 13.09.2026"));
		assert.ok(text.includes("Особые указания: Индивидуальная эстетика, легкая текстура, без выраженных мамелонов"));
		assert.ok(text.includes("Связь с клиникой: +7 (495) 777-88-99."));

		const emojiRegex = /\p{Extended_Pictographic}/u;
		assert.strictEqual(emojiRegex.test(text), false);
	});

	it("2. buildLabOrderMessengerSummary handles optional trial dates and default notes", () => {
		const minimalParams: LabOrderMessengerParams = {
			clinicName: "Денте",
			gostOrderNumber: "ЗТЛ-2026-0001",
			patientName: "Иванова Ольга Николаевна",
			doctorName: "Др. Смирнова Е. В.",
			teethOrJaw: "Верхняя челюсть",
			constructionTypeTitle: "Бюгельный протез с замковой фиксацией",
			materialTitle: "КХС + Акрил",
			shade: "A3",
			dueDate: "20.09.2026",
		};

		const text = buildLabOrderMessengerSummary(minimalParams);

		assert.ok(!text.includes("Примерка каркаса:"));
		assert.ok(!text.includes("Примерка керамики:"));
		assert.ok(text.includes("Особые указания: Без особенностей"));
		assert.ok(text.includes("Связь с клиникой: не указан."));
		assert.ok(!text.includes("+7 (495) 123-45-67"));
		assert.strictEqual(/\p{Extended_Pictographic}/u.test(text), false);
	});
});

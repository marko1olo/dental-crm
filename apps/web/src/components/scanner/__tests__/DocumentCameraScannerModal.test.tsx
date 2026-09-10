import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentCameraScannerModal } from "../DocumentCameraScannerModal.js";

describe("DocumentCameraScannerModal Component Suite", () => {
	it("returns null when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(DocumentCameraScannerModal, {
				isOpen: false,
				patientId: "pat-123",
				patientName: "Тестовый Пациент",
				onClose: () => {},
			}),
		);
		assert.equal(html, "");
	});

	it("renders modal structure with preset buttons and zero fake OCR simulation", () => {
		const html = renderToStaticMarkup(
			createElement(DocumentCameraScannerModal, {
				isOpen: true,
				patientId: "pat-123",
				patientName: "Иванов Иван Иванович",
				onClose: () => {},
			}),
		);

		// Заголовок и имя пациента
		assert.ok(html.includes("Сканирование документов"), "Contains header title");
		assert.ok(html.includes("Иванов Иван Иванович"), "Contains patient name");

		// Пресеты документов
		assert.ok(html.includes("Паспорт РФ"), "Contains passport preset");
		assert.ok(html.includes("Полис ОМС"), "Contains OMS preset");
		assert.ok(html.includes("СНИЛС"), "Contains SNILS preset");

		// Кнопки действий
		assert.ok(html.includes("Сфотографировать"), "Contains capture button");
		assert.ok(html.includes("Файл"), "Contains file fallback button");

		// Запрет на фейковую симуляцию OCR (Мандат 11 Zero-Mock Fallback)
		assert.ok(!html.includes("Обнаружен разворот паспорта РФ"), "No fake OCR simulation on uncaptured frame");
		assert.ok(!html.includes("Обнаружен полис ОМС"), "No fake OMS OCR simulation");
		assert.ok(!html.includes("Обнаружен СНИЛС"), "No fake SNILS OCR simulation");
	});
});

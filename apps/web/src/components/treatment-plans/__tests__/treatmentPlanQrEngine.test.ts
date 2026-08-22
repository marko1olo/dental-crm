/**
 * treatmentPlanQrEngine.test.ts — тестирование генератора QR-кодов и верификационных payload смет.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	generatePlanVerificationQrPayload,
	generateQrMatrix,
	generateQrSvgString,
	type PlanVerificationQrPayloadData,
} from "../qr/treatmentPlanQrEngine";

describe("treatmentPlanQrEngine: QR Code Matrix & Verification Payload", () => {
	test("generateQrMatrix генерирует корректную матрицу с шаблонами поиска 7x7", () => {
		const text = "https://dente.clinic/verify/treatment-plan?plan=D-2026-PAT104";
		const matrix = generateQrMatrix(text, "M");

		assert.ok(matrix.size >= 21, "Размер матрицы должен быть >= 21");
		assert.equal(matrix.modules.length, matrix.size);
		assert.equal(matrix.modules[0]?.length, matrix.size);

		// Проверяем наличие верхнего левого шаблона поиска 7x7 (углы и центр)
		assert.equal(matrix.modules[0]?.[0], true, "Верхний левый угол [0,0] должен быть черным");
		assert.equal(matrix.modules[0]?.[6], true, "Верхний правый край поиска [0,6] черный");
		assert.equal(matrix.modules[6]?.[0], true, "Нижний левый край поиска [6,0] черный");
		assert.equal(matrix.modules[6]?.[6], true, "Нижний правый край поиска [6,6] черный");
		assert.equal(matrix.modules[3]?.[3], true, "Центр поиска [3,3] черный");
		// Белое кольцо вокруг центра
		assert.equal(matrix.modules[1]?.[1], false, "Белая рамка [1,1] белая");
	});

	test("generateQrSvgString возвращает валидную SVG разметку", () => {
		const svg = generateQrSvgString("DENTE-PLAN-VERIFIED", {
			sizePx: 150,
			fgColor: "#0f172a",
			bgColor: "#ffffff",
		});

		assert.ok(svg.startsWith("<svg"), "SVG должен начинаться с тега <svg");
		assert.ok(svg.endsWith("</svg>"), "SVG должен заканчиваться тегом </svg>");
		assert.ok(svg.includes('viewBox="0 0 150 150"'), "viewBox должен быть 0 0 150 150");
		assert.ok(svg.includes('fill="#0f172a"'), "Модули должны быть цвета fgColor");
		assert.ok(svg.includes('fill="#ffffff"'), "Фон должен быть цвета bgColor");
	});

	test("generatePlanVerificationQrPayload формирует валидный верификационный URL с параметрами", () => {
		const data: PlanVerificationQrPayloadData = {
			planId: "D-2026-90412",
			planNumber: "ДОГ-412",
			patientId: "PAT-10492",
			patientName: "Иванов Иван Иванович",
			doctorFullName: "Д-р Смирнов А. В.",
			totalAmountRub: 185000,
			tierTitle: "Оптимальный (Премиум Реконструкция)",
			clinicName: "Клиника ДЕНТЕ",
			clinicInn: "7701234567",
			clinicLicense: "ЛО41-01137-77/00567890",
			agreedAtIso: "2026-08-22T15:30:00.000Z",
			baseUrl: "https://crm.dente.clinic",
		};

		const payload = generatePlanVerificationQrPayload(data);
		assert.ok(payload.startsWith("https://crm.dente.clinic/verify/treatment-plan"));

		const url = new URL(payload);
		assert.equal(url.searchParams.get("plan"), "ДОГ-412");
		assert.equal(url.searchParams.get("pid"), "PAT-10492");
		assert.equal(url.searchParams.get("sum"), "185000");
		assert.equal(url.searchParams.get("inn"), "7701234567");
		assert.equal(url.searchParams.get("ts"), "2026-08-22T15:30:00.000Z");
	});
});

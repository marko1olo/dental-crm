import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { registerAutonomousTrackerRoutes } from "../../routes/lab/autonomousTrackerRoutes.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001";

describe("Autonomous Lab & Courier Tracker API Routes («Лаба в кармане»)", () => {
	let app: FastifyInstance;

	before(async () => {
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		await registerAutonomousTrackerRoutes(app);
		await app.ready();
	});

	it("POST /api/clinical/dental-lab/autonomous/orders — создает наряд с 152-ФЗ маскированием и QR-стикером", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/clinical/dental-lab/autonomous/orders",
			headers: {
				"x-organization-id": TEST_ORG_ID,
				"content-type": "application/json",
			},
			payload: {
				patientFullName: "Михайлов Дмитрий Васильевич",
				doctorName: "Др. Краснов С.П.",
				doctorTelegramChatId: "tg_doc_77",
				labName: "ЗТЛ ТопДент",
				teethFdi: [21, 22],
				constructionType: "veneer",
				material: "emax_lithium_disilicate",
				vitaShade: "A1",
				impressionType: "digital_scan",
				patientAppointmentAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
				clinicTrayNumber: "Лоток №5 (Зона А)",
			},
		});

		assert.equal(res.statusCode, 201);
		const json = res.json();
		assert.ok(json.order);
		assert.match(json.order.orderRef, /^L-[A-Z0-9]{5}$/);
		assert.equal(json.order.patientToken.tokenizedInitials, "М***в Д. В.");
		assert.ok(json.qrPayload.startsWith(`DNT-LAB:${json.order.orderRef}:`));
		assert.ok(json.trayLabelText.includes("Лоток №5 (Зона А)"));
		assert.ok(json.doctorTelegramAlert.includes("М***в Д. В."));
	});

	it("GET /api/clinical/dental-lab/autonomous/orders/:ref — возвращает наряд с динамическим SLA", async () => {
		// Создаем наряд
		const createRes = await app.inject({
			method: "POST",
			url: "/api/clinical/dental-lab/autonomous/orders",
			headers: { "x-organization-id": TEST_ORG_ID },
			payload: {
				patientFullName: "Павлова Анна Игоревна",
				doctorName: "Др. Лебедев",
				labName: "ЗТЛ Мастер",
				teethFdi: [11],
				constructionType: "single_crown",
				material: "zirconia_multilayer",
				vitaShade: "A2",
				impressionType: "a_silicone",
				patientAppointmentAt: new Date(Date.now() + 40 * 3600 * 1000).toISOString(),
			},
		});
		const { order } = createRes.json();

		const getRes = await app.inject({
			method: "GET",
			url: `/api/clinical/dental-lab/autonomous/orders/${order.orderRef}`,
		});

		assert.equal(getRes.statusCode, 200);
		const body = getRes.json();
		assert.equal(body.orderRef, order.orderRef);
		assert.equal(body.slaRiskLevel, "warning_approaching"); // 40ч до визита
	});

	it("POST /api/clinical/dental-lab/autonomous/orders/:ref/scan — переводит этап при сканировании подлинного QR-кода", async () => {
		// Создаем заказ
		const createRes = await app.inject({
			method: "POST",
			url: "/api/clinical/dental-lab/autonomous/orders",
			headers: { "x-organization-id": TEST_ORG_ID },
			payload: {
				patientFullName: "Федоров Сергей",
				doctorName: "Др. Иванов",
				labName: "ЗТЛ Кроун",
				teethFdi: [46],
				constructionType: "single_crown",
				material: "zirconia_multilayer",
				vitaShade: "A3",
				impressionType: "digital_scan",
				patientAppointmentAt: new Date(Date.now() + 80 * 3600 * 1000).toISOString(),
			},
		});
		const { order, qrPayload } = createRes.json();

		// Шаг 1: Назначение курьера администратором
		const scan1 = await app.inject({
			method: "POST",
			url: `/api/clinical/dental-lab/autonomous/orders/${order.orderRef}/scan`,
			payload: {
				qrPayload,
				nextStage: "courier_assigned",
				actorRole: "clinic_admin",
				actorName: "Админ Вероника",
				notes: "Бокс опечатан и готов к передаче",
			},
		});
		assert.equal(scan1.statusCode, 200);
		assert.equal(scan1.json().updatedOrder.currentStage, "courier_assigned");

		// Шаг 2: Попытка сканирования с поддельным QR-кодом
		const fakeScan = await app.inject({
			method: "POST",
			url: `/api/clinical/dental-lab/autonomous/orders/${order.orderRef}/scan`,
			payload: {
				qrPayload: "DNT-LAB:L-FAKE0:12345678:fake_sig",
				nextStage: "in_transit_to_lab",
				actorRole: "courier",
				actorName: "Курьер Илья",
			},
		});
		assert.equal(fakeScan.statusCode, 403);
		assert.equal(fakeScan.json().error, "InvalidQrCode");
	});

	it("POST /api/clinical/dental-lab/autonomous/orders/:ref/defect — фиксирует дефект и останавливает работу (Stop-the-Line)", async () => {
		const createRes = await app.inject({
			method: "POST",
			url: "/api/clinical/dental-lab/autonomous/orders",
			headers: { "x-organization-id": TEST_ORG_ID },
			payload: {
				patientFullName: "Ковалев Андрей",
				doctorName: "Др. Новиков",
				labName: "ЗТЛ Орто",
				teethFdi: [36],
				constructionType: "single_crown",
				material: "emax_lithium_disilicate",
				vitaShade: "A2",
				impressionType: "pvs_silicone",
				patientAppointmentAt: new Date(Date.now() + 90 * 3600 * 1000).toISOString(),
			},
		});
		const { order } = createRes.json();

		const defectRes = await app.inject({
			method: "POST",
			url: `/api/clinical/dental-lab/autonomous/orders/${order.orderRef}/defect`,
			payload: {
				reportedByRole: "technician",
				reportedByName: "Техник Артем",
				reasonCategory: "unclear_margin",
				description: "Нечеткий поддесневой уступ на зубе 36, риск балансировки коронки",
				proofPhotoUrl: "https://storage.yandexcloud.net/scans/defect_36.jpg",
			},
		});

		assert.equal(defectRes.statusCode, 200);
		const json = defectRes.json();
		assert.equal(json.updatedOrder.currentStage, "rework_flagged");
		assert.ok(json.alertDoctorTelegram.includes("ТРЕВОГА ПО ЗТЛ"));
		assert.equal(json.updatedOrder.activeDefect.reasonCategory, "unclear_margin");
	});

	it("POST /api/clinical/dental-lab/autonomous/anonymize-preview — возвращает 152-ФЗ маскировку", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/clinical/dental-lab/autonomous/anonymize-preview",
			payload: { fullName: "Рождественский Вениамин Олегович" },
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.tokenizedInitials, "Р***й В. О.");
		assert.equal(json.anonymizedSaltedHash.length, 64);
	});
});

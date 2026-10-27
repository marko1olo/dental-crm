import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("Blank Contract Package & Solo Doctor Booking Autonomy (Mandate 8e, 8n)", () => {
	it("prints blank contract package with '_______' placeholders and 0 rubles without 403 or server errors", { timeout: 15000 }, async () => {
		const { generatePrimaryIntakePackageHtml } = await import(
			"../../documents/primaryIntakePackagePrintEngine.js"
		);

		const html = generatePrimaryIntakePackageHtml({
			patient: null,
			clinic: { clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»", legalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»", inn: "7707083893" },
			intakeNormApplied: true,
		});

		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("ДОГОВОР") && html.includes("на оказание платных"));
		assert.ok(html.includes("ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ"));
		assert.ok(html.includes("СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ"));
		assert.ok(html.includes("043/у") || html.includes("АНКЕТА"));
		assert.ok(html.includes("________________________________________"));
		assert.ok(html.includes("0 (ноль) рублей") || html.includes("0 ₽") || html.includes("ориентировочная"));
	});

	it("allows booking appointment without mandatory assistant (solo doctor or dynamic assignment)", async () => {
		const { appointmentScheduleMissingFields } = await import("../../../AppHelpers.js");

		const staff = [
			{ id: "doc-1", fullName: "Д-р Барабаш С.В.", role: "doctor" as const, active: true },
			{ id: "asst-1", fullName: "Медсестра Иванова М.П.", role: "assistant" as const, active: true },
		];
		const chairs = [{ id: "chair-1", name: "Кабинет 1", active: true }];
		const patients = [{ id: "pat-1", fullName: "Смирнова Анна", active: true }];

		const draftWithoutAssistant = {
			patientId: "pat-1",
			doctorUserId: "doc-1",
			assistantUserId: "",
			chairId: "chair-1",
			startsAt: "2026-09-04T14:00:00.000Z",
			endsAt: "2026-09-04T14:30:00.000Z",
			status: "planned" as const,
			reason: "CITO! Острая боль",
			comment: "Экстренный прием",
		};

		const missing = appointmentScheduleMissingFields(draftWithoutAssistant as any, "small_clinic", staff as any, {
			chairs: chairs as any,
			patients: patients as any,
		});

		assert.equal(missing.length, 0);
		assert.ok(!missing.some((m) => m.toLowerCase().includes("ассистент")));
	});
});

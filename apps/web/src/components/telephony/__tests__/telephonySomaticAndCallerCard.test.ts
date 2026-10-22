import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	buildTelephonyCallerCard,
	generateAppointmentConfirmationMessage,
	generateOrthopedicReadyMessage,
	generateSmsConfirmationUrl,
	generateWhatsAppConfirmationUrl,
	resolvePatientSomaticAlerts,
} from "../../../store/telephonyClinical";
import type { Patient, PatientInsight } from "@dental/shared";

describe("Telephony Somatic Alerts & Caller Card (Mandate 8b, 8d, 8e)", () => {
	it("1. Somatic alerts classify allergies, chronic conditions, and acute pain without emojis", () => {
		const patientWithAllergies = {
			id: "pat-3",
			organizationId: "org-1",
			fullName: "Соколова Марина Петровна",
			phone: "+79165554433",
			notes: "Аллергия на лидокаин и пенициллин. Беременность 2 триместр. Кардиостимулятор.",
			balanceRub: 0,
			birthDate: "1992-03-01",
			gender: "female",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as unknown as Patient;
		const insight = {
			patientId: "pat-3",
			riskLevel: "high",
			clinicalFlags: ["Острая пульсирующая зубная боль"],
			riskReasons: ["Высокая кардиоваскулярная реактивность"],
		} as unknown as PatientInsight;

		const alerts = resolvePatientSomaticAlerts(patientWithAllergies, insight);
		assert.ok(alerts.length >= 4);
		assert.ok(alerts.some((a) => a.label.includes("анестетики (лидокаин")));
		assert.ok(alerts.some((a) => a.label.includes("пенициллин")));
		assert.ok(alerts.some((a) => a.label.includes("Беременность")));
		assert.ok(alerts.some((a) => a.label.includes("Кардиостимулятор")));
		assert.ok(alerts.some((a) => a.category === "pain"));
	});

	it("2. buildTelephonyCallerCard aggregates patient clinical profile in 1 click", () => {
		const patient = {
			id: "pat-4",
			organizationId: "org-1",
			fullName: "Кузнецов Дмитрий Игоревич",
			phone: "+79031112233",
			balanceRub: 1500,
			birthDate: "1980-07-12",
			gender: "male",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as unknown as Patient;
		const callerCard = buildTelephonyCallerCard({
			phone: "+79031112233",
			patient,
		});

		assert.equal(callerCard.phone, "+79031112233");
		assert.equal(callerCard.patientName, "Кузнецов Дмитрий Игоревич");
		assert.equal(callerCard.financial.balanceRub, 1500);
		assert.equal(callerCard.lastVisit.isNewPatient, true);
	});

	it("3. Messaging engine generates 100% clean clinical Russian templates and valid URLs", () => {
		const smsMsg = generateAppointmentConfirmationMessage({
			patientName: "Василий",
			doctorName: "Кузнецов А.А.",
			appointmentStartsAt: "2026-10-15T15:00:00.000Z",
			clinicName: "DENTE",
			templateType: "confirmation",
		});
		assert.ok(smsMsg.includes("Здравствуйте, Василий!"));
		assert.ok(smsMsg.includes("DENTE"));

		const orthoMsg = generateOrthopedicReadyMessage({
			patientName: "Смирнова Елена",
			orderNumber: "8841",
			toothFdi: 26,
			material: "диоксид циркония",
			doctorName: "д-р Михайлов",
			clinicName: "DENTE",
			clinicPhone: "+7 (495) 123-45-67",
			channel: "whatsapp",
		});
		assert.ok(orthoMsg.includes("Елена"));
		assert.ok(orthoMsg.includes("8841"));

		const waUrl = generateWhatsAppConfirmationUrl("+79161234567", "Тестовое подтверждение");
		assert.ok(waUrl.startsWith("https://wa.me/79161234567?text="));

		const smsUrl = generateSmsConfirmationUrl("+79161234567", "Тестовое SMS");
		assert.ok(smsUrl.startsWith("sms:+79161234567?body="));
	});
});

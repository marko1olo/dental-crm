import assert from "node:assert/strict";
import { test } from "vitest";
import {
	calculatePatientFinancialStatus,
	useTelephonyStore,
} from "../../../store/telephonyStore";

test("Telephony - patient financial status calculation", () => {
	const patient = {
		id: "pat-1",
		fullName: "Тестовый Пациент",
		phone: "+79991112233",
		balanceRub: -5000,
		insuranceContractId: null,
	};

	const status = calculatePatientFinancialStatus(patient as any, null, []);
	assert.strictEqual(status.hasDebt, true);
	assert.strictEqual(status.debtRub, 5000);
	assert.ok(status.formattedDebt.includes("5") && status.formattedDebt.includes("000"));
});

test("Telephony - somatic alerts resolution (allergies & acute pain)", async () => {
	const { resolvePatientSomaticAlerts } = await import("../../../store/telephonyStore");

	const patientWithAllergyNotes = {
		id: "pat-allergy-1",
		fullName: "Пациент с аллергией",
		notes: "Аллергия на лидокаин и пенициллин!",
	};
	const alerts1 = resolvePatientSomaticAlerts(patientWithAllergyNotes as any);
	const allergyAlerts1 = alerts1.filter((a) => a.category === "allergy");
	assert.ok(allergyAlerts1.length >= 2);
	assert.ok(allergyAlerts1.some((a) => a.label.includes("лидокаин")));
	assert.ok(allergyAlerts1.some((a) => a.label.includes("пенициллин")));

	const patientWithAllergiesArr = {
		id: "pat-allergy-2",
		fullName: "Пациент с массивом аллергий",
		allergies: ["Ультракаин", "Латекс"],
	};
	const alerts2 = resolvePatientSomaticAlerts(patientWithAllergiesArr as any);
	const allergyAlerts2 = alerts2.filter((a) => a.category === "allergy");
	assert.ok(allergyAlerts2.length >= 2);

	const patientWithPain = {
		id: "pat-pain-1",
		fullName: "Пациент с острой болью",
		notes: "Острая боль в области зуба 46, пульпит",
	};
	const alerts3 = resolvePatientSomaticAlerts(patientWithPain as any);
	const painAlerts = alerts3.filter((a) => a.category === "pain");
	assert.ok(painAlerts.length >= 1);
	assert.strictEqual(painAlerts[0]?.severity, "high");

	const insightWithFlags = {
		patientId: "pat-flags-1",
		riskLevel: "high" as const,
		riskReasons: ["Высокий риск неявки"],
		nextBestAction: "Позвонить",
		recallDueAt: null,
		balanceDueRub: 0,
		clinicalFlags: ["Аллергия на новокаин", "Экстренная зубная боль"],
	};
	const alerts4 = resolvePatientSomaticAlerts(null, insightWithFlags as any);
	assert.ok(alerts4.some((a) => a.category === "allergy"));
	assert.ok(alerts4.some((a) => a.category === "pain"));
});

test("Telephony - fetchCallHistory hydrates call log from backend endpoint", async () => {
	const originalFetch = globalThis.fetch;
	try {
		useTelephonyStore.getState().clearHistory();
		globalThis.fetch = (async (input: RequestInfo | URL) => {
			if (String(input).includes("/api/communications/telephony/calls")) {
				return {
					ok: true,
					json: async () => ({
						success: true,
						calls: [
							{
								id: "db-call-1",
								patientId: "pat-db-1",
								patientName: "Смирнова Анна Сергеевна",
								patientPhone: "+79162345678",
								status: "completed",
								recordingUrl: "https://cdn.dente.ru/rec/call-1.mp3",
								durationSeconds: 142,
								createdAt: "2026-10-12T10:15:00.000Z",
								message: "Запись на гигиену",
							},
							{
								id: "db-call-2",
								patientId: null,
								patientName: "Входящий вызов +79998887766",
								patientPhone: "+79998887766",
								status: "needs_call",
								recordingUrl: null,
								durationSeconds: 0,
								createdAt: "2026-10-12T10:05:00.000Z",
								message: "Пропущенный вызов",
							},
						],
					}),
				} as Response;
			}
			throw new Error("Unexpected URL");
		}) as typeof fetch;

		await useTelephonyStore.getState().fetchCallHistory();
		const history = useTelephonyStore.getState().callHistory;
		assert.strictEqual(history.length, 2);
		assert.strictEqual(history[0]?.id, "db-call-1");
		assert.strictEqual(history[0]?.status, "answered");
		assert.strictEqual(history[0]?.recordingUrl, "https://cdn.dente.ru/rec/call-1.mp3");
		assert.strictEqual(history[1]?.id, "db-call-2");
		assert.strictEqual(history[1]?.status, "missed");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

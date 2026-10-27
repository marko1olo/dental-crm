import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	extractPolitePatientName,
	generatePdnProtectedRecallMessage,
	type PatientRecallRecord,
} from "../../patientRecallEngine";

describe("3. 152-ФЗ PDn-Protected WhatsApp & SMS Message Generator", () => {
	it("extracts polite Russian salutation (Имя Отчество) from full Russian name", () => {
		assert.equal(extractPolitePatientName("Иванов Иван Иванович"), "Иван Иванович");
		assert.equal(extractPolitePatientName("Петрова Елена Сергеевна"), "Елена Сергеевна");
		assert.equal(extractPolitePatientName("Сидоров Алексей"), "Алексей");
		assert.equal(extractPolitePatientName("Мария"), "Мария");
		assert.equal(extractPolitePatientName(""), "Пациент");
	});

	it("generates 152-ФЗ protected message with zero medical diagnosis leaks", () => {
		const candidate: PatientRecallRecord = {
			id: "cand-77",
			patientId: "pat-77",
			fullName: "Кузнецов Иван Иванович",
			phone: "+7 (999) 555-44-33",
			cycleType: "periodontal_maintenance",
			lastVisitDate: "2025-11-01",
			dueDate: "2026-05-01",
			daysOverdue: 0,
			urgencyStatus: "due_now",
			status: "due_now",
			clinicalNotes: "Глубокий кариес 36 зуба, хронический пародонтит, имплантация 46",
		};

		const message = generatePdnProtectedRecallMessage(candidate, {
			clinicName: "Стоматология ДЕНТЕ",
		});

		assert.ok(message.includes("Иван Иванович"));
		assert.ok(message.includes("подошел срок контрольного осмотра"));
		assert.ok(message.includes("Стоматология ДЕНТЕ"));
		assert.ok(message.includes("Записаться:"));

		const forbiddenWords = [
			/кариес/i,
			/пародонтит/i,
			/пульпит/i,
			/удалени/i,
			/имплант/i,
			/кист/i,
			/пломб/i,
			/гной/i,
			/десн/i,
			/кровоточивост/i,
		];

		for (const pattern of forbiddenWords) {
			assert.equal(
				pattern.test(message),
				false,
				`152-ФЗ Violation: message must NOT leak diagnosis matching ${pattern}`,
			);
		}
	});
});

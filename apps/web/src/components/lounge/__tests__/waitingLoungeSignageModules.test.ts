import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDoctorDisplay, maskPatientName } from "../patientNameMasker";
import { playCallingChime } from "../loungeChimeAudio";

describe("Lounge Signage Modules & 152-FZ Privacy", () => {
	it("masks patient full names reliably under 152-FZ to prevent disclosure", () => {
		// Полное ФИО -> Фамилия И. О.
		assert.equal(maskPatientName("Иванов Иван Иванович"), "Иванов И. И.");
		assert.equal(maskPatientName("Петрова Светлана Николаевна"), "Петрова С. Н.");
		// Фамилия и имя -> Фамилия И.
		assert.equal(maskPatientName("Сидоров Алексей"), "Сидоров А.");
		// Одно имя или фамилия
		assert.equal(maskPatientName("Анна"), "Анна");
		// Двойная фамилия
		assert.equal(maskPatientName("Мамин-Сибиряк Дмитрий Наркисович"), "Мамин-Сибиряк Д. Н.");
		// Пустые / некорректные значения
		assert.equal(maskPatientName(""), "Пациент");
		assert.equal(maskPatientName(null), "Пациент");
		assert.equal(maskPatientName(undefined), "Пациент");
	});

	it("formats doctor names in compact clinical format", () => {
		assert.equal(formatDoctorDisplay("Зубов Андрей Владимирович"), "Зубов А. В.");
		assert.equal(formatDoctorDisplay("Д-р Смирнова Ольга"), "Смирнова О.");
		assert.equal(formatDoctorDisplay("Кузнецов"), "Кузнецов");
		assert.equal(formatDoctorDisplay(""), "Дежурный врач");
		assert.equal(formatDoctorDisplay(null), "Дежурный врач");
	});

	it("executes playCallingChime safely in SSR / non-audio environment without crashes", () => {
		assert.doesNotThrow(() => {
			playCallingChime();
		});
	});
});

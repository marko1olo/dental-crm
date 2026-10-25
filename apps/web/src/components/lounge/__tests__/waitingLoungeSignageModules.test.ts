import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDoctorDisplay, maskPatientName152Fz } from "../patientNameMasker";
import { playCallingChime } from "../loungeChimeAudio";

describe("Lounge Signage Modules & 152-FZ Privacy", () => {
	it("masks patient full names reliably under 152-FZ to prevent disclosure", () => {
		// Полное ФИО -> Фамилия И. О.
		assert.equal(maskPatientName152Fz("Иванов Иван Иванович"), "Иванов И. И.");
		assert.equal(maskPatientName152Fz("Петрова Светлана Николаевна"), "Петрова С. Н.");
		// Фамилия и имя -> Фамилия И.
		assert.equal(maskPatientName152Fz("Сидоров Алексей"), "Сидоров А.");
		// Одно имя или фамилия
		assert.equal(maskPatientName152Fz("Анна"), "Анна");
		// Двойная фамилия
		assert.equal(maskPatientName152Fz("Мамин-Сибиряк Дмитрий Наркисович"), "Мамин-Сибиряк Д. Н.");
		// Пустые / некорректные значения
		assert.equal(maskPatientName152Fz(""), "Пациент");
		assert.equal(maskPatientName152Fz(null), "Пациент");
		assert.equal(maskPatientName152Fz(undefined), "Пациент");
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

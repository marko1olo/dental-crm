import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appointmentScheduleMissingFields } from "../AppHelpers.js";

/**
 * Единственное правило «чего не хватает записи». До сведения его копий было
 * четыре: в ScheduleView (дважды), в NewAppointmentForm и в useScheduleLogic —
 * с расходящимися формулировками, из-за чего подсказка у кнопки и текст ошибки
 * при сохранении говорили по-разному об одном и том же.
 *
 * Главное, что проверяется здесь: подсказка обязана быть выполнимой. Клиника
 * без кресел получала указание «выберите кресло» при пустом списке кресел —
 * тупик, из которого не видно выхода. То же у только что заведённой клиники с
 * врачом и пациентами.
 */
const draft = (patch: Record<string, unknown> = {}) =>
	({
		patientId: "p1",
		doctorUserId: "d1",
		assistantUserId: "a1",
		chairId: "c1",
		status: "planned",
		startsAt: "2026-07-27T09:00:00.000Z",
		endsAt: "2026-07-27T09:30:00.000Z",
		reason: "",
		comment: "",
		...patch,
	}) as never;

const staff = [
	{ id: "d1", role: "doctor", active: true },
	{ id: "a1", role: "assistant", active: true },
] as never;

const chairs = [{ id: "c1", active: true }] as never;
const patients = [{ id: "p1" }] as never;

describe("appointmentScheduleMissingFields", () => {
	it("заполненной записи ничего не не хватает", () => {
		assert.deepEqual(
			appointmentScheduleMissingFields(draft(), "one_chair", staff, { chairs, patients }),
			[],
		);
	});

	it("кресло не выбрано, но кресла в клинике есть — просит выбрать", () => {
		const missing = appointmentScheduleMissingFields(draft({ chairId: "" }), "one_chair", staff, {
			chairs,
			patients,
		});
		assert.deepEqual(missing, ["выберите кресло"]);
	});

	it("кресел в клинике нет — говорит, что их надо создать, а не «выберите»", () => {
		const missing = appointmentScheduleMissingFields(draft({ chairId: "" }), "one_chair", staff, {
			chairs: [] as never,
			patients,
		});
		assert.deepEqual(missing, ["в клинике нет кресел — добавьте кресло в настройках"]);
	});

	it("все кресла отключены — тоже говорит создать", () => {
		const missing = appointmentScheduleMissingFields(draft({ chairId: "" }), "one_chair", staff, {
			chairs: [{ id: "c1", active: false }] as never,
			patients,
		});
		assert.deepEqual(missing, ["в клинике нет кресел — добавьте кресло в настройках"]);
	});

	it("врача в штате нет — отправляет в настройки сотрудников", () => {
		const missing = appointmentScheduleMissingFields(
			draft({ doctorUserId: "", assistantUserId: "" }),
			"one_chair",
			[{ id: "a1", role: "assistant", active: true }] as never,
			{ chairs, patients },
		);
		assert.ok(missing.includes("в клинике нет врача — добавьте сотрудника в настройках"), missing.join("; "));
	});

	it("пациентов в клинике нет — отправляет создать карточку", () => {
		const missing = appointmentScheduleMissingFields(draft({ patientId: "" }), "one_chair", staff, {
			chairs,
			patients: [] as never,
		});
		assert.deepEqual(missing, [
			"в клинике ещё нет пациентов — создайте карточку в разделе «Пациенты»",
		]);
	});

	it("без сведений о ресурсах ведёт себя как раньше", () => {
		const missing = appointmentScheduleMissingFields(draft({ chairId: "", patientId: "" }), "one_chair", staff);
		assert.deepEqual(missing, ["выберите пациента", "выберите кресло"]);
	});

	it("соло-врач не обязан выбирать ассистента", () => {
		const missing = appointmentScheduleMissingFields(
			draft({ assistantUserId: "" }),
			"solo_doctor",
			staff,
			{ chairs, patients },
		);
		assert.deepEqual(missing, []);
	});

	it("клиника без ассистентов в штате ассистента не требует", () => {
		const missing = appointmentScheduleMissingFields(
			draft({ assistantUserId: "" }),
			"small_clinic",
			[{ id: "d1", role: "doctor", active: true }] as never,
			{ chairs, patients },
		);
		assert.deepEqual(missing, []);
	});

	it("клиника с ассистентом в штате требует его выбрать", () => {
		const missing = appointmentScheduleMissingFields(
			draft({ assistantUserId: "" }),
			"small_clinic",
			staff,
			{ chairs, patients },
		);
		assert.deepEqual(missing, ["выберите ассистента"]);
	});

	it("окончание раньше начала попадает в перечень", () => {
		const missing = appointmentScheduleMissingFields(
			draft({ endsAt: "2026-07-27T08:00:00.000Z" }),
			"one_chair",
			staff,
			{ chairs, patients },
		);
		assert.ok(missing.some((step) => /позже начала/.test(step)), missing.join("; "));
	});
});

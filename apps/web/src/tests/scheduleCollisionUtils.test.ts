import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Appointment, Dashboard } from "@dental/shared";
import { checkAppointmentResourceCollision } from "../utils/scheduleCollisionUtils";

describe("checkAppointmentResourceCollision — 4D schedule collision detection", () => {
	const staffList: Dashboard["clinicSettings"]["staff"] = [
		{
			id: "doc-1",
			fullName: "Иванов Иван Иванович",
			role: "doctor",
			specialties: ["therapist"],
			active: true,
			email: null,
			phone: null,
			organizationId: "org-1",
			createdAt: "2028-01-01T00:00:00.000Z",
			updatedAt: "2028-01-01T00:00:00.000Z",
			canSignMedicalRecords: true,
			canManageMoney: false,
			canManageImports: false,
			color: "#2563eb",
		},
		{
			id: "doc-2",
			fullName: "Петрова Анна Сергеевна",
			role: "doctor",
			specialties: ["orthopedist"],
			active: true,
			email: null,
			phone: null,
			organizationId: "org-1",
			createdAt: "2028-01-01T00:00:00.000Z",
			updatedAt: "2028-01-01T00:00:00.000Z",
			canSignMedicalRecords: true,
			canManageMoney: false,
			canManageImports: false,
			color: "#16a34a",
		},
		{
			id: "ast-1",
			fullName: "Смирнов Алексей",
			role: "assistant",
			specialties: [],
			active: true,
			email: null,
			phone: null,
			organizationId: "org-1",
			createdAt: "2028-01-01T00:00:00.000Z",
			updatedAt: "2028-01-01T00:00:00.000Z",
			canSignMedicalRecords: false,
			canManageMoney: false,
			canManageImports: false,
			color: "#64748b",
		},
	];

	const chairsList: Dashboard["clinicSettings"]["chairs"] = [
		{
			id: "chair-1",
			name: "Кабинет 1",
			active: true,
			organizationId: "org-1",
			room: null,
			specialization: null,
			hasXraySensor: false,
			hasMicroscope: false,
			hasSurgeryKit: false,
			notes: null,
		},
		{
			id: "chair-2",
			name: "Кабинет 2",
			active: true,
			organizationId: "org-1",
			room: null,
			specialization: null,
			hasXraySensor: false,
			hasMicroscope: false,
			hasSurgeryKit: false,
			notes: null,
		},
	];

	const patientsList: Dashboard["patients"] = [
		{
			id: "pat-1",
			fullName: "Сидоров Сидор",
			phone: "+79991112233",
			status: "active",
			email: null,
			organizationId: "org-1",
			createdAt: "2028-01-01T00:00:00.000Z",
			updatedAt: "2028-01-01T00:00:00.000Z",
			notes: null,
			birthDate: "1990-01-01",
			administrativeProfile: null,
			balanceRub: 0,
		},
		{
			id: "pat-2",
			fullName: "Васильев Василий",
			phone: "+79992223344",
			status: "active",
			email: null,
			organizationId: "org-1",
			createdAt: "2028-01-01T00:00:00.000Z",
			updatedAt: "2028-01-01T00:00:00.000Z",
			notes: null,
			birthDate: "1985-05-15",
			administrativeProfile: null,
			balanceRub: 0,
		},
	];

	const baseAppointment: Appointment = {
		id: "appt-100",
		organizationId: "org-1",
		patientId: "pat-1",
		doctorUserId: "doc-1",
		assistantUserId: "ast-1",
		chairId: "chair-1",
		status: "planned",
		startsAt: "2028-11-01T10:00:00.000Z",
		endsAt: "2028-11-01T11:00:00.000Z",
		reason: "Лечение",
		comment: null,
	};

	test("Обнаруживает коллизию по пациенту с точным русским сообщением", () => {
		const result = checkAppointmentResourceCollision(
			{
				patientId: "pat-1",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				startsAt: "2028-11-01T10:30:00.000Z",
				endsAt: "2028-11-01T11:30:00.000Z",
			},
			[baseAppointment],
			{
				staff: staffList,
				chairs: chairsList,
				patients: patientsList,
			},
		);

		assert.equal(result.hasCollision, true);
		assert.equal(result.conflictType, "patient");
		assert.equal(result.conflictingAppointment?.id, "appt-100");
		assert.match(result.message ?? "", /У пациента Сидоров Сидор уже есть запись/);
	});

	test("Обнаруживает коллизию по врачу с точным русским сообщением", () => {
		const result = checkAppointmentResourceCollision(
			{
				patientId: "pat-2",
				doctorUserId: "doc-1",
				chairId: "chair-2",
				startsAt: "2028-11-01T10:30:00.000Z",
				endsAt: "2028-11-01T11:30:00.000Z",
			},
			[baseAppointment],
			{
				staff: staffList,
				chairs: chairsList,
				patients: patientsList,
			},
		);

		assert.equal(result.hasCollision, true);
		assert.equal(result.conflictType, "doctor");
		assert.equal(result.conflictingAppointment?.id, "appt-100");
		assert.match(result.message ?? "", /Врач Иванов Иван Иванович уже занят\(а\)/);
	});

	test("Обнаруживает коллизию по креслу с точным русским сообщением", () => {
		const result = checkAppointmentResourceCollision(
			{
				patientId: "pat-2",
				doctorUserId: "doc-2",
				chairId: "chair-1",
				startsAt: "2028-11-01T10:30:00.000Z",
				endsAt: "2028-11-01T11:30:00.000Z",
			},
			[baseAppointment],
			{
				staff: staffList,
				chairs: chairsList,
				patients: patientsList,
			},
		);

		assert.equal(result.hasCollision, true);
		assert.equal(result.conflictType, "chair");
		assert.equal(result.conflictingAppointment?.id, "appt-100");
		assert.match(result.message ?? "", /Кресло «Кабинет 1» уже занято/);
	});

	test("Обнаруживает коллизию по ассистенту с точным русским сообщением", () => {
		const result = checkAppointmentResourceCollision(
			{
				patientId: "pat-2",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				assistantUserId: "ast-1",
				startsAt: "2028-11-01T10:30:00.000Z",
				endsAt: "2028-11-01T11:30:00.000Z",
			},
			[baseAppointment],
			{
				staff: staffList,
				chairs: chairsList,
				patients: patientsList,
			},
		);

		assert.equal(result.hasCollision, true);
		assert.equal(result.conflictType, "assistant");
		assert.equal(result.conflictingAppointment?.id, "appt-100");
		assert.match(result.message ?? "", /Ассистент Смирнов Алексей уже занят\(а\)/);
	});

	test("Игнорирует редактируемую запись при excludeAppointmentId", () => {
		const result = checkAppointmentResourceCollision(
			{
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				assistantUserId: "ast-1",
				startsAt: "2028-11-01T10:00:00.000Z",
				endsAt: "2028-11-01T11:00:00.000Z",
			},
			[baseAppointment],
			{
				excludeAppointmentId: "appt-100",
				staff: staffList,
				chairs: chairsList,
				patients: patientsList,
			},
		);

		assert.equal(result.hasCollision, false);
		assert.equal(result.conflictType, null);
		assert.equal(result.conflictingAppointment, null);
		assert.equal(result.message, null);
	});

	test("Игнорирует отмененные записи и неявки (status = 'cancelled' | 'no_show')", () => {
		const cancelledAppointment: Appointment = {
			...baseAppointment,
			id: "appt-cancelled",
			status: "cancelled",
		};
		const noShowAppointment: Appointment = {
			...baseAppointment,
			id: "appt-no-show",
			status: "no_show",
		};

		const resultCancelled = checkAppointmentResourceCollision(
			{
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2028-11-01T10:15:00.000Z",
				endsAt: "2028-11-01T10:45:00.000Z",
			},
			[cancelledAppointment, noShowAppointment],
			{
				staff: staffList,
				chairs: chairsList,
				patients: patientsList,
			},
		);

		assert.equal(resultCancelled.hasCollision, false);
	});

	test("Смежные интервалы (стык в стык) не создают коллизию", () => {
		// [09:00 - 10:00] перед базовым [10:00 - 11:00]
		const beforeResult = checkAppointmentResourceCollision(
			{
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2028-11-01T09:00:00.000Z",
				endsAt: "2028-11-01T10:00:00.000Z",
			},
			[baseAppointment],
		);
		assert.equal(beforeResult.hasCollision, false);

		// [11:00 - 12:00] после базового [10:00 - 11:00]
		const afterResult = checkAppointmentResourceCollision(
			{
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2028-11-01T11:00:00.000Z",
				endsAt: "2028-11-01T12:00:00.000Z",
			},
			[baseAppointment],
		);
		assert.equal(afterResult.hasCollision, false);
	});

	test("Обнаруживает граничную коллизию при пересечении ровно на 1 минуту", () => {
		// Базовый: 10:00 - 11:00. Проверяем нахлёст на 1 минуту с конца (10:59 - 11:30)
		const overlapEnd1Min = checkAppointmentResourceCollision(
			{
				patientId: "pat-2",
				doctorUserId: "doc-1",
				chairId: "chair-2",
				startsAt: "2028-11-01T10:59:00.000Z",
				endsAt: "2028-11-01T11:30:00.000Z",
			},
			[baseAppointment],
			{ staff: staffList, chairs: chairsList, patients: patientsList },
		);
		assert.equal(overlapEnd1Min.hasCollision, true);
		assert.equal(overlapEnd1Min.conflictType, "doctor");

		// Проверяем нахлёст на 1 минуту с начала (09:30 - 10:01)
		const overlapStart1Min = checkAppointmentResourceCollision(
			{
				patientId: "pat-2",
				doctorUserId: "doc-2",
				chairId: "chair-1",
				startsAt: "2028-11-01T09:30:00.000Z",
				endsAt: "2028-11-01T10:01:00.000Z",
			},
			[baseAppointment],
			{ staff: staffList, chairs: chairsList, patients: patientsList },
		);
		assert.equal(overlapStart1Min.hasCollision, true);
		assert.equal(overlapStart1Min.conflictType, "chair");
	});

	test("Обнаруживает одновременную запись ассистента в 2 разных кабинета", () => {
		// Ассистент ast-1 уже в appt-100 (Кабинет 1, 10:00-11:00).
		// Пытаемся записать ast-1 в Кабинет 2 (10:15-10:45) с другим врачом и пациентом.
		const assistantCrossCabinetCollision = checkAppointmentResourceCollision(
			{
				patientId: "pat-2",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				assistantUserId: "ast-1",
				startsAt: "2028-11-01T10:15:00.000Z",
				endsAt: "2028-11-01T10:45:00.000Z",
			},
			[baseAppointment],
			{ staff: staffList, chairs: chairsList, patients: patientsList },
		);

		assert.equal(assistantCrossCabinetCollision.hasCollision, true);
		assert.equal(assistantCrossCabinetCollision.conflictType, "assistant");
		assert.match(
			assistantCrossCabinetCollision.message ?? "",
			/Ассистент Смирнов Алексей уже занят\(а\)/,
		);
	});

	test("Невалидные или пустые данные не приводят к сбою и возвращают false", () => {
		assert.equal(
			checkAppointmentResourceCollision({}, [baseAppointment]).hasCollision,
			false,
		);
		assert.equal(
			checkAppointmentResourceCollision(
				{ startsAt: "invalid", endsAt: "2028-11-01T10:00:00.000Z" },
				[baseAppointment],
			).hasCollision,
			false,
		);
		assert.equal(
			checkAppointmentResourceCollision(
				{
					startsAt: "2028-11-01T11:00:00.000Z",
					endsAt: "2028-11-01T10:00:00.000Z",
				},
				[baseAppointment],
			).hasCollision,
			false,
		);
	});
});

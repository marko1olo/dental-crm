import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppointmentModal } from "../AppointmentModal";
import {
	mockAppointment,
	mockDashboard,
	createModalProps,
} from "./appointmentModalTestFixtures";

describe("AppointmentModal Basics", () => {
	it("returns null when isOpen is false", () => {
		const props = createModalProps();
		props.isOpen = false;
		const html = renderToStaticMarkup(React.createElement(AppointmentModal, props));
		assert.equal(html, "");
	});

	it("renders appointment modal with patient name, inputs, status pills and action buttons", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppointmentModal, createModalProps()),
		);
		assert.ok(html.includes("Запись: Иванов Иван") || html.includes("Детали приема"));
		assert.ok(html.includes("Иванов Иван"));
		assert.ok(html.includes("Д-р Смирнов"));
		assert.ok(html.includes("Кабинет 1"));
		assert.ok(html.includes("Повторить"));
		assert.ok(html.includes("Сохранить"));
		assert.ok(html.includes("Быстрый выбор длительности"));
		assert.ok(html.includes("30 мин"));
		assert.ok(html.includes("1 час"));
		assert.ok(html.includes("Острая боль"));
		assert.ok(html.includes("Консультация"));
	});

	it("auto-populates duty doctor from chairDoctorAssignments when appointment.doctorUserId is unassigned", () => {
		const unassignedAppt = {
			...mockAppointment,
			id: "appt-101",
			doctorUserId: "",
			chairId: "chair-1",
		};
		const chairAssignments = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов",
				shiftPreset: "morning",
				shiftLabel: "Утренняя смена",
				shiftHours: "08:00–14:00",
				startHour: 8,
				endHour: 14,
			},
		};
		const html = renderToStaticMarkup(
			React.createElement(
				AppointmentModal,
				createModalProps(unassignedAppt, mockDashboard, { chairDoctorAssignments: chairAssignments }),
			),
		);
		assert.ok(html.includes("Д-р Смирнов"));
		assert.ok(html.includes("Кабинет 1"));
	});
});

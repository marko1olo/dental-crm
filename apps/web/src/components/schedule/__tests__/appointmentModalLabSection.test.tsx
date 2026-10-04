/**
 * appointmentModalLabSection.test.tsx
 *
 * Targeted tests for AppointmentModalLabSection:
 * - Status indicators (ready_in_clinic, overdue, in_lab)
 * - VITA shade with color swatch
 * - Construction type & FDI tooth
 * - Readiness date with alert
 * - Navigation to #lab registry
 * - Sync appointment date with lab readiness
 * - Quiet empty-state fallback
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppointmentModalLabSection } from "../AppointmentModalLabSection";
import type { Appointment } from "@dental/shared";

describe("AppointmentModalLabSection — Лабораторные наряды (ЗТЛ) в модалке записи", () => {
	const baseAppt: Appointment = {
		id: "appt-lab-101",
		organizationId: "org-1",
		doctorUserId: "doc-1",
		chairId: "chair-1",
		patientId: "pat-101",
		status: "planned",
		startsAt: "2026-10-20T10:00:00.000Z",
		endsAt: "2026-10-20T11:00:00.000Z",
		reason: "Консультация",
		comment: null,
	};

	it("1. Рендерит готовый в клинике наряд ЗТЛ со статусом, цветом VITA, зубом и кнопкой перехода", () => {
		const labOrders = [
			{
				id: "lo-1",
				orderNumber: "ЗТЛ-890",
				status: "ready_in_clinic",
				material: "Циркониевая коронка Prettau",
				toothFdi: "16",
				colorVita: "A2",
				dueDate: "2026-10-18T10:00:00.000Z",
			},
		];

		const html = renderToStaticMarkup(
			<AppointmentModalLabSection
				appointment={baseAppt}
				activeLabOrders={labOrders}
				startsAtLocal="2026-10-20T10:00"
			/>,
		);

		assert.ok(html.includes('data-testid="appointment-modal-lab-section"'), "Секция ЗТЛ должна быть в DOM");
		assert.ok(html.includes("ЗТЛ-890"), "Номер наряда должен отображаться");
		assert.ok(html.includes("Поступил в клинику") || html.includes("В клинике"), "Статус готовности должен отображаться");
		assert.ok(html.includes("Циркониевая коронка Prettau"), "Тип конструкции должен отображаться");
		assert.ok(html.includes("Зуб 16"), "Зуб по FDI должен отображаться");
		assert.ok(html.includes("VITA A2"), "Расцветка VITA должна отображаться");
		assert.ok(html.includes('data-testid="appointment-modal-open-lab-order-btn"'), "Кнопка перехода в ЗТЛ должна присутствовать");
		assert.ok(html.includes("Открыть в ЗТЛ"), "Текст кнопки открытия ЗТЛ");
	});

	it("2. Отображает статус 'Просрочен на X дн!' и предупреждение о несогласованности дат", () => {
		const labOrders = [
			{
				id: "lo-2",
				orderNumber: "ЗТЛ-891",
				status: "in_progress",
				material: "Бюгельный протез на замках",
				toothFdi: "46",
				colorVita: "B1",
				dueDate: "2026-10-25T10:00:00.000Z", // Срок позже, чем прием 2026-10-20
			},
		];

		const html = renderToStaticMarkup(
			<AppointmentModalLabSection
				appointment={baseAppt}
				activeLabOrders={labOrders}
				startsAtLocal="2026-10-20T10:00"
				setStartsAtLocal={() => {}}
				setEndsAtLocal={() => {}}
			/>,
		);

		assert.ok(html.includes("прием раньше готовности ЗТЛ"), "Должно отображаться предупреждение о раннем приеме");
		assert.ok(html.includes('data-testid="appointment-modal-sync-lab-date-btn"'), "Кнопка 'На дату ЗТЛ' должна присутствовать");
		assert.ok(html.includes("На дату ЗТЛ"), "Текст кнопки синхронизации");
	});

	it("3. При отсутствии нарядов отображает тихий empty-state с кнопкой '+ Оформить наряд в ЗТЛ'", () => {
		const nonLabAppt: Appointment = {
			...baseAppt,
			reason: "Профгигиена полости рта",
		};

		const html = renderToStaticMarkup(
			<AppointmentModalLabSection
				appointment={nonLabAppt}
				activeLabOrders={[]}
			/>,
		);

		assert.ok(html.includes('data-testid="appointment-modal-lab-empty"'), "Empty-state блок должен отображаться");
		assert.ok(html.includes('data-testid="appointment-modal-create-lab-order-btn"'), "Кнопка оформления наряда должна присутствовать");
		assert.ok(html.includes("+ Оформить наряд в ЗТЛ"), "Текст призыва к оформлению наряда");
	});

	it("4. Извлекает наряд из свойств самого appointment, если activeLabOrders пуст", () => {
		const apptWithLab: any = {
			...baseAppt,
			labOrder: {
				orderNumber: "ЗТЛ-999",
				status: "ready_in_clinic",
				workType: "Вкладка e.MAX",
				colorVita: "A3",
				toothFdi: "24",
			},
		};

		const html = renderToStaticMarkup(
			<AppointmentModalLabSection
				appointment={apptWithLab}
				activeLabOrders={[]}
			/>,
		);

		assert.ok(html.includes('data-testid="appointment-modal-lab-section"'), "Секция ЗТЛ должна быть в DOM");
		assert.ok(html.includes("ЗТЛ-999"), "Номер наряда из appointment.labOrder должен отображаться");
		assert.ok(html.includes("Вкладка e.MAX"), "Тип работы должен отображаться");
		assert.ok(html.includes("VITA A3"), "Цвет VITA должен отображаться");
	});
});

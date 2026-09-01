import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DoctorCalendarSyncModal } from "./DoctorCalendarSyncModal.js";

describe("DoctorCalendarSyncModal Component", () => {
	const mockDashboard: any = {
		clinicSettings: {
			staff: [
				{
					id: "doc-1",
					name: "Доктор Барабаш С.В.",
					fullName: "Барабаш Сергей Васильевич",
					role: "doctor",
					active: true,
				},
				{
					id: "doc-2",
					name: "Доктор Смирнова Е.А.",
					fullName: "Смирнова Екатерина Алексеевна",
					role: "doctor",
					active: true,
				},
			],
		},
	};

	it("renders nothing when isOpen is false", () => {
		const html = renderToStaticMarkup(
			<DoctorCalendarSyncModal
				isOpen={false}
				onClose={() => {}}
				dashboard={mockDashboard}
			/>,
		);
		assert.equal(html, "");
	});

	it("renders modal structure with 152-FZ banner, doctor selector and platform links when open", () => {
		const html = renderToStaticMarkup(
			<DoctorCalendarSyncModal
				isOpen={true}
				onClose={() => {}}
				dashboard={mockDashboard}
				initialDoctorId="doc-1"
			/>,
		);

		assert.ok(html.includes("data-testid=\"doctor-calendar-sync-modal\""));
		assert.ok(html.includes("Синхронизация расписания (iCal / CalDAV)"));
		assert.ok(html.includes("152-ФЗ защита"));
		assert.ok(html.includes("Барабаш Сергей Васильевич"));
		assert.ok(html.includes("Смирнова Екатерина Алексеевна"));
	});
});

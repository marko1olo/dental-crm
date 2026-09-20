/**
 * patientWorkspaceVirtualization.test.tsx
 *
 * Unit tests verifying DOM virtualization and low-spec memory guards in PatientWorkspaceView:
 * - 100+ visits bounded by sliceDomList (initial window 30)
 * - 80+ treatment plan items bounded by sliceDomList (initial window 30)
 * - Progressive disclosure "Показать ещё" counters
 * - Cornerstone3DViewer WebGL canvas teardown guard
 *
 * Compliance: Mandates 8c, 8e, 8n (Low-Spec Celeron / 4GB RAM Anti-Swap Invariant)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientWorkspaceView } from "../PatientWorkspaceView";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import { teardownViewportCanvases } from "../../../utils/viewportTeardownHelper";
import type { Appointment, Dashboard, TreatmentPlanItem } from "@dental/shared";

const mockAppContext = {
	dashboard: null,
	setSelectedPatientId: () => {},
} as any;

describe("PatientWorkspaceView DOM Virtualization on 100+ Visits & Plans (Mandate 8c)", () => {
	it("1. bounds 120 visits to initial window of 30 cards and renders 'Показать ещё' button", () => {
		const appointments: Appointment[] = Array.from({ length: 120 }, (_, idx) => ({
			id: `appt-${idx + 1}`,
			patientId: "pat-virtual-120",
			doctorUserId: "doc-1",
			status: "completed",
			startsAt: new Date(2025, 0, 1 + idx, 10, 0).toISOString(),
			endsAt: new Date(2025, 0, 1 + idx, 10, 30).toISOString(),
			reason: `Консультация и лечение кариеса #${idx + 1}`,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})) as any;

		const dashboard: Partial<Dashboard> = {
			appointments,
			treatmentPlanItems: [],
			documents: [],
			clinicSettings: {
				staff: [{ id: "doc-1", fullName: "Д-р Иванов Иван Иванович" } as any],
			} as any,
		};

		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<PatientWorkspaceView
					patientId="pat-virtual-120"
					patientName="Петров Петр Петрович"
					dashboard={dashboard as Dashboard}
					initialTab="visits"
				/>
			</AppLogicProvider>,
		);

		// Count visit-history-card occurrences in rendered HTML
		const cardMatches = html.match(/visit-history-card/g) || [];
		assert.equal(
			cardMatches.length,
			30,
			`Must render exactly 30 cards in initial DOM, found ${cardMatches.length}`,
		);

		// Must render progressive disclosure button with exact counters
		assert.ok(
			html.includes('data-testid="btn-patient-visits-show-more"'),
			"Must render 'Показать ещё' button for remaining visits",
		);
		assert.ok(
			html.includes("Показать ещё 30 визитов (показано 30 из 120)"),
			"Must display exact counter 'Показать ещё 30 визитов (показано 30 из 120)'",
		);
	});

	it("2. bounds 85 treatment plan items to initial window of 30 cards and renders 'Показать ещё' button", () => {
		const treatmentPlanItems: TreatmentPlanItem[] = Array.from(
			{ length: 85 },
			(_, idx) => ({
				id: `item-${idx + 1}`,
				patientId: "pat-plans-85",
				snapshotServiceName: `Установка имплантата / пломба #${idx + 1}`,
				toothCode: `${11 + (idx % 32)}`,
				status: idx % 2 === 0 ? "completed" : "planned",
				unitPriceRub: 5500,
				qty: 1,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			}),
		) as any;

		const dashboard: Partial<Dashboard> = {
			appointments: [],
			treatmentPlanItems,
			documents: [],
			clinicSettings: { staff: [] } as any,
		};

		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<PatientWorkspaceView
					patientId="pat-plans-85"
					patientName="Сидоров Сидор Сидорович"
					dashboard={dashboard as Dashboard}
					initialTab="plans"
				/>
			</AppLogicProvider>,
		);

		// Count occurrences of planned/completed items
		const buttonMatch = html.includes(
			'data-testid="btn-patient-plans-show-more"',
		);
		assert.ok(buttonMatch, "Must render 'Показать ещё' button for remaining plan items");
		assert.ok(
			html.includes("Показать ещё 30 поз. (показано 30 из 85)"),
			"Must display exact counter 'Показать ещё 30 поз. (показано 30 из 85)'",
		);
	});

	it("3. teardownViewportCanvases zeros canvas dimensions and clears 2D/WebGL contexts", () => {
		let clearRectCalled = false;
		let loseContextCalled = false;

		const mockCanvas = {
			width: 1024,
			height: 768,
			getContext: (type: string) => {
				if (type === "2d") {
					return {
						clearRect: () => {
							clearRectCalled = true;
						},
					};
				}
				if (type === "webgl" || type === "webgl2") {
					return {
						getExtension: (ext: string) => {
							if (ext === "WEBGL_lose_context") {
								return {
									loseContext: () => {
										loseContextCalled = true;
									},
								};
							}
							return null;
						},
					};
				}
				return null;
			},
		} as any;

		const mockContainer = {
			querySelectorAll: (selector: string) => {
				if (selector === "canvas") {
					return [mockCanvas];
				}
				return [];
			},
		} as any;

		teardownViewportCanvases(mockContainer);

		assert.equal(mockCanvas.width, 0, "Canvas width must be zeroed to release GPU backing store");
		assert.equal(mockCanvas.height, 0, "Canvas height must be zeroed to release GPU backing store");
		assert.equal(loseContextCalled, true, "WEBGL_lose_context must be invoked to force VRAM release");
		assert.equal(clearRectCalled, true, "clearRect must be invoked to free 2D buffer");
	});
});

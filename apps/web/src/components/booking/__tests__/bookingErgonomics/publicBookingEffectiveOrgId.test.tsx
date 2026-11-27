import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setupMockDom } from "./bookingTestDomHarness.js";
import { usePublicBookingState } from "../../publicWidget/usePublicBookingState.js";

describe("PublicBookingWidget effectiveOrgId hydration & submission", () => {
	it("fetches /default-clinic?allowDefault=1 when organizationId is null and forwards effectiveOrgId to POST /create", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);

		const originalFetch = globalThis.fetch;
		const resolvedClinicOrgId = "99999999-9999-4999-8999-999999999999";
		const fetchUrls: string[] = [];
		let submittedBookingBody: Record<string, unknown> | null = null;

		globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
			const urlStr = String(url);
			fetchUrls.push(urlStr);

			if (urlStr.includes("/api/public/booking/default-clinic?allowDefault=1")) {
				return new Response(
					JSON.stringify({
						organizationId: resolvedClinicOrgId,
						name: "Тестовая Клиника",
						doctors: [
							{
								id: "doc-1",
								name: "Д-р Смирнов",
								specialty: "Терапевт",
								isAvailable: true,
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}

			if (urlStr.includes(`/${resolvedClinicOrgId}/doctors`)) {
				return new Response(
					JSON.stringify({
						data: [
							{
								id: "doc-1",
								fullName: "Д-р Смирнов",
								specialty: "Терапевт",
								isAvailable: true,
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}

			if (urlStr.includes("/available-slots")) {
				return new Response(
					JSON.stringify({
						data: [
							{
								time: "10:00",
								startsAt: "2029-10-10T10:00:00.000Z",
								endsAt: "2029-10-10T10:30:00.000Z",
								availableDoctorIds: ["doc-1"],
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}

			if (urlStr.endsWith(`/api/public/booking/${resolvedClinicOrgId}/book`)) {
				submittedBookingBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
				return new Response(
					JSON.stringify({
						success: true,
						bookingId: "bk-1",
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}

			return new Response(JSON.stringify({}), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		};

		let latestState: ReturnType<typeof usePublicBookingState> | null = null;
		function WidgetStateHarness() {
			latestState = usePublicBookingState({
				organizationId: null,
				initialStep: 4,
				initialDoctorId: "doc-1",
				initialPatientName: "Иван Петров",
				initialPatientPhone: "+79161234567",
			});
			return null;
		}

		try {
			await act(async () => {
				root.render(<WidgetStateHarness />);
			});
			// Flush async availability & slots effects
			await act(async () => {
				await new Promise((r) => setTimeout(r, 30));
			});
			await act(async () => {
				await new Promise((r) => setTimeout(r, 30));
			});

			assert.ok(
				fetchUrls.some((u) => u.includes("/api/public/booking/default-clinic?allowDefault=1")),
				`Expected default-clinic?allowDefault=1 fetch, got: ${fetchUrls.join(", ")}`,
			);
			if (!latestState) {
				throw new Error("usePublicBookingState did not initialize");
			}
			const bookingState = latestState as ReturnType<typeof usePublicBookingState>;

			await act(async () => {
				bookingState.setHasAgreedToPrivacy(true);
				if (!bookingState.selectedSlot) {
					bookingState.setSelectedSlot({
						id: "slot-1",
						time: "10:00",
						durationMinutes: 30,
						isAvailable: true,
						doctorId: "doc-1",
					});
				}
			});

			const readyState = latestState as ReturnType<typeof usePublicBookingState>;
			await act(async () => {
				await readyState.handleFinalSubmit();
			});

			const afterSubmitState = latestState as ReturnType<typeof usePublicBookingState>;
			assert.ok(
				submittedBookingBody,
				`POST /api/public/booking/${resolvedClinicOrgId}/book must be called (submitError=${afterSubmitState.submitError}, urls=${fetchUrls.join(" | ")})`,
			);
			assert.equal(submittedBookingBody.organizationId, resolvedClinicOrgId);
		} finally {
			await act(async () => {
				root.unmount();
			});
			globalThis.fetch = originalFetch;
		}
	});
});

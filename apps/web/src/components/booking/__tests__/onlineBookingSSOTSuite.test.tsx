import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { PublicBookingPage } from "../../../pages/PublicBookingPage";
import {
	CANONICAL_BOOKING_CATEGORIES,
	PublicBookingWidget,
	groupSlotsByDayPeriod,
} from "../PublicBookingWidget";
import { BookingPatientFormStep } from "../publicWidget/BookingPatientFormStep";
import { parseTopLevelSurface } from "../../../router/routeResolver";

describe("Public Booking SSOT, Trust Badge & Zero Fake Requisites Suite (6Г)", () => {
	it("1.1 parseTopLevelSurface routes /booking and #/booking into public_portal shell", () => {
		const byPath = parseTopLevelSurface({ pathname: "/booking/org-solo-1", search: "", hash: "" });
		assert.equal(byPath.surface, "public_portal");
		if (byPath.surface === "public_portal") {
			assert.equal(byPath.kind, "booking");
			assert.equal(byPath.slug, "org-solo-1");
		}

		const byHash = parseTopLevelSurface({ pathname: "/", search: "?org=org-solo-2", hash: "#/booking" });
		assert.equal(byHash.surface, "public_portal");
		if (byHash.surface === "public_portal") {
			assert.equal(byHash.kind, "booking");
		}
	});

	it("2.1 PublicBookingPage renders desktop showcase, 44px touch tabs and NEVER renders fake license or hotline", () => {
		const html = renderToString(
			React.createElement(PublicBookingPage, {
				organizationId: "org-real-1",
				defaultMode: "booking",
			}),
		);

		assert.ok(html.includes('data-testid="clinic-desktop-showcase"'));
		assert.ok(html.includes("min-h-[44px]"), "Mode switcher tabs must enforce >=44px mobile touch height");
		assert.equal(
			html.includes("ЛО-77-01-021482"),
			false,
			"Fake license ЛО-77-01-021482 must never appear in PublicBookingPage",
		);
		assert.equal(
			html.includes("+7 (800) 200-55-40"),
			false,
			"Fake 8-800 hotline must never appear when clinic phone is absent",
		);
	});

	it("2.2 PublicBookingWidget renders widget shell and canonical booking categories without dev slang", () => {
		assert.ok(CANONICAL_BOOKING_CATEGORIES.length >= 4);
		for (const cat of CANONICAL_BOOKING_CATEGORIES) {
			assert.equal(cat.title.toLowerCase().includes("1 клик"), false);
		}

		const html = renderToString(
			React.createElement(PublicBookingWidget, {
				organizationId: "org-real-1",
			}),
		);
		assert.ok(html.includes('class="dente-booking-widget'));
		assert.ok(html.includes('class="dbw-body"'));
	});

	it("3.1 BookingPatientFormStep displays trust status badge and never disables Submit Primary CTA", () => {
		const baseStepProps = {
			isTelegramContext: false,
			patientName: "Анна",
			setPatientName: () => {},
			patientPhone: "+7 (999) 123-45-67",
			handlePhoneChange: () => {},
			patientComment: "",
			setPatientComment: () => {},
			hasAgreedToPrivacy: true,
			setHasAgreedToPrivacy: () => {},
			showSmsVerification: true,
			smsCodeSent: false,
			enteredSmsCode: "",
			setEnteredSmsCode: () => {},
			isSmsVerified: false,
			isSmsFallbackActive: false,
			handleEnableSmsFallback: () => {},
			smsResendCountdown: 0,
			smsError: null,
			handleSendSmsCode: () => {},
			handleVerifySmsCode: () => {},
			handleTelegramShareContact: () => {},
			submitError: null,
			setSubmitError: () => {},
			isSubmitting: false,
			onSubmit: () => {},
		};

		const preBookingHtml = renderToString(
			React.createElement(BookingPatientFormStep, baseStepProps),
		);
		assert.ok(preBookingHtml.includes('data-testid="booking-trust-status-badge"'));
		assert.ok(preBookingHtml.includes("Предварительная (требует звонка)"));

		const submitBtnIdx = preBookingHtml.indexOf('type="submit"');
		assert.ok(submitBtnIdx > -1, "Submit button must be rendered");
		const submitChunk = preBookingHtml.slice(Math.max(0, submitBtnIdx - 120), submitBtnIdx + 200);
		assert.equal(submitChunk.includes("disabled"), false, "Primary booking CTA must NEVER be disabled");

		const verifiedHtml = renderToString(
			React.createElement(BookingPatientFormStep, {
				...baseStepProps,
				isSmsVerified: true,
			}),
		);
		assert.ok(verifiedHtml.includes("Подтверждённая запись"));
	});

	it("3.2 groupSlotsByDayPeriod partitions morning/afternoon/evening slots accurately", () => {
		const grouped = groupSlotsByDayPeriod([
			{ startsAt: "2026-09-10T09:00:00", endsAt: "2026-09-10T09:30:00", time: "09:00" },
			{ startsAt: "2026-09-10T14:30:00", endsAt: "2026-09-10T15:00:00", time: "14:30" },
			{ startsAt: "2026-09-10T18:30:00", endsAt: "2026-09-10T19:00:00", time: "18:30" },
		]);
		assert.equal(grouped.morning.length, 1);
		assert.equal(grouped.afternoon.length, 1);
		assert.equal(grouped.evening.length, 1);
	});
});

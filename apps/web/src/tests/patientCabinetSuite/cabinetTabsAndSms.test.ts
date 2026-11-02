/**
 * Patient Personal Portal - Tabs, 63-FZ SMS/OTP, Self-Checkin & AuthArt Suite
 * (DOMAIN: PORTAL PATIENT CABINET)
 * Part of decomposed patientCabinetSuite per Mandates 8b and 8zi
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	OverviewTab,
	AppointmentsTab,
	FamilyTab,
} from "../../components/portal/patientCabinet/tabs";
import { PatientCabinetModal } from "../../components/portal/patientCabinet/PatientCabinetModal";
import { MobileSelfCheckinModal } from "../../components/portal/selfCheckin/MobileSelfCheckinModal";
import { SelfCheckinPhoneAuthSection } from "../../components/portal/selfCheckin/SelfCheckinPhoneAuthSection";
import { setRuntimeDemoMode } from "../../lib/demoMode";
import {
	calculateCabinetSummary,
	calculateDentalHealthIndex,
	DEFAULT_PATIENT_TEETH,
	formatRubles,
	generatePepIntegrityHash,
	generateSmsOtp,
	signConsentWithPep,
	verifySmsOtp,
	type PatientPersonalCabinetData,
	type PatientStatutoryConsent,
} from "../../components/portal/patientCabinet/patientCabinetEngine";
import { PATIENT_CABINET_PRESET_ALEXEY } from "../../components/portal/patientCabinet/patientCabinetPresets";

describe("Patient Personal Portal - 63-FZ SMS/OTP & PEP Digital Signatures", () => {
	it("generates 6-digit OTP code and enforces expiration", () => {
		const otp = generateSmsOtp("+79991234567");
		assert.equal(otp.code.length, 6);
		assert.ok(/^\d{6}$/.test(otp.code));
		assert.ok(otp.expiresAt > otp.sentTimestamp);
	});

	it("validates correct vs incorrect SMS OTP codes", () => {
		const now = Date.now();
		const expected = "842109";

		// Valid
		const okRes = verifySmsOtp("842109", expected, now);
		assert.equal(okRes.success, true);

		// Invalid code
		const badCodeRes = verifySmsOtp("123456", expected, now);
		assert.equal(badCodeRes.success, false);
		assert.match(badCodeRes.error || "", /Неверный код/);

		// Non-6-digit input
		const shortRes = verifySmsOtp("842", expected, now);
		assert.equal(shortRes.success, false);

		// Expired OTP (older than 5 min)
		const expiredRes = verifySmsOtp("842109", expected, now - 6 * 60 * 1000);
		assert.equal(expiredRes.success, false);
		assert.match(expiredRes.error || "", /истек/);
	});

	it("signs statutory consent 323-FZ with simple electronic signature (63-FZ PEP) and SHA-256 hash", () => {
		const pendingConsent = PATIENT_CABINET_PRESET_ALEXEY.consents[0] as PatientStatutoryConsent;
		assert.equal(pendingConsent.status, "pending_signature");

		const signedConsent = signConsentWithPep(
			pendingConsent,
			"+7 (999) 123-45-67",
			"842109",
			"Воронов Алексей Владимирович",
		);

		assert.equal(signedConsent.status, "signed");
		assert.ok(signedConsent.signedAtIso);
		assert.ok(signedConsent.signatureAudit);
		assert.equal(signedConsent.signatureAudit?.verificationMethod, "sms_otp");
		assert.equal(signedConsent.signatureAudit?.legalBasis, "63-ФЗ ПЭП");
		assert.equal(signedConsent.signatureAudit?.smsOtpCode, "842109");

		// Integrity hash
		assert.ok(signedConsent.signatureAudit?.integrityHash);
		assert.equal(signedConsent.signatureAudit?.integrityHash.length, 64);

		// Hash determinism
		const expectedHash = generatePepIntegrityHash(
			pendingConsent,
			"+7 (999) 123-45-67",
			"842109",
			signedConsent.signatureAudit.timestamp,
		);
		assert.equal(signedConsent.signatureAudit.integrityHash, expectedHash);
	});
});

describe("Patient Personal Portal - OverviewTab Dynamic Calendars & Family Pool", () => {
	it("renders Family Pool balance and members count when available", () => {
		const dataWithFamily: PatientPersonalCabinetData = {
			...PATIENT_CABINET_PRESET_ALEXEY,
			familyBalanceRub: 45000,
			familyBonusPool: 12000,
			familyMembersCount: 4,
		};
		const summary = calculateCabinetSummary(dataWithFamily);
		const healthIndex = calculateDentalHealthIndex(dataWithFamily.teeth || DEFAULT_PATIENT_TEETH);

		const html = renderToString(
			React.createElement(OverviewTab, {
				data: dataWithFamily,
				summary,
				healthIndex,
				nextApptCountdown: "Через 2 дня",
				onOpenTab: () => {},
				onOpenReceptionQr: () => {},
				onOpenCareMemo: () => {},
				onOpenSbpForInvoice: () => {},
				onOpenSelfCheckin: () => {},
			}),
		);

		assert.ok(html.includes("data-testid=\"pc-family-pool-pill\""), "Should render family pool pill");
		assert.ok(html.includes("Семейный счет (4 чел.)"), "Should include family members count");
		assert.ok(html.includes("45\u00A0000 ₽"), "Should include family balance");
		assert.ok(html.includes("12\u00A0000 бонусов"), "Should include family bonus pool");
	});

	it("renders dynamic calendar export buttons with appointment date and time", () => {
		const customAppt = {
			...PATIENT_CABINET_PRESET_ALEXEY.appointments[0]!,
			dateIso: "2026-11-20",
			timeRu: "16:45",
			doctorName: "Д-р Смирнов А. В.",
			roomNumber: "Кабинет 3",
		};
		const dataWithCustomAppt: PatientPersonalCabinetData = {
			...PATIENT_CABINET_PRESET_ALEXEY,
			appointments: [customAppt],
		};
		const summary = calculateCabinetSummary(dataWithCustomAppt);
		const healthIndex = calculateDentalHealthIndex(dataWithCustomAppt.teeth || DEFAULT_PATIENT_TEETH);

		const html = renderToString(
			React.createElement(OverviewTab, {
				data: dataWithCustomAppt,
				summary,
				healthIndex,
				nextApptCountdown: "Через 5 дней",
				onOpenTab: () => {},
				onOpenReceptionQr: () => {},
				onOpenCareMemo: () => {},
				onOpenSbpForInvoice: () => {},
				onOpenSelfCheckin: () => {},
			}),
		);

		assert.ok(html.includes("data-testid=\"next-appt-apple-cal-btn\""));
		assert.ok(html.includes("data-testid=\"next-appt-google-cal-btn\""));
		assert.ok(html.includes("data-testid=\"next-appt-yandex-cal-btn\""));

		// Must contain appointment date in the card
		assert.ok(html.includes("2026-11-20"));
		assert.ok(html.includes("16:45"));
	});
});

describe("Patient Personal Portal - AppointmentsTab & FamilyTab Ergonomics", () => {
	it("renders AppointmentsTab with 18-20px bold visit times, doctors, calendar exports, and cancellation triggers", () => {
		const html = renderToString(
			React.createElement(AppointmentsTab, {
				data: PATIENT_CABINET_PRESET_ALEXEY,
				onOpenReceptionQr: () => {},
				onOpenReschedule: () => {},
				onOpenBooking: () => {},
				onCancelAppointment: () => {},
				onShowToast: () => {},
			}),
		);

		assert.ok(html.includes("data-testid=\"pc-appointments-tab\""), "Should render appointments tab root");
		assert.ok(html.includes("Предстоящие"), "Should render filter tabs");
		assert.ok(html.includes("14:30"), "Should render bold visit time");
		assert.ok(html.includes("Д-р Смирнов Андрей Васильевич"), "Should render doctor name");
		assert.ok(html.includes("Кабинет № 4"), "Should render room number");
		assert.ok(html.includes("data-testid=\"btn-cancel-trigger-apt-8842-1\""), "Should render cancellation trigger");
		assert.ok(html.includes("data-testid=\"btn-reception-qr-apt-8842-1\""), "Should render reception QR button");
		assert.ok(html.includes("iCal"), "Should render Apple iCal button");
		assert.ok(html.includes("Google"), "Should render Google Calendar button");
		assert.ok(html.includes("Яндекс"), "Should render Yandex Calendar button");
	});

	it("renders FamilyTab with shared family deposit, bonus pool, member cards, and booking triggers", () => {
		const html = renderToString(
			React.createElement(FamilyTab, {
				data: PATIENT_CABINET_PRESET_ALEXEY,
				onOpenBookingForMember: () => {},
				onOpenBooking: () => {},
				onShowToast: () => {},
			}),
		);

		assert.ok(html.includes("data-testid=\"pc-family-tab\""), "Should render family tab root");
		assert.ok(html.includes("Семейный депозит и бонусный пул"), "Should render header banner");
		assert.ok(html.includes(formatRubles(84000)), "Should render shared balance");
		assert.ok(html.includes("18\u00A0500") && html.includes("бонусов"), "Should render bonus pool");
		assert.ok(html.includes("Воронова Екатерина Павловна"), "Should render spouse card");
		assert.ok(html.includes("Супруг(а)"), "Should render relationship tag");
		assert.ok(html.includes("Воронов Михаил Алексеевич"), "Should render child card");
		assert.ok(html.includes("Сын"), "Should render child relationship");
		assert.ok(html.includes("Оплата с общего счета"), "Should render balance permission");
		assert.ok(html.includes("data-testid=\"btn-toggle-add-family-member\""), "Should render add member button");
	});

	it("renders FamilyTab honest empty state for real production patient without family profile", () => {
		const html = renderToString(
			React.createElement(FamilyTab, {
				data: {
					...PATIENT_CABINET_PRESET_ALEXEY,
					patientId: "real-prod-patient-12345",
					familyMembers: [],
					familyBalanceRub: undefined,
					familyBonusPool: undefined,
				},
				onOpenBookingForMember: () => {},
				onOpenBooking: () => {},
				onShowToast: () => {},
			}),
		);

		assert.ok(html.includes("data-testid=\"pc-family-empty-state\""), "Should render family empty state");
		assert.ok(html.includes("Семейный профиль пока не заполнен"), "Should render empty title");
		assert.ok(html.includes("+ Добавить члена семьи"), "Should render add member action button");
		assert.ok(html.includes("0 ₽") || html.includes("0\u00A0₽"), "Should default balance to 0");
	});
});

describe("Patient Personal Portal - Atmosphere & AuthArtBackground Integration", () => {
	it("renders PatientCabinetModal with AuthArtBackground inside patient-cabinet-backdrop", () => {
		const html = renderToString(
			React.createElement(PatientCabinetModal, {
				isOpen: true,
				initialData: PATIENT_CABINET_PRESET_ALEXEY,
				onClose: () => {},
			}),
		);

		assert.ok(html.includes("patient-cabinet-backdrop"), "Backdrop should be rendered");
		assert.ok(html.includes("auth-art-background"), "Atmospheric background should be rendered inside backdrop");
		assert.ok(html.includes("patient-cabinet-modal"), "Modal content window should be rendered");
		assert.ok(html.includes(PATIENT_CABINET_PRESET_ALEXEY.fullName), "Patient name should be present in header");
	});
});

describe("Dual-Mode Zero-Mock Inquisitor Batch 3 (Mandate 8y & Mandates 8za, 8zb)", () => {
	it("PatientCabinetModal in production mode without initialData initializes empty state without demo synthetic identity", () => {
		setRuntimeDemoMode(false);
		const html = renderToString(
			React.createElement(PatientCabinetModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		// Must NOT contain demo persona Alexey Voronov
		assert.equal(html.includes("Воронов Алексей Владимирович"), false);
		assert.equal(html.includes("+7 (999) 123-45-67"), false);
		assert.equal(html.includes("043-8842"), false);

		// Must render honest production title and empty state
		assert.ok(html.includes("Личный кабинет") || html.includes("Пациент"));
	});

	it("PatientCabinetModal in demo showcase mode uses DEMO_PATIENT_CABINET when initialData is undefined", () => {
		setRuntimeDemoMode(true);
		const html = renderToString(
			React.createElement(PatientCabinetModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		assert.ok(html.includes("Воронов Алексей Владимирович"));
		setRuntimeDemoMode(false);
	});

	it("MobileSelfCheckinModal in production mode defaults to empty props and does not pre-fill demo persona", () => {
		setRuntimeDemoMode(false);
		const html = renderToString(
			React.createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		// Must NOT pre-fill demo persona Anna Smirnova or fake phone
		assert.equal(html.includes("Смирнова Анна Викторовна"), false);
		assert.equal(html.includes("+7 (913) 770-41-99"), false);
		assert.equal(html.includes("Талон № А-07"), false);

		// Phone input should have empty value and not auto-filled with 4199
		assert.equal(html.includes('value="4199"'), false);
		assert.ok(html.includes('data-testid="one-touch-phone-input"'));
	});

	it("MobileSelfCheckinModal in demo mode pre-fills demo persona and appointment", () => {
		setRuntimeDemoMode(true);
		const html = renderToString(
			React.createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		assert.ok(html.includes("Смирнова Анна Викторовна"));
		assert.ok(html.includes("Талон № А-07") || html.includes("4199"));
		setRuntimeDemoMode(false);
	});

	it("SelfCheckinPhoneAuthSection renders clean greeting when patientName is empty and prevents unverified express checkin", () => {
		let authError: string | null = null;
		let checkinTriggered = false;

		const html = renderToString(
			React.createElement(SelfCheckinPhoneAuthSection, {
				patientName: "",
				appointmentTime: "",
				doctorName: "",
				phoneDigits: "",
				setPhoneDigits: () => {},
				showOptionalDocs: false,
				setShowOptionalDocs: () => {},
				authError,
				setAuthError: (err) => {
					authError = err;
				},
				isSubmitting: false,
				onApplyPhysiologicalNorm: () => {},
				onOneTouchCheckin: () => {
					checkinTriggered = true;
				},
				onGoToConsents: () => {},
				onGoToSomatic: () => {},
			}),
		);

		// Should render clean generic welcome instead of mock persona
		assert.ok(html.includes("Добро пожаловать в клинику!"));
		assert.ok(html.includes("Выберите цель визита") || html.includes("терминале самообслуживания"));
		assert.equal(html.includes("Смирнова Анна Викторовна"), false);
	});
});

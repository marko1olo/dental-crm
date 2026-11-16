import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolvePatientCategory } from "../../../store/telephonyStore.js";
import { mockPatients } from "./telephonyTestFixtures.js";

interface TelephonyVipPatientFixture {
	id: string;
	fullName: string;
	phone?: string | null;
	balanceRub?: number | string | null;
	notes?: string | null;
	tags?: string[];
	administrativeProfile?: {
		legalRepresentativePhone?: string | null;
		insurancePolicyNumber?: string | null;
		loyaltyTier?: string | null;
	} | null;
}

describe("Telephony: Patient Category Classification", () => {
	test("classifies as VIP if patient has VIP in notes or tags or loyaltyTier", () => {
		const base0 = mockPatients[0];
		assert.ok(base0, "mockPatients[0] must exist");
		const vipPatient1: TelephonyVipPatientFixture = {
			id: base0.id,
			fullName: base0.fullName,
			phone: base0.phone,
			notes: "Особый ВИП пациент клиники",
		};
		assert.equal(resolvePatientCategory(vipPatient1), "VIP");

		const base1 = mockPatients[1];
		assert.ok(base1, "mockPatients[1] must exist");
		const vipPatient2: TelephonyVipPatientFixture = {
			id: base1.id,
			fullName: base1.fullName,
			phone: base1.phone,
			administrativeProfile: {
				loyaltyTier: "vip",
			},
		};
		assert.equal(resolvePatientCategory(vipPatient2), "VIP");

		const vipPatient3: TelephonyVipPatientFixture = {
			id: base0.id,
			fullName: base0.fullName,
			phone: base0.phone,
			tags: ["vip", "implantology"],
		};
		assert.equal(resolvePatientCategory(vipPatient3), "VIP");
	});

	test("classifies as Первичный if visits are absent or lastVisitSummary.isNewPatient", () => {
		const base1 = mockPatients[1];
		assert.ok(base1, "mockPatients[1] must exist");
		const newPatient = {
			...base1,
			notes: "Первичный звонок",
		};
		const lastVisit = {
			lastVisitDate: null,
			formattedLastVisit: "Первичный приём (визитов нет)",
			doctorName: null,
			doctorSpecialty: null,
			appointmentReason: null,
			isNewPatient: true,
		};
		assert.equal(resolvePatientCategory(newPatient, lastVisit), "Первичный");
	});

	test("classifies as Постоянный if patient has past visits and not VIP", () => {
		const base0 = mockPatients[0];
		assert.ok(base0, "mockPatients[0] must exist");
		const regularPatient = {
			...base0,
			notes: "Обычный постоянный клиент без аллергий",
		};
		const lastVisit = {
			lastVisitDate: "2026-05-14T14:30:00Z",
			formattedLastVisit: "14 мая 2026",
			doctorName: "Др. Петров",
			doctorSpecialty: "therapist",
			appointmentReason: "Осмотр",
			isNewPatient: false,
		};
		assert.equal(resolvePatientCategory(regularPatient, lastVisit), "Постоянный");
	});
});

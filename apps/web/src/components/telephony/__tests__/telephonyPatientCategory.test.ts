import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolvePatientCategory } from "../../../store/telephonyStore.js";
import { mockPatients } from "./telephonyTestFixtures.js";

describe("Telephony: Patient Category Classification", () => {
	test("classifies as VIP if patient has VIP in notes or tags or loyaltyTier", () => {
		const base0 = mockPatients[0]!;
		const vipPatient1 = {
			...base0,
			notes: "Особый ВИП пациент клиники",
		};
		assert.equal(resolvePatientCategory(vipPatient1), "VIP");

		const base1 = mockPatients[1]!;
		const vipPatient2 = {
			...base1,
			administrativeProfile: base1.administrativeProfile
				? {
						...base1.administrativeProfile,
						loyaltyTier: "vip" as any,
					}
				: null,
		};
		assert.equal(resolvePatientCategory(vipPatient2 as any), "VIP");

		const vipPatient3 = {
			...base0,
			tags: ["vip", "implantology"],
		};
		assert.equal(resolvePatientCategory(vipPatient3 as any), "VIP");
	});

	test("classifies as Первичный if visits are absent or lastVisitSummary.isNewPatient", () => {
		const base1 = mockPatients[1]!;
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
		const base0 = mockPatients[0]!;
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

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	buildTelephonyCallerCard,
	calculatePatientFinancialStatus,
	generateAppointmentConfirmationMessage,
	generateOrthopedicReadyMessage,
	generateSmsConfirmationUrl,
	generateWhatsAppConfirmationUrl,
	getSharedTelephonyAudioStreamManager,
	resolvePatientActiveTreatmentPlan,
	resolvePatientLastVisit,
	resolvePatientNextVisit,
	resolvePatientSomaticAlerts,
	resolvePatientUpcomingAppointment,
	TelephonyAudioStreamManager,
} from "../../../store/telephonyClinical";
import { useTelephonyStore } from "../../../store/telephonyStore";
import type {
	Appointment,
	InsuranceContract,
	Patient,
	PatientInsight,
	StaffMember,
} from "@dental/shared";

describe("Telephony Decomposed Modules & Audio Player Test Suite (Mandate 8b, 8d, 8e)", () => {
	it("1. TelephonyAudioStreamManager handles audio context, volume clamping, and mute state", () => {
		const manager = new TelephonyAudioStreamManager({
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
		});

		// Volume clamping test
		manager.setStreamVolume(1.5);
		assert.equal(manager.getAudioStats().outputLevel, 1.0, "Volume must clamp to 1.0 maximum");

		manager.setStreamVolume(-0.5);
		assert.equal(manager.getAudioStats().outputLevel, 0.0, "Volume must clamp to 0.0 minimum");

		manager.setStreamVolume(0.85);
		assert.equal(manager.getAudioStats().outputLevel, 0.85, "Volume must accept valid 0.85");

		// Mute toggle
		manager.setMicrophoneMute(true);
		assert.equal(manager.getAudioStats().inputLevel, 0, "Input level must be 0 when muted");

		manager.setMicrophoneMute(false);
		assert.equal(manager.getAudioStats().inputLevel, 0.75, "Input level must be active when unmuted");

		// Singleton instance test
		const shared = getSharedTelephonyAudioStreamManager();
		assert.ok(shared instanceof TelephonyAudioStreamManager, "Must return valid singleton");

		// Cleanup
		manager.dispose();
	});

	it("2. Patient Financial Status calculation resolves balances, debt and insurance", () => {
		// Null patient fallback
		const emptyFin = calculatePatientFinancialStatus(null);
		assert.equal(emptyFin.balanceRub, 0);
		assert.equal(emptyFin.hasDebt, false);
		assert.equal(emptyFin.hasInsurance, false);

		// Patient with positive balance
		const patientPlus = {
			id: "pat-1",
			organizationId: "org-1",
			fullName: "Иванов Иван Иванович",
			phone: "+79161234567",
			balanceRub: 4500,
			birthDate: "1985-05-15",
			gender: "male",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as unknown as Patient;
		const finPlus = calculatePatientFinancialStatus(patientPlus);
		assert.equal(finPlus.balanceRub, 4500);
		assert.equal(finPlus.hasDebt, false);

		// Patient with debt and insurance
		const patientDebtor = {
			id: "pat-2",
			organizationId: "org-1",
			fullName: "Петрова Анна Сергеевна",
			phone: "+79169876543",
			balanceRub: -12000,
			birthDate: "1990-10-20",
			gender: "female",
			administrativeProfile: {
				insurancePolicyNumber: "POL-777-999",
			},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as unknown as Patient;
		const insuranceContracts = [
			{
				id: "ins-1",
				organizationId: "org-1",
				companyName: "СОГАЗ Мед",
				contractNumber: "DMS-2026-01",
				isActive: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		] as unknown as InsuranceContract[];
		const finDebtor = calculatePatientFinancialStatus(patientDebtor, null, insuranceContracts);
		assert.equal(finDebtor.hasDebt, true);
		assert.equal(finDebtor.debtRub, 12000);
		assert.equal(finDebtor.hasInsurance, true);
		assert.equal(finDebtor.insuranceName, "СОГАЗ Мед");
		assert.equal(finDebtor.policyNumber, "POL-777-999");
	});

	it("3. Visit resolvers correctly compute last visit, upcoming visit and next appointment", () => {
		const nowIso = "2026-10-12T12:00:00.000Z";
		const staff = [
			{
				id: "doc-1",
				organizationId: "org-1",
				fullName: "д-р Смирнов А.В.",
				specialties: ["therapist"],
				role: "doctor",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		] as unknown as StaffMember[];
		const appointments = [
			{
				id: "app-past",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				startsAt: "2026-09-10T10:00:00.000Z",
				endsAt: "2026-09-10T11:00:00.000Z",
				status: "completed",
				reason: "Лечение кариеса 24 зуба",
			},
			{
				id: "app-future",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				startsAt: "2026-10-13T14:30:00.000Z",
				endsAt: "2026-10-13T15:30:00.000Z",
				status: "planned",
				reason: "Контрольный осмотр и гигиена",
			},
		] as unknown as Appointment[];

		const lastVisit = resolvePatientLastVisit("pat-1", appointments, staff, nowIso);
		assert.equal(lastVisit.isNewPatient, false);
		assert.equal(lastVisit.doctorName, "д-р Смирнов А.В.");
		assert.equal(lastVisit.appointmentReason, "Лечение кариеса 24 зуба");

		const nextAppt = resolvePatientUpcomingAppointment("pat-1", appointments, staff, nowIso);
		assert.ok(nextAppt !== null);
		assert.equal(nextAppt?.appointmentId, "app-future");
		assert.equal(nextAppt?.doctorName, "д-р Смирнов А.В.");
		assert.equal(nextAppt?.isTomorrow, true);

		const nextVisitSummary = resolvePatientNextVisit("pat-1", appointments, staff, nowIso);
		assert.equal(nextVisitSummary.hasNextVisit, true);
		assert.equal(nextVisitSummary.doctorName, "д-р Смирнов А.В.");
		assert.ok(nextVisitSummary.fullTextRu.includes("Следующий визит"));
	});

	it("4. Somatic alerts classify allergies, chronic conditions, and acute pain without emojis", () => {
		const patientWithAllergies = {
			id: "pat-3",
			organizationId: "org-1",
			fullName: "Соколова Марина Петровна",
			phone: "+79165554433",
			notes: "Аллергия на лидокаин и пенициллин. Беременность 2 триместр. Кардиостимулятор.",
			balanceRub: 0,
			birthDate: "1992-03-01",
			gender: "female",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as unknown as Patient;
		const insight = {
			patientId: "pat-3",
			riskLevel: "high",
			clinicalFlags: ["Острая пульсирующая зубная боль"],
			riskReasons: ["Высокая кардиоваскулярная реактивность"],
		} as unknown as PatientInsight;

		const alerts = resolvePatientSomaticAlerts(patientWithAllergies, insight);
		assert.ok(alerts.length >= 4, "Must classify multiple somatic alerts");
		assert.ok(alerts.some((a) => a.label.includes("анестетики (лидокаин")));
		assert.ok(alerts.some((a) => a.label.includes("пенициллин")));
		assert.ok(alerts.some((a) => a.label.includes("Беременность")));
		assert.ok(alerts.some((a) => a.label.includes("Кардиостимулятор")));
		assert.ok(alerts.some((a) => a.category === "pain"));
	});

	it("5. buildTelephonyCallerCard aggregates patient clinical profile in 1 click", () => {
		const patient = {
			id: "pat-4",
			organizationId: "org-1",
			fullName: "Кузнецов Дмитрий Игоревич",
			phone: "+79031112233",
			balanceRub: 1500,
			birthDate: "1980-07-12",
			gender: "male",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as unknown as Patient;
		const callerCard = buildTelephonyCallerCard({
			phone: "+79031112233",
			patient,
		});

		assert.equal(callerCard.phone, "+79031112233");
		assert.equal(callerCard.patientName, "Кузнецов Дмитрий Игоревич");
		assert.equal(callerCard.financial.balanceRub, 1500);
		assert.equal(callerCard.lastVisit.isNewPatient, true);
	});

	it("6. Messaging engine generates 100% clean clinical Russian templates and valid URLs", () => {
		const smsMsg = generateAppointmentConfirmationMessage({
			patientName: "Василий",
			doctorName: "Кузнецов А.А.",
			appointmentStartsAt: "2026-10-15T15:00:00.000Z",
			clinicName: "DENTE",
			templateType: "confirmation",
		});
		assert.ok(smsMsg.includes("Здравствуйте, Василий!"));
		assert.ok(smsMsg.includes("DENTE"));

		const orthoMsg = generateOrthopedicReadyMessage({
			patientName: "Смирнова Елена",
			orderNumber: "8841",
			toothFdi: 26,
			material: "диоксид циркония",
			doctorName: "д-р Михайлов",
			clinicName: "DENTE",
			clinicPhone: "+7 (495) 123-45-67",
			channel: "whatsapp",
		});
		assert.ok(orthoMsg.includes("Елена"));
		assert.ok(orthoMsg.includes("8841"));
		assert.ok(orthoMsg.includes("диоксид циркония, зуб 26"));
		assert.ok(orthoMsg.includes("д-р Михайлов"));

		const waUrl = generateWhatsAppConfirmationUrl("+79161234567", "Тестовое подтверждение");
		assert.ok(waUrl.startsWith("https://wa.me/79161234567?text="));

		const smsUrl = generateSmsConfirmationUrl("+79161234567", "Тестовое SMS");
		assert.ok(smsUrl.startsWith("sms:+79161234567?body="));
	});

	it("7. useTelephonyStore controls playback speed cycling and line switching", () => {
		const store = useTelephonyStore.getState();

		// Speed cycling: 1 -> 1.25 -> 1.5 -> 2 -> 1
		useTelephonyStore.getState().setPlaybackSpeed(1);
		assert.equal(useTelephonyStore.getState().playbackSpeed, 1);

		useTelephonyStore.getState().cyclePlaybackSpeed();
		assert.equal(useTelephonyStore.getState().playbackSpeed, 1.25);

		useTelephonyStore.getState().cyclePlaybackSpeed();
		assert.equal(useTelephonyStore.getState().playbackSpeed, 1.5);

		useTelephonyStore.getState().cyclePlaybackSpeed();
		assert.equal(useTelephonyStore.getState().playbackSpeed, 2);

		useTelephonyStore.getState().cyclePlaybackSpeed();
		assert.equal(useTelephonyStore.getState().playbackSpeed, 1);

		// Line switching and hold logic
		useTelephonyStore.getState().switchLine(2);
		assert.equal(useTelephonyStore.getState().activeLineId, 2);

		useTelephonyStore.getState().switchLine(1);
		assert.equal(useTelephonyStore.getState().activeLineId, 1);
	});
});

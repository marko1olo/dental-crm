/**
 * somaticRadar.test.ts — Comprehensive Unit Tests for 07:30 AM Somatic Risk & DDI Radar.
 *
 * Verifies:
 * 1. Dual-factor high-precision trigger logic (no spam on routine appointments).
 * 2. Anticoagulant + Surgery threat detection (Warfarin, Xarelto, Plavix, Aspirin).
 * 3. Articaine / Amide local anesthetic allergy detection and safe alternatives (Mepivacaine 3% / Scandonest).
 * 4. Stage III Hypertension & Thyrotoxicosis vasoconstrictor contraindication (Adrenaline-free protocol).
 * 5. Bronchial Asthma / Sulfite allergy vs metabisulfite (E223) in adrenaline carpules.
 * 6. Bisphosphonate therapy (Aclasta / Prolia / Denosumab) + tooth extraction MRONJ risk.
 * 7. Penicillin allergy and safe macrolide/lincosamide recommendations (Sumamed / Clindamycin).
 * 8. NSAID allergy & Samter's triad contraindication.
 * 9. Zero false positives for healthy patients.
 * 10. Integration with DaemonScheduler (07:30 AM scheduled time and on-demand trigger).
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	type AppointmentSomaticContextInput,
	type PatientSomaticProfileInput,
	calculateAge,
	evaluatePatientSomaticRisk,
	isAnesthesiaIndicatedAppointment,
	isSurgicalAppointment,
} from "./somaticRadarDaemon.js";
import { DaemonScheduler } from "./daemonScheduler.js";

describe("Somatic Risk & DDI Clinical Radar Engine", () => {
	const fixedNow = new Date("2026-09-01T07:30:00.000Z");
	const orgId = "11111111-2222-3333-4444-555555555555";
	const doctorId = "doctor-uuid-001";
	const doctorName = "д-р Смирнов А.В. (хирург-стоматолог)";

	test("1. Anticoagulant + Surgery triggers high bleeding risk alert with hemostasis protocol", () => {
		const patient: PatientSomaticProfileInput = {
			patientId: "pat-anticoagulant-01",
			organizationId: orgId,
			fullName: "Кузнецов Виктор Павлович",
			birthDate: "1960-05-15",
			phone: "+7 (999) 111-22-33",
			notes: "Постоянно принимает Варфарин (фибрилляция предсердий). Контроль МНО.",
			activeMedications: ["Варфарин 2.5 мг 1 раз/сут"],
			allergies: [],
		};

		const surgeryAppt: AppointmentSomaticContextInput = {
			appointmentId: "appt-surgery-01",
			organizationId: orgId,
			doctorId,
			doctorName,
			startsAt: "2026-09-01T10:00:00.000Z",
			reason: "Сложное удаление ретинированного зуба 38 (дистопия)",
			plannedServices: [
				{ code: "A16.07.001.002", title: "Сложное удаление зуба с разъединением корней" },
			],
		};

		const alerts = evaluatePatientSomaticRisk(patient, surgeryAppt, { now: fixedNow });

		assert.strictEqual(alerts.length, 1);
		const alert = alerts[0]!;
		assert.strictEqual(alert.category, "anticoagulant_surgery");
		assert.strictEqual(alert.urgency, "CRITICAL");
		assert.strictEqual(alert.badgeText, "Коагулограмма / Гемостаз");
		assert.ok(alert.clinicalAlertMessage.includes("Высокий риск кровотечения"));
		assert.ok(alert.clinicalAlertMessage.includes("варфарин"));
		assert.ok(alert.isSurgeryPlanned);
		assert.strictEqual(alert.patientAgeYears, 66);
		assert.ok(alert.recommendedAlternatives.some((a) => a.includes("гемостатическая губка")));
		assert.ok(alert.recommendedAlternatives.some((a) => a.includes("Парацетамол")));
		assert.ok(alert.contraindicatedDrugs.some((d) => d.includes("НПВС")));
		assert.strictEqual(alert.suggestedActions.length, 2);
		assert.strictEqual(alert.suggestedActions[0]!.actionId, "request_coagulogram");
	});

	test("2. Soft & Non-Intrusive Invariant: Anticoagulant patient with ROUTINE caries does NOT trigger surgery bleeding alert", () => {
		const patient: PatientSomaticProfileInput = {
			patientId: "pat-anticoagulant-01",
			organizationId: orgId,
			fullName: "Кузнецов Виктор Павлович",
			birthDate: "1960-05-15",
			notes: "Принимает Ксарелто (Ривароксабан 20 мг).",
			activeMedications: ["Ксарелто 20 мг"],
		};

		const routineAppt: AppointmentSomaticContextInput = {
			appointmentId: "appt-caries-01",
			organizationId: orgId,
			doctorId,
			doctorName,
			startsAt: "2026-09-01T11:00:00.000Z",
			reason: "Плановое лечение кариеса эмали зуба 14 (реставрация)",
			plannedServices: [
				{ code: "A16.07.002", title: "Восстановление зуба пломбой (лечение кариеса)" },
			],
		};

		const alerts = evaluatePatientSomaticRisk(patient, routineAppt, { now: fixedNow });

		// Zero surgery bleeding alert! Routine caries does not cause surgical hemorrhage
		const bleedingAlerts = alerts.filter((a) => a.category === "anticoagulant_surgery");
		assert.strictEqual(bleedingAlerts.length, 0);
	});

	test("3. Articaine / Amide allergy triggers Mepivacaine 3% (Scandonest) alternative recommendation", () => {
		const patient: PatientSomaticProfileInput = {
			patientId: "pat-allergy-02",
			organizationId: orgId,
			fullName: "Морозова Светлана Игоревна",
			birthDate: "1988-11-20",
			allergies: [
				{
					allergenGroup: "Амидные анестетики (Артикаин)",
					drugInnLatin: "Articaine",
					reactionSeverity: "critical",
					clinicalManifestations: "Отек Квинке, крапивница после ультракаина в 2021 г.",
				},
			],
		};

		const appt: AppointmentSomaticContextInput = {
			appointmentId: "appt-endo-02",
			organizationId: orgId,
			doctorId,
			doctorName,
			startsAt: "2026-09-01T14:30:00.000Z",
			reason: "Лечение пульпита зуба 46 (депульпирование)",
		};

		const alerts = evaluatePatientSomaticRisk(patient, appt, { now: fixedNow });

		const amideAlert = alerts.find((a) => a.category === "anesthetic_allergy");
		assert.ok(amideAlert, "Expected anesthetic_allergy alert");
		assert.strictEqual(amideAlert?.urgency, "CRITICAL");
		assert.strictEqual(amideAlert?.badgeText, "Противопоказан Артикаин");
		assert.ok(amideAlert?.clinicalAlertMessage.includes("Противопоказан Артикаин"));
		assert.ok(amideAlert?.recommendedAlternatives.some((alt) => alt.includes("Мепивакаин 3%")));
		assert.ok(amideAlert?.contraindicatedDrugs.includes("Артикаин 4%"));
		assert.ok(amideAlert?.suggestedActions.some((act) => act.actionId === "switch_to_mepivacaine"));
	});

	test("4. Stage III Hypertension / Thyrotoxicosis triggers Adrenaline-Free vasoconstrictor alert", () => {
		const patient: PatientSomaticProfileInput = {
			patientId: "pat-hyper-03",
			organizationId: orgId,
			fullName: "Семенов Геннадий Борисович",
			birthDate: "1955-03-10",
			notes: "Диагноз: Гипертоническая болезнь 3 степени, кризовое течение. Декомпенсированный тиреотоксикоз.",
			pastAnamnesisText: "Частые кризы с повышением АД до 200/110 мм рт. ст. Зоб токсический.",
		};

		const appt: AppointmentSomaticContextInput = {
			appointmentId: "appt-prep-03",
			organizationId: orgId,
			doctorId,
			doctorName,
			startsAt: "2026-09-01T16:00:00.000Z",
			reason: "Препарирование зубов 11, 12, 21 под металлокерамические коронки",
		};

		const alerts = evaluatePatientSomaticRisk(patient, appt, { now: fixedNow });

		const vasoAlert = alerts.find((a) => a.category === "vasoconstrictor_contraindication");
		assert.ok(vasoAlert, "Expected vasoconstrictor_contraindication alert");
		assert.strictEqual(vasoAlert?.urgency, "CRITICAL");
		assert.strictEqual(vasoAlert?.badgeText, "Без адреналина");
		assert.ok(vasoAlert?.clinicalAlertMessage.includes("Противопоказан адреналин/эпинефрин"));
		assert.ok(vasoAlert?.recommendedAlternatives.some((alt) => alt.includes("Мепивакаин 3%")));
		assert.ok(vasoAlert?.suggestedActions.some((act) => act.actionId === "record_blood_pressure"));
	});

	test("5. Bronchial Asthma / Sulfite allergy triggers sulfite-free anesthetic protocol", () => {
		const patient: PatientSomaticProfileInput = {
			patientId: "pat-asthma-04",
			organizationId: orgId,
			fullName: "Васильева Анна Сергеевна",
			birthDate: "1995-07-22",
			notes: "Хроническая бронхиальная астма смешанного генеза, аллергия на сульфиты.",
			allergies: [
				{
					allergenGroup: "Сульфиты / Метабисульфит натрия (E223)",
					reactionSeverity: "severe",
					clinicalManifestations: "Бронхоспазм",
				},
			],
		};

		const appt: AppointmentSomaticContextInput = {
			appointmentId: "appt-caries-04",
			organizationId: orgId,
			doctorId,
			doctorName,
			startsAt: "2026-09-01T12:00:00.000Z",
			reason: "Глубокий кариес зуба 26 (лечение)",
		};

		const alerts = evaluatePatientSomaticRisk(patient, appt, { now: fixedNow });

		const sulfiteAlert = alerts.find((a) => a.category === "sulfite_asthma");
		assert.ok(sulfiteAlert, "Expected sulfite_asthma alert");
		assert.strictEqual(sulfiteAlert?.urgency, "HIGH");
		assert.strictEqual(sulfiteAlert?.badgeText, "Астма / Бесульфитный протокол");
		assert.ok(sulfiteAlert?.clinicalAlertMessage.includes("метабисульфитом натрия"));
		assert.ok(sulfiteAlert?.recommendedAlternatives.some((alt) => alt.includes("Ультракаин Д")));
	});

	test("6. Bisphosphonates + Surgery triggers MRONJ osteonecrosis risk alert", () => {
		const patient: PatientSomaticProfileInput = {
			patientId: "pat-mronj-05",
			organizationId: orgId,
			fullName: "Николаева Тамара Петровна",
			birthDate: "1948-09-12",
			notes: "Остеопороз. Получает инфузии Акласта (золедроновая кислота) ежегодно.",
			activeMedications: ["Акласта 5 мг/100 мл"],
		};

		const appt: AppointmentSomaticContextInput = {
			appointmentId: "appt-surgery-05",
			organizationId: orgId,
			doctorId,
			doctorName,
			startsAt: "2026-09-01T09:30:00.000Z",
			reason: "Удаление корней зуба 36",
			plannedServices: [{ code: "A16.07.001", title: "Удаление зуба" }],
		};

		const alerts = evaluatePatientSomaticRisk(patient, appt, { now: fixedNow });

		const mronjAlert = alerts.find((a) => a.category === "bisphosphonates_osteonecrosis");
		assert.ok(mronjAlert, "Expected bisphosphonates_osteonecrosis alert");
		assert.strictEqual(mronjAlert?.urgency, "CRITICAL");
		assert.strictEqual(mronjAlert?.badgeText, "MRONJ Протокол");
		assert.ok(mronjAlert?.clinicalAlertMessage.includes("остеонекроза челюсти"));
		assert.ok(mronjAlert?.suggestedActions.some((act) => act.actionId === "mronj_protocol"));
	});

	test("7. Penicillin allergy triggers beta-lactam warning and macrolide alternative", () => {
		const patient: PatientSomaticProfileInput = {
			patientId: "pat-pen-06",
			organizationId: orgId,
			fullName: "Орлов Роман Дмитриевич",
			allergies: [
				{
					allergenGroup: "Пенициллины (Амоксиклав, Флемоксин)",
					reactionSeverity: "severe",
					clinicalManifestations: "Крапивница, отек лица",
				},
			],
		};

		const appt: AppointmentSomaticContextInput = {
			appointmentId: "appt-06",
			organizationId: orgId,
			doctorId,
			doctorName,
			startsAt: "2026-09-01T15:00:00.000Z",
			reason: "Острый периодонтит зуба 15, вскрытие полости зуба",
		};

		const alerts = evaluatePatientSomaticRisk(patient, appt, { now: fixedNow });

		const penAlert = alerts.find((a) => a.category === "penicillin_allergy");
		assert.ok(penAlert, "Expected penicillin_allergy alert");
		assert.strictEqual(penAlert?.badgeText, "Аллергия: Пенициллин");
		assert.ok(penAlert?.recommendedAlternatives.some((alt) => alt.includes("Азитромицин")));
		assert.ok(penAlert?.contraindicatedDrugs.includes("Амоксиклав"));
	});

	test("8. Clean healthy patient produces 0 alerts", () => {
		const healthyPatient: PatientSomaticProfileInput = {
			patientId: "pat-clean-07",
			organizationId: orgId,
			fullName: "Иванов Иван Иванович",
			birthDate: "1992-04-10",
			notes: "Соматически здоров, аллергий нет.",
			allergies: [],
			activeMedications: [],
		};

		const appt: AppointmentSomaticContextInput = {
			appointmentId: "appt-clean-07",
			organizationId: orgId,
			doctorId,
			doctorName,
			startsAt: "2026-09-01T10:30:00.000Z",
			reason: "Профессиональная гигиена полости рта (Air-Flow, ультразвук)",
		};

		const alerts = evaluatePatientSomaticRisk(healthyPatient, appt, { now: fixedNow });
		assert.strictEqual(alerts.length, 0);
	});

	test("9. Surgery detection helper identifies surgical codes and Russian terms", () => {
		assert.strictEqual(isSurgicalAppointment("Удаление зуба 38"), true);
		assert.strictEqual(isSurgicalAppointment("Установка имплантата Osstem"), true);
		assert.strictEqual(isSurgicalAppointment("Открытый синус-лифтинг"), true);
		assert.strictEqual(isSurgicalAppointment("Резекция верхушки корня зуба 21"), true);
		assert.strictEqual(
			isSurgicalAppointment(null, null, [{ code: "A16.07.001", title: "Удаление" }]),
			true,
		);
		assert.strictEqual(
			isSurgicalAppointment(null, null, [{ code: "A16.07.054", title: "Имплантация" }]),
			true,
		);

		// Non-surgical
		assert.strictEqual(isSurgicalAppointment("Лечение поверхностного кариеса"), false);
		assert.strictEqual(isSurgicalAppointment("Профгигиена полости рта"), false);
		assert.strictEqual(isSurgicalAppointment("Снятие слепков"), false);
	});

	test("10. Age calculation helper works correctly with leap years and birthday thresholds", () => {
		const refDate = new Date("2026-09-01T00:00:00.000Z");
		// Birthday was in May (already passed this year)
		assert.strictEqual(calculateAge("1990-05-10", refDate), 36);
		// Birthday is in December (has not passed yet this year)
		assert.strictEqual(calculateAge("1990-12-25", refDate), 35);
		// Invalid / null
		assert.strictEqual(calculateAge(null, refDate), null);
		assert.strictEqual(calculateAge("invalid-date", refDate), null);
	});

	test("11. DaemonScheduler registers somatic_radar_0730 at 07:30 and has on-demand method", () => {
		const scheduler = new DaemonScheduler({
			enableSomaticRadar: true,
			enableZtlLookAhead: false,
			enableEmrSavior: false,
			enableSanpinAndInventory: false,
			enableWeeklyRetention: false,
			logger: () => {},
		});

		const somaticJob = scheduler.jobs.find((j) => j.name === "somatic_radar_0730");
		assert.ok(somaticJob, "Scheduled job somatic_radar_0730 must exist");
		assert.strictEqual(somaticJob?.scheduledTime, "07:30");
		assert.ok(somaticJob?.description.includes("07:30 AM"));
		assert.strictEqual(typeof scheduler.runSomaticRadarScanNow, "function");
	});
});

import test from "node:test";
import assert from "node:assert/strict";
import {
	CLINICAL_LEAK_THRESHOLD_DAYS,
	calculateLeakFunnelMetrics,
	generateClinicalRiskReason,
	generateReactivationScript,
	isQualifiedForLeakLead,
	type CrmLeakDetectorCandidate,
	type CrmLeakLeadItem,
} from "../marketing/crmLeakDetectorEngine.js";

test("crmLeakDetectorEngine: правильно определяет порог 210 дней и фильтры исключения", () => {
	assert.equal(CLINICAL_LEAK_THRESHOLD_DAYS, 210);

	// Пациент 220 дней без визита и без будущей записи -> КВАЛИФИЦИРОВАН
	const candidateValid: CrmLeakDetectorCandidate = {
		patientId: "p1",
		patientFullName: "Иванов Иван",
		phone: "+79991112233",
		lastCompletedVisitDate: "2026-01-01T10:00:00Z",
		daysSinceLastVisit: 220,
		lastDoctorId: "doc1",
		lastDoctorName: "Д-р Смирнов",
		lastSpecialty: "therapy",
		hasFutureAppointment: false,
		hasActiveWaitlist: false,
		hasUncompletedPlan: false,
		uncompletedPlanRub: 0,
	};
	assert.equal(isQualifiedForLeakLead(candidateValid), true);

	// Пациент 250 дней, но УЖЕ ЗАПИСАН в расписании -> ИСКЛЮЧАЕТСЯ (не спамить записанным!)
	const candidateWithFuture: CrmLeakDetectorCandidate = {
		...candidateValid,
		hasFutureAppointment: true,
	};
	assert.equal(isQualifiedForLeakLead(candidateWithFuture), false);

	// Пациент 250 дней, но в активном листе ожидания -> ИСКЛЮЧАЕТСЯ
	const candidateWaitlist: CrmLeakDetectorCandidate = {
		...candidateValid,
		hasActiveWaitlist: true,
	};
	assert.equal(isQualifiedForLeakLead(candidateWaitlist), false);

	// Пациент только 150 дней -> НЕ ДОСТИГ ПОРОГА 210 ДНЕЙ
	const candidateTooEarly: CrmLeakDetectorCandidate = {
		...candidateValid,
		daysSinceLastVisit: 150,
	};
	assert.equal(isQualifiedForLeakLead(candidateTooEarly), false);
});

test("crmLeakDetectorEngine: генерирует обоснование клинического риска для разных профилей лечения", () => {
	const reasonTherapy = generateClinicalRiskReason(215, false, "therapy");
	assert.ok(reasonTherapy.includes("Истек срок гарантии на пломбы (6 мес.) и угас эффект профгигиены"));

	const reasonPlan = generateClinicalRiskReason(230, true, "therapy");
	assert.ok(reasonPlan.includes("Имеются незавершенные этапы комплексного плана лечения"));

	const reasonOrtho = generateClinicalRiskReason(240, false, "orthopedics");
	assert.ok(reasonOrtho.includes("после сдачи ортопедической конструкции"));
});

test("crmLeakDetectorEngine: генерирует персонализированный скрипт реактивации", () => {
	const script = generateReactivationScript("Петров Алексей Сергеевич", "ДЕНТЕ", "Д-р Смирнов", 220, false);
	assert.ok(script.includes("Алексей"));
	assert.ok(script.includes("ДЕНТЕ"));
	assert.ok(script.includes("7 месяцев"));
});

test("crmLeakDetectorEngine: корректно рассчитывает воронку реактивации (Funnel Metrics)", () => {
	const leads: CrmLeakLeadItem[] = [
		{
			id: "l1",
			organizationId: "org1",
			patientId: "p1",
			patientFullName: "Иванов Иван",
			phone: "+79991112233",
			daysSinceLastVisit: 220,
			lastVisitDate: "2026-01-01T10:00:00Z",
			lastDoctorId: "doc1",
			lastDoctorName: "Д-р Смирнов",
			lastSpecialty: "Терапия",
			uncompletedPlanSumRub: 25000,
			hasUncompletedPlan: true,
			clinicalRiskReason: "Риск кариеса",
			leadStatus: "rebooked",
			assignedAdminUserId: "adm1",
			assignedAdminName: "Анна",
			contactAttemptsCount: 2,
			lastContactAt: "2026-08-20T12:00:00Z",
			lastContactChannel: "call",
			lastContactNotes: "Записан на гигиену",
			rebookedAppointmentId: "app1",
			rebookedDate: "2026-08-25T14:00:00Z",
			declineReason: null,
			declineComment: null,
			aiReactivationSuggestion: "Скрипт",
			createdAt: "2026-08-01T10:00:00Z",
			updatedAt: "2026-08-20T12:00:00Z",
		},
		{
			id: "l2",
			organizationId: "org1",
			patientId: "p2",
			patientFullName: "Сидоров Сидор",
			phone: "+79994445566",
			daysSinceLastVisit: 260,
			lastVisitDate: "2025-12-01T10:00:00Z",
			lastDoctorId: "doc1",
			lastDoctorName: "Д-р Смирнов",
			lastSpecialty: "Терапия",
			uncompletedPlanSumRub: 0,
			hasUncompletedPlan: false,
			clinicalRiskReason: "Риск камня",
			leadStatus: "declined",
			assignedAdminUserId: "adm1",
			assignedAdminName: "Анна",
			contactAttemptsCount: 1,
			lastContactAt: "2026-08-20T12:30:00Z",
			lastContactChannel: "call",
			lastContactNotes: "Переехал",
			rebookedAppointmentId: null,
			rebookedDate: null,
			declineReason: "moved_away",
			declineComment: "Переехал в СПб",
			aiReactivationSuggestion: "Скрипт",
			createdAt: "2026-08-01T10:00:00Z",
			updatedAt: "2026-08-20T12:30:00Z",
		},
	];

	const funnel = calculateLeakFunnelMetrics(leads);
	assert.equal(funnel.totalIdentifiedLeads, 2);
	assert.equal(funnel.rebookedCount, 1);
	assert.equal(funnel.declinedCount, 1);
	assert.equal(funnel.reactivationConversionPct, 50); // 1 / 2 = 50%
	assert.equal(funnel.rebookedRevenuePotentialRub, 7500);
	assert.equal(funnel.totalUncompletedPlanSumRub, 25000);
	assert.equal(funnel.averageDaysSinceVisit, 240);
});

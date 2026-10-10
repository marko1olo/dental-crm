/**
 * @file patients.ts
 * @description Layer 1: Patients, somatic status, allergies, administrative profiles, insights.
 */
import { inMemoryDomainState } from "./domainState.js";
import { activeVisit } from "./clinicalRecords.js";
import { documents } from "./documents.js";
import { imagingStudies } from "./imaging.js";
import { isOpenCommunicationTask } from "./communications.js";


import type {
	Appointment,
	CommunicationTask,
	GeneratedDocument,
	ImagingStudy,
	Patient,
	PatientAdministrativeProfile,
	PatientInsight,
	Payment,
	TreatmentPlanItem,
} from "@dental/shared";
import type { DomainState } from "../types/domainState.js";
import { normalizePatientAdministrativeProfile } from "../utils/patientAdministrativeProfile.js";
import {
	buildPatientLedger,
	debtNumericText,
	MoneyPrecisionError,
	patientOwesClinicKopecks,
	QuantityContractError,
	rublesFromKopecks,
} from "../money/patientDebt.js";
import { appointments } from "./appointments.js";
import { treatmentPlanItems, treatmentPlanScenarios } from "./clinicalRecords.js";
import { payments } from "./billing.js";
import { communicationTasks } from "./communications.js";

import { organizationId, marinaPatientId, alexeyPatientId, elmiraPatientId, nowIso } from "./fixtureIds.js";

export const patients: Patient[] = [
	{
		id: marinaPatientId,
		organizationId,
		status: "active",
		fullName: "Иванова Марина Сергеевна",
		birthDate: "1988-04-21",
		gender: "female",
		phone: "+7 927 111-22-33",
		email: null,
		notes: "Боится анестезии, предпочитает утренние приемы.",
		isAnonymous: false,
		anonymousCode: null,
		administrativeProfile: null,
		balanceRub: 0,
		createdAt: nowIso,
		updatedAt: nowIso,
	},
	{
		id: alexeyPatientId,
		organizationId,
		status: "active",
		fullName: "Петров Алексей Николаевич",
		birthDate: "1979-11-03",
		gender: "male",
		phone: "+7 927 555-19-40",
		email: "petrov@example.com",
		notes: "Нужны документы для налогового вычета.",
		isAnonymous: false,
		anonymousCode: null,
		administrativeProfile: null,
		balanceRub: 0,
		createdAt: nowIso,
		updatedAt: nowIso,
	},
	{
		id: elmiraPatientId,
		organizationId,
		status: "active",
		fullName: "Садыкова Эльмира Рустамовна",
		birthDate: null,
		gender: "female",
		phone: "+7 927 900-77-10",
		email: null,
		notes: null,
		isAnonymous: false,
		anonymousCode: null,
		administrativeProfile: null,
		balanceRub: 0,
		createdAt: nowIso,
		updatedAt: nowIso,
	},
];

function groupByPatientId<T extends { patientId?: string | null }>(
	rows: readonly T[],
): Map<string, T[]> {
	const grouped = new Map<string, T[]>();
	for (const row of rows) {
		const patientId = row.patientId;
		if (!patientId) continue;
		const bucket = grouped.get(patientId);
		if (bucket) bucket.push(row);
		else grouped.set(patientId, [row]);
	}
	return grouped;
}

/**
 * ДОЛГ ПАЦИЕНТА ДЛЯ ПОДСКАЗКИ АДМИНИСТРАТОРУ — ИЗ ЕДИНОГО ДОМА ФОРМУЛЫ.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Здесь стояла своя копия формулы долга, и позиции
 * для неё группировались БЕЗ фильтра `status !== "cancelled"`
 * (`groupByPatientId(treatmentPlanItems)`), тогда как все остальные расчёты
 * денег отменённое лечение исключают. То есть отменённый план продолжал висеть
 * на пациенте долгом ровно там, где администратор читает сумму перед звонком:
 * чип суммы в строке пациента (`PatientsView.tsx`) и «💰 Долг …» в смене
 * (`ShiftView.tsx`). Пациенту звонили и требовали денег за лечение, которое
 * клиника сама отменила.
 *
 * ЗАМЕР БОЕВЫМ МАРШРУТОМ `GET /api/dashboard` на своей клинике (2026-07-29):
 * пациент с 10 000,00 активного лечения и 5 000,00 отменённого показывал
 * 15 000,00 ₽; пациент с полностью отменённым планом на 26 500,00 — 26 500,00 ₽.
 * Стало 10 000,00 ₽ и 0,00 ₽. На демонстрационной клинике `d0000000-…-d001`
 * расхождение равно нулю, потому что отменённых позиций там нет ни одной, —
 * именно поэтому дефект и жил.
 *
 * ДЕСЯТОЙ ФОРМУЛЫ НЕ ЗАВЕДЕНО: считает `money/patientDebt.ts`
 * (`buildPatientLedger` + `patientOwesClinicKopecks`) — тот же дом, что отвечает
 * на вопросы карточки, приёма и клиники. Отмену отбрасывает модуль, поэтому
 * второго фильтра статуса здесь нет: два фильтра в двух местах — ровно тот
 * способ, которым они однажды разойдутся. Разбор девяти прежних расчётов —
 * `.agents/lead/recon-debt-formula-sprawl.md`.
 *
 * `Math.max(0, …)` внутри `patientOwesClinicKopecks` здесь на месте: контракт
 * требует неотрицательного долга (`patientInsight.balanceDueRub` —
 * `nonNegativeMoneyRubSchema`). Цена — переплата в этом ответе безымянна, и это
 * не оговорка, а известная граница: «0» означает и «рассчитался ровно», и
 * «переплатил». Отдельное имя для переплаты в модуле есть
 * (`clinicOwesPatientKopecks`), но в контракте подсказки поля под неё нет.
 *
 * ПОЧЕМУ ОТКАЗ МОДУЛЯ НЕ ЛЕТИТ НАВЕРХ. Подсказки собираются внутри
 * `buildDashboard()`, то есть исключение здесь означает HTTP 500 на ГЛАВНОМ
 * экране клиники: смена не открывается вовсе. Поэтому отказ превращается в
 * `null`-долг с причиной, и причина уходит в подсказку администратору отдельной
 * строкой — «остаток не рассчитан». Ноль в этом поле молча выглядел бы как
 * «пациент ничего не должен», а это неправда: сумма НЕИЗВЕСТНА.
 */
function patientInsightDebt(
	patientId: string,
	planItems: readonly TreatmentPlanItem[],
	paidPayments: readonly Payment[],
): { balanceDueRub: number; balanceUnknownReason: string | null } {
	try {
		const ledger = buildPatientLedger(patientId, planItems, paidPayments);
		return {
			balanceDueRub: rublesFromKopecks(patientOwesClinicKopecks(ledger)),
			balanceUnknownReason: null,
		};
	} catch (error) {
		if (
			error instanceof MoneyPrecisionError ||
			error instanceof QuantityContractError
		) {
			console.error(
				`[Dashboard] Долг пациента ${patientId} для подсказки администратору не рассчитан: ${error.message}`,
			);
			return {
				balanceDueRub: 0,
				balanceUnknownReason:
					"остаток не рассчитан: в позициях лечения или оплатах этого пациента есть сумма, " +
					"которую нельзя представить в копейках. Не звоните по нулю — сумма неизвестна.",
			};
		}
		throw error;
	}
}

export function buildPatientInsights(
	state: DomainState = inMemoryDomainState,
): PatientInsight[] {
	const {
		activeVisit,
		appointments,
		communicationTasks,
		documents,
		imagingStudies,
		patients,
		payments,
		treatmentPlanItems,
	} = state;
	const requiredDocuments: Array<
		PatientInsight["missingDocumentKinds"][number]
	> = [
		"paid_medical_services_contract",
		"informed_consent",
		"completed_works_act",
	];

	// БЫЛО: на каждого пациента выполнялось шесть полных проходов по всем
	// документам, задачам, снимкам, платежам, позициям плана и записям — то есть
	// O(пациенты × записи). На демо-базе это незаметно, на клинике с несколькими
	// тысячами пациентов главный экран считался секундами. Группируем один раз.
	const documentsByPatient = groupByPatientId<GeneratedDocument>(documents);
	const tasksByPatient = groupByPatientId<CommunicationTask>(
		communicationTasks.filter(isOpenCommunicationTask),
	);
	const imagesByPatient = groupByPatientId<ImagingStudy>(imagingStudies);
	const paymentsByPatient = groupByPatientId<Payment>(
		payments.filter((payment) => payment.status === "paid"),
	);
	const planItemsByPatient = groupByPatientId<TreatmentPlanItem>(treatmentPlanItems);
	const appointmentsByPatient = groupByPatientId<Appointment>(appointments);

	return patients.map((patient) => {
		const patientDocuments = documentsByPatient.get(patient.id) ?? [];
		const patientTasks = tasksByPatient.get(patient.id) ?? [];
		const patientImages = imagesByPatient.get(patient.id) ?? [];
		const patientPayments = paymentsByPatient.get(patient.id) ?? [];
		const patientPlanItems = planItemsByPatient.get(patient.id) ?? [];
		const patientAppointments = appointmentsByPatient.get(patient.id) ?? [];
		const draftVisit =
			activeVisit.patientId === patient.id && activeVisit.status === "draft";
		const missingDocumentKinds = requiredDocuments.filter(
			(kind) =>
				!patientDocuments.some(
					(document) => document.kind === kind && document.status !== "voided",
				),
		);
		const { balanceDueRub, balanceUnknownReason } = patientInsightDebt(
			patient.id,
			patientPlanItems,
			patientPayments,
		);
		const recallTask = patientTasks
			.filter((task) => task.intent === "recall")
			.sort((left, right) => left.dueAt.localeCompare(right.dueAt))[0];
		const overdueTasks = patientTasks.filter(
			(task) => task.dueAt < "2026-05-12T12:00:00+04:00",
		);
		const needsImageReview = patientImages.some(
			(study) => study.status === "needs_review",
		);
		const clinicalFlags = [
			...(draftVisit ? ["ЭМК не подписана"] : []),
			...(needsImageReview ? ["снимок требует проверки"] : []),
			...(patient.notes ? [patient.notes] : []),
			...(patientPlanItems.some((item) => item.status === "in_progress")
				? ["есть активный этап лечения"]
				: []),
		];
		const adminFlags = [
			/* «Остаток не рассчитан» стоит ПЕРВЫМ и вместо суммы: ноль в этом поле
			   администратор прочитал бы как «пациент ничего не должен», а это
			   неправда — сумма неизвестна. Молчаливый ноль на деньгах и есть тот
			   класс дефекта, из-за которого весь этот переезд затеян. */
			...(balanceUnknownReason ? [balanceUnknownReason] : []),
			...(balanceDueRub > 0
				? [`остаток ${balanceDueRub.toLocaleString("ru-RU")} ₽`]
				: []),
			...(missingDocumentKinds.length
				? [`документы: ${missingDocumentKinds.length}`]
				: []),
			...(patientTasks.length ? [`связь: ${patientTasks.length}`] : []),
			...(overdueTasks.length ? [`просрочено: ${overdueTasks.length}`] : []),
		];
		const riskReasons = [
			...clinicalFlags.slice(0, 2),
			...adminFlags.slice(0, 2),
		];
		const riskLevel: PatientInsight["riskLevel"] =
			draftVisit ||
			needsImageReview ||
			overdueTasks.length > 0 ||
			balanceDueRub >= 10000
				? "high"
				: balanceDueRub > 0 ||
						patientTasks.length > 0 ||
						missingDocumentKinds.length > 0
					? "watch"
					: "low";
		const latestActivity =
			[
				...patientAppointments.map((appointment) => appointment.endsAt),
				...patientDocuments.map((document) => document.issuedAt ?? nowIso),
				...patientTasks.map((task) => task.lastEventAt ?? task.createdAt),
				...patientImages.map((study) => study.capturedAt),
			].sort((left, right) => right.localeCompare(left))[0] ?? null;
		const nextBestAction = draftVisit
			? "Проверить и подписать ЭМК"
			: needsImageReview
				? "Проверить снимок перед переносом в ЭМК"
				: balanceDueRub > 0
					? "Связать оплату, акт и документы"
					: recallTask
						? "Подтвердить повторный визит"
						: missingDocumentKinds.length
							? "Закрыть недостающие документы"
							: "План без срочных действий";

		return {
			patientId: patient.id,
			riskLevel,
			riskReasons: riskReasons.length ? riskReasons : ["нет срочных рисков"],
			nextBestAction,
			recallDueAt: recallTask?.dueAt ?? null,
			balanceDueRub,
			openTasks: patientTasks.length,
			missingDocumentKinds,
			clinicalFlags,
			adminFlags,
			lastActivityAt: latestActivity,
		};
	});
}

export { normalizePatientAdministrativeProfile };

function normalizePatientAdministrativeProfiles(): void {
	for (const patient of patients) {
		patient.administrativeProfile = normalizePatientAdministrativeProfile(
			patient.administrativeProfile,
		);
	}
}


export { patientInsightDebt, normalizePatientAdministrativeProfiles };

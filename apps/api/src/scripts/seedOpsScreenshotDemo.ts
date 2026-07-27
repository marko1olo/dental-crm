/**
 * Временные данные для съёмки рабочих панелей.
 *
 * ЗАЧЕМ. Проверить оформление панелей чтением исходников нельзя: вёрстка,
 * контраст и поведение на узком экране видны только на живом экране с
 * содержимым. В рабочей базе одна организация с тремя пациентами и нулём
 * приёмов — на ней панели покажут пустые состояния, и оценить таблицы не выйдет.
 *
 * ПОЧЕМУ ОТДЕЛЬНАЯ ОРГАНИЗАЦИЯ, А НЕ ДОЗАПИСЬ В СУЩЕСТВУЮЩУЮ. Чужие данные
 * трогать нельзя, а удалить ровно то, что добавил, проще, когда всё лежит под
 * одним идентификатором. `--clean` сносит организацию целиком.
 *
 * ЗАПУСК
 *   npx tsx src/scripts/seedOpsScreenshotDemo.ts          — создать и выдать токены
 *   npx tsx src/scripts/seedOpsScreenshotDemo.ts --clean   — удалить без остатка
 */

import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { appointmentActionCodes, communicationCampaigns } from "../db/communicationsSchema.js";
import {
	appointments,
	chairs,
	clinics,
	communicationOutbox,
	communicationTasks,
	communicationTemplates,
	organizations,
	patients,
	payments,
	treatmentItems,
	users,
	visits
} from "../db/schema.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";

const ORG_ID = "d0000000-0000-4000-8000-00000000d001";
const CLINIC_ID = "d0000000-0000-4000-8000-00000000d002";
const CHAIR_A = "d0000000-0000-4000-8000-00000000d003";
const CHAIR_B = "d0000000-0000-4000-8000-00000000d004";
const DOCTOR_A = "d0000000-0000-4000-8000-00000000d005";
const DOCTOR_B = "d0000000-0000-4000-8000-00000000d006";
const ADMIN_USER = "d0000000-0000-4000-8000-00000000d007";

/** Фамилии вымышленные: в снимках не должно быть настоящих пациентов. */
const PATIENT_NAMES = [
	"Орлова Марина Петровна",
	"Ковалёв Сергей Иванович",
	"Белкина Анна Дмитриевна",
	"Тихонов Артём Олегович",
	"Савельева Ольга Игоревна",
	"Громов Илья Андреевич",
	"Юдина Екатерина Львовна",
	"Панфилов Роман Викторович"
];

function patientId(index: number): string {
	return `d0000000-0000-4000-8000-0000000${String(100 + index).padStart(5, "0")}`;
}

function appointmentId(index: number): string {
	return `d0000000-0000-4000-8000-0000000${String(200 + index).padStart(5, "0")}`;
}

async function clean(): Promise<void> {
	// Порядок обратный зависимостям: сначала то, что ссылается.
	await db.delete(appointmentActionCodes).where(eq(appointmentActionCodes.organizationId, ORG_ID));
	await db.delete(communicationOutbox).where(eq(communicationOutbox.organizationId, ORG_ID));
	await db.delete(communicationCampaigns).where(eq(communicationCampaigns.organizationId, ORG_ID));
	await db.delete(communicationTasks).where(eq(communicationTasks.organizationId, ORG_ID));
	await db.delete(communicationTemplates).where(eq(communicationTemplates.organizationId, ORG_ID));
	await db.delete(treatmentItems).where(eq(treatmentItems.organizationId, ORG_ID));
	await db.delete(payments).where(eq(payments.organizationId, ORG_ID));
	await db.delete(visits).where(eq(visits.organizationId, ORG_ID));
	await db.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
	await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
	await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
	await db.delete(users).where(eq(users.organizationId, ORG_ID));
	await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
	await db.delete(organizations).where(eq(organizations.id, ORG_ID));
	console.log("Демонстрационная организация удалена.");
}

async function seed(): Promise<void> {
	await clean();

	const now = new Date();
	const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	tomorrow.setHours(9, 0, 0, 0);

	await db.insert(organizations).values({ id: ORG_ID, name: "Демо-клиника для снимков" });
	await db
		.insert(clinics)
		.values({ id: CLINIC_ID, organizationId: ORG_ID, name: "Клиника на Ленина", phone: "+7 495 120-30-40", timezone: "Europe/Moscow" });
	await db.insert(chairs).values([
		{ id: CHAIR_A, organizationId: ORG_ID, clinicId: CLINIC_ID, name: "Кресло 1" },
		{ id: CHAIR_B, organizationId: ORG_ID, clinicId: CLINIC_ID, name: "Кресло 2" }
	]);
	await db.insert(users).values([
		{ id: DOCTOR_A, organizationId: ORG_ID, fullName: "Смирнова Елена Владимировна", role: "doctor" },
		{ id: DOCTOR_B, organizationId: ORG_ID, fullName: "Гаврилов Никита Сергеевич", role: "doctor" },
		{ id: ADMIN_USER, organizationId: ORG_ID, fullName: "Администратор клиники", role: "administrator" }
	]);

	await db.insert(patients).values(
		PATIENT_NAMES.map((fullName, index) => ({
			id: patientId(index),
			organizationId: ORG_ID,
			fullName,
			// У одного пациента телефона нет намеренно: панель обзвона обязана
			// показать это отдельно.
			phone: index === 5 ? null : `+7 916 ${String(200 + index).padStart(3, "0")}-10-${String(20 + index).padStart(2, "0")}`,
			email: index % 3 === 0 ? `patient${index}@example.ru` : null,
			birthDate: `19${70 + index}-0${(index % 9) + 1}-1${index % 9}`
		}))
	);

	// Завтрашние приёмы под список обзвона: подтверждённые, ожидающие и отменённый.
	const statuses = ["confirmed", "planned", "planned", "planned", "confirmed", "planned", "cancelled", "planned"] as const;
	await db.insert(appointments).values(
		PATIENT_NAMES.map((_unused, index) => ({
			id: appointmentId(index),
			organizationId: ORG_ID,
			patientId: patientId(index),
			doctorUserId: index % 2 === 0 ? DOCTOR_A : DOCTOR_B,
			chairId: index % 2 === 0 ? CHAIR_A : CHAIR_B,
			status: statuses[index] ?? "planned",
			startsAt: new Date(tomorrow.getTime() + index * 45 * 60_000),
			endsAt: new Date(tomorrow.getTime() + index * 45 * 60_000 + 40 * 60_000)
		}))
	);

	// Прошедшие приёмы этого месяца — под отчёты.
	const pastBase = new Date(now.getFullYear(), now.getMonth(), 2, 10, 0, 0);
	const pastAppointments = Array.from({ length: 14 }, (_unused, index) => ({
		id: `d0000000-0000-4000-8000-0000000${String(300 + index).padStart(5, "0")}`,
		organizationId: ORG_ID,
		patientId: patientId(index % PATIENT_NAMES.length),
		doctorUserId: index % 3 === 0 ? DOCTOR_B : DOCTOR_A,
		chairId: index % 2 === 0 ? CHAIR_A : CHAIR_B,
		status: (index % 7 === 0 ? "no_show" : index % 5 === 0 ? "cancelled" : "completed") as
			| "no_show"
			| "cancelled"
			| "completed",
		startsAt: new Date(pastBase.getTime() + index * 26 * 60 * 60_000),
		endsAt: new Date(pastBase.getTime() + index * 26 * 60 * 60_000 + 60 * 60_000)
	}));
	await db.insert(appointments).values(pastAppointments);

	// Визиты, позиции лечения и платежи — чтобы в отчётах были деньги и долг.
	const completed = pastAppointments.filter((appointment) => appointment.status === "completed");
	for (const [index, appointment] of completed.entries()) {
		const visitId = `d0000000-0000-4000-8000-0000000${String(400 + index).padStart(5, "0")}`;
		await db.insert(visits).values({
			id: visitId,
			organizationId: ORG_ID,
			patientId: appointment.patientId,
			appointmentId: appointment.id,
			status: "signed",
			createdAt: appointment.startsAt
		});
		await db.insert(treatmentItems).values({
			organizationId: ORG_ID,
			patientId: appointment.patientId,
			visitId,
			title: ["Лечение кариеса", "Профессиональная гигиена", "Лечение пульпита", "Установка коронки"][index % 4] ?? "Приём",
			quantity: "1",
			priceRub: [7200, 5400, 14800, 26500][index % 4] ?? 7000,
			unitPriceRub: [7200, 5400, 14800, 26500][index % 4] ?? 7000,
			discountRub: index % 5 === 0 ? 800 : 0,
			status: "completed"
		});
		// Часть приёмов оплачена не полностью — иначе дебиторка будет пустой.
		if (index % 4 !== 3) {
			await db.insert(payments).values({
				organizationId: ORG_ID,
				patientId: appointment.patientId,
				visitId,
				amountRub: [7200, 5400, 14800, 26500][index % 4] ?? 7000,
				status: "paid",
				paidAt: appointment.startsAt
			});
		}
	}

	// Шаблоны и очередь сообщений — под пульт отправки.
	const [reminderTemplate] = await db
		.insert(communicationTemplates)
		.values([
			{
				organizationId: ORG_ID,
				title: "Напоминание о приёме",
				channel: "sms",
				intent: "appointment_confirmation",
				audienceRole: "administrator",
				body: "{patient}, напоминаем: приём {date} в {time}, {clinic}. Подтвердить: {confirmLink}",
				variablesJson: JSON.stringify(["patient", "date", "time", "clinic", "confirmLink"]),
				isActive: true
			},
			{
				organizationId: ORG_ID,
				title: "Приглашение на профилактический осмотр",
				channel: "sms",
				intent: "recall",
				audienceRole: "administrator",
				body: "{patient}, приглашаем на профилактический осмотр. {clinic}",
				variablesJson: JSON.stringify(["patient", "clinic"]),
				isActive: true
			},
			{
				organizationId: ORG_ID,
				title: "Справка для налогового вычета готова",
				channel: "email",
				intent: "document_ready",
				audienceRole: "administrator",
				body: "{patient}, справка готова. Заберите её в клинике или скачайте в портале: {link}",
				variablesJson: JSON.stringify(["patient", "link"]),
				isActive: false
			}
		])
		.returning({ id: communicationTemplates.id });

	const outboxStates = [
		{ status: "delivered" as const, error: null, detail: "SMS.RU 103: Доставлено" },
		{ status: "sent" as const, error: null, detail: null },
		{ status: "failed" as const, error: "Не доставлено: истёк срок жизни сообщения", detail: "SMS.RU 104" },
		{ status: "queued" as const, error: null, detail: null },
		{ status: "suppressed" as const, error: "SMS-шлюз не настроен: нет ключей доступа в окружении сервера.", detail: null },
		{ status: "delivered" as const, error: null, detail: "SMS.RU 110: Прочитано" }
	];
	await db.insert(communicationOutbox).values(
		outboxStates.map((state, index) => ({
			organizationId: ORG_ID,
			patientId: patientId(index),
			templateId: reminderTemplate?.id ?? null,
			channel: (index % 3 === 2 ? "email" : "sms") as "sms" | "email",
			intent: "appointment_confirmation" as const,
			recipientAddress: index % 3 === 2 ? `patient${index}@example.ru` : `7916${String(200 + index)}1020`,
			body: `${PATIENT_NAMES[index]?.split(" ")[1] ?? "Пациент"}, напоминаем: приём завтра в ${9 + index}:00, Клиника на Ленина.`,
			status: state.status,
			attempts: state.status === "failed" ? 3 : state.status === "queued" ? 0 : 1,
			sentAt: state.status === "delivered" || state.status === "sent" ? new Date(now.getTime() - index * 3_600_000) : null,
			deliveredAt: state.status === "delivered" ? new Date(now.getTime() - index * 3_500_000) : null,
			lastErrorMessage: state.error,
			receiptDetail: state.detail,
			dedupeKey: `reminder:${appointmentId(index)}:24`
		}))
	);

	// Рассылка в состоянии «выполняется» — чтобы панель кампаний не была пустой.
	await db.insert(communicationCampaigns).values({
		organizationId: ORG_ID,
		title: "Осмотр для тех, кто давно не был",
		templateId: reminderTemplate?.id ?? null,
		channel: "sms",
		scope: "marketing",
		status: "running",
		audienceJson: JSON.stringify({ status: "active", hasFutureAppointment: false }),
		audienceSnapshotJson: JSON.stringify({
			takenAt: now.toISOString(),
			criteria: ["активные пациенты", "нет будущей записи"],
			matched: 6,
			deliverable: 2,
			excluded: { no_contact: 1, no_consent: 3, excluded_by_criteria: 0, status_mismatch: 0 },
			queued: 2,
			alreadyQueued: 0,
			skipped: 0
		}),
		launchedAt: new Date(now.getTime() - 2 * 3_600_000)
	});

	const clinicToken = signToken({ organizationId: ORG_ID, clinicName: "Демо-клиника для снимков" }, authTokenSecret(), 3600);
	const staffToken = signToken(
		{ userId: ADMIN_USER, fullName: "Администратор клиники", role: "administrator", organizationId: ORG_ID },
		authTokenSecret(),
		3600
	);

	console.log(JSON.stringify({ organizationId: ORG_ID, clinicToken, staffToken }));
}

const shouldClean = process.argv.includes("--clean");
await (shouldClean ? clean() : seed());
process.exit(0);

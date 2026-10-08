/**
 * @file scheduleIntelligence.ts
 * @description Layer 2: Load balancing, doctor/chair load calculations, role queues, shift intelligence.
 */
import { inMemoryDomainState } from "./domainState.js";
import { activeVisit, hasUnsignedActiveVisit } from "./clinicalRecords.js";
import { nowIso, activeAppointmentId } from "./fixtureIds.js";
import { documents } from "./documents.js";
import { imagingStudies } from "./imaging.js";
import { buildBillingSummary } from "./billing.js";
import { buildCommunicationSummary } from "./communications.js";
import { buildClinicalRuleSummary } from "./clinicalRules.js";


import type {
	Appointment,
	ClinicMode,
	ResourceLoad,
	RoleQueue,
	ScheduleWarning,
	ShiftIntelligence,
	StaffMember,
	StaffWorkingHours,
} from "@dental/shared";
import { chairs, clinicProfile, defaultClinicScheduleDefaults } from "./organizations.js";
import { staffMembers } from "./staff.js";
import { appointments } from "./appointments.js";
import { buildAppointmentReadiness, appointmentDurationMinutes } from "./scheduleSuggestions.js";
import {
	appointmentClinicDateKey,
	appointmentClinicTimeParts,
	appointmentEndMinute,
	appointmentStartMinute,
	appointmentWithinClinicScheduleDefaults,
	appointmentWithinStaffSchedule,
	validScheduleTimeZone,
	workingHoursDailyCapacityMinutes,
	staffDailyCapacityMinutes,
} from "./scheduleTimeHelpers.js";

export * from "./scheduleTimeHelpers.js";
export * from "./scheduleSuggestions.js";

function activeShiftDateKey(state: DomainState = inMemoryDomainState): string {
	const { appointments, activeVisit } = state;
	const activeAppointment = appointments.find(
		(appointment) => appointment.id === activeVisit.appointmentId,
	);
	return appointmentClinicDateKey(
		activeAppointment?.startsAt ?? nowIso,
		undefined,
		state,
	);
}

function appointmentBelongsToShiftDate(
	appointment: Appointment,
	shiftDate: string,
): boolean {
	return appointmentClinicDateKey(appointment.startsAt) === shiftDate;
}

function workloadState(
	utilizationPercent: number,
	appointmentCount: number,
): ResourceLoad["state"] {
	if (appointmentCount === 0) return "idle";
	if (utilizationPercent >= 96) return "overbooked";
	if (utilizationPercent >= 72) return "tight";
	return "healthy";
}

function buildResourceLoad(input: {
	id: string;
	kind: ResourceLoad["kind"];
	title: string;
	subtitle: string;
	appointments: Appointment[];
	capacityMinutes: number;
	flags: string[];
}): ResourceLoad {
	const bookedMinutes = input.appointments.reduce(
		(total, appointment) => total + appointmentDurationMinutes(appointment),
		0,
	);
	const rawUtilizationPercent =
		input.capacityMinutes > 0
			? Math.round((bookedMinutes / input.capacityMinutes) * 100)
			: 0;
	const utilizationPercent = Math.min(200, rawUtilizationPercent);
	const lastAppointment = input.appointments
		.slice()
		.sort((left, right) => right.endsAt.localeCompare(left.endsAt))[0];
	const state = workloadState(rawUtilizationPercent, input.appointments.length);
	const flags = [...input.flags];

	if (state === "idle") flags.push("Нет записей на смену");
	if (state === "tight")
		flags.push("Плотная смена: оставлять буфер на документы");
	if (state === "overbooked")
		flags.push("Перегруз: нужна переноска или второй ресурс");
	if (rawUtilizationPercent > utilizationPercent)
		flags.push(
			`Фактическая загрузка ${rawUtilizationPercent}%, шкала ограничена 200%`,
		);

	return {
		id: input.id,
		kind: input.kind,
		title: input.title,
		subtitle: input.subtitle,
		bookedMinutes,
		appointmentCount: input.appointments.length,
		utilizationPercent,
		nextFreeAt: lastAppointment?.endsAt ?? null,
		state,
		flags,
	};
}

export function buildDoctorLoads(
	state: DomainState = inMemoryDomainState,
): ResourceLoad[] {
	const { staffMembers, appointments } = state;
	const activeDoctors = staffMembers.filter(
		(member) =>
			member.active && (member.role === "doctor" || member.role === "owner"),
	);
	const shiftDate = activeShiftDateKey(state);

	return activeDoctors.map((doctor) => {
		const doctorAppointments = appointments.filter(
			(appointment) =>
				appointment.doctorUserId === doctor.id &&
				appointmentBelongsToShiftDate(appointment, shiftDate),
		);
		return buildResourceLoad({
			id: doctor.id,
			kind: "doctor",
			title: doctor.fullName,
			subtitle: doctor.specialties.map((specialty) => specialty).join(", "),
			appointments: doctorAppointments,
			capacityMinutes: staffDailyCapacityMinutes(doctor),
			flags: [
				...(doctor.canSignMedicalRecords ? [] : ["Нет права подписи ЭМК"]),
				...(doctor.specialties.includes("universal")
					? ["Специальность не уточнена"]
					: []),
			],
		});
	});
}

export function buildAssistantLoads(
	state: DomainState = inMemoryDomainState,
): ResourceLoad[] {
	const { staffMembers, appointments } = state;
	const activeAssistants = staffMembers.filter(
		(member) => member.active && member.role === "assistant",
	);
	const shiftDate = activeShiftDateKey(state);

	return activeAssistants.map((assistant) => {
		const assistantAppointments = appointments.filter(
			(appointment) =>
				appointment.assistantUserId === assistant.id &&
				appointmentBelongsToShiftDate(appointment, shiftDate),
		);
		return buildResourceLoad({
			id: assistant.id,
			kind: "assistant",
			title: assistant.fullName,
			subtitle: assistant.specialties.map((specialty) => specialty).join(", "),
			appointments: assistantAppointments,
			capacityMinutes: staffDailyCapacityMinutes(assistant),
			flags: [
				...(assistant.specialties.length
					? [`Профили: ${assistant.specialties.join(", ")}`]
					: ["Профиль ассистента не задан"]),
				...(assistantAppointments.length ? [] : ["нет назначенных приемов"]),
			],
		});
	});
}

export function buildChairLoads(
	state: DomainState = inMemoryDomainState,
): ResourceLoad[] {
	const { chairs, appointments } = state;
	const shiftDate = activeShiftDateKey(state);
	return chairs
		.filter((chair) => chair.active)
		.map((chair) => {
			const chairAppointments = appointments.filter(
				(appointment) =>
					appointment.chairId === chair.id &&
					appointmentBelongsToShiftDate(appointment, shiftDate),
			);
			return buildResourceLoad({
				id: chair.id,
				kind: "chair",
				title: chair.name,
				subtitle:
					[chair.room, chair.specialization].filter(Boolean).join(" · ") ||
					"универсальное кресло",
				appointments: chairAppointments,
				capacityMinutes: workingHoursDailyCapacityMinutes(
					chair.workingHours ?? null,
				),
				flags: [
					...(chair.hasXraySensor ? ["RVG рядом"] : ["Нет RVG в кресле"]),
					...(chair.hasMicroscope ? ["Микроскоп"] : []),
					...(chair.hasSurgeryKit ? ["Хирургический набор"] : []),
				],
			});
		});
}

function buildRoleQueues(
	state: DomainState = inMemoryDomainState,
): RoleQueue[] {
	const {
		appointments,
		clinicProfile,
		documents,
		imagingStudies,
		importBatches,
		staffMembers,
	} = state;
	const billing = buildBillingSummary(state);
	const communication = buildCommunicationSummary(state);
	const draftDocuments = documents.filter(
		(document) => document.status === "draft",
	).length;
	const unsignedVisits = hasUnsignedActiveVisit(state) ? 1 : 0;
	const plannedAppointments = appointments.filter(
		(appointment) => appointment.status === "planned",
	).length;
	const reviewImages = imagingStudies.filter(
		(study) => study.status === "needs_review",
	).length;
	const incompleteImports = importBatches.filter(
		(batch) => batch.status !== "completed",
	).length;
	const hasAdmin = staffMembers.some(
		(member) => member.active && member.role === "administrator",
	);
	const hasAssistant = staffMembers.some(
		(member) => member.active && member.role === "assistant",
	);
	const hasManager = staffMembers.some(
		(member) =>
			member.active && (member.role === "manager" || member.role === "owner"),
	);

	return [
		{
			role: "doctor",
			title: "Клиническое закрытие",
			ownerLabel: "Врач",
			openItems: unsignedVisits + reviewImages,
			nextAction:
				reviewImages > 0
					? "Проверить снимки и AI-описания"
					: "Проверить и подписать ЭМК",
			automationHint: "AI готовит черновик, подпись остается ручной.",
			blockedBy: unsignedVisits > 0 ? ["Есть неподписанный прием"] : [],
		},
		{
			role: "administrator",
			title: "Администраторская очередь",
			ownerLabel: hasAdmin ? "Администратор" : "Врач или владелец",
			openItems:
				plannedAppointments +
				draftDocuments +
				billing.unpaidDocuments +
				communication.paymentReminders,
			nextAction:
				billing.totalDueRub > 0
					? "Закрыть оплату, документы и связь с пациентом"
					: "Подтвердить будущие записи",
			automationHint: "Документы создаются в один клик из приема или карточки.",
			blockedBy: hasAdmin ? [] : ["Нет отдельного администратора"],
		},
		{
			role: "assistant",
			title: "Подготовка кабинета",
			ownerLabel: hasAssistant ? "Ассистент" : "Врач",
			openItems:
				appointments.filter((appointment) => appointment.status === "confirmed")
					.length + communication.postVisitInstructions,
			nextAction: "Подготовить кресло, согласия, снимки и расходники",
			automationHint:
				"Кресло показывает RVG/микроскоп/хирургический набор до приема.",
			blockedBy: hasAssistant ? [] : ["Нет ассистента в смене"],
		},
		{
			role: "manager",
			title: "Управление и перенос данных",
			ownerLabel: hasManager ? "Управляющий" : "Владелец",
			openItems:
				incompleteImports + (clinicProfile.mode === "network_clinic" ? 1 : 0),
			nextAction:
				clinicProfile.mode === "network_clinic"
					? "Проверить сетевые права и филиалы"
					: "Следить за импортом и аудитом",
			automationHint: "Все переносы идут через preview, batch и аудит.",
			blockedBy: hasManager
				? []
				: ["Нет выделенного управляющего/владельца в ролях"],
		},
	];
}

function buildScheduleWarnings(
	state: DomainState = inMemoryDomainState,
): ScheduleWarning[] {
	const {
		activeVisit,
		appointments,
		clinicProfile,
		documents,
		imagingStudies,
		staffMembers,
	} = state;
	const warnings: ScheduleWarning[] = [];
	const billing = buildBillingSummary(state);
	const communication = buildCommunicationSummary(state);
	const clinical = buildClinicalRuleSummary(activeVisit.patientId, state);
	const activeAppointment = appointments.find(
		(appointment) => appointment.id === activeAppointmentId,
	);
	const reviewImage = imagingStudies.find(
		(study) => study.status === "needs_review",
	);
	const taxDocument = documents.find(
		(document) =>
			document.kind === "tax_deduction_certificate" &&
			document.status === "draft",
	);

	if (hasUnsignedActiveVisit(state)) {
		warnings.push({
			id: "unsigned-active-visit",
			severity: "warning",
			title: "Прием не подписан",
			detail:
				"ЭМК остается черновиком: диагноз и план лечения требуют проверки врача.",
			ownerRole: "doctor",
			relatedAppointmentId: activeAppointment?.id ?? null,
			actionLabel: "Открыть прием",
		});
	}

	if (reviewImage) {
		warnings.push({
			id: "image-needs-review",
			severity: "warning",
			title: "Снимок требует проверки",
			detail: `${reviewImage.title}: AI-описание нельзя переносить в ЭМК без врача.`,
			ownerRole: "doctor",
			relatedAppointmentId: activeAppointment?.id ?? null,
			actionLabel: "Проверить снимок",
		});
	}

	if (taxDocument) {
		warnings.push({
			id: "tax-document-draft",
			severity: "info",
			title: "Справка для вычета в очереди",
			detail:
				"Администратор должен связать справку с оплатой и пациентом до выдачи.",
			ownerRole: "administrator",
			relatedAppointmentId: null,
			actionLabel: "Открыть документы",
		});
	}

	if (billing.totalDueRub > 0) {
		warnings.push({
			id: "billing-due",
			severity: billing.totalDueRub > 10000 ? "critical" : "warning",
			title: "Есть неоплаченный план лечения",
			detail: `К оплате осталось ${billing.totalDueRub.toLocaleString("ru-RU")} ₽. Документы и вычет должны ссылаться на оплату.`,
			ownerRole: "administrator",
			relatedAppointmentId: activeAppointment?.id ?? null,
			actionLabel: "Открыть оплаты",
		});
	}

	if (communication.urgentTasks > 0 || communication.overdue > 0) {
		warnings.push({
			id: "communications-urgent",
			severity: communication.urgentTasks > 0 ? "critical" : "warning",
			title: "Есть срочная связь с пациентом",
			detail: `Открытых задач: ${communication.openTasks}. Срочных: ${communication.urgentTasks}. Просроченных: ${communication.overdue}.`,
			ownerRole: "administrator",
			relatedAppointmentId: activeAppointment?.id ?? null,
			actionLabel: "Открыть связь",
		});
	}

	if (clinical.unresolved > 0) {
		warnings.push({
			id: "clinical-rules-unresolved",
			severity: clinical.blockers > 0 ? "critical" : "warning",
			title: "Клинические правила требуют проверки",
			detail: `Нерешенных правил: ${clinical.unresolved}. Важных предупреждений: ${clinical.blockers}. Обязательных услуг к добавлению: ${clinical.requiredServices}.`,
			ownerRole: clinical.blockers > 0 ? "doctor" : "assistant",
			relatedAppointmentId: activeAppointment?.id ?? null,
			actionLabel: "Открыть прием",
		});
	}

	appointments.forEach((appointment) => {
		if (!appointment.patientId) {
			warnings.push({
				id: `appointment-no-patient-${appointment.id}`,
				severity: "critical",
				title: "Запись без пациента",
				detail:
					"Нельзя готовить документы и уведомления без карточки пациента.",
				ownerRole: "administrator",
				relatedAppointmentId: appointment.id,
				actionLabel: "Создать пациента",
			});
		}
	});

	if (
		clinicProfile.mode === "network_clinic" &&
		!staffMembers.some(
			(member) => member.role === "manager" || member.role === "owner",
		)
	) {
		warnings.push({
			id: "network-no-manager",
			severity: "critical",
			title: "Сетевой режим без управляющего",
			detail:
				"Для сети нужны права управляющего/владельца, иначе импорт, аудит и шаблоны некому контролировать.",
			ownerRole: "owner",
			relatedAppointmentId: null,
			actionLabel: "Добавить роль",
		});
	}

	return warnings;
}

const modeTitles: Record<ClinicMode, string> = {
	solo_doctor: "Отдельный врач",
	one_chair: "1 кабинет",
	small_clinic: "Малая клиника",
	network_clinic: "Сеть",
};

export function buildModeFit(
	state: DomainState = inMemoryDomainState,
): ShiftIntelligence["modeFit"] {
	const { staffMembers, chairs, clinicProfile } = state;
	const doctors = staffMembers.filter(
		(member) => member.active && member.role === "doctor",
	).length;
	const admins = staffMembers.filter(
		(member) => member.active && member.role === "administrator",
	).length;
	const assistants = staffMembers.filter(
		(member) => member.active && member.role === "assistant",
	).length;
	const managers = staffMembers.filter(
		(member) =>
			member.active && (member.role === "manager" || member.role === "owner"),
	).length;
	const activeChairs = chairs.filter((chair) => chair.active).length;
	const blockers: string[] = [];
	const upgrades: string[] = [];

	if (clinicProfile.mode === "solo_doctor") {
		if (doctors > 1 || activeChairs > 1)
			blockers.push("Режим слишком узкий для нескольких врачей или кресел");
		upgrades.push(
			"Оставить быстрый прием, документы и диктовку на первом экране",
		);
	}

	if (clinicProfile.mode === "one_chair") {
		if (activeChairs !== 1)
			blockers.push(
				"Для режима 1 кабинета должно быть ровно одно активное кресло",
			);
		if (doctors > 1)
			upgrades.push(
				"Если врачи работают параллельно, включить режим малой клиники",
			);
		upgrades.push(
			"Держать расписание как одну очередь смены без филиальной аналитики",
		);
	}

	if (clinicProfile.mode === "small_clinic") {
		if (doctors < 2)
			blockers.push(
				"Малой клинике нужен минимум второй врач или внешний специалист",
			);
		if (activeChairs < 2)
			blockers.push(
				"Нужно минимум два кресла/кабинета для реального распределения",
			);
		if (admins < 1)
			blockers.push("Нужен администратор для документов, звонков и оплаты");
		if (assistants < 1)
			blockers.push("Нужен ассистент для подготовки кабинетов");
		upgrades.push("Включить распределение по врачам, креслам и ролям");
	}

	if (clinicProfile.mode === "network_clinic") {
		if (!clinicProfile.networkEnabled) blockers.push("Сетевой флаг не включен");
		if (managers < 1) blockers.push("Нужен управляющий или владелец");
		if (doctors < 2)
			blockers.push("Сеть без нескольких врачей не дает операционного смысла");
		if (activeChairs < 2) blockers.push("Нужны кабинеты/кресла по филиалам");
		upgrades.push(
			"Добавить филиалы, централизованные шаблоны, аудит и импорт по источникам",
		);
	}

	const fitScore = Math.max(
		35,
		100 -
			blockers.length * 18 -
			(clinicProfile.mode === "network_clinic" ? 8 : 0),
	);

	return {
		mode: clinicProfile.mode,
		title: modeTitles[clinicProfile.mode],
		fitScore,
		blockers,
		upgrades,
		lowFrictionNextStep:
			blockers[0] ??
			(clinicProfile.mode === "one_chair"
				? "Продолжать вести смену как одну очередь: врач, кресло, документы, снимки."
				: "Дальше наращивать роли, ресурсы и шаблоны без перегруза рабочего экрана."),
	};
}

export function buildShiftIntelligence(
	state: DomainState = inMemoryDomainState,
): ShiftIntelligence {
	return {
		modeFit: buildModeFit(state),
		doctorLoads: buildDoctorLoads(state),
		assistantLoads: buildAssistantLoads(state),
		chairLoads: buildChairLoads(state),
		roleQueues: buildRoleQueues(state),
		scheduleWarnings: buildScheduleWarnings(state),
	};
}


export { buildRoleQueues };

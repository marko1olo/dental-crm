/**
 * @file scheduleSuggestions.ts
 * @description Layer 2: Schedule readiness engine, recommended actions, and suggestion calculations.
 */
import { inMemoryDomainState } from "./domainState.js";
import { documents } from "./documents.js";
import { imagingStudies } from "./imaging.js";
import { isOpenCommunicationTask } from "./communications.js";
import { rub, normalizeClinicScheduleDefaults } from "./organizations.js";
import { auditEvents, importBatches } from "./audit.js";
import { buildDoctorLoads, buildAssistantLoads, buildChairLoads, buildModeFit } from "./scheduleIntelligence.js";


import type {
	Appointment,
	AppointmentReadiness,
	RecommendedAction,
	ScheduleSuggestion,
	StaffMember,
	StaffWorkingHours,
} from "@dental/shared";
import { chairs, clinicProfile, defaultClinicScheduleDefaults } from "./organizations.js";
import { staffMembers } from "./staff.js";
import { patients, buildPatientInsights } from "./patients.js";
import { appointments } from "./appointments.js";
import { activeVisit, hasUnsignedActiveVisit } from "./clinicalRecords.js";
import { clinicalRules } from "./clinicalRules.js";
import { communicationTasks } from "./communications.js";
import {
	appointmentClinicDateKey,
	appointmentEndMinute,
	appointmentStartMinute,
	appointmentsShareClinicDate,
	appointmentWithinChairSchedule,
	appointmentWithinClinicSchedule,
	appointmentWithinClinicScheduleDefaults,
	appointmentWithinPatientPreference,
	appointmentWithinStaffSchedule,
	clinicDailyCapacityMinutes,
	clinicTodayIso,
	validScheduleTimeZone,
} from "./scheduleTimeHelpers.js";

function buildAppointmentReadiness(
	patientInsights?: PatientInsight[],
	domainState: DomainState = inMemoryDomainState,
): AppointmentReadiness[] {
	const {
		appointments,
		patients,
		staffMembers,
		chairs,
		communicationTasks,
		documents,
		imagingStudies,
		clinicProfile,
	} = domainState;
	patientInsights ??= buildPatientInsights(domainState);
	const patientsById = new Map(patients.map((p) => [p.id, p]));
	const activeStaffById = new Map(
		staffMembers.filter((m) => m.active).map((m) => [m.id, m]),
	);
	const activeChairsById = new Map(
		chairs.filter((c) => c.active).map((c) => [c.id, c]),
	);
	const patientInsightsByPatientId = new Map(
		patientInsights.map((i) => [i.patientId, i]),
	);

	const documentsByPatientId = new Map<string, typeof documents>();
	for (const doc of documents) {
		if (doc.status !== "voided") {
			if (!documentsByPatientId.has(doc.patientId))
				documentsByPatientId.set(doc.patientId, []);
			documentsByPatientId.get(doc.patientId)?.push(doc);
		}
	}

	const imagesByPatientId = new Map<string, typeof imagingStudies>();
	for (const study of imagingStudies) {
		if (study.patientId) {
			if (!imagesByPatientId.has(study.patientId))
				imagesByPatientId.set(study.patientId, []);
			imagesByPatientId.get(study.patientId)?.push(study);
		}
	}

	const tasksByAppointmentId = new Map<string, typeof communicationTasks>();
	for (const task of communicationTasks) {
		if (isOpenCommunicationTask(task) && task.appointmentId !== null) {
			if (!tasksByAppointmentId.has(task.appointmentId))
				tasksByAppointmentId.set(task.appointmentId, []);
			tasksByAppointmentId.get(task.appointmentId)?.push(task);
		}
	}

	return appointments.map((appointment) => {
		const patientId = appointment.patientId || "";
		const doctorUserId = appointment.doctorUserId || "";
		const chairId = appointment.chairId || "";

		const patient = patientsById.get(patientId);
		const doctor = activeStaffById.get(doctorUserId);
		const assistant = appointment.assistantUserId
			? (activeStaffById.get(appointment.assistantUserId) ?? null)
			: null;

		// Check if the assistant role matches, since the old code did `&& member.role === "assistant"`
		const finalAssistant =
			assistant && assistant.role === "assistant" ? assistant : null;

		const chair = activeChairsById.get(chairId);
		const patientDocuments = documentsByPatientId.get(patientId) ?? [];
		const patientImages = imagesByPatientId.get(patientId) ?? [];
		const insight = patientInsightsByPatientId.get(patientId);
		const appointmentTasks = tasksByAppointmentId.get(appointment.id) ?? [];
		const hasContract = patientDocuments.some(
			(document) => document.kind === "paid_medical_services_contract",
		);
		const hasConsent = patientDocuments.some(
			(document) => document.kind === "informed_consent",
		);
		const hasImageForTreatment = patientImages.some(
			(study) => study.status !== "failed",
		);
		const hasImageReviewBlocker = patientImages.some(
			(study) => study.status === "needs_review",
		);
		const hasBalance = (insight?.balanceDueRub ?? 0) > 0;
		const clinicScheduleCheck = appointmentWithinClinicSchedule(
			appointment,
			domainState,
		);
		const patientScheduleCheck = appointmentWithinPatientPreference(
			appointment,
			patient,
			domainState,
		);
		const doctorScheduleCheck = appointmentWithinStaffSchedule(
			appointment,
			doctor,
			"врача",
			domainState,
		);
		const assistantRequired = clinicProfile.mode !== "solo_doctor";
		const assistantScheduleCheck = assistantRequired
			? appointmentWithinStaffSchedule(
					appointment,
					finalAssistant,
					"ассистента",
					domainState,
				)
			: { ready: true, detail: "ассистент не требуется для режима клиники" };
		const chairScheduleCheck = appointmentWithinChairSchedule(
			appointment,
			chair,
			domainState,
		);
		const patientPreferenceWarnings = patientScheduleCheck.ready
			? []
			: [`Вне удобного окна пациента: ${patientScheduleCheck.detail}`];
		const hasScheduleBlocker =
			!clinicScheduleCheck.ready ||
			!doctorScheduleCheck.ready ||
			(assistantRequired && !assistantScheduleCheck.ready) ||
			!chairScheduleCheck.ready;
		const checks: AppointmentReadiness["checks"] = [
			{
				key: "patient",
				title: "Пациент",
				ready: Boolean(patient),
				detail: patient ? "карточка найдена" : "нет карточки пациента",
			},
			{
				key: "team",
				title: "Команда",
				ready: Boolean(doctor && chair && (!assistantRequired || assistant)),
				detail: `${doctor ? "врач есть" : "нет врача"} · ${chair ? chair.name : "нет кресла"} · ${
					assistant
						? `ассистент ${assistant.fullName.split(" ")[0]}`
						: assistantRequired
							? "ассистент не назначен"
							: "ассистент не требуется"
				}`,
			},
			{
				key: "schedule",
				title: "Расписание",
				ready:
					clinicScheduleCheck.ready &&
					patientScheduleCheck.ready &&
					doctorScheduleCheck.ready &&
					(!assistantRequired || assistantScheduleCheck.ready) &&
					chairScheduleCheck.ready,
				detail: clinicScheduleCheck.ready
					? doctorScheduleCheck.ready
						? assistantScheduleCheck.ready
							? chairScheduleCheck.detail
							: assistantScheduleCheck.detail
						: doctorScheduleCheck.detail
					: clinicScheduleCheck.detail,
			},
			{
				key: "documents",
				title: "Документы",
				ready: hasContract && hasConsent,
				detail:
					hasContract && hasConsent
						? "договор и согласие готовы"
						: "нужны договор/согласие",
			},
			{
				key: "imaging",
				title: "Снимки",
				ready: hasImageForTreatment && !hasImageReviewBlocker,
				detail: hasImageReviewBlocker
					? "снимок требует проверки"
					: hasImageForTreatment
						? "снимки доступны"
						: "снимков нет",
			},
			{
				key: "communication",
				title: "Связь",
				ready: appointmentTasks.length === 0,
				detail: appointmentTasks.length
					? `${appointmentTasks.length} задач связи`
					: "нет открытых задач",
			},
			{
				key: "finance",
				title: "Оплата",
				ready: !hasBalance,
				detail: hasBalance
					? `остаток ${rub(insight?.balanceDueRub ?? 0)}`
					: "без открытого остатка",
			},
		];
		const blockers = checks
			.filter((check) => !check.ready)
			.map((check) => check.detail);
		const warnings = patientPreferenceWarnings;
		const score = Math.round(
			(checks.filter((check) => check.ready).length / checks.length) * 100,
		);

		let state: AppointmentReadiness["state"];
		if (
			!patient ||
			!doctor ||
			!chair ||
			hasImageReviewBlocker ||
			hasScheduleBlocker
		) {
			state = "blocked";
		} else if (warnings.length || score < 84) {
			state = "needs_attention";
		} else {
			state = "ready";
		}

		let ownerRole: AppointmentReadiness["ownerRole"];
		if (hasScheduleBlocker || warnings.length) {
			ownerRole = "administrator";
		} else if (!doctor || hasImageReviewBlocker) {
			ownerRole = "doctor";
		} else if (!chair || (assistantRequired && !assistant)) {
			ownerRole = "assistant";
		} else if (
			!hasContract ||
			!hasConsent ||
			hasBalance ||
			appointmentTasks.length > 0
		) {
			ownerRole = "administrator";
		} else {
			ownerRole = "assistant";
		}

		let nextAction: string;
		if (state === "ready") {
			nextAction = "Можно принимать пациента";
		} else if (!patient) {
			nextAction = "Создать карточку пациента";
		} else if (!doctor) {
			nextAction = "Назначить врача";
		} else if (!chair) {
			nextAction = "Назначить кресло";
		} else if (assistantRequired && !assistant) {
			nextAction = "Назначить ассистента";
		} else if (hasScheduleBlocker) {
			nextAction = "Согласовать время приема";
		} else if (warnings.length) {
			nextAction = "Подтвердить время с пациентом";
		} else if (hasImageReviewBlocker) {
			nextAction = "Проверить снимок";
		} else if (!hasContract || !hasConsent) {
			nextAction = "Подготовить документы";
		} else if (hasBalance) {
			nextAction = "Уточнить оплату";
		} else if (appointmentTasks.length > 0) {
			nextAction = "Закрыть связь с пациентом";
		} else {
			nextAction = "Проверить подготовку";
		}

		return {
			appointmentId: appointment.id,
			patientId: appointment.patientId,
			state,
			score,
			ownerRole,
			nextAction,
			blockers,
			warnings,
			checks,
		};
	});
}

function buildRecommendedActions(
	patientInsights?: PatientInsight[],
	state: DomainState = inMemoryDomainState,
): RecommendedAction[] {
	const {
		activeVisit,
		appointments,
		auditEvents,
		communicationTasks,
		documents,
		imagingStudies,
		importBatches,
		patients,
	} = state;
	patientInsights ??= buildPatientInsights(state);
	const actions: RecommendedAction[] = [];
	const activeInsight = patientInsights.find(
		(insight) => insight.patientId === activeVisit.patientId,
	);
	const activePatient = patients.find(
		(patient) => patient.id === activeVisit.patientId,
	);
	const reviewImage = imagingStudies.find(
		(study) => study.status === "needs_review",
	);
	const taxDraft = documents.find(
		(document) =>
			document.kind === "tax_deduction_certificate" &&
			document.status === "draft",
	);
	const urgentTask = communicationTasks
		.filter(isOpenCommunicationTask)
		.sort((left, right) => {
			const priority = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
			return (
				priority[left.priority] - priority[right.priority] ||
				left.dueAt.localeCompare(right.dueAt)
			);
		})[0];
	const incompleteImport = importBatches.find(
		(batch) => batch.status !== "completed",
	);
	const modeFit = buildModeFit();

	const add = (action: RecommendedAction) => actions.push(action);

	if (hasUnsignedActiveVisit(state)) {
		add({
			id: "action-sign-active-visit",
			role: "doctor",
			priority: "urgent",
			section: "visit",
			patientId: activeVisit.patientId,
			title: "Закрыть медицинскую запись",
			detail: activePatient
				? `${activePatient.fullName}: жалобы, диагноз и план требуют проверки врача.`
				: "Активная ЭМК требует проверки врача.",
			metricLabel: "ЭМК",
			actionLabel: "Открыть прием",
			source: "visit.status",
		});
	}

	if (reviewImage) {
		add({
			id: "action-review-image",
			role: "doctor",
			priority: "urgent",
			section: "visit",
			patientId: reviewImage.patientId,
			title: "Проверить снимок",
			detail: `${reviewImage.title}: AI-описание остается черновиком до врачебной проверки.`,
			metricLabel: "снимок",
			actionLabel: "Открыть снимки",
			source: "imaging.status",
		});
	}

	if (activeInsight && activeInsight.balanceDueRub > 0) {
		add({
			id: "action-close-balance",
			role: "administrator",
			priority: activeInsight.balanceDueRub >= 10000 ? "urgent" : "important",
			section: "finance",
			patientId: activeInsight.patientId,
			title: "Связать оплату с документами",
			detail:
				"Проверить остаток, акт, договор и справку для налогового вычета до выдачи пациенту.",
			metricLabel: rub(activeInsight.balanceDueRub),
			actionLabel: "Открыть оплаты",
			source: "patientInsight.balance",
		});
	}

	if (taxDraft) {
		add({
			id: "action-tax-document",
			role: "administrator",
			priority: "important",
			section: "documents",
			patientId: taxDraft.patientId,
			title: "Подготовить справку для вычета",
			detail: `${taxDraft.title}: сверить пациента, оплату и сумму перед выдачей.`,
			metricLabel: "вычет",
			actionLabel: "Открыть документы",
			source: "document.taxDraft",
		});
	}

	if (urgentTask) {
		add({
			id: "action-communication",
			role: urgentTask.assignedRole,
			priority: urgentTask.priority === "urgent" ? "urgent" : "important",
			section: "communications",
			patientId: urgentTask.patientId,
			title: urgentTask.title,
			detail: urgentTask.body,
			metricLabel: urgentTask.channel,
			actionLabel: "Открыть связь",
			source: "communication.task",
		});
	}

	const confirmedAppointment = appointments.find(
		(appointment) => appointment.status === "confirmed",
	);
	if (confirmedAppointment) {
		add({
			id: "action-prepare-chair",
			role: "assistant",
			priority: "important",
			section: "shift",
			patientId: confirmedAppointment.patientId,
			title: "Подготовить кабинет",
			detail:
				"Проверить кресло, согласия, снимки и расходники до посадки пациента.",
			metricLabel: "кресло",
			actionLabel: "Открыть смену",
			source: "appointment.confirmed",
		});
	}

	if (incompleteImport) {
		add({
			id: "action-import-review",
			role: "manager",
			priority: "important",
			section: "settings",
			patientId: null,
			title: "Проверить импорт данных",
			detail: `${incompleteImport.sourceName}: ${incompleteImport.warningRows} строк с предупреждениями, ${incompleteImport.blockedRows} заблокировано.`,
			metricLabel: "импорт",
			actionLabel: "Открыть импорт",
			source: "import.batch",
		});
	} else {
		add({
			id: "action-manager-audit",
			role: "manager",
			priority: "routine",
			section: "settings",
			patientId: null,
			title: "Проверить аудит и качество данных",
			detail: `Импортов: ${importBatches.length}. Последних событий аудита: ${auditEvents.length}.`,
			metricLabel: "аудит",
			actionLabel: "Открыть аудит",
			source: "audit.summary",
		});
	}

	if (modeFit.blockers.length > 0) {
		add({
			id: "action-mode-fit",
			role: "owner",
			priority: "important",
			section: "settings",
			patientId: null,
			title: "Донастроить режим клиники",
			detail: modeFit.blockers[0] ?? modeFit.lowFrictionNextStep,
			metricLabel: `${modeFit.fitScore}%`,
			actionLabel: "Открыть настройки",
			source: "clinic.modeFit",
		});
	} else {
		add({
			id: "action-owner-mode-health",
			role: "owner",
			priority: "routine",
			section: "settings",
			patientId: null,
			title: "Проверить готовность режима",
			detail: modeFit.lowFrictionNextStep,
			metricLabel: `${modeFit.fitScore}%`,
			actionLabel: "Открыть доступы",
			source: "clinic.modeFit",
		});
	}

	const priorityRank: Record<RecommendedAction["priority"], number> = {
		urgent: 0,
		important: 1,
		routine: 2,
	};
	return actions
		.sort(
			(left, right) =>
				priorityRank[left.priority] - priorityRank[right.priority],
		)
		.slice(0, 10);
}

function buildScheduleSuggestions(
	readiness?: AppointmentReadiness[],
	state: DomainState = inMemoryDomainState,
): ScheduleSuggestion[] {
	const { appointments, clinicProfile, patients } = state;
	readiness ??= buildAppointmentReadiness(undefined, state);
	const suggestions: ScheduleSuggestion[] = [];
	const priorityRank: Record<ScheduleSuggestion["priority"], number> = {
		urgent: 0,
		important: 1,
		routine: 2,
	};
	const add = (suggestion: ScheduleSuggestion) => suggestions.push(suggestion);

	const appointmentsById = new Map(appointments.map((a) => [a.id, a]));
	const patientsById = new Map(patients.map((p) => [p.id, p]));

	readiness.forEach((item) => {
		const appointment = appointmentsById.get(item.appointmentId);
		const patient = item.patientId
			? patientsById.get(item.patientId)
			: undefined;
		if (!appointment) return;

		if (item.state === "blocked") {
			add({
				id: `schedule-blocked-${item.appointmentId}`,
				priority: "urgent",
				ownerRole: item.ownerRole,
				appointmentId: item.appointmentId,
				section: item.ownerRole === "doctor" ? "visit" : "schedule",
				title: "Перед посадкой нужна быстрая проверка",
				detail: `${patient?.fullName ?? "Пациент"} · ${item.nextAction}`,
				actionLabel:
					item.ownerRole === "doctor" ? "Открыть прием" : "Открыть запись",
				reason: item.blockers[0] ?? "есть предупреждение готовности",
			});
			return;
		}

		if (item.state === "needs_attention") {
			add({
				id: `schedule-attention-${item.appointmentId}`,
				priority: "important",
				ownerRole: item.ownerRole,
				appointmentId: item.appointmentId,
				section: "schedule",
				title: "Довести запись до готовности",
				detail: `${patient?.fullName ?? "Пациент"} · ${item.score}% готовности`,
				actionLabel: "Проверить подготовку",
				reason: item.blockers.slice(0, 2).join(" · ") || item.nextAction,
			});
		}
	});

	const sorted = appointments
		.slice()
		.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
	for (let index = 0; index < sorted.length - 1; index += 1) {
		const current = sorted[index];
		const next = sorted[index + 1];
		if (!current || !next) continue;
		if (!appointmentsShareClinicDate(current, next)) continue;
		const gapMinutes = Math.round(
			(new Date(next.startsAt).getTime() - new Date(current.endsAt).getTime()) /
				60000,
		);
		const sameAssistant = Boolean(
			current.assistantUserId &&
				current.assistantUserId === next.assistantUserId,
		);
		const sameResource =
			current.doctorUserId === next.doctorUserId ||
			sameAssistant ||
			current.chairId === next.chairId;
		const bufferMinutes = normalizeClinicScheduleDefaults(
			clinicProfile.scheduleDefaults,
		).appointmentBufferMinutes;
		if (sameResource && gapMinutes < bufferMinutes) {
			add({
				id: `schedule-buffer-${current.id}-${next.id}`,
				priority: "urgent",
				ownerRole: "administrator",
				appointmentId: next.id,
				section: "schedule",
				title: "Недостаточный буфер между приемами",
				detail:
					gapMinutes < 0
						? "Приемы пересекаются по врачу, ассистенту или креслу."
						: `${gapMinutes} мин между приемами при настроенном буфере ${bufferMinutes} мин.`,
				actionLabel: "Разнести приемы",
				reason:
					"настройка расписания требует буфер перед посадкой следующего пациента",
			});
		} else if (sameResource && gapMinutes >= 45) {
			add({
				id: `schedule-gap-${current.id}-${next.id}`,
				priority: "routine",
				ownerRole: "administrator",
				appointmentId: next.id,
				section: "schedule",
				title: "Есть окно в расписании",
				detail: `${gapMinutes} мин между приемами: можно поставить срочную консультацию или документы.`,
				actionLabel: "Открыть расписание",
				reason: "свободное окно без перегруза кресла",
			});
		}
	}

	const overbooked = [
		...buildDoctorLoads(),
		...buildAssistantLoads(),
		...buildChairLoads(),
	].find((load) => load.state === "overbooked");
	if (overbooked) {
		add({
			id: `schedule-overbooked-${overbooked.id}`,
			priority: "urgent",
			ownerRole:
				overbooked.kind === "doctor"
					? "doctor"
					: overbooked.kind === "assistant"
						? "assistant"
						: "administrator",
			appointmentId: null,
			section: "schedule",
			title: "Перегруз ресурса",
			detail: `${overbooked.title}: ${overbooked.utilizationPercent}% загрузки.`,
			actionLabel: "Разгрузить смену",
			reason: overbooked.flags[0] ?? "ресурс перегружен",
		});
	}

	return suggestions
		.sort(
			(left, right) =>
				priorityRank[left.priority] - priorityRank[right.priority],
		)
		.slice(0, 6);
}

function appointmentDurationMinutes(appointment: Appointment): number {
	const startsAt = new Date(appointment.startsAt).getTime();
	const endsAt = new Date(appointment.endsAt).getTime();
	return Math.max(0, Math.round((endsAt - startsAt) / 60000));
}


export {
	buildAppointmentReadiness,
	buildRecommendedActions,
	buildScheduleSuggestions,
	appointmentDurationMinutes,
};

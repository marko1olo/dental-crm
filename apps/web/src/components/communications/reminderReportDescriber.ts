import { countLabel } from "../../lib/russianPlural.js";
import {
	type Notice,
	type ReminderScheduleReport,
	type ReminderSkip,
	type ReminderSkipReason,
	type ReportVoice,
	formatMoment,
	noticeFrom,
	speak,
} from "./deliveryReportTypes.js";

const skipReasonWords: Record<ReminderSkipReason, string> = {
	no_channel:
		"нет способа связи: не указан телефон или почта, нет привязки к мессенджеру либо пациент отказался",
	no_template_data:
		"в шаблоне напоминания не хватает данных о приёме, а отправлять с пропуском нельзя",
};

function describeSkip(skip: ReminderSkip): string {
	return `${skip.patientName} (${formatMoment(skip.appointmentAt)})`;
}

function namesFor(
	skips: readonly ReminderSkip[],
	reason: ReminderSkipReason,
): string[] {
	return skips.filter((skip) => skip.reason === reason).map(describeSkip);
}

const reminderVoice: ReportVoice<ReminderScheduleReport> = {
	queued: {
		role: "delivered",
		order: 10,
		say: (queued) => `Поставлено напоминаний: ${queued}.`,
	},
	alreadyQueued: {
		role: "detail",
		order: 20,
		say: (alreadyQueued) =>
			alreadyQueued > 0 ? `Уже стояли в очереди: ${alreadyQueued}.` : null,
	},
	organizations: {
		role: "undelivered",
		order: 30,
		say: (organizations) =>
			organizations === 0
				? "Автоматические напоминания у клиники выключены, поэтому ставить их сейчас не из чего. Включите " +
					"их в правилах рассылки ниже — для этого нужен активный шаблон «Подтверждение приёма»."
				: null,
	},
	problems: {
		role: "undelivered",
		order: 40,
		say: (problems) => (problems.length > 0 ? problems.join(" ") : null),
	},
	skippedNoChannel: {
		role: "undelivered",
		order: 50,
		say: (skippedNoChannel, report) =>
			skippedNoChannel > 0
				? saySkipped(skippedNoChannel, "no_channel", report)
				: null,
	},
	skippedNoTemplateData: {
		role: "undelivered",
		order: 60,
		say: (skippedNoTemplateData, report) =>
			skippedNoTemplateData > 0
				? saySkipped(skippedNoTemplateData, "no_template_data", report)
				: null,
	},
	skipped: {
		role: "undelivered",
		order: 70,
		say: (skipped, report) =>
			skipped.length > 0 &&
			report.skippedNoChannel === 0 &&
			report.skippedNoTemplateData === 0
				? `Без напоминания остались: ${skipped.map(describeSkip).join(", ")}. Этим пациентам нужно позвонить.`
				: null,
	},
	examined: {
		role: "detail",
		order: 80,
		say: (examined, report) =>
			examined === 0 && report.organizations > 0 && report.problems.length === 0
				? "Приёмов, о которых пора напоминать, сейчас нет: напоминание ставится за столько часов до приёма, " +
					"сколько указано в правилах рассылки ниже."
				: null,
	},
};

function saySkipped(
	count: number,
	reason: ReminderSkipReason,
	report: ReminderScheduleReport,
): string {
	const named = namesFor(report.skipped, reason);
	const head = `Без напоминания остались ${countLabel(count, "пациент", "пациента", "пациентов")} — ${skipReasonWords[reason]}.`;
	if (named.length === 0) {
		return `${head} Кто именно — сервер не назвал; посмотрите приёмы на этот день в расписании.`;
	}
	const tail = named.length < count ? ` Названы первые ${named.length}.` : "";
	return `${head} Это ${named.join(", ")}.${tail} Этим пациентам нужно позвонить.`;
}

export function describeReminderReport(report: ReminderScheduleReport): Notice {
	return noticeFrom(speak(report, reminderVoice));
}

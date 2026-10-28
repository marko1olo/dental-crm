import type { Chair, Dashboard, StaffMember } from "@dental/shared";
import { textToNumbers } from "../stringUtils.js";
import { parsePatientDictationLocal } from "../smartPatientParser.js";
import type { AppointmentScheduleDraft } from "./bookingParserTypes.js";
import { classifyBookingIntent } from "./bookingIntentClassifier.js";
import { matchDoctorsAndAssistants } from "./bookingDoctorMatcher.js";
import { matchPatientsAndChairs, removeExtractedWords, resolveParticipants } from "./bookingPatientMatcher.js";
import { parseBookingTime } from "./bookingTimeParser.js";
import { matchBookingService } from "./bookingServiceMatcher.js";
import { parseBookingDate } from "./bookingDateParser.js";

const STOP_WORDS = /(?:^|[^а-яёa-z0-9])(нового|новому|зовут|новый|новая|запиши|записать|перенеси|перезапиши|отмени|пац(?:иент[ауоке]?)?|пожалуйста|доктору|врачу|врач|ассистент|медсестра|кресло|прием|срочно|запись|номер|в|на|к|ко|с|до|по|от|утра|дня|вечера|вечером|часов|минут|телефон|время|жалоба|после|обеда|хирург[уа]?|терапевт[уа]?|ортодонт[уа]?|ортопед[уа]?|имплантолог[уа]?)(?:[^а-яёa-z0-9]|$)/gi;

export function parseSmartBooking(text: string, dashboard: Dashboard): Partial<AppointmentScheduleDraft> {
	const normalizedInput = textToNumbers(text);
	const parsed: Partial<AppointmentScheduleDraft> = {};
	let remaining = ` ${normalizedInput.toLowerCase().trim()} `;
	const words = remaining.split(/[^а-яёa-z0-9]+/i).filter((w) => w.length > 0);

	const staff = dashboard.clinicSettings?.staff || [];
	const patients = dashboard.patients || [];
	const chairs = dashboard.clinicSettings?.chairs || [];

	const { foundDocs, foundAssists } = matchDoctorsAndAssistants(words, staff);
	const { foundPats, foundChairs } = matchPatientsAndChairs(words, patients, chairs);
	const resolved = resolveParticipants(foundDocs, foundPats, foundAssists, foundChairs);

	if (resolved.doctorUserId) parsed.doctorUserId = resolved.doctorUserId;
	if (resolved.patientId) parsed.patientId = resolved.patientId;
	if (resolved.assistantUserId) parsed.assistantUserId = resolved.assistantUserId;
	if (resolved.chairId) parsed.chairId = resolved.chairId;

	if (parsed.doctorUserId) {
		const doc = staff.find((d: StaffMember) => d.id === parsed.doctorUserId);
		if (doc) remaining = removeExtractedWords(remaining, [...doc.fullName.split(" "), ...(doc.specialties || [])]);
	}
	if (parsed.patientId) {
		const pat = patients.find((p) => p.id === parsed.patientId);
		if (pat) remaining = removeExtractedWords(remaining, pat.fullName.split(" "));
	}
	if (parsed.assistantUserId) {
		const ast = staff.find((a: StaffMember) => a.id === parsed.assistantUserId);
		if (ast) remaining = removeExtractedWords(remaining, [...ast.fullName.split(" "), ...(ast.specialties || [])]);
	}
	if (parsed.chairId) {
		const chair = chairs.find((c: Chair) => c.id === parsed.chairId);
		if (chair) remaining = removeExtractedWords(remaining, chair.name.split(" "));
	}

	const intent = classifyBookingIntent(remaining);
	parsed.action = intent.action;
	remaining = intent.cleanedText;

	const timeRes = parseBookingTime(remaining, intent.isCancel);
	remaining = timeRes.remainingText;

	const svcRes = matchBookingService(remaining, intent.isCancel, timeRes.durationMinutes, timeRes.explicitDurationFound);
	if (svcRes.reason) parsed.reason = svcRes.reason;
	remaining = svcRes.remainingText;

	const dateRes = parseBookingDate(remaining);
	remaining = dateRes.remainingText;

	if (dateRes.dateFound || timeRes.timeFound) {
		dateRes.targetDate.setHours(timeRes.hours, timeRes.minutes, 0, 0);
		parsed.startsAt = dateRes.targetDate.toISOString();
		parsed.endsAt = new Date(dateRes.targetDate.getTime() + svcRes.durationMinutes * 60000).toISOString();
	}

	if (intent.isCancel) parsed.status = "cancelled";

	remaining = remaining.replace(/[,;.!?]/g, " ").replace(/\s+/g, " ").trim();
	remaining = remaining.replace(STOP_WORDS, " ").replace(STOP_WORDS, " ");

	if (!parsed.patientId && parsed.action !== "cancel") {
		const newPatient = parsePatientDictationLocal(remaining);
		if (newPatient.fullName) parsed.patientName = newPatient.fullName;
		if (newPatient.phone) parsed.patientPhone = newPatient.phone;
		if (parsed.patientName) {
			parsed.patientName.toLowerCase().split(" ").filter((w) => w.length > 2).forEach((w) => {
				remaining = remaining.replace(new RegExp(`(?:^|[^а-яёa-z0-9])${w}(?:[^а-яёa-z0-9]|$)`, "ig"), " ");
			});
		}
		if (parsed.patientPhone) {
			const rawPhone = parsed.patientPhone.replace(/\D/g, "");
			const last10 = rawPhone.slice(-10);
			remaining = remaining.replace(new RegExp(`(?:^|[^0-9])(?:8|\\+7)?\\s*${last10.substring(0, 3)}[- ]?${last10.substring(3, 6)}[- ]?${last10.substring(6, 8)}[- ]?${last10.substring(8, 10)}(?:[^0-9]|$)`, "ig"), " ");
			remaining = remaining.replace(new RegExp(last10, "ig"), " ");
		}
	}

	remaining = remaining.replace(/\s+/g, " ").trim();
	if (remaining.length > 0 && !intent.isCancel) {
		parsed.comment = remaining.charAt(0).toUpperCase() + remaining.slice(1);
	}
	return parsed;
}

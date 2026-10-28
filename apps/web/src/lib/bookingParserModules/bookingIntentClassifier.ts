import type { BookingIntent } from "./bookingParserTypes.js";

const CANCEL_REGEX =
	/(?:^|[^а-яёa-z0-9])(отмен[а-я]*|удали|удалите|удалить запись|убери|сними|снимите)(?:[^а-яёa-z0-9]|$)/i;

const RESCHEDULE_REGEX =
	/(?:^|[^а-яёa-z0-9])(перенес[а-я]*|перезапиши|перезаписать|перекинь|сдвинь)(?:[^а-яёa-z0-9]|$)/i;

export function classifyBookingIntent(text: string): {
	action: BookingIntent;
	isCancel: boolean;
	isReschedule: boolean;
	cleanedText: string;
} {
	let cleanedText = text;
	const isCancel = CANCEL_REGEX.test(cleanedText);
	if (isCancel) {
		cleanedText = cleanedText.replace(CANCEL_REGEX, " ");
		return { action: "cancel", isCancel: true, isReschedule: false, cleanedText };
	}

	const isReschedule = RESCHEDULE_REGEX.test(cleanedText);
	if (isReschedule) {
		cleanedText = cleanedText.replace(RESCHEDULE_REGEX, " ");
		return { action: "reschedule", isCancel: false, isReschedule: true, cleanedText };
	}

	return { action: "create", isCancel: false, isReschedule: false, cleanedText };
}

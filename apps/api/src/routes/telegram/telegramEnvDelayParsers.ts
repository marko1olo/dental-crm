import type {
	DenteTelegramPostVisitCheckupDelayHoursByTopic,
	DenteTelegramVisualCardUrls,
} from "@dental/shared";
import { safeDenteTelegramPublicHttpsUrl } from "../../services/telegram/telegramLegacyMemoryStore.js";
import { stringFromEnvConfig } from "./telegramEnvUtils.js";
import { isRecord } from "./telegramUtils.js";
import type { UnknownRecord } from "./types.js";

export function visualCardUrlsFromEnvConfig(
	record: UnknownRecord,
): Partial<DenteTelegramVisualCardUrls> | null {
	const source = isRecord(record.visualCardUrls) ? record.visualCardUrls : {};
	const urls: Partial<DenteTelegramVisualCardUrls> = {};
	const assign = (key: keyof DenteTelegramVisualCardUrls, val: string | null): void => {
		if (val) urls[key] = val;
	};
	assign("mainMenu", safeDenteTelegramPublicHttpsUrl("visualCardUrls.mainMenu", stringFromEnvConfig(source.mainMenu) ?? stringFromEnvConfig(record.mainMenuImageUrl)));
	assign("appointment", safeDenteTelegramPublicHttpsUrl("visualCardUrls.appointment", stringFromEnvConfig(source.appointment) ?? stringFromEnvConfig(record.appointmentImageUrl)));
	assign("documents", safeDenteTelegramPublicHttpsUrl("visualCardUrls.documents", stringFromEnvConfig(source.documents) ?? stringFromEnvConfig(record.documentsImageUrl)));
	assign("tax", safeDenteTelegramPublicHttpsUrl("visualCardUrls.tax", stringFromEnvConfig(source.tax) ?? stringFromEnvConfig(record.taxImageUrl)));
	assign("billing", safeDenteTelegramPublicHttpsUrl("visualCardUrls.billing", stringFromEnvConfig(source.billing) ?? stringFromEnvConfig(record.billingImageUrl)));
	assign("care", safeDenteTelegramPublicHttpsUrl("visualCardUrls.care", stringFromEnvConfig(source.care) ?? stringFromEnvConfig(record.careImageUrl)));
	assign("review", safeDenteTelegramPublicHttpsUrl("visualCardUrls.review", stringFromEnvConfig(source.review) ?? stringFromEnvConfig(record.reviewImageUrl)));
	assign("staff", safeDenteTelegramPublicHttpsUrl("visualCardUrls.staff", stringFromEnvConfig(source.staff) ?? stringFromEnvConfig(record.staffImageUrl)));
	return Object.keys(urls).length ? urls : null;
}

export function postVisitCheckupDelayHoursFromEnvConfig(
	record: UnknownRecord,
): Partial<DenteTelegramPostVisitCheckupDelayHoursByTopic> | null {
	const source: UnknownRecord = isRecord(record.postVisitCheckupDelayHoursByTopic)
		? record.postVisitCheckupDelayHoursByTopic
		: isRecord(record.postVisitCheckupDelayHours)
			? record.postVisitCheckupDelayHours
			: {};
	const delays: Partial<DenteTelegramPostVisitCheckupDelayHoursByTopic> = {};
	const assign = (key: keyof DenteTelegramPostVisitCheckupDelayHoursByTopic, val: unknown): void => {
		const parsed = typeof val === "number" ? val : typeof val === "string" ? Number.parseInt(val, 10) : NaN;
		if (Number.isFinite(parsed)) delays[key] = Math.max(1, Math.min(720, Math.floor(parsed)));
	};
	assign("extraction", source.extraction ?? record.extractionCheckupDelayHours);
	assign("implantation", source.implantation ?? record.implantationCheckupDelayHours ?? record.implantCheckupDelayHours);
	assign("filling_restoration", source.filling_restoration ?? record.fillingCheckupDelayHours);
	assign("endo", source.endo ?? record.endoCheckupDelayHours);
	assign("surgery", source.surgery ?? record.surgeryCheckupDelayHours);
	assign("local_anesthesia", source.local_anesthesia ?? record.localAnesthesiaCheckupDelayHours);
	assign("hygiene", source.hygiene ?? record.hygieneCheckupDelayHours);
	assign("prosthetics", source.prosthetics ?? record.prostheticsCheckupDelayHours);
	assign("orthodontics", source.orthodontics ?? record.orthodonticsCheckupDelayHours);
	assign("periodontology", source.periodontology ?? record.periodontologyCheckupDelayHours);
	assign("other", source.other ?? record.otherCheckupDelayHours);
	return Object.keys(delays).length ? delays : null;
}

export function reviewRequestDelayHoursFromEnvConfig(record: UnknownRecord): number | null {
	const val = record.reviewRequestDelayHours;
	const parsed = typeof val === "number" ? val : typeof val === "string" ? Number.parseInt(val, 10) : NaN;
	return Number.isFinite(parsed) ? Math.max(1, Math.min(720, Math.floor(parsed))) : null;
}

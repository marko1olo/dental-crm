import type {
	DenteTelegramFeature,
	GeneratedDocument,
} from "@dental/shared";
import type { AppView } from "../routeUtils.js";
import { isDenteTelegramPortalSection } from "../CommonHelpers.js";

export const telegramPublicUrlSensitiveQueryKeys = new Set([
	"patient",
	"patientid",
	"patient_id",
	"pid",
	"fio",
	"name",
	"phone",
	"tel",
	"email",
	"inn",
	"snils",
	"passport",
	"visit",
	"visitid",
	"visit_id",
	"appointment",
	"appointmentid",
	"appointment_id",
	"document",
	"documentid",
	"document_id",
	"doc",
	"diagnosis",
	"tooth",
	"treatment",
	"payment",
	"receipt",
	"order",
	"token",
	"code",
]);

export const telegramPublicUrlSensitivePathSegments = new Set([
	"patient",
	"patients",
	"person",
	"people",
	"visit",
	"visits",
	"appointment",
	"appointments",
	"document",
	"documents",
	"medical-record",
	"medical-records",
	"record",
	"records",
	"tax",
	"payment",
	"payments",
	"receipt",
	"receipts",
	"order",
	"orders",
	"token",
	"code",
	"passport",
	"snils",
	"inn",
]);

export type TelegramFeaturePlan = {
	productName: string;
	botUsername: string | null;
	modes: string[];
	enabledFeatures: DenteTelegramFeature[];
	patientSafeActions: string[];
	staffSafeActions: string[];
	blockedByDefault: string[];
};

export type TelegramLinkSubjectType = "patient" | "staff";

export type DenteTelegramPortalSection =
	| "home"
	| "documents"
	| "tax"
	| "billing"
	| "care"
	| "schedule";

export type DenteTelegramHandoffTarget = {
	section: DenteTelegramPortalSection;
	view: AppView;
	hash: AppView;
	title: string;
	detail: string;
	documentKind?: GeneratedDocument["kind"] | undefined;
};

export const denteTelegramHandoffTargets: Record<
	DenteTelegramPortalSection,
	DenteTelegramHandoffTarget
> = {
	home: {
		section: "home",
		view: "shift",
		hash: "shift",
		title: "Рабочий стол клиники",
		detail:
			"Открыт стартовый экран клиники: ближайшие приемы, готовность команды, быстрые действия и рабочие настройки.",
	},
	documents: {
		section: "documents",
		view: "documents",
		hash: "documents",
		title: "Документы",
		detail: "Открыт раздел договоров, согласий, справок и архивов.",
		documentKind: "patient_intake_questionnaire",
	},
	tax: {
		section: "tax",
		view: "documents",
		hash: "documents",
		title: "Налоговые документы",
		detail: "Открыт раздел справок для налогового вычета, заявлений и оплат.",
		documentKind: "tax_deduction_certificate",
	},
	billing: {
		section: "billing",
		view: "finance",
		hash: "finance",
		title: "Оплаты",
		detail: "Открыт раздел оплат, чеков, счетов и налоговых реквизитов.",
	},
	care: {
		section: "care",
		view: "communications",
		hash: "communications",
		title: "Связь и памятки",
		detail:
			"Открыта очередь связи: запросы памяток, инструкции после приема и задачи администратора.",
	},
	schedule: {
		section: "schedule",
		view: "schedule",
		hash: "schedule",
		title: "Расписание",
		detail:
			"Открыта очередь записей, фильтры врачей, ассистентов и кресел сохранены.",
	},
};

export function readDenteTelegramHandoffTarget(): DenteTelegramHandoffTarget | null {
	if (typeof window === "undefined") return null;
	try {
		const url = new URL(window.location.href);
		if (url.searchParams.get("dente_source") !== "telegram") return null;
		const section = url.searchParams.get("dente_section");
		return isDenteTelegramPortalSection(section)
			? denteTelegramHandoffTargets[section]
			: null;
	} catch {
		return null;
	}
}

export function stripDenteTelegramHandoffQuery(
	target: DenteTelegramHandoffTarget,
): void {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	url.search = "";
	url.hash = `#${target.hash}`;
	window.history.replaceState(null, "", `${url.pathname}${url.hash}`);
}

import {
	STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
} from "@dental/shared";
import type { IdentityDocType } from "./types";

export {
	STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
};

export const IDENTITY_DOCUMENT_TYPES: Array<{
	readonly code: IdentityDocType;
	readonly labelRu: string;
}> = [
	{ code: "passport_rf", labelRu: "Паспорт гражданина РФ" },
	{ code: "birth_certificate", labelRu: "Свидетельство о рождении" },
	{ code: "foreign_passport", labelRu: "Заграничный паспорт" },
	{ code: "residence_permit", labelRu: "Вид на жительство (ВНЖ)" },
	{ code: "other", labelRu: "Иной документ" },
] as const;

export const REGISTRY_SERVICE_TAGS = [
	"Сложный пациент",
	"Всегда опаздывает",
	"Только утренние часы",
	"Только вечерние часы",
	"Звонить за 2 часа",
	"VIP-пациент",
	"Тревожный / Дентофобия",
	"Строго без задержек",
] as const;

export const DOCTOR_CLINICAL_TAGS = [
	"Дентофобия (страх бормашины)",
	"Выраженный рвотный рефлекс",
	"Аллергическая настороженность",
	"Особенности прикуса / ВНЧС",
	"Беременность / Лактация",
	"Бруксизм",
	"Атипичная реакция на анестезию",
] as const;

export const POPULAR_DMS_COMPANIES = [
	"СОГАЗ",
	"Ингосстрах",
	"АльфаСтрахование",
	"РЕСО-Гарантия",
	"ВСК",
	"Согласие",
	"Ренессанс Страхование",
] as const;

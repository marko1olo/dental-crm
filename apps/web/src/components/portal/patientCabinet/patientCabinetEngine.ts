/**
 * Patient Personal Portal & SMS/OTP Cabinet Engine
 * (DOMAIN: PORTAL PATIENT CABINET)
 *
 * Канонический фасад агрегации личного кабинета пациента.
 * Декомпозирован на модули в ./engine/:
 * - patientCabinetTypes & patientCabinetProfileTypes: типизация домена
 * - patientCabinetSbpEngine: СБП QR генерация и обработка оплат
 * - patientCabinetFormatters: расчет дней гарантии, чекапов, форматирование рублей и дат
 * - patientCabinetPepEngine: криптографический SHA-256 хэш, SMS/OTP и ПЭП 63-ФЗ
 * - patientCabinetSummaryEngine: расчет сводки, фильтры и пустая структура
 */

import { generateQrCodeSvg } from "@dental/shared";

// Декомпозированные модули ядра кабинета
export * from "./engine/patientCabinetTypes.js";
export * from "./engine/patientCabinetProfileTypes.js";
export * from "./engine/patientCabinetFormatters.js";
export * from "./engine/patientCabinetSbpEngine.js";
export * from "./engine/patientCabinetPepEngine.js";
export * from "./engine/patientCabinetSummaryEngine.js";

// Модули печатных форм и документов
export * from "./patientCabinetDocuments.js";
export * from "./patientTreatmentPlanDocuments.js";
export * from "./patientInvoiceDocuments.js";
export * from "./patientMedicalCardExtractDocuments.js";
export * from "./patientDentalPassport.js";
export * from "./patientCabinetAppointments.js";

// Реэкспорт зубной формулы
export {
	calculateDentalHealthIndex,
	type DentalHealthIndexResult,
	type PatientToothInfo,
	DEFAULT_PATIENT_TEETH,
	computePatientTeethFromStages,
} from "../PatientFriendlyOdontogram.js";

export { generateQrCodeSvg };

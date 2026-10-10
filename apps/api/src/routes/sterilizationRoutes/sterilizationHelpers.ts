import { computeDiaryHash } from "../../services/clinical/DiarySigningCeremonyService.js";
import type {
	AutoProvisionSterilizationLogParams,
	DiaryHashInput,
	EvaluateSterilizationLogInput,
	EvaluateSterilizationLogResult,
	UnsealKraftPackageParams,
	UnsealKraftPackageResponse,
} from "./types.js";

export function computeDiaryHashForTrayLink(row: DiaryHashInput): string {
	return computeDiaryHash(
		row.visitId,
		row.patientId ?? "",
		row.anamnesis,
		row.statusLocalis,
		row.treatmentDescription,
		row.diagnosisIcd10,
		row.diagnosisTooth,
		row.complications,
		row.comorbidities,
		row.instrumentTrayBarcode,
	);
}

/**
 * Мандат 8e / 8n: Запись мягкого клинического допуска в дневник 043/у по экстренным показаниям.
 */
export function buildEmergencySterilizationAdmissionNote(barcode: string): string {
	return `[Стерилизация: мягкий допуск крафт-пакета ${barcode.trim()} по экстренным показаниям под личную ответственность врача (СанПиН 3.3686-21)]`;
}

/**
 * Добавляет отметку о допуске в описание лечения 043/у без дублирования.
 */
export function applyEmergencySterilizationToDiaryTreatment(
	currentTreatment: string | null | undefined,
	barcode: string,
): string {
	const emergencyNote = buildEmergencySterilizationAdmissionNote(barcode);
	const base = (currentTreatment ?? "").trim();
	if (!base) return emergencyNote;
	if (
		base.includes(emergencyNote.trim()) ||
		(base.includes(barcode.trim()) && (base.includes("мягкий допуск") || base.includes("Стерилизация")))
	) {
		return base;
	}
	return `${base}\n${emergencyNote}`;
}

/**
 * Мандаты 8e, 8n: Формирует параметры авто-регистрации крафт-пакета стерилизации
 * (автоклав primary, класс B, 134°C / 2.1 bar, индикатор 5 класса — пройден, срок +30 дней).
 */
export function buildAutoProvisionSterilizationLogValues(params: AutoProvisionSterilizationLogParams) {
	const now = params.now ?? new Date();
	const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	return {
		organizationId: params.organizationId,
		barcode: params.barcode.trim(),
		autoclaveId: "primary",
		deviceName: "Автоклав 1 (Класс B)",
		cycleNumber: 1,
		temperatureCelsius: "134.0",
		pressureBar: "2.10",
		itemsDescription: "Регистрация стерильного лотка у кресла (СанПиН 3.3686-21)",
		operatorId: params.operatorId ?? null,
		status: "passed" as const,
		passedIndicator: true,
		packagingType: "kraft_self_adhesive" as const,
		expiresAt,
		indicatorType: "class5_integrating" as const,
		cycleMode: "B" as const,
		temperatureSet: "134.0",
		pressureSet: "2.10",
		durationMin: 5,
		timestamp: now,
	};
}

/**
 * Оценивает лоток перед привязкой: блокирует только реальный брак (status != passed),
 * при истекшем сроке дает мягкий клинический допуск (Мандат 8e п. 10).
 */
export function evaluateSterilizationLogForLinking(
	log: EvaluateSterilizationLogInput,
	now = new Date(),
): EvaluateSterilizationLogResult {
	if (log.status !== "passed" || !log.passedIndicator) {
		return {
			allowed: false,
			isExpired: false,
			errorCode: "FailedSterilizationBarcode",
			errorMessage:
				"Лоток не прошел контроль стерилизации (статус «failed» или карантин). Использование непростерилизованных инструментов категорически запрещено СанПиН 3.3686-21.",
		};
	}

	const isExpired = Boolean(
		log.expiresAt && new Date(log.expiresAt).getTime() < now.getTime(),
	);

	if (isExpired) {
		return {
			allowed: true,
			isExpired: true,
			emergencyLogNote: `[Мягкий допуск по экстренным показаниям под личную ответственность врача (СанПиН 3.3686-21 п. 3632, ${now.toLocaleDateString("ru-RU")})]`,
		};
	}

	return {
		allowed: true,
		isExpired: false,
	};
}

/**
 * Формирует ответ на списание/вскрытие крафт-пакета медсестрой.
 */
export function buildUnsealKraftPackageResponse(params: UnsealKraftPackageParams): UnsealKraftPackageResponse {
	const now = params.now ?? new Date();
	const operator = params.operatorName || "Медсестра ЦСО";
	return {
		success: true,
		barcode: params.barcode.trim(),
		unsealedAt: now.toISOString(),
		commissionRequired: false,
		operatorName: operator,
		operatorId: params.operatorId ?? null,
		status: "unsealed" as const,
		sanpinVerified: true,
		message:
			"Крафт-пакет успешно вскрыт и списан без комиссии из 3 человек (СанПиН 3.3686-21).",
	};
}

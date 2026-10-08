/**
 * constants.ts — Layer 0: Константы и дефолты для модального окна создания пациента.
 *
 * КОНТЕКСТ & МАНДАТ:
 * - 0 side-effects (чистые константы).
 * - Сохранение всех тестовых идентификаторов и канонических сообщений.
 */

export interface RepresentativeRoleOption {
	readonly role: string;
	readonly label: string;
	readonly testId: string;
}

export const CHILD_REPRESENTATIVE_ROLES: readonly RepresentativeRoleOption[] = [
	{ role: "Мама", label: "Мама", testId: "chip-rep-role-mother" },
	{ role: "Папа", label: "Папа", testId: "chip-rep-role-father" },
	{ role: "Опекун", label: "Опекун", testId: "chip-rep-role-guardian" },
] as const;

export const DEFAULT_ADVERTISING_SOURCE = "website_online";

export const EMERGENCY_PATIENT_FALLBACK_NAME =
	"Пациент с острой болью (Срочный приём)";

export const EMERGENCY_APPOINTMENT_REASON =
	"⚡ Срочный приём (Острая боль)";

export const ROUTINE_APPOINTMENT_REASON =
	"Первичный приём и консультация";

export const EMERGENCY_APPOINTMENT_COMMENT =
	"Экстренный прием по острой боли (ст. 124 УК РФ)";

export const TOAST_BLANK_CONTRACT_PRINTED =
	"Бланк договора со строками «________» отправлен на печать для зоны ожидания (без 403-ошибок)";

export const TOAST_SPECIFY_NAME_OR_EMERGENCY =
	"Укажите имя пациента или включите срочный приём для экстренной записи";

export const TOAST_SOMATIC_NORM_APPLIED =
	"Применена физиологическая норма: соматически здоров";

export const TOAST_PATIENT_CREATED_SCHEDULE =
	"Пациент создан. Открыто расписание для выбора времени приёма";

export const TOAST_PATIENT_CREATED_VISIT =
	"Пациент создан. Открыт амбулаторный приём (дежурный врач)";

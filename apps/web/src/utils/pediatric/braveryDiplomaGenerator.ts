/**
 * braveryDiplomaGenerator.ts
 *
 * Единый канонический генератор дипломов за храбрость для юных пациентов (МАНДАТ 8c, 8e, 8n, 8y).
 *
 * КЛИНИЧЕСКИЙ ИНВАРИАНТ:
 * 1. Боевой режим (Production):
 *    - Реквизиты клиники, ФИО врача и данные ребенка извлекаются из активной сессии
 *      (getCachedActiveStaffUser, getCachedClinicDashboard, getCachedClinicProfile)
 *      и базы данных.
 *    - Запрещены захардкоженные демо-врачи («Д-р Соколов А. В.») и демо-клиники («Клиника DENTE»).
 *    - Номер диплома генерируется уникальным (с годом и случайным суффиксом: ДИПЛОМ-ГЕРОЙ-YYYY-...).
 * 2. Демонстрационный режим (Showcase):
 *    - Разрешена подстановка эталонных демонстрационных данных только при отсутствии живой сессии.
 */

import {
	getCachedActiveStaffUser,
	getCachedClinicDashboard,
	getCachedClinicProfile,
} from "../../services/offline/offlineStorage.js";
import { isDemoShowcaseMode } from "../demoModeEngine.js";

export interface BraveryDiplomaData {
	diplomaNumber: string;
	patientName: string;
	patientAgeYears?: number | undefined;
	awardedDateIso: string;
	issueDateRu: string;
	awardReasonRu: string;
	doctorName: string;
	clinicName: string;
	isLiveSession?: boolean;
}

export interface ResolveBraveryDiplomaOptions {
	patientName?: string | undefined;
	patientAgeYears?: number | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	diplomaNumber?: string | undefined;
	awardReasonRu?: string | undefined;
	awardedDateIso?: string | undefined;
	isDemoOverride?: boolean | undefined;
}

const DEMO_DOCTOR_NAME = "Д-р Соколов А. В.";
const DEMO_CLINIC_NAME = "Детское отделение DENTE";
const DEMO_DIPLOMA_NUMBER = "ДИПЛОМ-ДЕТСТВО-2026-01";
const DEFAULT_AWARD_REASON =
	"За выдающееся мужество, безупречное спокойствие в кресле стоматолога и образцовую улыбку!";

function getStorage(): Storage | null {
	try {
		if (typeof window !== "undefined" && window.localStorage) {
			return window.localStorage;
		}
	} catch {
		// ignore
	}
	try {
		if (typeof globalThis !== "undefined" && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
			return (globalThis as unknown as { localStorage?: Storage }).localStorage ?? null;
		}
	} catch {
		// ignore
	}
	return null;
}

/**
 * Очищает переданную строку и проверяет, не является ли она шаблонной заглушкой.
 */
function isGenericPlaceholder(value: string | undefined | null, isDemo = false): boolean {
	if (!value) return true;
	const trimmed = value.trim();
	if (!trimmed) return true;
	if (
		trimmed === "Врач-стоматолог детский" ||
		trimmed === "Врач-стоматолог" ||
		trimmed === "Стоматологическая клиника"
	) {
		return true;
	}
	if (!isDemo) {
		if (
			trimmed === "Д-р Соколов А. В." ||
			trimmed.includes("Соколов") ||
			trimmed === "Стоматологическая Клиника DENTE" ||
			trimmed === "Детское отделение DENTE"
		) {
			return true;
		}
	}
	return false;
}

/**
 * Резолвит реальные реквизиты врача, клиники и пациента для диплома за храбрость.
 */
export function resolveBraveryDiplomaRequisites(
	options: ResolveBraveryDiplomaOptions = {},
): BraveryDiplomaData {
	const isDemo =
		typeof options.isDemoOverride === "boolean"
			? options.isDemoOverride
			: isDemoShowcaseMode();

	// 1. Извлечение активного врача из сессии
	let resolvedDoctorName = options.doctorName?.trim() || "";
	let isDoctorFromLiveSession = false;

	if (!resolvedDoctorName || isGenericPlaceholder(resolvedDoctorName, isDemo)) {
		try {
			let cachedStaff = getCachedActiveStaffUser() as {
				fullName?: string;
				name?: string;
				specialization?: string;
			} | null;

			if (!cachedStaff) {
				const storage = getStorage();
				if (storage) {
					const raw =
						storage.getItem("dente_cached_active_staff_user") ||
						storage.getItem("dente_active_staff_user");
					if (raw) {
						cachedStaff = JSON.parse(raw);
					}
				}
			}

			if (cachedStaff && (cachedStaff.fullName || cachedStaff.name)) {
				resolvedDoctorName = (cachedStaff.fullName || cachedStaff.name)!.trim();
				isDoctorFromLiveSession = true;
			}
		} catch {
			// storage inaccessible
		}
	}

	if (!resolvedDoctorName || isGenericPlaceholder(resolvedDoctorName, isDemo)) {
		if (isDemo) {
			resolvedDoctorName = DEMO_DOCTOR_NAME;
		} else {
			resolvedDoctorName = "Врач-стоматолог детский";
		}
	}

	// 2. Извлечение реальной клиники из сессии / БД
	let resolvedClinicName = options.clinicName?.trim() || "";
	let isClinicFromLiveSession = false;

	if (!resolvedClinicName || isGenericPlaceholder(resolvedClinicName, isDemo)) {
		try {
			const cachedDashboard = getCachedClinicDashboard();
			let cachedProfile = getCachedClinicProfile() as {
				clinicName?: string;
				name?: string;
			} | null;

			if (!cachedProfile) {
				const storage = getStorage();
				if (storage) {
					const raw =
						storage.getItem("dente_cached_clinic_profile") ||
						storage.getItem("dente_clinic_profile") ||
						storage.getItem("dente_clinic_dashboard_cache");
					if (raw) {
						cachedProfile = JSON.parse(raw);
					}
				}
			}

			const liveClinicName =
				(cachedDashboard?.clinicSettings?.profile as any)?.clinicName ||
				(cachedDashboard?.clinicSettings?.profile as any)?.name ||
				(cachedDashboard as any)?.organization?.name ||
				(cachedProfile as any)?.clinicName ||
				(cachedProfile as any)?.name;

			if (liveClinicName && typeof liveClinicName === "string" && liveClinicName.trim()) {
				resolvedClinicName = liveClinicName.trim();
				isClinicFromLiveSession = true;
			}
		} catch {
			// storage inaccessible
		}
	}

	if (!resolvedClinicName || isGenericPlaceholder(resolvedClinicName, isDemo)) {
		if (isDemo) {
			resolvedClinicName = DEMO_CLINIC_NAME;
		} else {
			resolvedClinicName = "Стоматологическая клиника";
		}
	}

	// 3. Имя пациента
	const resolvedPatientName = options.patientName?.trim() || "Юный пациент";

	// 4. Номер диплома
	let resolvedDiplomaNumber = options.diplomaNumber?.trim() || "";
	if (!resolvedDiplomaNumber) {
		if (isDemo) {
			resolvedDiplomaNumber = DEMO_DIPLOMA_NUMBER;
		} else {
			const currentYear = new Date().getFullYear();
			const entropy = Math.floor(1000 + Math.random() * 9000);
			resolvedDiplomaNumber = `ДИПЛОМ-ГЕРОЙ-${currentYear}-${entropy}`;
		}
	}

	// 5. Дата
	const resolvedDateIso =
		options.awardedDateIso || new Date().toISOString().slice(0, 10);
	const parts = resolvedDateIso.split("-");
	const issueDateRu =
		parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : resolvedDateIso;

	// 6. Формулировка
	const resolvedReason = options.awardReasonRu || DEFAULT_AWARD_REASON;

	return {
		diplomaNumber: resolvedDiplomaNumber,
		patientName: resolvedPatientName,
		patientAgeYears: options.patientAgeYears,
		awardedDateIso: resolvedDateIso,
		issueDateRu,
		awardReasonRu: resolvedReason,
		doctorName: resolvedDoctorName,
		clinicName: resolvedClinicName,
		isLiveSession: isDoctorFromLiveSession || isClinicFromLiveSession,
	};
}

/**
 * Каноническая функция генерации диплома за храбрость.
 */
export function generateBraveryDiploma(
	options: ResolveBraveryDiplomaOptions = {},
): BraveryDiplomaData {
	return resolveBraveryDiplomaRequisites(options);
}

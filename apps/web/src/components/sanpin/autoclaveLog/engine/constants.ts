/**
 * ============================================================================
 * SANPIN 3.3686-21 & FORM № 257/U STERILIZATION JOURNAL ENGINE — CONSTANTS (LAYER 0)
 * Нормативные константы, реквизиты клиники по умолчанию и регламентные интервалы.
 * ============================================================================
 */

import type { ClinicLegalInfo } from "./types.js";

export const DEFAULT_CLINIC_LEGAL_INFO: ClinicLegalInfo = {
	name: 'ООО «ДЕНТЕ КЛИНИК» (Стоматологический центр «DENTE»)',
	ogrn: "1187746123456",
	inn: "7701987654",
	address: "г. Москва, ул. Клиническая, д. 18, стр. 2",
	chiefDoctor: "Главный врач",
	headNurse: "Главная медсестра",
};

export const SANPIN_REGULATION_NUMBER = "3.3686-21";
export const SANPIN_FORM_257_TITLE = "ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ ВОЗДУШНОГО, ПАРОВОГО (АВТОКЛАВА)";
export const DEFAULT_STANDARD_CYCLE_TEMP = 134;
export const DEFAULT_STANDARD_CYCLE_PRESSURE = 2.15;
export const DEFAULT_STANDARD_CYCLE_EXPOSURE = 5.5;
export const DEFAULT_PRION_CYCLE_EXPOSURE = 20.0;
export const DEFAULT_CHEMICAL_INDICATOR_ID = "intetest_v_134_5";
export const DEFAULT_KRAFT_SHELF_LIFE_DAYS = 30;
export const BIOCONTROL_STATUTORY_INTERVAL_MONTHS = 6;
export const BIOCONTROL_STATUTORY_INTERVAL_DAYS = 182;

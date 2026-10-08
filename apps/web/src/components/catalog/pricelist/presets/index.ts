/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Layer 5: Presets Barrel & Canonical Presets Assembly
 */

import type { ServicePricelistItem } from './types';
import {
	ANESTHESIA_STATUTORY_PRESETS,
	CONSULTATION_BASELINE_SERVICES,
	CONSULTATION_STATUTORY_PRESETS,
	PACKAGE_STATUTORY_PRESETS,
	PEDIATRIC_STATUTORY_PRESETS,
	RADIOLOGY_BASELINE_SERVICES,
	RADIOLOGY_STATUTORY_PRESETS,
} from './diagnosticPediatricPresets';
import {
	ORTHODONTIC_STATUTORY_PRESETS,
	ORTHOPEDIC_BASELINE_SERVICES_PART1,
	ORTHOPEDIC_BASELINE_SERVICES_PART2,
	ORTHOPEDIC_STATUTORY_PRESETS,
} from './orthoProstheticPresets';
import {
	SURGERY_BASELINE_SERVICES_PART1,
	SURGERY_BASELINE_SERVICES_PART2,
	SURGERY_BASELINE_SERVICES_PART3,
	SURGERY_STATUTORY_PRESETS,
} from './surgeryImplantPresets';
import {
	HYGIENE_BASELINE_SERVICES,
	HYGIENE_STATUTORY_PRESETS,
	THERAPY_BASELINE_SERVICES,
	THERAPY_STATUTORY_PRESETS,
} from './therapyPresets';

export type * from './types';
export * from './constants';
export * from './therapyPresets';
export * from './surgeryImplantPresets';
export * from './orthoProstheticPresets';
export * from './diagnosticPediatricPresets';
export * from './presetMatcher';

/**
 * Canonical Presets of Statutory Russian Order 804n Nomenclature for Dental Practices (50 canonical presets)
 * Assembled with 100% byte-for-byte and order parity with Order № 804n sections.
 */
export const STATUTORY_ORDER_804N_PRESETS: readonly ServicePricelistItem[] = [
	// 1. КОНСУЛЬТАЦИИ И ОСМОТРЫ (B01.065)
	...CONSULTATION_STATUTORY_PRESETS,
	// 2. ТЕРАПИЯ И ЭНДОДОНТИЯ (A16.07)
	...THERAPY_STATUTORY_PRESETS,
	// 3. ХИРУРГИЯ И ИМПЛАНТАЦИЯ (A16.07)
	...SURGERY_STATUTORY_PRESETS,
	// 4. ОРТОПЕДИЯ И ПРОТЕЗИРОВАНИЕ (A16.07)
	...ORTHOPEDIC_STATUTORY_PRESETS,
	// 5. ОРТОДОНТИЯ (A16.07)
	...ORTHODONTIC_STATUTORY_PRESETS,
	// 6. ДЕТСКАЯ СТОМАТОЛОГИЯ (A16.07 / B01.065)
	...PEDIATRIC_STATUTORY_PRESETS,
	// 7. ДИАГНОСТИКА И РЕНТГЕН (A06.07)
	...RADIOLOGY_STATUTORY_PRESETS,
	// 8. ГИГИЕНА И ПРОФИЛАКТИКА (A16.07 / A11.07)
	...HYGIENE_STATUTORY_PRESETS,
	// 9. АНЕСТЕЗИОЛОГИЯ (A16.07.004)
	...ANESTHESIA_STATUTORY_PRESETS,
	// 10. ВНУТРИКЛИНИЧЕСКИЕ ПАКЕТЫ И УСЛУГИ (СВОБОДА КЛИНИКИ — MANDATE 8E)
	...PACKAGE_STATUTORY_PRESETS,
];

/**
 * Baseline 804n Pricelist (30 canonical services) для быстрого заполнения каталога клиники (Мандаты 8e, 8k, 8n)
 * Assembled with 100% byte-for-byte and exact numeric order (srv-base-01 to srv-base-30).
 */
export const BASELINE_804N_PRICELIST_SERVICES: readonly ServicePricelistItem[] = [
	// srv-base-01 to srv-base-11: Анестезия, коффердам, кариес, эндодонтия 1-4 канала
	...THERAPY_BASELINE_SERVICES,
	// srv-base-12 to srv-base-16: Цирконий, металлокерамика, вкладка E.max, слепок А-силикон, цемент
	...ORTHOPEDIC_BASELINE_SERVICES_PART1,
	// srv-base-17 to srv-base-20: Удаления зубов и швы
	...SURGERY_BASELINE_SERVICES_PART1,
	// srv-base-21 to srv-base-23: УЗ-чистка, Air-Flow, фторирование Tiefenfluorid
	...HYGIENE_BASELINE_SERVICES,
	// srv-base-24 to srv-base-25: Имплантация и формирователь десны
	...SURGERY_BASELINE_SERVICES_PART2,
	// srv-base-26: Индивидуальный циркониевый абатмент
	...ORTHOPEDIC_BASELINE_SERVICES_PART2,
	// srv-base-27: Первичный осмотр и консультация врача
	...CONSULTATION_BASELINE_SERVICES,
	// srv-base-28 to srv-base-29: Радиовизиография и панорамный снимок ОПТГ
	...RADIOLOGY_BASELINE_SERVICES,
	// srv-base-30: Снятие послеоперационных швов
	...SURGERY_BASELINE_SERVICES_PART3,
];

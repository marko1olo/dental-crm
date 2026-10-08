/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Layer 0: Constants, Labels & Statutory Metadata
 *
 * Tax compliance: пп. 2 п. 2 ст. 149 НК РФ — медицинские услуги, оказываемые медицинскими
 * организациями, не подлежат налогообложению (освобождаются от налогообложения) НДС (0%).
 */

import type { DoctorSpecialty, Order804nCategory, PriceTierKind } from './types';

export const CATEGORY_LABELS: Record<Order804nCategory, string> = {
	consultation: 'Консультации и осмотры',
	therapy: 'Терапия и эндодонтия',
	surgery: 'Хирургия и имплантация',
	orthopedics: 'Ортопедия и протезирование',
	orthodontics: 'Ортодонтия',
	pediatric: 'Детская стоматология',
	radiology: 'Диагностика и рентген',
	hygiene: 'Гигиена и профилактика',
	periodontics: 'Пародонтология',
	anesthesia: 'Анестезиология',
	package: 'Комплексы и пакеты клиники',
	other: 'Прочие услуги',
};

export const SPECIALTY_LABELS: Record<DoctorSpecialty, string> = {
	therapist: 'Стоматолог-терапевт',
	surgeon: 'Стоматолог-хирург / имплантолог',
	orthopedist: 'Стоматолог-ортопед',
	orthodontist: 'Стоматолог-ортодонт',
	pediatric: 'Детский стоматолог',
	hygienist: 'Гигиенист стоматологический',
	radiologist: 'Рентгенолог / диагност',
	anesthesiologist: 'Врач анестезиолог-реаниматолог',
	general: 'Врач общей практики / универсал',
};

export const PRICE_TIER_LABELS: Record<PriceTierKind, string> = {
	standard: 'Основной прайс (100%)',
	vip: 'VIP прейскурант (+20%)',
	dms: 'Тариф ДМС (СОГАЗ/Ингосстрах)',
	promo: 'Акционный / Спеццена (-10%)',
	night_weekend: 'Ночной / Выходного дня (+30%)',
};

export const STATUTORY_VAT_EXEMPTION_NOTE = 'НДС не облагается (пп. 2 п. 2 ст. 149 НК РФ)';

export const STATUTORY_ORDER_NUMBER = '804н';
export const STATUTORY_TAX_CODE_ARTICLE = 'пп. 2 п. 2 ст. 149 НК РФ';
export const DEFAULT_VAT_RATE = 0 as const;
export const DEFAULT_SERVICE_UNIT = 'усл.';

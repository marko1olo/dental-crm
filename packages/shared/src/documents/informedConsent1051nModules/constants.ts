/**
 * ═══════════════════════════════════════════════════════════════════════════
 * КОНСТАНТЫ ИДС И ОТКАЗА ОТ МЕДВМЕШАТЕЛЬСТВА (ПРИКАЗ МЗ РФ № 1051н)
 * Statutory Consent and Refusal Constants (Order 1051n Minzdrav RF)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface ClinicLicenseContext {
	readonly medicalLicenseNumber?: string | null | undefined;
	readonly medicalLicenseDate?: string | null | undefined;
	readonly medicalLicenseIssuer?: string | null | undefined;
}

/**
 * Безопасный фоллбэк лицензии при отсутствии данных в профиле клиники.
 */
export const FALLBACK_CLINIC_LICENSE_NUMBER = "ЛО41-01137-77/00368421";
export const FALLBACK_CLINIC_LICENSE_DATE = "12.10.2021";
export const FALLBACK_CLINIC_LICENSE_ISSUER = "Департамент здравоохранения города Москвы";

/**
 * Динамическое чтение реквизитов медицинской лицензии из профиля клиники с безопасным фоллбэком.
 */
export function resolveClinicLicense(clinic?: ClinicLicenseContext | null | undefined): {
	readonly medicalLicenseNumber: string;
	readonly medicalLicenseDate: string;
	readonly medicalLicenseIssuer: string;
} {
	return {
		medicalLicenseNumber: clinic?.medicalLicenseNumber?.trim() || FALLBACK_CLINIC_LICENSE_NUMBER,
		medicalLicenseDate: clinic?.medicalLicenseDate?.trim() || FALLBACK_CLINIC_LICENSE_DATE,
		medicalLicenseIssuer: clinic?.medicalLicenseIssuer?.trim() || FALLBACK_CLINIC_LICENSE_ISSUER,
	};
}

const defaultResolved = resolveClinicLicense();
export const DEFAULT_CLINIC_LICENSE_NUMBER = defaultResolved.medicalLicenseNumber;
export const DEFAULT_CLINIC_LICENSE_DATE = defaultResolved.medicalLicenseDate;
export const DEFAULT_CLINIC_LICENSE_ISSUER = defaultResolved.medicalLicenseIssuer;

export function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Перечень стандартных стоматологических медицинских вмешательств
 * в соответствии с номенклатурой Минздрава РФ и Приказом № 1051н.
 */
export const STATUTORY_DENTAL_INTERVENTIONS_1051N = [
	"Местная инфильтрационная, проводниковая или аппликационная анестезия",
	"Препарирование твердых тканей зубов, медикаментозная обработка кариозных полостей и корневых каналов",
	"Эндодонтическое и терапевтическое лечение, постановка светоотверждаемых пломб и реставраций",
	"Хирургические манипуляции (при необходимости: удаление зубов, наложение швов, кюретаж лунки)",
	"Рентгенологические исследования (прицельная радиовизиография, ОПТГ, КЛКТ)",
] as const;

/**
 * Риски при отказе от стоматологического вмешательства по умолчанию (Приложение № 2 к приказу 1051н)
 */
export const DEFAULT_REFUSAL_RISKS = [
	"Прогрессирование патологического процесса и разрушение твердых тканей зуба",
	"Переход воспаления в периапикальные ткани и кость челюсти",
	"Развитие одонтогенных гнойно-септических осложнений (периостит, флегмона, остеомиелит)",
	"Необратимая потеря зуба и деструкция костной ткани",
] as const;

/**
 * Альтернативы при отказе от стоматологического вмешательства по умолчанию
 */
export const DEFAULT_REFUSAL_ALTERNATIVES = [
	"Консервативное лечение по утвержденным клиническим протоколам",
	"Консультация другого специалиста / заведующего отделением (второе мнение)",
] as const;

/**
 * Тревожные признаки при отказе от вмешательства (неотложная помощь)
 */
export const DEFAULT_REFUSAL_WARNING_SIGNS = [
	"Нарастание отека лица, щеки или шеи",
	"Повышение температуры тела выше 37.5 °C",
	"Затрудненное открывание рта или глотание",
	"Острая пульсирующая боль",
] as const;

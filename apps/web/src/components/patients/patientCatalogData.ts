/**
 * patientCatalogData.ts — Единый канонический SSOT картотеки пациентов,
 * экспресс-регистрации за стойкой ресепшн и семейного баланса родственников.
 *
 * МАНДАТЫ:
 * - Мандат 8e (Автономия врача и администратора): экспресс-регистрация за 10 секунд (ФИО + телефон).
 *   Кнопка сохранения НИКОГДА не блокируется (disabled={false}). Паспорт, СНИЛС и полис — строго опциональны.
 * - Мандат 8n (Семейный баланс в 1 клик): родственники объединяются в семейный пул,
 *   оплата за ребенка или супруга списывается с семейного аванса без бюрократического ада.
 * - Мандат 8x (Живой клинический язык без канцелярита и приказов).
 * - Мандат 8ap (Анти-вранье: нормализованные копейки amountKopecks, ноль regex-скоринга).
 * - Мандат 8b (Sweet Spot: 250–320 строк).
 */

export type PatientCategory = "primary" | "regular" | "vip" | "debtor" | "blacklist";

export interface PatientCategoryMeta {
	readonly id: PatientCategory;
	readonly labelRu: string;
	readonly badgeClass: string;
	readonly descriptionRu: string;
}

export const PATIENT_CATEGORIES_CATALOG: Record<PatientCategory, PatientCategoryMeta> = {
	primary: {
		id: "primary",
		labelRu: "Первичный",
		badgeClass: "badge-primary-patient",
		descriptionRu: "Пациент на этапе первичного обследования и составления плана",
	},
	regular: {
		id: "regular",
		labelRu: "Постоянный",
		badgeClass: "badge-regular-patient",
		descriptionRu: "Постоянный пациент клиники на плановом санационном обслуживании",
	},
	vip: {
		id: "vip",
		labelRu: "VIP",
		badgeClass: "badge-vip-patient",
		descriptionRu: "Пациент с приоритетным бронированием и повышенным сервисом",
	},
	debtor: {
		id: "debtor",
		labelRu: "Должник",
		badgeClass: "badge-debtor-patient",
		descriptionRu: "Имеется непогашенная задолженность за завершенные этапы лечения",
	},
	blacklist: {
		id: "blacklist",
		labelRu: "В стоп-листе",
		badgeClass: "badge-blacklist-patient",
		descriptionRu: "Систематические срывы приёмов или деструктивное поведение",
	},
};

export type FamilyRole = "mother" | "father" | "child" | "spouse" | "other";

export const FAMILY_ROLE_LABELS: Record<FamilyRole, string> = {
	mother: "Мать",
	father: "Отец",
	child: "Ребёнок",
	spouse: "Супруг / Супруга",
	other: "Родственник / Опекун",
};

export interface FamilyMember {
	readonly id: string;
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string;
	readonly role: FamilyRole;
	balanceKopecks: number;
	readonly canUseFamilyBalance: boolean;
}

export interface PatientFamilyGroup {
	readonly familyId: string;
	readonly familyName: string;
	members: FamilyMember[];
	familyBalanceKopecks: number;
}

export interface PatientCatalogItem {
	readonly id: string;
	fullName: string;
	phone: string;
	birthDate?: string;
	gender?: "male" | "female" | "unspecified";
	category: PatientCategory;
	balanceKopecks: number;
	familyId?: string;
	familyRole?: FamilyRole;
	allergies: string[];
	isSomaticNorm: boolean;
	lastVisitDate?: string;
	nextAppointmentDate?: string;
	notes?: string;
	doctorName?: string;

	// Опциональные бюрократические реквизиты (заполняются после приёма или по желанию)
	passport?: {
		series?: string;
		number?: string;
		issuedBy?: string;
		issueDate?: string;
	};
	snils?: string;
	omsPolicy?: string;
	dmsPolicy?: string;
	address?: string;
}

/**
 * Нормализация номера телефона к каноническому формату (только цифры с префиксом 7).
 */
export function normalizePhoneNumber(raw: string | null | undefined): string {
	if (!raw) return "";
	const digits = raw.replace(/\D/g, "");
	if (!digits) return "";
	if (digits.length === 11 && (digits.startsWith("8") || digits.startsWith("7"))) {
		return "7" + digits.slice(1);
	}
	if (digits.length === 10) {
		return "7" + digits;
	}
	return digits;
}

/**
 * Человекочитаемое форматирование телефона для интерфейса: +7 (999) 000-00-00.
 */
export function formatPhoneDisplay(raw: string | null | undefined): string {
	const normalized = normalizePhoneNumber(raw);
	if (normalized.length === 11 && normalized.startsWith("7")) {
		const d = normalized;
		return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
	}
	return raw || "—";
}

/**
 * Форматирование копеек в рубли с разделителем тысяч.
 */
export function formatKopecksToRub(kopecks: number): string {
	const rubles = Math.floor(kopecks / 100);
	const formatted = new Intl.NumberFormat("ru-RU").format(rubles);
	return `${formatted} ₽`;
}

/**
 * Расчет суммарного семейного баланса родственников.
 */
export function calculateFamilyBalanceKopecks(members: readonly FamilyMember[]): number {
	return members.reduce((sum, member) => sum + member.balanceKopecks, 0);
}

/**
 * Списание с семейного баланса родственника в 1 клик (Мандат 8n).
 */
export function transferFamilyBalance(params: {
	fromMemberId: string;
	toMemberId: string;
	amountKopecks: number;
	members: readonly FamilyMember[];
}): { success: boolean; message: string; updatedMembers: FamilyMember[] } {
	const { fromMemberId, toMemberId, amountKopecks, members } = params;

	if (amountKopecks <= 0) {
		return { success: false, message: "Сумма для списания должна быть больше 0", updatedMembers: [...members] };
	}

	const payer = members.find((m) => m.id === fromMemberId || m.patientId === fromMemberId);
	const target = members.find((m) => m.id === toMemberId || m.patientId === toMemberId);

	if (!payer || !target) {
		return { success: false, message: "Участники семейной группы не найдены", updatedMembers: [...members] };
	}

	if (!payer.canUseFamilyBalance) {
		return {
			success: false,
			message: `Пациент ${payer.fullName} не имеет разрешения на семейные списания`,
			updatedMembers: [...members],
		};
	}

	const updated = members.map((m) => {
		if (m.id === payer.id) {
			return { ...m, balanceKopecks: m.balanceKopecks - amountKopecks };
		}
		if (m.id === target.id) {
			return { ...m, balanceKopecks: m.balanceKopecks + amountKopecks };
		}
		return m;
	});

	return {
		success: true,
		message: `Оплата ${formatKopecksToRub(amountKopecks)} успешно списана с баланса: ${payer.fullName}`,
		updatedMembers: updated,
	};
}

/**
 * Поиск дубликатов пациентов по телефону и/или фамилии.
 */
export function findPatientDuplicates(
	patients: readonly PatientCatalogItem[],
	query: { phone?: string; fullName?: string },
): PatientCatalogItem[] {
	const targetNormPhone = normalizePhoneNumber(query.phone);
	const targetName = query.fullName?.trim().toLowerCase() || "";

	if (!targetNormPhone && !targetName) return [];

	return patients.filter((p) => {
		const matchPhone = targetNormPhone && normalizePhoneNumber(p.phone) === targetNormPhone;
		const matchName = targetName && p.fullName.trim().toLowerCase() === targetName;
		return matchPhone || matchName;
	});
}

/**
 * Валидация экспресс-регистрации по Мандату 8e.
 * Требуются ТОЛЬКО ФИО и Телефон. Паспорт и СНИЛС не требуются!
 */
export function validateExpressPatientRegistration(draft: {
	fullName: string;
	phone: string;
}): { isValid: boolean; errorField?: "fullName" | "phone"; guidanceMessage?: string } {
	const trimmedName = draft.fullName?.trim() || "";
	if (trimmedName.length < 2) {
		return {
			isValid: false,
			errorField: "fullName",
			guidanceMessage: "Укажите фамилию и имя пациента (не менее 2 символов)",
		};
	}

	const normPhone = normalizePhoneNumber(draft.phone);
	if (normPhone.length < 10) {
		return {
			isValid: false,
			errorField: "phone",
			guidanceMessage: "Укажите корректный номер телефона (не менее 10 цифр)",
		};
	}

	return { isValid: true };
}

/**
 * Канонический демо-каталог пациентов клиники (Showcase SSOT).
 */
export const DEMO_PATIENT_CATALOG: PatientCatalogItem[] = [
	{
		id: "pat-001",
		fullName: "Иванова Елена Николаевна",
		phone: "+7 (916) 123-45-67",
		birthDate: "1985-04-12",
		gender: "female",
		category: "regular",
		balanceKopecks: 1540000, // 15 400 руб аванс
		familyId: "fam-001",
		familyRole: "mother",
		allergies: [],
		isSomaticNorm: true,
		lastVisitDate: "24.10.2026",
		nextAppointmentDate: "02.11.2026 14:00",
		notes: "Плановое ортопедическое протезирование",
		doctorName: "Д-р Смирнов А.В.",
	},
	{
		id: "pat-002",
		fullName: "Иванов Артем Алексеевич",
		phone: "+7 (916) 123-45-67",
		birthDate: "2016-09-05",
		gender: "male",
		category: "regular",
		balanceKopecks: -320000, // -3 200 руб задолженность за прием
		familyId: "fam-001",
		familyRole: "child",
		allergies: ["Пенициллин"],
		isSomaticNorm: false,
		lastVisitDate: "28.10.2026",
		notes: "Детский приём, герметизация фиссур 16, 26",
		doctorName: "Д-р Кузнецова Е.П.",
	},
	{
		id: "pat-003",
		fullName: "Смирнов Виктор Михайлович",
		phone: "+7 (926) 789-01-23",
		birthDate: "1978-11-20",
		gender: "male",
		category: "vip",
		balanceKopecks: 4500000, // 45 000 руб
		familyId: "fam-002",
		familyRole: "father",
		allergies: [],
		isSomaticNorm: true,
		lastVisitDate: "15.10.2026",
		nextAppointmentDate: "05.11.2026 11:30",
		notes: "Имплантация Nobel Biocare 36, 37",
		doctorName: "Д-р Белов К.И.",
	},
	{
		id: "pat-004",
		fullName: "Ковалева Анна Сергеевна",
		phone: "+7 (903) 456-78-90",
		birthDate: "1994-02-17",
		gender: "female",
		category: "primary",
		balanceKopecks: 0,
		allergies: ["Лидокаин"],
		isSomaticNorm: false,
		notes: "Первичная консультация ортодонта",
		doctorName: "Д-р Орлова М.А.",
	},
];

/**
 * Семейные пулы клиники.
 */
export const DEMO_FAMILY_GROUPS: PatientFamilyGroup[] = [
	{
		familyId: "fam-001",
		familyName: "Семья Ивановых",
		familyBalanceKopecks: 1220000, // 15 400 - 3 200 = 12 200 руб
		members: [
			{
				id: "fm-001",
				patientId: "pat-001",
				fullName: "Иванова Елена Николаевна",
				phone: "+7 (916) 123-45-67",
				role: "mother",
				balanceKopecks: 1540000,
				canUseFamilyBalance: true,
			},
			{
				id: "fm-002",
				patientId: "pat-002",
				fullName: "Иванов Артем Алексеевич",
				phone: "+7 (916) 123-45-67",
				role: "child",
				balanceKopecks: -320000,
				canUseFamilyBalance: true,
			},
		],
	},
];

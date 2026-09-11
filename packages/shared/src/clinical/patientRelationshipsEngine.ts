/**
 * patientRelationshipsEngine.ts
 * DENTE Dental CRM — Patient Relationships & Kinship Graph Engine (Wave 124)
 *
 * Reverse-engineered & adapted from DentalPin (backend/app/modules/patient_relationships):
 * - Directional patient-to-patient relationship graph with mutual inversion.
 * - Russian Federation statutory thresholds (FZ-323 Art. 20, 54 & FZ-54).
 * - Legal representative authorization (canSignConsent for pediatric patients < 15 years old).
 * - Financial payer resolution and family wallet permissions (isFinancialPayer).
 * - Emergency contact identification (isEmergencyContact).
 * - Resilient pair creation with Mandate 8e auto-defaults (Doctor Autonomy, zero dead-ends).
 * - Printable A4 kinship protocol with strictly 0 emojis (Mandate 8d item 7).
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 1. RELATIONSHIP TYPES & INVERSION MATRIX
// ─────────────────────────────────────────────────────────────────────────────

export const RELATIONSHIP_TYPES = [
	"parent",
	"child",
	"spouse",
	"sibling",
	"guardian",
	"ward",
	"other",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const relationshipTypeSchema = z.enum(RELATIONSHIP_TYPES);

/**
 * Reciprocal inversion matrix matching DentalPin schemas.py & RF family law:
 * - parent <-> child
 * - guardian <-> ward
 * - spouse <-> spouse (symmetric)
 * - sibling <-> sibling (symmetric)
 * - other <-> other (symmetric)
 */
export const INVERSE_RELATIONSHIP_TYPE: Record<RelationshipType, RelationshipType> = {
	parent: "child",
	child: "parent",
	guardian: "ward",
	ward: "guardian",
	spouse: "spouse",
	sibling: "sibling",
	other: "other",
};

/**
 * Returns the reciprocal / inverse relationship type from the counterparty's perspective.
 */
export function getInverseRelationship(type: RelationshipType): RelationshipType {
	return INVERSE_RELATIONSHIP_TYPE[type] ?? "other";
}

/**
 * Type guard for RelationshipType.
 */
export function isRelationshipType(value: unknown): value is RelationshipType {
	return (
		typeof value === "string" &&
		(RELATIONSHIP_TYPES as readonly string[]).includes(value)
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. RUSSIAN LEGAL NOMENCLATURE & LABELS
// ─────────────────────────────────────────────────────────────────────────────

export const RELATIONSHIP_LABELS_RU: Record<RelationshipType, string> = {
	parent: "Мать / Отец",
	child: "Сын / Дочь",
	guardian: "Опекун (законный представитель)",
	ward: "Подопечный",
	spouse: "Супруг(а)",
	sibling: "Брат / Сестра",
	other: "Связанное лицо / Другой представитель",
};

/**
 * Returns human-readable Russian statutory nomenclature for a relationship type.
 * If isInverse is true, returns the label from the counterparty's perspective.
 */
export function getRelationshipLabelRu(
	type: RelationshipType,
	isInverse: boolean = false,
): string {
	const effectiveType = isInverse ? getInverseRelationship(type) : type;
	return RELATIONSHIP_LABELS_RU[effectiveType] ?? "Связанное лицо";
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STATUTORY THRESHOLDS (RF LAW)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Under FZ-323 Art. 20 part 2 and Art. 54 part 2:
 * Minors under 15 years old cannot sign informed voluntary medical consent (ИДС) independently.
 * Consent must be signed by a legal representative (parent, guardian, or trustee).
 * From 15 years of age, pediatric patients have legal capacity to sign ИДС themselves.
 */
export const RF_STATUTORY_CONSENT_AGE_THRESHOLD = 15;

// ─────────────────────────────────────────────────────────────────────────────
// 4. INTERFACES & ZOD SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const patientRelationshipSchema = z.object({
	id: z.string().uuid("Некорректный UUID записи родства"),
	patientId: z.string().uuid("Некорректный UUID пациента"),
	relatedPatientId: z.string().uuid("Некорректный UUID связанного лица"),
	relatedPatientName: z.string().min(1, "ФИО связанного лица обязательно"),
	relationshipType: relationshipTypeSchema,
	inverseType: relationshipTypeSchema,
	canSignConsent: z.boolean(),
	isFinancialPayer: z.boolean(),
	isEmergencyContact: z.boolean(),
	notes: z.string().nullable().optional(),
	createdAt: z.string(),
});

export type PatientRelationship = z.infer<typeof patientRelationshipSchema>;

export const createRelationshipInputSchema = z.object({
	id: z.string().uuid().optional(),
	inverseId: z.string().uuid().optional(),
	patientId: z.string().uuid("Некорректный UUID пациента"),
	patientName: z.string().optional(),
	relatedPatientId: z.string().uuid("Некорректный UUID связанного лица"),
	relatedPatientName: z.string().min(1, "ФИО связанного лица обязательно"),
	relationshipType: relationshipTypeSchema,
	canSignConsent: z.boolean().optional(),
	isFinancialPayer: z.boolean().optional(),
	isEmergencyContact: z.boolean().optional(),
	notes: z.string().nullable().optional(),
	createdAt: z.string().optional(),
});

export type CreateRelationshipInput = z.infer<typeof createRelationshipInputSchema>;

export const updateRelationshipInputSchema = z.object({
	canSignConsent: z.boolean().optional(),
	isFinancialPayer: z.boolean().optional(),
	isEmergencyContact: z.boolean().optional(),
	notes: z.string().nullable().optional(),
});

export type UpdateRelationshipInput = z.infer<typeof updateRelationshipInputSchema>;

export interface AuthorizedSignersResolution {
	requiresRepresentative: boolean;
	authorizedSigners: PatientRelationship[];
	defaultSignerName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function generateUUID(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function formatDateRu(dateStr?: string): string {
	if (!dateStr) return "Не указана";
	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) return dateStr;
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();
	return `${day}.${month}.${year}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CORE DOMAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a bidirectional relationship pair (direct + inverse) with Mandate 8e smart defaults.
 *
 * Prevents self-linking (DentalPin service invariant).
 * Applies ergonomic defaults for doctor autonomy:
 * - Parents and guardians default to canSignConsent: true and isFinancialPayer: true.
 * - Spouses default to isFinancialPayer: true (family wallet / joint budget).
 * - All family members default to isEmergencyContact: true.
 */
export function createRelationshipPair(
	params: CreateRelationshipInput,
): { direct: PatientRelationship; inverse: PatientRelationship } {
	if (!params) {
		throw new Error("Параметры создания родственной связи обязательны");
	}

	const patientId = params.patientId ? params.patientId.trim() : "";
	const relatedPatientId = params.relatedPatientId
		? params.relatedPatientId.trim()
		: "";

	if (!patientId || !relatedPatientId) {
		throw new Error("UUID обоих пациентов обязательны для установления связи");
	}

	if (patientId === relatedPatientId) {
		throw new Error("Пациент не может быть связан сам с собой");
	}

	const relType = params.relationshipType;
	if (!isRelationshipType(relType)) {
		throw new Error(`Недопустимый тип родственной связи: ${String(relType)}`);
	}

	const invType = getInverseRelationship(relType);
	const timestamp = params.createdAt && params.createdAt.trim()
		? params.createdAt.trim()
		: new Date().toISOString();

	// Direct rights determination (Mandate 8e)
	const directCanSign =
		typeof params.canSignConsent === "boolean"
			? params.canSignConsent
			: relType === "parent" || relType === "guardian";

	const directIsPayer =
		typeof params.isFinancialPayer === "boolean"
			? params.isFinancialPayer
			: relType === "parent" || relType === "guardian" || relType === "spouse";

	const directIsEmergency =
		typeof params.isEmergencyContact === "boolean"
			? params.isEmergencyContact
			: true;

	const direct: PatientRelationship = {
		id: params.id || generateUUID(),
		patientId,
		relatedPatientId,
		relatedPatientName: params.relatedPatientName.trim(),
		relationshipType: relType,
		inverseType: invType,
		canSignConsent: directCanSign,
		isFinancialPayer: directIsPayer,
		isEmergencyContact: directIsEmergency,
		notes: params.notes ?? null,
		createdAt: timestamp,
	};

	// Inverse rights determination (perspective of related party)
	const inverseCanSign = invType === "parent" || invType === "guardian";
	const inverseIsPayer =
		invType === "parent" || invType === "guardian" || invType === "spouse";
	const inverseIsEmergency = true;

	const inverse: PatientRelationship = {
		id: params.inverseId || generateUUID(),
		patientId: relatedPatientId,
		relatedPatientId: patientId,
		relatedPatientName:
			params.patientName && params.patientName.trim()
				? params.patientName.trim()
				: "Пациент",
		relationshipType: invType,
		inverseType: relType,
		canSignConsent: inverseCanSign,
		isFinancialPayer: inverseIsPayer,
		isEmergencyContact: inverseIsEmergency,
		notes: params.notes ?? null,
		createdAt: timestamp,
	};

	return { direct, inverse };
}

/**
 * Resolves legal authorized signers for informed consent (ИДС) under 323-FZ Art. 20 & 54.
 *
 * For minor patients under 15 years old:
 * - requiresRepresentative = true
 * - authorizedSigners = list of relations with canSignConsent: true or parent/guardian type.
 * - defaultSignerName = first authorized signer or fallback warning.
 *
 * For adult or adolescent patients (>= 15 years old):
 * - requiresRepresentative = false (patient has statutory capacity)
 * - defaultSignerName = "Пациент (самостоятельно)"
 */
export function resolveAuthorizedSigners(
	patientAgeYears: number,
	relationships: PatientRelationship[] = [],
): AuthorizedSignersResolution {
	const safeAge = Number.isFinite(patientAgeYears) ? Math.max(0, patientAgeYears) : 0;
	const safeRelationships = Array.isArray(relationships)
		? relationships.filter((r) => r && typeof r === "object")
		: [];

	if (safeAge < RF_STATUTORY_CONSENT_AGE_THRESHOLD) {
		const signers = safeRelationships.filter(
			(r) =>
				r.canSignConsent === true ||
				r.relationshipType === "parent" ||
				r.relationshipType === "guardian",
		);

		const firstSigner = signers[0];
		return {
			requiresRepresentative: true,
			authorizedSigners: signers,
			defaultSignerName:
				firstSigner
					? firstSigner.relatedPatientName
					: "Требуется законный представитель (родитель/опекун)",
		};
	}

	// Patient >= 15 years old: statutory medical autonomy
	const optionalDelegates = safeRelationships.filter((r) => r.canSignConsent === true);

	return {
		requiresRepresentative: false,
		authorizedSigners: optionalDelegates,
		defaultSignerName: "Пациент (самостоятельно)",
	};
}

/**
 * Returns all relationships authorized as financial payers for family billing (54-FZ).
 */
export function resolveFamilyPayers(
	relationships: PatientRelationship[] = [],
): PatientRelationship[] {
	if (!Array.isArray(relationships)) return [];
	return relationships.filter((r) => r && r.isFinancialPayer === true);
}

/**
 * Returns all relationships designated as emergency contacts.
 */
export function resolveEmergencyContacts(
	relationships: PatientRelationship[] = [],
): PatientRelationship[] {
	if (!Array.isArray(relationships)) return [];
	return relationships.filter((r) => r && r.isEmergencyContact === true);
}

/**
 * Formats a clean, professional A4 printout protocol of family relationships & legal guardians.
 *
 * Mandate 8d item 7 invariant: Strictly 0 emojis in clinical & legal documents.
 */
export function formatKinshipSummaryA4(
	relationships: PatientRelationship[],
	patientName: string,
): string {
	const safeName = typeof patientName === "string" && patientName.trim()
		? patientName.trim()
		: "Пациент";

	const safeList = Array.isArray(relationships)
		? relationships.filter((r) => r && typeof r === "object" && typeof r.relatedPatientName === "string")
		: [];

	const lines: string[] = [];
	const separator = "=".repeat(78);
	const subSeparator = "-".repeat(78);

	lines.push(separator);
	lines.push("ПРОТОКОЛ СЕМЕЙНЫХ СВЯЗЕЙ И ЗАКОННЫХ ПРЕДСТАВИТЕЛЕЙ (ФОРМА 043/У)");
	lines.push("РЕЕСТР РОДСТВЕННЫХ ОТНОШЕНИЙ, ПРАВ ПОДПИСИ И СОГЛАСИЙ (СТ. 20 № 323-ФЗ, 54-ФЗ)");
	lines.push(separator);
	lines.push(`Пациент: ${safeName}`);
	lines.push(`Дата формирования реестра: ${formatDateRu(new Date().toISOString())}`);
	lines.push(`Всего зарегистрировано связей: ${safeList.length}`);
	lines.push(separator);
	lines.push("");

	if (safeList.length === 0) {
		lines.push("Записи о родственных связях и законных представителях отсутствуют.");
		lines.push("");
	} else {
		for (let i = 0; i < safeList.length; i++) {
			const rel = safeList[i];
			if (!rel) {
				continue;
			}
			const indexStr = String(i + 1).padStart(3, "0");
			const directLabel = getRelationshipLabelRu(rel.relationshipType);
			const inverseLabel = getRelationshipLabelRu(rel.inverseType);

			lines.push(`[${indexStr}] Связанное лицо: ${rel.relatedPatientName}`);
			lines.push(`      Степень родства: ${directLabel} (встречный статус: ${inverseLabel})`);
			lines.push(
				`      Право подписи ИДС (ст. 20 № 323-ФЗ): ${
					rel.canSignConsent ? "Да (законный представитель)" : "Нет"
				}`,
			);
			lines.push(
				`      Финансовый плательщик (54-ФЗ): ${
					rel.isFinancialPayer ? "Да (семейный счет)" : "Нет"
				}`,
			);
			lines.push(
				`      Экстренная связь: ${rel.isEmergencyContact ? "Да" : "Нет"}`,
			);

			if (rel.notes && rel.notes.trim()) {
				lines.push(`      Примечания: ${rel.notes.trim()}`);
			} else {
				lines.push("      Примечания: —");
			}

			if (i < safeList.length - 1) {
				lines.push(subSeparator);
			}
		}
		lines.push("");
	}

	lines.push(separator);
	lines.push("Документ сформирован в медицинской информационной системе DENTE Dental CRM.");
	lines.push("Подпись регистратора / уполномоченного лица: ____________________ / ____________________");
	lines.push("М.П. (Место печати медицинской организации)");
	lines.push(separator);

	return lines.join("\n");
}

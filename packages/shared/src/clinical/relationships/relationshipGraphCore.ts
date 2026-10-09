/**
 * relationshipGraphCore.ts
 * DENTE Dental CRM — Patient Relationships, Legal Guardians & Family Payment Engine
 * Layer 2: Relationship Graph Core, Traversal, Inversion & Edge Validation
 */

import { generateSecureUuid } from "../../utils/idGenerators.js";
import {
	type RelationshipType,
	isRelationshipType,
	getInverseRelationshipType,
	getRelationshipLabelRu,
	type PatientRelationshipRecord,
	type ResolvedPatientRelationship,
	type PatientRelationship,
	type CreateRelationshipInput,
	type RelationshipLinkEdge,
} from "./types.js";

const generateUUID = generateSecureUuid;

/**
 * Transforms a list of directional relationship links to the perspective of the specified patient.
 * Aligned with DentalPin service.list_relationships_for_patient logic:
 * - If patient is the source, retains relationshipType.
 * - If patient is the target, inverts relationshipType so the list always reads "this person is my ___".
 */
export function buildBidirectionalRelationshipList(
	patientId: string,
	links: readonly PatientRelationshipRecord[] = [],
): ResolvedPatientRelationship[] {
	const targetId = typeof patientId === "string" ? patientId.trim() : "";
	if (!targetId || !Array.isArray(links)) return [];

	const results: ResolvedPatientRelationship[] = [];

	for (const r of links) {
		if (!r || typeof r !== "object") continue;

		if (r.patientId === targetId) {
			results.push({
				id: r.id,
				clinicId: r.clinicId,
				patientId: targetId,
				relatedPatientId: r.relatedPatientId,
				relationshipType: r.relationshipType,
				relationshipLabelRu: getRelationshipLabelRu(r.relationshipType),
				isLegalGuardian: Boolean(r.isLegalGuardian),
				isFinancialGuarantor: Boolean(r.isFinancialGuarantor),
				permissions: Array.isArray(r.permissions) ? [...r.permissions] : [],
				notes: r.notes ?? null,
				isInverse: false,
				createdAt: r.createdAt,
			});
		} else if (r.relatedPatientId === targetId) {
			const invType = getInverseRelationshipType(r.relationshipType);
			results.push({
				id: r.id,
				clinicId: r.clinicId,
				patientId: targetId,
				relatedPatientId: r.patientId,
				relationshipType: invType,
				relationshipLabelRu: getRelationshipLabelRu(invType),
				isLegalGuardian: Boolean(r.isLegalGuardian),
				isFinancialGuarantor: Boolean(r.isFinancialGuarantor),
				permissions: Array.isArray(r.permissions) ? [...r.permissions] : [],
				notes: r.notes ?? null,
				isInverse: true,
				createdAt: r.createdAt,
			});
		}
	}

	return results;
}

/**
 * Validates whether a new relationship can be established without self-linking
 * or duplicate link creation in either direction (DentalPin create_relationship invariant).
 */
export function validateRelationshipPair(
	patientId: string,
	relatedPatientId: string,
	existingLinks: readonly PatientRelationshipRecord[] = [],
): { valid: boolean; reason?: string } {
	const pId = typeof patientId === "string" ? patientId.trim() : "";
	const rId = typeof relatedPatientId === "string" ? relatedPatientId.trim() : "";

	if (!pId || !rId) {
		return {
			valid: false,
			reason: "ID обоих пациентов обязательны для установления связи",
		};
	}

	if (pId === rId) {
		return {
			valid: false,
			reason: "Пациент не может быть связан сам с собой",
		};
	}

	const isDuplicate = existingLinks.some(
		(link) =>
			(link.patientId === pId && link.relatedPatientId === rId) ||
			(link.patientId === rId && link.relatedPatientId === pId),
	);

	if (isDuplicate) {
		return {
			valid: false,
			reason: "Связь между данными пациентами уже существует в базе данных",
		};
	}

	return { valid: true };
}

/**
 * Creates a bidirectional relationship pair (direct + inverse) with Mandate 8e smart defaults.
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

	const invType = getInverseRelationshipType(relType);
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
		relatedPatientName:
			params.relatedPatientName && params.relatedPatientName.trim()
				? params.relatedPatientName.trim()
				: "Связанное лицо",
		relationshipType: relType,
		inverseType: invType,
		isLegalGuardian: relType === "parent" || relType === "guardian",
		canShareBalance: directIsPayer,
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
		isLegalGuardian: invType === "parent" || invType === "guardian",
		canShareBalance: inverseIsPayer,
		canSignConsent: inverseCanSign,
		isFinancialPayer: inverseIsPayer,
		isEmergencyContact: inverseIsEmergency,
		notes: params.notes ?? null,
		createdAt: timestamp,
	};

	return { direct, inverse };
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
 * Validates whether a new relationship can be established without self-linking,
 * direct duplicate edges, or circular hierarchy cycles.
 */
export function validateRelationshipLink(
	patientId: string,
	relatedPatientId: string,
	existingLinks: readonly RelationshipLinkEdge[],
	newType?: string,
): { isValid: boolean; error?: string } {
	if (!patientId || !relatedPatientId) {
		return { isValid: false, error: "ID обоих пациентов обязательны для создания связи" };
	}

	if (patientId === relatedPatientId) {
		return {
			isValid: false,
			error: "Пациент не может быть связан сам с собой",
		};
	}

	const alreadyLinked = existingLinks.some(
		(link) =>
			(link.patientId === patientId && link.relatedPatientId === relatedPatientId) ||
			(link.patientId === relatedPatientId && link.relatedPatientId === patientId),
	);

	if (alreadyLinked) {
		return {
			isValid: false,
			error: "Связь между этими пациентами уже существует в базе данных",
		};
	}

	if (newType === "parent" || newType === "guardian") {
		const visited = new Set<string>();
		const queue: string[] = [relatedPatientId];

		while (queue.length > 0) {
			const current = queue.shift()!;
			if (current === patientId) {
				return {
					isValid: false,
					error: "Обнаружен циклический конфликт в семейном древе (запрет рекурсивного родства)",
				};
			}

			if (!visited.has(current)) {
				visited.add(current);
				for (const link of existingLinks) {
					if (
						link.patientId === current &&
						(link.relationshipType === "parent" || link.relationshipType === "guardian")
					) {
						queue.push(link.relatedPatientId);
					}
				}
			}
		}
	}

	return { isValid: true };
}

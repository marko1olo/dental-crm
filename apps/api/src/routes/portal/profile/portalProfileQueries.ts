/**
 * Portal Patient Profile Queries & Family Wallet Helper
 * (DOMAIN: PATIENT PORTAL - LAYER 2 DATA ACCESS)
 */

import { and, eq, inArray, or } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireAuthTokenSecret } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { familyGroups, patientRelationships, patients } from "../../../db/schema.js";
import { verifyToken } from "../../../utils/cryptoHelper.js";
import {
	portalRevokedBeforeByPatient,
	revokedPortalTokens,
} from "../portalAuthStore.js";
import { PORTAL_TOKEN_KIND } from "../types.js";

export interface VerifiedPortalProfileAuth {
	patientId: string;
	organizationId: string;
}

/**
 * Проверка Bearer токена личного кабинета пациента с защитой от отозванных сессий.
 */
export function verifyPortalProfileRequest(
	request: FastifyRequest,
	reply: FastifyReply,
): VerifiedPortalProfileAuth | null {
	const authHeader = request.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		reply.status(401);
		reply.send({ error: "Unauthorized" });
		return null;
	}

	const token = authHeader.slice("Bearer ".length).trim();
	if (!token) {
		reply.status(401);
		reply.send({ error: "Unauthorized" });
		return null;
	}

	if (revokedPortalTokens.has(token)) {
		reply.status(401);
		reply.send({ error: "SessionRevoked", message: "Сессия завершена. Войдите снова." });
		return null;
	}

	const payload = verifyToken(token, requireAuthTokenSecret());
	if (
		!payload ||
		payload.kind !== PORTAL_TOKEN_KIND ||
		typeof payload.sub !== "string" ||
		typeof payload.organizationId !== "string"
	) {
		reply.status(401);
		reply.send({ error: "Invalid token" });
		return null;
	}

	const patientId = payload.sub;
	const organizationId = payload.organizationId as string;

	const revokedBefore = portalRevokedBeforeByPatient.get(patientId);
	if (revokedBefore && typeof payload.iat === "number" && payload.iat <= revokedBefore) {
		reply.status(401);
		reply.send({ error: "SessionRevoked", message: "Сессия завершена. Войдите снова." });
		return null;
	}

	return { patientId, organizationId };
}

/**
 * Загрузка карты пациента с защитой 152-ФЗ и врачебной тайны
 * (очистка внутренних заметок врача, куратора и комиссионных ставок).
 */
export async function fetchSanitizedPatient(
	patientId: string,
	organizationId: string,
) {
	const [patient] = await db
		.select()
		.from(patients)
		.where(
			and(
				eq(patients.id, patientId),
				eq(patients.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!patient) return null;

	const { notes: _internalNotes, ...safePatient } = patient;
	let safeAdminProfile = patient.administrativeProfile;
	if (safeAdminProfile && typeof safeAdminProfile === "object") {
		const {
			curatorCommissionPercent: _comm,
			curatorNotes: _curNotes,
			dataProcessingBasisNote: _dpNote,
			...cleanProfile
		} = safeAdminProfile as Record<string, unknown>;
		safeAdminProfile = cleanProfile as any;
	}

	return {
		...safePatient,
		notes: null,
		administrativeProfile: safeAdminProfile,
	};
}

/**
 * Получение семейного кошелька и списка прикрепленных родственников.
 */
export async function fetchPatientFamilyData(
	patientId: string,
	organizationId: string,
	familyGroupId?: string | null,
) {
	let familyGroupData: {
		id: string;
		name: string | null;
		groupName: string;
		balanceRub: number;
	} | null = null;

	if (familyGroupId) {
		const [fg] = await db
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, familyGroupId),
					eq(familyGroups.organizationId, organizationId),
				),
			)
			.limit(1);
		if (fg) {
			familyGroupData = {
				id: fg.id,
				name: fg.name,
				groupName: fg.groupName,
				balanceRub: Number(fg.balance || 0),
			};
		}
	}

	const relationships = await db
		.select()
		.from(patientRelationships)
		.where(
			and(
				eq(patientRelationships.organizationId, organizationId),
				or(
					eq(patientRelationships.patientId, patientId),
					eq(patientRelationships.relatedPatientId, patientId),
				),
			),
		);

	let familyMembersList: Array<{
		id: string;
		fullName: string;
		relationshipRu: string;
		birthDate?: string | undefined;
		phone?: string | undefined;
		cardNumber?: string | undefined;
		allowSpendFamilyBalance: boolean;
		allowBooking: boolean;
	}> = [];

	if (relationships.length > 0) {
		const relatedIds = relationships.map((r) =>
			r.patientId === patientId ? r.relatedPatientId : r.patientId,
		);
		const relPatients = await db
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
				birthDate: patients.birthDate,
				administrativeProfile: patients.administrativeProfile,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					inArray(patients.id, relatedIds),
				),
			);
		const relMap = new Map(relPatients.map((p) => [p.id, p]));

		familyMembersList = relationships.map((r) => {
			const otherId = r.patientId === patientId ? r.relatedPatientId : r.patientId;
			const pInfo = relMap.get(otherId);
			const adminProf = pInfo?.administrativeProfile as Record<string, unknown> | null;
			const cardNum =
				(adminProf?.cardNumber as string | undefined) ||
				(pInfo?.id ? `043-${pInfo.id.slice(0, 6).toUpperCase()}` : undefined);
			return {
				id: otherId,
				fullName: pInfo?.fullName || "Член семьи",
				relationshipRu: r.relationshipType || "Родственник",
				birthDate: pInfo?.birthDate ? String(pInfo.birthDate) : undefined,
				phone: pInfo?.phone || undefined,
				cardNumber: cardNum,
				allowSpendFamilyBalance: Boolean(r.canSpendFamilyWallet),
				allowBooking: true,
			};
		});
	}

	return {
		familyGroup: familyGroupData,
		familyMembers: familyMembersList,
	};
}

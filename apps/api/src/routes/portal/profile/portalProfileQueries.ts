/**
 * Portal Patient Profile Queries & Family Wallet Helper
 * (DOMAIN: PATIENT PORTAL - LAYER 2 DATA ACCESS)
 */

import type { PatientAdministrativeProfile } from "@dental/shared";
import { kopecksToRubles } from "@dental/shared";
import { and, eq, inArray, or } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { withTenantReadCtx, type TenantDb } from "../../../db/rls.js";
import { familyGroups, patientRelationships, patients } from "../../../db/schema.js";
import {
	extractPortalPatient,
	hashPortalToken,
	revokedPortalTokenHashes,
	revokedPortalTokens,
} from "../portalAuthStore.js";

export interface VerifiedPortalProfileAuth {
	patientId: string;
	organizationId: string;
}

/**
 * Проверка Bearer токена личного кабинета пациента с защитой от отозванных сессий (SSOT).
 */
export async function verifyPortalProfileRequest(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<VerifiedPortalProfileAuth | null> {
	const authHeader = request.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		reply.status(401);
		reply.send({ error: "Unauthorized", message: "Токен авторизации не предоставлен." });
		return null;
	}

	const token = authHeader.slice("Bearer ".length).trim();
	if (!token) {
		reply.status(401);
		reply.send({ error: "Unauthorized", message: "Токен авторизации не предоставлен." });
		return null;
	}

	if (revokedPortalTokens.has(token) || revokedPortalTokenHashes.has(hashPortalToken(token))) {
		reply.status(401);
		reply.send({ error: "SessionRevoked", message: "Сессия завершена. Войдите снова." });
		return null;
	}

	const auth = await extractPortalPatient(request);
	if (!auth) {
		reply.status(401);
		reply.send({ error: "SessionRevoked", message: "Сессия недействительна или завершена. Войдите снова." });
		return null;
	}

	return { patientId: auth.patientId, organizationId: auth.organizationId };
}

/**
 * Загрузка карты пациента с защитой 152-ФЗ и врачебной тайны
 * (очистка внутренних заметок врача, куратора и комиссионных ставок).
 */
export async function fetchSanitizedPatient(
	patientId: string,
	organizationId: string,
	executor?: TenantDb,
) {
	const run = async (tx: TenantDb) => {
		const [patient] = await tx
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
		let safeAdminProfile: Partial<PatientAdministrativeProfile> | null = patient.administrativeProfile;
		if (safeAdminProfile && typeof safeAdminProfile === "object") {
			const {
				curatorCommissionPercent: _comm,
				curatorNotes: _curNotes,
				dataProcessingBasisNote: _dpNote,
				...cleanProfile
			} = safeAdminProfile;
			safeAdminProfile = cleanProfile;
		}

		return {
			...safePatient,
			notes: null,
			administrativeProfile: safeAdminProfile,
		};
	};
	return executor ? await run(executor) : await withTenantReadCtx(organizationId, run);
}

/**
 * Получение семейного кошелька и списка прикрепленных родственников.
 */
export async function fetchPatientFamilyData(
	patientId: string,
	organizationId: string,
	familyGroupId?: string | null,
	executor?: TenantDb,
) {
	const run = async (tx: TenantDb) => {
		let familyGroupData: {
			id: string;
			name: string | null;
			groupName: string;
			balanceRub: number;
			balanceKopecks: number;
		} | null = null;

		if (familyGroupId) {
			const [fg] = await tx
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
				const balanceKop = Number(fg.balanceKopecks || 0);
				familyGroupData = {
					id: fg.id,
					name: fg.name,
					groupName: fg.groupName,
					balanceRub:
						balanceKop !== 0
							? kopecksToRubles(balanceKop)
							: Number(fg.balance || 0),
					balanceKopecks: balanceKop,
				};
			}
		}

		const relationships = await tx
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
			const relPatients = await tx
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
			type RelPatientItem = {
				id: string;
				fullName: string;
				phone: string | null;
				birthDate: string | null;
				administrativeProfile: unknown;
			};
			const relMap = new Map<string, RelPatientItem>();
			for (const p of relPatients) {
				relMap.set(p.id, p as RelPatientItem);
			}

			familyMembersList = relationships.map((r) => {
				const otherId = r.patientId === patientId ? r.relatedPatientId : r.patientId;
				const pInfo = relMap.get(otherId);
				const adminProf = pInfo?.administrativeProfile as Record<string, unknown> | null;
				const cardNum =
					(adminProf?.cardNumber as string | undefined) ||
					(pInfo?.id ? `К-${pInfo.id.slice(0, 6).toUpperCase()}` : undefined);
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
	};
	return executor ? await run(executor) : await withTenantReadCtx(organizationId, run);
}

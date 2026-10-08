import { and, desc, eq, inArray, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireAuthTokenSecret } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	familyGroups,
	generatedDocuments,
	patientDrugAllergies,
	patientInvoices,
	patientRelationships,
	patients,
	treatmentPlans,
	users,
	visitDiaries,
} from "../../db/schema.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import {
	extractPortalPatient,
	portalRevokedBeforeByPatient,
	revokedPortalTokens,
} from "./portalAuthStore.js";
import {
	type HealthQuestionnaireBody,
	PORTAL_TOKEN_KIND,
} from "./types.js";

export async function registerPortalPatientProfileRoutes(server: FastifyInstance): Promise<void> {
	// 3. Get Patient Data (Protected: /me or /profile)
	const handleGetPortalMe = async (request: FastifyRequest, reply: FastifyReply) => {
		const authHeader = request.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const token = authHeader.slice("Bearer ".length).trim();
		if (!token) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		if (revokedPortalTokens.has(token)) {
			reply.status(401);
			return { error: "SessionRevoked", message: "Сессия завершена. Войдите снова." };
		}

		const payload = verifyToken(token, requireAuthTokenSecret());
		if (
			!payload ||
			payload.kind !== PORTAL_TOKEN_KIND ||
			typeof payload.sub !== "string" ||
			typeof payload.organizationId !== "string"
		) {
			reply.status(401);
			return { error: "Invalid token" };
		}
		const patientId = payload.sub;
		const organizationId = payload.organizationId as string;

		const revokedBefore = portalRevokedBeforeByPatient.get(patientId);
		if (revokedBefore && typeof payload.iat === "number" && payload.iat <= revokedBefore) {
			reply.status(401);
			return { error: "SessionRevoked", message: "Сессия завершена. Войдите снова." };
		}

		return withTenantCtx(organizationId, async () => {
			// Defence-in-depth: explicitly scope the query to the org recorded in the token
			const pResult = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.id, patientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);
			const patient = pResult[0];
			if (!patient) {
				reply.status(404);
				return { error: "Not found" };
			}

			const visits = await db
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.patientId, patient.id),
						eq(visitDiaries.organizationId, organizationId),
					),
				);
			const plans = await db
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.patientId, patient.id),
						eq(treatmentPlans.organizationId, organizationId),
					),
				);
			const invoices = await db
				.select()
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.patientId, patient.id),
						eq(patientInvoices.organizationId, organizationId),
					),
				);
			const documents = await db
				.select()
				.from(generatedDocuments)
				.where(
					and(
						eq(generatedDocuments.patientId, patient.id),
						eq(generatedDocuments.organizationId, organizationId),
						eq(generatedDocuments.status, "issued"),
					),
				);

			// 152-ФЗ / Врачебная тайна: Защита от утечки служебных заметок врача/ресепшн,
			// коммерческих заметок куратора и комиссионных ставок.
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
			const sanitizedPatient = {
				...safePatient,
				notes: null,
				administrativeProfile: safeAdminProfile,
			};

			// Appointments from schedule
			const patientAppointments = await db
				.select({
					id: appointments.id,
					doctorUserId: appointments.doctorUserId,
					chairId: appointments.chairId,
					startsAt: appointments.startsAt,
					endsAt: appointments.endsAt,
					status: appointments.status,
					reason: appointments.reason,
					comment: appointments.comment,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.patientId, patient.id),
						eq(appointments.organizationId, organizationId),
					),
				)
				.orderBy(desc(appointments.startsAt));

			// Clinic doctors for appointment names and online booking
			const clinicDoctors = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					specialties: users.specialties,
				})
				.from(users)
				.where(
					and(
						eq(users.organizationId, organizationId),
						eq(users.role, "doctor"),
						eq(users.isActive, true),
					),
				);

			const doctorMap = new Map(clinicDoctors.map((d) => [d.id, d]));
			const enrichedAppointments = patientAppointments.map((apt) => {
				const doc = apt.doctorUserId ? doctorMap.get(apt.doctorUserId) : null;
				return {
					...apt,
					doctorName: doc?.fullName || "Лечащий врач",
					doctorSpecialtyRu: doc?.specialties?.[0] || "Стоматолог",
				};
			});

			// Family Group & Family Shared Balance
			let familyGroupData: {
				id: string;
				name: string | null;
				groupName: string;
				balanceRub: number;
			} | null = null;

			if (patient.familyGroupId) {
				const [fg] = await db
					.select()
					.from(familyGroups)
					.where(
						and(
							eq(familyGroups.id, patient.familyGroupId),
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

			// Patient Relationships (Family Members)
			const relationships = await db
				.select()
				.from(patientRelationships)
				.where(
					and(
						eq(patientRelationships.organizationId, organizationId),
						or(
							eq(patientRelationships.patientId, patient.id),
							eq(patientRelationships.relatedPatientId, patient.id),
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
					r.patientId === patient.id ? r.relatedPatientId : r.patientId,
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
					const otherId = r.patientId === patient.id ? r.relatedPatientId : r.patientId;
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
				patient: sanitizedPatient,
				visits,
				plans,
				invoices,
				documents,
				appointments: enrichedAppointments,
				familyGroup: familyGroupData,
				familyMembers: familyMembersList,
				doctors: clinicDoctors,
			};
		});
	};

	server.get("/me", handleGetPortalMe);
	server.get("/profile", handleGetPortalMe);

	// 7. Get Somatic Health Questionnaire & Clinical Risk Factor Alerts (Protected)
	server.get("/health-questionnaire", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const [patientRow] = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					administrativeProfile: patients.administrativeProfile,
				})
				.from(patients)
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				)
				.limit(1);

			if (!patientRow) {
				reply.status(404);
				return { error: "Not found" };
			}

			const profile =
				(patientRow.administrativeProfile as Record<string, unknown> | null) || {};
			const questionnaire = profile.somaticQuestionnaire || null;
			const somaticProfile = profile.somaticRiskProfile || null;
			const alerts = profile.somaticAlerts || [];
			const riskLevel = profile.somaticRiskLevel || "low";
			const updatedAt = profile.somaticUpdatedAt || null;

			return {
				questionnaire,
				somaticProfile,
				alerts,
				riskLevel,
				updatedAt,
			};
		});
	});

	// 8. Submit/Update Somatic Health Questionnaire (Protected)
	server.post<{
		Body: HealthQuestionnaireBody;
	}>("/health-questionnaire", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const body = request.body || {};
		const allergies = body.allergies || {};
		const cardiovascular = body.cardiovascular || {};
		const diabetes = body.diabetes || {};
		const coagulation = body.coagulation || {};
		const pregnancy = body.pregnancy || {};
		const respiratory = body.respiratory || {};

		// Evaluate Somatic Risk Profile and Alerts
		const hasSulfiteAllergy = Boolean(
			allergies.sulfiteAllergy ||
				(allergies.details && /сульфит|метабисульфит/i.test(allergies.details)),
		);
		const hasLocalAnestheticsAllergy = Boolean(
			allergies.localAnestheticsAllergy ||
				(allergies.details && /анестетик|новокаин|лидокаин|ультракаин/i.test(allergies.details)),
		);
		const hasPenicillinAllergy = Boolean(
			allergies.antibioticsAllergy ||
				(allergies.details &&
					/пенициллин|амоксициллин|амоксиклав|аугментин|ампициллин|цефалоспорин|бета-лактам|penicillin|amoxicillin/i.test(
						allergies.details,
					)) ||
				(Array.isArray(allergies.drugList) &&
					allergies.drugList.some((d) =>
						/пенициллин|амоксициллин|амоксиклав|аугментин|ампициллин|цефалоспорин|бета-лактам|penicillin|amoxicillin/i.test(
							d,
						),
					)),
		);
		const hasBronchialAsthma = Boolean(
			respiratory.bronchialAsthma ||
				(allergies.details && /астма/i.test(allergies.details)),
		);
		const hasCardio = Boolean(
			cardiovascular.hasRisk ||
				cardiovascular.hypertension ||
				cardiovascular.arrhythmia ||
				cardiovascular.ischemicHeartDisease ||
				cardiovascular.heartAttackHistory ||
				cardiovascular.pacemaker,
		);
		const hasCoagulation = Boolean(
			coagulation.hasBleedingDisorder ||
				coagulation.onAnticoagulants ||
				coagulation.hemophilia,
		);
		const hasDiabetes = Boolean(diabetes.hasDiabetes);
		const isPregnantOrLactating = Boolean(pregnancy.isPregnantOrLactating);

		const alerts: Array<{
			id: string;
			severity: "danger" | "warning" | "caution" | "info";
			title: string;
			message: string;
			recommendedAction: string;
		}> = [];

		// Danger 1: Sulfite Allergy / Bronchial Asthma
		if (hasSulfiteAllergy || (hasBronchialAsthma && hasSulfiteAllergy)) {
			alerts.push({
				id: "alert_sulfite_asthma",
				severity: "danger",
				title: "АЛЛЕРГОАНАМНЕЗ: Аллергия на сульфиты / риск бронхоспазма",
				message:
					"У пациента аллергия на сульфиты или бронхиальная астма. Противопоказаны анестетики с консервантом метабисульфитом натрия (Ультракаин Д-С, Септанест).",
				recommendedAction:
					"Применять Скандонест 3% (Мепивакаин без сульфитов и адреналина).",
			});
		}

		// Danger 2: Local Anesthetic Allergy
		if (hasLocalAnestheticsAllergy) {
			alerts.push({
				id: "alert_local_anesthetics_allergy",
				severity: "danger",
				title: "АЛЛЕРГОАНАМНЕЗ: Гиперчувствительность к местным анестетикам",
				message:
					"Пациент указывает на реакцию на местные анестетики. Требуется проведение аллергопробы и подбор альтернативного препарата.",
				recommendedAction: "Консультация аллерголога, премедикация, безадреналиновый протокол.",
			});
		}

		// Danger 3: Penicillin / Beta-lactam Antibiotics Allergy
		if (hasPenicillinAllergy) {
			alerts.push({
				id: "alert_penicillin_allergy",
				severity: "danger",
				title: "АЛЛЕРГОАНАМНЕЗ: Аллергия на пенициллины и бета-лактамы",
				message:
					"Пациент указывает на аллергию к антибиотикам пенициллинового ряда. Категорически противопоказаны Амоксициллин, Амоксиклав, Аугментин, Цефалоспорины.",
				recommendedAction:
					"Препараты выбора при антибиотикопрофилактике: Кларитромицин, Азитромицин, Линкомицин или Клиндамицин.",
			});
		}

		// Danger 4: Blood Coagulation / Anticoagulants
		if (hasCoagulation) {
			alerts.push({
				id: "alert_coagulation_anticoagulants",
				severity: "danger",
				title: "ГЕМОСТАЗ: Нарушение свертываемости крови / Антикоагулянты",
				message:
					"Пациент принимает антикоагулянты или имеет гемофилию. Высокий риск луночкового или интраоперационного кровотечения.",
				recommendedAction:
					"Обязательный гемостаз лунки (коллагеновая губка, швы), мониторинг свертываемости.",
			});
		}

		// Warning 1: Cardiovascular Pathology
		if (hasCardio) {
			alerts.push({
				id: "alert_cardio_pathology",
				severity: "warning",
				title: "КАРДИОВАСКУЛЯРНЫЙ РИСК: Гипертензия / ИБС / Аритмия",
				message:
					"Сердечно-сосудистая патология. Лимит эпинефрина: не более 0.04 мг (макс. 2 карпулы 1:100 000 или 4 карпулы 1:200 000).",
				recommendedAction:
					"Контроль АД перед приемом. При гипертонии — Скандонест 3% без вазоконстриктора.",
			});
		}

		// Warning 2: Pregnancy / Lactation
		if (isPregnantOrLactating) {
			alerts.push({
				id: "alert_pregnancy_status",
				severity: "warning",
				title: "АКУШЕРСКИЙ СТАТУС: Беременность / Лактация",
				message:
					"Препарат выбора — Артикаин 1:200 000 (Ультракаин Д-С) с минимальной дозой. Избегать высокой концентрации адреналина (1:100 000).",
				recommendedAction: "Ультракаин Д-С 1:200 000 в минимально эффективном объеме.",
			});
		}

		// Warning 3: Diabetes
		if (hasDiabetes) {
			alerts.push({
				id: "alert_diabetes_mellitus",
				severity: "warning",
				title: "ЭНДОКРИНОЛОГИЯ: Сахарный диабет",
				message:
					"Риск замедленной эпителизации, снижения остеоинтеграции имплантатов и инфекционных осложнений.",
				recommendedAction: "Антисептический протокол, атравматичная хирургия, контроль заживления.",
			});
		}

		const hasDanger = alerts.some((a) => a.severity === "danger");
		const hasWarning = alerts.some((a) => a.severity === "warning");
		const riskLevel: "high" | "moderate" | "low" = hasDanger
			? "high"
			: hasWarning
				? "moderate"
				: "low";

		const somaticProfile = {
			hasCardiovascularRisk: hasCardio,
			hasSulfiteAllergy,
			hasLocalAnestheticsAllergy,
			hasPenicillinAllergy,
			hasBronchialAsthma,
			hasBleedingDisorder: hasCoagulation,
			hasDiabetes,
			isPregnantOrLactating,
			customNotes: body.additionalNotes || undefined,
		};

		const now = new Date();
		const nowIso = now.toISOString();

		return withTenantCtx(auth.organizationId, async () => {
			const [patientRow] = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				)
				.limit(1);

			if (!patientRow) {
				reply.status(404);
				return { error: "PatientNotFound" };
			}

			const currentProfile =
				(patientRow.administrativeProfile as Record<string, unknown> | null) || {};

			// Update administrative profile
			await db
				.update(patients)
				.set({
					administrativeProfile: {
						...currentProfile,
						somaticQuestionnaire: body,
						somaticRiskProfile: somaticProfile,
						somaticAlerts: alerts,
						somaticRiskLevel: riskLevel,
						somaticUpdatedAt: nowIso,
					} as any,
					updatedAt: now,
				})
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				);

			// Build consolidated drug allergy list for patientDrugAllergies
			const drugListToInsert: string[] = Array.isArray(allergies.drugList)
				? [...allergies.drugList]
				: [];

			if (
				hasPenicillinAllergy &&
				!drugListToInsert.some((d) =>
					/пенициллин|амоксициллин|амоксиклав|аугментин|ампициллин/i.test(d),
				)
			) {
				drugListToInsert.push("Антибиотики пенициллинового ряда (Амоксициллин/Амоксиклав)");
			}
			if (
				hasLocalAnestheticsAllergy &&
				!drugListToInsert.some((d) =>
					/анестетик|новокаин|лидокаин|ультракаин/i.test(d),
				)
			) {
				drugListToInsert.push("Местные анестетики");
			}
			if (
				hasSulfiteAllergy &&
				!drugListToInsert.some((d) => /сульфит/i.test(d))
			) {
				drugListToInsert.push("Сульфиты / метабисульфит натрия");
			}

			if (
				drugListToInsert.length > 0 &&
				(allergies.hasAllergies ||
					hasPenicillinAllergy ||
					hasLocalAnestheticsAllergy ||
					hasSulfiteAllergy)
			) {
				await db.insert(patientDrugAllergies).values(
					drugListToInsert.map((drugName) => ({
						organizationId: auth.organizationId,
						patientId: auth.patientId,
						allergenGroup: "Лекарственные препараты",
						drugInnLatin: drugName,
						reactionSeverity: "high",
						clinicalManifestations:
							allergies.details || "Указано пациентом при заполнении анкеты здоровья в личном кабинете",
						isConfirmedByAllergist: false,
					})),
				);
			}

			return {
				success: true,
				somaticProfile,
				alerts,
				riskLevel,
				updatedAt: nowIso,
			};
		});
	});
}

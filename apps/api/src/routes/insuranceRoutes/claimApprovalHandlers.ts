import {
	calculateDmsGuaranteeSplit,
	kopecksToRubles,
	resolveValidIanaTimeZone,
	rublesToKopecks,
	shiftCalendarDay,
	todayDateKeyInTimeZone,
	type DmsGuaranteeLetter,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { dmsGuaranteeLetters, insuranceContracts, patients } from "../../db/schema.js";
import { clinicTimeZone } from "../../services/reports/managerReports/timezone.js";
import { INSURER_NAMES } from "./constants.js";
import { resolveDbKopecks } from "./guaranteeLetterModules/guaranteeLetterFormatters.js";
import {
	preAuthRequestBodySchema,
	splitInvoiceBodySchema,
	transitionStatusBodySchema,
} from "./types.js";

export async function registerClaimApprovalRoutes(app: FastifyInstance) {
	// POST /api/insurance/split-invoice: calculate exact split between DMS share and patient co-pay
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/insurance/split-invoice",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"insurance split invoice",
			);
			if (!orgId) return;

			const parsed = splitInvoiceBodySchema.safeParse(request.body);
			if (!parsed.success) {
				const msg = parsed.error.issues[0]?.message ?? "Проверьте перечень услуг для разделения счёта.";
				return reply.code(400).send({
					error: "ValidationError",
					message: msg,
					details: parsed.error.issues,
				});
			}

			const { letterId, contractId, visitDate, items } = parsed.data;

			const { letter, contract, clinicTz } = await withTenantReadCtx(orgId, async (tx) => {
			const resolvedClinicTz = resolveValidIanaTimeZone(await clinicTimeZone(orgId, tx));
			let resolvedLetter: DmsGuaranteeLetter | null = null;
			if (letterId) {
				const [foundLetter] = await tx
					.select()
					.from(dmsGuaranteeLetters)
					.where(
						and(
							eq(dmsGuaranteeLetters.id, letterId),
							eq(dmsGuaranteeLetters.organizationId, orgId),
						),
					)
					.limit(1);

				if (foundLetter) {
					const maxCoverageKop = resolveDbKopecks(foundLetter.maxCoverageKopecks, foundLetter.maxCoverageRub);
					const usedAmountKop = resolveDbKopecks(foundLetter.usedAmountKopecks, foundLetter.usedAmountRub);
					const franchiseFixedKop = resolveDbKopecks(foundLetter.franchiseFixedKopecks, foundLetter.franchiseFixedRub);
					resolvedLetter = {
						id: foundLetter.id,
						organizationId: foundLetter.organizationId,
						contractId: foundLetter.contractId,
						patientId: foundLetter.patientId,
						patientFullName: foundLetter.patientFullName,
						patientBirthDate: foundLetter.patientBirthDate,
						policyNumber: foundLetter.policyNumber,
						insurerKey: foundLetter.insurerKey,
						insurerName: foundLetter.insurerName,
						letterNumber: foundLetter.letterNumber,
						issueDate: foundLetter.issueDate,
						validFrom: foundLetter.validFrom,
						validUntil: foundLetter.validUntil,
						maxCoverageRub: kopecksToRubles(maxCoverageKop),
						usedAmountRub: kopecksToRubles(usedAmountKop),
						franchisePct: Number(foundLetter.franchisePct),
						franchiseType: (foundLetter.franchiseType as "percent" | "fixed_rub") || "percent",
						franchiseFixedRub: kopecksToRubles(franchiseFixedKop),
						programExclusions: (foundLetter.programExclusions as string[]) || [],
						approvedServiceCodes: (foundLetter.approvedServiceCodes as string[]) || [],
						approvedServiceCodes804n: (foundLetter.approvedServiceCodes as string[]) || [],
						approvedTeethFdi: (foundLetter.approvedTeethFdi as string[]) || [],
						approvedDiagnosisCodes: (foundLetter.approvedDiagnosisCodes as string[]) || [],
						approvedDiagnosisMkb10: (foundLetter.approvedDiagnosisCodes as string[]) || [],
						curatorFullName: foundLetter.curatorFullName,
						curatorPhone: foundLetter.curatorPhone,
						notes: foundLetter.notes,
						status: (foundLetter.status as DmsGuaranteeLetter["status"]) || "active",
						createdAt: foundLetter.createdAt.toISOString(),
						updatedAt: foundLetter.updatedAt.toISOString(),
					};
				}
			}

			let resolvedContract: {
				coverageTherapyPct: number;
				coverageSurgeryPct: number;
				coverageOrthoPct: number;
				coverageHygienePct: number;
				annualLimitRub: number | null;
			} | null = null;

			if (contractId) {
				const [found] = await tx
					.select()
					.from(insuranceContracts)
					.where(
						and(
							eq(insuranceContracts.id, contractId),
							eq(insuranceContracts.organizationId, orgId),
						),
					)
					.limit(1);

				if (found && found.isActive) {
					const annualLimitKop = resolveDbKopecks(found.annualLimitKopecks, found.annualLimitRub);
					resolvedContract = {
						coverageTherapyPct: Number(found.coverageTherapyPct),
						coverageSurgeryPct: Number(found.coverageSurgeryPct),
						coverageOrthoPct: Number(found.coverageOrthoPct),
						coverageHygienePct: Number(found.coverageHygienePct),
						annualLimitRub:
							annualLimitKop > 0
								? kopecksToRubles(annualLimitKop)
								: found.annualLimitRub != null
									? Number(found.annualLimitRub)
									: null,
					};
				}
			}

			return { letter: resolvedLetter, contract: resolvedContract, clinicTz: resolvedClinicTz };
		});

		const splitResult = calculateDmsGuaranteeSplit(letter, items, {
			visitDate: visitDate || todayDateKeyInTimeZone(clinicTz),
			contract,
			isEmergency: parsed.data.isEmergency,
			hasAcutePain: parsed.data.hasAcutePain,
		});

		return reply.code(200).send(splitResult);
		},
	});

	// POST /api/insurance/claims/transition-status: atomically transition guarantee letter state in PostgreSQL
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/insurance/claims/transition-status",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"insurance status transition",
			);
			if (!orgId) return;

			const parsed = transitionStatusBodySchema.safeParse(request.body);
			if (!parsed.success) {
				const msg = parsed.error.issues[0]?.message ?? "Проверьте параметры перехода статуса гарантийного письма.";
				return reply.code(400).send({
					error: "ValidationError",
					message: msg,
					details: parsed.error.issues,
				});
			}

			const { letterId, status, notes, resolutionReason } = parsed.data;

			const txResult = await withTenantWriteCtx(orgId, async (tx) => {
				const [letter] = await tx
					.select()
					.from(dmsGuaranteeLetters)
					.where(
						and(
							eq(dmsGuaranteeLetters.id, letterId),
							eq(dmsGuaranteeLetters.organizationId, orgId),
						),
					)
					.for("update")
					.limit(1);

				if (!letter) {
					return {
						status: 404,
						error: {
							error: "LetterNotFound",
							message: "Гарантийное письмо не найдено в вашей клинике.",
						},
					};
				}

				let updatedNotes = letter.notes || "";
				if (resolutionReason) {
					const timestamp = new Date().toLocaleString("ru-RU");
					updatedNotes = updatedNotes
						? `${updatedNotes}\n[${timestamp}] Смена статуса на "${status}": ${resolutionReason}`
						: `[${timestamp}] Смена статуса на "${status}": ${resolutionReason}`;
				}
				if (notes) {
					updatedNotes = updatedNotes ? `${updatedNotes}\n${notes}` : notes;
				}

				const [updated] = await tx
					.update(dmsGuaranteeLetters)
					.set({
						status,
						notes: updatedNotes,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(dmsGuaranteeLetters.id, letterId),
							eq(dmsGuaranteeLetters.organizationId, orgId),
						),
					)
					.returning();

				if (!updated) {
					return {
						status: 404,
						error: {
							error: "guarantee_letter_not_found",
							message: "Гарантийное письмо не найдено или не принадлежит организации",
						},
					};
				}

				return {
					status: 200,
					data: {
						success: true,
						letterId: updated.id,
						status: updated.status,
						notes: updated.notes,
						updatedAt: updated.updatedAt.toISOString(),
					},
				};
			});

			if (txResult.status !== 200 || !txResult.data) {
				return reply.code(txResult.status).send(txResult.error);
			}

			return reply.code(200).send(txResult.data);
		},
	});

	// POST /api/insurance/pre-auth/request: record or dispatch pre-authorization request to insurance curator
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/insurance/pre-auth/request",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"insurance pre-auth request",
			);
			if (!orgId) return;

			const parsed = preAuthRequestBodySchema.safeParse(request.body);
			if (!parsed.success) {
				const msg = parsed.error.issues[0]?.message ?? "Проверьте данные запроса на предварительное согласование.";
				return reply.code(400).send({
					error: "ValidationError",
					message: msg,
					details: parsed.error.issues,
				});
			}

			const d = parsed.data;

			if (d.letterId) {
				const targetLetterId = d.letterId;
				// Update existing letter to pending_approval in ACID transaction
				const txResult = await withTenantWriteCtx(orgId, async (tx) => {
					const [existing] = await tx
						.select()
						.from(dmsGuaranteeLetters)
						.where(
							and(
								eq(dmsGuaranteeLetters.id, targetLetterId),
								eq(dmsGuaranteeLetters.organizationId, orgId),
							),
						)
						.for("update")
						.limit(1);

					if (!existing) {
						return {
							status: 404,
							error: {
								error: "LetterNotFound",
								message: "Гарантийное письмо для согласования не найдено.",
							},
						};
					}

					const updatePayload: Partial<typeof dmsGuaranteeLetters.$inferInsert> = {
						status: "pending_approval",
						updatedAt: new Date(),
					};
					if (d.curatorFullName) updatePayload.curatorFullName = d.curatorFullName.trim();
					if (d.curatorPhone) updatePayload.curatorPhone = d.curatorPhone.trim();
					if (d.serviceCodes && d.serviceCodes.length > 0) updatePayload.approvedServiceCodes = d.serviceCodes;
					if (d.teethFdi && d.teethFdi.length > 0) updatePayload.approvedTeethFdi = d.teethFdi;
					if (d.diagnosisCodes && d.diagnosisCodes.length > 0) updatePayload.approvedDiagnosisCodes = d.diagnosisCodes;
					if (d.notes) {
						const existingNotes = existing.notes ? `${existing.notes}\n` : "";
						updatePayload.notes = `${existingNotes}[Запрос согласования] ${d.notes}`;
					}

					const [updated] = await tx
						.update(dmsGuaranteeLetters)
						.set(updatePayload)
						.where(
							and(
								eq(dmsGuaranteeLetters.id, targetLetterId),
								eq(dmsGuaranteeLetters.organizationId, orgId),
							),
						)
						.returning();

					if (!updated) {
						return {
							status: 404,
							error: {
								error: "guarantee_letter_not_found",
								message: "Гарантийное письмо не найдено или не принадлежит организации",
							},
						};
					}

					return {
						status: 200,
						data: {
							success: true,
							letterId: updated.id,
							status: updated.status,
							curatorFullName: updated.curatorFullName,
							curatorPhone: updated.curatorPhone,
							message: "Запрос на предварительное согласование отправлен куратору страховой компании.",
						},
					};
				});

				if (txResult.status !== 200 || !txResult.data) {
					return reply.code(txResult.status).send(txResult.error);
				}

				return reply.code(200).send(txResult.data);
			} else {
				// Create a draft pre-auth letter in pending_approval in ACID transaction
				const txResult = await withTenantWriteCtx(orgId, async (tx) => {
					const clinicTz = resolveValidIanaTimeZone(await clinicTimeZone(orgId, tx));
					const todayIso = todayDateKeyInTimeZone(clinicTz);
					const nextMonthIso = shiftCalendarDay(todayIso, 30);

					// Mandate 8z/8bd: BOLA/IDOR protection - verify patient belongs to current clinic organization
					const [patientRecord] = await tx
						.select({
							id: patients.id,
							fullName: patients.fullName,
							birthDate: patients.birthDate,
						})
						.from(patients)
						.where(
							and(
								eq(patients.id, d.patientId),
								eq(patients.organizationId, orgId),
							),
						)
						.limit(1);

					if (!patientRecord) {
						return {
							status: 404,
							error: {
								error: "PatientNotFound",
								message: "Пациент не найден в вашей клинике.",
							},
						};
					}

					let contractCompanyName = "";
					if (d.contractId) {
						const [contractRecord] = await tx
							.select({
								id: insuranceContracts.id,
								companyName: insuranceContracts.companyName,
							})
							.from(insuranceContracts)
							.where(
								and(
									eq(insuranceContracts.id, d.contractId),
									eq(insuranceContracts.organizationId, orgId),
								),
							)
							.limit(1);

						if (!contractRecord) {
							return {
								status: 404,
								error: {
									error: "ContractNotFound",
									message: "Договор ДМС не найден в вашей клинике.",
								},
							};
						}
						contractCompanyName = contractRecord.companyName;
					}

					const estimatedCostKop =
						d.estimatedCostKopecks ??
						(d.estimatedCostRub !== undefined ? rublesToKopecks(d.estimatedCostRub) : 0);
					const estimatedCostRub = kopecksToRubles(estimatedCostKop);
					const resolvedInsurerName =
						d.insurerName?.trim() ||
						(d.insurerKey ? INSURER_NAMES[d.insurerKey] || "" : "") ||
						contractCompanyName;

					const [created] = await tx
						.insert(dmsGuaranteeLetters)
						.values({
							organizationId: orgId,
							contractId: d.contractId ?? null,
							patientId: d.patientId,
							patientFullName: d.patientFullName?.trim() || patientRecord.fullName,
							patientBirthDate: d.patientBirthDate ?? patientRecord.birthDate ?? null,
							policyNumber: d.policyNumber?.trim() || "",
							insurerKey: d.insurerKey || "custom",
							insurerName: resolvedInsurerName,
							letterNumber: `REQ-${Date.now().toString(36).toUpperCase()}`,
							issueDate: todayIso,
							validFrom: todayIso,
							validUntil: nextMonthIso,
							maxCoverageRub: estimatedCostRub,
							maxCoverageKopecks: BigInt(estimatedCostKop),
							usedAmountRub: 0,
							usedAmountKopecks: 0n,
							franchisePct: 0,
							franchiseType: "percent",
							franchiseFixedRub: 0,
							franchiseFixedKopecks: 0n,
							programExclusions: [],
							approvedServiceCodes: d.serviceCodes ?? [],
							approvedTeethFdi: d.teethFdi ?? [],
							approvedDiagnosisCodes: d.diagnosisCodes ?? [],
							curatorFullName: d.curatorFullName?.trim() ?? null,
							curatorPhone: d.curatorPhone?.trim() ?? null,
							notes: d.notes ? `[Предварительное согласование] ${d.notes}` : "Запрос на предварительное согласование",
							status: "pending_approval",
						})
						.returning();

					if (!created) {
						return {
							status: 500,
							error: {
								error: "guarantee_letter_creation_failed",
								message: "Не удалось создать гарантийное письмо",
							},
						};
					}

					return {
						status: 201,
						data: {
							success: true,
							letterId: created.id,
							status: created.status,
							estimatedCostKopecks: estimatedCostKop,
							curatorFullName: created.curatorFullName,
							curatorPhone: created.curatorPhone,
							message: "Создан запрос на предварительное согласование со статусом ожидания ответа куратора.",
						},
					};
				});

				if (txResult.status !== 201 || !txResult.data) {
					return reply.code(txResult.status).send(txResult.error);
				}

				return reply.code(201).send(txResult.data);
			}
		},
	});
}

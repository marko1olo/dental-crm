/**
 * apps/api/src/routes/surgery/index.ts
 *
 * Dedicated Fastify route plugin for Outpatient Surgery & Dental Implantology.
 * Standards:
 * - Mandate 8e: Doctor & nurse autonomy at the dental chair (zero blocking disabled buttons, 1-click write-offs).
 * - Mandate 8i: Strictly outpatient dental chair bounded context (no hospital bed-days, laparotomy, ICU, transfusion bloat).
 * - Mandate 8s: Universal anti-bloat (single canonical source, zero fake procedural dioramas).
 * - Mandate 8n: Solo doctor & small clinic sovereignty (soft warehouse overdraft, no 3-person commissions).
 * - SanPiN 3.3686-21: Carpule anesthetics are Class B medical waste, disposed in 1 click without narcotic PKU.
 */

import {
	CANONICAL_SURGICAL_OPERATION_NORMS,
	createSurgicalProtocolSchema,
	surgicalQuickDeductSchema,
	evaluateWarehouseOverdraft,
	rublesToKopecks,
	kopecksToRubles,
	parseKopecks,
} from "@dental/shared";
import { and, desc, eq, notInArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { defineTenantMutation, defineTenantQuery } from "../../core/routeFactories.js";
import { onTenantTxCommit, type TenantDb } from "../../db/rls.js";
import { inventoryQuery } from "../../db/inventoryQuery.js";
import {
	patientInvoices,
	patients,
	serviceCatalogItems,
	toothStateHistory,
	toothStates,
	treatmentItems,
	visits,
} from "../../db/schema.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { TreatmentConsumablesService, type UnifiedStockDeductionResult } from "../../services/treatmentConsumablesService.js";

function resolveInvoiceTotalKopecks(invoice: {
	totalPriceKopecks?: bigint | null;
	totalAmountRub?: string | number | null;
	totalRub?: string | number | null;
}): bigint {
	const legacyKopecks = BigInt(parseKopecks(invoice.totalAmountRub ?? invoice.totalRub ?? 0));
	if (typeof invoice.totalPriceKopecks === "bigint" && (invoice.totalPriceKopecks > 0n || legacyKopecks === 0n)) {
		return invoice.totalPriceKopecks;
	}
	return legacyKopecks;
}

async function resolveCatalogServicePriceKopecks(
	tx: TenantDb,
	orgId: string,
	code: string,
	fallbackKopecks: bigint,
): Promise<bigint> {
	if (!code) return fallbackKopecks;
	const [catalogRow] = await tx
		.select({
			priceKopecks: serviceCatalogItems.priceKopecks,
			priceRub: serviceCatalogItems.priceRub,
		})
		.from(serviceCatalogItems)
		.where(
			and(
				eq(serviceCatalogItems.organizationId, orgId),
				eq(serviceCatalogItems.code, code),
				eq(serviceCatalogItems.isActive, true),
			),
		)
		.limit(1);
	if (!catalogRow) return fallbackKopecks;
	const legacyKop = BigInt(rublesToKopecks(Number(catalogRow.priceRub ?? 0)));
	if (typeof catalogRow.priceKopecks === "bigint" && (catalogRow.priceKopecks > 0n || legacyKop === 0n)) {
		return catalogRow.priceKopecks;
	}
	return legacyKop;
}

export async function registerSurgeryRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * 1. GET /api/surgery/protocols/templates
	 * Возвращает шаблоны хирургических протоколов с физиологической нормой по умолчанию
	 * (Код услуги прейскуранта, Медицинская карта приёма, Мандаты 8e, 8i).
	 */
	defineTenantQuery(app, {
		method: "GET",
		path: "/api/surgery/protocols/templates",
		permission: "clinical.read",
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		query: async () => ({
			success: true,
			count: CANONICAL_SURGICAL_OPERATION_NORMS.length,
			templates: CANONICAL_SURGICAL_OPERATION_NORMS,
		}),
	});

	/**
	 * 2. POST /api/surgery/protocols
	 * Регистрация протокола амбулаторной операции в медицинской карте приёма и дневнике приёма (Мандаты 8e, 8i).
	 * Автоматически вносит дневник операции без бюрократических барьеров.
	 */
	defineTenantMutation(app, {
		method: "POST",
		path: "/api/surgery/protocols",
		permission: "clinical.write",
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "optional_header",
		bodySchema: createSurgicalProtocolSchema,
		validationErrorCode: "SurgicalProtocolValidationError",
		validationErrorMessage: "Некорректные параметры хирургического протокола.",
		execute: async ({ tx, principal, organizationId: orgId, body: input, request, reply }) => {
			const targetPatientId = input.patientId;

			const SCENARIO_NORM_ALIASES: Record<string, string> = {
				"scen-extraction": "surgery_extraction_simple",
				"scen-resection": "surgery_periostotomy",
				"scen-sinus-gbr": "surgery_sinus_lift_gbr",
				"scen-implant": "surgery_implant_standard",
			};
			const effectiveNormId = SCENARIO_NORM_ALIASES[input.normId] || input.normId;
			const norm = CANONICAL_SURGICAL_OPERATION_NORMS.find(
				(n) => n.id === effectiveNormId || n.id === input.normId,
			);

			const isImplant =
				effectiveNormId.toLowerCase().includes("implant") || norm?.category === "implant";

			// [SEV-1] Анатомический гейт: блокировка имплантации в молочные зубы (FDI 51–85)
			const targetTeeth: number[] = [];
			if (input.toothNumberFdi) {
				targetTeeth.push(input.toothNumberFdi);
			}
			for (const t of input.teeth) {
				if (!targetTeeth.includes(t)) {
					targetTeeth.push(t);
				}
			}

			if (isImplant) {
				for (const toothNum of targetTeeth) {
					if (toothNum >= 51 && toothNum <= 85) {
						return reply.code(422).send({
							error: "DeciduousToothImplantForbidden",
							message: `Установка дентального имплантата в область молочного зуба (#${toothNum}) категорически запрещена анатомическим протоколом`,
						});
					}
				}
			}

			const [patient] = await tx
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(and(eq(patients.id, targetPatientId), eq(patients.organizationId, orgId)))
				.for("update")
				.limit(1);

			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден в текущей клинике.",
				});
			}

			let visitUpdated = false;
			let targetVisitId = input.visitId ?? null;

			if (!targetVisitId) {
				const [lastVisit] = await tx
					.select({ id: visits.id, objectiveStatus: visits.objectiveStatus })
					.from(visits)
					.where(and(eq(visits.patientId, targetPatientId), eq(visits.organizationId, orgId)))
					.orderBy(desc(visits.createdAt))
					.limit(1);
				if (lastVisit) targetVisitId = lastVisit.id;
			}

			// Обновляем объективный статус / дневник операции приёма EMR (Мандат 8wy)
			if (targetVisitId) {
				const [visit] = await tx
					.select()
					.from(visits)
					.where(and(eq(visits.id, targetVisitId), eq(visits.organizationId, orgId)))
					.limit(1);

				if (visit) {
					const existingObj = visit.objectiveStatus || "";
					const teethSuffix = targetTeeth.length > 0 ? ` (FDI #${targetTeeth.join(", #")})` : "";
					const formattedEntry = `[ПРОТОКОЛ ОПЕРАЦИИ: ${norm?.title || effectiveNormId}${teethSuffix}]\n${input.protocolText}`;
					const updatedObj = existingObj ? `${existingObj}\n\n${formattedEntry}` : formattedEntry;

					await tx
						.update(visits)
						.set({
							objectiveStatus: updatedObj,
							updatedAt: new Date(),
						})
						.where(and(eq(visits.id, visit.id), eq(visits.organizationId, orgId)));

					visitUpdated = true;
				}
			}

			// Если указаны номера зубов, фиксируем факт вмешательства в состоянии зубов
			const isExtraction =
				effectiveNormId.toLowerCase().includes("extract") || norm?.category === "extraction";
			const newState = isImplant ? "Implant" : isExtraction ? "Extracted" : "Treated";
			const newSurfaces = isImplant
				? ["implant_site"]
				: isExtraction
					? ["extracted_socket"]
					: ["cured_apical"];

			for (const currentToothNum of targetTeeth) {
				const [existingTooth] = await tx
					.select()
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, orgId),
							eq(toothStates.patientId, targetPatientId),
							eq(toothStates.toothNumber, currentToothNum),
						),
					)
					.limit(1);

				const existingSurfaces = Array.isArray(existingTooth?.surfaces)
					? existingTooth.surfaces.filter((s): s is string => typeof s === "string")
					: [];
				const mergedSurfaces = Array.from(new Set([...existingSurfaces, ...newSurfaces]));

				const opNote = `Хирургическая операция: ${norm?.title || effectiveNormId}`;
				const mergedNotes = existingTooth?.notes
					? `${existingTooth.notes}; ${opNote}`
					: opNote;

				if (existingTooth) {
					await tx
						.update(toothStates)
						.set({
							state: newState,
							surfaces: mergedSurfaces,
							notes: mergedNotes,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(toothStates.organizationId, orgId),
								eq(toothStates.patientId, targetPatientId),
								eq(toothStates.toothNumber, currentToothNum),
							),
						);
				} else {
					await tx.insert(toothStates).values({
						organizationId: orgId,
						patientId: targetPatientId,
						toothNumber: currentToothNum,
						state: newState,
						surfaces: mergedSurfaces,
						notes: mergedNotes,
					});
				}

				await tx.insert(toothStateHistory).values({
					organizationId: orgId,
					patientId: targetPatientId,
					toothNumber: currentToothNum,
					newState,
					newSurfaces: mergedSurfaces,
					reason: `Хирургическая операция: ${norm?.title || effectiveNormId}`,
				});
			}

			// Фиксация в счете/смете пациента (Мандат 8wy, 8bm, SSOT)
			const candidateServices: Array<{
				code: string;
				nameRu: string;
				priceKopecks: bigint;
				quantity: number;
				toothNumber?: number | undefined;
				isPrimary?: boolean | undefined;
			}> = [];

			const incomingServices =
				input.services && input.services.length > 0
					? input.services
					: input.services804n && input.services804n.length > 0
						? input.services804n
						: null;

			if (incomingServices && incomingServices.length > 0) {
				for (const s of incomingServices) {
					const fallbackKopecks =
						s.priceKopecks != null
							? BigInt(s.priceKopecks)
							: BigInt(rublesToKopecks(Number(s.priceRub ?? s.suggestedPriceRub ?? 0)));
					const unitPriceKopecks = await resolveCatalogServicePriceKopecks(tx, orgId, s.code, fallbackKopecks);
					candidateServices.push({
						code: s.code,
						nameRu: s.nameRu ?? s.name ?? norm?.title ?? "Хирургическая манипуляция",
						priceKopecks: unitPriceKopecks,
						quantity: s.quantity && s.quantity > 0 ? s.quantity : 1,
						toothNumber: s.toothNumber ?? undefined,
						isPrimary: s.isPrimary,
					});
				}
			} else {
				const fallbackCatalog =
					norm?.order804nServices && norm.order804nServices.length > 0
						? norm.order804nServices
						: norm?.catalogServices && norm.catalogServices.length > 0
							? norm.catalogServices
							: [];

				if (fallbackCatalog.length > 0) {
					for (const s of fallbackCatalog) {
						const fallbackKopecks =
							s.priceKopecks != null
								? BigInt(s.priceKopecks)
								: BigInt(rublesToKopecks(Number(s.priceRub ?? s.suggestedPriceRub ?? 0)));
						const unitPriceKopecks = await resolveCatalogServicePriceKopecks(tx, orgId, s.code, fallbackKopecks);
						candidateServices.push({
							code: s.code,
							nameRu: s.nameRu ?? s.name ?? norm?.title ?? "Хирургическая манипуляция",
							priceKopecks: unitPriceKopecks,
							quantity: s.quantity && s.quantity > 0 ? s.quantity : 1,
							toothNumber: s.toothNumber ?? undefined,
							isPrimary: s.isPrimary,
						});
					}
				} else {
					const targetCode = norm?.code804n ?? "A16.07.001";
					const fallbackKopecks = BigInt(
						rublesToKopecks(
							norm?.order804nServices?.[0]?.priceRub ??
								norm?.catalogServices?.[0]?.priceRub ??
								3500,
						),
					);
					const resolvedCatalogKopecks = await resolveCatalogServicePriceKopecks(tx, orgId, targetCode, fallbackKopecks);
					candidateServices.push({
						code: targetCode,
						nameRu: norm?.title ?? "Амбулаторная хирургическая операция",
						priceKopecks: resolvedCatalogKopecks,
						quantity: 1,
						isPrimary: true,
					});
				}
			}

			interface SurgeryTreatmentItemToInsert {
				toothCode: string | null;
				title: string;
				priceRub: number;
				unitPriceRub: number;
				priceKopecks: bigint;
				unitPriceKopecks: bigint;
				quantity: string;
				notes: string;
			}

			const itemsToInsert: SurgeryTreatmentItemToInsert[] = [];
			let operationPriceKopecks = 0n;

			for (let idx = 0; idx < candidateServices.length; idx++) {
				const srv = candidateServices[idx];
				if (!srv) continue;
				const srvUnitPriceKopecks = srv.priceKopecks;
				const srvUnitPriceRub = kopecksToRubles(srvUnitPriceKopecks);
				const isPrimaryOp = srv.isPrimary ?? idx === 0;

				if (targetTeeth.length > 0 && isPrimaryOp && !srv.toothNumber) {
					for (const currentToothNum of targetTeeth) {
						const qty = srv.quantity > 0 ? srv.quantity : 1;
						const linePriceKopecks = srvUnitPriceKopecks * BigInt(qty);
						operationPriceKopecks += linePriceKopecks;
						itemsToInsert.push({
							toothCode: String(currentToothNum),
							title: `${srv.nameRu} (Зуб FDI #${currentToothNum})`,
							priceRub: kopecksToRubles(linePriceKopecks),
							unitPriceRub: srvUnitPriceRub,
							priceKopecks: linePriceKopecks,
							unitPriceKopecks: srvUnitPriceKopecks,
							quantity: String(qty),
							notes: `Хирургический протокол зафиксирован у кресла. Диагноз: ${norm?.icd10 ?? "K05"}. Код услуги: ${srv.code}.`,
						});
					}
				} else {
					const assignedTooth =
						srv.toothNumber != null
							? String(srv.toothNumber)
							: targetTeeth.length === 1
								? String(targetTeeth[0])
								: null;
					const qty = srv.quantity > 0 ? srv.quantity : 1;
					const linePriceKopecks = srvUnitPriceKopecks * BigInt(qty);
					operationPriceKopecks += linePriceKopecks;
					const toothSuffix = assignedTooth ? ` (Зуб FDI #${assignedTooth})` : "";
					itemsToInsert.push({
						toothCode: assignedTooth,
						title: `${srv.nameRu}${toothSuffix}`,
						priceRub: kopecksToRubles(linePriceKopecks),
						unitPriceRub: srvUnitPriceRub,
						priceKopecks: linePriceKopecks,
						unitPriceKopecks: srvUnitPriceKopecks,
						quantity: String(qty),
						notes: `Хирургический протокол зафиксирован у кресла. Диагноз: ${norm?.icd10 ?? "K05"}. Код услуги: ${srv.code}.`,
					});
				}
			}

			const operationPriceRub = kopecksToRubles(operationPriceKopecks);

			let linkedInvoiceId: string | null = null;
			if (targetVisitId) {
				const [existingInvoice] = await tx
					.select()
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.organizationId, orgId),
							eq(patientInvoices.visitId, targetVisitId),
							eq(patientInvoices.patientId, targetPatientId),
							notInArray(patientInvoices.status, ["voided", "paid"]),
						),
					)
					.for("update")
					.limit(1);
				if (existingInvoice) {
					linkedInvoiceId = existingInvoice.id;
					const currentTotalKopecks = resolveInvoiceTotalKopecks(existingInvoice);
					const newTotalKopecks = currentTotalKopecks + operationPriceKopecks;
					const updatedTotalRub = kopecksToRubles(newTotalKopecks);
					await tx
						.update(patientInvoices)
						.set({
							totalAmountRub: updatedTotalRub,
							totalRub: String(updatedTotalRub),
							totalPriceKopecks: newTotalKopecks,
						})
						.where(and(eq(patientInvoices.id, existingInvoice.id), eq(patientInvoices.organizationId, orgId)));
				}
			}

			if (!linkedInvoiceId) {
				const invoiceTotalRub = kopecksToRubles(operationPriceKopecks);
				const [newInvoice] = await tx
					.insert(patientInvoices)
					.values({
						organizationId: orgId,
						patientId: targetPatientId,
						visitId: targetVisitId ?? null,
						totalAmountRub: invoiceTotalRub,
						totalRub: String(invoiceTotalRub),
						totalPriceKopecks: operationPriceKopecks,
						status: "issued",
						issuedAt: new Date(),
					})
					.returning({ id: patientInvoices.id });
				linkedInvoiceId = newInvoice?.id ?? null;
			}

			for (const item of itemsToInsert) {
				await tx.insert(treatmentItems).values({
					organizationId: orgId,
					patientId: targetPatientId,
					visitId: targetVisitId ?? null,
					invoiceId: linkedInvoiceId ?? null,
					toothCode: item.toothCode,
					title: item.title,
					priceRub: item.priceRub,
					unitPriceRub: item.unitPriceRub,
					priceKopecks: item.priceKopecks,
					unitPriceKopecks: item.unitPriceKopecks,
					quantity: item.quantity,
					status: "completed",
					notes: item.notes,
				});
			}

			// Атомарное списание материалов в этой же транзакции при передаче bundleType / deductMaterials
			let deductionResult: UnifiedStockDeductionResult | null = null;
			if (input.deductMaterials || input.bundleType) {
				const visitType: "therapy" | "surgery" | "implant" | "sinus_gbr" =
					input.bundleType === "sinus_gbr"
						? "sinus_gbr"
						: input.bundleType === "implant"
							? "implant"
							: "surgery";
				deductionResult = await TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
					organizationId: orgId,
					visitType,
					userId: principal.userId,
					visitId: targetVisitId,
					notes: `Списание по техкарте: ${norm?.title || effectiveNormId} #${targetTeeth.join(", #")}`,
				});
			}

			const protocolResult = {
				patientId: targetPatientId,
				visitId: targetVisitId,
				invoiceId: linkedInvoiceId,
				operationPriceRub,
				operationPriceKopecks: operationPriceKopecks.toString(),
				amountKopecks: operationPriceKopecks.toString(),
				normId: input.normId,
				toothNumberFdi: input.toothNumberFdi ?? targetTeeth[0] ?? null,
				teeth: targetTeeth,
				protocolText: input.protocolText,
				visitUpdated,
				isOverdraftActive: input.isOverdraftActive,
				savedAt: new Date().toISOString(),
			};

			const responsePayload: Record<string, unknown> = {
				success: true,
				protocol: protocolResult,
				...(deductionResult ? { deduction: deductionResult } : {}),
			};

			onTenantTxCommit(() => {
				void auditMedicalAccessFromRequest(request, {
					organizationId: orgId,
					patientId: targetPatientId,
					action: "RECORD_SURGICAL_OPERATION_PROTOCOL",
					diagnosis: norm?.title || effectiveNormId,
				});
				wsBroker.broadcastToOrganization(orgId, {
					type: "UPDATE_SURGICAL_PROTOCOL",
					payload: {
						patientId: targetPatientId,
						toothNumberFdi: input.toothNumberFdi ?? targetTeeth[0] ?? null,
						teeth: targetTeeth,
						protocol: protocolResult,
					},
				});
			});

			return reply.code(201).send(responsePayload);
		},
	});

	/**
	 * 3. POST /api/surgery/materials/quick-deduct
	 * Экспресс-списание хирургических комплектов у кресла (Мандаты 8e, 8s, 8n).
	 * Пустые карпулы анестетиков — отходы Класса Б (СанПиН 3.3686-21) без комиссий.
	 * Мягкий овердрафт склада: задержка накладной никогда не блокирует операцию врача!
	 */
	defineTenantMutation(app, {
		method: "POST",
		path: "/api/surgery/materials/quick-deduct",
		permission: "clinical.write",
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "optional_header",
		bodySchema: surgicalQuickDeductSchema,
		validationErrorCode: "SurgicalDeductValidationError",
		validationErrorMessage: "Некорректные параметры списания расходных материалов.",
		execute: async ({ tx, principal, organizationId: orgId, body: input }) => {
			let res: UnifiedStockDeductionResult;
			if (input.bundleType === "anesthesia_carpule") {
				res = await TreatmentConsumablesService.quickWriteoffCarpules(tx, {
					organizationId: orgId,
					carpulesCount: input.carpulesCount,
					drugName: input.drugBrandName,
					userId: principal.userId,
					visitId: input.visitId,
					notes: input.notes ?? `Списание ${input.carpulesCount} карпул(ы) ${input.drugBrandName} (отходы Класса Б, СанПиН 3.3686-21, протокол по умолчанию)`,
				});
			} else {
				let visitType: "therapy" | "surgery" | "implant" | "sinus_gbr" = "surgery";
				if (input.bundleType === "implant") {
					visitType = "implant";
				} else if (input.bundleType === "sinus_gbr") {
					visitType = "sinus_gbr";
				} else {
					visitType = "surgery";
				}

				res = await TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
					organizationId: orgId,
					visitType,
					userId: principal.userId,
					visitId: input.visitId,
					notes: input.notes ?? `Списание набора «${visitType}»`,
				});
			}

			return {
				bundleType: input.bundleType,
				success: res.success,
				isOverdraft: res.isOverdraft,
				deductedItemsCount: res.deductedItems.length,
				messageRu: res.message,
				deductedItems: res.deductedItems,
				warnings: res.warnings,
			};
		},
	});

	/**
	 * 4. GET /api/surgery/materials/overdraft-status
	 * Проверка статуса мягкого овердрафта хирургических материалов.
	 * canProceed ВСЕГДА true — врач оперирует без искусственных блокировок.
	 */
	defineTenantQuery(app, {
		method: "GET",
		path: "/api/surgery/materials/overdraft-status",
		permission: "clinical.read",
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		query: async ({ tx, organizationId: orgId }) => {
			const items = await inventoryQuery.getInventoryItems(orgId, tx);

			const overdraftItems = items
				.filter((i) => Number(i.currentQty ?? i.stockQuantity ?? 0) <= 0)
				.map((i) => i.name);

			const status = evaluateWarehouseOverdraft(
				CANONICAL_SURGICAL_OPERATION_NORMS[0]?.requiredMaterials ?? [],
				overdraftItems.length > 0,
			);

			return {
				success: true,
				overdraftStatus: status,
				overdraftItemsCount: overdraftItems.length,
				overdraftItemNames: overdraftItems.slice(0, 10),
				canProceed: true,
			};
		},
	});
}

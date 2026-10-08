import {
	calculateDmsRegistryTotals,
	generateDmsRegistryCsv,
	generateDmsRegistryXml,
	type DmsRegistryClinicInfo,
	type DmsRegistryData,
	type DmsRegistryInsuranceCompanyInfo,
	type DmsRegistryRecord,
} from "@dental/shared";
import { and, eq, type SQL } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	dmsGuaranteeLetters,
	insuranceContracts,
	organizations,
	patients,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { INSURER_DIRECTORY } from "./constants.js";
import { registryQuerySchema } from "./types.js";

export async function registerInsuranceAnalyticsRoutes(app: FastifyInstance) {
	// ─── РЕЕСТР ОКАЗАННЫХ УСЛУГ ДМС (STATUTORY DMS CLAIMS REGISTRY) ───────────
	app.get<{
		Querystring: {
			insurerKey?: string;
			contractId?: string;
			patientId?: string;
			period?: "current_month" | "prev_month" | "quarter" | "custom";
			periodStart?: string;
			periodEnd?: string;
			search?: string;
			format?: "json" | "xml" | "csv";
		};
	}>("/api/insurance/registry", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"insurance claim registry read",
		);
		if (!orgId) return;

		const parsed = registryQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры запроса реестра счетов ДМС.",
				details: parsed.error.issues,
			});
		}

		const { insurerKey, contractId, patientId, period, search, format } = parsed.data;

		// 1. Динамическое вычисление дат периода
		const now = new Date();
		let startDateStr = parsed.data.periodStart;
		let endDateStr = parsed.data.periodEnd;

		if (!startDateStr || !endDateStr) {
			const year = now.getFullYear();
			const month = now.getMonth(); // 0..11

			if (period === "prev_month") {
				const prevMonthDate = new Date(year, month - 1, 1);
				const prevYear = prevMonthDate.getFullYear();
				const prevMonth = prevMonthDate.getMonth();
				const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
				startDateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
				endDateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
			} else if (period === "quarter") {
				const quarterIndex = Math.floor(month / 3);
				const startMonth = quarterIndex * 3;
				const endMonth = startMonth + 2;
				const lastDay = new Date(year, endMonth + 1, 0).getDate();
				startDateStr = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`;
				endDateStr = `${year}-${String(endMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
			} else {
				// current_month
				const lastDay = new Date(year, month + 1, 0).getDate();
				startDateStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
				endDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
			}
		}

		// 2. Реквизиты клиники из organizations
		const [org] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, orgId))
			.limit(1);

		const clinicInfo: DmsRegistryClinicInfo = {
			nameRu: org?.name || "ООО «Стоматологический Центр «ДЕНТЕ»",
			inn: org?.inn || "7701984210",
			kpp: org?.kpp || "770101001",
			ogrn: org?.ogrn || "1157746890123",
			addressRu: org?.legalAddress || "г. Москва, ул. Большая Спасская, д. 12, стр. 1",
			phone: "+7 (495) 123-45-67",
			email: org?.email || undefined,
			medicalLicenseNumber: org?.medicalLicenseNumber || "ЛО-77-01-019842",
			chiefDoctorNameRu: org?.signatoryName || "Главный врач",
			chiefAccountantNameRu: org?.signatoryName || "Руководитель организации",
		};

		// 3. Данные страховой компании
		let contract: typeof insuranceContracts.$inferSelect | null = null;
		if (contractId) {
			const [found] = await db
				.select()
				.from(insuranceContracts)
				.where(
					and(
						eq(insuranceContracts.id, contractId),
						eq(insuranceContracts.organizationId, orgId),
					),
				)
				.limit(1);
			contract = found || null;
		}

		const matchedInsurer = insurerKey && insurerKey !== "all" ? INSURER_DIRECTORY[insurerKey] : null;
		const insurerTitle = contract?.companyName || matchedInsurer?.name || (insurerKey && insurerKey !== "all" ? insurerKey : "Все страховые компании (Сводный отчет)");
		const insurerInn = matchedInsurer?.inn || "7736035485";

		const insuranceCompanyInfo: DmsRegistryInsuranceCompanyInfo = {
			companyId: contract?.id || insurerKey || "all",
			nameRu: insurerTitle,
			inn: insurerInn,
			contractNumber: "ДМС-2026/01",
			contractDate: "2026-01-12",
		};

		// 4. Поиск гарантийных писем
		const lettersQueryConditions: SQL[] = [eq(dmsGuaranteeLetters.organizationId, orgId)];
		if (patientId) {
			lettersQueryConditions.push(eq(dmsGuaranteeLetters.patientId, patientId));
		}
		if (insurerKey && insurerKey !== "all") {
			lettersQueryConditions.push(eq(dmsGuaranteeLetters.insurerKey, insurerKey));
		}
		const letters = await db
			.select()
			.from(dmsGuaranteeLetters)
			.where(and(...lettersQueryConditions));

		const lettersByPatientId = new Map<string, typeof dmsGuaranteeLetters.$inferSelect>();
		for (const letter of letters) {
			if (!lettersByPatientId.has(letter.patientId) || letter.status === "active") {
				lettersByPatientId.set(letter.patientId, letter);
			}
		}

		// 5. Запрос оказанных услуг (treatmentItems)
		const treatmentConditions: SQL[] = [
			eq(treatmentItems.organizationId, orgId),
		];
		if (patientId) {
			treatmentConditions.push(eq(treatmentItems.patientId, patientId));
		}

		const treatments = await db
			.select({
				id: treatmentItems.id,
				patientId: treatmentItems.patientId,
				visitId: treatmentItems.visitId,
				serviceId: treatmentItems.serviceId,
				toothCode: treatmentItems.toothCode,
				title: treatmentItems.title,
				quantity: treatmentItems.quantity,
				priceRub: treatmentItems.priceRub,
				unitPriceRub: treatmentItems.unitPriceRub,
				discountRub: treatmentItems.discountRub,
				status: treatmentItems.status,
				plannedDoctorUserId: treatmentItems.plannedDoctorUserId,
				// Patient info
				patientFullName: patients.fullName,
				patientBirthDate: patients.birthDate,
				patientAdminProfile: patients.administrativeProfile,
				// Service catalog info
				catalogCode: serviceCatalogItems.code,
				catalogOrder804nCode: serviceCatalogItems.order804nCode,
				catalogCategory: serviceCatalogItems.category,
				catalogTitle: serviceCatalogItems.title,
				// Visit info
				visitDiagnosis: visits.diagnosis,
				visitSignedAt: visits.signedAt,
				visitCreatedAt: visits.createdAt,
				// Doctor info
				doctorFullName: users.fullName,
			})
			.from(treatmentItems)
			.innerJoin(patients, eq(patients.id, treatmentItems.patientId))
			.leftJoin(serviceCatalogItems, eq(serviceCatalogItems.id, treatmentItems.serviceId))
			.leftJoin(visits, eq(visits.id, treatmentItems.visitId))
			.leftJoin(users, eq(users.id, treatmentItems.plannedDoctorUserId))
			.where(and(...treatmentConditions));

		const canonicalRecords: DmsRegistryRecord[] = [];
		const serviceRecords: Array<{
			id: string;
			visitId: string;
			visitDate: string;
			patientId: string;
			patientFullName: string;
			policyNumber: string;
			letterNumber?: string;
			insurerName: string;
			serviceCode804n: string;
			serviceName: string;
			diagnosisCodeMkb10: string;
			toothNumber?: number | string;
			quantity: number;
			unitPriceRub: number;
			totalPriceRub: number;
			dmsCoveredRub: number;
			patientPaidRub: number;
			doctorFullName: string;
			isExcluded: boolean;
			exclusionReason?: string;
		}> = [];

		const treatedPatientIds = new Set<string>();

		for (const tr of treatments) {
			const visitDateIso = tr.visitSignedAt
				? tr.visitSignedAt.toISOString().slice(0, 10)
				: tr.visitCreatedAt
					? tr.visitCreatedAt.toISOString().slice(0, 10)
					: startDateStr;

			// Фильтр по дате визита в отчетный период
			if (visitDateIso < startDateStr || visitDateIso > endDateStr) {
				continue;
			}

			const letter = lettersByPatientId.get(tr.patientId);
			const adminProfile = tr.patientAdminProfile;
			const policyNumber = letter?.policyNumber || adminProfile?.insurancePolicyNumber || "";

			// Включаем только пациентов с ДМС
			const hasDms = Boolean(letter || adminProfile?.insurancePolicyNumber || adminProfile?.insuranceContractId);
			if (!hasDms) continue;

			const serviceInsurerName = letter?.insurerName || insurerTitle;
			if (insurerKey && insurerKey !== "all" && letter && letter.insurerKey !== insurerKey) {
				continue;
			}

			treatedPatientIds.add(tr.patientId);

			const quantity = Math.max(1, Math.round(Number(tr.quantity) || 1));
			const unitPriceRub = Number(tr.unitPriceRub) || Number(tr.priceRub) || 0;
			const totalPriceRub = Math.round(unitPriceRub * quantity * 100) / 100;
			const unitPriceKop = Math.round(unitPriceRub * 100);
			const totalGrossKop = Math.round(totalPriceRub * 100);

			const code804n = tr.catalogOrder804nCode || tr.catalogCode || "A16.07.002.001";
			const serviceName = tr.title || tr.catalogTitle || "Медицинская услуга стоматологическая";
			const toothCode = tr.toothCode ? Number(tr.toothCode.replace(/\D/g, "")) : undefined;

			const franchisePct = letter ? Number(letter.franchisePct) : 0;
			const exclusions = letter?.programExclusions || [];
			const isExcluded = exclusions.some((ex) => serviceName.toLowerCase().includes(ex.toLowerCase()));

			let patientPaidKop = 0;
			let insurerClaimKop = totalGrossKop;

			if (isExcluded) {
				patientPaidKop = totalGrossKop;
				insurerClaimKop = 0;
			} else if (franchisePct > 0) {
				patientPaidKop = Math.round(totalGrossKop * (franchisePct / 100));
				insurerClaimKop = totalGrossKop - patientPaidKop;
			}

			const patientPaidRub = patientPaidKop / 100;
			const dmsCoveredRub = insurerClaimKop / 100;

			const genderVal: "M" | "F" | "М" | "Ж" = adminProfile?.gender === "female" ? "Ж" : "М";

			let icd10 = "K02.1";
			let icd10Desc = "Кариес дентина";
			if (tr.visitDiagnosis) {
				const match = tr.visitDiagnosis.match(/[A-Z]\d{2}(\.\d{1,2})?/i);
				if (match) {
					icd10 = match[0].toUpperCase();
					icd10Desc = tr.visitDiagnosis;
				}
			}

			if (search && search.trim()) {
				const q = search.trim().toLowerCase();
				const matchSearch =
					tr.patientFullName.toLowerCase().includes(q) ||
					policyNumber.toLowerCase().includes(q) ||
					serviceName.toLowerCase().includes(q) ||
					code804n.toLowerCase().includes(q);
				if (!matchSearch) continue;
			}

			canonicalRecords.push({
				recordId: tr.id,
				serviceDate: visitDateIso,
				patientFullName: tr.patientFullName,
				patientBirthDate: tr.patientBirthDate || "1990-01-01",
				patientGender: genderVal,
				patientSnils: adminProfile?.snils || undefined,
				policyNumber: policyNumber || "ДМС-БЕЗ-ПОЛИСА",
				guaranteeLetterNumber: letter?.letterNumber || "ГП-БЕЗ-НОМЕРА",
				guaranteeLetterDate: letter?.issueDate || undefined,
				icd10Code: icd10,
				icd10DescriptionRu: icd10Desc,
				toothNumberFdi: toothCode && toothCode > 0 ? toothCode : undefined,
				serviceCode804n: code804n,
				serviceNameRu: serviceName,
				doctorFullName: tr.doctorFullName || "Врач-стоматолог",
				doctorSpecialtyRu: "Стоматолог-терапевт",
				quantity,
				unitPriceKopecks: unitPriceKop,
				totalGrossKopecks: totalGrossKop,
				franchisePercent: Math.round(franchisePct),
				patientPaidKopecks: patientPaidKop,
				insurerClaimKopecks: insurerClaimKop,
			});

			serviceRecords.push({
				id: tr.id,
				visitId: tr.visitId || tr.id,
				visitDate: visitDateIso,
				patientId: tr.patientId,
				patientFullName: tr.patientFullName,
				policyNumber: policyNumber || "ДМС-БЕЗ-ПОЛИСА",
				...(letter?.letterNumber ? { letterNumber: letter.letterNumber } : {}),
				insurerName: serviceInsurerName,
				serviceCode804n: code804n,
				serviceName,
				diagnosisCodeMkb10: icd10,
				...(toothCode !== undefined ? { toothNumber: toothCode } : {}),
				quantity,
				unitPriceRub,
				totalPriceRub,
				dmsCoveredRub,
				patientPaidRub,
				doctorFullName: tr.doctorFullName || "Врач-стоматолог",
				isExcluded,
				...(isExcluded ? { exclusionReason: "Услуга входит в исключения полиса ДМС" } : {}),
			});
		}

		// 6. Поддержка гарантийных писем с использованным лимитом при отсутствии отдельных treatmentItems (Mandate 8n)
		for (const letter of letters) {
			if (treatedPatientIds.has(letter.patientId)) continue;
			const usedAmount = Number(letter.usedAmountRub);
			if (usedAmount <= 0) continue;

			const letterDateIso = letter.issueDate || startDateStr;
			if (letterDateIso < startDateStr || letterDateIso > endDateStr) {
				// Проверяем период действия
				if (letter.validUntil < startDateStr || letter.validFrom > endDateStr) {
					continue;
				}
			}

			const unitPriceRub = usedAmount;
			const totalPriceRub = usedAmount;
			const unitPriceKop = Math.round(unitPriceRub * 100);
			const totalGrossKop = Math.round(totalPriceRub * 100);
			const franchisePct = Number(letter.franchisePct) || 0;
			const patientPaidKop = franchisePct > 0 ? Math.round(totalGrossKop * (franchisePct / 100)) : 0;
			const insurerClaimKop = totalGrossKop - patientPaidKop;
			const patientPaidRub = patientPaidKop / 100;
			const dmsCoveredRub = insurerClaimKop / 100;

			const code804n = (letter.approvedServiceCodes as string[])?.[0] || "A16.07.002.001";
			const serviceName = letter.notes?.trim() || "Оказание стоматологической помощи по гарантийному письму";
			const toothCode = Number((letter.approvedTeethFdi as string[])?.[0]?.replace(/\D/g, "")) || undefined;
			const icd10 = (letter.approvedDiagnosisCodes as string[])?.[0] || "K02.1";

			if (search && search.trim()) {
				const q = search.trim().toLowerCase();
				const matchSearch =
					letter.patientFullName.toLowerCase().includes(q) ||
					letter.policyNumber.toLowerCase().includes(q) ||
					letter.letterNumber.toLowerCase().includes(q) ||
					serviceName.toLowerCase().includes(q);
				if (!matchSearch) continue;
			}

			canonicalRecords.push({
				recordId: letter.id,
				serviceDate: letterDateIso,
				patientFullName: letter.patientFullName,
				patientBirthDate: letter.patientBirthDate || "1990-01-01",
				patientGender: "М",
				policyNumber: letter.policyNumber,
				guaranteeLetterNumber: letter.letterNumber,
				guaranteeLetterDate: letter.issueDate,
				icd10Code: icd10,
				icd10DescriptionRu: "Стоматологическое лечение по гарантийному письму",
				toothNumberFdi: toothCode,
				serviceCode804n: code804n,
				serviceNameRu: serviceName,
				doctorFullName: "Врач-стоматолог",
				doctorSpecialtyRu: "Стоматолог-терапевт",
				quantity: 1,
				unitPriceKopecks: unitPriceKop,
				totalGrossKopecks: totalGrossKop,
				franchisePercent: Math.round(franchisePct),
				patientPaidKopecks: patientPaidKop,
				insurerClaimKopecks: insurerClaimKop,
			});

			serviceRecords.push({
				id: letter.id,
				visitId: letter.id,
				visitDate: letterDateIso,
				patientId: letter.patientId,
				patientFullName: letter.patientFullName,
				policyNumber: letter.policyNumber,
				letterNumber: letter.letterNumber,
				insurerName: letter.insurerName,
				serviceCode804n: code804n,
				serviceName,
				diagnosisCodeMkb10: icd10,
				...(toothCode !== undefined ? { toothNumber: toothCode } : {}),
				quantity: 1,
				unitPriceRub,
				totalPriceRub,
				dmsCoveredRub,
				patientPaidRub,
				doctorFullName: "Врач-стоматолог",
				isExcluded: false,
			});
		}

		const totals = calculateDmsRegistryTotals(canonicalRecords);
		const registryNumber = `РЕЕСТР-${startDateStr.replace(/-/g, "")}-${(insurerKey || "ALL").toUpperCase().slice(0, 8)}`;
		const registryDate = now.toISOString().slice(0, 10);

		const registryData: DmsRegistryData = {
			registryNumber,
			registryDate,
			periodStart: startDateStr,
			periodEnd: endDateStr,
			clinic: clinicInfo,
			insuranceCompany: insuranceCompanyInfo,
			records: canonicalRecords,
		};

		if (format === "xml") {
			return reply
				.code(200)
				.header("Content-Type", "application/xml; charset=utf-8")
				.header("Content-Disposition", `attachment; filename="${registryNumber}.xml"`)
				.send(generateDmsRegistryXml(registryData));
		}

		if (format === "csv") {
			return reply
				.code(200)
				.header("Content-Type", "text/csv; charset=utf-8")
				.header("Content-Disposition", `attachment; filename="${registryNumber}.csv"`)
				.send(generateDmsRegistryCsv(registryData));
		}

		return reply.code(200).send({
			...registryData,
			serviceRecords,
			totals,
		});
	});
}

import {
	calculateDmsRegistryTotals,
	calculateItemDmsSplit,
	generateDmsRegistryCsv,
	generateDmsRegistryXml,
	kopecksToRubles,
	rublesToKopecks,
	type DmsRegistryClinicInfo,
	type DmsRegistryData,
	type DmsRegistryInsuranceCompanyInfo,
	type DmsRegistryRecord,
} from "@dental/shared";
import { and, eq, gte, isNotNull, isNull, lte, ne, or, type SQL } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	clinics,
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
import { resolveDbKopecks } from "./guaranteeLetterModules/guaranteeLetterFormatters.js";
import { registryQuerySchema } from "./types.js";

function extractSpecialtiesLabel(specialties: unknown): string {
	if (!Array.isArray(specialties)) return "";
	return specialties
		.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
		.join(", ");
}

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
			const month = now.getMonth();

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
				const lastDay = new Date(year, month + 1, 0).getDate();
				startDateStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
				endDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
			}
		}

		const periodStartTs = new Date(`${startDateStr}T00:00:00.000Z`);
		const periodEndTs = new Date(`${endDateStr}T23:59:59.999Z`);
		const matchedInsurer = insurerKey && insurerKey !== "all" ? INSURER_DIRECTORY[insurerKey] : null;

		const {
			org,
			clinicRow,
			contract,
			lettersWithPatients,
			treatments,
		} = await withTenantCtx(orgId, async (tx) => {
			const [foundOrg] = await tx
				.select()
				.from(organizations)
				.where(eq(organizations.id, orgId))
				.limit(1);

			const [foundClinic] = await tx
				.select()
				.from(clinics)
				.where(eq(clinics.organizationId, orgId))
				.limit(1);

			let resolvedContract: typeof insuranceContracts.$inferSelect | null = null;
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
				resolvedContract = found ?? null;
			} else if (insurerKey && insurerKey !== "all") {
				const insurerTargetName = matchedInsurer?.name?.toLowerCase().trim();
				const orgContracts = await tx
					.select()
					.from(insuranceContracts)
					.where(
						and(
							eq(insuranceContracts.organizationId, orgId),
							eq(insuranceContracts.isActive, true),
						),
					);
				const found = orgContracts.find((c) => {
					const cName = c.companyName.toLowerCase().trim();
					if (
						insurerTargetName &&
						(cName === insurerTargetName ||
							cName.includes(insurerTargetName) ||
							insurerTargetName.includes(cName))
					) {
						return true;
					}
					return cName.includes(insurerKey.toLowerCase());
				});
				if (found) resolvedContract = found;
			}

			const lettersQueryConditions: SQL[] = [eq(dmsGuaranteeLetters.organizationId, orgId)];
			if (patientId) {
				lettersQueryConditions.push(eq(dmsGuaranteeLetters.patientId, patientId));
			}
			if (contractId) {
				lettersQueryConditions.push(eq(dmsGuaranteeLetters.contractId, contractId));
			}
			if (insurerKey && insurerKey !== "all") {
				lettersQueryConditions.push(eq(dmsGuaranteeLetters.insurerKey, insurerKey));
			}

			const foundLetters = await tx
				.select({
					letter: dmsGuaranteeLetters,
					patientAdminProfile: patients.administrativeProfile,
				})
				.from(dmsGuaranteeLetters)
				.leftJoin(patients, eq(patients.id, dmsGuaranteeLetters.patientId))
				.where(and(...lettersQueryConditions));

			const visitDateCondition = or(
				isNull(treatmentItems.visitId),
				and(isNotNull(visits.signedAt), gte(visits.signedAt, periodStartTs), lte(visits.signedAt, periodEndTs)),
				and(isNull(visits.signedAt), isNotNull(visits.createdAt), gte(visits.createdAt, periodStartTs), lte(visits.createdAt, periodEndTs)),
			);

			const treatmentConditions: SQL[] = [
				eq(treatmentItems.organizationId, orgId),
				ne(treatmentItems.status, "cancelled"),
			];
			if (patientId) {
				treatmentConditions.push(eq(treatmentItems.patientId, patientId));
			}
			if (visitDateCondition) {
				treatmentConditions.push(visitDateCondition);
			}

			const foundTreatments = await tx
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
					priceKopecks: treatmentItems.priceKopecks,
					unitPriceKopecks: treatmentItems.unitPriceKopecks,
					discountKopecks: treatmentItems.discountKopecks,
					status: treatmentItems.status,
					plannedDoctorUserId: treatmentItems.plannedDoctorUserId,
					patientFullName: patients.fullName,
					patientBirthDate: patients.birthDate,
					patientAdminProfile: patients.administrativeProfile,
					catalogCode: serviceCatalogItems.code,
					catalogOrder804nCode: serviceCatalogItems.order804nCode,
					catalogCategory: serviceCatalogItems.category,
					catalogTitle: serviceCatalogItems.title,
					visitDiagnosis: visits.diagnosis,
					visitSignedAt: visits.signedAt,
					visitCreatedAt: visits.createdAt,
					visitStatus: visits.status,
					doctorFullName: users.fullName,
					doctorSpecialties: users.specialties,
				})
				.from(treatmentItems)
				.innerJoin(patients, eq(patients.id, treatmentItems.patientId))
				.leftJoin(serviceCatalogItems, eq(serviceCatalogItems.id, treatmentItems.serviceId))
				.leftJoin(visits, eq(visits.id, treatmentItems.visitId))
				.leftJoin(users, eq(users.id, treatmentItems.plannedDoctorUserId))
				.where(and(...treatmentConditions));

			return {
				org: foundOrg ?? null,
				clinicRow: foundClinic ?? null,
				contract: resolvedContract,
				lettersWithPatients: foundLetters,
				treatments: foundTreatments,
			};
		});

		// 2. Реальные реквизиты клиники без синтетических заглушек
		const clinicPhone = clinicRow?.phone || org?.website || "";
		const clinicAddress = clinicRow?.address || org?.legalAddress || "";

		const clinicInfo: DmsRegistryClinicInfo = {
			nameRu: org?.name || clinicRow?.name || "",
			inn: org?.inn || "",
			kpp: org?.kpp || "",
			ogrn: org?.ogrn || "",
			addressRu: clinicAddress,
			phone: clinicPhone,
			email: org?.email || undefined,
			medicalLicenseNumber: org?.medicalLicenseNumber || "",
			chiefDoctorNameRu: org?.signatoryName || "",
			chiefAccountantNameRu: org?.signatoryName || "",
		};

		// 3. Данные страховой компании
		const insurerTitle =
			contract?.companyName ||
			matchedInsurer?.name ||
			(insurerKey && insurerKey !== "all" ? insurerKey : "Все страховые компании (Сводный отчет)");
		const insurerInn = matchedInsurer?.inn || "";

		const contractNumber = contract?.id
			? `ДМС-${now.getFullYear()}/${contract.id.slice(0, 4).toUpperCase()}`
			: insurerKey && insurerKey !== "all"
				? "Б/Н"
				: `ДМС-${now.getFullYear()}/СВОД`;
		const contractDate = contract?.createdAt
			? contract.createdAt.toISOString().slice(0, 10)
			: `${now.getFullYear()}-01-01`;

		const insuranceCompanyInfo: DmsRegistryInsuranceCompanyInfo = {
			companyId: contract?.id || insurerKey || "all",
			nameRu: insurerTitle,
			inn: insurerInn,
			contractNumber,
			contractDate,
		};

		const letters = lettersWithPatients.map((r) => r.letter);
		const patientProfileByLetterId = new Map(
			lettersWithPatients.map((r) => [r.letter.id, r.patientAdminProfile]),
		);

		const lettersByPatientId = new Map<string, Array<typeof dmsGuaranteeLetters.$inferSelect>>();
		for (const letter of letters) {
			const bucket = lettersByPatientId.get(letter.patientId);
			if (bucket) {
				bucket.push(letter);
			} else {
				lettersByPatientId.set(letter.patientId, [letter]);
			}
		}

		const pickBestLetterForTreatment = (
			patientUuid: string,
			visitDateIso: string,
		): typeof dmsGuaranteeLetters.$inferSelect | undefined => {
			const candidates = lettersByPatientId.get(patientUuid);
			if (!candidates || candidates.length === 0) return undefined;
			const exact = candidates.find(
				(l) =>
					(!contractId || l.contractId === contractId) &&
					(!insurerKey || insurerKey === "all" || l.insurerKey === insurerKey) &&
					(l.status === "active" || l.status === "approved") &&
					(!l.validFrom || l.validFrom <= visitDateIso) &&
					(!l.validUntil || l.validUntil >= visitDateIso),
			);
			return exact ?? candidates.find((l) => l.status === "active" || l.status === "approved") ?? candidates[0];
		};

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
			unitPriceKopecks: number;
			totalPriceRub: number;
			totalPriceKopecks: number;
			dmsCoveredRub: number;
			dmsCoveredKopecks: number;
			patientPaidRub: number;
			patientPaidKopecks: number;
			doctorFullName: string;
			isExcluded: boolean;
			exclusionReason?: string;
		}> = [];

		const representedLetterIds = new Set<string>();

		for (const tr of treatments) {
			const visitDateIso = tr.visitSignedAt
				? tr.visitSignedAt.toISOString().slice(0, 10)
				: tr.visitCreatedAt
					? tr.visitCreatedAt.toISOString().slice(0, 10)
					: startDateStr;

			if (visitDateIso < startDateStr || visitDateIso > endDateStr) {
				continue;
			}
			if (tr.status === "cancelled" || tr.visitStatus === "voided") {
				continue;
			}

			const letter = pickBestLetterForTreatment(tr.patientId, visitDateIso);
			const adminProfile = tr.patientAdminProfile;
			const policyNumber = letter?.policyNumber || adminProfile?.insurancePolicyNumber || "";

			const hasDms = Boolean(letter || adminProfile?.insurancePolicyNumber || adminProfile?.insuranceContractId);
			if (!hasDms) continue;

			if (contractId && letter?.contractId !== contractId && adminProfile?.insuranceContractId !== contractId) {
				continue;
			}

			const serviceInsurerName = letter?.insurerName || insurerTitle;
			if (insurerKey && insurerKey !== "all") {
				if (letter && letter.insurerKey !== insurerKey) continue;
				if (!letter && matchedInsurer && !serviceInsurerName.toLowerCase().includes(matchedInsurer.name.toLowerCase())) {
					continue;
				}
			}

			if (letter) {
				representedLetterIds.add(letter.id);
			}

			const quantity = Math.max(1, Math.round(Number(tr.quantity) || 1));
			const unitPriceKopRaw = resolveDbKopecks(tr.unitPriceKopecks, tr.unitPriceRub);
			const fallbackPriceKop = resolveDbKopecks(tr.priceKopecks, tr.priceRub);
			const unitPriceKop = unitPriceKopRaw > 0 ? unitPriceKopRaw : fallbackPriceKop;
			const discountKop = resolveDbKopecks(tr.discountKopecks, tr.discountRub);
			const totalGrossKop = Math.max(0, unitPriceKop * quantity - discountKop);
			const unitPriceRub = kopecksToRubles(unitPriceKop);
			const totalPriceRub = kopecksToRubles(totalGrossKop);

			const code804n = tr.catalogOrder804nCode || tr.catalogCode || "";
			const serviceName = tr.title || tr.catalogTitle || "";
			const toothCode = tr.toothCode ? Number(tr.toothCode.replace(/\D/g, "")) : undefined;

			const franchisePct = letter ? Number(letter.franchisePct) : 0;
			const exclusions = letter?.programExclusions || [];
			const isExcluded = exclusions.some((ex) => serviceName.toLowerCase().includes(ex.toLowerCase()));

			let patientPaidKop = 0;
			let insurerClaimKop = totalGrossKop;

			if (isExcluded) {
				patientPaidKop = totalGrossKop;
				insurerClaimKop = 0;
			} else {
				const split = calculateItemDmsSplit(totalGrossKop, franchisePct, true);
				patientPaidKop = split.patientKopecks;
				insurerClaimKop = split.insurerKopecks;
			}

			const patientPaidRub = kopecksToRubles(patientPaidKop);
			const dmsCoveredRub = kopecksToRubles(insurerClaimKop);
			const genderVal: "M" | "F" | "М" | "Ж" = adminProfile?.gender === "female" ? "Ж" : "М";

			let icd10 = "";
			let icd10Desc = tr.visitDiagnosis || "";
			if (tr.visitDiagnosis) {
				const match = tr.visitDiagnosis.match(/[A-Z]\d{2}(\.\d{1,2})?/i);
				if (match) {
					icd10 = match[0].toUpperCase();
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

			const doctorName = tr.doctorFullName || "";
			const doctorSpecialty = extractSpecialtiesLabel(tr.doctorSpecialties);

			canonicalRecords.push({
				recordId: tr.id,
				serviceDate: visitDateIso,
				patientFullName: tr.patientFullName,
				patientBirthDate: tr.patientBirthDate || "",
				patientGender: genderVal,
				patientSnils: adminProfile?.snils || undefined,
				policyNumber,
				guaranteeLetterNumber: letter?.letterNumber || "",
				guaranteeLetterDate: letter?.issueDate || undefined,
				icd10Code: icd10,
				icd10DescriptionRu: icd10Desc,
				toothNumberFdi: toothCode && toothCode > 0 ? toothCode : undefined,
				serviceCode804n: code804n,
				serviceNameRu: serviceName,
				doctorFullName: doctorName,
				...(doctorSpecialty ? { doctorSpecialtyRu: doctorSpecialty } : {}),
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
				policyNumber,
				...(letter?.letterNumber ? { letterNumber: letter.letterNumber } : {}),
				insurerName: serviceInsurerName,
				serviceCode804n: code804n,
				serviceName,
				diagnosisCodeMkb10: icd10,
				...(toothCode !== undefined ? { toothNumber: toothCode } : {}),
				quantity,
				unitPriceRub,
				unitPriceKopecks: unitPriceKop,
				totalPriceRub,
				totalPriceKopecks: totalGrossKop,
				dmsCoveredRub,
				dmsCoveredKopecks: insurerClaimKop,
				patientPaidRub,
				patientPaidKopecks: patientPaidKop,
				doctorFullName: doctorName,
				isExcluded,
				...(isExcluded ? { exclusionReason: "Услуга входит в исключения полиса ДМС" } : {}),
			});
		}

		// 6. Независимые гарантийные письма с использованным лимитом, не представленные через treatmentItems
		for (const letter of letters) {
			if (representedLetterIds.has(letter.id)) continue;
			const usedAmountKop = resolveDbKopecks(letter.usedAmountKopecks, letter.usedAmountRub);
			if (usedAmountKop <= 0) continue;

			const letterDateIso = letter.issueDate || startDateStr;
			if (letterDateIso < startDateStr || letterDateIso > endDateStr) {
				if (letter.validUntil < startDateStr || letter.validFrom > endDateStr) {
					continue;
				}
			}

			const unitPriceKop = usedAmountKop;
			const totalGrossKop = unitPriceKop;
			const unitPriceRub = kopecksToRubles(unitPriceKop);
			const totalPriceRub = unitPriceRub;
			const franchisePct = Number(letter.franchisePct) || 0;
			const split = calculateItemDmsSplit(totalGrossKop, franchisePct, true);
			const patientPaidKop = split.patientKopecks;
			const insurerClaimKop = split.insurerKopecks;
			const patientPaidRub = kopecksToRubles(patientPaidKop);
			const dmsCoveredRub = kopecksToRubles(insurerClaimKop);

			const code804n = (letter.approvedServiceCodes as string[])?.[0] || "";
			const serviceName = letter.notes?.trim() || "Оказание стоматологической помощи по гарантийному письму";
			const toothCode = Number((letter.approvedTeethFdi as string[])?.[0]?.replace(/\D/g, "")) || undefined;
			const icd10 = (letter.approvedDiagnosisCodes as string[])?.[0] || "";

			if (search && search.trim()) {
				const q = search.trim().toLowerCase();
				const matchSearch =
					letter.patientFullName.toLowerCase().includes(q) ||
					letter.policyNumber.toLowerCase().includes(q) ||
					letter.letterNumber.toLowerCase().includes(q) ||
					serviceName.toLowerCase().includes(q);
				if (!matchSearch) continue;
			}

			const letterAdminProfile = patientProfileByLetterId.get(letter.id);
			const letterGender: "M" | "F" | "М" | "Ж" =
				letterAdminProfile?.gender === "female"
					? "Ж"
					: "М";

			canonicalRecords.push({
				recordId: letter.id,
				serviceDate: letterDateIso,
				patientFullName: letter.patientFullName,
				patientBirthDate: letter.patientBirthDate || "",
				patientGender: letterGender,
				patientSnils: letterAdminProfile?.snils || undefined,
				policyNumber: letter.policyNumber,
				guaranteeLetterNumber: letter.letterNumber,
				guaranteeLetterDate: letter.issueDate,
				icd10Code: icd10,
				icd10DescriptionRu: letter.notes?.trim() || "",
				toothNumberFdi: toothCode,
				serviceCode804n: code804n,
				serviceNameRu: serviceName,
				doctorFullName: "",
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
				unitPriceKopecks: unitPriceKop,
				totalPriceRub,
				totalPriceKopecks: totalGrossKop,
				dmsCoveredRub,
				dmsCoveredKopecks: insurerClaimKop,
				patientPaidRub,
				patientPaidKopecks: patientPaidKop,
				doctorFullName: "",
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

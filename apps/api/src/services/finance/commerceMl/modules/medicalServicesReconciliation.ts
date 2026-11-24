import { and, eq, gte, isNotNull, isNull, lte, or } from "drizzle-orm";
import {
	DEFAULT_OKEI_PIECE_CODE,
	DEFAULT_OKEI_PIECE_NAME,
	type OneCMedicalActDocument,
	type OneCMedicalActItem,
	type OneCRetailSaleItem,
	computeCommerceMlSha256,
	rublesToKopecks,
} from "@dental/shared";
import type { TenantDb } from "../../../../db/rls.js";
import {
	patients,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits,
} from "../../../../db/schema.js";

export interface MedicalServicesResult {
	readonly retailSaleItems: OneCRetailSaleItem[];
	readonly medicalActs: OneCMedicalActDocument[];
	readonly totalRevenueKop: number;
	readonly totalDiscountKop: number;
}

export async function fetchAndReconcileMedicalServices(
	tx: TenantDb,
	params: {
		readonly orgId: string;
		readonly startTimestamp: Date;
		readonly endTimestamp: Date;
		readonly cleanDate: string;
		readonly startDateIso: string;
		readonly prefix: string;
	},
): Promise<MedicalServicesResult> {
	const { orgId, startTimestamp, endTimestamp, cleanDate, startDateIso, prefix } = params;

	const dateFilter = or(
		isNull(treatmentItems.visitId),
		and(isNotNull(visits.signedAt), gte(visits.signedAt, startTimestamp), lte(visits.signedAt, endTimestamp)),
		and(isNull(visits.signedAt), isNotNull(visits.createdAt), gte(visits.createdAt, startTimestamp), lte(visits.createdAt, endTimestamp)),
	);

	const treatmentRows = await tx
		.select({
			id: treatmentItems.id,
			toothCode: treatmentItems.toothCode,
			title: treatmentItems.title,
			quantity: treatmentItems.quantity,
			priceRub: treatmentItems.priceRub,
			discountRub: treatmentItems.discountRub,
			priceKopecks: treatmentItems.priceKopecks,
			discountKopecks: treatmentItems.discountKopecks,
			patientId: treatmentItems.patientId,
			serviceId: treatmentItems.serviceId,
			doctorUserId: treatmentItems.plannedDoctorUserId,
		})
		.from(treatmentItems)
		.leftJoin(visits, eq(visits.id, treatmentItems.visitId))
		.where(
			and(
				eq(treatmentItems.organizationId, orgId),
				eq(treatmentItems.status, "completed"),
				dateFilter,
			),
		);

	const [catalogRows, doctorRows, patientRows] = await Promise.all([
		tx
			.select({
				id: serviceCatalogItems.id,
				code: serviceCatalogItems.code,
				order804nCode: serviceCatalogItems.order804nCode,
			})
			.from(serviceCatalogItems)
			.where(eq(serviceCatalogItems.organizationId, orgId)),
		tx
			.select({ id: users.id, fullName: users.fullName })
			.from(users)
			.where(eq(users.organizationId, orgId)),
		tx
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
				administrativeProfile: patients.administrativeProfile,
			})
			.from(patients)
			.where(eq(patients.organizationId, orgId)),
	]);

	const catalogMap = new Map(catalogRows.map((c) => [c.id, c]));
	const doctorMap = new Map(doctorRows.map((d) => [d.id, d.fullName || ""]));
	const patientMap = new Map(
		patientRows.map((p) => [
			p.id,
			{
				name: p.fullName,
				inn: p.administrativeProfile?.taxpayerInn || undefined,
				phone: p.phone || undefined,
				address:
					p.administrativeProfile?.registrationAddress ||
					p.administrativeProfile?.residentialAddress ||
					undefined,
			},
		]),
	);

	const retailSaleItems: OneCRetailSaleItem[] = [];
	const medicalActsMap = new Map<string, OneCMedicalActItem[]>();
	let totalRevenueKop = 0;
	let totalDiscountKop = 0;

	for (const tr of treatmentRows) {
		const cat = tr.serviceId ? catalogMap.get(tr.serviceId) : undefined;
		const code804n = cat?.order804nCode || cat?.code || undefined;
		const doctorName = (tr.doctorUserId ? doctorMap.get(tr.doctorUserId) : undefined) || "";
		const qty = Math.max(1, Number(tr.quantity) || 1);
		const priceColKop = tr.priceKopecks != null ? Number(tr.priceKopecks) : 0;
		const priceKop = priceColKop !== 0 ? priceColKop : rublesToKopecks(Number(tr.priceRub) || 0);
		const discColKop = tr.discountKopecks != null ? Number(tr.discountKopecks) : 0;
		const discKop = discColKop !== 0 ? discColKop : rublesToKopecks(Number(tr.discountRub) || 0);
		const totalKop = Math.max(0, priceKop * qty - discKop);
		totalRevenueKop += totalKop;
		totalDiscountKop += discKop;
		const parsedTooth = tr.toothCode ? Number.parseInt(tr.toothCode, 10) : undefined;
		const toothNumber = parsedTooth !== undefined && Number.isInteger(parsedTooth) ? parsedTooth : undefined;

		const baseItem = {
			id: tr.id,
			code804n,
			name: tr.title,
			toothNumber,
			unitCode: DEFAULT_OKEI_PIECE_CODE,
			unitName: DEFAULT_OKEI_PIECE_NAME,
			quantity: qty,
			priceKopecks: priceKop,
			discountKopecks: discKop,
			totalKopecks: totalKop,
			vatRate: "Без НДС" as const,
			vatAmountKopecks: 0,
		};
		retailSaleItems.push({ ...baseItem, doctorName, nomenclatureGroup: "Стоматологические услуги" });

		const patId = tr.patientId;
		if (!patId) continue;
		let patientActs = medicalActsMap.get(patId);
		if (!patientActs) {
			patientActs = [];
			medicalActsMap.set(patId, patientActs);
		}
		patientActs.push({ ...baseItem, attendingDoctorName: doctorName });
	}

	const medicalActs: OneCMedicalActDocument[] = [];
	let actIdx = 1;
	for (const [patId, actItems] of medicalActsMap.entries()) {
		const pat = patientMap.get(patId);
		const actDoc: OneCMedicalActDocument = {
			id: `act-${cleanDate}-${String(actIdx).padStart(3, "0")}`,
			actNumber: `${prefix}-АКТ-${cleanDate}-${String(actIdx).padStart(2, "0")}`,
			documentDateIso: startDateIso,
			documentTime: "16:00:00",
			patient: {
				id: patId,
				name: pat?.name || patId,
				fullName: pat?.name || patId,
				inn: pat?.inn,
				phone: pat?.phone,
				address: pat?.address,
				isLegalEntity: false,
			},
			contractNumber: null,
			contractDateIso: startDateIso,
			attendingDoctorName: actItems[0]?.attendingDoctorName || null,
			items: actItems,
			totalKopecks: actItems.reduce((s, it) => s + it.totalKopecks, 0),
			comment: "Акт выполненных работ об оказании медицинских услуг",
		};
		actDoc.sha256Hash = computeCommerceMlSha256(actDoc);
		medicalActs.push(actDoc);
		actIdx++;
	}

	return { retailSaleItems, medicalActs, totalRevenueKop, totalDiscountKop };
}

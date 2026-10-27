import { and, eq } from "drizzle-orm";
import {
	DEFAULT_OKEI_PIECE_CODE,
	DEFAULT_OKEI_PIECE_NAME,
	type OneCMedicalActDocument,
	type OneCMedicalActItem,
	type OneCRetailSaleItem,
	computeCommerceMlSha256,
	rubToKopecks,
} from "@dental/shared";
import { db } from "../../../../db/client.js";
import {
	patients,
	serviceCatalogItems,
	treatmentItems,
	users,
} from "../../../../db/schema.js";

export interface MedicalServicesResult {
	readonly retailSaleItems: OneCRetailSaleItem[];
	readonly medicalActs: OneCMedicalActDocument[];
	readonly totalRevenueKop: number;
	readonly totalDiscountKop: number;
}

export async function fetchAndReconcileMedicalServices(params: {
	readonly orgId: string;
	readonly cleanDate: string;
	readonly startDateIso: string;
	readonly prefix: string;
}): Promise<MedicalServicesResult> {
	const { orgId, cleanDate, startDateIso, prefix } = params;

	const treatmentRows = await db
		.select({
			id: treatmentItems.id,
			toothCode: treatmentItems.toothCode,
			title: treatmentItems.title,
			quantity: treatmentItems.quantity,
			priceRub: treatmentItems.priceRub,
			discountRub: treatmentItems.discountRub,
			patientId: treatmentItems.patientId,
			serviceId: treatmentItems.serviceId,
			doctorUserId: treatmentItems.plannedDoctorUserId,
		})
		.from(treatmentItems)
		.where(and(eq(treatmentItems.organizationId, orgId), eq(treatmentItems.status, "completed")))
		.limit(100);

	const [catalogRows, doctorRows, patientRows] = await Promise.all([
		db.select({ id: serviceCatalogItems.id, code: serviceCatalogItems.code, order804nCode: serviceCatalogItems.order804nCode }).from(serviceCatalogItems).where(eq(serviceCatalogItems.organizationId, orgId)),
		db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.organizationId, orgId)),
		db.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone, administrativeProfile: patients.administrativeProfile }).from(patients).where(eq(patients.organizationId, orgId)),
	]);

	const catalogMap = new Map(catalogRows.map((c) => [c.id, c]));
	const doctorMap = new Map(doctorRows.map((d) => [d.id, d.fullName || "Врач клиники"]));
	const patientMap = new Map(patientRows.map((p) => [p.id, {
		name: p.fullName,
		inn: p.administrativeProfile?.taxpayerInn || undefined,
		phone: p.phone || undefined,
		address: p.administrativeProfile?.registrationAddress || p.administrativeProfile?.residentialAddress || undefined,
	}]));

	const retailSaleItems: OneCRetailSaleItem[] = [];
	const medicalActsMap = new Map<string, OneCMedicalActItem[]>();
	let totalRevenueKop = 0;
	let totalDiscountKop = 0;

	for (const tr of treatmentRows) {
		const cat = tr.serviceId ? catalogMap.get(tr.serviceId) : undefined;
		const code804n = cat?.order804nCode || cat?.code || undefined;
		const doctorName = tr.doctorUserId ? doctorMap.get(tr.doctorUserId) || "Лечащий врач" : "Лечащий врач";
		const qty = Number(tr.quantity) || 1;
		const priceKop = rubToKopecks(Number(tr.priceRub) || 0);
		const discKop = rubToKopecks(Number(tr.discountRub) || 0);
		const totalKop = Math.max(0, priceKop * qty - discKop);
		totalRevenueKop += totalKop;
		totalDiscountKop += discKop;
		const toothNum = tr.toothCode ? parseInt(tr.toothCode, 10) : undefined;

		const baseItem = {
			id: tr.id, code804n, name: tr.title,
			toothNumber: isNaN(toothNum as any) ? undefined : toothNum,
			unitCode: DEFAULT_OKEI_PIECE_CODE, unitName: DEFAULT_OKEI_PIECE_NAME,
			quantity: qty, priceKopecks: priceKop, discountKopecks: discKop, totalKopecks: totalKop,
			vatRate: "Без НДС" as const, vatAmountKopecks: 0,
		};
		retailSaleItems.push({ ...baseItem, doctorName, nomenclatureGroup: "Стоматологические услуги" });

		const patId = tr.patientId || "pat-default";
		if (!medicalActsMap.has(patId)) medicalActsMap.set(patId, []);
		medicalActsMap.get(patId)!.push({ ...baseItem, attendingDoctorName: doctorName });
	}

	const medicalActs: OneCMedicalActDocument[] = [];
	let actIdx = 1;
	for (const [patId, actItems] of medicalActsMap.entries()) {
		const pat = patientMap.get(patId);
		const actDoc: OneCMedicalActDocument = {
			id: `act-${cleanDate}-${String(actIdx).padStart(3, "0")}`,
			actNumber: `${prefix}-АКТ-${cleanDate}-${String(actIdx).padStart(2, "0")}`,
			documentDateIso: startDateIso, documentTime: "16:00:00",
			patient: { id: patId, name: pat?.name || "Пациент клиники", fullName: pat?.name || "Пациент клиники", inn: pat?.inn, phone: pat?.phone, address: pat?.address, isLegalEntity: false },
			contractNumber: `ДОГ-${cleanDate}-${actIdx}`, contractDateIso: startDateIso,
			attendingDoctorName: actItems[0]?.attendingDoctorName || "Лечащий врач",
			items: actItems, totalKopecks: actItems.reduce((s, it) => s + it.totalKopecks, 0),
			comment: "Акт выполненных работ об оказании медицинских услуг",
		};
		actDoc.sha256Hash = computeCommerceMlSha256(actDoc);
		medicalActs.push(actDoc);
		actIdx++;
	}

	return { retailSaleItems, medicalActs, totalRevenueKop, totalDiscountKop };
}

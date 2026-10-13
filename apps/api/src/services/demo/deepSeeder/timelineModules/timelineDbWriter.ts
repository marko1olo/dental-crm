/**
 * timelineDbWriter.ts — Batch Transactional Database Writer for Patient History & Events (Layer 2/3).
 */

import { and, eq } from "drizzle-orm";
import { SHOWCASE_PATIENTS } from "@dental/shared";
import {
	patients,
	serviceCatalogItems,
	toothStates,
	treatmentItems,
	treatmentPlanStages,
	treatmentPlans,
	visitDiaries,
	visits,
} from "../../../../db/schema.js";
import {
	DEMO_PATIENT_1_ID,
	DEMO_PATIENT_2_ID,
	DEMO_PATIENT_3_ID,
	DEMO_PATIENT_4_ID,
	DEMO_SHOWCASE_ORG_ID,
} from "../types.js";
import {
	buildDeterministicTreatmentItems,
	buildPatientToothStateValues,
	buildPatientVisitDiaryValues,
} from "./clinicalHistoryGenerator.js";
import type {
	DatabaseTransaction,
	DemoPatientsBundle,
	PatientTreatmentItemsParams,
} from "./timelineSeederTypes.js";

/**
 * Инициализирует 4 демо-пациента клиники или возвращает существующие записи.
 */
export async function writeDemoPatients(
	tx: DatabaseTransaction,
	organizationId: string,
): Promise<DemoPatientsBundle | null> {
	const isCanonicalDemoOrg = organizationId === DEMO_SHOWCASE_ORG_ID;

	const canonicalPatientIds = [
		DEMO_PATIENT_1_ID,
		DEMO_PATIENT_2_ID,
		DEMO_PATIENT_3_ID,
		DEMO_PATIENT_4_ID,
	];

	const demoPatientsList = SHOWCASE_PATIENTS.map((p, index) => ({
		...(isCanonicalDemoOrg ? { id: canonicalPatientIds[index] ?? p.id } : {}),
		organizationId,
		fullName: p.fullName,
		phone: p.phone,
		birthDate: p.birthDate,
		notes: p.notes,
		status: "active" as const,
	}));

	const insertedPatients = await tx
		.insert(patients)
		.values(demoPatientsList)
		.onConflictDoNothing()
		.returning({ id: patients.id, fullName: patients.fullName });

	const allPatients =
		insertedPatients.length >= 4
			? insertedPatients
			: await tx
					.select({ id: patients.id, fullName: patients.fullName })
					.from(patients)
					.where(eq(patients.organizationId, organizationId))
					.limit(4);

	const [p0, p1, p2, p3] = allPatients;
	if (!p0 || !p1 || !p2 || !p3) {
		return null;
	}

	return { allPatients, p0, p1, p2, p3 };
}

/**
 * Засевает зубные формулы (одонтограммы) для пациентов кейсов терапии, ортопедии и хирургии.
 */
export async function writePatientToothStates(
	tx: DatabaseTransaction,
	organizationId: string,
	p0Id: string,
	p1Id: string,
	p3Id: string,
): Promise<void> {
	const existingTeeth = await tx
		.select({ id: toothStates.id })
		.from(toothStates)
		.where(eq(toothStates.organizationId, organizationId))
		.limit(1);

	if (existingTeeth.length > 0) {
		return;
	}

	const toothValues = buildPatientToothStateValues(organizationId, p0Id, p1Id, p3Id);

	await tx
		.insert(toothStates)
		.values(toothValues)
		.onConflictDoNothing();
}

/**
 * Засевает завершенный визит и медицинский дневник Форма 043/у (SOAP-протокол).
 */
export async function writePatientVisitAndDiary(
	tx: DatabaseTransaction,
	organizationId: string,
	p0Id: string,
	appointmentId: string,
	doctorUserId: string,
): Promise<string | undefined> {
	const [createdVisit] = await tx
		.insert(visits)
		.values({
			organizationId,
			patientId: p0Id,
			appointmentId,
			status: "signed",
		})
		.onConflictDoNothing()
		.returning({ id: visits.id });

	let visitId = createdVisit?.id;
	if (!visitId) {
		const existing = await tx
			.select({ id: visits.id })
			.from(visits)
			.where(
				and(
					eq(visits.organizationId, organizationId),
					eq(visits.patientId, p0Id),
					eq(visits.appointmentId, appointmentId),
				),
			)
			.limit(1);
		visitId = existing[0]?.id;
	}

	if (!visitId) {
		return undefined;
	}

	const diaryValues = buildPatientVisitDiaryValues({
		organizationId,
		visitId,
		patientId: p0Id,
		doctorUserId,
	});

	await tx
		.insert(visitDiaries)
		.values(diaryValues)
		.onConflictDoNothing();

	return visitId;
}

/**
 * Засевает утвержденный комплексный план санации полости рта и его этапы.
 */
export async function writePatientTreatmentPlan(
	tx: DatabaseTransaction,
	organizationId: string,
	p0: { id: string; fullName: string },
	doctorUserId: string,
): Promise<string | undefined> {
	const existingPlan = await tx
		.select({ id: treatmentPlans.id })
		.from(treatmentPlans)
		.where(eq(treatmentPlans.organizationId, organizationId))
		.limit(1);

	if (existingPlan.length > 0) {
		return existingPlan[0]?.id;
	}

	const [createdPlan] = await tx
		.insert(treatmentPlans)
		.values({
			organizationId,
			patientId: p0.id,
			doctorId: doctorUserId,
			title: "Комплексный план санации полости рта",
			name: "Комплексный план санации полости рта",
			status: "Active",
			totalPriceRub: "18500.00",
			totalPrice: "18500.00",
			approvedAt: new Date(),
		})
		.onConflictDoNothing()
		.returning({ id: treatmentPlans.id, title: treatmentPlans.title });

	if (createdPlan) {
		await tx
			.insert(treatmentPlanStages)
			.values({
				organizationId,
				patientName: p0.fullName,
				planTitle: createdPlan.title,
				stageOrder: 1,
				stageName: "Терапевтическая санация (лечение кариеса 1.6 и пульпита 3.6)",
				completionPercentage: 50,
				autoArchived: false,
			})
			.onConflictDoNothing();
		return createdPlan.id;
	}

	return undefined;
}

/**
 * Засевает позиции плана лечения (treatment_items) с привязкой к реальным услугам из справочника 804н.
 * Гарантирует ссылочную целостность и совпадение сумм со сметой и кассой до копейки (Мандат 8b).
 */
export async function writePatientTreatmentItems(
	tx: DatabaseTransaction,
	params: PatientTreatmentItemsParams,
): Promise<string[]> {
	const { organizationId } = params;

	const existingItems = await tx
		.select({ id: treatmentItems.id })
		.from(treatmentItems)
		.where(eq(treatmentItems.organizationId, organizationId))
		.limit(1);

	if (existingItems.length > 0) {
		const allItems = await tx
			.select({ id: treatmentItems.id })
			.from(treatmentItems)
			.where(eq(treatmentItems.organizationId, organizationId));
		return allItems.map((r) => r.id);
	}

	const isCanonicalDemo = organizationId === DEMO_SHOWCASE_ORG_ID;

	const catalogRows = await tx
		.select({
			id: serviceCatalogItems.id,
			code: serviceCatalogItems.code,
			title: serviceCatalogItems.title,
			basePriceRub: serviceCatalogItems.basePriceRub,
		})
		.from(serviceCatalogItems)
		.where(eq(serviceCatalogItems.organizationId, organizationId));

	const demoItems = buildDeterministicTreatmentItems({
		...params,
		isCanonicalDemo,
		catalogRows,
	});

	const inserted = await tx
		.insert(treatmentItems)
		.values(demoItems)
		.onConflictDoNothing()
		.returning({ id: treatmentItems.id });

	return inserted.map((r) => r.id);
}

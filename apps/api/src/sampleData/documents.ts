/**
 * @file documents.ts
 * @description Layer 1: Fixture generated documents baseline & string normalization helper.
 */
import type { GeneratedDocument } from "@dental/shared";
import { organizationId, marinaPatientId, alexeyPatientId, activeVisitId } from "./fixtureIds.js";

export const documents: GeneratedDocument[] = [
	{
		id: "f9d274b4-3730-4eaa-aeac-20bf5f2f1bc5",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		kind: "paid_medical_services_contract",
		title: "Договор платных медицинских услуг",
		status: "draft",
		issuedAt: null,
		totalAmountRub: 6800,
	},
	{
		id: "59b724c7-c988-45a7-91d8-1ad11a6e74c7",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		kind: "completed_works_act",
		title: "Акт выполненных работ",
		status: "draft",
		issuedAt: null,
		totalAmountRub: 6800,
	},
	{
		id: "b77b8720-7ffd-453a-9db4-54637ef292a7",
		organizationId,
		patientId: alexeyPatientId,
		visitId: null,
		kind: "tax_deduction_certificate",
		title: "Черновик данных для справки КНД 1151156 за 2026 год",
		status: "draft",
		issuedAt: null,
		totalAmountRub: 4500,
		taxYear: 2026,
	},
];

export function cleanNullableText(value: string | null | undefined): string | null {
	const clean = value?.trim();
	return clean ? clean : null;
}


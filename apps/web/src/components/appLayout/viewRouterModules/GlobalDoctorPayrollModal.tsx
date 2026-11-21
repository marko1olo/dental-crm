/**
 * GlobalDoctorPayrollModal — Глобальный слушатель и модалка ведомости врача (Мандат 8b, <= 120 строк).
 */

import React, { Suspense, useEffect, useState } from "react";
import { rublesToKopecks, type ClinicSettings } from "@dental/shared";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";
import type { PayrollServiceOrder } from "../../payroll/payrollCatalogData";

const DoctorPayrollStudioModal = lazyWithRetry(() =>
	import("../../payroll/DoctorPayrollStudioModal").then((module) => ({
		default: module.DoctorPayrollStudioModal,
	})),
);

interface GlobalDoctorPayrollModalProps {
	readonly clinicSettings?:
		| ClinicSettings
		| { readonly name?: string; readonly clinicName?: string; readonly profile?: { readonly clinicName?: string } }
		| null
		| undefined;
}

interface GlobalDoctorPayrollEventDetail {
	readonly doctorId?: string;
	readonly doctor?: {
		readonly doctorUserId?: string;
		readonly doctorName?: string;
		readonly role?: string;
		readonly specialtyId?: string;
		readonly visits?: readonly {
			readonly visitId?: string;
			readonly orderNumber?: string;
			readonly closedAt?: string;
			readonly patientName?: string;
			readonly patientCardNumber?: string;
			readonly serviceName?: string;
			readonly serviceCategory?: PayrollServiceOrder["category"];
			readonly categoryLabelRu?: string;
			readonly patientPaidKopecks?: number;
			readonly grossRevenueKop?: number;
			readonly patientPaidRub?: number;
			readonly labCostKopecks?: number;
			readonly labCostKop?: number;
			readonly withheldLabRub?: number;
			readonly materialCostKopecks?: number;
			readonly materialCostKop?: number;
			readonly withheldMaterialRub?: number;
			readonly isPaid54Fz?: boolean;
		}[];
	};
	readonly orders?: readonly PayrollServiceOrder[];
	readonly services?: readonly PayrollServiceOrder[];
}

export function GlobalDoctorPayrollModal({ clinicSettings }: GlobalDoctorPayrollModalProps) {
	const [globalDoctorPayroll, setGlobalDoctorPayroll] = useState<GlobalDoctorPayrollEventDetail | null>(null);

	useEffect(() => {
		const handleGlobalPayroll = (e: Event) => {
			const customEvent = e as CustomEvent<GlobalDoctorPayrollEventDetail>;
			setGlobalDoctorPayroll(customEvent.detail || {});
		};
		window.addEventListener("dente:open-doctor-payroll", handleGlobalPayroll);
		return () => window.removeEventListener("dente:open-doctor-payroll", handleGlobalPayroll);
	}, []);

	if (!globalDoctorPayroll) return null;

	const doc = globalDoctorPayroll.doctor;
	const initialServices: readonly PayrollServiceOrder[] | undefined = doc?.visits
		? doc.visits.map((v, idx) => ({
				id: v.visitId || `srv-${idx}`,
				orderNumber: v.orderNumber || `ОРТ-${idx + 100}`,
				dateIso: v.closedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
				patientName: v.patientName || "Пациент",
				medicalCardNumber: v.patientCardNumber || "Карта пациента",
				serviceNameRu: v.serviceName || "Стоматологическая услуга",
				category: v.serviceCategory || "therapy",
				categoryLabelRu: v.categoryLabelRu || "Терапия",
				grossKopecks: v.patientPaidKopecks ?? v.grossRevenueKop ?? rublesToKopecks(v.patientPaidRub || 0),
				labCostKopecks: v.labCostKopecks ?? v.labCostKop ?? rublesToKopecks(v.withheldLabRub || 0),
				materialCostKopecks: v.materialCostKopecks ?? v.materialCostKop ?? rublesToKopecks(v.withheldMaterialRub || 0),
				isPaid54Fz: Boolean(v.isPaid54Fz ?? true),
				paidKopecks: v.patientPaidKopecks ?? v.grossRevenueKop ?? rublesToKopecks(v.patientPaidRub || 0),
				doctorId: doc?.doctorUserId || globalDoctorPayroll.doctorId || "",
			}))
		: (globalDoctorPayroll.orders ?? globalDoctorPayroll.services);

	const doctorsList = doc
		? [
				{
					id: doc.doctorUserId,
					name: doc.doctorName,
					specialtyId: doc.specialtyId || (doc.role === "doctor" ? "solo-doctor" : doc.role),
				},
			].filter((d): d is { readonly id: string; readonly name: string; readonly specialtyId: string; } => Boolean(d.id && d.name && d.specialtyId))
		: undefined;

	const clinicName =
		(clinicSettings && "profile" in clinicSettings && clinicSettings.profile?.clinicName) ||
		(clinicSettings && "clinicName" in clinicSettings && typeof clinicSettings.clinicName === "string" ? clinicSettings.clinicName : undefined) ||
		(clinicSettings && "name" in clinicSettings && typeof clinicSettings.name === "string" ? clinicSettings.name : undefined) ||
		"ООО «Денте Стоматология»";

	return (
		<Suspense fallback={null}>
			<DoctorPayrollStudioModal
				key={doc?.doctorUserId || globalDoctorPayroll.doctorId || "global-doctor-payroll"}
				isOpen={Boolean(globalDoctorPayroll)}
				onClose={() => setGlobalDoctorPayroll(null)}
				clinicName={clinicName}
				initialDoctorId={doc?.doctorUserId || globalDoctorPayroll.doctorId}
				doctorsList={doctorsList}
				orders={initialServices}
			/>
		</Suspense>
	);
}

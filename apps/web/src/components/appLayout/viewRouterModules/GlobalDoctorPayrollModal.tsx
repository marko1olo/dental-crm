/**
 * GlobalDoctorPayrollModal — Глобальный слушатель и модалка ведомости врача (Мандат 8b, <= 120 строк).
 */

import React, { Suspense, useEffect, useState } from "react";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";

const DoctorPayrollModal = lazyWithRetry(() =>
	import("../../payroll/DoctorPayrollModal").then((module) => ({
		default: module.DoctorPayrollModal,
	})),
);

export function GlobalDoctorPayrollModal({ clinicSettings }: { clinicSettings?: any }) {
	const [globalDoctorPayroll, setGlobalDoctorPayroll] = useState<any>(null);

	useEffect(() => {
		const handleGlobalPayroll = (e: Event) => {
			const customEvent = e as CustomEvent;
			setGlobalDoctorPayroll(customEvent.detail || {});
		};
		window.addEventListener("dente:open-doctor-payroll", handleGlobalPayroll);
		return () => window.removeEventListener("dente:open-doctor-payroll", handleGlobalPayroll);
	}, []);

	if (!globalDoctorPayroll) return null;

	const doc = globalDoctorPayroll.doctor;
	const initialServices = doc?.visits
		? doc.visits.map((v: any, idx: number) => ({
				id: v.visitId || `srv-${idx}`,
				dateIso: v.closedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
				patientName: v.patientName || "Пациент",
				medicalCardNumber: v.patientCardNumber || "Карта пациента",
				serviceNameRu: v.serviceName || "Стоматологическая услуга",
				category: v.serviceCategory || "therapy",
				grossRevenueKop: Math.round((v.patientPaidRub || 0) * 100),
				labCostKop: Math.round((v.withheldLabRub || 0) * 100),
				materialCostKop: Math.round((v.withheldMaterialRub || 0) * 100),
				toothCode: v.toothFormula,
				serviceCode: v.serviceCode,
			}))
		: globalDoctorPayroll.services;

	const doctorsList = doc
		? [
				{
					id: doc.doctorUserId,
					name: doc.doctorName,
					specialtyId: doc.specialtyId || (doc.role === "doctor" ? "solo-doctor" : doc.role),
				},
			]
		: undefined;

	return (
		<Suspense fallback={null}>
			<DoctorPayrollModal
				isOpen={Boolean(globalDoctorPayroll)}
				onClose={() => setGlobalDoctorPayroll(null)}
				clinicName={clinicSettings?.name || "ООО «Денте Стоматология»"}
				initialDoctorId={doc?.doctorUserId || globalDoctorPayroll.doctorId}
				initialServices={initialServices}
				initialBasePercentage={doc?.commissionPct ?? globalDoctorPayroll.basePercentage}
				doctorsList={doctorsList}
			/>
		</Suspense>
	);
}

/**
 * usePayoutModalEventBridge.ts — Слушатель событий открытия ведомости зарплаты врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import { useEffect, useMemo, useState } from "react";
import type { DoctorPayoutReport, DoctorPayoutRow } from "./types.js";
import { mapRoleToSpecialtyId } from "./payoutHelpers.js";

export function usePayoutModalEventBridge(
	report: DoctorPayoutReport | null,
	setPayrollModalDoctor: (doc: DoctorPayoutRow | null) => void,
) {
	const [isPayrollModalOpen, setIsPayrollModalOpen] = useState<boolean>(false);
	const [showNotice, setShowNotice] = useState<boolean>(false);

	const allReportDoctors = useMemo(() => {
		if (!report?.rows) return [];
		return report.rows.map((d) => ({
			id: d.doctorUserId,
			name: d.doctorName,
			specialtyId: mapRoleToSpecialtyId(d.role),
		}));
	}, [report?.rows]);

	useEffect(() => {
		const handleOpenPayroll = (e: Event) => {
			const customEvent = e as CustomEvent;
			const passedDoctor = customEvent.detail?.doctor;
			const passedDoctorId = customEvent.detail?.doctorId;

			if (passedDoctor && (passedDoctor.doctorUserId || passedDoctor.id)) {
				setPayrollModalDoctor(passedDoctor);
				setIsPayrollModalOpen(true);
				return;
			}
			if (passedDoctorId && report?.rows) {
				const found = report.rows.find((d) => d.doctorUserId === passedDoctorId);
				if (found) {
					setPayrollModalDoctor(found);
					setIsPayrollModalOpen(true);
					return;
				}
			}
			setPayrollModalDoctor(null);
			setIsPayrollModalOpen(true);
		};

		window.addEventListener("dente:open-doctor-payroll", handleOpenPayroll);
		return () => window.removeEventListener("dente:open-doctor-payroll", handleOpenPayroll);
	}, [report, setPayrollModalDoctor]);

	return {
		isPayrollModalOpen,
		setIsPayrollModalOpen,
		showNotice,
		setShowNotice,
		allReportDoctors,
	};
}

/**
 * useDoctorPayoutWallet.ts — Хук состояния мобильного кошелька выплат врачам.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import { useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import type { DoctorPayoutRow, DoctorPayoutReport } from "../../../pages/payoutDashboard/types.js";
import { DEMO_SHOWCASE_DOCTOR, DEMO_SHOWCASE_SOLO_DOCTOR } from "./demoShowcaseData.js";
import { computeDoctorShifts } from "./doctorShiftsComputer.js";
import { computeCategoryCards } from "./categoryCardComputer.js";

export function useDoctorPayoutWallet(report: DoctorPayoutReport | null) {
	const isDemo = isDemoShowcaseMode();

	const availableDoctors: readonly DoctorPayoutRow[] = useMemo(() => {
		if (report && report.rows.length > 0) return report.rows;
		if (isDemo) return [DEMO_SHOWCASE_DOCTOR, DEMO_SHOWCASE_SOLO_DOCTOR];
		return [];
	}, [report, isDemo]);

	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => {
		return availableDoctors[0]?.doctorUserId ?? "";
	});

	const currentDoctor: DoctorPayoutRow | null = useMemo(() => {
		if (availableDoctors.length === 0) return null;
		const found = availableDoctors.find((d) => d.doctorUserId === selectedDoctorId);
		return found ?? availableDoctors[0] ?? null;
	}, [availableDoctors, selectedDoctorId]);

	const [activeShiftDate, setActiveShiftDate] = useState<string | null>(null);

	const shifts = useMemo(() => computeDoctorShifts(currentDoctor), [currentDoctor]);

	const activeShift = useMemo(() => {
		if (!activeShiftDate) return null;
		return shifts.find((s) => s.date === activeShiftDate) ?? null;
	}, [shifts, activeShiftDate]);

	const categoryCards = useMemo(() => computeCategoryCards(currentDoctor), [currentDoctor]);

	const totalWithheld = useMemo(() => {
		if (!currentDoctor) return 0;
		const lab = currentDoctor.withheldLabRub ?? 0;
		const mat = currentDoctor.withheldMaterialRub ?? 0;
		return lab + mat;
	}, [currentDoctor]);

	return {
		availableDoctors,
		selectedDoctorId,
		setSelectedDoctorId,
		currentDoctor,
		activeShiftDate,
		setActiveShiftDate,
		shifts,
		activeShift,
		categoryCards,
		totalWithheld,
	};
}

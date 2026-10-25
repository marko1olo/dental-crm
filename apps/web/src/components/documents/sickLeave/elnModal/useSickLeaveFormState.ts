import { useState, useMemo } from "react";
import type { SickLeaveFormState, IncapacityPeriod } from "../sickLeaveElnEngine";
import { calculateSickLeaveDates, addDays, validateSickLeaveDuration } from "../sickLeaveElnEngine";
import { createInitialSickLeaveState } from "./sickLeaveStateDefaults";
import type { SickLeaveElnModalProps } from "./types";

export function useSickLeaveFormState(props: SickLeaveElnModalProps) {
	const todayStr: string = useMemo(() => new Date().toISOString().split('T')[0] ?? '2026-08-22', []);
	const defaults = useMemo(() => createInitialSickLeaveState(props, todayStr), [props, todayStr]);

	const [patientData, setPatientData] = useState(defaults.initialPatient);
	const [formState, setFormState] = useState<SickLeaveFormState>(defaults.initialForm);

	const validation = useMemo(() => validateSickLeaveDuration(formState), [formState]);

	const handleAddPeriod = () => {
		const lastPeriod = formState.periods[formState.periods.length - 1];
		const nextStart = lastPeriod ? addDays(lastPeriod.dateTo, 1) : formState.issueDate;
		const nextDates = calculateSickLeaveDates(nextStart, 5);
		const newPeriod: IncapacityPeriod = {
			id: `p-${Date.now()}`,
			dateFrom: nextDates.dateFrom,
			dateTo: nextDates.dateTo,
			doctorSpecialty: props.initialDoctorSpecialty || 'Врач-стоматолог-хирург',
			doctorFio: props.initialDoctorFio || '',
			doctorSnils: props.initialDoctorSnils || '',
			doctorRole: 'attending'
		};
		setFormState((prev) => ({
			...prev,
			periods: [...prev.periods, newPeriod],
			workResumeDate: nextDates.workResumeDate
		}));
	};

	const handleRemovePeriod = (index: number) => {
		if (formState.periods.length <= 1) return;
		setFormState((prev) => {
			const updated = prev.periods.filter((_, idx) => idx !== index);
			const last = updated[updated.length - 1];
			return { ...prev, periods: updated, workResumeDate: last ? addDays(last.dateTo, 1) : prev.workResumeDate };
		});
	};

	const handlePeriodDateChange = (index: number, field: 'dateFrom' | 'dateTo', value: string) => {
		setFormState((prev) => {
			const existing = prev.periods[index];
			if (!existing) return prev;
			const updated = [...prev.periods];
			updated[index] = { ...existing, [field]: value };
			const last = updated[updated.length - 1];
			return { ...prev, periods: updated, workResumeDate: last?.dateTo ? addDays(last.dateTo, 1) : prev.workResumeDate };
		});
	};

	const handleQuickSetDays = (days: number) => {
		const start = formState.periods[0]?.dateFrom || formState.issueDate || todayStr;
		const newDates = calculateSickLeaveDates(start, days);
		setFormState((prev) => {
			const p1: IncapacityPeriod = {
				...(prev.periods[0] || {
					id: 'p-1',
					doctorSpecialty: props.initialDoctorSpecialty || 'Врач-стоматолог-хирург',
					doctorFio: props.initialDoctorFio || '',
					doctorSnils: props.initialDoctorSnils || '',
					doctorRole: 'attending'
				}),
				dateFrom: newDates.dateFrom,
				dateTo: newDates.dateTo,
			};
			return { ...prev, periods: [p1], workResumeDate: newDates.workResumeDate };
		});
	};

	return {
		todayStr,
		patientData,
		setPatientData,
		formState,
		setFormState,
		validation,
		handleAddPeriod,
		handleRemovePeriod,
		handlePeriodDateChange,
		handleQuickSetDays,
		initialDoctorFio: props.initialDoctorFio || '',
		initialDoctorSnils: props.initialDoctorSnils || '',
		initialDoctorSpecialty: props.initialDoctorSpecialty || 'Врач-стоматолог-хирург'
	};
}

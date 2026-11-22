/**
 * useDmsPatientLoader — карточка пациента для гарантийного письма ДМС из базы.
 * Возвращает undefined, пока грузится; null — пациента нет в базе.
 */

import { useEffect, useState } from "react";
import { fetchLauncherPatient } from "../launcherFinanceApi";

export type DmsLauncherPatient = {
	id: string;
	fullName: string;
	birthDate?: string | undefined;
	phone?: string | undefined;
} | null;

export function useDmsPatientLoader(patientId: string | null): DmsLauncherPatient | undefined {
	const [patient, setPatient] = useState<DmsLauncherPatient | undefined>(undefined);

	useEffect(() => {
		if (!patientId) return;
		let cancelled = false;
		setPatient(undefined);
		void fetchLauncherPatient(patientId).then((resolved) => {
			if (cancelled) return;
			setPatient(
				resolved
					? {
							id: resolved.id,
							fullName: resolved.fullName,
							birthDate: resolved.birthDate,
							phone: resolved.phone,
						}
					: null,
			);
		});
		return () => {
			cancelled = true;
		};
	}, [patientId]);

	return patient;
}

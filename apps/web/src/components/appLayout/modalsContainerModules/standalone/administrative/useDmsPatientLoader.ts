/**
 * useDmsPatientLoader — карточка пациента для гарантийного письма ДМС из базы.
 * Возвращает undefined, пока грузится; null — пациента нет в базе.
 * В Showcase-режиме (Мандат 8wy) предоставляет демонстрационную карточку.
 */

import { useEffect, useState } from "react";
import { isDemoShowcaseMode } from "../../../../../lib/demoMode.js";
import { fetchLauncherPatient } from "../launcherFinanceApi.js";

export type DmsLauncherPatient = {
	id: string;
	fullName: string;
	birthDate?: string | undefined;
	phone?: string | undefined;
} | null;

const DEMO_PATIENT: DmsLauncherPatient = {
	id: "demo-patient-dms",
	fullName: "Смирнова Елена Александровна",
	birthDate: "1988-04-12",
	phone: "+7 (916) 123-45-67",
};

export function useDmsPatientLoader(patientId: string | null): DmsLauncherPatient | undefined {
	const isDemo = isDemoShowcaseMode();
	const [patient, setPatient] = useState<DmsLauncherPatient | undefined>(() => {
		if (isDemo && (!patientId || patientId === "demo")) return DEMO_PATIENT;
		return undefined;
	});

	useEffect(() => {
		if (!patientId) {
			if (isDemo) setPatient(DEMO_PATIENT);
			return;
		}
		let cancelled = false;
		setPatient(undefined);
		void fetchLauncherPatient(patientId).then((resolved) => {
			if (cancelled) return;
			if (resolved) {
				setPatient({
					id: resolved.id,
					fullName: resolved.fullName,
					birthDate: resolved.birthDate,
					phone: resolved.phone,
				});
			} else if (isDemo) {
				setPatient(DEMO_PATIENT);
			} else {
				setPatient(null);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [patientId, isDemo]);

	return patient;
}

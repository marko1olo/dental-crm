import { useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import {
	extractPatientSafetyFlags,
	resolvePatientDocs,
	resolveUpcomingAppointment,
} from "./patientHeaderLogicHelpers";

export function usePatientHeaderCardLogic(
	patientId?: string,
	propPatient?: any,
) {
	const { dashboard, selectedPatient: ctxPatient } = useAppLogicContext();
	const [isFamilyWalletOpen, setIsFamilyWalletOpen] = useState(false);

	const resolvedPatient = useMemo(() => {
		if (propPatient) return propPatient;
		if (patientId && dashboard?.patients) {
			return dashboard.patients.find((p: any) => p.id === patientId) || null;
		}
		return ctxPatient || null;
	}, [propPatient, patientId, dashboard?.patients, ctxPatient]);

	useEffect(() => {
		const handleOpenFamily = (e?: Event) => {
			const customEvt = e as CustomEvent<{ patientId?: string }>;
			if (
				!customEvt?.detail?.patientId ||
				customEvt.detail.patientId === resolvedPatient?.id
			) {
				setIsFamilyWalletOpen(true);
			}
		};
		window.addEventListener("dente-open-family-wallet", handleOpenFamily);
		return () =>
			window.removeEventListener("dente-open-family-wallet", handleOpenFamily);
	}, [resolvedPatient?.id]);

	const { allergyText, criticalSomaticFlags } = useMemo(
		() => extractPatientSafetyFlags(resolvedPatient),
		[resolvedPatient],
	);

	const diagnosisText = useMemo(() => {
		if (!resolvedPatient) return "";
		const d =
			resolvedPatient.diagnosis ||
			resolvedPatient.primaryDiagnosis ||
			resolvedPatient.mkb10 ||
			resolvedPatient.anamnesis?.diagnosis ||
			"";
		return typeof d === "string" ? d.trim() : "";
	}, [resolvedPatient]);

	const nextAppointment = useMemo(
		() =>
			resolveUpcomingAppointment(
				resolvedPatient?.id,
				dashboard?.appointments,
			),
		[resolvedPatient?.id, dashboard?.appointments],
	);

	const { contractStatus, consentStatus } = useMemo(
		() => resolvePatientDocs(resolvedPatient, dashboard?.documents),
		[resolvedPatient, dashboard?.documents],
	);

	return {
		dashboard,
		resolvedPatient,
		isFamilyWalletOpen,
		setIsFamilyWalletOpen,
		allergyText,
		criticalSomaticFlags,
		diagnosisText,
		nextAppointment,
		contractStatus,
		consentStatus,
	};
}

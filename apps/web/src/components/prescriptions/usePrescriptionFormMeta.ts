/**
 * usePrescriptionFormMeta.ts — Form Series, Dates and Validity State Hook
 */

import { useState } from "react";
import type {
	PrescriptionFormType,
	PrescriptionPrintModalProps,
} from "./PrescriptionPrintModal";

export function usePrescriptionFormMeta(props: PrescriptionPrintModalProps) {
	const { patient } = props;
	const [activeForm, setActiveForm] = useState<PrescriptionFormType>("107-1u");
	const [customSeriesNumber, setCustomSeriesNumber] = useState<string>(() => {
		const year = new Date().getFullYear();
		const patSuffix =
			(patient?.id ? patient.id.replace(/\D/g, "").slice(-4) : "").padStart(
				4,
				"0",
			) || "0001";
		return `РЕЦ-${year}-${patSuffix}`;
	});
	const [prescriptionDate, setPrescriptionDate] = useState<string>(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [validityDays, setValidityDays] = useState<"15" | "30" | "60" | "365">(
		"60",
	);
	const [isChronicSpecialCare, setIsChronicSpecialCare] =
		useState<boolean>(false);
	const [chronicPeriodicity, setChronicPeriodicity] = useState<string>(
		"ежемесячно (1 раз в 30 дней)",
	);
	const [patientAddress, setPatientAddress] = useState<string>(
		() => patient?.address || "",
	);
	const [patientSnils, setPatientSnils] = useState<string>(
		() => patient?.snils || "",
	);
	const [patientOmsPolicy, setPatientOmsPolicy] = useState<string>(
		() => patient?.omsPolicy || "",
	);
	const [patientWeightKg, setPatientWeightKg] = useState<number | undefined>(
		() => patient?.weightKg ?? undefined,
	);
	const [withStampAndSignature, setWithStampAndSignature] =
		useState<boolean>(true);

	const resetFormMeta = (form: PrescriptionFormType = "107-1u") => {
		const year = new Date().getFullYear();
		const patSuffix =
			(patient?.id ? patient.id.replace(/\D/g, "").slice(-4) : "").padStart(
				4,
				"0",
			) || "0001";
		setPrescriptionDate(new Date().toISOString().slice(0, 10));
		setCustomSeriesNumber(
			form === "107-1u"
				? `РЕЦ-${year}-${patSuffix}`
				: `ПКУ-${year}-${patSuffix.padStart(6, "0")}`,
		);
		setPatientAddress(patient?.address || "");
		setPatientSnils(patient?.snils || "");
		setPatientOmsPolicy(patient?.omsPolicy || "");
		setPatientWeightKg(patient?.weightKg ?? undefined);
	};

	return {
		activeForm,
		setActiveForm,
		customSeriesNumber,
		setCustomSeriesNumber,
		prescriptionDate,
		setPrescriptionDate,
		validityDays,
		setValidityDays,
		isChronicSpecialCare,
		setIsChronicSpecialCare,
		chronicPeriodicity,
		setChronicPeriodicity,
		patientAddress,
		setPatientAddress,
		patientSnils,
		setPatientSnils,
		patientOmsPolicy,
		setPatientOmsPolicy,
		patientWeightKg,
		setPatientWeightKg,
		withStampAndSignature,
		setWithStampAndSignature,
		resetFormMeta,
	};
}

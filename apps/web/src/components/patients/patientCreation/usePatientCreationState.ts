import { useEffect, useRef, useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { usePatientStore } from "../../../store/patientStore";
import { loadPatientFieldRequirements, type PatientFieldRequirements } from "../patientFieldRequirementsConfig";
import { DEFAULT_ADVERTISING_SOURCE } from "./constants";
import type { UsePatientCreationFormOptions } from "./types";

export function usePatientCreationState({
	isOpen,
	onClose,
	customRequirements,
	initialBirthDate,
	initialIsChild = false,
}: UsePatientCreationFormOptions) {
	const {
		newPatientName,
		newPatientPhone,
		newPatientBirthDate,
		isPatientCreating,
		setNewPatientName,
		setNewPatientPhone,
		setNewPatientBirthDate,
		setSelectedPatientId,
		patientAdministrativeProfileDraft,
		setPatientAdministrativeProfileDraft,
	} = usePatientStore();

	const appLogic = useOptionalAppLogicContext();
	const patients = appLogic?.dashboard?.patients ?? [];

	const [fieldRequirements, setFieldRequirements] = useState<PatientFieldRequirements>(() => {
		return customRequirements ?? loadPatientFieldRequirements();
	});

	useEffect(() => {
		if (isOpen) setFieldRequirements(customRequirements ?? loadPatientFieldRequirements());
	}, [isOpen, customRequirements]);

	const [advertisingSource, setAdvertisingSource] = useState<string>(
		patientAdministrativeProfileDraft.preferredAppointmentNote?.startsWith("src:")
			? patientAdministrativeProfileDraft.preferredAppointmentNote.replace("src:", "")
			: DEFAULT_ADVERTISING_SOURCE,
	);

	const [showDocFields, setShowDocFields] = useState(false);
	const [isEmergencyOrPrimary, setIsEmergencyOrPrimary] = useState(true);
	const [isSomaticNorm, setIsSomaticNorm] = useState(true);
	const [isChildManual, setIsChildManual] = useState(initialIsChild);

	const [parentRole, setParentRole] = useState<string>(
		patientAdministrativeProfileDraft.legalRepresentativeRelationship || "Мама",
	);
	const [parentName, setParentName] = useState<string>(
		patientAdministrativeProfileDraft.legalRepresentativeFullName || "",
	);
	const [parentPhone, setParentPhone] = useState<string>(
		patientAdministrativeProfileDraft.legalRepresentativePhone || "",
	);

	useEffect(() => {
		if (isOpen) {
			setParentRole(patientAdministrativeProfileDraft.legalRepresentativeRelationship || "Мама");
			setParentName(patientAdministrativeProfileDraft.legalRepresentativeFullName || "");
			setParentPhone(patientAdministrativeProfileDraft.legalRepresentativePhone || "");
		}
	}, [isOpen, patientAdministrativeProfileDraft]);

	const nameInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isOpen) {
			const timeout = setTimeout(() => nameInputRef.current?.focus(), 50);
			return () => clearTimeout(timeout);
		}
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	return {
		newPatientName, newPatientPhone, newPatientBirthDate, isPatientCreating,
		setNewPatientName, setNewPatientPhone, setNewPatientBirthDate, setSelectedPatientId,
		patientAdministrativeProfileDraft, setPatientAdministrativeProfileDraft,
		appLogic, patients, fieldRequirements, advertisingSource, setAdvertisingSource,
		showDocFields, setShowDocFields, isEmergencyOrPrimary, setIsEmergencyOrPrimary,
		isSomaticNorm, setIsSomaticNorm, isChildManual, setIsChildManual,
		parentRole, setParentRole, parentName, setParentName, parentPhone, setParentPhone,
		nameInputRef, initialBirthDate,
	};
}

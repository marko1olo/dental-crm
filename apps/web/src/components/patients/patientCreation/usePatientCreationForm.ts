/**
 * usePatientCreationForm.ts — Layer 3: Хук управления состоянием формы создания пациента.
 *
 * КОНТЕКСТ & МАНДАТ:
 * - Управление полями и синхронизация со store/контекстом.
 * - Валидация по требованиям клиники (Фича №35).
 * - Сабмит, быстрый чекин в расписание и открытие приёма дежурного врача.
 * - Печать первичного пакета договора со строками «________».
 */

import {
	calculateAge,
	generateAnonymousPatientCode,
	type Patient,
} from "@dental/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import { formatPhoneNumber } from "../../../utils/inputSanitation";
import { printPrimaryIntakePackage } from "../../documents/primaryIntakePackagePrintEngine";
import { showToast } from "../../GlobalToast";
import {
	findPotentialDuplicates,
	type PotentialDuplicateItem,
} from "../../schedule/patientSearchEngine";
import {
	loadPatientFieldRequirements,
	type PatientFieldRequirements,
	validatePatientDraftWithRequirements,
} from "../patientFieldRequirementsConfig";
import {
	DEFAULT_ADVERTISING_SOURCE,
	EMERGENCY_APPOINTMENT_COMMENT,
	EMERGENCY_APPOINTMENT_REASON,
	EMERGENCY_PATIENT_FALLBACK_NAME,
	ROUTINE_APPOINTMENT_REASON,
	TOAST_BLANK_CONTRACT_PRINTED,
	TOAST_PATIENT_CREATED_SCHEDULE,
	TOAST_PATIENT_CREATED_VISIT,
	TOAST_SPECIFY_NAME_OR_EMERGENCY,
} from "./constants";
import type {
	UsePatientCreationFormOptions,
	UsePatientCreationFormResult,
} from "./types";

export function usePatientCreationForm({
	isOpen,
	onClose,
	createPatient,
	updatePatientCoreDraft,
	customRequirements,
	initialBirthDate,
	initialIsChild = false,
}: UsePatientCreationFormOptions): UsePatientCreationFormResult {
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

	// Active requirements from clinic settings / storage
	const [fieldRequirements, setFieldRequirements] =
		useState<PatientFieldRequirements>(() => {
			return customRequirements ?? loadPatientFieldRequirements();
		});

	useEffect(() => {
		if (isOpen) {
			setFieldRequirements(
				customRequirements ?? loadPatientFieldRequirements(),
			);
		}
	}, [isOpen, customRequirements]);

	// Advertising source state in modal
	const [advertisingSource, setAdvertisingSource] = useState<string>(
		patientAdministrativeProfileDraft.preferredAppointmentNote?.startsWith(
			"src:",
		)
			? patientAdministrativeProfileDraft.preferredAppointmentNote.replace(
					"src:",
					"",
				)
			: DEFAULT_ADVERTISING_SOURCE,
	);

	const potentialDuplicates: PotentialDuplicateItem[] = useMemo(() => {
		return findPotentialDuplicates(patients, {
			fullName: newPatientName,
			phone: newPatientPhone,
			thresholdScore: 35,
			limit: 3,
		});
	}, [patients, newPatientName, newPatientPhone]);

	const [showDocFields, setShowDocFields] = useState(false);
	const [isEmergencyOrPrimary, setIsEmergencyOrPrimary] = useState(true);
	const [isSomaticNorm, setIsSomaticNorm] = useState(true);

	const effectivePhone =
		newPatientPhone || usePatientStore.getState().newPatientPhone;
	const effectiveBirthDate =
		initialBirthDate ??
		(newPatientBirthDate || usePatientStore.getState().newPatientBirthDate);

	// Minor (< 14 years old) check for dynamic document labeling (birth certificate vs passport)
	const patientAge = useMemo(() => {
		if (!effectiveBirthDate?.trim()) return null;
		const parsed = new Date(effectiveBirthDate);
		if (Number.isNaN(parsed.getTime())) return null;
		return calculateAge(effectiveBirthDate);
	}, [effectiveBirthDate]);

	const isMinorUnder14 = patientAge !== null && patientAge < 14;
	const isMinorUnder18 = patientAge !== null && patientAge < 18;
	const [isChildManual, setIsChildManual] = useState(initialIsChild);
	const isChild = isMinorUnder18 || isChildManual;

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
			setParentRole(
				patientAdministrativeProfileDraft.legalRepresentativeRelationship || "Мама",
			);
			setParentName(
				patientAdministrativeProfileDraft.legalRepresentativeFullName || "",
			);
			setParentPhone(
				patientAdministrativeProfileDraft.legalRepresentativePhone || "",
			);
		}
	}, [isOpen, patientAdministrativeProfileDraft]);

	const nameInputRef = useRef<HTMLInputElement>(null);

	// Focus input on mount/open
	useEffect(() => {
		if (isOpen) {
			const timeout = setTimeout(() => {
				nameInputRef.current?.focus();
			}, 50);
			return () => clearTimeout(timeout);
		}
	}, [isOpen]);

	// Escape key to close
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Validation against clinic requirements (Feature #35)
	const validationResult = validatePatientDraftWithRequirements(
		{
			fullName: newPatientName,
			phone: newPatientPhone,
			advertisingSource,
			snils: patientAdministrativeProfileDraft.snils,
			birthDate: effectiveBirthDate,
			identityDocument: patientAdministrativeProfileDraft.identityDocument,
			isAnonymous: patientAdministrativeProfileDraft.isAnonymous,
			isEmergencyOrPrimary,
		},
		fieldRequirements,
	);

	const patientCreateReady = validationResult.isValid && !isPatientCreating;
	const patientCreateGuidance = validationResult.guidanceMessage;

	// Quick intake validation (emergency / booking / duty doctor): requires ONLY full name and phone (or name only if anonymous per PP RF 659)
	const quickIntakeValidationResult = useMemo(() => {
		return validatePatientDraftWithRequirements(
			{
				fullName: newPatientName,
				phone: newPatientPhone,
				isAnonymous: patientAdministrativeProfileDraft.isAnonymous,
				isEmergencyOrPrimary: true,
			},
			{
				...fieldRequirements,
				requirePhone: !patientAdministrativeProfileDraft.isAnonymous,
				requireAdvertisingSource: false,
				requireSnils: false,
				requireBirthDate: false,
				requireIdentityDocument: false,
			},
		);
	}, [
		newPatientName,
		newPatientPhone,
		patientAdministrativeProfileDraft.isAnonymous,
		fieldRequirements,
	]);

	const quickActionReady =
		quickIntakeValidationResult.isValid && !isPatientCreating;

	const handlePrintBlankContract = () => {
		const clinicProfile = appLogic?.dashboard?.clinicSettings?.profile;
		printPrimaryIntakePackage({
			patient: {
				fullName: newPatientName.trim() || undefined,
				phone: newPatientPhone.trim() || undefined,
				birthDate: newPatientBirthDate.trim() || undefined,
				snils: patientAdministrativeProfileDraft.snils || undefined,
				passport: patientAdministrativeProfileDraft.identityDocument || undefined,
			},
			clinic: clinicProfile
				? {
						legalName: clinicProfile.legalName,
						clinicName: clinicProfile.clinicName,
						inn: clinicProfile.inn,
						kpp: clinicProfile.kpp,
						ogrn: clinicProfile.ogrn,
						licenseNumber: clinicProfile.licenseNumber,
						licenseDate: clinicProfile.licenseDate,
						address: clinicProfile.actualAddress || clinicProfile.address,
						phone: clinicProfile.phone,
						directorFullName: clinicProfile.directorFullName,
						directorTitle: clinicProfile.directorTitle,
					}
				: undefined,
			doctorFullName: null,
			intakeNormApplied: isSomaticNorm,
		});
		showToast(TOAST_BLANK_CONTRACT_PRINTED, "info", 4000);
	};

	const handleCreate = async () => {
		if (isPatientCreating) return;
		const inputElem =
			typeof document !== "undefined"
				? (document.getElementById(
						"patient-create-full-name",
					) as HTMLInputElement | null)
				: null;
		let effectiveName =
			newPatientName.trim() ||
			usePatientStore.getState().newPatientName.trim() ||
			inputElem?.value.trim() ||
			"";
		if (!effectiveName) {
			if (isEmergencyOrPrimary) {
				effectiveName = EMERGENCY_PATIENT_FALLBACK_NAME;
				setNewPatientName(effectiveName);
				usePatientStore.getState().setNewPatientName(effectiveName);
			} else {
				showToast(TOAST_SPECIFY_NAME_OR_EMERGENCY, "warning");
				return;
			}
		} else {
			setNewPatientName(effectiveName);
			usePatientStore.getState().setNewPatientName(effectiveName);
		}
		const phoneElem =
			typeof document !== "undefined"
				? (document.getElementById(
						"patient-create-phone",
					) as HTMLInputElement | null)
				: null;
		const effectivePhoneVal =
			newPatientPhone.trim() ||
			usePatientStore.getState().newPatientPhone.trim() ||
			phoneElem?.value.trim() ||
			"";
		if (effectivePhoneVal) {
			const formatted = formatPhoneNumber(effectivePhoneVal);
			setNewPatientPhone(formatted);
			usePatientStore.getState().setNewPatientPhone(formatted);
		}
		const birthElem =
			typeof document !== "undefined"
				? (document.getElementById(
						"patient-create-birth-date",
					) as HTMLInputElement | null)
				: null;
		const effectiveBirth =
			newPatientBirthDate.trim() ||
			usePatientStore.getState().newPatientBirthDate.trim() ||
			birthElem?.value.trim() ||
			"";
		if (effectiveBirth) {
			setNewPatientBirthDate(effectiveBirth);
			usePatientStore.getState().setNewPatientBirthDate(effectiveBirth);
		}
		try {
			// Attach advertising source note to administrative profile draft
			if (advertisingSource) {
				setPatientAdministrativeProfileDraft((prev) => ({
					...prev,
					preferredAppointmentNote: `src:${advertisingSource}`,
				}));
			}
			if (isChild && (parentName.trim() || parentPhone.trim() || parentRole)) {
				setPatientAdministrativeProfileDraft((prev) => ({
					...prev,
					legalRepresentativeRelationship: parentRole || "Мама",
					legalRepresentativeFullName: parentName.trim(),
					legalRepresentativePhone: parentPhone.trim(),
				}));
			}
			await createPatient();
			onClose();
			if (validationResult.missingRequiredLabels.length > 0) {
				showToast(
					`Пациент создан. Поля (${validationResult.missingRequiredLabels.join(", ")}) можно внести позже при оформлении договора`,
					"info",
					4000,
				);
			}
		} catch {
			// Managed by store/appLogic
		}
	};

	const handleCreateAndBook = async () => {
		if (isPatientCreating) return;
		let effectiveName = newPatientName.trim();
		if (!effectiveName) {
			if (isEmergencyOrPrimary) {
				effectiveName = EMERGENCY_PATIENT_FALLBACK_NAME;
				setNewPatientName(effectiveName);
				usePatientStore.getState().setNewPatientName(effectiveName);
			} else {
				showToast(TOAST_SPECIFY_NAME_OR_EMERGENCY, "warning");
				return;
			}
		} else {
			usePatientStore.getState().setNewPatientName(effectiveName);
		}
		try {
			if (advertisingSource) {
				setPatientAdministrativeProfileDraft((prev) => ({
					...prev,
					preferredAppointmentNote: `src:${advertisingSource}`,
				}));
			}
			if (isChild && (parentName.trim() || parentPhone.trim() || parentRole)) {
				setPatientAdministrativeProfileDraft((prev) => ({
					...prev,
					legalRepresentativeRelationship: parentRole || "Мама",
					legalRepresentativeFullName: parentName.trim(),
					legalRepresentativePhone: parentPhone.trim(),
				}));
			}
			const created = await createPatient();
			onClose();

			const targetId =
				(created as Patient | null | undefined)?.id ||
				usePatientStore.getState().selectedPatientId;
			const now = new Date();
			const pad = (n: number) => String(n).padStart(2, "0");
			const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
			const currentHour = now.getHours();
			const startHour = Math.min(Math.max(currentHour + 1, 9), 20);
			const endHour = Math.min(startHour + 1, 21);
			const startsAt = `${todayIso}T${pad(startHour)}:00:00.000Z`;
			const endsAt = `${todayIso}T${pad(endHour)}:00:00.000Z`;

			useScheduleStore.getState().setNewAppointmentDraft({
				patientId: targetId || "",
				doctorUserId: "",
				assistantUserId: "",
				chairId: "",
				status: "planned",
				startsAt,
				endsAt,
				reason: isEmergencyOrPrimary
					? EMERGENCY_APPOINTMENT_REASON
					: ROUTINE_APPOINTMENT_REASON,
				comment: isEmergencyOrPrimary ? EMERGENCY_APPOINTMENT_COMMENT : "",
			});
			useAppStore.getState().setCurrentView("schedule");
			showToast(TOAST_PATIENT_CREATED_SCHEDULE, "success");
		} catch {
			// Managed by store/appLogic
		}
	};

	const handleCreateAndOpenVisit = async () => {
		if (isPatientCreating) return;
		let effectiveName = newPatientName.trim();
		if (!effectiveName) {
			if (isEmergencyOrPrimary) {
				effectiveName = EMERGENCY_PATIENT_FALLBACK_NAME;
				setNewPatientName(effectiveName);
				usePatientStore.getState().setNewPatientName(effectiveName);
			} else {
				showToast(TOAST_SPECIFY_NAME_OR_EMERGENCY, "warning");
				return;
			}
		} else {
			usePatientStore.getState().setNewPatientName(effectiveName);
		}
		try {
			if (advertisingSource) {
				setPatientAdministrativeProfileDraft((prev) => ({
					...prev,
					preferredAppointmentNote: `src:${advertisingSource}`,
				}));
			}
			if (isChild && (parentName.trim() || parentPhone.trim() || parentRole)) {
				setPatientAdministrativeProfileDraft((prev) => ({
					...prev,
					legalRepresentativeRelationship: parentRole || "Мама",
					legalRepresentativeFullName: parentName.trim(),
					legalRepresentativePhone: parentPhone.trim(),
				}));
			}
			const created = await createPatient();
			onClose();

			const targetId =
				(created as Patient | null | undefined)?.id ||
				usePatientStore.getState().selectedPatientId;
			if (targetId) {
				usePatientStore.getState().setSelectedPatientId(targetId);
			}
			useAppStore.getState().setCurrentView("visit");
			showToast(TOAST_PATIENT_CREATED_VISIT, "success");
		} catch {
			// Managed by store/appLogic
		}
	};

	const handleQuickCreateKeyDown = (
		event: ReactKeyboardEvent<HTMLInputElement>,
	) => {
		if (event.key !== "Enter") return;
		event.preventDefault();
		if (!quickActionReady) {
			if (!newPatientName.trim() && !isEmergencyOrPrimary) {
				showToast(TOAST_SPECIFY_NAME_OR_EMERGENCY, "warning");
			}
			return;
		}
		void handleCreate();
	};

	const handleToggleAnonymous = () => {
		const nextIsAnon = !patientAdministrativeProfileDraft.isAnonymous;
		if (nextIsAnon) {
			const anonCode = generateAnonymousPatientCode();
			setPatientAdministrativeProfileDraft((prev) => ({
				...prev,
				isAnonymous: true,
				anonymousCode: anonCode,
			}));
			if (!newPatientName.trim() || newPatientName.startsWith("UUID_ANON")) {
				setNewPatientName(anonCode);
			}
		} else {
			setPatientAdministrativeProfileDraft((prev) => ({
				...prev,
				isAnonymous: false,
				anonymousCode: null,
			}));
			if (newPatientName.startsWith("UUID_ANON")) {
				setNewPatientName("");
			}
		}
	};

	return {
		fieldRequirements,
		advertisingSource,
		setAdvertisingSource,
		showDocFields,
		setShowDocFields,
		isEmergencyOrPrimary,
		setIsEmergencyOrPrimary,
		isSomaticNorm,
		setIsSomaticNorm,
		isMinorUnder14,
		isChild,
		setIsChildManual,
		parentRole,
		setParentRole,
		parentName,
		setParentName,
		parentPhone,
		setParentPhone,
		nameInputRef,
		potentialDuplicates,
		validationResult,
		patientCreateReady,
		patientCreateGuidance,
		quickActionReady,
		handlePrintBlankContract,
		handleCreate,
		handleCreateAndBook,
		handleCreateAndOpenVisit,
		handleQuickCreateKeyDown,
		handleToggleAnonymous,
		newPatientName,
		setNewPatientName,
		newPatientPhone,
		setNewPatientPhone,
		effectivePhone,
		effectiveBirthDate,
		setNewPatientBirthDate,
		isPatientCreating,
		setSelectedPatientId,
		patientAdministrativeProfileDraft,
		setPatientAdministrativeProfileDraft,
	};
}

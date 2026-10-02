/**
 * PatientCreationModal.tsx — Регистрация нового пациента с настраиваемой обязательностью полей (Фича №35).
 *
 * КОНТЕКСТ & МАНДАТ (THE HAMMER):
 * 1. Настраиваемая обязательность полей (Телефон, Рекламный источник, СНИЛС) из patientFieldRequirementsConfig.
 * 2. Анти-дубликатный фильтр с 1-клик переходом в существующую карту.
 * 3. Голосовой ввод и умный разбор строки.
 * 4. Плотный медицинский UI без гигантских раздутых кнопок (32-36px).
 * 5. 100% честное сохранение без заглушек.
 */

import {
	calculateAge,
	generateAnonymousPatientCode,
	type Patient,
} from "@dental/shared";
import {
	AlertTriangle,
	Baby,
	Calendar,
	Check,
	ExternalLink,
	EyeOff,
	FileText,
	Megaphone,
	Phone,
	Plus,
	Printer,
	ShieldCheck,
	Stethoscope,
	UserPlus,
	Users,
	X,
	Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { printPrimaryIntakePackage } from "../documents/primaryIntakePackagePrintEngine";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { DictationHints } from "../../DictationHints";
import { parsePatientDictationLocal } from "../../lib/smartPatientParser";
import type { PatientCoreDraft } from "../../PatientsView";
import {
	type SmartParsedPayload,
	SmartParsePreview,
} from "../../SmartParsePreview";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import {
	formatOmsPolicy,
	formatPhoneNumber,
	formatRussianPassport,
	formatSnils,
} from "../../utils/inputSanitation";
import { showToast } from "../GlobalToast";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import {
	findPotentialDuplicates,
	type PotentialDuplicateItem,
} from "../schedule/patientSearchEngine";
import {
	DENTAL_ADVERTISING_SOURCES,
	loadPatientFieldRequirements,
	type PatientFieldRequirements,
	validatePatientDraftWithRequirements,
} from "./patientFieldRequirementsConfig";

export interface PatientCreationModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly createPatient: () => void | Promise<void | Patient | null>;
	readonly updatePatientCoreDraft?: (
		field: keyof PatientCoreDraft,
		value: string,
	) => void;
	/** Опциональное переопределение требований клиники */
	readonly customRequirements?: PatientFieldRequirements;
	/** Опционально: начальная дата рождения пациента */
	readonly initialBirthDate?: string;
	/** Опционально: начальный флаг режима ребёнка */
	readonly initialIsChild?: boolean;
}

export function PatientCreationModal({
	isOpen,
	onClose,
	createPatient,
	updatePatientCoreDraft,
	customRequirements,
	initialBirthDate,
	initialIsChild = false,
}: PatientCreationModalProps) {
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
			: "website_online",
	);

	const potentialDuplicates: PotentialDuplicateItem[] = useMemo(() => {
		return findPotentialDuplicates(patients, {
			fullName: newPatientName,
			phone: newPatientPhone,
			thresholdScore: 35,
			limit: 3,
		});
	}, [patients, newPatientName, newPatientPhone]);

	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<ReturnType<
		typeof parsePatientDictationLocal
	> | null>(null);
	const [showHints, setShowHints] = useState(false);
	const [showDocFields, setShowDocFields] = useState(false);
	const [isEmergencyOrPrimary, setIsEmergencyOrPrimary] = useState(true);
	const [isSomaticNorm, setIsSomaticNorm] = useState(true);

	const effectiveName =
		newPatientName || usePatientStore.getState().newPatientName;
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

	if (!isOpen) return null;

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

	// Quick intake validation (CITO / booking / duty doctor): requires ONLY full name and phone (or name only if anonymous per PP RF 659)
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
		showToast(
			"Бланк договора со строками «________» отправлен на печать для зоны ожидания (без 403-ошибок)",
			"info",
			4000,
		);
	};

	const handleCreate = async () => {
		if (isPatientCreating) return;
		const inputElem = typeof document !== "undefined" ? (document.getElementById("patient-create-full-name") as HTMLInputElement | null) : null;
		let effectiveName = (newPatientName.trim() || usePatientStore.getState().newPatientName.trim() || inputElem?.value.trim() || "");
		if (!effectiveName) {
			if (isEmergencyOrPrimary) {
				effectiveName = "Пациент с острой болью (CITO)";
				setNewPatientName(effectiveName);
				usePatientStore.getState().setNewPatientName(effectiveName);
			} else {
				showToast(
					"Укажите имя пациента или включите CITO для экстренной записи",
					"warning",
				);
				return;
			}
		} else {
			setNewPatientName(effectiveName);
			usePatientStore.getState().setNewPatientName(effectiveName);
		}
		const phoneElem = typeof document !== "undefined" ? (document.getElementById("patient-create-phone") as HTMLInputElement | null) : null;
		const effectivePhone = (newPatientPhone.trim() || usePatientStore.getState().newPatientPhone.trim() || phoneElem?.value.trim() || "");
		if (effectivePhone) {
			const formatted = formatPhoneNumber(effectivePhone);
			setNewPatientPhone(formatted);
			usePatientStore.getState().setNewPatientPhone(formatted);
		}
		const birthElem = typeof document !== "undefined" ? (document.getElementById("patient-create-birth-date") as HTMLInputElement | null) : null;
		const effectiveBirth = (newPatientBirthDate.trim() || usePatientStore.getState().newPatientBirthDate.trim() || birthElem?.value.trim() || "");
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
				effectiveName = "Пациент с острой болью (CITO)";
				setNewPatientName(effectiveName);
				usePatientStore.getState().setNewPatientName(effectiveName);
			} else {
				showToast(
					"Укажите имя пациента или включите CITO для экстренной записи",
					"warning",
				);
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
					? "CITO! Острая боль"
					: "Первичный приём и консультация",
				comment: isEmergencyOrPrimary
					? "Экстренный прием по острой боли (ст. 124 УК РФ)"
					: "",
			});
			useAppStore.getState().setCurrentView("schedule");
			showToast(
				"Пациент создан. Открыто расписание для выбора времени приёма",
				"success",
			);
		} catch {
			// Managed by store/appLogic
		}
	};

	const handleCreateAndOpenVisit = async () => {
		if (isPatientCreating) return;
		let effectiveName = newPatientName.trim();
		if (!effectiveName) {
			if (isEmergencyOrPrimary) {
				effectiveName = "Пациент с острой болью (CITO)";
				setNewPatientName(effectiveName);
				usePatientStore.getState().setNewPatientName(effectiveName);
			} else {
				showToast(
					"Укажите имя пациента или включите CITO для экстренной записи",
					"warning",
				);
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
			showToast(
				"Пациент создан. Открыт амбулаторный приём (дежурный врач)",
				"success",
			);
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
				showToast(
					"Укажите имя пациента или включите CITO для экстренной записи",
					"warning",
				);
			}
			return;
		}
		void handleCreate();
	};

	const modalContent = (
		<div
			className="create-patient-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-patient-modal-title"
			data-testid="patient-creation-modal-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div className="create-patient-modal-card">
				{/* Modal Header */}
				<header className="create-patient-modal-header">
					<div className="create-patient-modal-title-wrap">
						<div className="create-patient-modal-icon-badge" aria-hidden="true">
							<UserPlus size={20} />
						</div>
						<div>
							<h2
								id="create-patient-modal-title"
								className="create-patient-modal-title"
							>
								Новый пациент
							</h2>
							<p className="create-patient-modal-subtitle">
								Регистрация медицинской карты пациента
							</p>
						</div>
					</div>
					<button
						type="button"
						className="create-patient-modal-close-btn"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
						title="Закрыть (Esc)"
					>
						<X size={20} aria-hidden="true" />
					</button>
				</header>

				{/* Modal Body */}
				<div className="create-patient-modal-body">
					{/* Quick Mode: Emergency / Primary Intake without documents */}
					<div
						style={{
							marginBottom: "10px",
							padding: "10px 12px",
							borderRadius: "8px",
							border: isEmergencyOrPrimary
								? "1px solid rgba(244, 63, 94, 0.4)"
								: "1px solid var(--glass-border)",
							backgroundColor: isEmergencyOrPrimary
								? "rgba(244, 63, 94, 0.08)"
								: "var(--glass-panel)",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "12px",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "10px",
								minWidth: 0,
							}}
						>
							<Zap
								size={18}
								style={{
									flexShrink: 0,
									color: isEmergencyOrPrimary ? "var(--bad-fg, #f43f5e)" : "var(--muted)",
								}}
							/>
							<div style={{ fontSize: "12px" }}>
								<div
									style={{
										fontWeight: "bold",
										display: "flex",
										alignItems: "center",
										gap: "6px",
									}}
								>
									Острая боль / Первичный осмотр (без документов)
									{isEmergencyOrPrimary && (
										<span
											style={{
												fontSize: "10px",
												fontWeight: "bold",
												padding: "1px 6px",
												borderRadius: "4px",
												backgroundColor: "var(--bad-fg, #f43f5e)",
												color: "var(--paper-strong, #ffffff)",
											}}
										>
											АКТИВЕН
										</span>
									)}
								</div>
								<div style={{ fontSize: "11px", color: "var(--muted)" }}>
									{isEmergencyOrPrimary
										? "СНИЛС, паспорт и источник обращения не блокируют запись. Документы можно внести позже."
										: "Быстрое создание карты для экстренного пациента без паспорта и СНИЛС"}
								</div>
							</div>
						</div>
						<button
							type="button"
							style={{
								padding: "6px 12px",
								fontSize: "12px",
								fontWeight: 600,
								borderRadius: "6px",
								cursor: "pointer",
								flexShrink: 0,
								backgroundColor: isEmergencyOrPrimary
									? "var(--bad-fg, #f43f5e)"
									: "var(--paper-strong)",
								color: isEmergencyOrPrimary ? "var(--paper-strong, #ffffff)" : "var(--ink)",
								border: "1px solid var(--glass-border)",
								minHeight: "36px",
							}}
							onClick={() => setIsEmergencyOrPrimary((prev) => !prev)}
							data-testid="patient-create-emergency-toggle"
						>
							{isEmergencyOrPrimary ? "Отключить" : "Включить"}
						</button>
					</div>

					{/* Decree 659: Anonymous Stealth Mode Toggle */}
					<div
						style={{
							marginBottom: "12px",
							padding: "10px 12px",
							borderRadius: "8px",
							border: patientAdministrativeProfileDraft.isAnonymous
								? "1px solid rgba(245, 158, 11, 0.4)"
								: "1px solid var(--glass-border)",
							backgroundColor: patientAdministrativeProfileDraft.isAnonymous
								? "rgba(245, 158, 11, 0.08)"
								: "var(--glass-panel)",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "12px",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "10px",
								minWidth: 0,
							}}
						>
							<EyeOff
								size={18}
								style={{
									flexShrink: 0,
									color: patientAdministrativeProfileDraft.isAnonymous
										? "var(--warning-fg, #f59e0b)"
										: "var(--muted)",
								}}
							/>
							<div style={{ fontSize: "12px" }}>
								<div
									style={{
										fontWeight: "bold",
										display: "flex",
										alignItems: "center",
										gap: "6px",
									}}
								>
									Анонимный приём (ПП РФ №659)
									{patientAdministrativeProfileDraft.isAnonymous && (
										<span
											style={{
												fontSize: "10px",
												fontWeight: "bold",
												padding: "1px 6px",
												borderRadius: "4px",
												backgroundColor: "var(--warning-fg, #b45309)",
												color: "var(--paper-strong, #ffffff)",
											}}
										>
											АКТИВЕН
										</span>
									)}
								</div>
								<div style={{ fontSize: "11px", color: "var(--muted)" }}>
									{patientAdministrativeProfileDraft.isAnonymous
										? "Паспорт и СНИЛС не требуются. Оплата только коммерческая (ОМС запрещён законом)."
										: "Режим создания карты без паспорта с фиксацией со слов пациента"}
								</div>
							</div>
						</div>
						<button
							type="button"
							style={{
								padding: "6px 12px",
								fontSize: "12px",
								fontWeight: 600,
								borderRadius: "6px",
								cursor: "pointer",
								flexShrink: 0,
								backgroundColor: patientAdministrativeProfileDraft.isAnonymous
									? "var(--warning-fg, #b45309)"
									: "var(--paper-strong)",
								color: patientAdministrativeProfileDraft.isAnonymous
									? "var(--paper-strong, #ffffff)"
									: "var(--ink)",
								border: "1px solid var(--glass-border)",
								minHeight: "36px",
							}}
							onClick={() => {
								const nextIsAnon =
									!patientAdministrativeProfileDraft.isAnonymous;
								if (nextIsAnon) {
									const anonCode = generateAnonymousPatientCode();
									setPatientAdministrativeProfileDraft((prev) => ({
										...prev,
										isAnonymous: true,
										anonymousCode: anonCode,
									}));
									if (
										!newPatientName.trim() ||
										newPatientName.startsWith("UUID_ANON")
									) {
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
							}}
						>
							{patientAdministrativeProfileDraft.isAnonymous
								? "Отключить"
								: "Включить"}
						</button>
					</div>

					{/* Full Name field with voice & smart parse preview */}
					<div className="create-patient-form-field">
						<div className="create-patient-label-row">
							<label
								htmlFor="patient-create-full-name"
								className="create-patient-label"
							>
								ФИО пациента <span className="text-rose-500 font-bold">*</span>
							</label>
							<div
								style={{ display: "flex", alignItems: "center", gap: "6px" }}
							>
								<button
									type="button"
									className="create-patient-smart-parse-btn"
									onClick={() => setShowHints(!showHints)}
									title="Показать примеры голосового ввода"
									style={{
										fontSize: "12px",
										minHeight: "32px",
										padding: "4px 8px",
									}}
								>
									{showHints ? "Скрыть подсказку" : "? Подсказка"}
								</button>
								{(newPatientName ?? "").trim().length > 0 ? (
									<button
										type="button"
										className="create-patient-smart-parse-btn"
										onClick={() => {
											setSmartParsedData(
												parsePatientDictationLocal(newPatientName),
											);
											setShowSmartPreview(true);
											setShowHints(false);
										}}
										title="Разобрать строку на ФИО, телефон и дату рождения"
									>
										Разобрать строку
									</button>
								) : null}
							</div>
						</div>

						<div className="smart-input-wrapper">
							<input
								ref={nameInputRef}
								id="patient-create-full-name"
								autoComplete="name"
								value={newPatientName}
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									setNewPatientName(event.target.value)
								}
								onKeyDown={handleQuickCreateKeyDown}
								placeholder="Иванов Иван Иванович"
								className={`create-patient-input ${validationResult.errors.fullName ? "border-rose-500" : ""}`}
								aria-invalid={!!validationResult.errors.fullName}
							/>
							<SmartMicrophoneButton
								context="patient"
								onResult={(text) => {
									setNewPatientName(text);
									const parsed = parsePatientDictationLocal(text);
									setSmartParsedData(parsed);
									setShowSmartPreview(true);
									setShowHints(false);
								}}
								style={{
									position: "absolute",
									right: "6px",
									top: "50%",
									transform: "translateY(-50%)",
								}}
							/>
							<DictationHints isVisible={showHints} type="patient" />
							<SmartParsePreview
								isVisible={showSmartPreview}
								parsedData={smartParsedData as SmartParsedPayload | null}
								rawText={newPatientName}
								type="patient"
								onApply={(payload: SmartParsedPayload) => {
									if (payload) {
										setNewPatientName(payload.fullName || newPatientName);
										if (payload.phone) setNewPatientPhone(payload.phone);
										if (payload.birthDate)
											setNewPatientBirthDate(payload.birthDate);
										if (payload.notes && updatePatientCoreDraft) {
											updatePatientCoreDraft("notes", payload.notes);
										}
									}
									setShowSmartPreview(false);
								}}
								onManual={() => setShowSmartPreview(false)}
								onClose={() => setShowSmartPreview(false)}
							/>
						</div>
						{validationResult.errors.fullName && (
							<span className="text-xs text-rose-500 font-semibold mt-1">
								{validationResult.errors.fullName}
							</span>
						)}

						{/* Anti-Duplicate Warning in Patient Creation */}
						{potentialDuplicates.length > 0 && (
							<div
								className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 text-xs space-y-2 mt-2"
								data-testid="create-patient-duplicate-warning"
							>
								<div className="flex items-start gap-2">
									<AlertTriangle
										size={16}
										className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
									/>
									<div className="space-y-0.5">
										<p className="font-bold m-0">
											Похожий пациент уже зарегистрирован:
										</p>
										<p className="m-0 text-[var(--muted)]">
											Во избежание дублирования карт вы можете открыть
											существующую карту:
										</p>
									</div>
								</div>
								<div className="space-y-1.5 pl-6">
									{potentialDuplicates.map((item) => {
										const p = item.patient;
										const reasonLabel =
											item.duplicateReason === "both"
												? "ФИО и Телефон"
												: item.duplicateReason === "phone"
													? "Совпадение по телефону"
													: item.duplicateReason === "fuzzy_name"
														? `Похожее ФИО (${item.score}%)`
														: "Совпадение по ФИО";

										return (
											<div
												key={p.id}
												className="w-full p-2.5 rounded-lg bg-[var(--paper)] border border-amber-500/30 hover:border-amber-500/60 transition-colors flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap"
											>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-1.5 flex-wrap">
														<span className="font-bold text-[var(--ink)] truncate text-xs">
															{item.fullNameHighlights.map((part, pIdx) =>
																part.isMatch ? (
																	<mark
																		key={pIdx}
																		className="bg-amber-300/60 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100 rounded px-0.5 font-extrabold"
																	>
																		{part.text}
																	</mark>
																) : (
																	<span key={pIdx}>{part.text}</span>
																),
															)}
														</span>
														<span
															className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 shrink-0"
															data-testid="duplicate-reason-badge"
														>
															{reasonLabel}
														</span>
													</div>
													<div className="text-[11px] text-[var(--muted)] flex items-center gap-2 mt-0.5 flex-wrap">
														{p.phone && (
															<span className="font-mono flex items-center gap-1">
																<Phone size={10} className="shrink-0 opacity-70" />
																<span>
																	{item.phoneHighlights.map((part, pIdx) =>
																		part.isMatch ? (
																			<mark
																				key={pIdx}
																				className="bg-amber-300/60 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100 rounded px-0.5 font-extrabold"
																			>
																				{part.text}
																			</mark>
																		) : (
																			<span key={pIdx}>{part.text}</span>
																		),
																	)}
																</span>
															</span>
														)}
														{p.birthDate && (
															<span>д.р. {p.birthDate}</span>
														)}
													</div>
												</div>
												<div className="flex items-center gap-1.5 shrink-0">
													<button
														type="button"
														onClick={() => {
															setSelectedPatientId(p.id);
															onClose();
														}}
														className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--teal)] text-white hover:brightness-110 transition-all cursor-pointer shadow-xs min-h-[30px]"
														data-testid="select-existing-patient-btn"
														title="Выбрать эту карту и закрыть форму создания"
													>
														Выбрать эту карту
													</button>
													<button
														type="button"
														onClick={() => {
															window.open(`/patients?id=${p.id}`, "_blank", "noopener,noreferrer");
														}}
														className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--glass-border)] transition-colors cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center"
														title="Открыть карту в новом окне"
														aria-label="Открыть карту в новом окне"
													>
														<ExternalLink size={13} />
													</button>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>

					{/* Phone & Birth Date grid */}
					<div className="create-patient-grid-2">
						<div className="create-patient-form-field">
							<label
								htmlFor="patient-create-phone"
								className="create-patient-label"
							>
								Телефон{" "}
								{fieldRequirements.requirePhone &&
								!patientAdministrativeProfileDraft.isAnonymous ? (
									<span className="text-rose-500 font-bold">*</span>
								) : (
									<span className="text-xs text-[var(--muted)] font-normal">
										(опция)
									</span>
								)}
							</label>
							<input
								id="patient-create-phone"
								type="tel"
								inputMode="tel"
								autoComplete="tel"
								title="Телефон нового пациента"
								placeholder="+7 (999) 000-00-00"
								value={effectivePhone}
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									setNewPatientPhone(formatPhoneNumber(event.target.value))
								}
								onKeyDown={handleQuickCreateKeyDown}
								className={`create-patient-input ${validationResult.errors.phone ? "border-rose-500" : ""}`}
								aria-invalid={!!validationResult.errors.phone}
							/>
							{validationResult.errors.phone && (
								<span className="text-xs text-rose-500 font-semibold mt-1">
									{validationResult.errors.phone}
								</span>
							)}
						</div>

						<div className="create-patient-form-field">
							<div className="flex items-center justify-between">
								<label
									htmlFor="patient-create-birth-date"
									className="create-patient-label"
								>
									Дата рождения{" "}
									{fieldRequirements.requireBirthDate ? (
										<span className="text-rose-500 font-bold">*</span>
									) : (
										<span className="text-xs text-[var(--muted)] font-normal">
											(опция)
										</span>
									)}
								</label>
								<button
									type="button"
									onClick={() => setIsChildManual((prev) => !prev)}
									data-testid="patient-create-child-toggle"
									className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer flex items-center gap-1 ${
										isChild
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
											: "bg-[var(--paper-strong)] text-[var(--muted)] border-[var(--glass-border)] hover:text-[var(--ink)]"
									}`}
									title="Переключить режим ребенка (<18 лет) для привязки родителя"
								>
									<Baby size={12} className="shrink-0" />
									<span>{isChild ? "👶 Ребёнок (<18)" : "+ Ребёнок"}</span>
								</button>
							</div>
							<input
								id="patient-create-birth-date"
								type="date"
								autoComplete="bday"
								title="Дата рождения нового пациента"
								value={effectiveBirthDate}
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									setNewPatientBirthDate(event.target.value)
								}
								onKeyDown={handleQuickCreateKeyDown}
								className={`create-patient-input ${validationResult.errors.birthDate ? "border-rose-500" : ""}`}
								aria-invalid={!!validationResult.errors.birthDate}
							/>
							{validationResult.errors.birthDate && (
								<span className="text-xs text-rose-500 font-semibold mt-1">
									{validationResult.errors.birthDate}
								</span>
							)}
						</div>
					</div>

					{/* 1-Click Child Parent / Guardian Binding Section (Mandate 8e, 8n) */}
					{isChild && (
						<div
							className="p-3 rounded-xl border border-teal-500/40 bg-teal-500/10 space-y-2.5 mt-2 animate-in fade-in duration-200"
							data-testid="create-patient-child-rep-section"
						>
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
									<Users size={14} className="text-[var(--teal)] shrink-0" />
									<span>Привязка родителя / опекуна в 1 клик</span>
								</div>
								<span className="text-[11px] text-[var(--muted)]">
									Без бюрократии • Для записи и звонков
								</span>
							</div>

							{/* 1-Click Role Chips */}
							<div className="flex items-center gap-1.5 flex-wrap">
								{[
									{ role: "Мама", label: "👩 Мама", testId: "chip-rep-role-mother" },
									{ role: "Папа", label: "👨 Папа", testId: "chip-rep-role-father" },
									{ role: "Опекун", label: "🛡 Опекун", testId: "chip-rep-role-guardian" },
								].map((item) => (
									<button
										key={item.role}
										type="button"
										data-testid={item.testId}
										onClick={() => setParentRole(item.role)}
										className={`min-h-[30px] px-2.5 py-1 text-xs rounded-lg font-bold border transition cursor-pointer ${
											parentRole === item.role
												? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
												: "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-soft)]"
										}`}
									>
										{item.label}
									</button>
								))}
							</div>

							{/* 2 Clean Inputs: Имя родителя + Телефон родителя */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
								<div className="create-patient-form-field">
									<label
										htmlFor="patient-create-parent-name"
										className="create-patient-label text-xs"
									>
										Имя родителя
									</label>
									<input
										id="patient-create-parent-name"
										type="text"
										placeholder="Например: Анна Смирнова"
										value={parentName}
										onChange={(e) => setParentName(e.target.value)}
										className="create-patient-input text-xs"
										data-testid="input-child-parent-name"
									/>
								</div>

								<div className="create-patient-form-field">
									<div className="flex items-center justify-between">
										<label
											htmlFor="patient-create-parent-phone"
											className="create-patient-label text-xs"
										>
											Телефон родителя
										</label>
										{(effectivePhone || newPatientPhone) && (
											<button
												type="button"
												onClick={() => setParentPhone(effectivePhone || newPatientPhone)}
												className="text-[10px] text-[var(--teal)] hover:underline font-semibold bg-transparent border-0 cursor-pointer p-0"
												title="Скопировать телефон ребенка родителю"
												data-testid="btn-copy-child-phone"
											>
												Взять телефон ребёнка
											</button>
										)}
									</div>
									<input
										id="patient-create-parent-phone"
										type="tel"
										inputMode="tel"
										placeholder="+7 (999) 000-00-00"
										value={parentPhone}
										onChange={(e) => {
											const formatted = formatPhoneNumber(e.target.value);
											setParentPhone(formatted);
											if (!newPatientPhone) {
												setNewPatientPhone(formatted);
											}
										}}
										className="create-patient-input text-xs"
										data-testid="input-child-parent-phone"
									/>
								</div>
							</div>
						</div>
					)}

					{/* Marketing / Advertising Source Selection (Feature #28 & #35) */}
					<div className="create-patient-form-field mt-2">
						<label
							htmlFor="patient-create-advertising-source"
							className="create-patient-label flex items-center justify-between"
						>
							<span className="inline-flex items-center gap-1.5">
								<Megaphone size={14} className="text-[var(--teal)]" />
								Рекламный источник{" "}
								{fieldRequirements.requireAdvertisingSource ? (
									<span className="text-rose-500 font-bold">*</span>
								) : (
									<span className="text-xs text-[var(--muted)] font-normal">
										(для аналитики)
									</span>
								)}
							</span>
							{fieldRequirements.requireAdvertisingSource && (
								<span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
									Обязательно по настройке клиники
								</span>
							)}
						</label>
						<select
							id="patient-create-advertising-source"
							value={advertisingSource}
							onChange={(e) => setAdvertisingSource(e.target.value)}
							className={`create-patient-input ${validationResult.errors.advertisingSource ? "border-rose-500" : ""}`}
							aria-invalid={!!validationResult.errors.advertisingSource}
							data-testid="patient-create-advertising-source-select"
						>
							<option value="">— Выберите источник обращения —</option>
							<optgroup label="Онлайн-самозапись (Автоматические каналы)">
								{DENTAL_ADVERTISING_SOURCES.filter(
									(s) => s.isOnlineSelfBooking,
								).map((s) => (
									<option key={s.key} value={s.key}>
										{s.label}
									</option>
								))}
							</optgroup>
							<optgroup label="Администратор, Сарафан и Офлайн">
								{DENTAL_ADVERTISING_SOURCES.filter(
									(s) => !s.isOnlineSelfBooking,
								).map((s) => (
									<option key={s.key} value={s.key}>
										{s.label}
									</option>
								))}
							</optgroup>
						</select>
						{validationResult.errors.advertisingSource && (
							<span className="text-xs text-rose-500 font-semibold mt-1">
								{validationResult.errors.advertisingSource}
							</span>
						)}
					</div>

					{/* Collapsible Documents Section (СНИЛС, ОМС/ДМС, Паспорт) */}
					<div className="create-patient-doc-section mt-3 pt-3 border-t border-[var(--glass-border)]">
						<button
							type="button"
							className="create-patient-doc-toggle-btn text-xs font-bold text-[var(--teal)] hover:underline inline-flex items-center gap-1.5 min-h-[36px] bg-transparent border-0 cursor-pointer"
							onClick={() => setShowDocFields(!showDocFields)}
						>
							<FileText size={15} aria-hidden="true" />
							<span>
								{showDocFields
									? "Скрыть реквизиты документов"
									: fieldRequirements.requireSnils
										? "+ Добавить СНИЛС (ОБЯЗАТЕЛЕН ПО НАСТРОЙКЕ), ОМС или Паспорт"
										: "+ Добавить СНИЛС, ОМС или Паспорт"}
							</span>
						</button>

						{(showDocFields ||
							fieldRequirements.requireSnils ||
							fieldRequirements.requireIdentityDocument) && (
							<div className="create-patient-grid-2 mt-2 gap-3">
								<div className="create-patient-form-field">
									<label
										htmlFor="patient-create-snils"
										className="create-patient-label flex items-center gap-1"
									>
										<ShieldCheck size={13} className="text-[var(--teal)]" />
										СНИЛС{" "}
										{fieldRequirements.requireSnils ? (
											<span className="text-rose-500 font-bold">* (ЕГИСЗ)</span>
										) : (
											<span className="text-xs text-[var(--muted)] font-normal">
												(опция)
											</span>
										)}
									</label>
									<input
										id="patient-create-snils"
										inputMode="numeric"
										placeholder="000-000-000 00"
										value={patientAdministrativeProfileDraft.snils || ""}
										onChange={(e) =>
											setPatientAdministrativeProfileDraft((prev) => ({
												...prev,
												snils: formatSnils(e.target.value),
											}))
										}
										className={`create-patient-input ${validationResult.errors.snils ? "border-rose-500" : ""}`}
										aria-invalid={!!validationResult.errors.snils}
									/>
									{validationResult.errors.snils && (
										<span className="text-xs text-rose-500 font-semibold mt-1">
											{validationResult.errors.snils}
										</span>
									)}
									<span className="text-[10px] text-[var(--muted)] block mt-0.5">
										Не блокирует регистрацию. Требуется для выгрузки
										в ЕГИСЗ (РЭМД).
									</span>
								</div>

								<div className="create-patient-form-field">
									<label
										htmlFor="patient-create-oms"
										className="create-patient-label"
									>
										Полис ОМС / ДМС
									</label>
									<input
										id="patient-create-oms"
										placeholder="Номер полиса"
										value={
											patientAdministrativeProfileDraft.insurancePolicyNumber ||
											""
										}
										onChange={(e) =>
											setPatientAdministrativeProfileDraft((prev) => ({
												...prev,
												insurancePolicyNumber: formatOmsPolicy(e.target.value),
											}))
										}
										className="create-patient-input"
									/>
								</div>

								<div className="create-patient-form-field create-patient-full-width">
									<label
										htmlFor="patient-create-passport"
										className="create-patient-label"
									>
										{isMinorUnder14
											? "Свидетельство о рождении / Паспорт РФ"
											: "Паспорт РФ"}{" "}
										{fieldRequirements.requireIdentityDocument ? (
											<span className="text-rose-500 font-bold">*</span>
										) : (
											<span className="text-xs text-[var(--muted)] font-normal">
												(опция)
											</span>
										)}
									</label>
									<input
										id="patient-create-passport"
										placeholder={
											isMinorUnder14
												? "Серия (римские) № 000000 или паспорт"
												: "Серия и номер 0000 000000"
										}
										value={
											patientAdministrativeProfileDraft.identityDocument || ""
										}
										onChange={(e) =>
											setPatientAdministrativeProfileDraft((prev) => ({
												...prev,
												identityDocument: formatRussianPassport(e.target.value),
											}))
										}
										className={`create-patient-input ${validationResult.errors.identityDocument ? "border-rose-500" : ""}`}
										aria-invalid={!!validationResult.errors.identityDocument}
									/>
									{validationResult.errors.identityDocument && (
										<span className="text-xs text-rose-500 font-semibold mt-1">
											{validationResult.errors.identityDocument}
										</span>
									)}
									<span className="text-[10px] text-[var(--muted)] block mt-0.5">
										Не блокирует регистрацию. Можно внести позже при
										оформлении договора.
									</span>
								</div>
							</div>
						)}
					</div>

					{/* 1-Click Somatic Physiological Norm Fast Action (Mandate 8e) */}
					<div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
						<div
							className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
								isSomaticNorm
									? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
									: "bg-[var(--paper-soft)] border-[var(--glass-border)] text-[var(--muted)]"
							}`}
							data-testid="patient-creation-somatic-norm-banner"
						>
							<div className="flex items-center gap-2 min-w-0">
								<ShieldCheck
									size={16}
									className={isSomaticNorm ? "text-emerald-600 shrink-0" : "text-[var(--muted)] shrink-0"}
								/>
								<div className="text-xs font-medium truncate min-w-0">
									<span className="font-bold">Соматический статус:</span>{" "}
									{isSomaticNorm
										? "Физиологическая норма по умолчанию (соматически здоров)"
										: "Требуется ручное заполнение анкеты"}
								</div>
							</div>
							<button
								type="button"
								onClick={() => {
									const nextVal = !isSomaticNorm;
									setIsSomaticNorm(nextVal);
									if (nextVal) {
										showToast("Применена физиологическая норма: соматически здоров", "success");
									}
								}}
								data-testid="btn-somatic-healthy-norm"
								className={`min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
									isSomaticNorm
										? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
										: "bg-[var(--paper-strong)] hover:bg-[var(--glass-hover,var(--paper-soft))] text-[var(--ink)] border border-[var(--glass-border)] shadow-2xs"
								}`}
								title="1 клик: заполнить нормой (соматически здоров)"
							>
								<Check size={13} className="shrink-0" />
								<span>{isSomaticNorm ? "Норма" : "Применить норму"}</span>
							</button>
						</div>
					</div>
				</div>

				{/* Modal Footer with Validation Guidance & Action Buttons */}
				<footer className="create-patient-modal-footer">
					{patientCreateGuidance ? (
						<p
							className="quick-create-guidance patient-create-modal-guidance"
							id="patient-create-guidance"
							role="status"
							aria-live="polite"
						>
							{patientCreateGuidance}
						</p>
					) : null}

					<div className="create-patient-modal-actions">
						<button
							type="button"
							className="secondary-button create-patient-cancel-btn"
							onClick={onClose}
						>
							Отмена
						</button>
						<button
							type="button"
							className="secondary-button quick-create-print-blank-contract-btn"
							onClick={handlePrintBlankContract}
							title="Распечатать бланк договора и согласий со строками «________» для ручного заполнения пациентом в зоне ожидания"
							data-testid="patient-creation-print-blank-contract-btn"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
						>
							<Printer size={15} aria-hidden="true" />
							<span>Бланк договора («____»)</span>
						</button>
						<button
							type="button"
							className="secondary-button quick-create-book-action"
							onClick={handleCreateAndBook}
							disabled={isPatientCreating}
							title="Создать карту и сразу открыть расписание с выбранным пациентом"
							data-testid="patient-creation-submit-and-book-btn"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
						>
							<Calendar size={15} aria-hidden="true" />
							<span>Создать и записать</span>
						</button>
						<button
							type="button"
							className="secondary-button quick-create-visit-action"
							onClick={handleCreateAndOpenVisit}
							disabled={isPatientCreating}
							title="Создать карту и сразу открыть приём (для дежурного врача)"
							data-testid="patient-creation-submit-and-visit-btn"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
						>
							<Stethoscope size={15} aria-hidden="true" />
							<span>Создать и начать приём</span>
						</button>
						<button
							type="button"
							className="primary-button quick-create-action"
							onClick={handleCreate}
							disabled={isPatientCreating}
							aria-busy={isPatientCreating || undefined}
							aria-describedby={
								patientCreateGuidance ? "patient-create-guidance" : undefined
							}
							title={
								isPatientCreating
									? "Создание карточки..."
									: "Создать медицинскую карту пациента (без блокировки по СНИЛС/паспорту)"
							}
							data-testid="patient-creation-submit-btn"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
						>
							<Plus size={18} aria-hidden="true" />
							<span>
								{isPatientCreating ? "Создание..." : "Создать пациента"}
							</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}

export { PatientCreationModal as CreatePatientModal };
export default PatientCreationModal;
